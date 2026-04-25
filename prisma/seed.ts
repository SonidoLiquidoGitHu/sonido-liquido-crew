/**
 * Seed script for Sonido Líquido Crew
 * Fetches REAL data from Spotify API and populates the Neon database.
 * No fake data — everything comes from Spotify.
 *
 * Usage: npx tsx prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env file manually (Prisma doesn't use dotenv in seed scripts)
const envPath = resolve(process.cwd(), ".env");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match && !process.env[match[1].trim()]) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

const prisma = new PrismaClient();

// ── Spotify API helpers with rate limiting ─────────────────

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

let accessToken: string | null = null;
let tokenExpiry = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getSpotifyToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

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
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return accessToken!;
}

async function spotifyFetch(url: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const token = await getSpotifyToken();
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") || "3", 10);
      console.log(`    ⏳ Rate limited, waiting ${retryAfter}s...`);
      await sleep(retryAfter * 1000);
      continue;
    }

    if (!res.ok) {
      console.warn(`    ⚠️  Spotify API ${res.status} for ${url}`);
      return null;
    }

    return res.json();
  }
  console.warn(`    ❌ Failed after ${retries} retries: ${url}`);
  return null;
}

// ── Artist Config ──────────────────────────────────────────

interface ArtistConfig {
  spotifyId: string;
  slug: string;
  name: string;
  instagram: string | null;
  youtubeChannelId: string | null;
  genres: string[];
}

const ARTISTS: ArtistConfig[] = [
  { spotifyId: "2jJmTEMkGQfH3BxoG3MQvF", slug: "brez", name: "Brez", instagram: "https://www.instagram.com/brez_idc", youtubeChannelId: "UCxVg9-xrVGfjtRd_N32EuTA", genres: ["hip hop mexicano", "rap"] },
  { spotifyId: "4fNQqyvcM71IyF2EitEtCj", slug: "bruno-grasso", name: "Bruno Grasso", instagram: "https://www.instagram.com/brunograssosl", youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", genres: ["hip hop mexicano", "rap"] },
  { spotifyId: "3RAg8fPmZ8RnacJO8MhLP1", slug: "chas7pecados", name: "Chas7Pecados", instagram: "https://www.instagram.com/chas7pecados", youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", genres: ["hip hop mexicano", "trap"] },
  { spotifyId: "2zrv1oduhIYh29vvQZwI5r", slug: "doble-a", name: "Doble A", instagram: "https://www.instagram.com/ilikebigbuds_i_canot_lie/", youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", genres: ["hip hop mexicano", "rap"] },
  { spotifyId: "3eCEorgAoZkvnAQLdy4x38", slug: "dilema", name: "Dilema", instagram: "https://www.instagram.com/dilema_ladee", youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", genres: ["hip hop mexicano", "rap"] },
  { spotifyId: "5urer15JPbCELf17LVia7w", slug: "doctor-destino", name: "Doctor Destino", instagram: "https://www.instagram.com/estoesdoctordestino", youtubeChannelId: "UCGXC-OtIZ7PHOHBKZTE4mIw", genres: ["hip hop mexicano", "rap", "conscious hip hop"] },
  { spotifyId: "5TMoczTLclVyzzDY5qf3Yb", slug: "fancy-freak", name: "Fancy Freak", instagram: "https://www.instagram.com/fancyfreakcorp", youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", genres: ["hip hop mexicano", "trap"] },
  { spotifyId: "6AN9ek9RwrLbSp9rT2lcDG", slug: "hassyel", name: "Hassyel", instagram: "https://www.instagram.com/hassyel_s.l.c/", youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", genres: ["hip hop mexicano", "rap"] },
  { spotifyId: "0QdRhOmiqAcV1dPCoiSIQJ", slug: "kev-cabrone", name: "Kev Cabrone", instagram: "https://www.instagram.com/kev.cabrone", youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", genres: ["hip hop mexicano", "rap"] },
  { spotifyId: "16YScXC67nAnFDcA2LGdY0", slug: "latin-geisha", name: "Latin Geisha", instagram: "https://www.instagram.com/latingeishamx", youtubeChannelId: "UCZvZ8tbIZKt9IzO42Y8_gtw", genres: ["hip hop mexicano", "trap", "reggaeton"] },
  { spotifyId: "5HrBwfVDf0HXzGDrJ6Znqc", slug: "pepe-levine", name: "Pepe Levine", instagram: "https://www.instagram.com/pepelevineonline", youtubeChannelId: "UCXLJPF4RRLT4aoVJkXG80bg", genres: ["hip hop mexicano", "rap", "boom bap"] },
  { spotifyId: "4T4Z7jvUcMV16VsslRRuC5", slug: "q-master", name: "Q Master", instagram: "https://www.instagram.com/q.masterw", youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", genres: ["hip hop mexicano", "rap"] },
  { spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ", slug: "reickuno", name: "Reickuno", instagram: "https://www.instagram.com/reickuno/", youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", genres: ["hip hop mexicano", "rap"] },
  { spotifyId: "2Apt0MjZGqXAd1pl4LNQrR", slug: "santa-ana", name: "Santa Ana", instagram: "https://www.instagram.com/x_santa_ana", youtubeChannelId: "UCy6tHVzGmZ_ehIBWcdrTuRA", genres: ["hip hop mexicano", "rap"] },
  { spotifyId: "4WQmw3fIx9F7iPKL5v8SCN", slug: "zaque", name: "Zaque", instagram: "https://www.instagram.com/zaqueslc", youtubeChannelId: "UCXLJPF4RRLT4aoVJkXG80bg", genres: ["hip hop mexicano", "rap", "boom bap"] },
];

// ── Main seed function ─────────────────────────────────────

async function main() {
  console.log("🔥 Sonido Líquido Crew — Seeding REAL data from Spotify\n");
  console.log("═══════════════════════════════════════════════════\n");

  // Step 1: Fetch artists one by one with rate limiting
  console.log("📡 Step 1: Fetching artists from Spotify (1 req/2sec)...\n");

  const spotifyArtists: Record<string, any> = {};

  for (const config of ARTISTS) {
    console.log(`  Fetching: ${config.name}...`);
    const data = await spotifyFetch(
      `https://api.spotify.com/v1/artists/${config.spotifyId}`
    );

    if (data?.id) {
      spotifyArtists[data.id] = data;
      const img = data.images?.[0]?.url ? "YES" : "NO";
      const fol = data.followers?.total ?? 0;
      console.log(`    ✅ ${data.name} — ${fol.toLocaleString()} followers, image: ${img}`);
    } else {
      console.log(`    ❌ Failed`);
    }

    // Rate limit: 2 seconds between requests
    await sleep(2000);
  }

  console.log(`\n  ✅ Fetched ${Object.keys(spotifyArtists).length}/${ARTISTS.length} artists from Spotify`);

  // Step 2: Upsert artists into database
  console.log("\n💾 Step 2: Upserting artists into database...\n");

  const artistMap: Record<string, string> = {}; // spotifyId -> db id

  for (const config of ARTISTS) {
    const sp = spotifyArtists[config.spotifyId];
    if (!sp) {
      console.log(`  ⚠️  No Spotify data for ${config.name}, skipping`);
      continue;
    }

    const image = sp.images?.[0]?.url || null;
    const followers = sp.followers?.total ?? 0;
    const realName = sp.name || config.name;

    const artist = await prisma.artist.upsert({
      where: { slug: config.slug },
      update: {
        spotifyId: config.spotifyId,
        name: realName,
        image: image,
        followers: followers,
        instagram: config.instagram,
        youtubeChannelId: config.youtubeChannelId,
      },
      create: {
        spotifyId: config.spotifyId,
        name: realName,
        slug: config.slug,
        image: image,
        followers: followers,
        instagram: config.instagram,
        youtubeChannelId: config.youtubeChannelId,
        isFeatured: ["zaque", "brez", "doctor-destino", "latin-geisha"].includes(config.slug),
      },
    });

    artistMap[config.spotifyId] = artist.id;
    console.log(`  ✅ ${realName} → DB id: ${artist.id}`);
  }

  // Step 3: Fetch and upsert releases (with rate limiting)
  console.log("\n💿 Step 3: Fetching releases from Spotify (1 req/sec)...\n");

  let totalReleases = 0;

  for (const config of ARTISTS) {
    const dbArtistId = artistMap[config.spotifyId];
    if (!dbArtistId) continue;

    console.log(`  Fetching releases for ${config.name}...`);

    // Rate limit: wait 1.5s between artists
    await sleep(1500);

    const albumsData = await spotifyFetch(
      `https://api.spotify.com/v1/artists/${config.spotifyId}/albums?include_groups=album,single,compilation&limit=50&market=MX`
    );

    if (!albumsData?.items) {
      console.log(`    ⚠️  No releases found`);
      continue;
    }

    let artistReleaseCount = 0;

    for (const item of albumsData.items) {
      if (!item.id || !item.name) continue;

      const slug = item.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        + `-${item.id.slice(-6)}`;

      const releaseType = item.album_type === "single" ? "single"
        : item.album_type === "compilation" ? "compilation"
        : "album";

      const coverUrl = item.images?.[0]?.url || null;
      const spotifyUrl = item.external_urls?.spotify || null;
      const releaseDate = item.release_date ? new Date(item.release_date) : new Date();

      try {
        await prisma.release.upsert({
          where: { slug },
          update: {
            title: item.name,
            type: releaseType,
            artistId: dbArtistId,
            coverUrl: coverUrl,
            releaseDate: releaseDate,
            spotifyUrl: spotifyUrl,
          },
          create: {
            title: item.name,
            slug: slug,
            type: releaseType,
            artistId: dbArtistId,
            coverUrl: coverUrl,
            releaseDate: releaseDate,
            isUpcoming: false,
            spotifyUrl: spotifyUrl,
          },
        });
        artistReleaseCount++;
        totalReleases++;
      } catch (err) {
        console.log(`    ⚠️  Skipped: ${item.name} (${err instanceof Error ? err.message : 'unknown'})`);
      }
    }

    console.log(`    ✅ ${artistReleaseCount} releases for ${config.name}`);
  }

  // Step 4: Summary
  console.log("\n═══════════════════════════════════════════════════");
  console.log("🎉 SEED COMPLETE — All data is REAL from Spotify\n");

  const dbArtists = await prisma.artist.count();
  const dbReleases = await prisma.release.count();

  console.log(`  Artists in DB:    ${dbArtists}`);
  console.log(`  Releases in DB:   ${dbReleases}`);
  console.log(`  Featured artists: ${await prisma.artist.count({ where: { isFeatured: true } })}`);
  console.log("\n═══════════════════════════════════════════════════\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
