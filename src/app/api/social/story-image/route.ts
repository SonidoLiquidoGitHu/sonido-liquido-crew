import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

/**
 * Story Image Composer
 * ====================
 * Generates a 1080×1920 (9:16) image with the source image fitted inside
 * (preserving aspect ratio) and centered on a black background.
 *
 * This solves the "oversized image" problem on Instagram Stories — when you
 * pass a non-9:16 image to IG's Story API, IG auto-crops it to fill the
 * frame, which cuts off important content. By pre-composing the image with
 * letterboxing/pillarboxing, we guarantee the entire original image is
 * visible inside the Story frame.
 *
 * Usage:
 *   GET /api/social/story-image?url=<encoded-image-url>
 *
 * Returns:
 *   image/jpeg (1080×1920) with the source image fitted inside
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const MAX_SOURCE_DIM = 1600; // cap source size to keep memory + processing reasonable

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
    return NextResponse.json(
      { error: "URL must be http(s)" },
      { status: 400 },
    );
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
  // 1. Resize source to fit inside 1080×1920 (preserve aspect ratio, no crop)
  // 2. Composite onto a 1080×1920 black background, centered
  try {
    const fitted = await sharp(sourceBuffer)
      .rotate() // auto-rotate based on EXIF
      .resize({
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Determine fitted image dimensions to center it on the canvas
    const meta = await sharp(fitted).metadata();
    const fittedWidth = meta.width || STORY_WIDTH;
    const fittedHeight = meta.height || STORY_HEIGHT;
    const left = Math.floor((STORY_WIDTH - fittedWidth) / 2);
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
        "X-Story-Source-Size": `${fittedWidth}x${fittedHeight}`,
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
