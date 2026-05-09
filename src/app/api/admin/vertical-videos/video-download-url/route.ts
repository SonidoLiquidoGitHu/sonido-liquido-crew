import { NextRequest, NextResponse } from "next/server";
import { dropboxClient } from "@/lib/clients/dropbox";

/**
 * Returns a temporary direct download URL for a vertical video.
 *
 * This is used by the client-side thumbnail extraction to download the FULL
 * video (not just a partial proxy). By getting a Dropbox temporary link (valid
 * 4 hours), the client can fetch the complete video as a blob, create an
 * object URL, and safely extract frames via canvas without moov atom issues.
 *
 * The temporary link from Dropbox includes proper CORS headers, so the client
 * can fetch it directly without a proxy.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId");

  if (!videoId) {
    return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
  }

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

    let downloadUrl = video.videoUrl;

    // For Dropbox URLs, resolve to a temporary direct download link
    if (downloadUrl.includes("dropbox")) {
      try {
        // Convert direct link back to shared link format for metadata lookup
        let sharedLink = downloadUrl;
        if (sharedLink.includes("dl.dropboxusercontent.com")) {
          sharedLink = sharedLink.replace("dl.dropboxusercontent.com", "www.dropbox.com");
        }
        // Handle ?raw=1 URLs — convert back to standard shared link format
        if (sharedLink.includes("raw=1")) {
          sharedLink = sharedLink.replace("?raw=1", "?dl=0").replace("&raw=1", "&dl=0");
        }
        if (!sharedLink.includes("?")) {
          sharedLink += "?dl=0";
        }

        // Try to get shared link metadata to find the file path
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
            // Get a temporary direct link (valid for 4 hours, has CORS headers)
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
              console.log("[Video Download URL] Got temporary link for:", filePath);
            }
          }
        }
      } catch (err) {
        console.warn("[Video Download URL] Could not resolve Dropbox path:", err);

        // Fallback: try ?raw=1 or ?dl=1 for direct download
        if (downloadUrl.includes("dl.dropboxusercontent.com")) {
          // Old format — keep as-is
        } else if (downloadUrl.includes("www.dropbox.com")) {
          // New format — ensure ?raw=1 for direct access
          if (!downloadUrl.includes("raw=1") && !downloadUrl.includes("dl=1")) {
            downloadUrl += (downloadUrl.includes("?") ? "&" : "?") + "raw=1";
          }
          downloadUrl = downloadUrl.replace("?dl=0", "?raw=1").replace("&dl=0", "&raw=1");
        }
      }
    }

    return NextResponse.json({
      success: true,
      downloadUrl,
    });
  } catch (error) {
    console.error("[Video Download URL] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
