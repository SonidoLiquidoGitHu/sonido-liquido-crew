import { NextResponse } from "next/server";
import type { Artist, Track, Release } from "@/lib/types";

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = await getAccessToken();

    // Fetch artist + albums + top tracks in parallel
    const [artistRes, albumsRes, tracksRes] = await Promise.all([
      fetch(`https://api.spotify.com/v1/artists/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(
        `https://api.spotify.com/v1/artists/${id}/albums?include_groups=album,single,compilation&limit=10&market=US`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
      fetch(
        `https://api.spotify.com/v1/artists/${id}/top-tracks?market=US`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
    ]);

    if (!artistRes.ok) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const artistData = await artistRes.json();
    const albumsData = albumsRes.ok ? await albumsRes.json() : null;
    const tracksData = tracksRes.ok ? await tracksRes.json() : null;

    const artist: Artist = {
      id: String(artistData.id ?? ""),
      name: String(artistData.name ?? "Unknown"),
      image:
        Array.isArray(artistData.images) && artistData.images.length > 0 && artistData.images[0]?.url
          ? String(artistData.images[0].url)
          : "",
      followers: typeof artistData.followers?.total === "number" ? artistData.followers.total : 0,
      spotifyUrl: artistData.external_urls?.spotify ? String(artistData.external_urls.spotify) : "",
      popularity: typeof artistData.popularity === "number" ? artistData.popularity : 0,
      releases: typeof albumsData?.total === "number" ? albumsData.total : 0,
    };

    const tracks: Track[] = Array.isArray(tracksData?.tracks)
      ? tracksData.tracks.map((t: Record<string, unknown>) => ({
          id: String(t.id ?? ""),
          name: String(t.name ?? "Unknown"),
          album: String((t.album as Record<string, unknown>)?.name ?? ""),
          albumImage:
            Array.isArray((t.album as Record<string, unknown>)?.images) &&
            ((t.album as Record<string, unknown>).images as Record<string, unknown>[])[0]?.url
              ? String(((t.album as Record<string, unknown>).images as Record<string, unknown>[])[0].url)
              : "",
          durationMs: typeof t.duration_ms === "number" ? t.duration_ms : 0,
          spotifyUrl: (t.external_urls as Record<string, string>)?.spotify ?? "",
          previewUrl: t.preview_url ? String(t.preview_url) : null,
        }))
      : [];

    const releases: Release[] = Array.isArray(albumsData?.items)
      ? albumsData.items.map((a: Record<string, unknown>) => ({
          id: String(a.id ?? ""),
          name: String(a.name ?? "Unknown"),
          artistName: Array.isArray(a.artists) && a.artists[0]?.name ? String(a.artists[0].name) : "",
          image:
            Array.isArray(a.images) && a.images[0]?.url
              ? String(a.images[0].url)
              : "",
          releaseDate: String(a.release_date ?? ""),
          type: (["album", "single", "compilation"].includes(a.album_type as string)
            ? a.album_type
            : "album") as Release["type"],
          spotifyUrl: (a.external_urls as Record<string, string>)?.spotify ?? "",
        }))
      : [];

    return NextResponse.json({ artist, tracks, releases });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
