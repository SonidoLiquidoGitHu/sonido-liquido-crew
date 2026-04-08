/**
 * Sync tracks using Spotify Search API
 * The search endpoint has different rate limits than the artist albums endpoint
 */

import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels, curatedTracks } from "@/db/schema/curated-channels";
import { eq, sql } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

const SPOTIFY_CLIENT_ID = "d43c9d6653a241148c6926322b0c9568";
const SPOTIFY_CLIENT_SECRET = "d3cafe4dae714bea8eb93e0ce79770b6";

// Target artists to sync
const TARGET_ARTISTS = [
  { name: "Reick One", spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ", searchNames: ["Reick One", "Reick Uno", "Reick"] },
  { name: "X Santa-Ana", spotifyId: "2Apt0MjZGqXAd1pl4LNQrR", searchNames: ["X Santa-Ana", "X Santa Ana", "X Santana", "Sonido Líquido"] },
  { name: "Zaque", spotifyId: "4WQmw3fIx9F7iPKL5v8SCN", searchNames: ["Zaque", "Zaque SLC", "Sonido Líquido Crew"] },
];

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

  const { access_token } = await res.json() as { access_token: string };
  return access_token;
}

async function searchAlbums(token: string, query: string, limit = 50): Promise<any[]> {
  // Don't double encode - just use the query directly
  const url = `https://api.spotify.com/v1/search?q=${query}&type=album&market=MX&limit=${limit}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    console.log(`   Search failed: ${res.status}`);
    return [];
  }

  const data = await res.json() as any;
  return data.albums?.items || [];
}

async function getAlbumTracks(token: string, albumId: string): Promise<any | null> {
  const url = `https://api.spotify.com/v1/albums/${albumId}?market=MX`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    if (res.status === 429) {
      console.log(`   Album fetch rate limited`);
    }
    return null;
  }

  return res.json();
}

async function main() {
  console.log("🎵 SYNC VIA SEARCH: Reick One, X Santa-Ana, Zaque");
  console.log("Using search endpoint to discover albums\n");

  if (isDatabaseConfigured() === false) {
    console.log("❌ Database not configured");
    return;
  }

  const token = await getToken();
  console.log("✅ Token obtained\n");

  // Get initial count
  const [initialCount] = await db.select({ count: sql<number>`count(*)` }).from(curatedTracks);
  console.log(`📊 Current tracks: ${initialCount?.count || 0}\n`);

  // Map channel IDs
  const channelsMap = new Map<string, string>();
  for (const artist of TARGET_ARTISTS) {
    const [channel] = await db
      .select()
      .from(curatedSpotifyChannels)
      .where(eq(curatedSpotifyChannels.spotifyArtistId, artist.spotifyId))
      .limit(1);

    if (channel) {
      channelsMap.set(artist.spotifyId, channel.id);
    }
  }

  let totalAdded = 0;
  let totalSkipped = 0;

  for (const artist of TARGET_ARTISTS) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`📡 Searching for: ${artist.name}`);
    console.log(`${"=".repeat(50)}`);

    const channelId = channelsMap.get(artist.spotifyId);
    if (!channelId) {
      console.log(`   ❌ No channel found`);
      continue;
    }

    const foundAlbums = new Set<string>();

    // Search with different name variants
    for (const searchName of artist.searchNames) {
      console.log(`\n   🔍 Searching: "${searchName}"`);

      // Search for albums (artist: without quotes works better)
      const albums = await searchAlbums(token, `artist:${searchName}`, 50);

      // Also search for tracks and extract album info
      const tracksUrl = `https://api.spotify.com/v1/search?q=artist:${encodeURIComponent(searchName)}&type=track&market=MX&limit=50`;
      const tracksRes = await fetch(tracksUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (tracksRes.ok) {
        const tracksData = await tracksRes.json() as any;
        const trackAlbums = (tracksData.tracks?.items || [])
          .filter((t: any) => t.artists.some((a: any) => a.id === artist.spotifyId))
          .map((t: any) => t.album);

        for (const album of trackAlbums) {
          if (album?.id && !foundAlbums.has(album.id)) {
            foundAlbums.add(album.id);
          }
        }
      }

      // Filter albums by the artist ID
      for (const album of albums) {
        if (album.artists.some((a: any) => a.id === artist.spotifyId)) {
          foundAlbums.add(album.id);
        }
      }

      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`\n   📀 Found ${foundAlbums.size} unique albums/singles`);

    // Fetch tracks from each album
    let artistAdded = 0;
    let artistSkipped = 0;

    for (const albumId of foundAlbums) {
      await new Promise(r => setTimeout(r, 300));

      const album = await getAlbumTracks(token, albumId);
      if (!album?.tracks?.items) continue;

      console.log(`   📀 ${album.name}: ${album.tracks.items.length} tracks`);

      for (const track of album.tracks.items) {
        const existing = await db
          .select()
          .from(curatedTracks)
          .where(eq(curatedTracks.spotifyTrackId, track.id))
          .limit(1);

        if (existing.length > 0) {
          artistSkipped++;
          continue;
        }

        await db.insert(curatedTracks).values({
          id: generateUUID(),
          spotifyTrackId: track.id,
          spotifyTrackUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
          spotifyAlbumId: album.id,
          name: track.name,
          artistName: track.artists?.map((a: any) => a.name).join(", ") || artist.name,
          artistIds: JSON.stringify(track.artists?.map((a: any) => a.id) || []),
          albumName: album.name,
          albumImageUrl: album.images?.[0]?.url || null,
          durationMs: track.duration_ms || null,
          previewUrl: track.preview_url || null,
          releaseDate: album.release_date || null,
          popularity: track.popularity || null,
          explicit: Boolean(track.explicit),
          curatedChannelId: channelId,
          isAvailableForPlaylist: true,
          isFeatured: false,
        });
        artistAdded++;
      }
    }

    console.log(`   ✅ ${artist.name}: Added ${artistAdded}, Skipped ${artistSkipped}`);
    totalAdded += artistAdded;
    totalSkipped += artistSkipped;

    // Update timestamp
    await db
      .update(curatedSpotifyChannels)
      .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
      .where(eq(curatedSpotifyChannels.id, channelId));
  }

  // Final summary
  const [finalCount] = await db.select({ count: sql<number>`count(*)` }).from(curatedTracks);

  console.log("\n" + "=".repeat(50));
  console.log("✅ SYNC COMPLETE");
  console.log(`   Total added: ${totalAdded} tracks`);
  console.log(`   Total skipped: ${totalSkipped} tracks`);
  console.log(`   Before: ${initialCount?.count || 0}`);
  console.log(`   After: ${finalCount?.count || 0}`);
}

main().catch(console.error);
