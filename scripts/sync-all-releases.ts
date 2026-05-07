// Standalone Spotify Releases Sync Script
// This script doesn't import from the main app to avoid conflicts

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq, and } from "drizzle-orm";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ===========================================
// SPOTIFY CONFIG
// ===========================================

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const DATABASE_URL = process.env.DATABASE_URL!;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

// ===========================================
// SCHEMA (inline to avoid import issues)
// ===========================================

const artists = sqliteTable("artists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

const artistExternalProfiles = sqliteTable("artist_external_profiles", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").notNull(),
  platform: text("platform").notNull(),
  externalId: text("external_id"),
});

const releases = sqliteTable("releases", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  releaseType: text("release_type"),
  releaseDate: integer("release_date", { mode: "timestamp" }),
  coverImageUrl: text("cover_image_url"),
  spotifyId: text("spotify_id").unique(),
  spotifyUrl: text("spotify_url"),
  description: text("description"),
  isUpcoming: integer("is_upcoming", { mode: "boolean" }),
  isFeatured: integer("is_featured", { mode: "boolean" }),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

const releaseArtists = sqliteTable("release_artists", {
  id: text("id").primaryKey(),
  releaseId: text("release_id").notNull(),
  artistId: text("artist_id").notNull(),
  isPrimary: integer("is_primary", { mode: "boolean" }),
});

// ===========================================
// HELPERS
// ===========================================

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ===========================================
// SPOTIFY API
// ===========================================

interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  total_tracks: number;
  images: { url: string }[];
  external_urls: { spotify: string };
  artists: { id: string; name: string }[];
}

interface SpotifyArtistAlbumsResponse {
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

  const data = await response.json();
  return data.access_token;
}

async function getArtistAlbums(
  token: string,
  artistId: string,
  offset = 0
): Promise<SpotifyArtistAlbumsResponse> {
  const url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&limit=50&offset=${offset}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "30", 10);
    console.log(`   ⏳ Rate limited, waiting ${retryAfter}s...`);
    await new Promise(r => setTimeout(r, (retryAfter + 1) * 1000));
    return getArtistAlbums(token, artistId, offset);
  }

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status}`);
  }

  return response.json();
}

async function getAllArtistAlbums(token: string, artistId: string): Promise<SpotifyAlbum[]> {
  const albums: SpotifyAlbum[] = [];
  let offset = 0;

  while (true) {
    const response = await getArtistAlbums(token, artistId, offset);
    albums.push(...response.items);

    if (!response.next) break;
    offset += 50;

    // Small delay between pages
    await new Promise(r => setTimeout(r, 200));
  }

  return albums;
}

// ===========================================
// MAIN SYNC FUNCTION
// ===========================================

async function main() {
  console.log("\n🎵 SONIDO LÍQUIDO CREW - SPOTIFY RELEASES SYNC\n");
  console.log("=".repeat(50));

  // Initialize database
  const client = createClient({
    url: DATABASE_URL,
    authToken: DATABASE_AUTH_TOKEN,
  });
  const db = drizzle(client);
  console.log("✅ Database connected");

  // Get Spotify token
  const token = await getSpotifyToken();
  console.log("✅ Spotify token obtained\n");

  // Get all artists with Spotify profiles
  const allArtists = await db.select().from(artists);
  console.log(`📋 Found ${allArtists.length} artists\n`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const artist of allArtists) {
    console.log(`\n🎤 ${artist.name}`);
    console.log("-".repeat(40));

    // Get Spotify profile
    const [profile] = await db
      .select()
      .from(artistExternalProfiles)
      .where(
        and(
          eq(artistExternalProfiles.artistId, artist.id),
          eq(artistExternalProfiles.platform, "spotify")
        )
      )
      .limit(1);

    if (!profile?.externalId) {
      console.log("   ⚠️ No Spotify profile");
      continue;
    }

    try {
      // Fetch albums
      const albums = await getAllArtistAlbums(token, profile.externalId);
      console.log(`   Found ${albums.length} releases on Spotify`);

      let created = 0;
      let skipped = 0;

      for (const album of albums) {
        // Check if exists
        const [existing] = await db
          .select()
          .from(releases)
          .where(eq(releases.spotifyId, album.id))
          .limit(1);

        if (existing) {
          skipped++;
          continue;
        }

        // Determine type
        let releaseType = "single";
        if (album.album_type === "album") {
          releaseType = album.total_tracks > 6 ? "album" : "ep";
        } else if (album.album_type === "compilation") {
          releaseType = "compilation";
        }

        // Create unique slug
        let baseSlug = slugify(album.name);
        let slug = baseSlug;
        let counter = 1;

        while (true) {
          const [existingSlug] = await db
            .select()
            .from(releases)
            .where(eq(releases.slug, slug))
            .limit(1);

          if (!existingSlug) break;
          slug = `${baseSlug}-${counter}`;
          counter++;
        }

        // Create release
        const releaseId = generateUUID();
        const releaseDate = new Date(album.release_date);

        await db.insert(releases).values({
          id: releaseId,
          title: album.name,
          slug,
          releaseType,
          releaseDate,
          coverImageUrl: album.images?.[0]?.url || null,
          spotifyId: album.id,
          spotifyUrl: album.external_urls?.spotify || null,
          description: `${releaseType} de ${artist.name}`,
          isUpcoming: releaseDate > new Date(),
          isFeatured: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Link to artist
        await db.insert(releaseArtists).values({
          id: generateUUID(),
          releaseId,
          artistId: artist.id,
          isPrimary: true,
        });

        created++;
        console.log(`   ✅ ${album.name} (${releaseType})`);
      }

      totalCreated += created;
      totalSkipped += skipped;
      console.log(`   📊 ${created} created, ${skipped} skipped`);

    } catch (error) {
      console.error(`   ❌ Error: ${(error as Error).message}`);
    }

    // Delay between artists
    await new Promise(r => setTimeout(r, 500));
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 SYNC COMPLETE\n");
  console.log(`   Total Created: ${totalCreated}`);
  console.log(`   Total Skipped: ${totalSkipped}`);
  console.log("=".repeat(50) + "\n");

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
