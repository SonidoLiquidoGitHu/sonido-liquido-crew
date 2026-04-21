import { NextResponse } from "next/server";
import type { Artist } from "@/lib/types";
import { ARTIST_CONFIGS } from "@/lib/artist-config";

const SPOTIFY_IDS = ARTIST_CONFIGS.map((c) => c.spotifyId);

let tokenCache: { token: string; expires: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expires > now) return tokenCache.token;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Spotify auth failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    expires: now + (data.expires_in - 60) * 1000,
  };
  return tokenCache.token;
}

async function fetchArtist(
  token: string,
  id: string
): Promise<Artist | null> {
  try {
    const [artistRes, albumsRes] = await Promise.all([
      fetch(`https://api.spotify.com/v1/artists/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(
        `https://api.spotify.com/v1/artists/${id}/albums?include_groups=album,single,compilation&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
    ]);

    if (!artistRes.ok) return null;

    const data = await artistRes.json();
    const albumsData = albumsRes.ok ? await albumsRes.json() : null;

    // Merge Spotify data with static config
    const config = ARTIST_CONFIGS.find((c) => c.spotifyId === id);

    return {
      id: String(data.id ?? ""),
      name: String(data.name ?? "Unknown"),
      image:
        Array.isArray(data.images) && data.images.length > 0 && data.images[0]?.url
          ? String(data.images[0].url)
          : "",
      followers: typeof data.followers?.total === "number" ? data.followers.total : 0,
      spotifyUrl: data.external_urls?.spotify ? String(data.external_urls.spotify) : "",
      popularity: typeof data.popularity === "number" ? data.popularity : 0,
      releases: typeof albumsData?.total === "number" ? albumsData.total : 0,
      instagram: config?.instagram ?? null,
      youtubeChannelId: config?.youtubeChannelId ?? null,
      youtubeHandle: config?.youtubeHandle ?? null,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const token = await getAccessToken();
    const results = await Promise.all(SPOTIFY_IDS.map((id) => fetchArtist(token, id)));

    const artists = results.filter((a): a is Artist => a !== null);

    return NextResponse.json(artists);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
