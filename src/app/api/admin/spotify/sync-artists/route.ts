/**
 * POST /api/admin/spotify/sync-artists
 *
 * Refreshes artist data (name, image, spotifyUrl) from Spotify API
 * for all artists with a spotifyId in the database.
 * Uses the curated genres from artist-config.ts (Spotify removed genres in 2025).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ARTIST_CONFIGS } from "@/lib/artist-config";

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
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 + 500 : Math.min(30000, 3000 * Math.pow(2, attempt));
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }
    if (res.status === 401) throw new Error("Token expired");
    return res;
  }
  throw new Error(`Max retries for ${url}`);
}

export async function POST(request: NextRequest) {
  try {
    const token = await getSpotifyToken();
    const results: { artist: string; updated: boolean; error?: string }[] = [];

    for (const config of ARTIST_CONFIGS) {
      try {
        const res = await spotifyFetch(`https://api.spotify.com/v1/artists/${config.spotifyId}`, token);
        if (!res.ok) {
          results.push({ artist: config.spotifyId, updated: false, error: `HTTP ${res.status}` });
          continue;
        }

        const data = await res.json();
        const bestImage = data.images?.sort((a: any, b: any) => b.height - a.height)[0]?.url ?? null;
        const genres = config.genres.join(", ");

        await db.artist.upsert({
          where: { spotifyId: config.spotifyId },
          update: {
            name: data.name,
            image: bestImage,
            spotifyUrl: data.external_urls?.spotify ?? `https://open.spotify.com/artist/${config.spotifyId}`,
            followers: data.followers?.total ?? 0,
            popularity: data.popularity ?? 0,
            genres,
            instagram: config.instagram,
            youtubeChannelId: config.youtubeChannelId,
            youtubeHandle: config.youtubeHandle,
          },
          create: {
            spotifyId: config.spotifyId,
            name: data.name,
            slug: data.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
            image: bestImage,
            spotifyUrl: data.external_urls?.spotify ?? `https://open.spotify.com/artist/${config.spotifyId}`,
            followers: data.followers?.total ?? 0,
            popularity: data.popularity ?? 0,
            genres,
            instagram: config.instagram,
            youtubeChannelId: config.youtubeChannelId,
            youtubeHandle: config.youtubeHandle,
          },
        });

        results.push({ artist: data.name, updated: true });

        // Rate limit delay
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        results.push({
          artist: config.spotifyId,
          updated: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ synced: results });
  } catch (err) {
    console.error("Spotify artist sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
