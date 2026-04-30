// Sync Releases via Spotify Search API
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq, and } from "drizzle-orm";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

// ===========================================
// CONFIG
// ===========================================

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const DATABASE_URL = process.env.DATABASE_URL!;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

// ===========================================
// SCHEMA
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

async function searchAlbumsForArtist(
  token: string,
  artistName: string,
  spotifyArtistId: string | null,
  offset = 0
): Promise<SpotifyAlbum[]> {
  // Use search endpoint which is not rate limited
  const query = encodeURIComponent(artistName);
  const url = `https://api.spotify.com/v1/search?q=${query}&type=album&limit=20&offset=${offset}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
    console.log(`   ⏳ Rate limited, waiting ${retryAfter}s...`);
    await new Promise(r => setTimeout(r, (retryAfter + 1) * 1000));
    return searchAlbumsForArtist(token, artistName, spotifyArtistId, offset);
  }

  if (!response.ok) {
    const error = await response.text();
    console.log(`   API Error: ${error}`);
    throw new Error(`Spotify API error: ${response.status}`);
  }

  const data = await response.json();

  // Filter albums that have this artist
  const matchingAlbums = (data.albums?.items || []).filter((album: SpotifyAlbum) => {
    return album.artists.some(a => {
      if (spotifyArtistId && a.id === spotifyArtistId) return true;
      return a.name.toLowerCase() === artistName.toLowerCase();
    });
  });

  return matchingAlbums;
}

// ===========================================
// MAIN
// ===========================================

async function main() {
  console.log("\n🎵 SONIDO LÍQUIDO CREW - RELEASES SYNC (via Search)\n");
  console.log("=".repeat(55));

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

  // Get all artists
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

    const spotifyArtistId = profile?.externalId || null;

    try {
      // Search for albums
      const albums = await searchAlbumsForArtist(token, artist.name, spotifyArtistId);
      console.log(`   Found ${albums.length} matching releases`);

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
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("\n" + "=".repeat(55));
  console.log("📊 SYNC COMPLETE\n");
  console.log(`   Total Created: ${totalCreated}`);
  console.log(`   Total Skipped: ${totalSkipped}`);
  console.log("=".repeat(55) + "\n");

  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
