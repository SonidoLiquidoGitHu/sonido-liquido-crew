/**
 * Shared video utility functions for the Sonido Líquido Crew app.
 *
 * These were previously duplicated across VerticalVideoSection, ArtistReelsSection,
 * ReelsGrid, and TikTokFeed. Centralising them here ensures consistent thumbnail
 * resolution and YouTube-ID extraction, and makes future changes much easier.
 */

// ===========================================
// TYPES
// ===========================================

/**
 * Minimal interface that any video object must satisfy for the helpers below.
 * Both the public `VerticalVideo` / `ReelVideo` types and admin types conform.
 */
export interface VideoLike {
  videoUrl?: string | null;
  embedUrl?: string | null;
  platformUrl?: string | null;
  thumbnailUrl?: string | null;
}

// ===========================================
// YOUTUBE ID EXTRACTION
// ===========================================

/**
 * Extract a YouTube video ID from any of the URL fields on a video object.
 *
 * Supported patterns:
 *   - embed/VIDEO_ID
 *   - shorts/VIDEO_ID
 *   - watch?v=VIDEO_ID
 *   - youtu.be/VIDEO_ID
 */
export function getYouTubeId(video: VideoLike): string | null {
  const urls = [video.embedUrl, video.platformUrl, video.videoUrl].filter(
    Boolean
  ) as string[];

  for (const url of urls) {
    if (!url) continue;

    // embed/VIDEO_ID
    const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) return embedMatch[1];

    // shorts/VIDEO_ID or watch?v=VIDEO_ID
    const watchMatch = url.match(
      /(?:shorts\/|watch\?v=)([a-zA-Z0-9_-]+)/
    );
    if (watchMatch) return watchMatch[1];

    // youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) return shortMatch[1];
  }

  return null;
}

// ===========================================
// THUMBNAIL RESOLUTION
// ===========================================

/**
 * YouTube thumbnail resolution tiers, ordered from highest to lowest quality.
 *
 * - `maxresdefault.jpg` — 1280×720, not always available but highest quality.
 *   When it exists for a Short, the 16:9 frame usually contains a decent
 *   letter-boxed version that `object-cover` crops well in a 9:16 container.
 * - `sddefault.jpg` — 640×480, widely available, slightly better than hq.
 * - `hqdefault.jpg` — 480×360, always available as the final fallback.
 *
 * We return the *highest* tier URL and rely on the `<SafeImage>` component's
 * retry + fallback logic to degrade gracefully if the highest-res version
 * doesn't exist (YouTube returns 404 for missing `maxresdefault`).
 */
const YT_THUMB_TIERS = [
  "maxresdefault.jpg",
  "sddefault.jpg",
  "hqdefault.jpg",
] as const;

/**
 * Get the best available thumbnail URL for a video.
 *
 * Resolution order:
 *  1. Explicit `thumbnailUrl` stored in the database (e.g. generated via
 *     Dropbox thumbnail API or ffmpeg extraction).
 *  2. Auto-generated YouTube thumbnail (highest available tier).
 *  3. `null` — caller should render a placeholder.
 *
 * When a YouTube ID is found, we return the `maxresdefault` URL. The
 * `<SafeImage>` component handles retrying with lower tiers if that fails,
 * via its `fallbackSrc` prop.
 */
export function getVideoThumbnail(video: VideoLike): string | null {
  // 1. Explicit thumbnail from DB
  if (video.thumbnailUrl) return video.thumbnailUrl;

  // 2. Auto-generate YouTube thumbnail (try highest quality first)
  const ytId = getYouTubeId(video);
  if (ytId) {
    return `https://img.youtube.com/vi/${ytId}/${YT_THUMB_TIERS[0]}`;
  }

  // 3. No thumbnail available
  return null;
}

/**
 * Get a fallback YouTube thumbnail URL at a lower tier.
 *
 * Used by `<SafeImage>` `fallbackSrc` — when the `maxresdefault` 404s,
 * this returns the next tier down so SafeImage can try it.
 *
 * Returns `null` when we've exhausted all tiers.
 */
export function getYouTubeThumbnailFallback(
  ytId: string,
  currentUrl: string
): string | null {
  // Find which tier the current URL is using
  for (let i = 0; i < YT_THUMB_TIERS.length; i++) {
    if (currentUrl.includes(YT_THUMB_TIERS[i])) {
      // Return the next tier down
      const nextTier = YT_THUMB_TIERS[i + 1];
      if (nextTier) {
        return `https://img.youtube.com/vi/${ytId}/${nextTier}`;
      }
      // Exhausted all tiers
      return null;
    }
  }
  return null;
}

