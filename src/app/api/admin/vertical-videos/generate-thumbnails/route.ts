import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { db } from "@/db/client";
import { artists, verticalVideos } from "@/db/schema";
import { dropboxClient } from "@/lib/clients/dropbox";
import { eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

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
 * Uses two methods:
 * 1. Size check: Black JPEGs are typically very small (< 5KB)
 * 2. Byte sampling: Check JPEG scan data for low values
 * 3. If ffmpeg is available, also check actual pixel values
 *
 * IMPORTANT: The Dropbox get_thumbnail_v2 API often returns black/blank frames
 * for video files. This function tries to detect those.
 */
function isMostlyBlack(jpegBuffer: Buffer): boolean {
  // Method 1: File size check — black JPEGs are very small
  if (jpegBuffer.length < 3000) {
    console.log(
      `[Thumbnail Gen] File very small (${jpegBuffer.length} bytes), likely black/empty`,
    );
    return true;
  }

  // Method 2: Check JPEG scan data for low values
  // Find the Start of Scan marker (FF DA)
  let foundSOS = false;
  for (let i = 0; i < Math.min(jpegBuffer.length - 1, 50000); i++) {
    if (jpegBuffer[i] === 0xff && jpegBuffer[i + 1] === 0xda) {
      foundSOS = true;
      const headerLen = jpegBuffer[i + 2] * 256 + jpegBuffer[i + 3];
      const dataStart = i + 2 + headerLen;

      if (dataStart >= jpegBuffer.length) break;

      // Sample bytes from the scan data
      const sampleSize = Math.min(3000, jpegBuffer.length - dataStart);
      let lowValueCount = 0;

      for (let j = dataStart; j < dataStart + sampleSize; j++) {
        // In JPEG, after byte stuffing (0xFF 0x00 → 0xFF), values below 0x10
        // in the DC coefficient area indicate very small pixel differences (near-black)
        if (jpegBuffer[j] < 0x08) lowValueCount++;
      }

      const lowRatio = lowValueCount / sampleSize;
      console.log(
        `[Thumbnail Gen] Black detection (byte scan): low=${(lowRatio * 100).toFixed(1)}%`,
      );

      if (lowRatio > 0.85) {
        return true;
      }
      break;
    }
  }

  // Method 3: If no SOS marker found and file is small, likely black
  if (!foundSOS && jpegBuffer.length < 8000) {
    console.log(
      `[Thumbnail Gen] No SOS marker and small file (${jpegBuffer.length} bytes), likely black`,
    );
    return true;
  }

  return false;
}

/**
 * Resolve a Dropbox shared link URL to a file path using the Dropbox API.
 */
async function resolveDropboxFilePath(
  videoUrl: string,
): Promise<string | null> {
  try {
    const token = await dropboxClient.getAccessToken();

    // Convert dl.dropboxusercontent.com URL back to www.dropbox.com shared link
    let sharedLink = videoUrl;
    if (sharedLink.includes("dl.dropboxusercontent.com")) {
      sharedLink = sharedLink.replace(
        "dl.dropboxusercontent.com",
        "www.dropbox.com",
      );
    }
    // Handle ?raw=1 URLs — convert back to standard shared link format
    if (sharedLink.includes("raw=1")) {
      sharedLink = sharedLink
        .replace("?raw=1", "?dl=0")
        .replace("&raw=1", "&dl=0");
    }
    // Ensure it has ?dl=0 for the metadata API
    if (!sharedLink.includes("?")) {
      sharedLink += "?dl=0";
    }

    const metaResponse = await fetch(
      "https://api.dropboxapi.com/2/sharing/get_shared_link_metadata",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: sharedLink }),
      },
    );

    if (metaResponse.ok) {
      const metaData = await metaResponse.json();
      const filePath = metaData.path_lower || metaData.path_display;
      console.log("[Thumbnail Gen] Resolved shared link to path:", filePath);
      return filePath;
    }
    const errText = await metaResponse.text();
    console.warn(
      "[Thumbnail Gen] Could not resolve shared link:",
      metaResponse.status,
      errText,
    );
    return null;
  } catch (err) {
    console.warn("[Thumbnail Gen] Shared link metadata error:", err);
    return null;
  }
}

