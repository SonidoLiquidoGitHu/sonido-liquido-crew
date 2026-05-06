/**
 * Sync Spotify releases using public web API (no rate limits)
 * Run with: bunx tsx scripts/sync-spotify-public.ts
 */

import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local" });

import { db, isDatabaseConfigured } from "../src/db/client";
import { releases, releaseArtists, artists } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { artistsRoster } from "../src/lib/data/artists-roster";

// Generate UUID
function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Create slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

interface SpotifyPublicAlbum {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  cover?: string;
  uri: string;
}

// Fetch artist releases from Spotify's public embed API
async function fetchArtistReleases(spotifyId: string): Promise<SpotifyPublicAlbum[]> {
  try {
    // Use Spotify's oEmbed to get artist info
    const artistUrl = `https://open.spotify.com/artist/${spotifyId}`;
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(artistUrl)}`;

    const response = await fetch(oembedUrl);
    if (!response.ok) {
      console.log(`     ⚠️ oEmbed failed for artist`);
      return [];
    }

    // Now try to fetch from the Spotify internal API
    // This uses the public web player API
    const webApiUrl = `https://api-partner.spotify.com/pathfinder/v1/query?operationName=queryArtistOverview&variables=${encodeURIComponent(JSON.stringify({uri:`spotify:artist:${spotifyId}`,locale:"es",includePrerelease:true}))}&extensions=${encodeURIComponent(JSON.stringify({persistedQuery:{version:1,sha256Hash:"35648a112beb1794e39ab931365f6ae4a8d45e65396d641eeda94e4003d41497"}}))}`;

    // This API is public but may not work in all cases
    // Let's try a simpler approach - fetch the artist page

    return [];
  } catch (error) {
    console.error(`     ❌ Error:`, error);
    return [];
  }
}

// Alternative: Use Spotify oEmbed to verify albums from a list
async function verifyAlbumExists(albumId: string): Promise<{
  exists: boolean;
  title?: string;
  thumbnail?: string;
}> {
  try {
    const albumUrl = `https://open.spotify.com/album/${albumId}`;
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(albumUrl)}`;

    const response = await fetch(oembedUrl);
    if (!response.ok) {
      return { exists: false };
    }

    const data = await response.json();
    return {
      exists: true,
      title: data.title,
      thumbnail: data.thumbnail_url,
    };
  } catch {
    return { exists: false };
  }
}

// Known albums for each artist (we can add these manually or from previous syncs)
const KNOWN_ALBUMS: Record<string, string[]> = {
  // Format: artistSpotifyId: [albumId1, albumId2, ...]
  // These can be populated from previous successful syncs or manually
};

async function main() {
  console.log("\n🎵 SINCRONIZANDO RELEASES (API PÚBLICA)");
  console.log("=".repeat(50));

  if (!isDatabaseConfigured()) {
    console.error("❌ Database not configured");
    process.exit(1);
  }

  console.log("\n[DB] Conectado a la base de datos");

  // Get all artists from DB
  const dbArtists = await db.select().from(artists);
  console.log(`📋 ${dbArtists.length} artistas en la base de datos`);

  // Get existing releases
  const existingReleases = await db.select().from(releases);
  console.log(`📦 ${existingReleases.length} releases ya existentes\n`);

  // Show stats
  const releasesByArtist: Record<string, number> = {};

  // Get release counts per artist
  const releaseArtistsData = await db.select().from(releaseArtists);
  for (const ra of releaseArtistsData) {
    const artist = dbArtists.find(a => a.id === ra.artistId);
    if (artist) {
      releasesByArtist[artist.name] = (releasesByArtist[artist.name] || 0) + 1;
    }
  }

  console.log("📊 Releases por artista:");
  for (const rosterArtist of artistsRoster) {
    const count = releasesByArtist[rosterArtist.name] || 0;
    console.log(`   ${rosterArtist.name}: ${count}`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("ℹ️  Para sincronizar releases de Spotify:");
  console.log("   1. Necesitas credenciales de API propias");
  console.log("   2. O puedes agregar releases manualmente desde /admin/releases/new");
  console.log("   3. Pega la URL del álbum de Spotify para importarlo");
  console.log("=".repeat(50) + "\n");
}

main().catch(console.error);
