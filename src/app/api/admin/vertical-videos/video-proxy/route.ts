import { NextRequest, NextResponse } from "next/server";
import { dropboxClient } from "@/lib/clients/dropbox";

/**
 * Video proxy endpoint for client-side thumbnail extraction.
 *
 * Problem: Dropbox direct links (dl.dropboxusercontent.com) don't serve
 * CORS headers, so loading a video into a <video> element with
 * crossOrigin="anonymous" taints the canvas, preventing toBlob().
 *
 * Solution: This endpoint fetches the video server-side (no CORS
 * restrictions) and re-serves it with proper CORS headers. The client
 * can then safely extract a frame via canvas.
 *
 * To avoid downloading the entire video, we use HTTP Range requests
 * and only fetch the first ~2 MB, which is typically enough for the
 * moov atom + a few frames.
 */

// 50 MB — increased from 15 MB because many MP4s store the moov atom at the
// end of the file. Without it, the browser cannot seek to any frame, resulting
// in a black canvas when trying to extract a thumbnail.  50 MB gives a much
// better chance of including the moov atom for short vertical videos.
// NOTE: This proxy is now a fallback; the primary approach uses the
// video-download-url endpoint to fetch the full video as a blob.
const MAX_BYTES = 50 * 1024 * 1024;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
  }

  // Dynamically import DB to look up the video URL
  try {
    const { db } = await import("@/db/client");
    const { verticalVideos } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const [video] = await db
      .select({ videoUrl: verticalVideos.videoUrl })
      .from(verticalVideos)
      .where(eq(verticalVideos.id, videoId));

    if (!video?.videoUrl) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Try to resolve Dropbox shared link to a direct download path
    let downloadUrl = video.videoUrl;

    // If this is a Dropbox shared link, try to get a temporary direct link
    if (downloadUrl.includes("dropbox")) {
      try {
        // Convert dl.dropboxusercontent.com URL back to a path
        // We need to resolve the shared link to a file path first
        const token = await dropboxClient.getAccessToken();

        // Convert direct link back to shared link format for metadata lookup
        let sharedLink = downloadUrl;
        if (sharedLink.includes("dl.dropboxusercontent.com")) {
          sharedLink = sharedLink.replace("dl.dropboxusercontent.com", "www.dropbox.com");
        }
        if (!sharedLink.includes("?")) {
          sharedLink += "?dl=0";
        }

        // Try to get shared link metadata to find the file path
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
            // Get a temporary direct link (valid for 4h)
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
              downloadUrl = tempLinkData.link;
            }
          }
        }
      } catch (err) {
        console.warn("[Video Proxy] Could not resolve Dropbox path, using original URL:", err);
      }
    }

    // Fetch the video with Range header to limit download size
    const response = await fetch(downloadUrl, {
      headers: {
        Range: `bytes=0-${MAX_BYTES - 1}`,
        "User-Agent": "SonidoLiquido-VideoProxy/1.0",
      },
    });

    if (!response.ok && response.status !== 206) {
      return NextResponse.json(
        { error: `Failed to fetch video: ${response.status}` },
        { status: response.status }
      );
    }

    const body = await response.arrayBuffer();
    const contentRange = response.headers.get("content-range");
    const contentLength = response.headers.get("content-length");
    const totalSize = contentRange
      ? parseInt(contentRange.split("/")[1], 10)
      : body.byteLength;

    // Re-serve with CORS headers and proper content type
    return new NextResponse(body, {
      status: response.status === 206 ? 206 : 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": body.byteLength.toString(),
        "Content-Range": contentRange || `bytes 0-${body.byteLength - 1}/${totalSize}`,
        "Accept-Ranges": "bytes",
        // CORS headers so the client canvas is not tainted
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Range",
        // Cache for 1 hour – the video content is immutable
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[Video Proxy] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