/**
 * Check if a URL is a YouTube thumbnail (used to enable tiered fallback).
 */
export function isYouTubeThumbnailUrl(url: string): boolean {
  return url.includes("img.youtube.com/vi/");
}

/**
 * Build an inline SVG data-URI placeholder suitable for video thumbnails.
 * This avoids external file dependencies and prevents cascade failures.
 */
export function getVideoPlaceholderSvg(aspectRatio: "9/16" | "16/9" = "9/16"): string {
  const isVertical = aspectRatio === "9/16";
  const width = isVertical ? 360 : 640;
  const height = isVertical ? 640 : 360;

  return `data:image/svg+xml,${encodeURIComponent(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#1a1a1a"/>
      <polygon points="${width / 2 - 20},${height / 2 - 30} ${width / 2 - 20},${height / 2 + 30} ${width / 2 + 30},${height / 2}" fill="#333"/>
    </svg>`
  )}`;
}

// ===========================================
// DROPBOX URL CONVERSION
// ===========================================

/**
 * Convert a Dropbox URL to a direct-access URL suitable for video/image playback.
 *
 * Handles ALL Dropbox URL formats:
 *
 * 1. **Old shared links** (`/s/...?dl=0`):
 *    Convert `dl=0` → `raw=1` for direct file access.
 *    (Using `raw=1` instead of `dl=1` because it works with both old and new formats.)
 *
 * 2. **New shared links** (`/scl/fi/...?rlkey=...&raw=1`):
 *    Already have `raw=1` — use as-is.
 *
 * 3. **Direct CDN links** (`dl.dropboxusercontent.com/...`):
 *    Already direct-access — use as-is.
 *
 * 4. **Dropbox shared links without any download parameter**:
 *    Append `&raw=1` (or `?raw=1` if no query string exists).
 *
 * CRITICAL: Never appends `?dl=1` — this parameter doesn't work with the new
 * `/scl/fi/` URL format and creates broken double-`?` URLs when query params
 * already exist. Always use `raw=1` instead.
 */
export function getDirectDropboxUrl(url: string): string {
  if (!url || !url.includes("dropbox")) return url;

  // 1. dl.dropboxusercontent.com — was generated by the OLD URL conversion
  //    which is BROKEN for new-format Dropbox links (/scl/fi/...?rlkey=...).
  //    Convert back to www.dropbox.com?raw=1 which works with ALL formats.
  if (url.includes("dl.dropboxusercontent.com")) {
    const fixed = url
      .replace("dl.dropboxusercontent.com", "www.dropbox.com")
      .replace("?raw=1", "?raw=1") // keep if already present
      .replace("&raw=1", "&raw=1"); // keep if already present
    if (fixed.includes("raw=1")) return fixed;
    return fixed + (fixed.includes("?") ? "&" : "?") + "raw=1";
  }

  // 2. New-format shared links with ?raw=1 already present — use as-is
  if (url.includes("raw=1")) {
    return url;
  }

  // 3. Old-format shared links with ?dl=0 — replace with raw=1
  if (url.includes("dl=0")) {
    return url.replace("?dl=0", "?raw=1").replace("&dl=0", "&raw=1");
  }

  // 4. Dropbox shared links without any download parameter — add raw=1
  if (url.includes("?")) {
    return url + "&raw=1";
  }
  return url + "?raw=1";
}

/**
 * Check if a video URL points to a directly-playable video file
 * (not YouTube, not Instagram/TikTok links).
 */
export function isDirectVideo(video: VideoLike): boolean {
  if (getYouTubeId(video)) return false;
  const url = video.videoUrl?.toLowerCase() || "";
  return (
    url.includes(".mp4") ||
    url.includes(".webm") ||
    url.includes("dropbox") ||
    url.includes("dropboxusercontent")
  );
}

/**
 * Get a video source URL suitable for HTML <video> element playback.
 *
 * Handles Dropbox URL conversion automatically via getDirectDropboxUrl().
 * For non-Dropbox URLs, returns as-is.
 */
export function getVideoSrc(video: VideoLike): string {
  const url = video.videoUrl || "";
  return getDirectDropboxUrl(url);
}
