import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import path from "node:path";

/**
 * Story Image Composer
 * ====================
 * Generates a 1080×1920 (9:16) image with the source image scaled to fill
 * the full width (1080px), centered vertically on a black background.
 *
 * Optionally overlays a link URL as a semi-transparent pill at the bottom
 * of the image so viewers can see and copy the link. This is necessary
 * because the Meta Graph API does NOT support link stickers on Stories:
 * "Publishing stickers (i.e., link, poll, location) is not supported."
 *
 * Strategy: "fill width, center vertically"
 * - Resize to fill the full 1080px width (upscaling if needed)
 * - If the resulting height <= 1920: letterbox with black bars top/bottom
 * - If the resulting height > 1920: crop from center to fit the canvas
 * - If a link URL is provided: overlay it as text on a semi-transparent bar
 *
 * Usage:
 *   GET /api/social/story-image?url=<encoded-image-url>&link=<encoded-link-url>
 *
 * Returns:
 *   image/jpeg (1080×1920) with the source image filling the width
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const LINK_BAR_HEIGHT = 120; // height of the semi-transparent bar at the bottom
const LINK_BAR_PADDING = 40; // horizontal padding for the link text

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

  // Basic validation — must be http(s)
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

  // Compose the Story image:
  // Strategy: fill the full width (1080px), then handle the height
  try {
    // Step 1: Get source dimensions after EXIF rotation
    const rotated = sharp(sourceBuffer).rotate();
    const sourceMeta = await rotated.metadata();
    const srcWidth = sourceMeta.width || STORY_WIDTH;
    const srcHeight = sourceMeta.height || STORY_HEIGHT;

    // Step 2: Calculate scale to fill the width
    const widthScale = STORY_WIDTH / srcWidth;
    const scaledHeight = Math.round(srcHeight * widthScale);

    let fitted: Buffer;
    let fittedWidth: number;
    let fittedHeight: number;

    if (scaledHeight <= STORY_HEIGHT) {
      // Image fits within canvas after filling width — letterbox with black bars
      fitted = await sharp(sourceBuffer)
        .rotate()
        .resize({
          width: STORY_WIDTH,
          withoutEnlargement: false,
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      fittedWidth = STORY_WIDTH;
      fittedHeight = scaledHeight;
    } else {
      // Image is taller than canvas after filling width — crop from center
      fitted = await sharp(sourceBuffer)
        .rotate()
        .resize({
          width: STORY_WIDTH,
          height: STORY_HEIGHT,
          fit: sharp.fit.cover,
          position: sharp.gravity.center,
          withoutEnlargement: false,
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      fittedWidth = STORY_WIDTH;
      fittedHeight = STORY_HEIGHT;
    }

    // Step 3: Build the composites (image + optional link overlay)
    const composites: sharp.OverlayOptions[] = [];

    // Add the fitted image
    const imageTop = Math.floor((STORY_HEIGHT - fittedHeight) / 2);
    composites.push({
      input: fitted,
      left: 0,
      top: imageTop,
    });

    // Add link overlay if a link URL is provided
    if (linkUrl) {
      try {
        const linkOverlay = await createLinkOverlay(linkUrl);
        composites.push({
          input: linkOverlay,
          left: 0,
          top: STORY_HEIGHT - LINK_BAR_HEIGHT,
        });
      } catch (overlayErr) {
        // Link overlay is best-effort — don't fail the entire image if it fails
        console.warn(
          "[Story Image] Link overlay failed:",
          overlayErr instanceof Error ? overlayErr.message : overlayErr,
        );
      }
    }

    // Create the final composed image
    // If no link overlay and image fills the canvas exactly, we can skip the background canvas
    if (
      composites.length === 1 &&
      fittedWidth === STORY_WIDTH &&
      fittedHeight === STORY_HEIGHT
    ) {
      // Image fills the entire canvas — no need for a background layer
      const imageBuffer = composites.length === 1 ? fitted : undefined;

      if (imageBuffer) {
        return new NextResponse(new Uint8Array(imageBuffer), {
          status: 200,
          headers: {
            "Content-Type": "image/jpeg",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
            "X-Story-Composed": "true",
            "X-Story-Source-Size": `${srcWidth}x${srcHeight}`,
            "X-Story-Fit-Mode": "cover",
            "X-Story-Link-Overlay": linkUrl ? "true" : "false",
          },
        });
      }
    }

    // Composite onto a 1080×1920 black background
    const composed = await sharp({
      create: {
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .composite(composites)
      .jpeg({ quality: 90 })
      .toBuffer();

    return new NextResponse(new Uint8Array(composed), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-Story-Composed": "true",
        "X-Story-Source-Size": `${srcWidth}x${srcHeight}`,
        "X-Story-Fit-Mode": fittedHeight < STORY_HEIGHT ? "fill-width" : "cover",
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
  const maxDisplayLen = 55;
  const displayUrl =
    linkUrl.length > maxDisplayLen
      ? `${linkUrl.substring(0, maxDisplayLen - 1)}…`
      : linkUrl;

  // Use an SVG to render the link text with a semi-transparent background
  // We use a pill/rounded-rect style overlay
  const barWidth = STORY_WIDTH - 80; // 40px margin on each side
  const barX = 40;
  const barY = 20; // offset from top of the overlay
  const barHeight = LINK_BAR_HEIGHT - 40; // 80px tall pill
  const cornerRadius = 16;
  const fontSize = 32;
  const textY = barY + barHeight / 2 + fontSize * 0.35; // vertically center text

  const svg = `<svg width="${STORY_WIDTH}" height="${LINK_BAR_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <!-- Semi-transparent background pill -->
  <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="${cornerRadius}" ry="${cornerRadius}" fill="rgba(0,0,0,0.65)" />
  <!-- Link icon (simplified chain link) -->
  <g transform="translate(${barX + 24}, ${barY + barHeight / 2 - 12})" fill="white" opacity="0.9">
    <path d="M8 10L4 14c-1.1 1.1-1.1 2.9 0 4 1.1 1.1 2.9 1.1 4 0l4-4m2-2l4-4c1.1-1.1 1.1-2.9 0-4-1.1-1.1-2.9-1.1-4 0l-4 4" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>
  <!-- Link URL text -->
  <text x="${barX + 60}" y="${textY}" font-family="'Liberation Sans', 'DejaVu Sans', Arial, sans-serif" font-size="${fontSize}" fill="white" opacity="0.95">${escapeXml(displayUrl)}</text>
</svg>`;

  const overlayBuffer = Buffer.from(svg);

  // Convert SVG to PNG with alpha channel for compositing
  const pngBuffer = await sharp(overlayBuffer)
    .png()
    .toBuffer();

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
