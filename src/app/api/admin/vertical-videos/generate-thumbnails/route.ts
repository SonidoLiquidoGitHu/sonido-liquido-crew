import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { db } from "@/db/client";
import { verticalVideos } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";
import { dropboxClient } from "@/lib/clients/dropbox";

const execFileAsync = promisify(execFile);

// Check if ffmpeg is available
let _ffmpegAvailable: boolean | null = null;
async function isFfmpegAvailable(): Promise<boolean> {
  if (_ffmpegAvailable !== null) return _ffmpegAvailable;
  try {
    await execFileAsync("ffmpeg", ["-version"]);
    _ffmpegAvailable = true;
  } catch {
    _ffmpegAvailable = false;
    console.warn("[Thumbnail Gen] ffmpeg not available on this system");
  }
  return _ffmpegAvailable;
}

// Temp directory for video processing
const TMP_DIR = "/tmp/slc-thumbnails";

async function ensureTmpDir() {
  if (!existsSync(TMP_DIR)) {
    await mkdir(TMP_DIR, { recursive: true });
  }
}

/**
 * Try to get a thumbnail using the Dropbox get_thumbnail_v2 API
 * This works on Netlify serverless where ffmpeg is not available
 * It requires the Dropbox file path (not the shared link URL)
 */
async function getDropboxThumbnail(videoUrl: string): Promise<Buffer | null> {
  try {
    // The video URL is a Dropbox shared link like:
    // https://dl.dropboxusercontent.com/s/abc123/filename.mp4
    // or https://www.dropbox.com/s/abc123/filename.mp4
    // We need to resolve this to a Dropbox file path

    const token = await dropboxClient.getAccessToken();

    // Step 1: Try to resolve the shared link to get the file path
    // Use /sharing/get_shared_link_metadata
    let filePath: string | null = null;

    // Convert dl.dropboxusercontent.com URL back to www.dropbox.com shared link
    let sharedLink = videoUrl;
    if (sharedLink.includes("dl.dropboxusercontent.com")) {
      sharedLink = sharedLink.replace("dl.dropboxusercontent.com", "www.dropbox.com");
    }
    // Ensure it has ?dl=0 for the metadata API
    if (!sharedLink.includes("?")) {
      sharedLink += "?dl=0";
    }

    try {
      const metaResponse = await fetch("https://api.dropboxapi.com/2/sharing/get_shared_link_metadata", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: sharedLink }),
      });

      if (metaResponse.ok) {
        const metaData = await metaResponse.json();
        filePath = metaData.path_lower || metaData.path_display;
        console.log("[Thumbnail Gen] Resolved shared link to path:", filePath);
      } else {
        const errText = await metaResponse.text();
        console.warn("[Thumbnail Gen] Could not resolve shared link:", metaResponse.status, errText);
      }
    } catch (err) {
      console.warn("[Thumbnail Gen] Shared link metadata error:", err);
    }

    if (!filePath) {
      console.warn("[Thumbnail Gen] Could not resolve Dropbox path from URL");
      return null;
    }

    // Step 2: Use get_thumbnail_v2 to get a thumbnail
    const thumbResponse = await fetch("https://content.dropboxapi.com/2/files/get_thumbnail_v2", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          resource: { ".tag": "path", path: filePath },
          format: { ".tag": "jpeg" },
          size: { ".tag": "w1024h768" },
          mode: { ".tag": "bestfit" },
        }),
      },
      body: "", // Empty body required
    });

    if (!thumbResponse.ok) {
      const errText = await thumbResponse.text();
      console.warn("[Thumbnail Gen] get_thumbnail_v2 failed:", thumbResponse.status, errText);
      return null;
    }

    const thumbnailBuffer = Buffer.from(await thumbResponse.arrayBuffer());
    if (thumbnailBuffer.length < 100) {
      console.warn("[Thumbnail Gen] Thumbnail too small, likely failed:", thumbnailBuffer.length, "bytes");
      return null;
    }

    console.log("[Thumbnail Gen] Got thumbnail from Dropbox API, size:", thumbnailBuffer.length, "bytes");
    return thumbnailBuffer;
  } catch (error) {
    console.error("[Thumbnail Gen] Dropbox thumbnail API error:", error);
    return null;
  }
}

/**
 * Download a video from a URL to a local temp file
 */
async function downloadVideo(url: string, localPath: string): Promise<void> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "SonidoLiquido-ThumbnailGen/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(localPath, buffer);
}

/**
 * Extract a thumbnail frame from a video using ffmpeg
 * Seeks to 25% of the video duration to get a meaningful frame
 */
async function extractThumbnailFfmpeg(
  videoPath: string,
  thumbnailPath: string
): Promise<boolean> {
  try {
    // First, get the video duration
    let duration = 5; // default to 5 seconds
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        videoPath,
      ]);
      const parsed = parseFloat(stdout.trim());
      if (!isNaN(parsed) && parsed > 0) {
        duration = parsed;
      }
    } catch {
      console.warn("[Thumbnail Gen] Could not get video duration, using default seek time");
    }

    // Seek to 25% of duration (but at least 0.5s)
    const seekTime = Math.max(0.5, duration * 0.25);

    // Extract frame using ffmpeg
    await execFileAsync("ffmpeg", [
      "-y",                    // Overwrite output
      "-ss", seekTime.toString(), // Seek position
      "-i", videoPath,        // Input file
      "-frames:v", "1",       // Extract 1 frame
      "-q:v", "2",            // High quality JPEG
      "-vf", "scale='min(720,iw)':-2", // Scale to max 720px wide, keep aspect ratio
      thumbnailPath,
    ]);

    return existsSync(thumbnailPath);
  } catch (error) {
    console.error("[Thumbnail Gen] ffmpeg extraction failed:", error);
    return false;
  }
}

