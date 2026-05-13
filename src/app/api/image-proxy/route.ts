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
  let imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
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

    // SECURITY: Detect non-image responses from upstream.
    // Dropbox shared links can return HTML pages (login, error, file viewer)
    // instead of the raw image. Serving these as "images" causes the browser
    // to display a broken/black image, and the aggressive caching means it
    // stays broken for up to 24 hours. We must reject non-image responses.
    if (upstreamContentType && !upstreamContentType.startsWith("image/")) {
      // For Dropbox URLs, try fetching with ?raw=1 if not already present
      if (imageUrl.includes("dropbox.com") && !imageUrl.includes("raw=1")) {
        const retryUrl = imageUrl + (imageUrl.includes("?") ? "&" : "?") + "raw=1";
        console.log(`[image-proxy] Upstream returned ${upstreamContentType}, retrying with ?raw=1: ${retryUrl}`);

        const retryController = new AbortController();
        const retryTimeout = setTimeout(() => retryController.abort(), TIMEOUT_MS);

        try {
          const retryResponse = await fetch(retryUrl, {
            signal: retryController.signal,
            headers: { "User-Agent": "SonidoLiquido-ImageProxy/1.0" },
          });
          clearTimeout(retryTimeout);

          if (retryResponse.ok) {
            const retryContentType = retryResponse.headers.get("content-type") || "";
            if (retryContentType.startsWith("image/")) {
              const retryBody = await retryResponse.arrayBuffer();
              if (retryBody.byteLength <= MAX_SIZE) {
                const mimeType = getMimeType(retryUrl, retryContentType);
                return new NextResponse(retryBody, {
                  status: 200,
                  headers: {
                    "Content-Type": mimeType,
                    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
                    "X-Content-Type-Options": "nosniff",
                    "Content-Length": retryBody.byteLength.toString(),
                    Vary: "Accept-Encoding",
                  },
                });
              }
            }
          }
        } catch {
          // Retry failed, fall through to error
        }
      }

      // For Dropbox URLs that already have ?raw=1 but still return non-image content,
      // try resolving via the Dropbox API to get a temporary direct link.
      // This handles new-format /scl/fi/ URLs where ?raw=1 doesn't always work.
      if (imageUrl.includes("dropbox.com")) {
        console.log(`[image-proxy] ?raw=1 already present but got ${upstreamContentType}, trying Dropbox API resolution`);
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
                    const tempContentType = tempResponse.headers.get("content-type") || "";
                    const tempBody = await tempResponse.arrayBuffer();

                    if (tempBody.byteLength <= MAX_SIZE && (tempContentType.startsWith("image/") || tempContentType.startsWith("video/"))) {
                      const mimeType = tempContentType.startsWith("image/")
                        ? getMimeType(tempLink, tempContentType)
                        : "image/jpeg"; // For video thumbnails, serve as JPEG
                      return new NextResponse(tempBody, {
                        status: 200,
                        headers: {
                          "Content-Type": mimeType,
                          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
                          "X-Content-Type-Options": "nosniff",
                          "Content-Length": tempBody.byteLength.toString(),
                          Vary: "Accept-Encoding",
                        },
                      });
                    }
                  }
                }
              }
            }
          }
        } catch (apiErr) {
          console.warn("[image-proxy] Dropbox API resolution failed:", apiErr);
        }
      }

      console.warn(`[image-proxy] Upstream returned non-image content-type: ${upstreamContentType} for URL: ${imageUrl.substring(0, 100)}`);
      return NextResponse.json(
        { error: `Upstream returned non-image content type: ${upstreamContentType}` },
        { status: 502 }
      );
    }

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
