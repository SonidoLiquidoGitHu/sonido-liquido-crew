/**
 * Sequential Sync - mimics sync-single-artist exactly
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

async function fetchWithRetry(url: string, token: string, retries = 3): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) return res;

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") || "10", 10);
      console.log(`   ⏳ Rate limited, waiting ${retryAfter}s...`);
      await new Promise(r => setTimeout(r, (retryAfter + 1) * 1000));
      continue;
    }

    // For other errors, wait a bit and retry
    if (i < retries - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return null;
}

async function syncOneArtist(
  token: string,
  channelId: string,
  artistName: string,
  artistId: string
) {
  console.log(`\n📡 ${artistName}...`);

  // Fetch albums with retry
  const albumsUrl = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=10&market=MX`;

  const albumsRes = await fetchWithRetry(albumsUrl, token);

  if (!albumsRes) {
    console.log(`   ❌ Failed to fetch albums`);
    return { added: 0, skipped: 0 };
  }

  const albumsData = await albumsRes.json() as { items: SpotifyAlbum[]; total: number };
  console.log(`   ${albumsData.items.length} albums (${albumsData.total} total)`);

  let added = 0;
  let skipped = 0;

  // Process each album
  for (const album of albumsData.items) {
    const albumUrl = `https://api.spotify.com/v1/albums/${album.id}?market=MX`;
    const albumRes = await fetchWithRetry(albumUrl, token);

    if (!albumRes) continue;

    const fullAlbum = await albumRes.json() as SpotifyAlbum;
    const tracks = fullAlbum.tracks?.items || [];

    for (const track of tracks) {
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

    await new Promise(r => setTimeout(r, 150));
  }

  // Update timestamp
  await db
    .update(curatedSpotifyChannels)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(eq(curatedSpotifyChannels.id, channelId));

  console.log(`   ✅ ${added} added, ${skipped} skipped`);
  return { added, skipped };
}

async function main() {
  console.log("🎵 Sequential Sync All Artists\n");

  // 1. Get token
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
  console.log("   ✅ Token obtained");

  // 2. Get channels
  console.log("\n2. Getting channels from database...");
  if (!isDatabaseConfigured()) {
    console.log("   ❌ Database not configured");
    return;
  }

  const channels = await db
    .select()
    .from(curatedSpotifyChannels)
    .where(eq(curatedSpotifyChannels.category, "roster"));

  console.log(`   ✅ Found ${channels.length} artists`);

  // 3. Sync each
  console.log("\n3. Syncing artists...");
  let totalAdded = 0;
  let totalSkipped = 0;

  for (const channel of channels) {
    const result = await syncOneArtist(token, channel.id, channel.name, channel.spotifyArtistId);
    totalAdded += result.added;
    totalSkipped += result.skipped;

    await new Promise(r => setTimeout(r, 2000)); // 2 second delay between artists
  }

  // Summary
  const total = await db.select({ count: sql<number>`count(*)` }).from(curatedTracks);

  console.log("\n" + "=".repeat(50));
  console.log("✅ COMPLETE!\n");
  console.log(`   Added: ${totalAdded}`);
  console.log(`   Skipped: ${totalSkipped}`);
  console.log(`   Total in DB: ${total[0]?.count || 0}`);
}

main().catch(console.error);
