import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { releases, releaseArtists, artists, artistExternalProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";

// All Sonido Líquido Crew artists with their Spotify IDs
const SLC_ARTISTS = [
  { name: "Brez", spotifyId: "2jJmTEMkGQfH3BxoG3MQvF" },
  { name: "Bruno Grasso", spotifyId: "4fNQqyvcM71IyF2EitEtCj" },
  { name: "Chas 7P", spotifyId: "3RAg8fPmZ8RnacJO8MhLP1" },
  { name: "Codak", spotifyId: "2zrv1oduhIYh29vvQZwI5r" },
  { name: "Dilema", spotifyId: "3eCEorgAoZkvnAQLdy4x38" },
  { name: "Doctor Destino", spotifyId: "5urer15JPbCELf17LVia7w" },
  { name: "Fancy Freak", spotifyId: "5TMoczTLclVyzzDY5qf3Yb" },
  { name: "Hassyel", spotifyId: "6AN9ek9RwrLbSp9rT2lcDG" },
  { name: "Kev Cabrone", spotifyId: "0QdRhOmiqAcV1dPCoiSIQJ" },
  { name: "Latin Geisha", spotifyId: "16YScXC67nAnFDcA2LGdY0" },
  { name: "Pepe Levine", spotifyId: "5HrBwfVDf0HXzGDrJ6Znqc" },
  { name: "Q Master Weed", spotifyId: "4T4Z7jvUcMV16VsslRRuC5" },
  { name: "Reick One", spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ" },
  { name: "X Santa-Ana", spotifyId: "2Apt0MjZGqXAd1pl4LNQrR" },
  { name: "Zaque", spotifyId: "4WQmw3fIx9F7iPKL5v8SCN" },
];

// Spotify credentials
const SPOTIFY_CLIENT_ID = (process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568").trim();
const SPOTIFY_CLIENT_SECRET = (process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6").trim();

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

interface SpotifyAlbumsResponse {
  items: SpotifyAlbum[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
}

// Get Spotify access token with caching
let cachedToken: { token: string; expires: number } | null = null;

async function getSpotifyToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error("[Spotify Auth] Error:", response.status, errorBody);
      throw new Error(`Error de autenticación con Spotify: ${response.status}`);
    }

    const data = await response.json();

    // Cache token for 50 minutes (expires in 60)
    cachedToken = {
      token: data.access_token,
      expires: Date.now() + (50 * 60 * 1000),
    };

    return data.access_token;
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === "AbortError") {
      throw new Error("Timeout al conectar con Spotify");
    }
    throw error;
  }
}

// Fetch albums for an artist (single page, fast)
async function fetchArtistAlbums(artistId: string, token: string): Promise<SpotifyAlbum[]> {
  if (!artistId) return [];

  const albums: SpotifyAlbum[] = [];
  let nextUrl: string | null = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&limit=50`;

  // Only fetch first 2 pages (100 albums max per artist) to be fast
  let pageCount = 0;
  const maxPages = 2;

  while (nextUrl && pageCount < maxPages) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - check if wait time is reasonable
          const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);

          // If rate limit is more than 60 seconds, stop and report
          if (retryAfter > 60) {
            console.error(`[Spotify] Rate limited for ${retryAfter}s - too long, skipping artist`);
            break;
          }

          console.log(`[Spotify] Rate limited, waiting ${retryAfter}s...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        break;
      }

      const data: SpotifyAlbumsResponse = await response.json();
      albums.push(...data.items);
      nextUrl = data.next;
      pageCount++;

      // Minimal delay to avoid rate limits
      if (nextUrl) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error(`[Spotify] Error fetching albums for ${artistId}:`, error);
      break;
    }
  }

  return albums;
}

// Map Spotify album_type to our release type
function mapAlbumType(albumType: string): "album" | "ep" | "single" | "compilation" {
  switch (albumType.toLowerCase()) {
    case "album": return "album";
    case "single": return "single";
    case "compilation": return "compilation";
    default: return "single";
  }
}

// Parse release date from Spotify format
function parseReleaseDate(dateStr: string, precision: string): Date {
  if (precision === "day") return new Date(dateStr);
  if (precision === "month") return new Date(`${dateStr}-01`);
  return new Date(`${dateStr}-01-01`);
}

// Get the best cover image
function getBestCoverImage(images: { url: string; width: number; height: number }[]): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0));
  return sorted[0]?.url || null;
}

