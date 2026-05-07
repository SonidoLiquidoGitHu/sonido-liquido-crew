/**
 * Sync releases for ONE artist (to test rate limits)
 * Run with: bunx tsx scripts/sync-one-artist.ts [artistName]
 */

import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local" });

import { db, isDatabaseConfigured } from "../src/db/client";
import { releases, releaseArtists, artists } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { artistsRoster } from "../src/lib/data/artists-roster";

// Spotify credentials
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w\-]+/g, "").replace(/\-\-+/g, "-");
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
    const text = await response.text();
    throw new Error(`Spotify auth failed: ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  release_date_precision: string;
  images: { url: string }[];
  external_urls: { spotify: string };
}

async function fetchArtistAlbums(artistId: string, token: string): Promise<SpotifyAlbum[]> {
  const albums: SpotifyAlbum[] = [];
  let nextUrl: string | null = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&limit=50`;

  while (nextUrl) {
    console.log(`   📡 Fetching: ${nextUrl.split('?')[0]}...`);

    const response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After") || "unknown";
      console.log(`   ⚠️ RATE LIMITED! Retry-After: ${retryAfter} seconds`);
      throw new Error(`Rate limited. Wait ${retryAfter} seconds.`);
    }

    if (!response.ok) {
      const text = await response.text();
      console.log(`   ❌ Error: ${response.status} - ${text}`);
      break;
    }

    const data = await response.json();
    albums.push(...data.items);
    nextUrl = data.next;

    if (nextUrl) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return albums;
}

function mapAlbumType(type: string): "album" | "ep" | "single" | "compilation" {
  switch (type.toLowerCase()) {
    case "album": return "album";
    case "compilation": return "compilation";
    default: return "single";
  }
}

function parseReleaseDate(dateStr: string, precision: string): Date {
  if (precision === "day") return new Date(dateStr);
  if (precision === "month") return new Date(`${dateStr}-01`);
  return new Date(`${dateStr}-01-01`);
}

async function main() {
  const artistName = process.argv[2] || "Zaque";

  console.log(`\n🎵 SINCRONIZANDO RELEASES DE: ${artistName}`);
  console.log("=".repeat(50));

  if (!isDatabaseConfigured()) {
    console.error("❌ Database not configured");
    process.exit(1);
  }

  // Find artist in roster
  const rosterArtist = artistsRoster.find(a =>
    a.name.toLowerCase() === artistName.toLowerCase()
  );

  if (!rosterArtist) {
    console.error(`❌ Artista "${artistName}" no encontrado en el roster`);
    console.log("\nArtistas disponibles:");
    artistsRoster.forEach(a => console.log(`   - ${a.name}`));
    process.exit(1);
  }

  console.log(`\n📀 ${rosterArtist.name}`);
  console.log(`   Spotify ID: ${rosterArtist.spotifyId}`);

  // Get token
  console.log("\n🔑 Obteniendo token de Spotify...");
  let token: string;
  try {
    token = await getSpotifyToken();
    console.log("✅ Token obtenido");
  } catch (e) {
    console.error("❌ Error obteniendo token:", e);
    process.exit(1);
  }

  // Find artist in DB
  const dbArtists = await db.select().from(artists);
  const dbArtist = dbArtists.find(a =>
    a.name.toLowerCase() === rosterArtist.name.toLowerCase()
  );

  if (!dbArtist) {
    console.error(`❌ Artista no encontrado en la base de datos`);
    process.exit(1);
  }

  // Fetch albums
  console.log("\n📦 Buscando releases en Spotify...");
  let albums: SpotifyAlbum[];
  try {
    albums = await fetchArtistAlbums(rosterArtist.spotifyId, token);
    console.log(`   ✅ ${albums.length} releases encontrados`);
  } catch (e) {
    console.error("❌ Error:", e);
    process.exit(1);
  }

  // Stats
  let created = 0;
  let skipped = 0;

  for (const album of albums) {
    // Check if exists
    const existing = await db.select().from(releases)
      .where(eq(releases.spotifyId, album.id))
      .limit(1);

    if (existing.length > 0) {
      skipped++;
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

      await db.insert(releaseArtists).values({
        id: generateUUID(),
        releaseId,
        artistId: dbArtist.id,
        isPrimary: true,
      });

      created++;
      console.log(`   ✅ ${album.name} (${album.album_type})`);
    } catch (e) {
      // Skip duplicates
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 RESUMEN:");
  console.log(`   Total en Spotify: ${albums.length}`);
  console.log(`   Nuevos creados: ${created}`);
  console.log(`   Ya existentes: ${skipped}`);
  console.log("=".repeat(50) + "\n");
}

main().catch(console.error);
