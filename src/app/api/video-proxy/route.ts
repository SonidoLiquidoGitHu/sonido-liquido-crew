import { NextRequest, NextResponse } from "next/server";

/**
 * Public video proxy — enables reliable video playback on all devices.
 *
 * STRATEGY (v2 — redirect-first):
 *
 * 1. **Redirect to Dropbox temporary link** (preferred):
 *    Resolve the Dropbox shared URL via the API to get a temporary direct
 *    CDN link (dl.dropboxusercontent.com) which has proper content-type,
 *    CORS headers, and Range request support. Then return a 302 redirect
 *    so the browser loads the video directly from Dropbox's CDN.
 *
 *    This avoids Netlify's serverless function response body size limit
 *    (6 MB free / ~28 MB Pro) which causes silent failures for any video
 *    larger than the limit when the old buffering approach was used.
 *
 * 2. **Streaming fallback** (for non-Dropbox or failed API resolution):
 *    Stream the video data directly from upstream to the client using
 *    a ReadableStream, avoiding buffering the entire file in memory.
 *    Supports Range requests for seeking.
 *
 * WHY THE OLD APPROACH FAILED:
 * The previous implementation used `await response.arrayBuffer()` which
 * downloaded the ENTIRE video into memory before sending a single byte
 * to the client. On Netlify, serverless functions have a response body
 * size limit (6 MB free tier). Vertical videos (typically 10-100 MB)
 * silently exceeded this limit, causing videos to never load.
 */

const ALLOWED_HOSTS = [
  "dl.dropboxusercontent.com",
  "dropboxusercontent.com",
  "www.dropbox.com",
  "dropbox.com",
  "ucarecdn.com",
];

const TIMEOUT_MS = 30000; // 30s timeout for upstream fetches
const STREAM_CHUNK_SIZE = 64 * 1024; // 64KB chunks for streaming

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

  // ============================================================
  // STRATEGY 1: Redirect to Dropbox temporary direct link
  // ============================================================
  // For Dropbox URLs, resolve via the API to get a temporary CDN link
  // and redirect the browser directly. This avoids the Netlify response
  // body size limit and enables native video streaming + seeking.
  if (videoUrl.includes("dropbox.com") && !videoUrl.includes("dl.dropboxusercontent.com")) {
    try {
      const tempLink = await resolveDropboxTempLink(videoUrl);
      if (tempLink) {
        console.log("[video-proxy] Redirecting to Dropbox temporary link");
        return NextResponse.redirect(tempLink, 302);
      }
    } catch (err) {
      console.warn("[video-proxy] Dropbox API resolution failed, falling back to streaming:", err);
    }
  }

  // ============================================================
  // STRATEGY 2: Stream the video from upstream
  // ============================================================
  // For non-Dropbox URLs or when the API resolution fails, stream
  // the video data directly without buffering the entire file.
  try {
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

    const response = await fetch(videoUrl, {
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

    // Determine content type
    const upstreamContentType = response.headers.get("content-type") || "video/mp4";
    let contentType = upstreamContentType;

    // Fix wrong content-type from Dropbox
    if (!contentType.startsWith("video/") && !contentType.startsWith("application/octet-stream")) {
      const pathname = new URL(videoUrl).pathname.toLowerCase();
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
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      Vary: "Accept-Encoding, Range",
    };

    // Forward content-length and content-range for Range requests
    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }
    const contentRange = response.headers.get("content-range");
    if (contentRange) {
      responseHeaders["Content-Range"] = contentRange;
    }

    // Check if the response body is small enough to buffer safely
    // (under 5 MB — well within Netlify's limit)
    const bodyLength = contentLength ? parseInt(contentLength, 10) : 0;
    if (bodyLength > 0 && bodyLength < 5 * 1024 * 1024 && response.body) {
      // Small file: buffer and return (simpler, more reliable)
      const body = await response.arrayBuffer();
      return new NextResponse(body, {
        status: response.status === 206 ? 206 : 200,
        headers: responseHeaders,
      });
    }

    // Large file or unknown size: stream the response
    if (response.body) {
      const stream = response.body;
      return new NextResponse(stream as unknown as ReadableStream, {
        status: response.status === 206 ? 206 : 200,
        headers: responseHeaders,
      });
    }

    // Fallback: buffer the response (should rarely happen)
    const body = await response.arrayBuffer();
    responseHeaders["Content-Length"] = body.byteLength.toString();

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

// ============================================================
// DROPBOX API RESOLUTION
// ============================================================

/**
 * Resolve a Dropbox shared link to a temporary direct download URL
 * using the Dropbox API. The returned link is from dl.dropboxusercontent.com
 * with proper content-type, CORS headers, and Range request support.
 *
 * These temporary links are valid for ~4 hours and can be used directly
 * by the browser's <video> element without proxying.
 */
async function resolveDropboxTempLink(sharedLinkUrl: string): Promise<string | null> {
  const { dropboxClient } = await import("@/lib/clients/dropbox");

  // Convert URL to a format the metadata API can resolve
  let sharedLink = sharedLinkUrl;
  if (sharedLink.includes("raw=1")) {
    sharedLink = sharedLink.replace("?raw=1", "?dl=0").replace("&raw=1", "&dl=0");
  }
  if (!sharedLink.includes("?")) {
    sharedLink += "?dl=0";
  }

  const token = await dropboxClient.getAccessToken();

  // Step 1: Get file metadata from the shared link
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

  if (!metaResponse.ok) {
    console.warn(`[video-proxy] Dropbox metadata API returned ${metaResponse.status}`);
    return null;
  }

  const metaData = await metaResponse.json();
  const filePath = metaData.path_lower || metaData.path_display;

  if (!filePath) {
    console.warn("[video-proxy] Dropbox metadata did not contain a file path");
    return null;
  }

  // Step 2: Get a temporary direct download link
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

  if (!tempLinkResponse.ok) {
    console.warn(`[video-proxy] Dropbox temp link API returned ${tempLinkResponse.status}`);
    return null;
  }

  const tempLinkData = await tempLinkResponse.json();
  return tempLinkData.link || null;
}
