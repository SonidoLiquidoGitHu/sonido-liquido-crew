// ===========================================
// POPULATE SOCIAL POST QUEUE
// ===========================================
// Reads existing gallery photos, releases, artists, and curated tracks
// from the DB and creates queue items for each one. Uses caption templates.
// Run with: npx tsx scripts/populate-social-queue.ts
// OR use the "Poblar Cola" button in the admin UI.

import "@/db/client";
import { db } from "@/db/client";
import { socialPostQueue, artists, releases, releaseArtists, galleryPhotos, curatedTracks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateCaption, type CaptionContext } from "@/lib/clients/meta";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sonidoliquido.com";

async function main() {
  console.log("[Populate Queue] Starting queue population...");

  // Check for existing items to avoid duplicates
  const existing = await db.select().from(socialPostQueue);
  const existingSourceIds = new Set(existing.map((item) => `${item.contentType}:${item.sourceId}`));
  console.log(`[Populate Queue] Found ${existing.length} existing queue items`);

  let queueOrder = existing.length > 0
    ? Math.max(...existing.map((item) => item.queueOrder)) + 1
    : 0;

  // Default platforms for new items
  const platforms = '["facebook","instagram","tiktok"]';

  let galleryCount = 0;
  let releasesCount = 0;
  let artistsCount = 0;
  let curatedCount = 0;

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
      platforms,
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
    const existing = releaseArtistMap.get(ra.releaseId) || [];
    existing.push(ra.artistId);
    releaseArtistMap.set(ra.releaseId, existing);
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
      platforms,
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
      platforms,
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
      })
      .from(curatedTracks)
      .where(eq(curatedTracks.isAvailableForPlaylist, true));

    for (const track of tracks) {
      if (!track.albumImageUrl) continue;

      const key = `curated_track:${track.id}`;
      if (existingSourceIds.has(key)) continue;

      const caption = generateCaption({
        contentType: "curated_track",
        artistName: track.artistName,
        trackName: track.name,
        albumName: track.albumName || undefined,
        spotifyUrl: track.spotifyTrackUrl,
        linkUrl: `${SITE_URL}/discografia`,
      });

      await db.insert(socialPostQueue).values({
        id: crypto.randomUUID(),
        contentType: "curated_track",
        sourceId: track.id,
        artistId: null,
        releaseId: null,
        imageUrl: track.albumImageUrl,
        caption,
        linkUrl: `${SITE_URL}/discografia`,
        queueOrder: queueOrder++,
        cycleNumber: 1,
        status: "pending",
        platforms,
        postedPlatforms: "[]",
      });

      existingSourceIds.add(key);
      curatedCount++;
    }

    console.log(`[Populate Queue] Added ${curatedCount} curated tracks`);
  } catch (err) {
    console.warn("[Populate Queue] Curated tracks table may not exist yet:", err);
  }

  // ========================================
  // Summary
  // ========================================
  const totalItems = galleryCount + releasesCount + artistsCount + curatedCount;
  console.log(`[Populate Queue] Complete! Added ${totalItems} new items to queue`);
  console.log(`  - Gallery photos: ${galleryCount}`);
  console.log(`  - Releases: ${releasesCount}`);
  console.log(`  - Artist profiles: ${artistsCount}`);
  console.log(`  - Curated tracks: ${curatedCount}`);
  console.log(`  - Total queue size: ${existing.length + totalItems}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("[Populate Queue] Fatal error:", err);
  process.exit(1);
});
