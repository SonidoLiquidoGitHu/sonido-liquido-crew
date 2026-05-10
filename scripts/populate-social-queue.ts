// ===========================================
// POPULATE SOCIAL POST QUEUE
// ===========================================
// Reads existing gallery photos, releases, artists, curated tracks, and
// vertical videos from the DB and creates queue items for each one.
// Uses caption templates.
// Run with: npx tsx scripts/populate-social-queue.ts

import "@/db/client";
import { db } from "@/db/client";
import {
  socialPostQueue,
  artists,
  releases,
  releaseArtists,
  galleryPhotos,
  curatedTracks,
  verticalVideos,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateCaption } from "@/lib/clients/meta";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sonidoliquido.com";

/**
 * Extract YouTube video ID from various URL formats.
 */
function extractYouTubeId(
  videoUrl?: string | null,
  platformUrl?: string | null,
  embedUrl?: string | null
): string | null {
  const urls = [embedUrl, platformUrl, videoUrl].filter(Boolean);
  for (const url of urls) {
    if (!url) continue;
    const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) return embedMatch[1];
    const watchMatch = url.match(/(?:shorts\/|watch\?v=)([a-zA-Z0-9_-]+)/);
    if (watchMatch) return watchMatch[1];
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) return shortMatch[1];
  }
  return null;
}

