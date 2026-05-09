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
 * Check if a JPEG buffer is mostly black (over 95% dark pixels).
 * Used to reject thumbnails that the Dropbox API generates as blank/black frames.
 * Samples pixels from the JPEG by checking average brightness.
 */
function isMostlyBlack(jpegBuffer: Buffer): boolean {
  // Quick heuristic: scan the raw JPEG bytes for the image data segment.
  // A simpler approach: check if almost all bytes in the image data are
  // very low values (near 0 = black in JPEG).
  // 
  // More reliable: look at the JPEG entropy. Black images have very low entropy
  // because most of the compressed data is repetitive.
  // 
  // Simplest reliable check: find the SOS marker (FF DA) and sample bytes after it.
  // A truly black JPEG will have very short scan data and mostly zeros.
  
  // Find the Start of Scan marker
  for (let i = 0; i < Math.min(jpegBuffer.length - 1, 50000); i++) {
    if (jpegBuffer[i] === 0xFF && jpegBuffer[i + 1] === 0xDA) {
      // Found SOS marker - the actual image data follows
      // Skip the SOS header (2 bytes + header data)
      const headerLen = jpegBuffer[i + 2] * 256 + jpegBuffer[i + 3];
      const dataStart = i + 2 + headerLen;
      
      if (dataStart >= jpegBuffer.length) break;
      
      // Sample 2000 bytes from the scan data
      const sampleSize = Math.min(2000, jpegBuffer.length - dataStart);
      let zeroCount = 0;
      let lowValueCount = 0;
      
      for (let j = dataStart; j < dataStart + sampleSize; j++) {
        if (jpegBuffer[j] === 0x00) zeroCount++;
        if (jpegBuffer[j] < 0x05) lowValueCount++;
      }
      
      // If more than 85% of bytes are zero or very low, the image is mostly black
      const lowRatio = lowValueCount / sampleSize;
      const zeroRatio = zeroCount / sampleSize;
      
      console.log(`[Thumbnail Gen] Black detection: zero=${(zeroRatio * 100).toFixed(1)}%, low=${(lowRatio * 100).toFixed(1)}%`);
      
      return lowRatio > 0.85;
    }
  }
  
  // If we couldn't find SOS marker, check file size as a fallback
  // Black JPEGs are typically very small (< 5KB for a thumbnail)
  if (jpegBuffer.length < 5000) {
    console.log(`[Thumbnail Gen] File very small (${jpegBuffer.length} bytes), likely black/empty`);
    return true;
  }
  
  return false;
}

/**
 * Resolve a Dropbox shared link URL to a file path using the Dropbox API.
 */
async function resolveDropboxFilePath(videoUrl: string): Promise<string | null> {
  try {
    const token = await dropboxClient.getAccessToken();

    // Convert dl.dropboxusercontent.com URL back to www.dropbox.com shared link
    let sharedLink = videoUrl;
    if (sharedLink.includes("dl.dropboxusercontent.com")) {
      sharedLink = sharedLink.replace("dl.dropboxusercontent.com", "www.dropbox.com");
    }
    // Ensure it has ?dl=0 for the metadata API
    if (!sharedLink.includes("?")) {
      sharedLink += "?dl=0";
    }

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
      const filePath = metaData.path_lower || metaData.path_display;
      console.log("[Thumbnail Gen] Resolved shared link to path:", filePath);
      return filePath;
    } else {
      const errText = await metaResponse.text();
      console.warn("[Thumbnail Gen] Could not resolve shared link:", metaResponse.status, errText);
      return null;
    }
  } catch (err) {
    console.warn("[Thumbnail Gen] Shared link metadata error:", err);
    return null;
  }
}

/**
 * Get a temporary direct download link for a Dropbox file.
 * These links are valid for 4 hours and allow direct HTTP access.
 */