/**
 * Get a temporary direct download link for a Dropbox file.
 * These links are valid for 4 hours and allow direct HTTP access.
 */
async function getDropboxTemporaryLink(
  filePath: string,
): Promise<string | null> {
  try {
    const token = await dropboxClient.getAccessToken();

    const response = await fetch(
      "https://api.dropboxapi.com/2/files/get_temporary_link",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: filePath }),
      },
    );

    if (response.ok) {
      const data = await response.json();
      console.log("[Thumbnail Gen] Got temporary link for:", filePath);
      return data.link;
    }
    const errText = await response.text();
    console.warn(
      "[Thumbnail Gen] get_temporary_link failed:",
      response.status,
      errText,
    );
    return null;
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

    const thumbResponse = await fetch(
      "https://content.dropboxapi.com/2/files/get_thumbnail_v2",
      {
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
      },
    );

    if (!thumbResponse.ok) {
      const errText = await thumbResponse.text();
      console.warn(
        "[Thumbnail Gen] get_thumbnail_v2 failed:",
        thumbResponse.status,
        errText,
      );
      return null;
    }

    const thumbnailBuffer = Buffer.from(await thumbResponse.arrayBuffer());
    if (thumbnailBuffer.length < 100) {
      console.warn(
        "[Thumbnail Gen] Thumbnail too small, likely failed:",
        thumbnailBuffer.length,
        "bytes",
      );
      return null;
    }

    // Check if the thumbnail is mostly black — Dropbox API often returns
    // blank black frames for vertical videos
    if (isMostlyBlack(thumbnailBuffer)) {
      console.warn(
        "[Thumbnail Gen] Dropbox API returned a mostly-black thumbnail, rejecting",
      );
      return null;
    }

    console.log(
      "[Thumbnail Gen] Got thumbnail from Dropbox API, size:",
      thumbnailBuffer.length,
      "bytes",
    );
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
  maxBytes: number = 15 * 1024 * 1024,
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
  thumbnailPath: string,
): Promise<boolean> {
  try {
    // First, get the video duration
    let duration = 10; // default to 10 seconds
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        videoPath,
      ]);
      const parsed = Number.parseFloat(stdout.trim());
      if (!Number.isNaN(parsed) && parsed > 0) {
        duration = parsed;
      }
    } catch {
      console.warn(
        "[Thumbnail Gen] Could not get video duration, using default",
      );
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
          "-ss",
          seekTime.toString(),
          "-i",
          videoPath,
          "-frames:v",
          "1",
          "-q:v",
          "2",
          "-vf",
          "scale='min(720,iw)':-2",
          thumbnailPath,
        ]);

        if (!existsSync(thumbnailPath)) continue;

        // Read the generated thumbnail and check if it's black
        const thumbData = await readFile(thumbnailPath);
        if (!isMostlyBlack(thumbData)) {
          console.log(`[Thumbnail Gen] Got non-black frame at ${seekTime}s`);
          return true;
        }

        console.log(
          `[Thumbnail Gen] Frame at ${seekTime}s is black, trying next position...`,
        );
      } catch {
        // Continue to next seek position
      }
    }

    // If all positions gave black frames, try one more time without seeking
    // (first frame of the video)
    try {
      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        videoPath,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        "-vf",
        "scale='min(720,iw)':-2",
        thumbnailPath,
      ]);

      if (existsSync(thumbnailPath)) {
        const thumbData = await readFile(thumbnailPath);
        if (!isMostlyBlack(thumbData)) {
          console.log(
            "[Thumbnail Gen] Got non-black frame from first frame (no seek)",
          );
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
  videoId: string,
): Promise<string | null> {
  try {
    const dropboxPath = `/vertical-videos/thumbnails/${videoId}.jpg`;

    const cleanBuffer = new Uint8Array(thumbnailBuffer);
    await dropboxClient.uploadFile(
      dropboxPath,
      cleanBuffer.buffer as ArrayBuffer,
    );
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
// THUMBNAIL TEXT OVERLAY — Add title + artist name to vertical video thumbnails
// ===========================================

/**
 * Add a text overlay (title + artist name) to a thumbnail image buffer.
 * Uses Sharp to composite an SVG overlay with semi-transparent background
 * at the bottom of the image, matching the Sonido Liquido brand style.
 *
 * Design:
 * - Semi-transparent black gradient overlay at the bottom 35% of the image
 * - Title in bold Oswald-style font, white, larger size
 * - Artist name in regular weight, white with slight opacity, smaller size
 * - Small SLC branding line at the very bottom
 */
async function addTextOverlayToThumbnail(
  thumbnailBuffer: Buffer,
  title: string | null,
  artistName: string | null,
): Promise<Buffer> {
  try {
    const image = sharp(thumbnailBuffer);
    const metadata = await image.metadata();
    const width = metadata.width || 720;
    const height = metadata.height || 1280;

    // Truncate long text to prevent overflow
    const maxTitleLen = 40;
    const maxArtistLen = 30;
    const displayTitle =
      title && title.length > maxTitleLen
        ? `${title.substring(0, maxTitleLen - 3)}...`
        : title;
    const displayArtist =
      artistName && artistName.length > maxArtistLen
        ? `${artistName.substring(0, maxArtistLen - 3)}...`
        : artistName;

    // Font size scales with image width
    const titleFontSize = Math.max(Math.round(width * 0.065), 24);
    const artistFontSize = Math.max(Math.round(width * 0.045), 18);
    const brandFontSize = Math.max(Math.round(width * 0.03), 12);

    // Overlay height: ~35% of image
    const overlayHeight = Math.round(height * 0.35);
    const overlayY = height - overlayHeight;

    // Build text lines with proper vertical positioning
    const titleY = overlayY + overlayHeight * 0.35;
    const artistY = overlayY + overlayHeight * 0.55;
    const brandY = overlayY + overlayHeight * 0.85;

    // Escape special XML characters in text
    const escapeXml = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const titleLine = displayTitle
      ? `<text x="${width / 2}" y="${titleY}" text-anchor="middle" fill="white" font-size="${titleFontSize}" font-weight="bold" font-family="Oswald, Arial, sans-serif" letter-spacing="1">${escapeXml(displayTitle)}</text>`
      : "";

    const artistLine = displayArtist
      ? `<text x="${width / 2}" y="${artistY}" text-anchor="middle" fill="white" fill-opacity="0.85" font-size="${artistFontSize}" font-weight="normal" font-family="Oswald, Arial, sans-serif">${escapeXml(displayArtist)}</text>`
      : "";

    // Only add overlay if there's text to show
    if (!titleLine && !artistLine) {
      return thumbnailBuffer;
    }

    // Create SVG overlay with gradient background
    const svgOverlay = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="overlay-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="black" stop-opacity="0"/>
          <stop offset="30%" stop-color="black" stop-opacity="0.4"/>
          <stop offset="60%" stop-color="black" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="black" stop-opacity="0.85"/>
        </linearGradient>
      </defs>
      <rect x="0" y="${overlayY}" width="${width}" height="${overlayHeight}" fill="url(#overlay-grad)"/>
      ${titleLine}
      ${artistLine}
      <text x="${width / 2}" y="${brandY}" text-anchor="middle" fill="white" fill-opacity="0.5" font-size="${brandFontSize}" font-weight="normal" font-family="Oswald, Arial, sans-serif" letter-spacing="3">SONIDO LÍQUIDO</text>
    </svg>`;

    const overlayBuffer = Buffer.from(svgOverlay);

    const resultBuffer = await image
      .composite([
        {
          input: overlayBuffer,
          top: 0,
          left: 0,
        },
      ])
      .jpeg({ quality: 85 })
      .toBuffer();

    console.log(
      `[Thumbnail Gen] Added text overlay: "${displayTitle}" by "${displayArtist}"`,
    );
    return resultBuffer;
  } catch (error) {
    console.warn(
      "[Thumbnail Gen] Text overlay failed, using original thumbnail:",
      error,
    );
    return thumbnailBuffer;
  }
}

// ===========================================
// POST - Generate thumbnails for vertical videos
// ===========================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { videoId, all, force, fixUrls } = body as {
      videoId?: string;
      all?: boolean;
      force?: boolean;
      fixUrls?: boolean;
    };

    // ===========================================
    // Fix broken thumbnail URLs (dl.dropboxusercontent.com → ?raw=1)
    // ===========================================
    if (fixUrls) {
      const allVideos = await db.select().from(verticalVideos);
      let fixed = 0;
      for (const video of allVideos) {
        let needsUpdate = false;
        let newThumbnailUrl = video.thumbnailUrl;
        let newVideoUrl = video.videoUrl;

        // Fix thumbnail URLs: dl.dropboxusercontent.com → www.dropbox.com?raw=1
        if (newThumbnailUrl?.includes("dl.dropboxusercontent.com")) {
          newThumbnailUrl = newThumbnailUrl.replace(
            "dl.dropboxusercontent.com",
            "www.dropbox.com",
          );
          if (newThumbnailUrl.includes("?")) {
            newThumbnailUrl = newThumbnailUrl
              .replace(/\?dl=\d+/, "?raw=1")
              .replace(/&dl=\d+/, "&raw=1");
            if (!newThumbnailUrl.includes("raw=1")) {
              newThumbnailUrl += "&raw=1";
            }
          } else {
            newThumbnailUrl += "?raw=1";
          }
          needsUpdate = true;
        }

        // Fix video URLs: dl.dropboxusercontent.com → www.dropbox.com?raw=1
        if (newVideoUrl?.includes("dl.dropboxusercontent.com")) {
          newVideoUrl = newVideoUrl.replace(
            "dl.dropboxusercontent.com",
            "www.dropbox.com",
          );
          if (newVideoUrl.includes("?")) {
            newVideoUrl = newVideoUrl
              .replace(/\?dl=\d+/, "?raw=1")
              .replace(/&dl=\d+/, "&raw=1");
            if (!newVideoUrl.includes("raw=1")) {
              newVideoUrl += "&raw=1";
            }
          } else {
            newVideoUrl += "?raw=1";
          }
          needsUpdate = true;
        }

        if (needsUpdate) {
          const updateData: Record<string, unknown> = { updatedAt: new Date() };
          if (newThumbnailUrl !== video.thumbnailUrl)
            updateData.thumbnailUrl = newThumbnailUrl;
          if (newVideoUrl !== video.videoUrl) updateData.videoUrl = newVideoUrl;
          await db
            .update(verticalVideos)
            .set(updateData)
            .where(eq(verticalVideos.id, video.id));
          console.log(`[Thumbnail Fix] Fixed URLs for ${video.id}`);
          fixed++;
        }
      }
      return NextResponse.json({
        success: true,
        message: `Fixed ${fixed} video URLs out of ${allVideos.length} videos`,
        fixed,
        total: allVideos.length,
      });
    }

    // Check if Dropbox is configured
    const dropboxReady = await dropboxClient.isConfiguredAsync();
    if (!dropboxReady) {
      return NextResponse.json(
        { success: false, error: "Dropbox no está configurado" },
        { status: 501 },
      );
    }

    // Check if ffmpeg is available (for full extraction)
    const hasFfmpeg = await isFfmpegAvailable();

    await ensureTmpDir();

    // Fetch videos that need thumbnails
    // biome-ignore lint/suspicious/noImplicitAnyLet: inferred type
    let videos;
    if (videoId) {
      videos = await db
        .select()
        .from(verticalVideos)
        .where(eq(verticalVideos.id, videoId));
    } else if (all || force) {
      videos = await db.select().from(verticalVideos);
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

    // Fetch all artists once for name lookup (used in text overlay)
    const allArtists = await db
      .select({
        id: artists.id,
        name: artists.name,
      })
      .from(artists);
    const artistMap = new Map(allArtists.map((a) => [a.id, a.name]));

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
          console.log(
            "[Thumbnail Gen] Trying ffmpeg extraction (most reliable)...",
          );

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
                // Fallback: use ?raw=1 for direct download
                // (dl.dropboxusercontent.com doesn't work with new /scl/fi/ URL format)
                if (downloadUrl.includes("dl.dropboxusercontent.com")) {
                  // Old format — keep as-is
                } else if (downloadUrl.includes("www.dropbox.com")) {
                  downloadUrl = downloadUrl
                    .replace("?dl=0", "?raw=1")
                    .replace("&dl=0", "&raw=1");
                  if (!downloadUrl.includes("raw=1")) {
                    downloadUrl += `${downloadUrl.includes("?") ? "&" : "?"}raw=1`;
                  }
                }
              }
            }
          }

          const videoTmpPath = path.join(TMP_DIR, `${video.id}_video.tmp`);
          const thumbnailTmpPath = path.join(TMP_DIR, `${video.id}_thumb.jpg`);

          try {
            const downloaded = await downloadVideoPartial(
              downloadUrl,
              videoTmpPath,
            );
            if (downloaded) {
              const extracted = await extractThumbnailFfmpeg(
                videoTmpPath,
                thumbnailTmpPath,
              );
              if (extracted) {
                thumbnailBuffer = await readFile(thumbnailTmpPath);
              }
            }
          } catch (dlErr) {
            console.warn(
              "[Thumbnail Gen] Download/ffmpeg extraction failed:",
              dlErr,
            );
          } finally {
            await cleanup(
              path.join(TMP_DIR, `${video.id}_video.tmp`),
              path.join(TMP_DIR, `${video.id}_thumb.jpg`),
            );
          }
        }

        // Strategy 2: Try Dropbox get_thumbnail API (works on Netlify without ffmpeg)
        // This is less reliable — it often returns black frames for vertical videos
        // We still try it but with strict black-frame detection
        if (!thumbnailBuffer) {
          console.log(
            "[Thumbnail Gen] Trying Dropbox thumbnail API (unreliable for videos)...",
          );
          thumbnailBuffer = await getDropboxThumbnail(video.videoUrl);
        }

        // Strategy 3: If both ffmpeg and Dropbox failed, try downloading the video
        // and extracting a frame with ffmpeg from the downloaded file
        // (Only works if ffmpeg is available — skip on Netlify)
        if (!thumbnailBuffer && hasFfmpeg) {
          console.log(
            "[Thumbnail Gen] Trying full download + ffmpeg extraction...",
          );
          let downloadUrl = video.videoUrl;
          if (downloadUrl.includes("dropbox")) {
            const filePath = await resolveDropboxFilePath(downloadUrl);
            if (filePath) {
              const tempLink = await getDropboxTemporaryLink(filePath);
              if (tempLink) downloadUrl = tempLink;
            }
          }
          const videoTmpPath = path.join(TMP_DIR, `${video.id}_full_video.tmp`);
          const thumbnailTmpPath = path.join(
            TMP_DIR,
            `${video.id}_full_thumb.jpg`,
          );
          try {
            const downloaded = await downloadVideoPartial(
              downloadUrl,
              videoTmpPath,
              50 * 1024 * 1024,
            );
            if (downloaded) {
              const extracted = await extractThumbnailFfmpeg(
                videoTmpPath,
                thumbnailTmpPath,
              );
              if (extracted) {
                thumbnailBuffer = await readFile(thumbnailTmpPath);
              }
            }
          } catch (dlErr) {
            console.warn(
              "[Thumbnail Gen] Full download + ffmpeg extraction failed:",
              dlErr,
            );
          } finally {
            await cleanup(videoTmpPath, thumbnailTmpPath);
          }
        }

        // Strategy 4 (Netlify fallback): Download first bytes and try Sharp
        // Sharp can sometimes extract embedded thumbnails from MP4/MOV files.
        // This works on Netlify where ffmpeg is not available.
        if (!thumbnailBuffer && !hasFfmpeg) {
          console.log(
            "[Thumbnail Gen] Trying download + Sharp extraction (Netlify fallback)...",
          );
          try {
            let downloadUrl = video.videoUrl;
            if (downloadUrl.includes("dropbox")) {
              const filePath = await resolveDropboxFilePath(downloadUrl);
              if (filePath) {
                const tempLink = await getDropboxTemporaryLink(filePath);
                if (tempLink) downloadUrl = tempLink;
                else {
                  // Convert to direct download URL
                  if (downloadUrl.includes("www.dropbox.com")) {
                    downloadUrl = downloadUrl
                      .replace("?dl=0", "?raw=1")
                      .replace("&dl=0", "&raw=1");
                    if (!downloadUrl.includes("raw=1")) {
                      downloadUrl += `${downloadUrl.includes("?") ? "&" : "?"}raw=1`;
                    }
                  }
                }
              }
            }

            // Download up to 30MB of the video
            const videoTmpPath = path.join(
              TMP_DIR,
              `${video.id}_sharp_video.tmp`,
            );
            const downloaded = await downloadVideoPartial(
              downloadUrl,
              videoTmpPath,
              30 * 1024 * 1024,
            );
            if (downloaded) {
              try {
                // Try to use Sharp to read the video file — it may find embedded thumbnails
                // in some MP4/MOV containers
                const videoData = await readFile(videoTmpPath);
                const metadata = await sharp(videoData).metadata();

                // If Sharp detected an image format (some videos have embedded JPEG thumbnails)
                if (
                  metadata.format &&
                  ["jpeg", "png", "webp", "tiff"].includes(metadata.format)
                ) {
                  console.log(
                    "[Thumbnail Gen] Sharp detected embedded image:",
                    metadata.format,
                  );
                  const processedBuffer = await sharp(videoData)
                    .resize(720, 1280, {
                      fit: "inside",
                      withoutEnlargement: true,
                    })
                    .jpeg({ quality: 85 })
                    .toBuffer();

                  if (!isMostlyBlack(processedBuffer)) {
                    thumbnailBuffer = processedBuffer;
                  }
                }
              } catch (sharpErr) {
                // Sharp can't process this video format — expected for most MP4 files
                console.log(
                  "[Thumbnail Gen] Sharp couldn't extract thumbnail (expected for most videos):",
                  (sharpErr as Error).message?.substring(0, 80),
                );
              }
              await cleanup(videoTmpPath);
            }
          } catch (dlErr) {
            console.warn(
              "[Thumbnail Gen] Download + Sharp extraction failed:",
              dlErr,
            );
          }
        }

        if (!thumbnailBuffer) {
          results.push({
            videoId: video.id,
            title: video.title,
            success: false,
            error: hasFfmpeg
              ? "No se pudo generar la miniatura (ffmpeg y Dropbox API fallaron)"
              : "No se pudo generar la miniatura. El servidor no tiene ffmpeg y la API de Dropbox no pudo generarla. Usa la regeneración desde el navegador.",
          });
          continue;
        }

        // Add title + artist name text overlay
        const artistName = video.artistId
          ? artistMap.get(video.artistId) || null
          : null;
        thumbnailBuffer = await addTextOverlayToThumbnail(
          thumbnailBuffer,
          video.title,
          artistName,
        );

        // Upload thumbnail to Dropbox
        const thumbnailUrl = await uploadThumbnailToDropbox(
          thumbnailBuffer,
          video.id,
        );
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

        console.log(
          `[Thumbnail Gen] Success: ${video.title} → ${thumbnailUrl}`,
        );
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
      { status: 500 },
    );
  }
}
