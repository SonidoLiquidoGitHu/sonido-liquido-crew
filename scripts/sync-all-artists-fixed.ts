/**
 * Sync Tracks for All Roster Artists
 * Fixed version with correct initialization order
 */

import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels, curatedTracks } from "@/db/schema/curated-channels";
import { eq, sql } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6";

interface SpotifyAlbum {
  id: string;
  name: string;
  images: { url: string }[];
  release_date: string;
  tracks?: {
    items: SpotifyTrack[];
  };
}

interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  preview_url: string | null;
  explicit: boolean;
  popularity?: number;
  external_urls: { spotify: string };
  artists: { id: string; name: string }[];
}

async function getToken(): Promise<string> {
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) throw new Error("Failed to get token");
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

async function getArtistAlbums(token: string, artistId: string): Promise<SpotifyAlbum[]> {
  const albums: SpotifyAlbum[] = [];
  let offset = 0;
  const limit = 20; // Use 20 as that's what works in tests

  while (true) {
    const url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=${limit}&offset=${offset}&market=MX`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      console.error(`   ⚠️ Error fetching albums: ${await res.text()}`);
      break;
    }

    const data = await res.json() as { items: SpotifyAlbum[]; next: string | null };
    albums.push(...data.items);

    if (!data.next || data.items.length < limit) break;
    offset += limit;
    await new Promise(r => setTimeout(r, 100));
  }

  return albums;
}

async function getAlbumDetails(token: string, albumId: string): Promise<SpotifyAlbum | null> {
  const url = `https://api.spotify.com/v1/albums/${albumId}?market=MX`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) return null;
  return await res.json() as SpotifyAlbum;
}

async function syncArtist(
  token: string,
  channelId: string,
  artistName: string,
  spotifyArtistId: string
): Promise<{ added: number; skipped: number; albums: number }> {
  console.log(`\n📡 ${artistName}...`);

  const albums = await getArtistAlbums(token, spotifyArtistId);
  console.log(`   ${albums.length} albums found`);

  let added = 0;
  let skipped = 0;

  for (const album of albums) {
    const fullAlbum = await getAlbumDetails(token, album.id);
    if (!fullAlbum?.tracks?.items) continue;

    for (const track of fullAlbum.tracks.items) {
      // Check exists
      const existing = await db
        .select()
        .from(curatedTracks)
        .where(eq(curatedTracks.spotifyTrackId, track.id))
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Add track
      await db.insert(curatedTracks).values({
        id: generateUUID(),
        spotifyTrackId: track.id,
        spotifyTrackUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
        spotifyAlbumId: fullAlbum.id,
        name: track.name,
        artistName: track.artists?.map(a => a.name).join(", ") || artistName,
        artistIds: JSON.stringify(track.artists?.map(a => a.id) || []),
        albumName: fullAlbum.name,
        albumImageUrl: fullAlbum.images?.[0]?.url || null,
        durationMs: track.duration_ms || null,
        previewUrl: track.preview_url || null,
        releaseDate: fullAlbum.release_date || null,
        popularity: track.popularity || null,
        explicit: Boolean(track.explicit),
        curatedChannelId: channelId,
        isAvailableForPlaylist: true,
        isFeatured: false,
      });
      added++;
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 100));
  }

  // Update timestamp
  await db
    .update(curatedSpotifyChannels)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(eq(curatedSpotifyChannels.id, channelId));

  console.log(`   ✅ ${added} added, ${skipped} skipped`);
  return { added, skipped, albums: albums.length };
}

async function main() {
  console.log("🎵 Syncing All Roster Artists to Curated Tracks");
  console.log("=".repeat(60));

  // Step 1: Get Spotify token FIRST
  console.log("\n🔑 Getting Spotify token...");
  const token = await getToken();
  console.log("✅ Token obtained");

  // Step 2: Initialize database
  console.log("\n📦 Initializing database...");
  if (!isDatabaseConfigured()) {
    console.log("❌ Database not configured");
    return;
  }

  // Step 3: Get channels
  const channels = await db
    .select()
    .from(curatedSpotifyChannels)
    .where(eq(curatedSpotifyChannels.category, "roster"));

  console.log(`\n📊 Found ${channels.length} roster artists`);

  // Step 4: Sync each artist
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalAlbums = 0;

  for (const channel of channels) {
    try {
      const result = await syncArtist(token, channel.id, channel.name, channel.spotifyArtistId);
      totalAdded += result.added;
      totalSkipped += result.skipped;
      totalAlbums += result.albums;
    } catch (err) {
      console.error(`   ❌ Error: ${err}`);
    }

    // Delay between artists
    await new Promise(r => setTimeout(r, 300));
  }

  // Summary
  const finalCount = await db.select({ count: sql<number>`count(*)` }).from(curatedTracks);

  console.log("\n" + "=".repeat(60));
  console.log("✅ SYNC COMPLETE!\n");
  console.log("📊 Summary:");
  console.log(`   • Artists: ${channels.length}`);
  console.log(`   • Albums processed: ${totalAlbums}`);
  console.log(`   • Tracks added: ${totalAdded}`);
  console.log(`   • Tracks skipped: ${totalSkipped}`);
  console.log(`   • Total in database: ${finalCount[0]?.count || 0}`);
  console.log("=".repeat(60));
}

main().catch(console.error);
