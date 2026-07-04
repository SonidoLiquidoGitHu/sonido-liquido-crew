import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

/**
 * Story Image Composer
 * ====================
 * Generates a 1080×1920 (9:16) image with the source image scaled to fill
 * the full width (1080px), centered vertically on a black background.
 *
 * Strategy: "fill width, center vertically"
 * - Resize to fill the full 1080px width (upscaling if needed)
 * - If the resulting height <= 1920: letterbox with black bars top/bottom
 * - If the resulting height > 1920: crop from center to fit the canvas
 *
 * This ensures images always fill the horizontal space in Instagram Stories,
 * so they appear large and prominent rather than small with wide black bars.
 *
 * Usage:
 *   GET /api/social/story-image?url=<encoded-image-url>
 *
 * Returns:
 *   image/jpeg (1080×1920) with the source image filling the width
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

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

    // If the fitted image already matches the canvas exactly, return it directly
    if (fittedWidth === STORY_WIDTH && fittedHeight === STORY_HEIGHT) {
      return new NextResponse(new Uint8Array(fitted), {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
          "X-Story-Composed": "true",
          "X-Story-Source-Size": `${srcWidth}x${srcHeight}`,
          "X-Story-Fit-Mode": "cover",
        },
      });
    }

    // Composite onto a 1080×1920 black background, centered vertically
    const left = 0; // already fills the full width
    const top = Math.floor((STORY_HEIGHT - fittedHeight) / 2);

    const composed = await sharp({
      create: {
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .composite([
        {
          input: fitted,
          left,
          top,
        },
      ])
      .jpeg({ quality: 90 })
      .toBuffer();

    return new NextResponse(new Uint8Array(composed), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-Story-Composed": "true",
        "X-Story-Source-Size": `${srcWidth}x${srcHeight}`,
        "X-Story-Fit-Mode": "fill-width",
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
