import { NextRequest, NextResponse } from "next/server";

/**
 * Public video proxy — enables reliable video playback on all devices,
 * especially mobile (iOS Safari) where Dropbox direct links fail due to:
 *
 * 1. Content-type mismatches (Dropbox returns application/json for media files)
 * 2. CORS headers missing on CDN redirect URLs
 * 3. Range request requirements for iOS video playback
 * 4. New-format Dropbox URLs (/scl/fi/...?rlkey=...&raw=1) that may not
 *    resolve correctly when loaded directly by the browser
 *
 * This proxy fetches the video server-side (no CORS/content-type restrictions)
 * and re-serves it with proper headers including Range support for seeking.
 */

const ALLOWED_HOSTS = [
  "dl.dropboxusercontent.com",
  "dropboxusercontent.com",
  "www.dropbox.com",
  "dropbox.com",
  "ucarecdn.com",
];

const TIMEOUT_MS = 30000; // 30s timeout for upstream video fetch

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let videoUrl = searchParams.get("url");

  if (!videoUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Normalize dl.dropboxusercontent.com URLs — they're broken for new-format links.
  // Convert to www.dropbox.com?raw=1 which works with ALL formats.
  if (videoUrl.includes("dl.dropboxusercontent.com")) {
    const fixed = videoUrl
      .replace("dl.dropboxusercontent.com", "www.dropbox.com");
    if (!fixed.includes("raw=1")) {
      videoUrl = fixed + (fixed.includes("?") ? "&" : "?") + "raw=1";
    } else {
      videoUrl = fixed;
    }
    console.log(`[video-proxy] Normalized dl.dropboxusercontent.com → ${videoUrl.substring(0, 100)}`);
  }

  // Also normalize Dropbox URLs missing raw=1 parameter
  if (videoUrl.includes("dropbox.com") && !videoUrl.includes("raw=1") && !videoUrl.includes("dl.dropboxusercontent.com")) {
    if (videoUrl.includes("dl=0")) {
      videoUrl = videoUrl.replace("?dl=0", "?raw=1").replace("&dl=0", "&raw=1");
    } else {
      videoUrl = videoUrl + (videoUrl.includes("?") ? "&" : "?") + "raw=1";
    }
    console.log(`[video-proxy] Added raw=1 to Dropbox URL → ${videoUrl.substring(0, 100)}`);
  }

  // Validate the URL is from an allowed host
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(videoUrl);
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
    // Resolve Dropbox shared links to direct download URLs
    let resolvedUrl = videoUrl;

    // For Dropbox URLs, try to get a temporary direct link via the API
    // This is the most reliable method for both old and new URL formats
    if (videoUrl.includes("dropbox.com") && !videoUrl.includes("dl.dropboxusercontent.com")) {
      try {
        const { dropboxClient } = await import("@/lib/clients/dropbox");

        // Convert URL to a format the metadata API can resolve
        let sharedLink = videoUrl;
        if (sharedLink.includes("raw=1")) {
          sharedLink = sharedLink.replace("?raw=1", "?dl=0").replace("&raw=1", "&dl=0");
        }
        if (!sharedLink.includes("?")) {
          sharedLink += "?dl=0";
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
              if (tempLinkData.link) {
                resolvedUrl = tempLinkData.link;
                console.log("[video-proxy] Resolved Dropbox URL to temporary link");
              }
            }
          }
        }
      } catch (err) {
        console.warn("[video-proxy] Dropbox API resolution failed, using original URL:", err);
        // Fall back to using the URL as-is (with ?raw=1 if present)
      }
    }

    // Forward the client's Range header for seeking support
    const rangeHeader = request.headers.get("range");
    const fetchHeaders: Record<string, string> = {
      "User-Agent": "SonidoLiquido-VideoProxy/1.0",
    };
    if (rangeHeader) {
      fetchHeaders["Range"] = rangeHeader;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(resolvedUrl, {
      signal: controller.signal,
      headers: fetchHeaders,
    });

    clearTimeout(timeout);

    if (!response.ok && response.status !== 206) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: response.status }
      );
    }

    const body = await response.arrayBuffer();

    // Determine content type
    const upstreamContentType = response.headers.get("content-type") || "video/mp4";
    let contentType = upstreamContentType;

    // Fix wrong content-type from Dropbox
    if (!contentType.startsWith("video/") && !contentType.startsWith("application/octet-stream")) {
      // Infer from URL or default to video/mp4
      const pathname = new URL(resolvedUrl).pathname.toLowerCase();
      if (pathname.includes(".webm")) {
        contentType = "video/webm";
      } else {
        contentType = "video/mp4";
      }
    } else if (contentType.startsWith("application/octet-stream")) {
      contentType = "video/mp4";
    }

    // Build response headers
    const responseHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Length": body.byteLength.toString(),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      Vary: "Accept-Encoding",
    };

    // Forward Range-related headers for seeking
    const contentRange = response.headers.get("content-range");
    if (contentRange) {
      responseHeaders["Content-Range"] = contentRange;
    }

    return new NextResponse(body, {
      status: response.status === 206 ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json({ error: "Upstream timeout" }, { status: 504 });
    }
    console.error("[video-proxy] Error fetching:", videoUrl, error);
    return NextResponse.json({ error: "Failed to fetch video" }, { status: 500 });
  }
}
