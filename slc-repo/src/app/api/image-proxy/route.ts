import { NextRequest, NextResponse } from "next/server";

// Image proxy - fixes Dropbox content-type issues for mobile browsers
// Dropbox shared links return content-type: application/json even though the body is an image.
// Mobile browsers (especially Safari) reject loading images with mismatched content-types.
// This proxy fetches the image server-side and re-serves it with the correct MIME type.

const ALLOWED_HOSTS = [
  "dl.dropboxusercontent.com",
  "dropboxusercontent.com",
  "www.dropbox.com",
  "ucarecdn.com",
  "images.unsplash.com",
  "i.ytimg.com",
  "img.youtube.com",
  "f4.bcbits.com",
];

const TIMEOUT_MS = 10000; // 10s timeout for upstream fetch
const MAX_SIZE = 10 * 1024 * 1024; // 10MB max image size

function getMimeType(url: string, contentType?: string): string {
  // If the upstream already returns a proper image content-type, use it
  if (contentType && contentType.startsWith("image/")) {
    return contentType;
  }

  // Infer from URL path extension
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith(".png")) return "image/png";
  if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg";
  if (pathname.endsWith(".webp")) return "image/webp";
  if (pathname.endsWith(".gif")) return "image/gif";
  if (pathname.endsWith(".svg")) return "image/svg+xml";
  if (pathname.endsWith(".avif")) return "image/avif";

  // Default to JPEG for unknown image types
  return "image/jpeg";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Validate the URL is from an allowed host
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const isAllowed = ALLOWED_HOSTS.some(
    (host) => parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`)
  );

  if (!isAllowed) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  try {
    // Fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        // Some CDNs require a user-agent
        "User-Agent": "SonidoLiquido-ImageProxy/1.0",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: response.status }
      );
    }

    const body = await response.arrayBuffer();

    // Size limit check
    if (body.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }

    const upstreamContentType = response.headers.get("content-type") || undefined;
    const mimeType = getMimeType(imageUrl, upstreamContentType);

    // Re-serve with correct content-type and caching headers
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800", // Cache 1 day, stale OK for 7 days
        "X-Content-Type-Options": "nosniff",
        "Content-Length": body.byteLength.toString(),
        // Allow the browser to cache this aggressively
        Vary: "Accept-Encoding",
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json({ error: "Upstream timeout" }, { status: 504 });
    }
    console.error("[image-proxy] Error fetching:", imageUrl, error);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}
