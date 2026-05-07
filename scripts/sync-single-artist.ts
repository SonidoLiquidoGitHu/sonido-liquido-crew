/**
 * Sync tracks for a single artist to debug the API issue
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
    items: {
      id: string;
      name: string;
      duration_ms: number;
      preview_url: string | null;
      explicit: boolean;
      popularity?: number;
      external_urls: { spotify: string };
      artists: { id: string; name: string }[];
    }[];
  };
}

async function main() {
  console.log("🎵 Sync Single Artist Test\n");

  // Step 1: Get token
  console.log("1. Getting Spotify token...");
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!tokenRes.ok) {
    console.error("Failed to get token");
    return;
  }

  const { access_token: token } = await tokenRes.json() as { access_token: string };
  console.log("   ✅ Token obtained\n");

  // Step 2: Get first channel from database
  console.log("2. Getting first channel from database...");
  if (!isDatabaseConfigured()) {
    console.log("   ❌ Database not configured");
    return;
  }

  const [channel] = await db
    .select()
    .from(curatedSpotifyChannels)
    .where(eq(curatedSpotifyChannels.category, "roster"))
    .limit(1);

  if (!channel) {
    console.log("   ❌ No channels found");
    return;
  }

  console.log(`   ✅ Found: ${channel.name} (${channel.spotifyArtistId})\n`);

  // Step 3: Fetch albums
  console.log("3. Fetching albums from Spotify...");
  const albumsUrl = `https://api.spotify.com/v1/artists/${channel.spotifyArtistId}/albums?include_groups=album,single&limit=10&market=MX`;
  console.log(`   URL: ${albumsUrl}`);

  const albumsRes = await fetch(albumsUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log(`   Status: ${albumsRes.status}`);

  if (!albumsRes.ok) {
    const error = await albumsRes.text();
    console.log(`   ❌ Error: ${error}`);
    return;
  }

  const albumsData = await albumsRes.json() as { items: SpotifyAlbum[]; total: number };
  console.log(`   ✅ Found ${albumsData.items.length} albums (${albumsData.total} total)\n`);

  // Step 4: Get tracks from first album
  if (albumsData.items.length === 0) {
    console.log("4. No albums to process");
    return;
  }

  const firstAlbum = albumsData.items[0];
  console.log(`4. Getting tracks from album: ${firstAlbum.name}...`);

  const albumUrl = `https://api.spotify.com/v1/albums/${firstAlbum.id}?market=MX`;
  const albumRes = await fetch(albumUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!albumRes.ok) {
    console.log(`   ❌ Error: ${await albumRes.text()}`);
    return;
  }

  const fullAlbum = await albumRes.json() as SpotifyAlbum;
  const tracks = fullAlbum.tracks?.items || [];
  console.log(`   ✅ Found ${tracks.length} tracks\n`);

  // Step 5: Add tracks to database
  console.log("5. Adding tracks to database...");
  let added = 0;
  let skipped = 0;

  for (const track of tracks) {
    // Check if exists
    const existing = await db
      .select()
      .from(curatedTracks)
      .where(eq(curatedTracks.spotifyTrackId, track.id))
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    await db.insert(curatedTracks).values({
      id: generateUUID(),
      spotifyTrackId: track.id,
      spotifyTrackUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
      spotifyAlbumId: fullAlbum.id,
      name: track.name,
      artistName: track.artists?.map(a => a.name).join(", ") || channel.name,
      artistIds: JSON.stringify(track.artists?.map(a => a.id) || []),
      albumName: fullAlbum.name,
      albumImageUrl: fullAlbum.images?.[0]?.url || null,
      durationMs: track.duration_ms || null,
      previewUrl: track.preview_url || null,
      releaseDate: fullAlbum.release_date || null,
      popularity: track.popularity || null,
      explicit: Boolean(track.explicit),
      curatedChannelId: channel.id,
      isAvailableForPlaylist: true,
      isFeatured: false,
    });
    added++;
    console.log(`   Added: ${track.name}`);
  }

  console.log(`\n   ✅ Added ${added} tracks, skipped ${skipped} existing\n`);

  // Count total
  const total = await db.select({ count: sql<number>`count(*)` }).from(curatedTracks);
  console.log(`📊 Total tracks in database: ${total[0]?.count || 0}`);
}

main().catch(console.error);
