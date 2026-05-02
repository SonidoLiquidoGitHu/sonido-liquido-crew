import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { releases, releaseArtists, artists, artistExternalProfiles } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";

// ===========================================
// LIGHTWEIGHT DAILY SYNC - RECENT RELEASES ONLY
// ===========================================
// This endpoint is designed for scheduled/cron use.
// It only fetches the FIRST page (20 most recent) releases per artist
// from Spotify, making it fast enough to run within serverless function timeouts.
// The full sync (all pages) is still available via /api/admin/sync/spotify-releases

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

// Spotify credentials with fallback
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

// Fetch only the FIRST page of albums for an artist (20 most recent)
async function fetchRecentAlbums(artistId: string, token: string): Promise<SpotifyAlbum[]> {
  const url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&limit=20&offset=0`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
      console.log(`[Cron Sync] Rate limited, waiting ${retryAfter}s...`);
      await new Promise(resolve => setTimeout(resolve, (retryAfter + 1) * 1000));
      // Retry once
      const retryResponse = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!retryResponse.ok) return [];
      const retryData = await retryResponse.json();
      return retryData.items || [];
    }
    console.error(`[Cron Sync] Error fetching albums for ${artistId}: ${response.status}`);
    return [];
  }

  const data = await response.json();
  return data.items || [];
}

// Map Spotify album_type to our release type
function mapAlbumType(albumType: string): "album" | "ep" | "single" | "compilation" {
  switch (albumType.toLowerCase()) {
    case "album":
      return "album";
    case "single":
      return "single";
    case "compilation":
      return "compilation";
    default:
      return "single";
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

export async function POST(request: NextRequest) {
  // Verify this is called by our scheduled function or admin
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is set, validate it. Otherwise, allow (for easy setup)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Cron Sync] Starting lightweight recent releases sync...");

  const results = {
    success: true,
    timestamp: new Date().toISOString(),
    totalArtistsProcessed: 0,
    totalReleasesFound: 0,
    newReleasesCreated: 0,
    existingReleasesSkipped: 0,
    errors: [] as string[],
    artistBreakdown: [] as { name: string; found: number; created: number }[],
  };

  try {
    // Get Spotify token
    let token: string;
    try {
      token = await getSpotifyToken();
      console.log("[Cron Sync] Spotify token obtained");
    } catch (authError) {
      console.error("[Cron Sync] Failed to get Spotify token:", authError);
      return NextResponse.json({
        ...results,
        success: false,
        error: `Spotify auth failed: ${(authError as Error).message}`,
      }, { status: 401 });
    }

    // Get all artists from database
    const dbArtists = await db.select().from(artists);
    const spotifyProfiles = await db.select().from(artistExternalProfiles)
      .where(eq(artistExternalProfiles.platform, "spotify"));

    // Create lookup map
    const artistNameMap = new Map<string, { artist: typeof dbArtists[0]; spotifyId: string | null }>();
    for (const artist of dbArtists) {
      const spotifyProfile = spotifyProfiles.find(p => p.artistId === artist.id);
      const spotifyId = spotifyProfile?.externalId || null;
      artistNameMap.set(artist.name.toLowerCase(), { artist, spotifyId });
    }

    // Process each SLC artist
    for (const slcArtist of SLC_ARTISTS) {
      try {
        const artistData = artistNameMap.get(slcArtist.name.toLowerCase());

        if (!artistData) {
          results.errors.push(`Artist ${slcArtist.name} not found in database`);
          continue;
        }

        const dbArtist = artistData.artist;

        // Ensure Spotify external profile exists
        if (!artistData.spotifyId) {
          try {
            await db.insert(artistExternalProfiles).values({
              id: generateUUID(),
              artistId: dbArtist.id,
              platform: "spotify",
              externalId: slcArtist.spotifyId,
              externalUrl: `https://open.spotify.com/artist/${slcArtist.spotifyId}`,
              isVerified: true,
            });
          } catch {
            // Profile might already exist
          }
        }

        // Fetch ONLY the first page (20 most recent releases)
        const albums = await fetchRecentAlbums(slcArtist.spotifyId, token);
        console.log(`[Cron Sync] ${slcArtist.name}: found ${albums.length} recent releases`);

        const artistStats = { name: slcArtist.name, found: albums.length, created: 0 };
        results.totalReleasesFound += albums.length;

        for (const album of albums) {
          // Check if release already exists by Spotify ID
          const existing = await db.select().from(releases)
            .where(eq(releases.spotifyId, album.id))
            .limit(1);

          if (existing.length > 0) {
            results.existingReleasesSkipped++;
            continue;
          }

          // Create new release
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

            // Create artist-release association
            await db.insert(releaseArtists).values({
              id: generateUUID(),
              releaseId,
              artistId: dbArtist.id,
              isPrimary: true,
            });

            results.newReleasesCreated++;
            artistStats.created++;
            console.log(`[Cron Sync] Created: ${album.name}`);
          } catch (insertError) {
            const errorMsg = (insertError as Error).message;
            if (errorMsg.includes("UNIQUE") || errorMsg.includes("duplicate")) {
              results.existingReleasesSkipped++;
            } else {
              results.errors.push(`Failed to insert ${album.name}: ${errorMsg}`);
            }
          }
        }

        results.artistBreakdown.push(artistStats);
        results.totalArtistsProcessed++;

        // Small delay between artists to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (artistError) {
        const errorMsg = (artistError as Error).message;
        results.errors.push(`Error processing ${slcArtist.name}: ${errorMsg}`);
        console.error(`[Cron Sync] Error processing ${slcArtist.name}:`, errorMsg);
      }
    }

    console.log(`[Cron Sync] Complete: ${results.newReleasesCreated} new, ${results.existingReleasesSkipped} existing`);

    return NextResponse.json({
      ...results,
      success: true,
      message: `Daily sync: ${results.newReleasesCreated} new releases from ${results.totalArtistsProcessed} artists`,
    });

  } catch (error) {
    console.error("[Cron Sync] Fatal error:", error);
    return NextResponse.json({
      ...results,
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}

// GET endpoint to check cron sync status
export async function GET() {
  try {
    const totalReleases = await db.select().from(releases);
    const latestRelease = totalReleases
      .filter(r => r.releaseDate)
      .sort((a, b) => new Date(b.releaseDate!).getTime() - new Date(a.releaseDate!).getTime())[0];

    return NextResponse.json({
      success: true,
      totalReleases: totalReleases.length,
      latestRelease: latestRelease
        ? { title: latestRelease.title, releaseDate: latestRelease.releaseDate }
        : null,
      message: "Use POST to trigger a recent releases sync",
      artists: SLC_ARTISTS.map(a => a.name),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}
