/**
 * POST /api/admin/spotify/sync-releases
 *
 * Fetches REAL releases (albums, singles, EPs) from Spotify for all artists
 * in the database that have a spotifyId. Uses Client Credentials flow.
 *
 * Handles rate limiting with Retry-After header.
 * Can be called from the admin panel to sync on-demand.
 *
 * Body (optional):
 *   { artistId?: string } — sync only one artist; omit for all
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ── Spotify Client Credentials ──────────────────────────────────────

async function getSpotifyToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing Spotify credentials");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) throw new Error(`Spotify auth failed: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function spotifyFetch(url: string, token: string): Promise<Response> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const waitMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000 + 500
        : Math.min(30000, 3000 * Math.pow(2, attempt));
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    if (res.status === 401) {
      throw new Error("Spotify token expired during sync");
    }

    return res;
  }
  throw new Error(`Max retries for ${url}`);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Route Handler ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { artistId } = body as { artistId?: string };

    // Get artists to sync
    const where = artistId
      ? { id: artistId, spotifyId: { not: null } }
      : { spotifyId: { not: null } };

    const artists = await db.artist.findMany({ where, orderBy: { order: "asc" } });

    if (artists.length === 0) {
      return NextResponse.json({ error: "No artists to sync" }, { status: 404 });
    }

    const token = await getSpotifyToken();
    const results: { artist: string; releasesAdded: number; error?: string }[] = [];

    for (const artist of artists) {
      if (!artist.spotifyId) continue;

      try {
        const albums: any[] = [];
        let offset = 0;

        for (let page = 0; page < 15; page++) { // limit=10 per page, up to 150 releases
          const res = await spotifyFetch(
            `https://api.spotify.com/v1/artists/${artist.spotifyId}/albums?include_groups=album,single,ep,compilation&limit=10&offset=${offset}&market=MX`,
            token
          );

          if (!res.ok) {
            results.push({ artist: artist.name, releasesAdded: 0, error: `HTTP ${res.status}` });
            break;
          }

          const data = await res.json();
          if (data.items?.length) albums.push(...data.items);
          if (!data.next || data.items.length < 10) break;
          offset += 10;

          // Delay between pages
          await new Promise((r) => setTimeout(r, 1000));
        }

        let added = 0;
        for (const album of albums) {
          const bestCover = album.images?.sort((a: any, b: any) => b.height - a.height)[0]?.url ?? null;

          let releaseType = "single";
          if (album.album_type === "album") releaseType = "album";
          else if (album.album_type === "compilation") releaseType = "compilation";
          if (album.name.toLowerCase().includes(" ep") && album.album_type === "single") releaseType = "ep";

          const slug = `${slugify(album.name)}-${album.id.slice(-6)}`;
          const releaseDate = album.release_date ? new Date(album.release_date) : null;
          const isUpcoming = releaseDate ? releaseDate > new Date() : false;

          await db.release.upsert({
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
          added++;
        }

        // Update release count
        await db.artist.update({
          where: { id: artist.id },
          data: { releaseCount: albums.length },
        });

        results.push({ artist: artist.name, releasesAdded: added });

        // Delay between artists
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        results.push({
          artist: artist.name,
          releasesAdded: 0,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ synced: results });
  } catch (err) {
    console.error("Spotify sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
