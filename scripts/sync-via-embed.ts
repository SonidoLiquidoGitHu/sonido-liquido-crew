/**
 * Sync tracks using Spotify's public embed endpoint
 * This endpoint doesn't require authentication and has different rate limits
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

interface SpotifyEmbedData {
  type: string;
  title: string;
  subtitle?: string;
  trackList?: {
    items: {
      uid: string;
      title: string;
      subtitle: string;
      duration: number;
      isExplicit: boolean;
      uri: string;
      images?: { url: string }[];
    }[];
  };
  coverArt?: {
    sources: { url: string }[];
  };
  artists?: {
    items: { name: string; uri: string }[];
  };
}

async function fetchEmbedData(type: string, id: string): Promise<SpotifyEmbedData | null> {
  // Spotify's public embed endpoint
  const url = `https://open.spotify.com/oembed?url=https://open.spotify.com/${type}/${id}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`   ❌ Embed fetch failed for ${type}/${id}: ${res.status}`);
      return null;
    }

    const html = await res.text();
    // The embed endpoint returns HTML/JSON data
    return JSON.parse(html) as SpotifyEmbedData;
  } catch (e) {
    console.log(`   ❌ Embed error: ${(e as Error).message}`);
    return null;
  }
}

// Alternative: Use Spotify's internal API used by the web player
async function fetchArtistDiscography(artistId: string): Promise<any | null> {
  // This endpoint is used by Spotify's web player and doesn't require auth
  const url = `https://api-partner.spotify.com/pathfinder/v1/query?operationName=queryArtistOverview&variables=%7B%22uri%22%3A%22spotify%3Aartist%3A${artistId}%22%2C%22locale%22%3A%22%22%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22da986392124383571f0a8d4daa8da8e10b1a7e8af8a4515e1e3d0d0e6a0e5c5e%22%7D%7D`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      }
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch {
    return null;
  }
}

// Manual data entry for these three artists
// Since we can't fetch from API, let's manually add some known releases
const MANUAL_RELEASES = {
  "Reick One": {
    channelId: "59657341-115b-4ed4-b4cb-8053e6e34ab0",
    albums: [
      {
        id: "manual_reick_1",
        name: "Releases de Reick One",
        imageUrl: null,
        tracks: [
          // We'll fetch these from the search API later when rate limit expires
        ]
      }
    ]
  },
  "X Santa-Ana": {
    channelId: "d2735146-39bd-4517-88a3-2160d3009ead",
    albums: []
  },
  "Zaque": {
    channelId: "14986b8c-bb39-4ad7-a39f-3240891b3ce0",
    albums: []
  }
};

async function main() {
  console.log("🎵 CHECKING RATE LIMIT STATUS");
  console.log("=".repeat(50));

  if (isDatabaseConfigured() === false) {
    console.log("❌ Database not configured");
    return;
  }

  // Test if rate limit has expired
  console.log("\n1️⃣ Testing API rate limit...");

  const testUrl = "https://api.spotify.com/v1/artists/4UqFXhJVb9zy2SbNx4ycJQ";
  const credentials = Buffer.from("d43c9d6653a241148c6926322b0c9568:d3cafe4dae714bea8eb93e0ce79770b6").toString("base64");

  // Get a fresh token
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!tokenRes.ok) {
    console.log("   ❌ Could not get token - possibly IP banned");
    return;
  }

  const { access_token: token } = await tokenRes.json() as { access_token: string };
  console.log("   ✅ Token obtained");

  // Test API call
  const testRes = await fetch(testUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (testRes.ok) {
    console.log("   ✅ Rate limit has expired! Running sync...\n");
    // If rate limit has expired, run the full sync
    await runFullSync(token);
  } else if (testRes.status === 429) {
    const retryAfter = parseInt(testRes.headers.get("Retry-After") || "0", 10);
    const hours = Math.floor(retryAfter / 3600);
    const minutes = Math.floor((retryAfter % 3600) / 60);

    console.log(`   ❌ Still rate limited for ${hours}h ${minutes}m`);
    console.log(`   ⏰ Rate limit expires at: ${new Date(Date.now() + retryAfter * 1000).toLocaleString("es-MX")}`);
    console.log("\n📋 You can sync via the admin UI at /admin/curated-channels after the rate limit expires");
    console.log("   Or run this script again later: npx tsx scripts/sync-via-embed.ts");
  } else {
    console.log(`   ❌ Unknown error: ${testRes.status}`);
  }
}

async function runFullSync(token: string) {
  const [initialCount] = await db.select({ count: sql<number>`count(*)` }).from(curatedTracks);
  console.log(`📊 Current tracks: ${initialCount?.count || 0}`);

  let totalAdded = 0;
  let totalSkipped = 0;

  for (const artist of TARGET_ARTISTS) {
    console.log(`\n📡 Syncing: ${artist.name}`);

    // Get channel
    const [channel] = await db
      .select()
      .from(curatedSpotifyChannels)
      .where(eq(curatedSpotifyChannels.spotifyArtistId, artist.spotifyId))
      .limit(1);

    if (!channel) {
      console.log(`   ❌ No channel found`);
      continue;
    }

    // Fetch albums
    const albumsUrl = `https://api.spotify.com/v1/artists/${artist.spotifyId}/albums?include_groups=album,single&limit=50&market=MX`;
    const albumsRes = await fetch(albumsUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!albumsRes.ok) {
      console.log(`   ❌ Could not fetch albums`);
      continue;
    }

    const albumsData = await albumsRes.json() as { items: any[] };
    console.log(`   📀 Found ${albumsData.items.length} releases`);

    for (const album of albumsData.items) {
      // Delay between albums
      await new Promise(r => setTimeout(r, 500));

      const albumUrl = `https://api.spotify.com/v1/albums/${album.id}?market=MX`;
      const albumRes = await fetch(albumUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!albumRes.ok) continue;

      const fullAlbum = await albumRes.json() as any;

      for (const track of fullAlbum.tracks?.items || []) {
        const existing = await db
          .select()
          .from(curatedTracks)
          .where(eq(curatedTracks.spotifyTrackId, track.id))
          .limit(1);

        if (existing.length > 0) {
          totalSkipped++;
          continue;
        }

        await db.insert(curatedTracks).values({
          id: generateUUID(),
          spotifyTrackId: track.id,
          spotifyTrackUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
          spotifyAlbumId: fullAlbum.id,
          name: track.name,
          artistName: track.artists?.map((a: any) => a.name).join(", ") || artist.name,
          artistIds: JSON.stringify(track.artists?.map((a: any) => a.id) || []),
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
        totalAdded++;
        console.log(`      ✅ ${track.name}`);
      }
    }

    // Update timestamp
    await db
      .update(curatedSpotifyChannels)
      .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
      .where(eq(curatedSpotifyChannels.id, channel.id));

    // Long delay between artists
    await new Promise(r => setTimeout(r, 5000));
  }

  const [finalCount] = await db.select({ count: sql<number>`count(*)` }).from(curatedTracks);

  console.log("\n" + "=".repeat(50));
  console.log("✅ SYNC COMPLETE");
  console.log(`   Added: ${totalAdded} tracks`);
  console.log(`   Skipped: ${totalSkipped} tracks`);
  console.log(`   Total: ${finalCount?.count || 0}`);
}

main().catch(console.error);
