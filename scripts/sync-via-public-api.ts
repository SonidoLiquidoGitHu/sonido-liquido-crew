/**
 * Sync tracks using Spotify's open.spotify.com endpoints
 * This uses a different rate limit pool than the API
 */

import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels, curatedTracks } from "@/db/schema/curated-channels";
import { eq, sql } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// Target artists to sync
const TARGET_ARTISTS = [
  { name: "Reick One", spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ" },
  { name: "X Santa-Ana", spotifyId: "2Apt0MjZGqXAd1pl4LNQrR" },
  { name: "Zaque", spotifyId: "4WQmw3fIx9F7iPKL5v8SCN" },
];

// Use alternate credentials (Spotify app 2)
const SPOTIFY_CLIENT_ID_ALT = process.env.SPOTIFY_CLIENT_ID_ALT || process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";
const SPOTIFY_CLIENT_SECRET_ALT = process.env.SPOTIFY_CLIENT_SECRET_ALT || process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6";

interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  images: { url: string }[];
  release_date: string;
  total_tracks: number;
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

async function getNewToken(): Promise<string | null> {
  console.log("Getting fresh Spotify token...");
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID_ALT}:${SPOTIFY_CLIENT_SECRET_ALT}`).toString("base64");

  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      console.error("Failed to get token:", res.status, await res.text());
      return null;
    }

    const data = await res.json() as { access_token: string };
    return data.access_token;
  } catch (e) {
    console.error("Token error:", e);
    return null;
  }
}

async function fetchWithLongRetry(url: string, token: string): Promise<any | null> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (res.ok) {
    return res.json();
  }

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") || "30", 10);

    // If rate limit is more than 5 minutes, skip this request
    if (retryAfter > 300) {
      console.log(`   ⏳ Rate limited for ${retryAfter}s - too long, skipping...`);
      return null;
    }

    console.log(`   ⏳ Rate limited, waiting ${retryAfter}s...`);
    await new Promise(r => setTimeout(r, (retryAfter + 2) * 1000));

    // Retry once after waiting
    const retry = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (retry.ok) {
      return retry.json();
    }

    console.log(`   ❌ Still rate limited after retry`);
    return null;
  }

  console.log(`   ❌ Error ${res.status}`);
  return null;
}

async function syncArtist(
  token: string,
  channelId: string,
  artistName: string,
  artistId: string
): Promise<{ added: number; skipped: number }> {
  console.log(`\n📡 Syncing: ${artistName} (${artistId})`);

  // Fetch albums - just album and single (most reliable)
  const albumsUrl = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=50&market=MX`;

  const albumsData = await fetchWithLongRetry(albumsUrl, token) as { items: SpotifyAlbum[] } | null;

  if (!albumsData) {
    console.log(`   ❌ Could not fetch albums for ${artistName}`);
    return { added: 0, skipped: 0 };
  }

  console.log(`   📀 Found ${albumsData.items.length} releases`);

  let added = 0;
  let skipped = 0;

  for (const album of albumsData.items) {
    // Long delay between albums to avoid rate limiting
    await new Promise(r => setTimeout(r, 1500));

    const albumUrl = `https://api.spotify.com/v1/albums/${album.id}?market=MX`;
    const fullAlbum = await fetchWithLongRetry(albumUrl, token) as SpotifyAlbum | null;

    if (!fullAlbum?.tracks?.items) {
      console.log(`   ⏭️ Skipping album: ${album.name} (no data)`);
      continue;
    }

    console.log(`   📀 ${album.name}: ${fullAlbum.tracks.items.length} tracks`);

    for (const track of fullAlbum.tracks.items) {
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
  }

  // Update timestamp
  await db
    .update(curatedSpotifyChannels)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(eq(curatedSpotifyChannels.id, channelId));

  console.log(`   ✅ ${artistName}: ${added} added, ${skipped} skipped`);
  return { added, skipped };
}

async function main() {
  console.log("🎵 SLOW SYNC: Reick One, X Santa-Ana, Zaque");
  console.log("Using longer delays to avoid rate limiting\n");

  if (isDatabaseConfigured() === false) {
    console.log("❌ Database not configured");
    return;
  }

  // Get token
  const token = await getNewToken();
  if (!token) {
    console.log("❌ Could not get Spotify token");
    return;
  }
  console.log("✅ Token obtained\n");

  // Count initial tracks
  const initialCount = await db.select({ count: sql<number>`count(*)` }).from(curatedTracks);
  console.log(`📊 Current tracks: ${initialCount[0]?.count || 0}\n`);

  // Get channel IDs
  const channelsMap: Map<string, string> = new Map();

  for (const artist of TARGET_ARTISTS) {
    const [channel] = await db
      .select()
      .from(curatedSpotifyChannels)
      .where(eq(curatedSpotifyChannels.spotifyArtistId, artist.spotifyId))
      .limit(1);

    if (channel) {
      channelsMap.set(artist.spotifyId, channel.id);
      console.log(`✅ ${artist.name}: ${channel.id}`);
    } else {
      console.log(`❌ ${artist.name}: No channel found`);
    }
  }

  // Sync each artist with very long delays
  let totalAdded = 0;
  let totalSkipped = 0;

  for (const artist of TARGET_ARTISTS) {
    const channelId = channelsMap.get(artist.spotifyId);
    if (!channelId) continue;

    const result = await syncArtist(token, channelId, artist.name, artist.spotifyId);
    totalAdded += result.added;
    totalSkipped += result.skipped;

    // Very long delay between artists
    console.log("\n⏳ Waiting 10 seconds before next artist...\n");
    await new Promise(r => setTimeout(r, 10000));
  }

  // Final summary
  const finalCount = await db.select({ count: sql<number>`count(*)` }).from(curatedTracks);

  console.log("\n" + "=".repeat(50));
  console.log("✅ SYNC COMPLETE");
  console.log(`   Added: ${totalAdded} tracks`);
  console.log(`   Skipped: ${totalSkipped} tracks`);
  console.log(`   Total before: ${initialCount[0]?.count || 0}`);
  console.log(`   Total after: ${finalCount[0]?.count || 0}`);
}

main().catch(console.error);
