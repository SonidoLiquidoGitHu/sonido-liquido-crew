/**
 * Seed the Neon database with REAL data from Spotify API.
 *
 * NO FAKE DATA — every artist name, image URL, release title, and cover art
 * comes directly from the Spotify Web API using the artist Spotify IDs in
 * artist-config.ts.
 *
 * Usage:
 *   npx tsx scripts/seed-real-data.ts
 *
 * Requires .env with:
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 *   DATABASE_URL (Neon PostgreSQL)
 */

import { PrismaClient } from "@prisma/client";

// ── Artist config (mirrors src/lib/artist-config.ts) ──────────────
interface ArtistConfig {
  spotifyId: string;
  instagram: string | null;
  youtubeChannelId: string | null;
  youtubeHandle: string | null;
  genres: string[];
}

const ARTIST_CONFIGS: ArtistConfig[] = [
  {
    spotifyId: "2jJmTEMkGQfH3BxoG3MQvF",
    instagram: "https://www.instagram.com/brez_idc?igsh=MTk0azBwaDl0N2pweg==",
    youtubeChannelId: "UCxVg9-xrVGfjtRd_N32EuTA",
    youtubeHandle: "@brezhiphopmexicoslc25",
    genres: ["hip hop mexicano", "rap"],
  },
  {
    spotifyId: "4fNQqyvcM71IyF2EitEtCj",
    instagram: "https://www.instagram.com/brunograssosl?igsh=MWd3YWNxcGVkemJmMQ==",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA",
    youtubeHandle: "@sonidoliquidocrew",
    genres: ["hip hop mexicano", "rap"],
  },
  {
    spotifyId: "3RAg8fPmZ8RnacJO8MhLP1",
    instagram: "https://www.instagram.com/chas7pecados?igsh=MTdhbTM3bDlsYnBkNg==",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA",
    youtubeHandle: "@sonidoliquidocrew",
    genres: ["hip hop mexicano", "trap"],
  },
  {
    spotifyId: "2zrv1oduhIYh29vvQZwI5r",
    instagram: "https://www.instagram.com/ilikebigbuds_i_canot_lie/",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA",
    youtubeHandle: "@sonidoliquidocrew",
    genres: ["hip hop mexicano", "rap"],
  },
  {
    spotifyId: "3eCEorgAoZkvnAQLdy4x38",
    instagram: "https://www.instagram.com/dilema_ladee?igsh=amw5ZGluNjI3ZW1k&utm_source=qr",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA",
    youtubeHandle: "@sonidoliquidocrew",
    genres: ["hip hop mexicano", "rap"],
  },
  {
    spotifyId: "5urer15JPbCELf17LVia7w",
    instagram: "https://www.instagram.com/estoesdoctordestino?igsh=MTVubWk1ZG0xMjBkNA==",
    youtubeChannelId: "UCGXC-OtIZ7PHOHBKZTE4mIw",
    youtubeHandle: "@doctordestinohiphop",
    genres: ["hip hop mexicano", "rap", "conscious hip hop"],
  },
  {
    spotifyId: "5TMoczTLclVyzzDY5qf3Yb",
    instagram: "https://www.instagram.com/fancyfreakcorp?igsh=MXNhenBpZWJvbDczdg==",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA",
    youtubeHandle: "@sonidoliquidocrew",
    genres: ["hip hop mexicano", "trap"],
  },
  {
    spotifyId: "6AN9ek9RwrLbSp9rT2lcDG",
    instagram: "https://www.instagram.com/hassyel_s.l.c/",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA",
    youtubeHandle: "@sonidoliquidocrew",
    genres: ["hip hop mexicano", "rap"],
  },
  {
    spotifyId: "0QdRhOmiqAcV1dPCoiSIQJ",
    instagram: "https://www.instagram.com/kev.cabrone?igsh=bTdqMG5ndjV6bWx1",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA",
    youtubeHandle: "@sonidoliquidocrew",
    genres: ["hip hop mexicano", "rap"],
  },
  {
    spotifyId: "16YScXC67nAnFDcA2LGdY0",
    instagram: "https://www.instagram.com/latingeishamx?igsh=aXU3ODdjc3lhOG9t",
    youtubeChannelId: "UCZvZ8tbIZKt9IzO42Y8_gtw",
    youtubeHandle: "@LatinGeisha",
    genres: ["hip hop mexicano", "trap", "reggaeton"],
  },
  {
    spotifyId: "5HrBwfVDf0HXzGDrJ6Znqc",
    instagram: "https://www.instagram.com/pepelevineonline?igsh=eGw5dzNxa2F4aDll",
    youtubeChannelId: "UCXLJPF4RRLT4aoVJkXG80bg",
    youtubeHandle: "@ZaqueSonidoLiquido",
    genres: ["hip hop mexicano", "rap", "boom bap"],
  },
  {
    spotifyId: "4T4Z7jvUcMV16VsslRRuC5",
    instagram: "https://www.instagram.com/q.masterw?igsh=MXg5YWt0cXk0cjJ5aA==",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA",
    youtubeHandle: "@sonidoliquidocrew",
    genres: ["hip hop mexicano", "rap"],
  },
  {
    spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ",
    instagram: "https://www.instagram.com/reickuno/",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA",
    youtubeHandle: "@sonidoliquidocrew",
    genres: ["hip hop mexicano", "rap"],
  },
  {
    spotifyId: "2Apt0MjZGqXAd1pl4LNQrR",
    instagram: "https://www.instagram.com/x_santa_ana?igsh=dGFyMWoxcm5sNWg4",
    youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA",
    youtubeHandle: "@sonidoliquidocrew",
    genres: ["hip hop mexicano", "rap"],
  },
  {
    spotifyId: "4WQmw3fIx9F7iPKL5v8SCN",
    instagram: "https://www.instagram.com/zaqueslc?igsh=emFhcDRmaXQ2eDUx",
    youtubeChannelId: "UCXLJPF4RRLT4aoVJkXG80bg",
    youtubeHandle: "@ZaqueSonidoLiquido",
    genres: ["hip hop mexicano", "rap", "boom bap"],
  },
];

