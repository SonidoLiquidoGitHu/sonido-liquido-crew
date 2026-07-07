import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

/**
 * Story Image Composer (v3 — smart upscaling + better link sticker visual)
 * ========================================================================
 *
 * WHAT CHANGED IN v3:
 *   1. PIXELATION FIX: The previous v2 kept the foreground at native size
 *      (withoutEnlargement: true), which meant a 640×640 Spotify cover
 *      appeared tiny on a 1080×1920 canvas surrounded by blurry background.
 *      Users perceived this as "pixelated" because the foreground looked
 *      low-res next to all the empty blurred space.
 *
 *      v3 introduces a `mode` parameter:
 *        - mode=smart (default) — foreground scaled to fill 80% of canvas
 *          width (capped at 1.5x upscale to avoid severe artifacting), with
 *          a subtle sharpening pass to compensate for upscale softness.
 *          Background still blurred for the "letterbox-free" look.
 *        - mode=fill — foreground cover-fits the entire canvas (old v1
 *          behavior, useful when source is already 9:16 or close to it).
 *        - mode=contain — foreground fits inside canvas, never upscaled
 *          (v2 behavior, useful for very small source images where any
 *          upscale would look bad).
 *
 *   2. LINK STICKER VISUAL: The Meta Graph API does NOT support clickable
 *      link stickers on Stories (confirmed Dec 2024 — see
 *      https://stackoverflow.com/questions/78841320). To get TRUE clickable
 *      link stickers via automation, you must use a third-party tool like
 *      Storrito, Buffer, or Postiz that uses Instagram's private API.
 *
 *      For the visual overlay (the best we can do via the official Graph
 *      API), v3 makes the sticker look MORE like Instagram's native link
 *      sticker — bigger pill, clearer call-to-action ("Toca para ver →"),
 *      drop shadow, and positioned higher (above the bottom safe area) so
 *      it's more visible and harder to miss.
 *
 * USAGE:
 *   GET /api/social/story-image?url=<encoded>&link=<encoded>&mode=smart
 *
 * MODES:
 *   smart (default) — best for album covers, press photos, posters
 *   fill             — best when source is already 9:16
 *   contain          — best when source is tiny (<400px) and any upscale is bad
 *
 * RETURNS:
 *   image/jpeg (1080×1920)
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const LINK_BAR_HEIGHT = 200; // taller for v3 — gives room for bigger pill + CTA
const BACKGROUND_BRIGHTNESS = 0.45; // darker so foreground pops more
const BACKGROUND_BLUR_SIGMA = 25; // heavier blur to hide compression artifacts

// In "smart" mode, cap the upscale factor. Beyond ~1.5x even lanczos3
// starts looking obviously upscaled. Below this, sharpening can compensate.
const SMART_MODE_MAX_UPSCALE = 1.5;
// In "smart" mode, target filling this fraction of canvas width
const SMART_MODE_FILL_RATIO = 0.85;
// Sources below this size in any dimension are routed to "contain" mode
// automatically, because upscaling them looks bad regardless of mode.
const AUTO_CONTAIN_THRESHOLD = 400;

type ComposeMode = "smart" | "fill" | "contain";

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

  // Optional link parameter
  let linkUrl: string | undefined;
  const linkParam = req.nextUrl.searchParams.get("link");
  if (linkParam) {
    try {
      linkUrl = decodeURIComponent(linkParam);
    } catch {
      // Ignore invalid link encoding
    }
  }

  // Mode parameter
  const modeParam = req.nextUrl.searchParams.get("mode") || "smart";
  const mode: ComposeMode = ["smart", "fill", "contain"].includes(modeParam)
    ? (modeParam as ComposeMode)
    : "smart";

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

    // ---- Step 1.5: Auto-route to "contain" for tiny sources ----
    // Even "smart" mode looks bad on very small sources.
    let effectiveMode = mode;
    if (
      mode === "smart" &&
      (srcWidth < AUTO_CONTAIN_THRESHOLD || srcHeight < AUTO_CONTAIN_THRESHOLD)
    ) {
      effectiveMode = "contain";
      console.log(
        `[Story Image] Source ${srcWidth}x${srcHeight} below threshold, auto-routing to contain mode`,
      );
    }

    // ---- Step 2: Build the blurred background layer (1080×1920) ----
    // Heavier blur in v3 to better hide compression artifacts on small sources.
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
      .png()
      .toBuffer();

    // ---- Step 3: Build the foreground layer ----
    let fittedWidth: number;
    let fittedHeight: number;
    let applySharpen = false;

    if (effectiveMode === "fill") {
      // Cover-fit the entire canvas (v1 behavior). Source is cropped if not 9:16.
      fittedWidth = STORY_WIDTH;
      fittedHeight = STORY_HEIGHT;
    } else if (effectiveMode === "contain") {
      // Fit inside canvas, never upscale (v2 behavior).
      const scale = Math.min(
        STORY_WIDTH / srcWidth,
        STORY_HEIGHT / srcHeight,
        1,
      );
      fittedWidth = Math.max(1, Math.round(srcWidth * scale));
      fittedHeight = Math.max(1, Math.round(srcHeight * scale));
    } else {
      // "smart" mode — fill 85% of canvas width, cap upscale at 1.5x
      const targetWidth = Math.round(STORY_WIDTH * SMART_MODE_FILL_RATIO);
      const upscale = targetWidth / srcWidth;
      const cappedUpscale = Math.min(upscale, SMART_MODE_MAX_UPSCALE);
      fittedWidth = Math.max(1, Math.round(srcWidth * cappedUpscale));
      // Preserve aspect ratio
      fittedHeight = Math.max(1, Math.round(srcHeight * cappedUpscale));
      // If we upscaled, apply a subtle sharpen to compensate
      applySharpen = cappedUpscale > 1.0;
      // If the resulting height exceeds canvas, scale down to fit
      if (fittedHeight > STORY_HEIGHT) {
        const hScale = STORY_HEIGHT / fittedHeight;
        fittedWidth = Math.max(1, Math.round(fittedWidth * hScale));
        fittedHeight = STORY_HEIGHT;
      }
    }

    // Build the foreground pipeline
    let foregroundPipeline = sharp(sourceBuffer).rotate().resize({
      width: fittedWidth,
      height: fittedHeight,
      fit: effectiveMode === "fill" ? sharp.fit.cover : sharp.fit.fill,
      position: sharp.gravity.center,
      withoutEnlargement: false,
      kernel: "lanczos3",
    });

    // Apply sharpening in smart mode if we upscaled, to recover perceived detail
    if (applySharpen) {
      // sigma=0.5 is a subtle sharpen — enough to compensate for lanczos3
      // softness without introducing halos or ringing artifacts.
      foregroundPipeline = foregroundPipeline.sharpen({
        sigma: 0.5,
        m1: 0.5,
        m2: 0.2,
      });
    }

    const foregroundLayer = await foregroundPipeline.png().toBuffer();

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
    const composed = await sharp(backgroundLayer)
      .composite(composites)
      .jpeg({
        quality: 95,
        mozjpeg: true,
        chromaSubsampling: "4:4:4",
      })
      .toBuffer();

    return new NextResponse(new Uint8Array(composed), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-Story-Composed": "true",
        "X-Story-Version": "3",
        "X-Story-Mode": effectiveMode,
        "X-Story-Source-Size": `${srcWidth}x${srcHeight}`,
        "X-Story-Foreground-Size": `${fittedWidth}x${fittedHeight}`,
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
 * Create the link sticker overlay.
 *
 * v3 design — looks closer to Instagram's native link sticker:
 *   - Larger white pill (800×100) centered horizontally
 *   - Link icon on the left (bigger, bolder)
 *   - URL text in the middle
 *   - "Toca para ver →" CTA on the right (in primary orange to match SL brand)
 *   - Drop shadow under the pill
 *   - Positioned in the bottom 200px of the canvas
 *
 * NOTE: This is a VISUAL sticker only. The Meta Graph API does not support
 * clickable link stickers on Stories (confirmed Dec 2024). Viewers must
 * manually type the URL. For TRUE clickable link stickers via automation,
 * use Storrito, Buffer, or Postiz (which use Instagram's private API).
 */
