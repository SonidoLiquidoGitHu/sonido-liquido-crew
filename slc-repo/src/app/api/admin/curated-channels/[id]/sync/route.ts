import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels, curatedTracks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { spotifyClient } from "@/lib/clients/spotify";
import { generateUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 second timeout for Netlify

// Max albums to process per request to stay within 60s timeout
// Each album takes ~300-500ms (API call + DB inserts + delay)
// With 5 albums we use ~2-3s of API time, leaving plenty of headroom
const ALBUMS_PER_BATCH = 5;

// Helper to process tracks from a single album
async function processAlbumTracks(
  fullAlbum: any,
  channelId: string,
  channelName: string,
): Promise<{ added: number; skipped: number; errors: number }> {
  let added = 0;
  let skipped = 0;
  let errors = 0;

  if (!fullAlbum?.tracks?.items) return { added, skipped, errors };

  for (const track of fullAlbum.tracks.items as any[]) {
    if (!track?.id) continue;

    try {
      // Check if track already exists
      const existing = await db
        .select({ id: curatedTracks.id })
        .from(curatedTracks)
        .where(eq(curatedTracks.spotifyTrackId, track.id))
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const newTrack = {
        id: generateUUID(),
        spotifyTrackId: track.id as string,
        spotifyTrackUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
        spotifyAlbumId: fullAlbum.id as string,
        name: (track.name || "Unknown") as string,
        artistName: track.artists?.map((a: any) => a.name).join(", ") || channelName,
        artistIds: JSON.stringify(track.artists?.map((a: any) => a.id) || []),
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
      };

      await db.insert(curatedTracks).values(newTrack);
      added++;
    } catch (trackErr) {
      console.error(`[Sync] Error inserting track ${track?.id}:`, trackErr);
      errors++;
    }
  }

  return { added, skipped, errors };
}

// POST - Sync tracks from a curated channel (resumable batch mode)
// Query params:
//   ?offset=N  — start processing from album index N (default: 0)
//   ?batch=N   — process N albums per request (default: 5)
//
// Returns { hasMore: true, nextOffset: N } if there are more albums to process.
// The frontend should loop until hasMore is false.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    // Parse batch pagination params
    const url = new URL(request.url);
    const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));
    const batchSize = Math.min(
      Math.max(1, parseInt(url.searchParams.get("batch") || String(ALBUMS_PER_BATCH), 10)),
      10 // Never process more than 10 albums per request
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
        { status: 404 }
      );
    }

    // Fetch album list from Spotify
    console.log(`[Sync] Fetching albums for ${channel.name}...`);
    let albumList: any[] = [];
    try {
      albumList = await spotifyClient.getAllArtistAlbums(channel.spotifyArtistId);
      console.log(`[Sync] Found ${albumList.length} albums for ${channel.name}`);
    } catch (albumFetchErr) {
      console.error(`[Sync] Error fetching album list for ${channel.name}:`, albumFetchErr);
      const errMsg = (albumFetchErr as Error).message || "";
      if (errMsg.includes("400") || errMsg.includes("403")) {
        return NextResponse.json({
          success: false,
          error: "Spotify API no permite listar álbumes (400/403). La API de Spotify ha restringido algunos endpoints.",
        }, { status: 500 });
      }
      throw albumFetchErr;
    }

    // Determine the batch slice
    const albumsToProcess = albumList.slice(offset, offset + batchSize);
    const hasMore = offset + batchSize < albumList.length;
    const nextOffset = offset + batchSize;

    if (albumsToProcess.length === 0) {
      // Nothing to process — update metadata and return done
      const metadataUpdates: Record<string, unknown> = {
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      };
      try {
        const artistInfo = await spotifyClient.getArtist(channel.spotifyArtistId) as any;
        if (artistInfo.name) metadataUpdates.name = artistInfo.name;
        if (artistInfo.images?.[0]?.url) metadataUpdates.imageUrl = artistInfo.images[0].url;
      } catch (err) {
        console.warn(`[Sync] Could not refresh artist metadata for ${channel.name}:`, err);
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

    // Process only the albums in this batch
    for (let i = 0; i < albumsToProcess.length; i++) {
      const album = albumsToProcess[i];
      const albumIndex = offset + i;
      console.log(`[Sync] Fetching album ${albumIndex + 1}/${albumList.length}: ${album.name}`);

      try {
        const fullAlbum = await spotifyClient.getAlbum(album.id) as any;
        const result = await processAlbumTracks(fullAlbum, id, channel.name);
        addedTracks += result.added;
        skippedTracks += result.skipped;
        errorsCount += result.errors;
      } catch (albumErr) {
        console.error(`[Sync] Error fetching album ${album.name}:`, (albumErr as Error).message);
        errorsCount++;
      }

      // Rate limiting: pause between albums
      if (i < albumsToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // If this is the last batch, update metadata
    if (!hasMore) {
      const metadataUpdates: Record<string, unknown> = {
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      };
      try {
        const artistInfo = await spotifyClient.getArtist(channel.spotifyArtistId) as any;
        if (artistInfo.name) metadataUpdates.name = artistInfo.name;
        if (artistInfo.images?.[0]?.url) metadataUpdates.imageUrl = artistInfo.images[0].url;
      } catch (err) {
        console.warn(`[Sync] Could not refresh artist metadata for ${channel.name}:`, err);
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
    console.error("[Curated Channels API] Error syncing channel:", error);
    const errorMessage = error instanceof Error ? error.message : "Error syncing channel";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
