import { db, isDatabaseConfigured } from "../src/db/client";
import { artists, artistExternalProfiles, releases, releaseArtists } from "../src/db/schema";
import { spotifyClient } from "../src/lib/clients/spotify";
import { generateUUID, slugify } from "../src/lib/utils";
import { eq, and } from "drizzle-orm";

// ===========================================
// SYNC RELEASES FROM SPOTIFY - CLI SCRIPT
// ===========================================

async function syncReleases() {
  console.log("\n🎵 SONIDO LÍQUIDO CREW - SPOTIFY RELEASES SYNC\n");
  console.log("=" .repeat(50));

  if (!isDatabaseConfigured()) {
    console.error("❌ Database not configured");
    process.exit(1);
  }

  if (!spotifyClient.isConfigured()) {
    console.error("❌ Spotify API credentials not configured");
    console.log("   Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET");
    process.exit(1);
  }

  console.log("✅ Database connected");
  console.log("✅ Spotify API configured\n");

  // Get all artists
  const allArtists = await db.select().from(artists);
  console.log(`📋 Found ${allArtists.length} artists\n`);

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const artist of allArtists) {
    console.log(`\n🎤 Processing: ${artist.name}`);
    console.log("-".repeat(40));

    // Get Spotify profile
    const [spotifyProfile] = await db
      .select()
      .from(artistExternalProfiles)
      .where(
        and(
          eq(artistExternalProfiles.artistId, artist.id),
          eq(artistExternalProfiles.platform, "spotify")
        )
      )
      .limit(1);

    if (!spotifyProfile?.externalId) {
      console.log(`   ⚠️  No Spotify profile found`);
      continue;
    }

    console.log(`   Spotify ID: ${spotifyProfile.externalId}`);

    try {
      // Fetch albums from Spotify
      const spotifyAlbums = await spotifyClient.getAllArtistAlbums(spotifyProfile.externalId);
      console.log(`   Found ${spotifyAlbums.length} releases on Spotify`);

      let created = 0;
      let skipped = 0;

      for (const album of spotifyAlbums) {
        // Check if release already exists
        const [existingRelease] = await db
          .select()
          .from(releases)
          .where(eq(releases.spotifyId, album.id))
          .limit(1);

        if (existingRelease) {
          skipped++;
          continue;
        }

        // Determine release type
        let releaseType: "album" | "ep" | "single" | "compilation" = "single";
        if (album.album_type === "album") {
          releaseType = album.total_tracks > 6 ? "album" : "ep";
        } else if (album.album_type === "compilation") {
          releaseType = "compilation";
        }

        // Create unique slug
        let baseSlug = slugify(album.name);
        let slug = baseSlug;
        let counter = 1;

        while (true) {
          const [existingSlug] = await db
            .select()
            .from(releases)
            .where(eq(releases.slug, slug))
            .limit(1);

          if (!existingSlug) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        // Create release
        const releaseId = generateUUID();
        const releaseDate = new Date(album.release_date);

        await db.insert(releases).values({
          id: releaseId,
          title: album.name,
          slug,
          releaseType,
          releaseDate,
          coverImageUrl: album.images?.[0]?.url || null,
          spotifyId: album.id,
          spotifyUrl: album.external_urls?.spotify || null,
          description: `${releaseType === "album" ? "Álbum" : releaseType === "ep" ? "EP" : "Single"} de ${artist.name}`,
          isUpcoming: releaseDate > new Date(),
          isFeatured: false,
        });

        // Create artist-release relationship
        await db.insert(releaseArtists).values({
          id: generateUUID(),
          releaseId,
          artistId: artist.id,
          isPrimary: true,
        });

        created++;
        console.log(`   ✅ Created: ${album.name} (${releaseType})`);
      }

      totalCreated += created;
      totalSkipped += skipped;
      console.log(`   📊 ${created} created, ${skipped} skipped`);

    } catch (error) {
      console.error(`   ❌ Error: ${(error as Error).message}`);
      totalErrors++;
    }

    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 SYNC COMPLETE\n");
  console.log(`   Total Created: ${totalCreated}`);
  console.log(`   Total Skipped: ${totalSkipped}`);
  console.log(`   Total Errors:  ${totalErrors}`);
  console.log("\n" + "=".repeat(50) + "\n");

  process.exit(0);
}

syncReleases().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
