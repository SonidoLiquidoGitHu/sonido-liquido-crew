import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClient } from "@libsql/client/web";

// ===========================================
// NETLIFY SCHEDULED FUNCTION - DIRECT SPOTIFY SYNC
// ===========================================
// This function runs automatically every 6 hours via Netlify's cron scheduler.
// It performs the Spotify sync directly (no HTTP call to Next.js API route)
// to avoid Netlify CDN inactivity timeouts.
// Processes artists one at a time with timeout protection.

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

// ===========================================
// SPOTIFY API HELPERS
// ===========================================

async function getSpotifyToken(): Promise<string> {
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  total_tracks: number;
  images: { url: string; width: number; height: number }[];
  external_urls: { spotify: string };
  artists: { id: string; name: string }[];
}

async function fetchArtistAlbums(artistId: string, token: string): Promise<SpotifyAlbum[]> {
  const albums: SpotifyAlbum[] = [];
  const seenIds = new Set<string>();
  let nextUrl: string | null = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&limit=20&market=MX`;

  let retries = 0;
  while (nextUrl && retries < 3) {
    try {
      const response: Response = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000),
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
        console.log(`[Sync] Rate limited, waiting ${retryAfter}s...`);
        await new Promise(r => setTimeout(r, Math.min((retryAfter + 1) * 1000, 10_000)));
        retries++;
        continue;
      }

      if (!response.ok) {
        console.error(`[Sync] Spotify API error ${response.status} for ${artistId}`);
        break;
      }

      const data = await response.json();
      for (const album of data.items || []) {
        if (!seenIds.has(album.id)) {
          seenIds.add(album.id);
          albums.push(album);
        }
      }
      nextUrl = data.next;
      retries = 0; // Reset on success

      if (nextUrl) await new Promise(r => setTimeout(r, 100));
    } catch (err) {
      console.error(`[Sync] Fetch error for ${artistId}:`, (err as Error).message);
      retries++;
      if (retries >= 3) break;
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return albums;
}

function mapAlbumType(albumType: string): string {
  switch (albumType.toLowerCase()) {
    case "album": return "album";
    case "compilation": return "compilation";
    default: return "single";
  }
}

function parseReleaseDate(dateStr: string): Date {
  const parts = dateStr.split("-");
  if (parts.length === 1) return new Date(`${dateStr}-01-01`);
  if (parts.length === 2) return new Date(`${dateStr}-01`);
  return new Date(dateStr);
}

function getBestCoverImage(images: { url: string; width: number; height: number }[]): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0));
  return sorted[0]?.url || null;
}

function generateId(): string {
  return crypto.randomUUID();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 80);
}

// ===========================================
// MAIN HANDLER
// ===========================================

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const startTime = Date.now();
  console.log("[Scheduled Sync] Starting direct Spotify releases sync...");

  // Initialize database client
  const dbUrl = (process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "").trim();
  const dbToken = (process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || "").trim();

  if (!dbUrl) {
    return { statusCode: 500, body: JSON.stringify({ error: "Database URL not configured" }) };
  }

  const client = createClient({
    url: dbUrl,
    authToken: dbToken || undefined,
  });

  const results = {
    artistsProcessed: 0,
    totalNewReleases: 0,
    totalNewLinks: 0,
    totalSkipped: 0,
    errors: [] as string[],
  };

  try {
    // 1. Get Spotify token
    console.log("[Sync] Getting Spotify token...");
    const token = await getSpotifyToken();
    console.log("[Sync] Token obtained");

    // 2. Load artist data from DB
    const dbArtistsResult = await client.execute("SELECT id, name FROM artists");
    const profilesResult = await client.execute("SELECT artist_id, external_id FROM artist_external_profiles WHERE platform = 'spotify'");

    // Build lookup maps
    const artistByName = new Map<string, { id: string; name: string; spotifyId: string | null }>();
    const artistBySpotifyId = new Map<string, { id: string; name: string }>();

    for (const row of dbArtistsResult.rows) {
      const name = row.name as string;
      const id = row.id as string;
      const profile = profilesResult.rows.find(p => p.artist_id === id);
      const spotifyId = (profile?.external_id as string) || null;
      artistByName.set(name.toLowerCase(), { id, name, spotifyId });
      if (spotifyId) artistBySpotifyId.set(spotifyId, { id, name });
    }

    // Also add SLC artists to the Spotify ID map
    for (const slc of SLC_ARTISTS) {
      if (!artistBySpotifyId.has(slc.spotifyId)) {
        const dbEntry = artistByName.get(slc.name.toLowerCase());
        if (dbEntry) artistBySpotifyId.set(slc.spotifyId, { id: dbEntry.id, name: dbEntry.name });
      }
    }

    // 3. Process each artist
    const processedIds = new Set<string>();

    for (let i = 0; i < SLC_ARTISTS.length; i++) {
      const slcArtist = SLC_ARTISTS[i];
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Stop if approaching timeout (leave 15s buffer)
      if (Date.now() - startTime > 45000) {
        console.log(`[Sync] Approaching timeout at ${elapsed}s, stopping at artist ${i}`);
        break;
      }

      try {
        const artistData = artistByName.get(slcArtist.name.toLowerCase());
        if (!artistData) {
          results.errors.push(`${slcArtist.name}: not in database`);
          continue;
        }

        console.log(`[Sync] Processing ${slcArtist.name} (${elapsed}s)...`);

        // Ensure Spotify profile exists
        if (!artistData.spotifyId) {
          try {
            await client.execute({
              sql: "INSERT OR IGNORE INTO artist_external_profiles (id, artist_id, platform, external_id, external_url, is_verified) VALUES (?, ?, 'spotify', ?, ?, 1)",
              args: [generateId(), artistData.id, slcArtist.spotifyId, `https://open.spotify.com/artist/${slcArtist.spotifyId}`],
            });
          } catch { /* might exist */ }
        }

        // Fetch albums from Spotify
        const albums = await fetchArtistAlbums(slcArtist.spotifyId, token);
        console.log(`[Sync] ${slcArtist.name}: found ${albums.length} releases`);

        for (const album of albums) {
          // Skip already-processed in this run (multi-artist collab)
          if (processedIds.has(album.id)) {
            // Check if current artist needs a link
            const existing = await client.execute({
              sql: "SELECT id FROM releases WHERE spotify_id = ?",
              args: [album.id],
            });
            if (existing.rows.length > 0) {
              const releaseId = existing.rows[0].id as string;
              const link = await client.execute({
                sql: "SELECT id FROM release_artists WHERE release_id = ? AND artist_id = ?",
                args: [releaseId, artistData.id],
              });
              if (link.rows.length === 0) {
                try {
                  await client.execute({
                    sql: "INSERT INTO release_artists (id, release_id, artist_id, is_primary) VALUES (?, ?, ?, 0)",
                    args: [generateId(), releaseId, artistData.id],
                  });
                  results.totalNewLinks++;
                } catch { /* dup */ }
              }
            }
            continue;
          }
          processedIds.add(album.id);

          // Check if release exists in DB
          const existing = await client.execute({
            sql: "SELECT id FROM releases WHERE spotify_id = ?",
            args: [album.id],
          });

          if (existing.rows.length > 0) {
            results.totalSkipped++;
            // Check for missing artist link
            const releaseId = existing.rows[0].id as string;
            const link = await client.execute({
              sql: "SELECT id FROM release_artists WHERE release_id = ? AND artist_id = ?",
              args: [releaseId, artistData.id],
            });
            if (link.rows.length === 0) {
              try {
                await client.execute({
                  sql: "INSERT INTO release_artists (id, release_id, artist_id, is_primary) VALUES (?, ?, ?, 0)",
                  args: [generateId(), releaseId, artistData.id],
                });
                results.totalNewLinks++;
              } catch { /* dup */ }
            }
            continue;
          }

          // Create new release
          const releaseId = generateId();
          const slug = `${slugify(`${album.name}-${slcArtist.name}`)}-${generateId().substring(0, 8)}`;
          const releaseDate = parseReleaseDate(album.release_date);
          const coverUrl = getBestCoverImage(album.images);
          const allArtistNames = album.artists.map(a => a.name).join(", ");
          const releaseType = mapAlbumType(album.album_type);
          const isUpcoming = releaseDate > new Date() ? 1 : 0;
          const isFeatured = album.album_type === "album" ? 1 : 0;
          const dateTimestamp = Math.floor(releaseDate.getTime() / 1000);
          const nowTimestamp = Math.floor(Date.now() / 1000);

          try {
            await client.execute({
              sql: `INSERT INTO releases (id, title, slug, release_type, release_date, cover_image_url, spotify_id, spotify_url, description, is_upcoming, is_featured, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                releaseId, album.name, slug, releaseType, dateTimestamp,
                coverUrl, album.id, album.external_urls?.spotify || null,
                `${album.album_type.charAt(0).toUpperCase() + album.album_type.slice(1)} by ${allArtistNames}`,
                isUpcoming, isFeatured, nowTimestamp, nowTimestamp,
              ],
            });

            // Link ALL roster artists on this album
            let hasAnyLink = false;
            for (const albumArtist of album.artists) {
              const rosterArtist = artistBySpotifyId.get(albumArtist.id);
              if (rosterArtist) {
                try {
                  const isPrimary = albumArtist.id === album.artists[0]?.id ? 1 : 0;
                  await client.execute({
                    sql: "INSERT INTO release_artists (id, release_id, artist_id, is_primary) VALUES (?, ?, ?, ?)",
                    args: [generateId(), releaseId, rosterArtist.id, isPrimary],
                  });
                  hasAnyLink = true;
                } catch { /* dup */ }
              }
            }

            // Fallback: link the current artist as primary if no roster artists found
            if (!hasAnyLink) {
              try {
                await client.execute({
                  sql: "INSERT INTO release_artists (id, release_id, artist_id, is_primary) VALUES (?, ?, ?, 1)",
                  args: [generateId(), releaseId, artistData.id],
                });
              } catch { /* dup */ }
            }

            results.totalNewReleases++;
            console.log(`[Sync] Created: ${album.name}`);
          } catch (insertErr) {
            const msg = (insertErr as Error).message;
            if (!msg.includes("UNIQUE") && !msg.includes("duplicate")) {
              results.errors.push(`Insert ${album.name}: ${msg}`);
            }
          }
        }

        results.artistsProcessed++;

        // Small delay between artists
        await new Promise(r => setTimeout(r, 300));

      } catch (artistErr) {
        results.errors.push(`${slcArtist.name}: ${(artistErr as Error).message}`);
        console.error(`[Sync] Error with ${slcArtist.name}:`, (artistErr as Error).message);
      }
    }

    // 4. Auto-convert past-due upcoming releases
    try {
      const nowTs = Math.floor(Date.now() / 1000);

      // Fix stale isUpcoming flags on releases
      const fixResult = await client.execute({
        sql: "UPDATE releases SET is_upcoming = 0, updated_at = ? WHERE is_upcoming = 1 AND release_date < ?",
        args: [nowTs, nowTs],
      });
      if (fixResult.rowsAffected > 0) {
        console.log(`[Sync] Fixed ${fixResult.rowsAffected} stale isUpcoming flags`);
      }
    } catch (err) {
      console.error("[Sync] Auto-convert error:", (err as Error).message);
    }

    // 5. Invalidate ISR cache for home page (revalidate releases section)
    try {
      const siteUrl = process.env.URL || process.env.DEPLOY_URL || "https://sonidoliquido.com";
      await fetch(`${siteUrl}/api/revalidate?path=/&secret=${process.env.REVALIDATION_SECRET || ""}`, {
        method: "POST",
        signal: AbortSignal.timeout(5_000),
      }).catch(() => {}); // Best effort
    } catch { /* non-critical */ }

  } catch (error) {
    console.error("[Sync] Fatal error:", (error as Error).message);
    results.errors.push(`Fatal: ${(error as Error).message}`);
  } finally {
    try { client.close(); } catch { /* ignore */ }
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`[Scheduled Sync] Completed in ${totalElapsed}s: ${results.artistsProcessed}/${SLC_ARTISTS.length} artists, ${results.totalNewReleases} new releases, ${results.totalNewLinks} new links, ${results.totalSkipped} skipped, ${results.errors.length} errors`);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Scheduled sync completed",
      elapsed: `${totalElapsed}s`,
      ...results,
    }),
  };
};

export { handler };