async function main() {
  console.log("[Populate Queue] Starting queue population...");

  // Default platforms: FB + IG + TikTok (TikTok is included but will be skipped if not configured)
  const targetPlatforms = ["facebook", "instagram", "tiktok"];
  const platformsJson = JSON.stringify(targetPlatforms);

  // Check for existing items to avoid duplicates
  const existing = await db.select().from(socialPostQueue);
  const existingSourceIds = new Set(existing.map((item) => `${item.contentType}:${item.sourceId}`));
  console.log(`[Populate Queue] Found ${existing.length} existing queue items`);

  let queueOrder = existing.length > 0
    ? Math.max(...existing.map((item) => item.queueOrder)) + 1
    : 0;

  let galleryCount = 0;
  let releasesCount = 0;
  let artistsCount = 0;
  let curatedCount = 0;
  let reelsCount = 0;

  // ========================================
  // 1. Gallery Photos (published, with images)
  // ========================================
  console.log("[Populate Queue] Processing gallery photos...");

  const photos = await db
    .select({
      id: galleryPhotos.id,
      title: galleryPhotos.title,
      imageUrl: galleryPhotos.imageUrl,
      artistId: galleryPhotos.artistId,
      location: galleryPhotos.location,
      photographer: galleryPhotos.photographer,
      altText: galleryPhotos.altText,
    })
    .from(galleryPhotos)
    .where(eq(galleryPhotos.isPublished, true))
    .orderBy(galleryPhotos.sortOrder);

  // Get artist names for photo captions
  const allArtists = await db.select({
    id: artists.id,
    name: artists.name,
    slug: artists.slug,
    role: artists.role,
  }).from(artists).where(eq(artists.isActive, true));

  const artistMap = new Map(allArtists.map((a) => [a.id, a]));

  for (const photo of photos) {
    const key = `gallery_photo:${photo.id}`;
    if (existingSourceIds.has(key)) continue;

    const artist = photo.artistId ? artistMap.get(photo.artistId) : null;
    const caption = generateCaption({
      contentType: "gallery_photo",
      artistName: artist?.name,
      photoTitle: photo.title || undefined,
      photoLocation: photo.location || undefined,
      photographer: photo.photographer || undefined,
      linkUrl: artist ? `${SITE_URL}/artistas/${artist.slug}` : `${SITE_URL}/galeria`,
    });

    await db.insert(socialPostQueue).values({
      id: crypto.randomUUID(),
      contentType: "gallery_photo",
      sourceId: photo.id,
      artistId: photo.artistId || null,
      releaseId: null,
      imageUrl: photo.imageUrl,
      caption,
      linkUrl: artist ? `${SITE_URL}/artistas/${artist.slug}` : `${SITE_URL}/galeria`,
      queueOrder: queueOrder++,
      cycleNumber: 1,
      status: "pending",
      platforms: platformsJson,
      postedPlatforms: "[]",
    });

    existingSourceIds.add(key);
    galleryCount++;
  }

  console.log(`[Populate Queue] Added ${galleryCount} gallery photos`);

  // ========================================
  // 2. Spotify Releases (tracks with cover art)
  // ========================================
  console.log("[Populate Queue] Processing releases...");

  const allReleases = await db
    .select({
      id: releases.id,
      title: releases.title,
      slug: releases.slug,
      releaseType: releases.releaseType,
      coverImageUrl: releases.coverImageUrl,
      spotifyUrl: releases.spotifyUrl,
      description: releases.description,
    })
    .from(releases)
    .where(eq(releases.isUpcoming, false))
    .orderBy(releases.releaseDate);

  // Get release-artist associations
  const releaseArtistRows = await db.select().from(releaseArtists);
  const releaseArtistMap = new Map<string, string[]>();
  for (const ra of releaseArtistRows) {
    const existingRA = releaseArtistMap.get(ra.releaseId) || [];
    existingRA.push(ra.artistId);
    releaseArtistMap.set(ra.releaseId, existingRA);
  }

  for (const release of allReleases) {
    // Skip if no cover image — IG requires an image
    if (!release.coverImageUrl) continue;

    const key = `spotify_track:${release.id}`;
    if (existingSourceIds.has(key)) continue;

    // Get primary artist for this release
    const artistIds = releaseArtistMap.get(release.id) || [];
    const primaryArtistId = artistIds[0];
    const primaryArtist = primaryArtistId ? artistMap.get(primaryArtistId) : null;

    const caption = generateCaption({
      contentType: "spotify_track",
      artistName: primaryArtist?.name,
      artistRole: primaryArtist?.role || undefined,
      releaseTitle: release.title,
      releaseType: release.releaseType,
      spotifyUrl: release.spotifyUrl || undefined,
      linkUrl: `${SITE_URL}/lanzamientos/${release.slug}`,
    });

    await db.insert(socialPostQueue).values({
      id: crypto.randomUUID(),
      contentType: "spotify_track",
      sourceId: release.id,
      artistId: primaryArtistId || null,
      releaseId: release.id,
      imageUrl: release.coverImageUrl,
      caption,
      linkUrl: `${SITE_URL}/lanzamientos/${release.slug}`,
      queueOrder: queueOrder++,
      cycleNumber: 1,
      status: "pending",
      platforms: platformsJson,
      postedPlatforms: "[]",
    });

    existingSourceIds.add(key);
    releasesCount++;
  }

  console.log(`[Populate Queue] Added ${releasesCount} releases`);

  // ========================================
  // 3. Artist Profiles (active, with profile images)
  // ========================================
  console.log("[Populate Queue] Processing artist profiles...");

  for (const artist of allArtists) {
    // Skip if no profile image — IG requires an image
    // Use featuredImageUrl if available, else profileImageUrl
    const imageUrl = (artist as any).featuredImageUrl || (artist as any).profileImageUrl;
    if (!imageUrl) continue;

    const key = `artist_profile:${artist.id}`;
    if (existingSourceIds.has(key)) continue;

    const caption = generateCaption({
      contentType: "artist_profile",
      artistName: artist.name,
      artistRole: artist.role,
      linkUrl: `${SITE_URL}/artistas/${artist.slug}`,
    });

    await db.insert(socialPostQueue).values({
      id: crypto.randomUUID(),
      contentType: "artist_profile",
      sourceId: artist.id,
      artistId: artist.id,
      releaseId: null,
      imageUrl,
      caption,
      linkUrl: `${SITE_URL}/artistas/${artist.slug}`,
      queueOrder: queueOrder++,
      cycleNumber: 1,
      status: "pending",
      platforms: platformsJson,
      postedPlatforms: "[]",
    });

    existingSourceIds.add(key);
    artistsCount++;
  }

  console.log(`[Populate Queue] Added ${artistsCount} artist profiles`);

  // ========================================
  // 4. Curated Tracks (from curated Spotify artists)
  // ========================================
  console.log("[Populate Queue] Processing curated tracks...");

  try {
    const tracks = await db
      .select({
        id: curatedTracks.id,
        spotifyTrackId: curatedTracks.spotifyTrackId,
        spotifyTrackUrl: curatedTracks.spotifyTrackUrl,
        name: curatedTracks.name,
        artistName: curatedTracks.artistName,
        albumName: curatedTracks.albumName,
        albumImageUrl: curatedTracks.albumImageUrl,
        curatedChannelId: curatedTracks.curatedChannelId,
        popularity: curatedTracks.popularity,
      })
      .from(curatedTracks)
      .where(eq(curatedTracks.isAvailableForPlaylist, true))
      .orderBy(desc(curatedTracks.popularity));

    console.log(`[Populate Queue] Found ${tracks.length} curated tracks available for playlist`);

    for (const track of tracks) {
      if (!track.albumImageUrl) continue;

      const key = `curated_track:${track.id}`;
      if (existingSourceIds.has(key)) continue;

      const trackLinkUrl = track.spotifyTrackUrl || `${SITE_URL}/discografia`;

      const caption = generateCaption({
        contentType: "curated_track",
        artistName: track.artistName,
        trackName: track.name,
        albumName: track.albumName || undefined,
        spotifyUrl: track.spotifyTrackUrl,
        linkUrl: trackLinkUrl,
      });

      await db.insert(socialPostQueue).values({
        id: crypto.randomUUID(),
        contentType: "curated_track",
        sourceId: track.id,
        artistId: null,
        releaseId: null,
        imageUrl: track.albumImageUrl,
        caption,
        linkUrl: trackLinkUrl,
        queueOrder: queueOrder++,
        cycleNumber: 1,
        status: "pending",
        platforms: platformsJson,
        postedPlatforms: "[]",
      });

      existingSourceIds.add(key);
      curatedCount++;
    }
  } catch (err) {
    console.warn("[Populate Queue] Curated tracks table may not exist yet:", err);
  }

  console.log(`[Populate Queue] Added ${curatedCount} curated tracks`);

  // ========================================
  // 5. Vertical Videos (Reels / Shorts)
  // ========================================
  console.log("[Populate Queue] Processing vertical videos (reels)...");

  try {
    const videos = await db
      .select({
        id: verticalVideos.id,
        title: verticalVideos.title,
        thumbnailUrl: verticalVideos.thumbnailUrl,
        videoUrl: verticalVideos.videoUrl,
        artistId: verticalVideos.artistId,
        platform: verticalVideos.platform,
        platformUrl: verticalVideos.platformUrl,
        embedUrl: verticalVideos.embedUrl,
      })
      .from(verticalVideos)
      .where(eq(verticalVideos.isPublished, true))
      .orderBy(verticalVideos.displayOrder);

    for (const video of videos) {
      // Auto-generate YouTube thumbnails if no explicit thumbnail exists
      let imageUrl = video.thumbnailUrl;

      if (!imageUrl) {
        const ytId = extractYouTubeId(video.videoUrl, video.platformUrl, video.embedUrl);
        if (ytId) {
          imageUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        }
      }

      if (!imageUrl) {
        imageUrl = video.videoUrl || `${SITE_URL}/reels`;
      }

      const key = `vertical_video:${video.id}`;
      if (existingSourceIds.has(key)) continue;

      const artist = video.artistId ? artistMap.get(video.artistId) : null;
      const caption = generateCaption({
        contentType: "vertical_video",
        artistName: artist?.name,
        videoTitle: video.title || undefined,
        videoPlatform: video.platform || undefined,
        linkUrl: artist
          ? `${SITE_URL}/artistas/${artist.slug}`
          : `${SITE_URL}/reels`,
      });

      await db.insert(socialPostQueue).values({
        id: crypto.randomUUID(),
        contentType: "vertical_video",
        sourceId: video.id,
        artistId: video.artistId || null,
        releaseId: null,
        imageUrl,
        caption,
        linkUrl: artist
          ? `${SITE_URL}/artistas/${artist.slug}`
          : video.platformUrl || `${SITE_URL}/reels`,
        queueOrder: queueOrder++,
        cycleNumber: 1,
        status: "pending",
        platforms: platformsJson,
        postedPlatforms: "[]",
      });

      existingSourceIds.add(key);
      reelsCount++;
    }
  } catch (err) {
    console.warn("[Populate Queue] Vertical videos table may not exist yet:", err);
  }

  console.log(`[Populate Queue] Added ${reelsCount} vertical videos`);

  // ========================================
  // Summary
  // ========================================
  const totalItems = galleryCount + releasesCount + artistsCount + curatedCount + reelsCount;
  console.log(`[Populate Queue] Complete! Added ${totalItems} new items to queue`);
  console.log(`  - Gallery photos: ${galleryCount}`);
  console.log(`  - Releases: ${releasesCount}`);
  console.log(`  - Artist profiles: ${artistsCount}`);
  console.log(`  - Curated tracks: ${curatedCount}`);
  console.log(`  - Vertical videos: ${reelsCount}`);
  console.log(`  - Total queue size: ${existing.length + totalItems}`);
  console.log(`  - Target platforms: ${targetPlatforms.join(", ")}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("[Populate Queue] Fatal error:", err);
  process.exit(1);
});
