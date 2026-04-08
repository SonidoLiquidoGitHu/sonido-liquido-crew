/**
 * Sync all Spotify releases for Sonido Líquido Crew artists
 * Run with: bunx tsx scripts/sync-spotify-releases.ts
 */

// Load environment variables
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local" });

import { db, isDatabaseConfigured } from "../src/db/client";
import { releases, releaseArtists, artists, artistExternalProfiles } from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";
import { artistsRoster } from "../src/lib/data/artists-roster";

// Spotify credentials
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6";

interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  images: { url: string; width: number; height: number }[];
  external_urls: { spotify: string };
  artists: { id: string; name: string }[];
}

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
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

// Get Spotify access token
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
    throw new Error(`Spotify auth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Fetch albums for an artist
async function fetchArtistAlbums(artistId: string, token: string): Promise<SpotifyAlbum[]> {
  const albums: SpotifyAlbum[] = [];
  let nextUrl: string | null = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&limit=50`;

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "30", 10);
      console.log(`  ⏳ Rate limited, waiting ${retryAfter}s...`);
      await new Promise(resolve => setTimeout(resolve, (retryAfter + 1) * 1000));
      continue;
    }

    if (!response.ok) {
      console.error(`  ❌ Error fetching albums: ${response.status}`);
      break;
    }

    const data = await response.json();
    albums.push(...data.items);
    nextUrl = data.next;

    if (nextUrl) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return albums;
}

// Map album type
function mapAlbumType(type: string): "album" | "ep" | "single" | "compilation" {
  switch (type.toLowerCase()) {
    case "album": return "album";
    case "compilation": return "compilation";
    default: return "single";
  }
}

// Parse release date
function parseReleaseDate(dateStr: string, precision: string): Date {
  if (precision === "day") return new Date(dateStr);
  if (precision === "month") return new Date(`${dateStr}-01`);
  return new Date(`${dateStr}-01-01`);
}

async function main() {
  console.log("\n🎵 SINCRONIZANDO RELEASES DE SPOTIFY");
  console.log("=".repeat(50));

  if (!isDatabaseConfigured()) {
    console.error("❌ Database not configured");
    process.exit(1);
  }

  // Get token
  console.log("\n🔑 Obteniendo token de Spotify...");
  const token = await getSpotifyToken();
  console.log("✅ Token obtenido\n");

  // Get all artists from DB
  const dbArtists = await db.select().from(artists);
  console.log(`📋 ${dbArtists.length} artistas en la base de datos\n`);

  // Stats
  let totalFound = 0;
  let totalCreated = 0;
  let totalSkipped = 0;

  // Process each roster artist
  for (const rosterArtist of artistsRoster) {
    console.log(`\n📀 ${rosterArtist.name}`);

    // Find artist in DB
    const dbArtist = dbArtists.find(a =>
      a.name.toLowerCase() === rosterArtist.name.toLowerCase()
    );

    if (!dbArtist) {
      console.log(`   ⚠️ No encontrado en BD, saltando`);
      continue;
    }

    // Fetch albums from Spotify
    const albums = await fetchArtistAlbums(rosterArtist.spotifyId, token);
    console.log(`   📦 ${albums.length} releases encontrados en Spotify`);
    totalFound += albums.length;

    for (const album of albums) {
      // Check if already exists
      const existing = await db.select().from(releases)
        .where(eq(releases.spotifyId, album.id))
        .limit(1);

      if (existing.length > 0) {
        totalSkipped++;
        continue;
      }

      // Create release
      const releaseId = generateUUID();
      const slug = `${slugify(album.name)}-${slugify(rosterArtist.name)}-${releaseId.slice(0, 8)}`;

      try {
        await db.insert(releases).values({
          id: releaseId,
          title: album.name,
          slug,
          releaseType: mapAlbumType(album.album_type),
          releaseDate: parseReleaseDate(album.release_date, album.release_date_precision),
          coverImageUrl: album.images[0]?.url || null,
          spotifyId: album.id,
          spotifyUrl: album.external_urls.spotify,
          description: `${album.album_type} de ${rosterArtist.name}`,
          isFeatured: album.album_type === "album",
        });

        // Link to artist
        await db.insert(releaseArtists).values({
          id: generateUUID(),
          releaseId,
          artistId: dbArtist.id,
          isPrimary: true,
        });

        totalCreated++;
        console.log(`   ✅ ${album.name} (${album.album_type})`);
      } catch (e) {
        // Skip duplicates
      }
    }

    // Wait between artists
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 RESUMEN:");
  console.log(`   Total encontrados: ${totalFound}`);
  console.log(`   Nuevos creados: ${totalCreated}`);
  console.log(`   Ya existentes: ${totalSkipped}`);
  console.log("=".repeat(50) + "\n");
}

main().catch(console.error);
