import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { releases, releaseArtists, artists, artistExternalProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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

// Spotify credentials - Default to provided credentials, can be overridden via environment variables
// Trim to remove any accidental whitespace from environment variables
const SPOTIFY_CLIENT_ID = (process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568").trim();
const SPOTIFY_CLIENT_SECRET = (process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6").trim();

// Check if user has configured their own credentials via environment variables
// If true, we have custom credentials; if false, using default credentials
function hasCustomSpotifyCredentials(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

// Check if we have any credentials (default or custom)
function hasSpotifyCredentials(): boolean {
  return Boolean(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET);
}

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

// Get Spotify access token
async function getSpotifyToken(): Promise<string> {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error("Credenciales de Spotify no configuradas");
  }

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
    const errorBody = await response.text().catch(() => "");
    console.error("[Spotify Auth] Error response:", response.status, errorBody);
    if (response.status === 400) {
      throw new Error("Credenciales de Spotify inválidas. Verifica SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET.");
    }
    throw new Error(`Error de autenticación con Spotify: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Fetch all albums for an artist with pagination
async function fetchArtistAlbums(artistId: string, token: string): Promise<SpotifyAlbum[]> {
  // Validate artistId
  if (!artistId || typeof artistId !== "string" || artistId.trim().length === 0) {
    console.error(`[Spotify] Invalid artist ID: ${artistId}`);
    return [];
  }

  const cleanId = artistId.trim();
  const albums: SpotifyAlbum[] = [];
  const seenIds = new Set<string>();
  let retryCount = 0;
  const maxRetries = 3;

  // Start with base URL - don't use limit parameter as some Spotify app credentials don't support it
  // The API defaults to returning 20 items per page
  let nextUrl: string | null = `https://api.spotify.com/v1/artists/${cleanId}/albums?include_groups=album,single,compilation`;

  while (nextUrl) {
    try {
      const response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - wait and retry
          const retryAfter = parseInt(response.headers.get("Retry-After") || "30", 10);
          console.error(`[Spotify] Rate limited (429)! Retry-After: ${retryAfter}s`);

          // Always try to wait and retry (up to max retries)
          console.log(`[Spotify] Rate limited, waiting ${retryAfter}s...`);
          await new Promise(resolve => setTimeout(resolve, (retryAfter + 1) * 1000));
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error(`[Spotify] Max retries exceeded for ${cleanId}`);
            // Instead of throwing, just return what we have
            break;
          }
          continue;
        }

        if (response.status === 400) {
          const errorBody = await response.text().catch(() => "");
          console.error(`[Spotify] Bad request for artist ${cleanId}: ${errorBody}`);
          break;
        }

        console.error(`[Spotify] Error fetching albums for ${cleanId}: ${response.status}`);
        break;
      }

      const data: SpotifyAlbumsResponse = await response.json();

      for (const album of data.items) {
        if (!seenIds.has(album.id)) {
          seenIds.add(album.id);
          albums.push(album);
        }
      }

      // Use the next URL from the response for pagination (Spotify handles offset internally)
      nextUrl = data.next;
      retryCount = 0; // Reset retry count on success

      // Small delay to avoid rate limiting
      if (nextUrl) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (fetchError) {
      console.error(`[Spotify] Network error fetching albums for ${cleanId}:`, fetchError);
      retryCount++;
      if (retryCount >= maxRetries) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return albums;
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
  if (precision === "day") {
    return new Date(dateStr);
  } else if (precision === "month") {
    return new Date(`${dateStr}-01`);
  } else {
    return new Date(`${dateStr}-01-01`);
  }
}

// Get the best cover image (prefer larger sizes)
function getBestCoverImage(images: { url: string; width: number; height: number }[]): string | null {
  if (!images || images.length === 0) return null;

  // Sort by width descending and get the largest
  const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0));
  return sorted[0]?.url || null;
}

export async function POST() {
  console.log("\n🎵 STARTING SPOTIFY RELEASES SYNC\n");
  console.log("=".repeat(50));

  const results = {
    success: true,
    totalArtistsProcessed: 0,
    totalReleasesFound: 0,
    newReleasesCreated: 0,
    existingReleasesSkipped: 0,
    errors: [] as string[],
    artistBreakdown: [] as { name: string; found: number; created: number }[],
  };

  // Note: Default Spotify credentials are now included in the code
  // Users can override with their own via environment variables for higher rate limits

  // Check if using custom credentials
  const usingCustomCredentials = hasCustomSpotifyCredentials();
  if (!usingCustomCredentials) {
    console.log("⚠️ Warning: Using fallback credentials (rate limits apply)");
  } else {
    console.log("✓ Using custom Spotify credentials");
  }

  try {
    // Get Spotify access token
    console.log("🔑 Getting Spotify access token...");
    console.log("   Client ID:", SPOTIFY_CLIENT_ID.substring(0, 8) + "...");
    let token: string;
    try {
      token = await getSpotifyToken();
    } catch (authError) {
      console.error("❌ Failed to get Spotify token:", authError);
      return NextResponse.json({
        success: false,
        error: `Error de autenticación con Spotify: ${(authError as Error).message}. Verifica tus credenciales de API.`,
      }, { status: 401 });
    }
    console.log("✅ Token obtained\n");

    // Get all artists from database with their Spotify profiles
    const dbArtists = await db.select().from(artists);

    // Get all Spotify external profiles
    const spotifyProfiles = await db.select().from(artistExternalProfiles)
      .where(eq(artistExternalProfiles.platform, "spotify"));

    // Create lookup maps:
    // 1. By DB artist name (lowercase) → DB artist + Spotify ID
    // 2. By Spotify artist ID → DB artist (for multi-artist matching)
    const artistNameMap = new Map<string, { artist: typeof dbArtists[0]; spotifyId: string | null }>();
    const artistBySpotifyIdMap = new Map<string, typeof dbArtists[0]>();

    for (const artist of dbArtists) {
      // Find Spotify profile for this artist
      const spotifyProfile = spotifyProfiles.find(p => p.artistId === artist.id);
      const spotifyId = spotifyProfile?.externalId || null;
      artistNameMap.set(artist.name.toLowerCase(), { artist, spotifyId });
      if (spotifyId) {
        artistBySpotifyIdMap.set(spotifyId, artist);
      }
    }

    // Also add all SLC_ARTISTS to the Spotify ID map
    for (const slcArtist of SLC_ARTISTS) {
      if (!artistBySpotifyIdMap.has(slcArtist.spotifyId)) {
        const dbEntry = artistNameMap.get(slcArtist.name.toLowerCase());
        if (dbEntry) {
          artistBySpotifyIdMap.set(slcArtist.spotifyId, dbEntry.artist);
        }
      }
    }

    // Track processed release IDs to avoid duplicate processing
    const processedReleaseIds = new Set<string>();
    let newArtistLinksCreated = 0;

    // Process each SLC artist
    for (const slcArtist of SLC_ARTISTS) {
      console.log(`\n📀 Processing ${slcArtist.name}...`);

      try {
        // Find artist in database by name
        const artistData = artistNameMap.get(slcArtist.name.toLowerCase());

        if (!artistData) {
          console.log(`   ⚠️ Artist ${slcArtist.name} not found in database, skipping`);
          results.errors.push(`Artist ${slcArtist.name} not found in database`);
          continue;
        }

        const dbArtist = artistData.artist;

        // Use the Spotify ID from SLC_ARTISTS array (we have the correct IDs)
        const spotifyId = slcArtist.spotifyId;

        // If the artist doesn't have a Spotify profile in DB, create one
        if (!artistData.spotifyId && spotifyId) {
          try {
            await db.insert(artistExternalProfiles).values({
              id: generateUUID(),
              artistId: dbArtist.id,
              platform: "spotify",
              externalId: spotifyId,
              externalUrl: `https://open.spotify.com/artist/${spotifyId}`,
              isVerified: true,
            });
            console.log(`   📎 Created Spotify profile for ${slcArtist.name}`);
          } catch (e) {
            // Profile might already exist, ignore error
          }
        }

        // Fetch albums from Spotify
        const albums = await fetchArtistAlbums(spotifyId, token);
        console.log(`   Found ${albums.length} releases`);

        const artistStats = { name: slcArtist.name, found: albums.length, created: 0 };

        for (const album of albums) {
          results.totalReleasesFound++;

          // Skip if already processed in this sync run (same release under different artists)
          if (processedReleaseIds.has(album.id)) {
            // Still check if current artist needs a link to the existing release
            const existingRelease = await db.select().from(releases)
              .where(eq(releases.spotifyId, album.id))
              .limit(1);
            if (existingRelease.length > 0) {
              const existingLink = await db.select().from(releaseArtists)
                .where(and(
                  eq(releaseArtists.releaseId, existingRelease[0].id),
                  eq(releaseArtists.artistId, dbArtist.id)
                ))
                .limit(1);
              if (existingLink.length === 0) {
                try {
                  await db.insert(releaseArtists).values({
                    id: generateUUID(),
                    releaseId: existingRelease[0].id,
                    artistId: dbArtist.id,
                    isPrimary: false,
                  });
                  newArtistLinksCreated++;
                  console.log(`   🔗 Linked existing: ${album.name} → ${slcArtist.name}`);
                } catch { /* duplicate */ }
              }
            }
            continue;
          }
          processedReleaseIds.add(album.id);

          // Check if release already exists in DB
          const existing = await db.select().from(releases)
            .where(eq(releases.spotifyId, album.id))
            .limit(1);

          if (existing.length > 0) {
            results.existingReleasesSkipped++;

            // IMPORTANT: Check if current artist has a link to this release
            // This fixes multi-artist collaborations (e.g. Trap Juicy by Dilema, Zaque, X Santa-Ana)
            const existingLink = await db.select().from(releaseArtists)
              .where(and(
                eq(releaseArtists.releaseId, existing[0].id),
                eq(releaseArtists.artistId, dbArtist.id)
              ))
              .limit(1);

            if (existingLink.length === 0) {
              try {
                await db.insert(releaseArtists).values({
                  id: generateUUID(),
                  releaseId: existing[0].id,
                  artistId: dbArtist.id,
                  isPrimary: false,
                });
                newArtistLinksCreated++;
                console.log(`   🔗 Linked existing: ${album.name} → ${slcArtist.name}`);
              } catch { /* duplicate */ }
            }
            continue;
          }

          // Create new release
          const releaseId = generateUUID();
          const baseSlug = slugify(`${album.name}-${slcArtist.name}`);
          // Add a random suffix to make the slug unique
          const releaseSlug = `${baseSlug}-${generateUUID().substring(0, 8)}`;
          const releaseDate = parseReleaseDate(album.release_date, album.release_date_precision);
          const coverUrl = getBestCoverImage(album.images);
          const allArtistNames = album.artists.map(a => a.name).join(", ");

          try {
            // Insert release
            await db.insert(releases).values({
              id: releaseId,
              title: album.name,
              slug: releaseSlug,
              releaseType: mapAlbumType(album.album_type),
              releaseDate,
              coverImageUrl: coverUrl,
              spotifyId: album.id,
              spotifyUrl: album.external_urls.spotify,
              description: `${album.album_type.charAt(0).toUpperCase() + album.album_type.slice(1)} by ${allArtistNames}`,
              isUpcoming: releaseDate > new Date(),
              isFeatured: album.album_type === "album",
            });

            // Create artist-release associations for ALL roster artists on this album
            const isPrimary = (spotifyArtistId: string) => spotifyArtistId === album.artists[0]?.id;

            for (const spotifyArtist of album.artists) {
              const rosterArtist = artistBySpotifyIdMap.get(spotifyArtist.id);
              if (rosterArtist) {
                try {
                  await db.insert(releaseArtists).values({
                    id: generateUUID(),
                    releaseId,
                    artistId: rosterArtist.id,
                    isPrimary: isPrimary(spotifyArtist.id),
                  });
                  console.log(`   🔗 Linked: ${album.name} → ${rosterArtist.name} (${isPrimary(spotifyArtist.id) ? "primary" : "featured"})`);
                } catch { /* duplicate */ }
              }
            }

            // If no roster artists were found in the album's artist list,
            // at least link the current SLC artist as primary
            const hasAnyLink = album.artists.some(a => artistBySpotifyIdMap.has(a.id));
            if (!hasAnyLink) {
              await db.insert(releaseArtists).values({
                id: generateUUID(),
                releaseId,
                artistId: dbArtist.id,
                isPrimary: true,
              });
            }

            results.newReleasesCreated++;
            artistStats.created++;
            console.log(`   ✅ Created: ${album.name} (by ${allArtistNames})`);
          } catch (insertError) {
            // Handle duplicate slug error
            const errorMsg = (insertError as Error).message;
            if (errorMsg.includes("UNIQUE") || errorMsg.includes("duplicate")) {
              results.existingReleasesSkipped++;
            } else {
              results.errors.push(`Failed to insert ${album.name}: ${errorMsg}`);
              console.error(`   ❌ Error inserting ${album.name}:`, errorMsg);
            }
          }
        }

        results.artistBreakdown.push(artistStats);
        results.totalArtistsProcessed++;

        // Small delay between artists to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (artistError) {
        const errorMsg = (artistError as Error).message;
        console.error(`   ❌ Error processing ${slcArtist.name}:`, errorMsg);
        results.errors.push(`Error processing ${slcArtist.name}: ${errorMsg}`);
        // Continue with other artists even if one fails
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 SYNC COMPLETE");
    console.log(`   Artists processed: ${results.totalArtistsProcessed}`);
    console.log(`   Total releases found: ${results.totalReleasesFound}`);
    console.log(`   New releases created: ${results.newReleasesCreated}`);
    console.log(`   Existing releases skipped: ${results.existingReleasesSkipped}`);
    console.log(`   Errors: ${results.errors.length}`);
    console.log("=".repeat(50) + "\n");

    return NextResponse.json({
      ...results,
      success: true,
      message: `Synced ${results.newReleasesCreated} new releases from ${results.totalArtistsProcessed} artists`,
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
