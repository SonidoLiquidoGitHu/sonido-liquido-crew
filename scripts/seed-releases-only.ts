/**
 * Fetch ONLY releases for existing artists in the database.
 * Artists are already seeded — this fetches their albums/singles/EPs from Spotify.
 * Includes rate limit handling with exponential backoff.
 *
 * Usage: npx tsx scripts/seed-releases-only.ts
 */

import { PrismaClient } from "@prisma/client";

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
  if (!res.ok) throw new Error(`Spotify auth failed: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function spotifyFetchWithRetry(url: string, maxRetries = 5): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const waitMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000 + 1000
        : Math.min(60000, 3000 * Math.pow(2, attempt));
      console.log(`     ⏳ Rate limited, waiting ${(waitMs / 1000).toFixed(1)}s (attempt ${attempt + 1})...`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    if (res.status === 401) {
      console.log("     🔄 Token expired, refreshing...");
      accessToken = await getAccessToken();
      continue;
    }
    return res;
  }
  throw new Error(`Max retries exceeded for ${url}`);
}

function slugify(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  console.log("=== SLC Releases Seed (Real Data from Spotify) ===\n");

  accessToken = await getAccessToken();
  console.log("Spotify token obtained.\n");

  const prisma = new PrismaClient();

  try {
    // Get all artists that have spotifyId
    const artists = await prisma.artist.findMany({
      where: { spotifyId: { not: null } },
      orderBy: { order: "asc" },
    });

    console.log(`Found ${artists.length} artists in database.\n`);

    let totalReleases = 0;

    for (const artist of artists) {
      if (!artist.spotifyId) continue;

      console.log(`🎵 Fetching releases for ${artist.name} (${artist.spotifyId})...`);

      const allAlbums: any[] = [];
      let offset = 0;
      const limit = 50;

      for (let page = 0; page < 3; page++) {
        const res = await spotifyFetchWithRetry(
          `https://api.spotify.com/v1/artists/${artist.spotifyId}/albums?include_groups=album,single,ep,compilation&limit=${limit}&offset=${offset}&market=MX`
        );

        if (!res.ok) {
          console.error(`   ✗ Failed (${res.status}): ${await res.text()}`);
          break;
        }

        const data = await res.json();
        if (data.items?.length > 0) allAlbums.push(...data.items);
        if (!data.next || data.items.length < limit) break;
        offset += limit;
        await new Promise((r) => setTimeout(r, 1500));
      }

      console.log(`   → ${allAlbums.length} releases found`);

      for (const album of allAlbums) {
        const bestCover = album.images?.sort((a: any, b: any) => b.height - a.height)[0]?.url ?? null;

        let releaseType = "single";
        if (album.album_type === "album") releaseType = "album";
        else if (album.album_type === "compilation") releaseType = "compilation";
        if (album.name.toLowerCase().includes(" ep") && album.album_type === "single") releaseType = "ep";

        const slug = `${slugify(album.name)}-${album.id.slice(-6)}`;
        const releaseDate = album.release_date ? new Date(album.release_date) : null;
        const isUpcoming = releaseDate ? releaseDate > new Date() : false;

        await prisma.release.upsert({
          where: { slug },
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
            slug,
            type: releaseType,
            artistId: artist.id,
            coverUrl: bestCover,
            releaseDate,
            spotifyUrl: album.external_urls?.spotify ?? null,
            isUpcoming,
          },
        });
        totalReleases++;
      }

      // Update release count on artist
      await prisma.artist.update({
        where: { id: artist.id },
        data: { releaseCount: allAlbums.length },
      });

      // Delay between artists to avoid rate limiting
      await new Promise((r) => setTimeout(r, 4000));
    }

    console.log(`\n=== Complete: ${totalReleases} real releases seeded ===`);

    const stats = await prisma.artist.findMany({
      select: { name: true, releaseCount: true, _count: { select: { releases: true } } },
      orderBy: { name: "asc" },
    });
    console.log("\nArtist release counts:");
    for (const s of stats) {
      console.log(`  ${s.name}: ${s._count.releases} releases in DB (Spotify count: ${s.releaseCount})`);
    }
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
