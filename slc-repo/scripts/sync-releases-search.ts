import { db, isDatabaseConfigured } from "../src/db/client";
import { artists, artistExternalProfiles, releases, releaseArtists } from "../src/db/schema";
import { generateUUID, slugify } from "../src/lib/utils";
import { eq, and } from "drizzle-orm";

// ===========================================
// SYNC RELEASES USING SPOTIFY SEARCH
// ===========================================

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  total_tracks: number;
  images: { url: string; height: number; width: number }[];
  external_urls: { spotify: string };
  artists: { id: string; name: string }[];
}

interface SpotifySearchResponse {
  albums?: {
    items: SpotifyAlbum[];
    total: number;
  };
}

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data: SpotifyToken = await response.json();
  return data.access_token;
}

async function searchAlbums(token: string, artistName: string, offset = 0): Promise<SpotifySearchResponse> {
  // Search for albums by artist name - using simple query format
  const query = encodeURIComponent(artistName);
  const url = `https://api.spotify.com/v1/search?q=${query}&type=album&limit=20&offset=${offset}`;

  console.log(`   Search query: "${artistName}"`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
    console.log(`   Rate limited on search, waiting ${retryAfter}s...`);
    await new Promise(resolve => setTimeout(resolve, (retryAfter + 1) * 1000));
    return searchAlbums(token, artistName, offset);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.log(`   Error: ${errorBody.substring(0, 200)}`);
    throw new Error(`Search failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function syncReleases() {
  console.log("\n🎵 SONIDO LÍQUIDO CREW - SPOTIFY RELEASES SYNC (via Search)\n");
  console.log("=".repeat(55));

  if (!isDatabaseConfigured()) {
    console.error("❌ Database not configured");
    process.exit(1);
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.error("❌ Spotify API credentials not configured");
    process.exit(1);
  }

  console.log("✅ Database connected");
  console.log("✅ Spotify API configured\n");

  // Get access token
  const token = await getAccessToken();
  console.log("✅ Access token obtained\n");

  // Get all artists
  const allArtists = await db.select().from(artists);
  console.log(`📋 Found ${allArtists.length} artists\n`);

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const artist of allArtists) {
    console.log(`\n🎤 Processing: ${artist.name}`);
    console.log("-".repeat(40));

    // Get Spotify profile to get artist ID
    const [spotifyProfile] = await db
      .select()
      .from(artistExternalProfiles)
      .where(
        and(
          eq(artistExternalProfiles.artistId, artist.id),
          eq(artistExternalProfiles.platform, "spotify")
        )
      )
      .limit(1);

    const spotifyArtistId = spotifyProfile?.externalId;

    try {
      // Search for albums by artist name
      const searchResult = await searchAlbums(token, artist.name);

      if (!searchResult.albums || searchResult.albums.items.length === 0) {
        console.log(`   ⚠️  No albums found`);
        continue;
      }

      // Filter albums by the exact artist
      const artistAlbums = searchResult.albums.items.filter(album => {
        return album.artists.some(a =>
          (spotifyArtistId && a.id === spotifyArtistId) ||
          a.name.toLowerCase() === artist.name.toLowerCase()
        );
      });

      console.log(`   Found ${artistAlbums.length} albums matching artist`);

      let created = 0;
      let skipped = 0;

      for (const album of artistAlbums) {
        // Check if release already exists
        const [existingRelease] = await db
          .select()
          .from(releases)
          .where(eq(releases.spotifyId, album.id))
          .limit(1);

        if (existingRelease) {
          skipped++;
          continue;
        }

        // Determine release type
        let releaseType: "album" | "ep" | "single" | "compilation" = "single";
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
          description: `${releaseType === "album" ? "Álbum" : releaseType === "ep" ? "EP" : "Single"} de ${artist.name}`,
          isUpcoming: releaseDate > new Date(),
          isFeatured: false,
        });

        // Create artist-release relationship
        await db.insert(releaseArtists).values({
          id: generateUUID(),
          releaseId,
          artistId: artist.id,
          isPrimary: true,
        });

        created++;
        console.log(`   ✅ Created: ${album.name} (${releaseType})`);
      }

      totalCreated += created;
      totalSkipped += skipped;
      console.log(`   📊 ${created} created, ${skipped} skipped`);

    } catch (error) {
      console.error(`   ❌ Error: ${(error as Error).message}`);
      totalErrors++;
    }

    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("\n" + "=".repeat(55));
  console.log("📊 SYNC COMPLETE\n");
  console.log(`   Total Created: ${totalCreated}`);
  console.log(`   Total Skipped: ${totalSkipped}`);
  console.log(`   Total Errors:  ${totalErrors}`);
  console.log("\n" + "=".repeat(55) + "\n");

  process.exit(0);
}

syncReleases().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