async function createLinkOverlay(linkUrl: string): Promise<Buffer> {
  // Truncate URL if too long for display
  const maxDisplayLen = 38;
  const displayUrl =
    linkUrl.length > maxDisplayLen
      ? `${linkUrl.substring(0, maxDisplayLen - 1)}…`
      : linkUrl;

  // Strip protocol for cleaner display
  const cleanUrl = displayUrl.replace(/^https?:\/\//i, "");

  const pillWidth = 820;
  const pillHeight = 100;
  const pillX = Math.floor((STORY_WIDTH - pillWidth) / 2);
  const pillY = Math.floor(LINK_BAR_HEIGHT / 2 - pillHeight / 2) + 20;
  const cornerRadius = 50;
  const fontSize = 32;
  const textY = pillY + pillHeight / 2 + fontSize * 0.35;

  // Link icon (chain link, blue like IG native)
  const iconX = pillX + 28;
  const iconY = pillY + pillHeight / 2 - 13;

  // CTA text position (right side of pill)
  const ctaX = pillX + pillWidth - 180;
  const ctaY = textY;

  const svg = `<svg width="${STORY_WIDTH}" height="${LINK_BAR_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="rgba(0,0,0,0.45)"/>
    </filter>
  </defs>

  <!-- White pill background -->
  <rect x="${pillX}" y="${pillY}" width="${pillWidth}" height="${pillHeight}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white" filter="url(#shadow)" />

  <!-- Link icon (chain link, IG blue) -->
  <g transform="translate(${iconX}, ${iconY})">
    <path d="M10 12L6 16c-1.3 1.3-1.3 3.4 0 4.7 1.3 1.3 3.4 1.3 4.7 0l4-4m2-2l4-4c1.3-1.3 1.3-3.4 0-4.7-1.3-1.3-3.4-1.3-4.7 0l-4 4" stroke="#0095F6" stroke-width="2.8" fill="none" stroke-linecap="round"/>
  </g>

  <!-- URL text (dark, like IG) -->
  <text x="${iconX + 50}" y="${textY}" font-family="'Liberation Sans', 'DejaVu Sans', Arial, sans-serif" font-size="${fontSize}" font-weight="500" fill="#262626">${escapeXml(cleanUrl)}</text>

  <!-- CTA arrow + text (Sonido Liquido orange) -->
  <text x="${ctaX}" y="${ctaY}" font-family="'Liberation Sans', 'DejaVu Sans', Arial, sans-serif" font-size="26" font-weight="600" fill="#f97316">Toca para ver →</text>
</svg>`;

  const overlayBuffer = Buffer.from(svg);
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
