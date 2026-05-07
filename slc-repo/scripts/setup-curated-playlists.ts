/**
 * Setup Curated Playlists for Sonido Líquido Crew
 *
 * This script:
 * 1. Adds all roster artists as curated Spotify channels
 * 2. Syncs their top tracks from Spotify
 * 3. Creates predefined playlists
 * 4. Adds tracks to playlists
 */

import { db, isDatabaseConfigured } from "@/db/client";
import {
  curatedSpotifyChannels,
  curatedTracks,
  playlistTracks
} from "@/db/schema/curated-channels";
import { eq, sql, desc } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";
import { artistsRoster } from "@/lib/data/artists-roster";

// Spotify API credentials
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

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

// Get Spotify access token
async function getSpotifyToken(): Promise<string> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error("Spotify credentials not configured");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Fetch artist info from Spotify
async function fetchArtistInfo(token: string, artistId: string) {
  const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    console.log(`  ⚠️ Could not fetch artist ${artistId}: ${response.status}`);
    return null;
  }

  return response.json();
}

// Fetch artist's top tracks from Spotify
async function fetchTopTracks(token: string, artistId: string) {
  const response = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=MX`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    console.log(`  ⚠️ Could not fetch top tracks for ${artistId}: ${response.status}`);
    return [];
  }

  const data = await response.json();
  return data.tracks || [];
}

async function main() {
  console.log("🎵 Setting Up Curated Playlists for Sonido Líquido Crew\n");
  console.log("=".repeat(60));

  if (!isDatabaseConfigured()) {
    console.log("❌ Database not configured");
    return;
  }

  // Get Spotify token
  console.log("\n🔑 Getting Spotify access token...");
  let token: string;
  try {
    token = await getSpotifyToken();
    console.log("  ✅ Token obtained");
  } catch (error) {
    console.log(`  ❌ Failed to get token: ${error}`);
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

    // Fetch from Spotify
    const artistInfo = await fetchArtistInfo(token, artist.spotifyId);
    if (!artistInfo) {
      console.log(`  ❌ ${artist.name} - Could not fetch from Spotify`);
      continue;
    }

    // Insert channel
    const channelId = generateUUID();
    await db.insert(curatedSpotifyChannels).values({
      id: channelId,
      spotifyArtistId: artist.spotifyId,
      spotifyArtistUrl: artist.spotifyUrl,
      name: artistInfo.name,
      imageUrl: artistInfo.images?.[0]?.url || null,
      genres: artistInfo.genres ? JSON.stringify(artistInfo.genres) : null,
      popularity: artistInfo.popularity || null,
      followers: artistInfo.followers?.total || null,
      category: "roster",
      priority: 10,
      description: artist.bio || null,
      autoSync: true,
      syncNewReleases: true,
      syncTopTracks: true,
      isActive: true,
    });

    console.log(`  ✅ ${artist.name} - Added (${artistInfo.followers?.total || 0} followers)`);
    channelsAdded++;

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n📊 Channels: ${channelsAdded} added, ${channelsSkipped} already existed`);

  // ========================================
  // STEP 2: Sync top tracks for each artist
  // ========================================
  console.log("\n\n🎶 STEP 2: Syncing Top Tracks from Spotify\n");
  console.log("-".repeat(60));

  // Get all channels
  const channels = await db.select().from(curatedSpotifyChannels);
  let totalTracks = 0;

  for (const channel of channels) {
    const tracks = await fetchTopTracks(token, channel.spotifyArtistId);

    if (tracks.length === 0) {
      console.log(`  ⚠️  ${channel.name} - No tracks found`);
      continue;
    }

    let addedForArtist = 0;
    for (const track of tracks) {
      // Check if track already exists
      const existing = await db
        .select()
        .from(curatedTracks)
        .where(eq(curatedTracks.spotifyTrackId, track.id))
        .limit(1);

      if (existing.length > 0) {
        continue;
      }

      // Add track
      const trackId = generateUUID();
      await db.insert(curatedTracks).values({
        id: trackId,
        channelId: channel.id,
        spotifyTrackId: track.id,
        spotifyTrackUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
        title: track.name,
        artistName: track.artists?.map((a: { name: string }) => a.name).join(", ") || channel.name,
        albumName: track.album?.name || null,
        albumImageUrl: track.album?.images?.[0]?.url || null,
        durationMs: track.duration_ms || null,
        popularity: track.popularity || null,
        previewUrl: track.preview_url || null,
        releaseDate: track.album?.release_date || null,
        isActive: true,
      });

      addedForArtist++;
      totalTracks++;
    }

    console.log(`  ✅ ${channel.name} - ${addedForArtist} tracks added`);
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n📊 Total tracks synced: ${totalTracks}`);

  // ========================================
  // STEP 3: Create playlists
  // ========================================
  console.log("\n\n📝 STEP 3: Creating Playlists\n");
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
  } catch (e) {
    // Table might already exist
  }

  // Insert playlists
  for (const playlist of playlistDefinitions) {
    try {
      // Check if exists
      const existing = await db.run(sql`SELECT id FROM curated_playlists WHERE slug = ${playlist.slug}`);

      if (existing.rows && existing.rows.length > 0) {
        console.log(`  ⏭️  ${playlist.name} - Already exists`);
        continue;
      }

      await db.run(sql`
        INSERT INTO curated_playlists (id, name, slug, description, cover_image_url, is_active, display_order)
        VALUES (${playlist.id}, ${playlist.name}, ${playlist.slug}, ${playlist.description}, ${playlist.coverImageUrl}, ${playlist.isActive ? 1 : 0}, ${playlist.displayOrder})
      `);
      console.log(`  ✅ ${playlist.name} - Created`);
    } catch (e) {
      console.log(`  ⚠️  ${playlist.name} - ${e}`);
    }
  }

  // ========================================
  // STEP 4: Add tracks to playlists
  // ========================================
  console.log("\n\n🎵 STEP 4: Adding Tracks to Playlists\n");
  console.log("-".repeat(60));

  // Get all tracks ordered by popularity
  const allTracks = await db
    .select()
    .from(curatedTracks)
    .orderBy(desc(curatedTracks.popularity))
    .limit(100);

  if (allTracks.length === 0) {
    console.log("  ⚠️  No tracks available to add to playlists");
  } else {
    // Add top 20 tracks to "Gran Reserva"
    console.log("\n  📀 Gran Reserva - Adding top tracks...");
    const granReservaTracks = allTracks.slice(0, 20);
    for (let i = 0; i < granReservaTracks.length; i++) {
      const track = granReservaTracks[i];
      try {
        // Check if already in playlist
        const existing = await db
          .select()
          .from(playlistTracks)
          .where(sql`playlist_id = 'gran-reserva' AND track_id = ${track.id}`)
          .limit(1);

        if (existing.length === 0) {
          await db.insert(playlistTracks).values({
            id: generateUUID(),
            playlistId: "gran-reserva",
            trackId: track.id,
            position: i,
            addedBy: "system",
          });
        }
      } catch (e) {
        // Skip errors
      }
    }
    console.log(`    ✅ Added ${granReservaTracks.length} tracks`);

    // Add varied tracks to "Picks de la Semana"
    console.log("\n  📀 Picks de la Semana - Adding curated selection...");
    const picksTracks = allTracks.filter((_, i) => i % 5 === 0).slice(0, 10);
    for (let i = 0; i < picksTracks.length; i++) {
      const track = picksTracks[i];
      try {
        const existing = await db
          .select()
          .from(playlistTracks)
          .where(sql`playlist_id = 'picks-semana' AND track_id = ${track.id}`)
          .limit(1);

        if (existing.length === 0) {
          await db.insert(playlistTracks).values({
            id: generateUUID(),
            playlistId: "picks-semana",
            trackId: track.id,
            position: i,
            addedBy: "system",
          });
        }
      } catch (e) {
        // Skip errors
      }
    }
    console.log(`    ✅ Added ${picksTracks.length} tracks`);

    // Add recent tracks to "Lo Nuevo"
    console.log("\n  📀 Lo Nuevo - Adding recent tracks...");
    const recentTracks = [...allTracks]
      .filter(t => t.releaseDate)
      .sort((a, b) => (b.releaseDate || "").localeCompare(a.releaseDate || ""))
      .slice(0, 15);

    for (let i = 0; i < recentTracks.length; i++) {
      const track = recentTracks[i];
      try {
        const existing = await db
          .select()
          .from(playlistTracks)
          .where(sql`playlist_id = 'lo-nuevo' AND track_id = ${track.id}`)
          .limit(1);

        if (existing.length === 0) {
          await db.insert(playlistTracks).values({
            id: generateUUID(),
            playlistId: "lo-nuevo",
            trackId: track.id,
            position: i,
            addedBy: "system",
          });
        }
      } catch (e) {
        // Skip errors
      }
    }
    console.log(`    ✅ Added ${recentTracks.length} tracks`);
  }

  // ========================================
  // SUMMARY
  // ========================================
  console.log("\n\n" + "=".repeat(60));
  console.log("✅ SETUP COMPLETE!\n");

  // Count final stats
  const finalChannels = await db.select({ count: sql<number>`count(*)` }).from(curatedSpotifyChannels);
  const finalTracks = await db.select({ count: sql<number>`count(*)` }).from(curatedTracks);
  const finalPlaylistTracks = await db.select({ count: sql<number>`count(*)` }).from(playlistTracks);

  console.log(`📊 Final Statistics:`);
  console.log(`   • Curated Channels: ${finalChannels[0]?.count || 0}`);
  console.log(`   • Tracks Synced: ${finalTracks[0]?.count || 0}`);
  console.log(`   • Playlist Tracks: ${finalPlaylistTracks[0]?.count || 0}`);
  console.log(`   • Playlists Created: ${playlistDefinitions.length}`);

  console.log("\n🎉 Visit /playlists to see your curated playlists!");
  console.log("=".repeat(60));
}

main().catch(console.error);
