/**
 * Sync tracks for Reick One, X Santa-Ana, and Zaque
 * These three artists appear in many crew releases
 */

import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels, curatedTracks } from "@/db/schema/curated-channels";
import { eq, sql, and, or } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6";

// Target artists to sync
const TARGET_ARTISTS = [
  { name: "Reick One", spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ" },
  { name: "X Santa-Ana", spotifyId: "2Apt0MjZGqXAd1pl4LNQrR" },
  { name: "Zaque", spotifyId: "4WQmw3fIx9F7iPKL5v8SCN" },
];

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

    console.log(`   ⚠️ Status ${res.status}, retry ${i + 1}/${retries}`);
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
  console.log(`\n${"=".repeat(50)}`);
  console.log(`📡 Syncing: ${artistName}`);
  console.log(`   Spotify ID: ${artistId}`);
  console.log(`${"=".repeat(50)}`);

  // Fetch ALL albums (up to 50)
  const albumsUrl = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation,appears_on&limit=50&market=MX`;

  const albumsRes = await fetchWithRetry(albumsUrl, token);

  if (!albumsRes) {
    console.log(`   ❌ Failed to fetch albums`);
    return { added: 0, skipped: 0, albums: 0 };
  }

  const albumsData = await albumsRes.json() as { items: SpotifyAlbum[]; total: number };
  console.log(`   📀 Found ${albumsData.items.length} releases (${albumsData.total} total)`);

  let added = 0;
  let skipped = 0;
  let albumCount = 0;

  // Process each album
  for (const album of albumsData.items) {
    albumCount++;
    console.log(`\n   [${albumCount}/${albumsData.items.length}] ${album.album_type}: "${album.name}" (${album.total_tracks} tracks)`);

    const albumUrl = `https://api.spotify.com/v1/albums/${album.id}?market=MX`;
    const albumRes = await fetchWithRetry(albumUrl, token);

    if (!albumRes) {
      console.log(`      ❌ Failed to fetch album details`);
      continue;
    }

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
      console.log(`      ✅ Added: ${track.name}`);
    }

    // Small delay between albums to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  // Update timestamp
  await db
    .update(curatedSpotifyChannels)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(eq(curatedSpotifyChannels.id, channelId));

  console.log(`\n   📊 Summary for ${artistName}:`);
  console.log(`      Added: ${added} tracks`);
  console.log(`      Skipped: ${skipped} (already exist)`);
  console.log(`      Albums processed: ${albumCount}`);

  return { added, skipped, albums: albumCount };
}

async function main() {
  console.log("🎵 SYNC THREE ARTISTS: Reick One, X Santa-Ana, Zaque");
  console.log("=".repeat(60));
  console.log("These three artists appear in many crew releases\n");

  // 1. Get Spotify token
  console.log("1️⃣ Getting Spotify token...");
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
    console.error("   ❌ Failed to get token");
    return;
  }

  const { access_token: token } = await tokenRes.json() as { access_token: string };
  console.log("   ✅ Token obtained\n");

  // 2. Check database
  console.log("2️⃣ Checking database...");
  if (!isDatabaseConfigured()) {
    console.log("   ❌ Database not configured");
    return;
  }

  // Get current track count
  const initialCount = await db.select({ count: sql<number>`count(*)` }).from(curatedTracks);
  console.log(`   📊 Current tracks in database: ${initialCount[0]?.count || 0}\n`);

  // 3. Get or create channels for target artists
  console.log("3️⃣ Getting/creating channels for target artists...");

  const channelsMap: Map<string, string> = new Map();

  for (const artist of TARGET_ARTISTS) {
    // Check if channel exists
    const [existing] = await db
      .select()
      .from(curatedSpotifyChannels)
      .where(eq(curatedSpotifyChannels.spotifyArtistId, artist.spotifyId))
      .limit(1);

    if (existing) {
      channelsMap.set(artist.spotifyId, existing.id);
      console.log(`   ✅ ${artist.name}: Channel exists (${existing.id})`);
    } else {
      // Create new channel
      const newId = generateUUID();
      await db.insert(curatedSpotifyChannels).values({
        id: newId,
        spotifyArtistId: artist.spotifyId,
        spotifyArtistUrl: `https://open.spotify.com/artist/${artist.spotifyId}`,
        name: artist.name,
        category: "roster",
        imageUrl: null,
        isActive: true,
      });
      channelsMap.set(artist.spotifyId, newId);
      console.log(`   🆕 ${artist.name}: Channel created (${newId})`);
    }
  }

  // 4. Sync each artist
  console.log("\n4️⃣ Syncing artists...");

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalAlbums = 0;

  for (const artist of TARGET_ARTISTS) {
    const channelId = channelsMap.get(artist.spotifyId);
    if (!channelId) {
      console.log(`   ❌ No channel ID for ${artist.name}`);
      continue;
    }

    const result = await syncOneArtist(token, channelId, artist.name, artist.spotifyId);
    totalAdded += result.added;
    totalSkipped += result.skipped;
    totalAlbums += result.albums;

    // Delay between artists to avoid rate limiting
    console.log("\n   ⏳ Waiting 3 seconds before next artist...");
    await new Promise(r => setTimeout(r, 3000));
  }

  // 5. Final summary
  const finalCount = await db.select({ count: sql<number>`count(*)` }).from(curatedTracks);

  console.log("\n" + "=".repeat(60));
  console.log("✅ SYNC COMPLETE!");
  console.log("=".repeat(60));
  console.log(`\n📊 FINAL SUMMARY:`);
  console.log(`   🎵 Tracks added: ${totalAdded}`);
  console.log(`   ⏭️ Tracks skipped (existing): ${totalSkipped}`);
  console.log(`   📀 Albums processed: ${totalAlbums}`);
  console.log(`   📈 Total tracks before: ${initialCount[0]?.count || 0}`);
  console.log(`   📈 Total tracks after: ${finalCount[0]?.count || 0}`);
  console.log(`   ➕ Net change: +${(finalCount[0]?.count || 0) - (initialCount[0]?.count || 0)}\n`);
}

main().catch(console.error);