// ── Spotify API helpers ────────────────────────────────────────────

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

let accessToken: string;

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: SPOTIFY_CLIENT_ID,
      client_secret: SPOTIFY_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Spotify auth failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  return data.access_token;
}

interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: SpotifyImage[];
  followers?: { total: number };
  popularity?: number;
  genres?: string[];
  external_urls: { spotify: string };
}

interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  images: SpotifyImage[];
  external_urls: { spotify: string };
  total_tracks: number;
  artists: { id: string; name: string }[];
}

async function fetchArtist(id: string): Promise<SpotifyArtist> {
  const res = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Failed to fetch artist ${id} (${res.status}): ${detail}`);
  }
  return res.json();
}

async function spotifyFetchWithRetry(url: string, maxRetries = 5): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 429) {
      // Rate limited — use Retry-After header or exponential backoff
      const retryAfter = res.headers.get("Retry-After");
      const waitMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000 + 500
        : Math.min(30000, 2000 * Math.pow(2, attempt));
      console.log(`     Rate limited, waiting ${(waitMs / 1000).toFixed(1)}s (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (res.status === 401) {
      // Token expired — refresh it
      console.log("     Token expired, refreshing...");
      accessToken = await getAccessToken();
      continue;
    }

    return res;
  }
  throw new Error(`Max retries exceeded for ${url}`);
}

async function fetchArtistAlbums(id: string): Promise<SpotifyAlbum[]> {
  const allAlbums: SpotifyAlbum[] = [];
  let offset = 0;
  const limit = 50;

  // Fetch up to 3 pages (150 releases max per artist)
  for (let page = 0; page < 3; page++) {
    const res = await spotifyFetchWithRetry(
      `https://api.spotify.com/v1/artists/${id}/albums?include_groups=album,single,ep,compilation&limit=${limit}&offset=${offset}&market=MX`
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error(`  Warning: Failed to fetch albums for ${id} page ${page}: ${detail}`);
      break;
    }

    const data = await res.json();
    if (data.items && data.items.length > 0) {
      allAlbums.push(...data.items);
    }

    if (!data.next || data.items.length < limit) break;
    offset += limit;

    // Small delay between pages
    await new Promise((r) => setTimeout(r, 1000));
  }

  return allAlbums;
}

// ── Slug helper ────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Main seed function ─────────────────────────────────────────────

