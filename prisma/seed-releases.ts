/**
 * Release-only seed script — fetches REAL releases from Spotify API.
 * Run after the main seed script has populated artists.
 *
 * Usage: npx tsx prisma/seed-releases.ts
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";

// Force the correct DATABASE_URL (system env overrides .env)
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_ukaxCK3os1LG@ep-dawn-tree-an5f4b05-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// Load .env file for other variables
const envPath = resolve(process.cwd(), ".env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
} catch {}

const prisma = new PrismaClient();

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

async function spotifyFetch(url: string, retries = 5): Promise<any> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const token = await getSpotifyToken();
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10);
      console.log(`    ⏳ Rate limited, waiting ${retryAfter}s... (attempt ${attempt + 1})`);
      await sleep(retryAfter * 1000 + 1000);
      continue;
    }

    if (!res.ok) {
      console.warn(`    ⚠️  Spotify API ${res.status} for ${url}`);
      return null;
    }

    return res.json();
  }
  return null;
}

async function main() {
  console.log("💿 Seeding REAL releases from Spotify API\n");

  const artists = await prisma.artist.findMany({
    select: { id: true, spotifyId: true, name: true },
  });

  console.log(`Found ${artists.length} artists in database\n`);

  let totalReleases = 0;

  for (const artist of artists) {
    if (!artist.spotifyId) continue;

    console.log(`📀 ${artist.name}...`);

    const albumsData = await spotifyFetch(
      `https://api.spotify.com/v1/artists/${artist.spotifyId}/albums?include_groups=album,single,compilation&limit=50&market=MX`
    );

    if (!albumsData?.items) {
      console.log(`  ⚠️  No releases found or rate limited`);
      await sleep(3000);
      continue;
    }

    let count = 0;

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
            artistId: artist.id,
            coverUrl: coverUrl,
            releaseDate: releaseDate,
            spotifyUrl: spotifyUrl,
          },
          create: {
            title: item.name,
            slug: slug,
            type: releaseType,
            artistId: artist.id,
            coverUrl: coverUrl,
            releaseDate: releaseDate,
            isUpcoming: false,
            spotifyUrl: spotifyUrl,
          },
        });
        count++;
        totalReleases++;
      } catch (err) {
        // Skip
      }
    }

    console.log(`  ✅ ${count} releases`);

    // Rate limit: 3 seconds between artists
    await sleep(3000);
  }

  const dbReleases = await prisma.release.count();
  console.log(`\n🎉 Done! Total releases in DB: ${dbReleases}`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error("❌", e); await prisma.$disconnect(); process.exit(1); });
