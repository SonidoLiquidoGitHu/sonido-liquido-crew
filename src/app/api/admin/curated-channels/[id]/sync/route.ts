import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels, curatedTracks } from "@/db/schema";
import { spotifyClient } from "@/lib/clients/spotify";
import { generateUUID } from "@/lib/utils";
import { eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Process 3 albums per request to stay within Netlify's ~26s function timeout
const ALBUMS_PER_BATCH = 3;

// Helper: bulk-check which track IDs already exist in the DB
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
      for (const row of rows) {
        existing.add(row.spotifyTrackId);
      }
    } catch (err) {
      console.warn("[Sync] Bulk check failed, falling back to empty set:", err);
    }
  }

  return existing;
}

// Helper: insert tracks with batch + one-by-one fallback
async function insertTracks(
  // biome-ignore lint/suspicious/noExplicitAny: Spotify API response shapes
  newTracks: Record<string, any>[],
): Promise<{ added: number; skipped: number }> {
  if (newTracks.length === 0) return { added: 0, skipped: 0 };

  let added = 0;
  let skipped = 0;

  try {
    await db.insert(curatedTracks).values(newTracks as any);
    added = newTracks.length;
  } catch (batchErr) {
    console.warn(
      "[Sync] Batch insert failed, falling back to one-by-one:",
      batchErr,
    );
    for (const newTrack of newTracks) {
      try {
        await db.insert(curatedTracks).values(newTrack as any);
        added++;
      } catch (insertErr) {
        skipped++;
      }
    }
  }

  return { added, skipped };
}

// Helper to process tracks from a single album
async function processAlbumTracks(
  // biome-ignore lint/suspicious/noExplicitAny: Spotify API response shapes
  fullAlbum: Record<string, any>,
  channelId: string,
  channelName: string,
): Promise<{ added: number; skipped: number; errors: number }> {
  if (!fullAlbum?.tracks?.items) return { added: 0, skipped: 0, errors: 0 };

  // biome-ignore lint/suspicious/noExplicitAny: Spotify API response shapes
  const tracks = (fullAlbum.tracks.items as Record<string, any>[]).filter((t) => t?.id);
  if (tracks.length === 0) return { added: 0, skipped: 0, errors: 0 };

  const trackIds = tracks.map((t) => t.id as string);
  const existingIds = await getExistingTrackIds(trackIds);

  let errors = 0;
  // biome-ignore lint/suspicious/noExplicitAny: Spotify track data
  const newTracks: Record<string, any>[] = [];

  for (const track of tracks) {
    if (existingIds.has(track.id)) continue;

    try {
      newTracks.push({
        id: generateUUID(),
        spotifyTrackId: track.id as string,
        spotifyTrackUrl:
          track.external_urls?.spotify ||
          `https://open.spotify.com/track/${track.id}`,
        spotifyAlbumId: fullAlbum.id as string,
        name: (track.name || "Unknown") as string,
        artistName:
          // biome-ignore lint/suspicious/noExplicitAny: Spotify artist data
          track.artists?.map((a: Record<string, any>) => a.name).join(", ") || channelName,
        // biome-ignore lint/suspicious/noExplicitAny: Spotify artist data
        artistIds: JSON.stringify(track.artists?.map((a: Record<string, any>) => a.id) || []),
        albumName: (fullAlbum.name || null) as string | null,
        albumImageUrl: fullAlbum.images?.[0]?.url ?? null,
        durationMs: (track.duration_ms ?? null) as number | null,
        previewUrl: (track.preview_url ?? null) as string | null,
        releaseDate: (fullAlbum.release_date ?? null) as string | null,
        popularity: (track.popularity ?? null) as number | null,
        explicit: Boolean(track.explicit),
        curatedChannelId: channelId,
        isAvailableForPlaylist: true,
        isFeatured: false,
      });
    } catch (trackErr) {
      console.error(`[Sync] Error building track ${track?.id}:`, trackErr);
      errors++;
    }
  }

  const { added, skipped } = await insertTracks(newTracks);
  return {
    added,
    skipped: skipped + (tracks.length - newTracks.length - errors),
    errors,
  };
}