async function main() {
  console.log("=== SLC Real Data Seed ===\n");
  console.log("Fetching REAL data from Spotify API...\n");

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env");
  }

  // Get Spotify access token
  console.log("1. Getting Spotify access token...");
  accessToken = await getAccessToken();
  console.log("   Token obtained!\n");

  const prisma = new PrismaClient();

  try {
    // ── Seed Artists ──
    console.log("2. Fetching artist data from Spotify...");
    const artistDbIds: Map<string, string> = new Map(); // spotifyId -> prisma id

    for (let i = 0; i < ARTIST_CONFIGS.length; i++) {
      const config = ARTIST_CONFIGS[i];
      console.log(`   [${i + 1}/${ARTIST_CONFIGS.length}] Fetching ${config.spotifyId}...`);

      try {
        const spotifyArtist = await fetchArtist(config.spotifyId);
        const bestImage = spotifyArtist.images?.sort((a, b) => b.height - a.height)[0]?.url ?? null;

        // Use curated genres from config (Spotify removed genres from API in 2025)
        const genres = config.genres.join(", ");

        // Create slug from name
        const slug = slugify(spotifyArtist.name);

        console.log(`     → ${spotifyArtist.name} (${spotifyArtist.followers?.total ?? "N/A"} followers, popularity: ${spotifyArtist.popularity ?? "N/A"})`);

        const artist = await prisma.artist.upsert({
          where: { spotifyId: config.spotifyId },
          update: {
            name: spotifyArtist.name,
            image: bestImage,
            spotifyUrl: spotifyArtist.external_urls?.spotify ?? `https://open.spotify.com/artist/${config.spotifyId}`,
            genres,
            followers: spotifyArtist.followers?.total ?? 0,
            popularity: spotifyArtist.popularity ?? 0,
            instagram: config.instagram,
            youtubeChannelId: config.youtubeChannelId,
            youtubeHandle: config.youtubeHandle,
            order: i,
          },
          create: {
            spotifyId: config.spotifyId,
            name: spotifyArtist.name,
            slug,
            image: bestImage,
            spotifyUrl: spotifyArtist.external_urls?.spotify ?? `https://open.spotify.com/artist/${config.spotifyId}`,
            genres,
            followers: spotifyArtist.followers?.total ?? 0,
            popularity: spotifyArtist.popularity ?? 0,
            instagram: config.instagram,
            youtubeChannelId: config.youtubeChannelId,
            youtubeHandle: config.youtubeHandle,
            order: i,
          },
        });

        artistDbIds.set(config.spotifyId, artist.id);

        // Rate limit: delay between artist fetches
        await new Promise((r) => setTimeout(r, 800));
      } catch (err) {
        console.error(`     ✗ Failed to fetch artist ${config.spotifyId}:`, err instanceof Error ? err.message : err);
      }
    }

    console.log(`\n   Seeded ${artistDbIds.size} artists.\n`);

    // ── Seed Releases (Albums / Singles / EPs) ──
    console.log("3. Fetching releases from Spotify...");

    let totalReleasesSeeded = 0;

    for (const config of ARTIST_CONFIGS) {
      const artistId = artistDbIds.get(config.spotifyId);
      if (!artistId) {
        console.log(`   Skipping releases for ${config.spotifyId} (artist not found in DB)`);
        continue;
      }

      try {
        const albums = await fetchArtistAlbums(config.spotifyId);
        console.log(`   → Found ${albums.length} releases for ${config.spotifyId}`);

        // Update release count on the artist
        await prisma.artist.update({
          where: { id: artistId },
          data: { releaseCount: albums.length },
        });

        for (const album of albums) {
          const bestCover = album.images?.sort((a, b) => b.height - a.height)[0]?.url ?? null;

          // Map Spotify album_type to our types
          let releaseType = "single";
          if (album.album_type === "album") releaseType = "album";
          else if (album.album_type === "compilation") releaseType = "compilation";
          // Spotify sometimes returns "single" for EPs too, but we keep "ep" if the name suggests it
          if (album.name.toLowerCase().includes(" ep") && album.album_type === "single") {
            releaseType = "ep";
          }

          const slug = slugify(album.name);
          const releaseDate = album.release_date ? new Date(album.release_date) : null;

          // Determine if upcoming (future release date)
          const isUpcoming = releaseDate ? releaseDate > new Date() : false;

          await prisma.release.upsert({
            where: {
              slug: `${slug}-${album.id.slice(-6)}`, // make unique with Spotify ID suffix
            },
            update: {
              title: album.name,
              type: releaseType,
              coverUrl: bestCover,
              releaseDate,
              spotifyUrl: album.external_urls?.spotify ?? null,
              isUpcoming,
            },
            create: {
              title: album.name,
              slug: `${slug}-${album.id.slice(-6)}`,
              type: releaseType,
              artistId,
              coverUrl: bestCover,
              releaseDate,
              spotifyUrl: album.external_urls?.spotify ?? null,
              isUpcoming,
            },
          });

          totalReleasesSeeded++;
        }

        // Rate limit: longer delay between artists for album fetches
        await new Promise((r) => setTimeout(r, 3000));
      } catch (err) {
        console.error(`   ✗ Failed to fetch releases for ${config.spotifyId}:`, err instanceof Error ? err.message : err);
      }
    }

    console.log(`\n   Seeded ${totalReleasesSeeded} releases.\n`);

    // ── Summary ──
    const artistCount = await prisma.artist.count();
    const releaseCount = await prisma.release.count();

    console.log("=== Seed Complete ===");
    console.log(`  Artists in DB:  ${artistCount}`);
    console.log(`  Releases in DB: ${releaseCount}`);
    console.log("\nAll data is REAL — fetched directly from Spotify Web API.");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
