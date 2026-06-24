import { NextRequest, NextResponse } from "next/server";

// Image proxy - fixes Dropbox content-type issues for mobile browsers
// Dropbox shared links return content-type: application/json even though the body is an image.
// Mobile browsers (especially Safari) reject loading images with mismatched content-types.
// This proxy fetches the image server-side and re-serves it with the correct MIME type.

const ALLOWED_HOSTS = [
  "dl.dropboxusercontent.com",
  "dropboxusercontent.com",
  "www.dropbox.com",
  "dropbox.com",
  "ucarecdn.com",
  "images.unsplash.com",
  "i.ytimg.com",
  "img.youtube.com",
  "yt3.ggpht.com",
  "yt3.googleusercontent.com",
  "f4.bcbits.com",
  "i.scdn.co",
  "mosaic.scdn.co",
  "image-cdn-fa.spotifycdn.com",
  "image-cdn-ak.spotifycdn.com",
];

const TIMEOUT_MS = 15000; // 15s timeout for upstream fetch (increased from 10s for slow Dropbox responses)
const MAX_SIZE = 25 * 1024 * 1024; // 25MB max image size (bumped from 10MB — banner/hero images routinely exceed 10MB at high res)

// Cache durations
const CACHE_SUCCESS = "public, max-age=86400, stale-while-revalidate=604800"; // 1 day, stale OK 7 days
const CACHE_TEMP_LINK = "public, max-age=3600, stale-while-revalidate=86400"; // 1 hour (temp links expire)
const CACHE_NO_STORE = "no-store, no-cache, must-revalidate, proxy-revalidate"; // Never cache errors

/**
 * Detect if a buffer contains image data by checking magic bytes (file signatures).
 * This is critical because Dropbox often returns content-type: application/json
 * even when the response body is actually an image file.
 */
function detectImageType(body: ArrayBuffer): string | null {
  if (body.byteLength < 4) return null;

  const bytes = new Uint8Array(body);

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }

  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "image/gif";
  }

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes.byteLength >= 12 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }

  // AVIF: 00 00 00 ... 66 74 79 70 61 76 69 66 (ftyp avif)
  if (bytes.byteLength >= 12 &&
      bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 &&
      bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x66) {
    return "image/avif";
  }

  // BMP: 42 4D
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return "image/bmp";
  }

  // SVG (text-based): starts with <?xml or <svg
  if (body.byteLength > 10) {
    const header = new TextDecoder().decode(body.slice(0, 100)).trim().toLowerCase();
    if (header.startsWith("<?xml") || header.startsWith("<svg")) {
      return "image/svg+xml";
    }
  }

  return null;
}

/**
 * Check if a buffer looks like an HTML page (Dropbox login/error page).
 * We must NOT serve HTML as an image, as it causes broken/black images
 * that get cached aggressively.
 */
function isHtmlResponse(body: ArrayBuffer): boolean {
  if (body.byteLength < 20) return false;
  const header = new TextDecoder().decode(body.slice(0, 200)).trim().toLowerCase();
  return header.startsWith("<!doctype") || header.startsWith("<html") || header.startsWith("<head");
}

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

/**
 * Create an error response that is NEVER cached by CDN or browser.
 * This prevents temporary failures from being cached for 24 hours.
 */
function errorResponse(message: string, status: number): NextResponse {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": CACHE_NO_STORE,
        "Pragma": "no-cache",
      },
    }
  );
}

/**
 * Create a successful image response with aggressive caching.
 */