// Helper: insert top tracks as fallback
async function insertTopTracksAsFallback(
  channelId: string,
  channelName: string,
  spotifyArtistId: string,
): Promise<{ added: number; skipped: number } | null> {
  try {
    console.log(
      `[Sync] Trying top-tracks fallback for artist ${spotifyArtistId}...`,
    );
    const topTracks = await spotifyClient.getArtistTopTracks(spotifyArtistId);
    if (!topTracks || topTracks.length === 0) {
      console.log("[Sync] Top-tracks fallback: no tracks returned");
      return null;
    }

    const trackIds = topTracks.filter((t) => t?.id).map((t) => t.id as string);
    const existingIds = await getExistingTrackIds(trackIds);

    // biome-ignore lint/suspicious/noExplicitAny: Spotify track data
    const newTracks: Record<string, any>[] = [];
    let skipped = 0;

    for (const track of topTracks) {
      if (!track?.id) continue;
      if (existingIds.has(track.id)) {
        skipped++;
        continue;
      }

      try {
        // biome-ignore lint/suspicious/noExplicitAny: Spotify track data
        const trackAny = track as Record<string, any>;
        newTracks.push({
          id: generateUUID(),
          spotifyTrackId: track.id as string,
          spotifyTrackUrl:
            trackAny.external_urls?.spotify ||
            `https://open.spotify.com/track/${track.id}`,
          spotifyAlbumId: trackAny.album?.id || null,
          name: (track.name || "Unknown") as string,
          artistName:
            // biome-ignore lint/suspicious/noExplicitAny: Spotify artist data
            trackAny.artists?.map((a: Record<string, any>) => a.name).join(", ") ||
            channelName,
          artistIds: JSON.stringify(
            // biome-ignore lint/suspicious/noExplicitAny: Spotify artist data
            trackAny.artists?.map((a: Record<string, any>) => a.id) || [],
          ),
          albumName: (trackAny.album?.name || null) as string | null,
          albumImageUrl: (trackAny.album?.images?.[0]?.url ?? null) as
            | string
            | null,
          durationMs: (track.duration_ms ?? null) as number | null,
          previewUrl: (track.preview_url ?? null) as string | null,
          releaseDate: (trackAny.album?.release_date ?? null) as
            | string
            | null,
          popularity: (trackAny.popularity ?? null) as number | null,
          explicit: Boolean(trackAny.explicit),
          curatedChannelId: channelId,
          isAvailableForPlaylist: true,
          isFeatured: true,
        });
      } catch (trackErr) {
        console.warn(`[Sync] Error building top track ${track?.id}:`, trackErr);
      }
    }

    const { added } = await insertTracks(newTracks);
    console.log(
      `[Sync] Top-tracks fallback: added=${added}, skipped=${skipped}`,
    );
    return added > 0 || skipped > 0 ? { added, skipped } : null;
  } catch (err) {
    console.warn("[Sync] Top-tracks fallback failed:", err);
    return null;
  }
}

