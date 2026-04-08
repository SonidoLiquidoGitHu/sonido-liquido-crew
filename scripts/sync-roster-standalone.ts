/**
 * Standalone Sync Tracks for All Roster Artists
 *
 * This script uses direct API calls without the shared Spotify client
 */

import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels, curatedTracks } from "@/db/schema/curated-channels";
import { eq, sql } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6";

interface SpotifyToken {
  access_token: string;
}

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

interface AlbumsResponse {
  items: SpotifyAlbum[];
  total: number;
  next: string | null;
}

async function getSpotifyToken(): Promise<string> {
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Failed to get token: ${response.statusText}`);
  }

  const data = await response.json() as SpotifyToken;
  return data.access_token;
}

async function getArtistAlbums(token: string, artistId: string): Promise<SpotifyAlbum[]> {
  const albums: SpotifyAlbum[] = [];
  let offset = 0;
  const limit = 20;

  while (true) {
    const url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=${limit}&offset=${offset}&market=MX`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`   Error fetching albums: ${error}`);
      break;
    }

    const data = await response.json() as AlbumsResponse;
    albums.push(...data.items);

    if (!data.next || data.items.length < limit) {
      break;
    }
    offset += limit;

    // Rate limit protection
    await new Promise(r => setTimeout(r, 100));
  }

  return albums;
}

async function getAlbumTracks(token: string, albumId: string): Promise<SpotifyAlbum | null> {
  const url = `https://api.spotify.com/v1/albums/${albumId}?market=MX`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    return null;
  }

  return await response.json() as SpotifyAlbum;
}

async function syncChannelTracks(token: string, channelId: string, channelName: string, spotifyArtistId: string) {
  console.log(`\n📡 Syncing tracks for ${channelName}...`);

  try {
    // Get albums
    const albums = await getArtistAlbums(token, spotifyArtistId);
    console.log(`   Found ${albums.length} albums/singles`);

    let addedTracks = 0;
    let skippedTracks = 0;

    // For each album, get tracks
    for (const album of albums) {
      try {
        const fullAlbum = await getAlbumTracks(token, album.id);
        if (!fullAlbum?.tracks?.items) continue;

        for (const track of fullAlbum.tracks.items) {
          // Check if exists
          const existing = await db
            .select()
            .from(curatedTracks)
            .where(eq(curatedTracks.spotifyTrackId, track.id))
            .limit(1);

          if (existing.length > 0) {
            skippedTracks++;
            continue;
          }

          // Add track
          await db.insert(curatedTracks).values({
            id: generateUUID(),
            spotifyTrackId: track.id,
            spotifyTrackUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
            spotifyAlbumId: fullAlbum.id,
            name: track.name,
            artistName: track.artists?.map(a => a.name).join(", ") || channelName,
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
          addedTracks++;
        }

        // Rate limit
        await new Promise(r => setTimeout(r, 150));
      } catch (err) {
        console.error(`   ⚠️ Error processing album ${album.name}`);
      }
    }

    // Update timestamp
    await db
      .update(curatedSpotifyChannels)
      .set({
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(curatedSpotifyChannels.id, channelId));

    console.log(`   ✅ Added ${addedTracks} tracks, skipped ${skippedTracks} existing`);
    return { addedTracks, skippedTracks, albumsProcessed: albums.length };
  } catch (error) {
    console.error(`   ❌ Error:`, error);
    return { addedTracks: 0, skippedTracks: 0, albumsProcessed: 0, error: true };
  }
}

async function main() {
  console.log("🎵 Syncing Tracks for All Roster Artists (Standalone)");
  console.log("=".repeat(60));

  if (!isDatabaseConfigured()) {
    console.log("❌ Database not configured");
    return;
  }

  // Get token first
  console.log("\n🔑 Getting Spotify access token...");
  const token = await getSpotifyToken();
  console.log("✅ Token obtained\n");

  // Get roster channels
  const channels = await db
    .select()
    .from(curatedSpotifyChannels)
    .where(eq(curatedSpotifyChannels.category, "roster"));

  console.log(`📊 Found ${channels.length} roster artists to sync`);

  if (channels.length === 0) {
    console.log("⚠️ No roster channels found");
    return;
  }

  // Sync each
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalAlbums = 0;
  let successfulChannels = 0;

  for (const channel of channels) {
    const result = await syncChannelTracks(token, channel.id, channel.name, channel.spotifyArtistId);

    if (!result.error) {
      successfulChannels++;
      totalAdded += result.addedTracks;
      totalSkipped += result.skippedTracks;
      totalAlbums += result.albumsProcessed;
    }

    // Delay between artists
    await new Promise(r => setTimeout(r, 500));
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ SYNC COMPLETE!\n");
  console.log("📊 Summary:");
  console.log(`   • Artists synced: ${successfulChannels}/${channels.length}`);
  console.log(`   • Albums processed: ${totalAlbums}`);
  console.log(`   • Tracks added: ${totalAdded}`);
  console.log(`   • Tracks skipped (existing): ${totalSkipped}`);

  const totalTracks = await db
    .select({ count: sql<number>`count(*)` })
    .from(curatedTracks);

  console.log(`\n📌 Database now has ${totalTracks[0]?.count || 0} curated tracks`);
  console.log("=".repeat(60));
}

main().catch(console.error);