async function getDropboxTemporaryLink(filePath: string): Promise<string | null> {
  try {
    const token = await dropboxClient.getAccessToken();

    const response = await fetch("https://api.dropboxapi.com/2/files/get_temporary_link", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: filePath }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("[Thumbnail Gen] Got temporary link for:", filePath);
      return data.link;
    } else {
      const errText = await response.text();
      console.warn("[Thumbnail Gen] get_temporary_link failed:", response.status, errText);
      return null;
    }
  } catch (err) {
    console.warn("[Thumbnail Gen] Temporary link error:", err);
    return null;
  }
}

/**
 * Try to get a thumbnail using the Dropbox get_thumbnail_v2 API.
 * This works on Netlify serverless where ffmpeg is not available.
 * WARNING: This often returns black/blank frames for vertical videos.
 */
async function getDropboxThumbnail(videoUrl: string): Promise<Buffer | null> {
  try {
    const filePath = await resolveDropboxFilePath(videoUrl);
    if (!filePath) {
      console.warn("[Thumbnail Gen] Could not resolve Dropbox path from URL");
      return null;
    }

    const token = await dropboxClient.getAccessToken();

    const thumbResponse = await fetch("https://content.dropboxapi.com/2/files/get_thumbnail_v2", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          resource: { ".tag": "path", path: filePath },
          format: { ".tag": "jpeg" },
          size: { ".tag": "w2048h1536" },
          mode: { ".tag": "bestfit" },
        }),
      },
      body: "",
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

    // Check if the thumbnail is mostly black — Dropbox API often returns
    // blank black frames for vertical videos
    if (isMostlyBlack(thumbnailBuffer)) {
      console.warn("[Thumbnail Gen] Dropbox API returned a mostly-black thumbnail, rejecting");
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
 * Download a portion of a video from a URL to a local temp file.
 * Downloads up to maxBytes to avoid downloading the entire video for thumbnail extraction.
 */
async function downloadVideoPartial(
  url: string,
  localPath: string,
  maxBytes: number = 15 * 1024 * 1024
): Promise<boolean> {
  try {
    // Try with Range header first to limit download
    const response = await fetch(url, {
      headers: {
        Range: `bytes=0-${maxBytes - 1}`,
        "User-Agent": "SonidoLiquido-ThumbnailGen/1.0",
      },
    });

    if (!response.ok && response.status !== 206) {
      // Range not supported, try full download
      const fullResponse = await fetch(url, {
        headers: {
          "User-Agent": "SonidoLiquido-ThumbnailGen/1.0",
        },
      });
      if (!fullResponse.ok) {
        throw new Error(`Failed to download video: ${fullResponse.status}`);
      }
      const buffer = Buffer.from(await fullResponse.arrayBuffer());
      await writeFile(localPath, buffer);
      return true;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(localPath, buffer);
    return true;
  } catch (error) {
    console.error("[Thumbnail Gen] Video download failed:", error);
    return false;
  }
}

/**
 * Extract a thumbnail frame from a video using ffmpeg.
 * Tries multiple seek positions to find the first non-black frame.
 */
async function extractThumbnailFfmpeg(
  videoPath: string,
  thumbnailPath: string
): Promise<boolean> {
  try {
    // First, get the video duration
    let duration = 10; // default to 10 seconds
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
      console.warn("[Thumbnail Gen] Could not get video duration, using default");
    }

    // Try multiple seek positions to find a non-black frame
    // Start at 0.5s, then try 1s, 2s, 25%, 50% of duration
    const seekPositions = [
      0.5,
      1.0,
      2.0,
      Math.min(3.0, duration * 0.25),
      duration * 0.25,
      duration * 0.5,
    ].filter((t, i, arr) => t < duration && arr.indexOf(t) === i); // dedupe & within bounds

    for (const seekTime of seekPositions) {
      try {
        // Extract frame using ffmpeg with black-frame detection
        // -vf "blackdetect" would be ideal but it's complex; instead we use
        // a simpler approach: extract the frame and check if it's black
        await execFileAsync("ffmpeg", [
          "-y",
          "-ss", seekTime.toString(),
          "-i", videoPath,
          "-frames:v", "1",
          "-q:v", "2",
          "-vf", "scale='min(720,iw)':-2",
          thumbnailPath,
        ]);

        if (!existsSync(thumbnailPath)) continue;

        // Read the generated thumbnail and check if it's black
        const thumbData = await readFile(thumbnailPath);
        if (!isMostlyBlack(thumbData)) {
          console.log(`[Thumbnail Gen] Got non-black frame at ${seekTime}s`);
          return true;
        }

        console.log(`[Thumbnail Gen] Frame at ${seekTime}s is black, trying next position...`);
      } catch {
        // Continue to next seek position
      }
    }

    // If all positions gave black frames, try one more time without seeking
    // (first frame of the video)
    try {
      await execFileAsync("ffmpeg", [
        "-y",
        "-i", videoPath,
        "-frames:v", "1",
        "-q:v", "2",
        "-vf", "scale='min(720,iw)':-2",
        thumbnailPath,
      ]);

      if (existsSync(thumbnailPath)) {
        const thumbData = await readFile(thumbnailPath);
        if (!isMostlyBlack(thumbData)) {
          console.log("[Thumbnail Gen] Got non-black frame from first frame (no seek)");
          return true;
        }
      }
    } catch {
      // Give up
    }

    console.warn("[Thumbnail Gen] All seek positions produced black frames");
    return false;
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

    const cleanBuffer = new Uint8Array(thumbnailBuffer);
    await dropboxClient.uploadFile(dropboxPath, cleanBuffer.buffer as ArrayBuffer);
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
    const { videoId, all, force } = body as { videoId?: string; all?: boolean; force?: boolean };

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
      videos = await db
        .select()
        .from(verticalVideos)
        .where(eq(verticalVideos.id, videoId));
    } else if (all || force) {
      videos = await db
        .select()
        .from(verticalVideos);
    } else {
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

        // Strategy 1: If ffmpeg is available, download video + extract frame
        // This is the most reliable method - it extracts actual video frames
        if (hasFfmpeg) {
          console.log("[Thumbnail Gen] Trying ffmpeg extraction (most reliable)...");
          
          // Get a direct download URL for the video
          let downloadUrl = video.videoUrl;
          
          // For Dropbox URLs, get a temporary direct link
          if (downloadUrl.includes("dropbox")) {
            const filePath = await resolveDropboxFilePath(downloadUrl);
            if (filePath) {
              const tempLink = await getDropboxTemporaryLink(filePath);
              if (tempLink) {
                downloadUrl = tempLink;
              } else {
                // Fallback: convert shared link to direct download
                downloadUrl = downloadUrl.replace("www.dropbox.com", "dl.dropboxusercontent.com");
                downloadUrl = downloadUrl.replace("?dl=0", "").replace("&dl=0", "");
                if (!downloadUrl.includes("dropboxusercontent")) {
                  downloadUrl = downloadUrl + "?dl=1";
                }
              }
            }
          }
          
          const videoTmpPath = path.join(TMP_DIR, `${video.id}_video.tmp`);
          const thumbnailTmpPath = path.join(TMP_DIR, `${video.id}_thumb.jpg`);

          try {
            const downloaded = await downloadVideoPartial(downloadUrl, videoTmpPath);
            if (downloaded) {
              const extracted = await extractThumbnailFfmpeg(videoTmpPath, thumbnailTmpPath);
              if (extracted) {
                thumbnailBuffer = await readFile(thumbnailTmpPath);
              }
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

        // Strategy 2: Try Dropbox get_thumbnail API (works on Netlify without ffmpeg)
        // This is less reliable — it often returns black frames for vertical videos
        if (!thumbnailBuffer) {
          console.log("[Thumbnail Gen] Trying Dropbox thumbnail API...");
          thumbnailBuffer = await getDropboxThumbnail(video.videoUrl);
        }

        if (!thumbnailBuffer) {
          results.push({
            videoId: video.id,
            title: video.title,
            success: false,
            error: hasFfmpeg
              ? "No se pudo generar la miniatura (ffmpeg y Dropbox API fallaron)"
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
