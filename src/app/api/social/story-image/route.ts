import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

/**
 * Story Image Composer (v2 — no pixelation)
 * =========================================
 * Generates a 1080×1920 (9:16) image for Instagram Stories.
 *
 * PREVIOUS BEHAVIOR (caused pixelation):
 *   The source image was always resized to fill 1080px wide, with
 *   `withoutEnlargement: false`. That meant small source images (e.g. a
 *   500×500 cover or 640×640 Spotify thumbnail) got upscaled 2x+, producing
 *   soft / blocky / pixelated Stories. The image was also re-encoded twice
 *   (once after resize, once after composite), which compounded JPEG
 *   artifacts.
 *
 * NEW BEHAVIOR:
 *   1. BACKGROUND LAYER — The source image is blurred and scaled with
 *      `fit: cover` to fill the full 1080×1920 canvas. Upscaling is OK here
 *      because the blur hides it. The background is also darkened slightly
 *      so the foreground stands out. This guarantees we always fill the
 *      screen — no awkward black bars.
 *   2. FOREGROUND LAYER — The source image is scaled with `fit: contain`
 *      and `withoutEnlargement: true`, so it is NEVER upscaled. Small
 *      images appear at their native size, centered on the blurred
 *      background. This is the same trick Instagram itself uses for
 *      non-9:16 Story images.
 *   3. LINK OVERLAY (optional) — A sticker-like pill with the link URL is
 *      composited at the bottom, since the Meta Graph API does not support
 *      clickable link stickers on Stories.
 *   4. SINGLE ENCODE — Everything is composited in the sharp pipeline and
 *      encoded once at JPEG quality 95 (was 90).
 *
 * Usage:
 *   GET /api/social/story-image?url=<encoded-image-url>&link=<encoded-link-url>
 *
 * Returns:
 *   image/jpeg (1080×1920)
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const LINK_BAR_HEIGHT = 120;
const BACKGROUND_BRIGHTNESS = 0.55; // 0..1, lower = darker
const BACKGROUND_BLUR_SIGMA = 18;

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return NextResponse.json(
      { error: "Missing 'url' query parameter" },
      { status: 400 },
    );
  }

  let sourceUrl: string;
  try {
    sourceUrl = decodeURIComponent(urlParam);
  } catch {
    return NextResponse.json(
      { error: "Invalid URL encoding" },
      { status: 400 },
    );
  }

  if (!/^https?:\/\//i.test(sourceUrl)) {
    return NextResponse.json({ error: "URL must be http(s)" }, { status: 400 });
  }

  // Optional link parameter — will be overlaid on the image
  let linkUrl: string | undefined;
  const linkParam = req.nextUrl.searchParams.get("link");
  if (linkParam) {
    try {
      linkUrl = decodeURIComponent(linkParam);
    } catch {
      // Ignore invalid link encoding
    }
  }

  // Fetch the source image
  let sourceBuffer: Buffer;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(sourceUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch source image: HTTP ${res.status}` },
        { status: 502 },
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    sourceBuffer = Buffer.from(arrayBuffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown fetch error";
    return NextResponse.json(
      { error: `Failed to fetch source image: ${msg}` },
      { status: 502 },
    );
  }

  try {
    // ---- Step 1: Read source metadata (after EXIF rotation) ----
    const sourceMeta = await sharp(sourceBuffer).rotate().metadata();
    const srcWidth = sourceMeta.width || 0;
    const srcHeight = sourceMeta.height || 0;
    if (!srcWidth || !srcHeight) {
      return NextResponse.json(
        { error: "Could not read image dimensions" },
        { status: 422 },
      );
    }

    // ---- Step 2: Build the blurred background layer (1080×1920) ----
    // Cover-fit so it fills the canvas. Upscaling is fine here because the
    // blur hides any pixelation. Darken so the foreground pops.
    const backgroundLayer = await sharp(sourceBuffer)
      .rotate()
      .resize({
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        fit: sharp.fit.cover,
        position: sharp.gravity.center,
        withoutEnlargement: false,
        kernel: "lanczos3",
      })
      .modulate({ brightness: BACKGROUND_BRIGHTNESS })
      .blur(BACKGROUND_BLUR_SIGMA)
      // PNG lossless to avoid recompression artifacts when compositing
      .png()
      .toBuffer();

    // ---- Step 3: Build the sharp foreground layer ----
    // Scale to fit INSIDE the canvas (preserve aspect ratio, never upscale).
    // The `Math.min(..., 1)` is the key — it caps the scale at 1.0 so a
    // 500×500 source stays 500×500 instead of being stretched to 1080.
    const scale = Math.min(
      STORY_WIDTH / srcWidth,
      STORY_HEIGHT / srcHeight,
      1, // never upscale
    );
    const fittedWidth = Math.max(1, Math.round(srcWidth * scale));
    const fittedHeight = Math.max(1, Math.round(srcHeight * scale));

    const foregroundLayer = await sharp(sourceBuffer)
      .rotate()
      .resize({
        width: fittedWidth,
        height: fittedHeight,
        fit: sharp.fit.fill, // exact dimensions (we already preserved aspect)
        withoutEnlargement: true,
        kernel: "lanczos3",
      })
      .png() // lossless intermediate
      .toBuffer();

    // ---- Step 4: Build composites ----
    const foregroundLeft = Math.floor((STORY_WIDTH - fittedWidth) / 2);
    const foregroundTop = Math.floor((STORY_HEIGHT - fittedHeight) / 2);

    const composites: sharp.OverlayOptions[] = [
      { input: foregroundLayer, left: foregroundLeft, top: foregroundTop },
    ];

    // Optional link sticker overlay
    if (linkUrl) {
      try {
        const linkOverlay = await createLinkOverlay(linkUrl);
        composites.push({
          input: linkOverlay,
          left: 0,
          top: STORY_HEIGHT - LINK_BAR_HEIGHT,
        });
      } catch (overlayErr) {
        console.warn(
          "[Story Image] Link overlay failed:",
          overlayErr instanceof Error ? overlayErr.message : overlayErr,
        );
      }
    }

    // ---- Step 5: Composite everything onto the background ----
    // Single JPEG encode at q95 — no double-encoding.
    const composed = await sharp(backgroundLayer)
      .composite(composites)
      .jpeg({
        quality: 95,
        mozjpeg: true, // better compression at high quality
        chromaSubsampling: "4:4:4", // preserve color detail
      })
      .toBuffer();

    const fitMode =
      fittedWidth === STORY_WIDTH && fittedHeight === STORY_HEIGHT
        ? "exact"
        : fittedWidth === STORY_WIDTH
          ? "fill-width"
          : fittedHeight === STORY_HEIGHT
            ? "fill-height"
            : "contain-no-upscale";

    return new NextResponse(new Uint8Array(composed), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        // Allow caching since the same source URL produces the same output.
        // The composer URL contains the full source URL as a query param,
        // so different sources get different cache keys automatically.
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-Story-Composed": "true",
        "X-Story-Version": "2",
        "X-Story-Source-Size": `${srcWidth}x${srcHeight}`,
        "X-Story-Foreground-Size": `${fittedWidth}x${fittedHeight}`,
        "X-Story-Fit-Mode": fitMode,
        "X-Story-Link-Overlay": linkUrl ? "true" : "false",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown sharp error";
    console.error("[Story Image] Composition failed:", msg);
    return NextResponse.json(
      { error: `Image composition failed: ${msg}` },
      { status: 500 },
    );
  }
}

/**
 * Create a semi-transparent link overlay bar with the URL text.
 * Returns a PNG buffer of size 1080×LINK_BAR_HEIGHT with transparency.
 */
