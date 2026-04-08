/**
 * Sync Artist Profiles Script
 *
 * This script syncs all artist social media profiles from the roster data
 * to the artist_external_profiles table in the database.
 *
 * Run with: bun run scripts/sync-artist-profiles.ts
 */

import { db } from "../src/db/client";
import { artists, artistExternalProfiles } from "../src/db/schema/artists";
import { artistsRoster } from "../src/lib/data/artists-roster";
import { eq, and } from "drizzle-orm";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

async function syncArtistProfiles() {
  console.log("🚀 Starting artist profiles sync...\n");

  let totalArtistsProcessed = 0;
  let totalProfilesCreated = 0;
  let totalProfilesUpdated = 0;
  let totalErrors = 0;

  for (const rosterArtist of artistsRoster) {
    console.log(`\n📀 Processing: ${rosterArtist.name}`);

    try {
      // Find the artist in the database
      const [dbArtist] = await db
        .select()
        .from(artists)
        .where(eq(artists.slug, rosterArtist.slug))
        .limit(1);

      if (!dbArtist) {
        console.log(`  ⚠️  Artist not found in database: ${rosterArtist.name}`);
        continue;
      }

      totalArtistsProcessed++;

      // Define profiles to sync
      const profilesToSync = [
        {
          platform: "spotify" as const,
          externalUrl: rosterArtist.spotifyUrl,
          externalId: rosterArtist.spotifyId,
          handle: null,
        },
        rosterArtist.instagramUrl ? {
          platform: "instagram" as const,
          externalUrl: rosterArtist.instagramUrl,
          externalId: null,
          handle: rosterArtist.instagramHandle || null,
        } : null,
        rosterArtist.youtubeUrl ? {
          platform: "youtube" as const,
          externalUrl: rosterArtist.youtubeUrl,
          externalId: null,
          handle: rosterArtist.youtubeHandle || null,
        } : null,
      ].filter(Boolean);

      for (const profile of profilesToSync) {
        if (!profile) continue;

        // Check if profile already exists
        const [existingProfile] = await db
          .select()
          .from(artistExternalProfiles)
          .where(
            and(
              eq(artistExternalProfiles.artistId, dbArtist.id),
              eq(artistExternalProfiles.platform, profile.platform)
            )
          )
          .limit(1);

        if (existingProfile) {
          // Update existing profile
          await db
            .update(artistExternalProfiles)
            .set({
              externalUrl: profile.externalUrl,
              externalId: profile.externalId,
              handle: profile.handle,
              updatedAt: new Date(),
            })
            .where(eq(artistExternalProfiles.id, existingProfile.id));

          console.log(`  ✓ Updated ${profile.platform} profile`);
          totalProfilesUpdated++;
        } else {
          // Create new profile
          await db.insert(artistExternalProfiles).values({
            id: generateId(),
            artistId: dbArtist.id,
            platform: profile.platform,
            externalUrl: profile.externalUrl,
            externalId: profile.externalId,
            handle: profile.handle,
            isPrimary: true,
            isVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          console.log(`  ✓ Created ${profile.platform} profile`);
          totalProfilesCreated++;
        }
      }
    } catch (error) {
      console.error(`  ❌ Error processing ${rosterArtist.name}:`, error);
      totalErrors++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 SYNC COMPLETE");
  console.log("=".repeat(50));
  console.log(`Artists processed: ${totalArtistsProcessed}`);
  console.log(`Profiles created: ${totalProfilesCreated}`);
  console.log(`Profiles updated: ${totalProfilesUpdated}`);
  console.log(`Errors: ${totalErrors}`);
  console.log("=".repeat(50));
}

// Run the sync
syncArtistProfiles()
  .then(() => {
    console.log("\n✅ Sync completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Sync failed:", error);
    process.exit(1);
  });
