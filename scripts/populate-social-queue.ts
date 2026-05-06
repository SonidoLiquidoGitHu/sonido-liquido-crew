// ===========================================
// POPULATE SOCIAL POST QUEUE
// ===========================================
// Reads existing gallery photos, releases, and artists from the DB
// and creates queue items for each one. Uses caption templates.
// Run with: npx tsx scripts/populate-social-queue.ts

import "@/db/client";
import { db } from "@/db/client";
import { socialPostQueue, artists, releases, releaseArtists, galleryPhotos } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
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

  let addedCount = 0;

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
      platforms: '["facebook","instagram"]',
      postedPlatforms: "[]",
    });

    existingSourceIds.add(key);
    addedCount++;
  }

  console.log(`[Populate Queue] Added ${addedCount} gallery photos`);

  // ========================================
  // 2. Spotify Releases (tracks with cover art)
  // ========================================
  console.log("[Populate Queue] Processing releases...");

  let releasesAdded = 0;

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
      platforms: '["facebook","instagram"]',
      postedPlatforms: "[]",
    });

    existingSourceIds.add(key);
    releasesAdded++;
  }

  console.log(`[Populate Queue] Added ${releasesAdded} releases`);

  // ========================================
  // 3. Artist Profiles (active, with profile images)
  // ========================================
  console.log("[Populate Queue] Processing artist profiles...");

  let artistsAdded = 0;

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
      platforms: '["facebook","instagram"]',
      postedPlatforms: "[]",
    });

    existingSourceIds.add(key);
    artistsAdded++;
  }

  console.log(`[Populate Queue] Added ${artistsAdded} artist profiles`);

  // ========================================
  // Summary
  // ========================================
  const totalItems = addedCount + releasesAdded + artistsAdded;
  console.log(`[Populate Queue] Complete! Added ${totalItems} new items to queue`);
  console.log(`  - Gallery photos: ${addedCount}`);
  console.log(`  - Releases: ${releasesAdded}`);
  console.log(`  - Artist profiles: ${artistsAdded}`);
  console.log(`  - Total queue size: ${existing.length + totalItems}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("[Populate Queue] Fatal error:", err);
  process.exit(1);
});
