/**
 * Simplified Setup Curated Playlists for Sonido Líquido Crew
 *
 * This script:
 * 1. Adds all roster artists as curated Spotify channels (using local data)
 * 2. Creates predefined playlists
 *
 * Track syncing can be done later via the admin interface.
 */

import { db, isDatabaseConfigured } from "@/db/client";
import {
  curatedSpotifyChannels,
  playlistTracks
} from "@/db/schema/curated-channels";
import { eq, sql } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";
import { artistsRoster } from "@/lib/data/artists-roster";

// Playlist definitions
const playlistDefinitions = [
  {
    id: "gran-reserva",
    name: "Gran Reserva",
    slug: "gran-reserva",
    description: "Lo mejor de Sonido Líquido Crew. Tracks esenciales seleccionados por el colectivo.",
    coverImageUrl: null,
    isActive: true,
    displayOrder: 1,
  },
  {
    id: "lo-nuevo",
    name: "Lo Nuevo",
    slug: "lo-nuevo",
    description: "Los lanzamientos más recientes del roster. Actualizada semanalmente.",
    coverImageUrl: null,
    isActive: true,
    displayOrder: 2,
  },
  {
    id: "clasicos",
    name: "Clásicos SLC",
    slug: "clasicos-slc",
    description: "Los tracks que definieron el sonido de Sonido Líquido Crew a lo largo de los años.",
    coverImageUrl: null,
    isActive: true,
    displayOrder: 3,
  },
  {
    id: "colaboraciones",
    name: "Colaboraciones",
    slug: "colaboraciones",
    description: "Tracks con colaboraciones entre miembros del crew y artistas invitados.",
    coverImageUrl: null,
    isActive: true,
    displayOrder: 4,
  },
  {
    id: "picks-semana",
    name: "Picks de la Semana",
    slug: "picks-de-la-semana",
    description: "Selección semanal de tracks favoritos del crew.",
    coverImageUrl: null,
    isActive: true,
    displayOrder: 5,
  },
];

async function main() {
  console.log("🎵 Setting Up Curated Playlists for Sonido Líquido Crew (Simple Mode)\n");
  console.log("=".repeat(60));

  if (!isDatabaseConfigured()) {
    console.log("❌ Database not configured");
    return;
  }

  // ========================================
  // STEP 1: Add roster artists as curated channels
  // ========================================
  console.log("\n\n📡 STEP 1: Adding Roster Artists as Curated Channels\n");
  console.log("-".repeat(60));

  let channelsAdded = 0;
  let channelsSkipped = 0;

  for (const artist of artistsRoster) {
    // Check if already exists
    const existing = await db
      .select()
      .from(curatedSpotifyChannels)
      .where(eq(curatedSpotifyChannels.spotifyArtistId, artist.spotifyId))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  ⏭️  ${artist.name} - Already exists`);
      channelsSkipped++;
      continue;
    }

    // Insert channel using local data
    const channelId = generateUUID();
    await db.insert(curatedSpotifyChannels).values({
      id: channelId,
      spotifyArtistId: artist.spotifyId,
      spotifyArtistUrl: artist.spotifyUrl,
      name: artist.name,
      imageUrl: null, // Will be fetched when syncing via admin
      genres: null,
      popularity: null,
      followers: null,
      category: "roster",
      priority: 10,
      description: artist.bio || null,
      autoSync: true,
      syncNewReleases: true,
      syncTopTracks: true,
      isActive: true,
    });

    console.log(`  ✅ ${artist.name} - Added (Spotify ID: ${artist.spotifyId})`);
    channelsAdded++;
  }

  console.log(`\n📊 Channels: ${channelsAdded} added, ${channelsSkipped} already existed`);

  // ========================================
  // STEP 2: Create playlists table if needed
  // ========================================
  console.log("\n\n📝 STEP 2: Creating Playlists\n");
  console.log("-".repeat(60));

  // Check if playlists table exists, create it if not
  try {
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS curated_playlists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        cover_image_url TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        display_order INTEGER NOT NULL DEFAULT 0,
        track_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log("  ✅ Playlists table ready");
  } catch (e) {
    console.log(`  ⚠️ Playlists table: ${e}`);
  }

  // Insert playlists
  let playlistsCreated = 0;
  let playlistsSkipped = 0;

  for (const playlist of playlistDefinitions) {
    try {
      // Check if exists
      const existing = await db.run(sql`SELECT id FROM curated_playlists WHERE slug = ${playlist.slug}`);

      if (existing.rows && existing.rows.length > 0) {
        console.log(`  ⏭️  ${playlist.name} - Already exists`);
        playlistsSkipped++;
        continue;
      }

      await db.run(sql`
        INSERT INTO curated_playlists (id, name, slug, description, cover_image_url, is_active, display_order)
        VALUES (${playlist.id}, ${playlist.name}, ${playlist.slug}, ${playlist.description}, ${playlist.coverImageUrl}, ${playlist.isActive ? 1 : 0}, ${playlist.displayOrder})
      `);
      console.log(`  ✅ ${playlist.name} - Created`);
      playlistsCreated++;
    } catch (e) {
      console.log(`  ⚠️  ${playlist.name} - ${e}`);
    }
  }

  console.log(`\n📊 Playlists: ${playlistsCreated} created, ${playlistsSkipped} already existed`);

  // ========================================
  // SUMMARY
  // ========================================
  console.log("\n\n" + "=".repeat(60));
  console.log("✅ SETUP COMPLETE!\n");

  // Count final stats
  const finalChannels = await db.select({ count: sql<number>`count(*)` }).from(curatedSpotifyChannels);

  console.log(`📊 Final Statistics:`);
  console.log(`   • Curated Channels: ${finalChannels[0]?.count || 0}`);
  console.log(`   • Playlists Created: ${playlistsCreated + playlistsSkipped}`);

  console.log("\n📌 Next Steps:");
  console.log("   1. Visit /admin/curated-channels to sync tracks from Spotify");
  console.log("   2. Click 'Sync Tracks' on each channel to fetch top tracks");
  console.log("   3. Visit /admin/curated-channels/tracks to add tracks to playlists");
  console.log("   4. Visit /playlists to see the public playlists page");
  console.log("\n🎉 Visit /playlists to see your curated playlists!");
  console.log("=".repeat(60));
}

main().catch(console.error);