export async function POST() {
  console.log("\n🎵 SPOTIFY RELEASES SYNC STARTED\n");

  // Check database configuration
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      success: false,
      error: "Base de datos no configurada",
    }, { status: 500 });
  }

  const results = {
    success: true,
    totalArtistsProcessed: 0,
    totalReleasesFound: 0,
    newReleasesCreated: 0,
    existingReleasesSkipped: 0,
    errors: [] as string[],
    artistBreakdown: [] as { name: string; found: number; created: number }[],
  };

  try {
    // Get Spotify access token first
    console.log("🔑 Getting Spotify token...");
    const token = await getSpotifyToken();
    console.log("✅ Token obtained");

    // Test if we're rate limited by trying the albums endpoint
    const testArtist = SLC_ARTISTS[0];
    const testResponse = await fetch(
      `https://api.spotify.com/v1/artists/${testArtist.spotifyId}/albums?limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (testResponse.status === 429) {
      const retryAfter = parseInt(testResponse.headers.get("Retry-After") || "0", 10);
      console.error(`[Spotify] API está limitada. Retry-After: ${retryAfter}s`);

      // Convert seconds to human readable
      const hours = Math.floor(retryAfter / 3600);
      const minutes = Math.floor((retryAfter % 3600) / 60);

      return NextResponse.json({
        success: false,
        error: `La API de Spotify está limitada. Debes esperar ${hours > 0 ? `${hours} horas y ` : ""}${minutes} minutos, o configurar tus propias credenciales de Spotify.`,
        rateLimited: true,
        retryAfterSeconds: retryAfter,
        hint: "Para resolver esto: 1) Crea una app en https://developer.spotify.com/dashboard 2) Copia el Client ID y Client Secret 3) Agrégalos en Netlify como SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET",
      }, { status: 429 });
    }

    console.log("✅ Spotify API disponible");

    // Get all artists from database
    const dbArtists = await db.select().from(artists);
    const artistNameMap = new Map(dbArtists.map(a => [a.name.toLowerCase(), a]));

    // Get all Spotify profiles
    const spotifyProfiles = await db.select().from(artistExternalProfiles)
      .where(eq(artistExternalProfiles.platform, "spotify"));
    const artistSpotifyMap = new Map(spotifyProfiles.map(p => [p.artistId, p.externalId]));

    // Get existing Spotify IDs to avoid duplicates
    const existingReleases = await db.select({ spotifyId: releases.spotifyId }).from(releases);
    const existingSpotifyIds = new Set(existingReleases.map(r => r.spotifyId).filter(Boolean));

    console.log(`📊 Found ${existingSpotifyIds.size} existing releases in database`);

    // Process artists in parallel batches of 3
    const batchSize = 3;
    for (let i = 0; i < SLC_ARTISTS.length; i += batchSize) {
      const batch = SLC_ARTISTS.slice(i, i + batchSize);

      const batchPromises = batch.map(async (slcArtist) => {
        const artistResult = { name: slcArtist.name, found: 0, created: 0 };

        try {
          // Find artist in database
          const dbArtist = artistNameMap.get(slcArtist.name.toLowerCase());
          if (!dbArtist) {
            results.errors.push(`Artist ${slcArtist.name} not found in database`);
            return artistResult;
          }

          // Create Spotify profile if missing
          if (!artistSpotifyMap.has(dbArtist.id)) {
            try {
              await db.insert(artistExternalProfiles).values({
                id: generateUUID(),
                artistId: dbArtist.id,
                platform: "spotify",
                externalId: slcArtist.spotifyId,
                externalUrl: `https://open.spotify.com/artist/${slcArtist.spotifyId}`,
                isVerified: true,
              });
            } catch (e) {
              // Profile might already exist
            }
          }

          // Fetch albums from Spotify
          const albums = await fetchArtistAlbums(slcArtist.spotifyId, token);
          artistResult.found = albums.length;
          results.totalReleasesFound += albums.length;

          // Process new releases only
          for (const album of albums) {
            if (existingSpotifyIds.has(album.id)) {
              results.existingReleasesSkipped++;
              continue;
            }

            // Add to set to avoid duplicates within this sync
            existingSpotifyIds.add(album.id);

            const releaseId = generateUUID();
            const baseSlug = slugify(`${album.name}-${slcArtist.name}`);
            const releaseSlug = `${baseSlug}-${generateUUID().substring(0, 8)}`;
            const releaseDate = parseReleaseDate(album.release_date, album.release_date_precision);
            const coverUrl = getBestCoverImage(album.images);

            try {
              await db.insert(releases).values({
                id: releaseId,
                title: album.name,
                slug: releaseSlug,
                releaseType: mapAlbumType(album.album_type),
                releaseDate,
                coverImageUrl: coverUrl,
                spotifyId: album.id,
                spotifyUrl: album.external_urls.spotify,
                description: `${album.album_type.charAt(0).toUpperCase() + album.album_type.slice(1)} by ${slcArtist.name}`,
                isUpcoming: releaseDate > new Date(),
                isFeatured: album.album_type === "album",
              });

              await db.insert(releaseArtists).values({
                id: generateUUID(),
                releaseId,
                artistId: dbArtist.id,
                isPrimary: true,
              });

              results.newReleasesCreated++;
              artistResult.created++;
              console.log(`   ✅ Created: ${album.name}`);
            } catch (insertError) {
              const errorMsg = (insertError as Error).message;
              if (!errorMsg.includes("UNIQUE") && !errorMsg.includes("duplicate")) {
                results.errors.push(`Failed to insert ${album.name}: ${errorMsg}`);
              } else {
                results.existingReleasesSkipped++;
              }
            }
          }

          results.totalArtistsProcessed++;
          console.log(`📀 ${slcArtist.name}: ${artistResult.found} found, ${artistResult.created} created`);
        } catch (artistError) {
          results.errors.push(`Error processing ${slcArtist.name}: ${(artistError as Error).message}`);
        }

        return artistResult;
      });

      const batchResults = await Promise.all(batchPromises);
      results.artistBreakdown.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < SLC_ARTISTS.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log("\n📊 SYNC COMPLETE");
    console.log(`   Artists: ${results.totalArtistsProcessed}`);
    console.log(`   Found: ${results.totalReleasesFound}`);
    console.log(`   Created: ${results.newReleasesCreated}`);
    console.log(`   Skipped: ${results.existingReleasesSkipped}`);

    return NextResponse.json({
      ...results,
      success: true,
      message: `Sincronizados ${results.newReleasesCreated} nuevos lanzamientos de ${results.totalArtistsProcessed} artistas`,
    });

  } catch (error) {
    console.error("❌ Sync failed:", error);
    return NextResponse.json({
      ...results,
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST to sync all Spotify releases",
    artists: SLC_ARTISTS.map(a => a.name),
    totalArtists: SLC_ARTISTS.length,
  });
}
