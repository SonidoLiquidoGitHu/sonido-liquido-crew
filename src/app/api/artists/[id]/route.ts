import { NextResponse } from "next/server";
import type { Artist, Track, Release, YouTubeVideo } from "@/lib/types";
import { getArtistConfig } from "@/lib/artist-config";

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

/**
 * Search YouTube videos using the YouTube Data API v3.
 *
 * Strategy:
 * 1. If the artist has a dedicated YouTube channel ID → search within that channel
 * 2. Also search the main SonidoLíquido Crew channel for the artist
 * 3. Deduplicate and return up to 6 results
 *
 * If YOUTUBE_API_KEY is not set, returns [] (UI shows fallback link).
 */
async function searchYouTubeVideos(
  artistName: string,
  channelId?: string | null
): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const searchQueries: Promise<YouTubeVideo[]>[] = [];

    // Search 1: Within the artist's configured channel (or SLC crew channel)
    if (channelId) {
      searchQueries.push(
        fetchYouTubeSearch(apiKey, artistName, channelId)
      );
    }

    // Search 2: Always search the main SLC crew channel for this artist
    const SLC_CHANNEL_ID = "UCy6tHVzGmZ_ehIBWcdrTuRA";
    if (channelId !== SLC_CHANNEL_ID) {
      searchQueries.push(
        fetchYouTubeSearch(apiKey, artistName, SLC_CHANNEL_ID)
      );
    }

    // Search 3: Generic YouTube search (broader results)
    searchQueries.push(
      fetchYouTubeSearch(apiKey, `${artistName} Sonido Líquido`, undefined)
    );

    const results = await Promise.all(searchQueries);

    // Flatten, deduplicate by videoId, and limit to 6
    const seen = new Set<string>();
    const deduped: YouTubeVideo[] = [];

    for (const batch of results) {
      for (const video of batch) {
        if (!seen.has(video.videoId)) {
          seen.add(video.videoId);
          deduped.push(video);
          if (deduped.length >= 6) break;
        }
      }
      if (deduped.length >= 6) break;
    }

    return deduped;
  } catch {
    return [];
  }
}

/**
 * Execute a single YouTube Data API v3 search request.
 */
async function fetchYouTubeSearch(
  apiKey: string,
  query: string,
  channelId?: string | null
): Promise<YouTubeVideo[]> {
  try {
    const params = new URLSearchParams({
      part: "snippet",
      maxResults: channelId ? "4" : "3",
      q: query,
      type: "video",
      key: apiKey,
      // Prefer recent videos
      order: channelId ? "date" : "relevance",
    });

    if (channelId) {
      params.set("channelId", channelId);
    }

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
    );

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data.items)) return [];

    return (data.items as Record<string, unknown>[])
      .filter((item) => {
        const idObj = item.id as Record<string, unknown> | undefined;
        return idObj && typeof idObj.videoId === "string";
      })
      .map((item) => {
        const idObj = item.id as Record<string, string>;
        const snippet = item.snippet as Record<string, unknown>;
        const thumbnails = snippet.thumbnails as Record<string, Record<string, string>> | undefined;
        return {
          videoId: idObj.videoId ?? "",
          title: String(snippet.title ?? ""),
          thumbnail: thumbnails?.medium?.url ?? thumbnails?.default?.url ?? "",
          channelTitle: String(snippet.channelTitle ?? ""),
        };
      });
  } catch {
    return [];
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = await getAccessToken();
    const config = getArtistConfig(id);

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
      instagram: config?.instagram ?? null,
      youtubeChannelId: config?.youtubeChannelId ?? null,
      youtubeHandle: config?.youtubeHandle ?? null,
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

    // Search YouTube videos using channel-aware strategy
    const videos = await searchYouTubeVideos(
      artist.name,
      config?.youtubeChannelId
    );

    return NextResponse.json({ artist, tracks, releases, videos });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
