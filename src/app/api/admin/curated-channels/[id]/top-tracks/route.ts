import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels, curatedTracks } from "@/db/schema";
import { spotifyClient } from "@/lib/clients/spotify";
import { generateUUID } from "@/lib/utils";
import { eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// biome-ignore lint/suspicious/noExplicitAny: Spotify API dynamic response shape
type SpotifyData = Record<string, any>;

// Bulk-check which track IDs already exist in the DB
async function getExistingTrackIds(trackIds: string[]): Promise<Set<string>> {
  if (trackIds.length === 0) return new Set();
  const existing = new Set<string>();
  const chunkSize = 50;
  for (let i = 0; i < trackIds.length; i += chunkSize) {
    const chunk = trackIds.slice(i, i + chunkSize);
    try {
      const rows = await db
        .select({ spotifyTrackId: curatedTracks.spotifyTrackId })
        .from(curatedTracks)
        .where(inArray(curatedTracks.spotifyTrackId, chunk));
      for (const row of rows) existing.add(row.spotifyTrackId);
    } catch (err) {
      console.warn("[Top Tracks] Bulk check failed:", err);
    }
  }
  return existing;
}

// POST - Fetch recent tracks for an existing channel
// This is the FAST sync method — only fetches recent releases (1 API call)
// and the top-tracks endpoint (1 API call with fallback)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 },
      );
    }

    // Get the channel
    const [channel] = await db
      .select()
      .from(curatedSpotifyChannels)
      .where(eq(curatedSpotifyChannels.id, id))
      .limit(1);

    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 },
      );
    }

    const artistId = channel.spotifyArtistId;
    console.log(`[Top Tracks] Fetching recent tracks for ${channel.name}...`);

    // Strategy: Fetch recent albums (singles first) and extract their tracks
    // This is much faster than full sync because:
    // 1. Only 1 API call to get recent releases (no pagination)
    // 2. Only fetch 3-5 most recent albums
    // 3. Bulk DB operations

    const allNewTracks: SpotifyData[] = [];
    let albumsFetched = 0;

    // Step 1: Get recent singles/albums (1 API call, limit=5)
    try {
      const albumsResponse = await spotifyClient.getArtistAlbums(artistId, {
        includeGroups: "single,album",
        limit: 5,
      });

      if (albumsResponse.items?.length) {
        albumsFetched = albumsResponse.items.length;

        // Step 2: Fetch each album's tracks (up to 5 API calls)
        for (const album of albumsResponse.items) {
          try {
            const fullAlbum = (await spotifyClient.getAlbum(album.id)) as SpotifyData;
            if (fullAlbum?.tracks?.items) {
              for (const track of fullAlbum.tracks.items as SpotifyData[]) {
                if (!track?.id) continue;
                // Only include tracks where this artist is credited
                const isByArtist = (track.artists as SpotifyData[] | undefined)?.some(
                  (a) => a.id === artistId,
                );
                if (!isByArtist) continue;

                allNewTracks.push({
                  id: generateUUID(),
                  spotifyTrackId: track.id as string,
                  spotifyTrackUrl:
                    (track.external_urls as SpotifyData)?.spotify ||
                    `https://open.spotify.com/track/${track.id}`,
                  spotifyAlbumId: fullAlbum.id as string,
                  name: (track.name || "Unknown") as string,
                  artistName:
                    (track.artists as SpotifyData[] | undefined)?.map((a) => a.name).join(", ") ||
                    channel.name,
                  artistIds: JSON.stringify(
                    (track.artists as SpotifyData[] | undefined)?.map((a) => a.id) || [],
                  ),
                  albumName: (fullAlbum.name || null) as string | null,
                  albumImageUrl: fullAlbum.images?.[0]?.url ?? null,
                  durationMs: (track.duration_ms ?? null) as number | null,
                  previewUrl: (track.preview_url ?? null) as string | null,
                  releaseDate: (fullAlbum.release_date ?? null) as
                    | string
                    | null,
                  popularity: (track.popularity ?? null) as number | null,
                  explicit: Boolean(track.explicit),
                  curatedChannelId: id,
                  isAvailableForPlaylist: true,
                  isFeatured: true, // Recent tracks are featured by default
                });
              }
            }
          } catch (albumErr) {
            console.warn(
              `[Top Tracks] Could not fetch album ${album.name}:`,
              (albumErr as Error).message,
            );
          }
        }
      }
    } catch (albumsErr) {
      console.warn(
        `[Top Tracks] Could not fetch recent albums for ${channel.name}:`,
        (albumsErr as Error).message,
      );
    }

    // If we got no tracks from albums, try the search API as a last resort
    if (allNewTracks.length === 0) {
      try {
        const artist = await spotifyClient.getArtist(artistId);
        if (artist.name) {
          const searchResult = await spotifyClient.search(
            `artist:"${artist.name}"`,
            ["track"],
            10,
          );
          if (searchResult.tracks?.items) {
            for (const track of searchResult.tracks.items) {
              if (!track?.id) continue;
              const trackData = track as SpotifyData;
              const isByArtist = (trackData.artists as SpotifyData[] | undefined)?.some(
                (a) => a.id === artistId,
              );
              if (!isByArtist) continue;

              allNewTracks.push({
                id: generateUUID(),
                spotifyTrackId: track.id as string,
                spotifyTrackUrl:
                  (trackData.external_urls as SpotifyData)?.spotify ||
                  `https://open.spotify.com/track/${track.id}`,
                spotifyAlbumId: (trackData.album as SpotifyData)?.id || null,
                name: (track.name || "Unknown") as string,
                artistName:
                  (trackData.artists as SpotifyData[] | undefined)?.map((a) => a.name).join(", ") ||
                  channel.name,
                artistIds: JSON.stringify(
                  (trackData.artists as SpotifyData[] | undefined)?.map((a) => a.id) || [],
                ),
                albumName: ((trackData.album as SpotifyData)?.name || null) as
                  | string
                  | null,
                albumImageUrl: ((trackData.album as SpotifyData)?.images?.[0]?.url ??
                  null) as string | null,
                durationMs: (track.duration_ms ?? null) as number | null,
                previewUrl: (track.preview_url ?? null) as string | null,
                releaseDate: ((trackData.album as SpotifyData)?.release_date ?? null) as
                  | string
                  | null,
                popularity: ((trackData.popularity ?? null) as
                  | number
                  | null),
                explicit: Boolean((trackData.explicit ?? false)),
                curatedChannelId: id,
                isAvailableForPlaylist: true,
                isFeatured: true,
              });
            }
          }
        }
      } catch (searchErr) {
        console.warn(
          `[Top Tracks] Search fallback failed for ${channel.name}:`,
          (searchErr as Error).message,
        );
      }
    }

    // Bulk check: which tracks already exist?
    const trackIds = allNewTracks.map((t) => t.spotifyTrackId);
    const existingIds = await getExistingTrackIds(trackIds);

    // Filter out existing tracks; mark existing ones as featured
    const trulyNew = allNewTracks.filter(
      (t) => !existingIds.has(t.spotifyTrackId),
    );
    const alreadyExist = allNewTracks.filter((t) =>
      existingIds.has(t.spotifyTrackId),
    );

    // Mark existing tracks as featured
    if (alreadyExist.length > 0) {
      const existingTrackIds = alreadyExist.map((t) => t.spotifyTrackId);
      try {
        // Update in chunks
        for (let i = 0; i < existingTrackIds.length; i += 50) {
          const chunk = existingTrackIds.slice(i, i + 50);
          await db
            .update(curatedTracks)
            .set({ isFeatured: true, updatedAt: new Date() })
            .where(inArray(curatedTracks.spotifyTrackId, chunk));
        }
      } catch (updateErr) {
        console.warn(
          "[Top Tracks] Could not update featured status:",
          updateErr,
        );
      }
    }

    // Batch insert new tracks
    let addedCount = 0;
    if (trulyNew.length > 0) {
      try {
        await db.insert(curatedTracks).values(trulyNew as any);
        addedCount = trulyNew.length;
      } catch (batchErr) {
        // Fallback to one-by-one if batch fails
        console.warn(
          "[Top Tracks] Batch insert failed, trying one-by-one:",
          batchErr,
        );
        for (const track of trulyNew) {
          try {
            await db.insert(curatedTracks).values(track as any);
            addedCount++;
          } catch {
            // Duplicate — skip
          }
        }
      }
    }

    // Update channel sync metadata
    await db
      .update(curatedSpotifyChannels)
      .set({
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(curatedSpotifyChannels.id, id));

    const message =
      addedCount > 0
        ? `${addedCount} tracks nuevos de ${albumsFetched} lanzamientos recientes`
        : alreadyExist.length > 0
          ? `Todos los tracks recientes ya estaban sincronizados (${alreadyExist.length} marcados como destacados)`
          : "No se encontraron tracks recientes para este artista";

    return NextResponse.json({
      success: true,
      data: {
        tracksAdded: addedCount,
        tracksSkipped: alreadyExist.length,
        totalTopTracks: allNewTracks.length,
        albumsFetched,
      },
      message,
    });
  } catch (error) {
    console.error(
      "[Curated Channels API] Error fetching recent tracks:",
      error,
    );
    const errorMsg =
      error instanceof Error ? error.message : "Error fetching recent tracks";
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 },
    );
  }
}