async function createLinkOverlay(linkUrl: string): Promise<Buffer> {
  // Truncate URL if too long for display
  const maxDisplayLen = 45;
  const displayUrl =
    linkUrl.length > maxDisplayLen
      ? `${linkUrl.substring(0, maxDisplayLen - 1)}…`
      : linkUrl;

  // Mimic Instagram's native link sticker: white rounded pill with link icon + URL
  const pillWidth = 700;
  const pillHeight = 70;
  const pillX = Math.floor((STORY_WIDTH - pillWidth) / 2);
  const pillY = Math.floor(LINK_BAR_HEIGHT / 2 - pillHeight / 2) + 10;
  const cornerRadius = 35;
  const fontSize = 28;
  const textY = pillY + pillHeight / 2 + fontSize * 0.35;

  const svg = `<svg width="${STORY_WIDTH}" height="${LINK_BAR_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
  </defs>
  <rect x="${pillX}" y="${pillY}" width="${pillWidth}" height="${pillHeight}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white" filter="url(#shadow)" />
  <g transform="translate(${pillX + 22}, ${pillY + pillHeight / 2 - 11})">
    <path d="M8 10L4 14c-1.1 1.1-1.1 2.9 0 4 1.1 1.1 2.9 1.1 4 0l4-4m2-2l4-4c1.1-1.1 1.1-2.9 0-4-1.1-1.1-2.9-1.1-4 0l-4 4" stroke="#0095F6" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>
  <text x="${pillX + 56}" y="${textY}" font-family="'Liberation Sans', 'DejaVu Sans', Arial, sans-serif" font-size="${fontSize}" font-weight="500" fill="#262626">${escapeXml(displayUrl)}</text>
</svg>`;

  const overlayBuffer = Buffer.from(svg);

  // Convert SVG to PNG with alpha channel for compositing
  const pngBuffer = await sharp(overlayBuffer).png().toBuffer();

  return pngBuffer;
}

/** Escape special XML characters for SVG text content */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
