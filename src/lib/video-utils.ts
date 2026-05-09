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
