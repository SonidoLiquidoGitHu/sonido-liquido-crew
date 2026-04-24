import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Artist, Track, Release, YouTubeVideo } from "@/lib/types";

/**
 * GET /api/artists/[id] — Returns artist detail from the database.
 * The `id` param can be either a slug (e.g. "zaque") or a Spotify ID.
 * YouTube videos are still fetched from the YouTube Data API at runtime
 * since they change frequently.
 */

async function searchYouTubeVideos(
  artistName: string,
  channelId?: string | null
): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const searchQueries: Promise<YouTubeVideo[]>[] = [];

    if (channelId) {
      searchQueries.push(fetchYouTubeSearch(apiKey, artistName, channelId));
    }

    const SLC_CHANNEL_ID = "UCy6tHVzGmZ_ehIBWcdrTuRA";
    if (channelId !== SLC_CHANNEL_ID) {
      searchQueries.push(fetchYouTubeSearch(apiKey, artistName, SLC_CHANNEL_ID));
    }

    searchQueries.push(
      fetchYouTubeSearch(apiKey, `${artistName} Sonido Líquido`, undefined)
    );

    const results = await Promise.all(searchQueries);

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
      order: channelId ? "date" : "relevance",
    });
    if (channelId) params.set("channelId", channelId);

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

    // Find by slug first, then by Spotify ID
    const dbArtist = await db.artist.findFirst({
      where: {
        OR: [{ slug: id }, { spotifyId: id }],
      },
      include: {
        releases: {
          orderBy: { releaseDate: "desc" },
          take: 20,
        },
        _count: { select: { releases: true } },
      },
    });

    if (!dbArtist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    const artist: Artist = {
      id: dbArtist.slug ?? dbArtist.id,
      name: dbArtist.name,
      image: dbArtist.image ?? "",
      followers: dbArtist.followers || null,
      spotifyUrl: dbArtist.spotifyUrl ?? "",
      popularity: dbArtist.popularity || null,
      releases: dbArtist.releaseCount || dbArtist._count.releases,
      genres: dbArtist.genres ? dbArtist.genres.split(",").map((g) => g.trim()) : [],
      instagram: dbArtist.instagram,
      youtubeChannelId: dbArtist.youtubeChannelId,
      youtubeHandle: dbArtist.youtubeHandle,
    };

    const tracks: Track[] = []; // Spotify removed top-tracks endpoint

    const releases: Release[] = dbArtist.releases.map((r) => ({
      id: r.id,
      name: r.title,
      artistName: dbArtist.name,
      image: r.coverUrl ?? "",
      releaseDate: r.releaseDate ? r.releaseDate.toISOString().split("T")[0] : "",
      type: (["album", "single", "compilation"].includes(r.type)
        ? r.type
        : "album") as Release["type"],
      spotifyUrl: r.spotifyUrl ?? "",
    }));

    // Search YouTube videos using channel-aware strategy
    const videos = await searchYouTubeVideos(
      artist.name,
      dbArtist.youtubeChannelId
    );

    return NextResponse.json({ artist, tracks, releases, videos });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