/**
 * Upload a thumbnail image to Dropbox and return the public URL
 */
async function uploadThumbnailToDropbox(
  thumbnailBuffer: Buffer,
  videoId: string
): Promise<string | null> {
  try {
    const dropboxPath = `/vertical-videos/thumbnails/${videoId}.jpg`;

    await dropboxClient.uploadFile(dropboxPath, thumbnailBuffer.buffer as ArrayBuffer);
    const sharedUrl = await dropboxClient.getSharedLink(dropboxPath);

    return sharedUrl;
  } catch (error) {
    console.error("[Thumbnail Gen] Dropbox upload failed:", error);
    return null;
  }
}

/**
 * Clean up temp files
 */
async function cleanup(...paths: string[]) {
  for (const p of paths) {
    try {
      if (existsSync(p)) await unlink(p);
    } catch {
      // Ignore cleanup errors
    }
  }
}

// ===========================================
// POST - Generate thumbnails for vertical videos
// ===========================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { videoId, all } = body as { videoId?: string; all?: boolean };

    // Check if Dropbox is configured
    const dropboxReady = await dropboxClient.isConfiguredAsync();
    if (!dropboxReady) {
      return NextResponse.json(
        { success: false, error: "Dropbox no está configurado" },
        { status: 501 }
      );
    }

    // Check if ffmpeg is available (for full extraction)
    const hasFfmpeg = await isFfmpegAvailable();

    await ensureTmpDir();

    // Fetch videos that need thumbnails
    let videos;
    if (videoId) {
      // Generate for a specific video
      videos = await db
        .select()
        .from(verticalVideos)
        .where(eq(verticalVideos.id, videoId));
    } else if (all) {
      // Generate for ALL videos (even those with thumbnails - useful for regeneration)
      videos = await db
        .select()
        .from(verticalVideos);
    } else {
      // Generate only for videos WITHOUT thumbnails
      videos = await db
        .select()
        .from(verticalVideos)
        .where(isNull(verticalVideos.thumbnailUrl));
    }

    if (!videos || videos.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay videos que necesiten miniaturas",
        generated: 0,
      });
    }

    const results: {
      videoId: string;
      title: string | null;
      success: boolean;
      thumbnailUrl?: string;
      error?: string;
    }[] = [];

    let generated = 0;

    for (const video of videos) {
      if (!video.videoUrl) {
        results.push({
          videoId: video.id,
          title: video.title,
          success: false,
          error: "No hay URL de video",
        });
        continue;
      }

      try {
        console.log(`[Thumbnail Gen] Processing: ${video.title || video.id}`);

        let thumbnailBuffer: Buffer | null = null;

        // Strategy 1: Try Dropbox get_thumbnail API (works on Netlify serverless)
        console.log("[Thumbnail Gen] Trying Dropbox thumbnail API...");
        thumbnailBuffer = await getDropboxThumbnail(video.videoUrl);

        // Strategy 2: If ffmpeg is available, download + extract (higher quality)
        if (!thumbnailBuffer && hasFfmpeg) {
          console.log("[Thumbnail Gen] Dropbox API failed, trying ffmpeg...");
          const videoTmpPath = path.join(TMP_DIR, `${video.id}_video.tmp`);
          const thumbnailTmpPath = path.join(TMP_DIR, `${video.id}_thumb.jpg`);

          try {
            await downloadVideo(video.videoUrl, videoTmpPath);
            const extracted = await extractThumbnailFfmpeg(videoTmpPath, thumbnailTmpPath);
            if (extracted) {
              thumbnailBuffer = await readFile(thumbnailTmpPath);
            }
          } catch (dlErr) {
            console.warn("[Thumbnail Gen] Download/ffmpeg extraction failed:", dlErr);
          } finally {
            await cleanup(
              path.join(TMP_DIR, `${video.id}_video.tmp`),
              path.join(TMP_DIR, `${video.id}_thumb.jpg`)
            );
          }
        }

        if (!thumbnailBuffer) {
          results.push({
            videoId: video.id,
            title: video.title,
            success: false,
            error: hasFfmpeg
              ? "No se pudo generar la miniatura (Dropbox API y ffmpeg fallaron)"
              : "No se pudo generar la miniatura. El servidor no tiene ffmpeg y la API de Dropbox no pudo generarla.",
          });
          continue;
        }

        // Upload thumbnail to Dropbox
        const thumbnailUrl = await uploadThumbnailToDropbox(thumbnailBuffer, video.id);
        if (!thumbnailUrl) {
          results.push({
            videoId: video.id,
            title: video.title,
            success: false,
            error: "No se pudo subir la miniatura a Dropbox",
          });
          continue;
        }

        // Update the database
        await db
          .update(verticalVideos)
          .set({ thumbnailUrl, updatedAt: new Date() })
          .where(eq(verticalVideos.id, video.id));

        results.push({
          videoId: video.id,
          title: video.title,
          success: true,
          thumbnailUrl,
        });
        generated++;

        console.log(`[Thumbnail Gen] Success: ${video.title} → ${thumbnailUrl}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Thumbnail Gen] Failed for ${video.id}:`, errorMsg);
        results.push({
          videoId: video.id,
          title: video.title,
          success: false,
          error: errorMsg,
        });
      }
    }

    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: generated > 0,
      message: `Se generaron ${generated} miniaturas de ${videos.length} videos${
        failedCount > 0 ? `. ${failedCount} fallaron.` : ""
      }`,
      generated,
      total: videos.length,
      results,
    });
  } catch (error) {
    console.error("[Thumbnail Gen] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