// POST - Sync tracks from a curated channel (resumable batch mode)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const startTime = Date.now();

  try {
    const { id } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 },
      );
    }

    // Parse batch pagination params
    const url = new URL(request.url);
    const offset = Math.max(
      0,
      Number.parseInt(url.searchParams.get("offset") || "0", 10),
    );
    const batchSize = Math.min(
      Math.max(
        1,
        Number.parseInt(
          url.searchParams.get("batch") || String(ALBUMS_PER_BATCH),
          10,
        ),
      ),
      5,
    );

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

    console.log(
      `[Sync] Starting sync for "${channel.name}" (artist: ${channel.spotifyArtistId}), offset=${offset}, batch=${batchSize}`,
    );

    // Fetch album list from Spotify
    // biome-ignore lint/suspicious/noExplicitAny: Spotify API response shapes
    let albumList: Record<string, any>[] = [];
    try {
      const albumsResponse = await spotifyClient.getArtistAlbums(
        channel.spotifyArtistId,
        {
          includeGroups: "album,single",
          limit: 10,
          offset: 0,
        },
      );
      albumList = albumsResponse.items || [];
      console.log(
        `[Sync] Found ${albumList.length} albums for "${channel.name}" (total available: ${albumsResponse.total}, elapsed: ${Date.now() - startTime}ms)`,
      );
    } catch (albumFetchErr) {
      const errMsg = (albumFetchErr as Error).message || "";
      console.error(
        `[Sync] Error fetching album list for "${channel.name}": ${errMsg} (elapsed: ${Date.now() - startTime}ms)`,
      );

      // Try fallback: fetch top tracks instead of full album sync
      const result = await insertTopTracksAsFallback(
        id,
        channel.name,
        channel.spotifyArtistId,
      );
      if (result) {
        await db
          .update(curatedSpotifyChannels)
          .set({
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(curatedSpotifyChannels.id, id));

        return NextResponse.json({
          success: true,
          data: {
            albumsProcessed: 0,
            totalAlbums: 0,
            tracksAdded: result.added,
            tracksSkipped: result.skipped,
            errors: 0,
            hasMore: false,
            nextOffset: 0,
          },
          message: `Sincronización parcial: ${result.added} tracks obtenidos (fallback - la API de álbumes no está disponible)`,
        });
      }

      // Both methods failed
      if (errMsg.includes("400") || errMsg.includes("403")) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Spotify API no permite listar álbumes ni obtener tracks. Verifica las credenciales de Spotify.",
          },
          { status: 500 },
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: `Error al obtener álbumes: ${errMsg}`,
        },
        { status: 500 },
      );
    }

    // If no albums found, try top tracks
    if (albumList.length === 0) {
      console.log(
        `[Sync] No albums found for "${channel.name}", trying top tracks fallback...`,
      );
      const result = await insertTopTracksAsFallback(
        id,
        channel.name,
        channel.spotifyArtistId,
      );
      if (result && result.added > 0) {
        await db
          .update(curatedSpotifyChannels)
          .set({
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(curatedSpotifyChannels.id, id));

        return NextResponse.json({
          success: true,
          data: {
            albumsProcessed: 0,
            totalAlbums: 0,
            tracksAdded: result.added,
            tracksSkipped: result.skipped,
            errors: 0,
            hasMore: false,
            nextOffset: 0,
          },
          message: `Sincronización parcial: ${result.added} tracks de top tracks (no se encontraron álbumes)`,
        });
      }

      await db
        .update(curatedSpotifyChannels)
        .set({
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(curatedSpotifyChannels.id, id));

      return NextResponse.json({
        success: true,
        data: {
          albumsProcessed: 0,
          totalAlbums: 0,
          tracksAdded: 0,
          tracksSkipped: 0,
          errors: 0,
          hasMore: false,
          nextOffset: 0,
        },
        message:
          "No se encontraron álbumes ni tracks para este artista en Spotify.",
      });
    }

    // Determine the batch slice
    const albumsToProcess = albumList.slice(offset, offset + batchSize);
    const hasMore = offset + batchSize < albumList.length;
    const nextOffset = offset + batchSize;

    if (albumsToProcess.length === 0) {
      const metadataUpdates: Record<string, unknown> = {
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      };
      try {
        const artistInfo = (await spotifyClient.getArtist(
          channel.spotifyArtistId,
          // biome-ignore lint/suspicious/noExplicitAny: Spotify artist response
        )) as Record<string, any>;
        if (artistInfo.name) metadataUpdates.name = artistInfo.name;
        if (artistInfo.images?.[0]?.url)
          metadataUpdates.imageUrl = artistInfo.images[0].url;
      } catch (err) {
        console.warn("[Sync] Could not refresh artist metadata:", err);
      }

      await db
        .update(curatedSpotifyChannels)
        .set(metadataUpdates)
        .where(eq(curatedSpotifyChannels.id, id));

      return NextResponse.json({
        success: true,
        data: {
          albumsProcessed: 0,
          totalAlbums: albumList.length,
          tracksAdded: 0,
          tracksSkipped: 0,
          errors: 0,
          hasMore: false,
          nextOffset: 0,
        },
        message: `Sincronización completa. ${albumList.length} álbumes ya estaban sincronizados.`,
      });
    }

    let addedTracks = 0;
    let skippedTracks = 0;
    let errorsCount = 0;

    // Process albums in this batch
    for (let i = 0; i < albumsToProcess.length; i++) {
      const album = albumsToProcess[i];
      console.log(
        `[Sync] Processing album ${offset + i + 1}/${albumList.length}: "${album.name}" (elapsed: ${Date.now() - startTime}ms)`,
      );

      try {
        // biome-ignore lint/suspicious/noExplicitAny: Spotify album response
        const fullAlbum = (await spotifyClient.getAlbum(album.id)) as Record<string, any>;
        const result = await processAlbumTracks(fullAlbum, id, channel.name);
        addedTracks += result.added;
        skippedTracks += result.skipped;
        errorsCount += result.errors;
      } catch (albumErr) {
        console.error(
          `[Sync] Error fetching album "${album.name}": ${(albumErr as Error).message}`,
        );
        errorsCount++;
      }

      // Rate limiting pause between albums
      if (i < albumsToProcess.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(
      `[Sync] Batch complete: added=${addedTracks}, skipped=${skippedTracks}, errors=${errorsCount}, hasMore=${hasMore} (elapsed: ${Date.now() - startTime}ms)`,
    );

    // Update metadata on last batch
    if (!hasMore) {
      const metadataUpdates: Record<string, unknown> = {
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      };
      try {
        const artistInfo = (await spotifyClient.getArtist(
          channel.spotifyArtistId,
        // biome-ignore lint/suspicious/noExplicitAny: dynamic type
        )) as Record<string, any>;
        if (artistInfo.name) metadataUpdates.name = artistInfo.name;
        if (artistInfo.images?.[0]?.url)
          metadataUpdates.imageUrl = artistInfo.images[0].url;
      } catch (err) {
        console.warn("[Sync] Could not refresh artist metadata:", err);
      }

      await db
        .update(curatedSpotifyChannels)
        .set(metadataUpdates)
        .where(eq(curatedSpotifyChannels.id, id));
    }

    const message = hasMore
      ? `Progreso: ${nextOffset}/${albumList.length} álbumes procesados, ${addedTracks} tracks nuevos en este lote`
      : errorsCount > 0
        ? `Sincronizado: ${addedTracks} tracks nuevos de ${albumList.length} álbumes (${errorsCount} errores)`
        : `Sincronizado: ${addedTracks} tracks nuevos de ${albumList.length} álbumes`;

    return NextResponse.json({
      success: true,
      data: {
        albumsProcessed: albumsToProcess.length,
        totalAlbums: albumList.length,
        tracksAdded: addedTracks,
        tracksSkipped: skippedTracks,
        errors: errorsCount,
        hasMore,
        nextOffset: hasMore ? nextOffset : albumList.length,
      },
      message,
    });
  } catch (error) {
    console.error("[Sync] Unhandled error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Error syncing channel";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  }
}