function imageResponse(body: ArrayBuffer, mimeType: string, cacheControl: string = CACHE_SUCCESS): NextResponse {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      "Content-Length": body.byteLength.toString(),
      Vary: "Accept-Encoding",
      // Allow canvas to read this image without tainting (for share-to-stories)
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/**
 * Try to resolve a Dropbox shared link via the Dropbox API to get a temporary direct link.
 * This is the fallback when ?raw=1 doesn't work (common with /scl/fi/ URLs).
 */
async function tryDropboxApiResolution(imageUrl: string): Promise<NextResponse | null> {
  try {
    const { dropboxClient } = await import("@/lib/clients/dropbox");

    // Convert the URL back to a format the metadata API can resolve
    let sharedLink = imageUrl;
    if (sharedLink.includes("raw=1")) {
      sharedLink = sharedLink.replace("?raw=1", "?dl=0").replace("&raw=1", "&dl=0");
    }

    const token = await dropboxClient.getAccessToken();
    const metaResponse = await fetch(
      "https://api.dropboxapi.com/2/sharing/get_shared_link_metadata",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: sharedLink }),
      }
    );

    if (metaResponse.ok) {
      const metaData = await metaResponse.json();
      const filePath = metaData.path_lower || metaData.path_display;

      if (filePath) {
        const tempLinkResponse = await fetch(
          "https://api.dropboxapi.com/2/files/get_temporary_link",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ path: filePath }),
          }
        );

        if (tempLinkResponse.ok) {
          const tempLinkData = await tempLinkResponse.json();
          const tempLink = tempLinkData.link;

          if (tempLink) {
            // Fetch from the temporary link (has proper CORS + content-type)
            const tempController = new AbortController();
            const tempTimeout = setTimeout(() => tempController.abort(), TIMEOUT_MS);

            const tempResponse = await fetch(tempLink, {
              signal: tempController.signal,
              headers: { "User-Agent": "SonidoLiquido-ImageProxy/1.0" },
            });
            clearTimeout(tempTimeout);

            if (tempResponse.ok) {
              const tempBody = await tempResponse.arrayBuffer();

              if (tempBody.byteLength <= MAX_SIZE) {
                // Use magic bytes to detect the actual image type
                const detectedType = detectImageType(tempBody);
                const tempContentType = tempResponse.headers.get("content-type") || "";

                if (detectedType || tempContentType.startsWith("image/")) {
                  const mimeType = detectedType || getMimeType(tempLink, tempContentType);
                  console.log(`[image-proxy] Dropbox API resolution SUCCESS: ${mimeType}`);
                  return imageResponse(tempBody, mimeType, CACHE_TEMP_LINK);
                }
              }
            }
          }
        }
      }
    }

    console.warn("[image-proxy] Dropbox API resolution: metadata/temp link failed");
  } catch (apiErr) {
    console.warn("[image-proxy] Dropbox API resolution failed:", (apiErr as Error).message);
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return errorResponse("Missing url parameter", 400);
  }

  // Normalize Dropbox URLs: dl.dropboxusercontent.com is broken for new-format
  // shared links (/scl/fi/...?rlkey=...). Convert to www.dropbox.com?raw=1 which
  // works with ALL formats. This must happen before validation/fetching.
  if (imageUrl.includes("dl.dropboxusercontent.com")) {
    const fixed = imageUrl
      .replace("dl.dropboxusercontent.com", "www.dropbox.com");
    if (!fixed.includes("raw=1")) {
      imageUrl = fixed + (fixed.includes("?") ? "&" : "?") + "raw=1";
    } else {
      imageUrl = fixed;
    }
    console.log(`[image-proxy] Normalized dl.dropboxusercontent.com → ${imageUrl.substring(0, 100)}`);
  }

  // Also normalize Dropbox URLs missing raw=1 parameter
  if (imageUrl.includes("dropbox.com") && !imageUrl.includes("raw=1") && !imageUrl.includes("dl.dropboxusercontent.com")) {
    if (imageUrl.includes("dl=0")) {
      imageUrl = imageUrl.replace("?dl=0", "?raw=1").replace("&dl=0", "&raw=1");
    } else {
      imageUrl = imageUrl + (imageUrl.includes("?") ? "&" : "?") + "raw=1";
    }
    console.log(`[image-proxy] Added raw=1 to Dropbox URL → ${imageUrl.substring(0, 100)}`);
  }

  // Validate the URL is from an allowed host
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return errorResponse("Invalid URL", 400);
  }

  const isAllowed = ALLOWED_HOSTS.some(
    (host) => parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`)
  );

  if (!isAllowed) {
    return errorResponse("Host not allowed", 403);
  }

  const isDropbox = imageUrl.includes("dropbox.com") || imageUrl.includes("dropboxusercontent.com");

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
      // For Dropbox URLs with non-200 response, try API resolution as fallback
      if (isDropbox) {
        console.log(`[image-proxy] Upstream returned ${response.status}, trying Dropbox API fallback`);
        const apiResult = await tryDropboxApiResolution(imageUrl);
        if (apiResult) return apiResult;
      }

      return errorResponse(`Upstream returned ${response.status}`, response.status >= 500 ? 502 : response.status);
    }

    const body = await response.arrayBuffer();

    // Size limit check
    if (body.byteLength > MAX_SIZE) {
      return errorResponse("Image too large", 413);
    }

    const upstreamContentType = response.headers.get("content-type") || undefined;

    // STEP 1: If content-type is image/*, serve directly (happy path)
    if (upstreamContentType && upstreamContentType.startsWith("image/")) {
      const mimeType = getMimeType(imageUrl, upstreamContentType);
      return imageResponse(body, mimeType);
    }

    // STEP 2: Check magic bytes to detect the actual content.
    // Dropbox often returns content-type: application/json even when the body IS an image.
    // This is the MOST COMMON cause of "images not loading" — the content-type is wrong
    // but the actual data is a perfectly valid image file.
    const detectedType = detectImageType(body);

    if (detectedType && !isHtmlResponse(body)) {
      console.log(`[image-proxy] Detected ${detectedType} via magic bytes despite content-type: ${upstreamContentType}`);
      return imageResponse(body, detectedType);
    }

    // STEP 3: If the response looks like HTML (Dropbox login/error page), reject it.
    // We must NOT serve HTML as an image.
    if (isHtmlResponse(body)) {
      console.warn(`[image-proxy] Upstream returned HTML page instead of image for: ${imageUrl.substring(0, 100)}`);

      // For Dropbox URLs, try API resolution to get a working link
      if (isDropbox) {
        const apiResult = await tryDropboxApiResolution(imageUrl);
        if (apiResult) return apiResult;
      }

      return errorResponse("Upstream returned HTML page instead of image", 502);
    }

    // STEP 4: For non-HTML, non-image responses from Dropbox (e.g., application/json),
    // try the Dropbox API resolution as a fallback.
    // This handles /scl/fi/ URLs where ?raw=1 returns a JSON redirect.
    if (isDropbox) {
      console.log(`[image-proxy] Upstream returned ${upstreamContentType}, trying Dropbox API fallback`);
      const apiResult = await tryDropboxApiResolution(imageUrl);
      if (apiResult) return apiResult;
    }

    // STEP 5: Last resort — if the body looks like it could be binary image data
    // (non-printable bytes, not JSON, not HTML), try serving it with the inferred MIME type.
    // This handles edge cases where magic bytes don't match known signatures.
    if (body.byteLength > 100 && !isPrintableText(body)) {
      const mimeType = getMimeType(imageUrl, undefined);
      console.log(`[image-proxy] Serving unknown binary data as ${mimeType} (last resort)`);
      return imageResponse(body, mimeType, "public, max-age=3600, stale-while-revalidate=86400");
    }

    console.warn(`[image-proxy] Upstream returned non-image content-type: ${upstreamContentType} for URL: ${imageUrl.substring(0, 100)}`);
    return errorResponse(`Upstream returned non-image content type: ${upstreamContentType}`, 502);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      // For Dropbox timeouts, try API resolution as fallback
      if (isDropbox) {
        console.log(`[image-proxy] Upstream timeout, trying Dropbox API fallback`);
        const apiResult = await tryDropboxApiResolution(imageUrl);
        if (apiResult) return apiResult;
      }
      return errorResponse("Upstream timeout", 504);
    }
    console.error("[image-proxy] Error fetching:", imageUrl, error);
    return errorResponse("Failed to fetch image", 500);
  }
}

/**
 * Check if a buffer contains mostly printable text (JSON, plain text, etc.)
 * If so, it's probably not an image file.
 */
function isPrintableText(body: ArrayBuffer): boolean {
  if (body.byteLength === 0) return true;

  const bytes = new Uint8Array(body);
  const sampleSize = Math.min(bytes.length, 512);
  let printable = 0;

  for (let i = 0; i < sampleSize; i++) {
    const b = bytes[i];
    // Count tabs, newlines, carriage returns, and printable ASCII as "printable"
    if ((b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13) {
      printable++;
    }
  }

  // If more than 85% of the sample is printable, it's probably text
  return (printable / sampleSize) > 0.85;
}
