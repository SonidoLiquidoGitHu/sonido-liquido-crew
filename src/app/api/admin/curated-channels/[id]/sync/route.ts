import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels, curatedTracks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { spotifyClient } from "@/lib/clients/spotify";
import { generateUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 second timeout for Netlify

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

// POST - Sync tracks from a curated channel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
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
        { status: 404 }
      );
    }

    // Fetch album list from Spotify (this endpoint still works)
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

    let addedTracks = 0;
    let skippedTracks = 0;
    let errorsCount = 0;

    // Fetch each album individually (batch endpoint /albums?ids= is 403'd)
    // Process in small batches with delays to avoid rate limiting
    for (let i = 0; i < albumList.length; i++) {
      const album = albumList[i];
      console.log(`[Sync] Fetching album ${i + 1}/${albumList.length}: ${album.name}`);

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

      // Rate limiting: pause between albums (more aggressive for larger catalogs)
      if (i < albumList.length - 1) {
        const delay = albumList.length > 20 ? 300 : 150;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Safety: if we've been running too long, stop and report progress
      // (Netlify function timeout is 60s)
      if (i > 0 && i % 15 === 0) {
        console.log(`[Sync] Progress: ${i}/${albumList.length} albums processed, ${addedTracks} tracks added so far`);
      }
    }

    // Refresh artist metadata (note: Spotify may not return popularity/followers/genres for client credentials)
    const metadataUpdates: Record<string, unknown> = {
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };
    try {
      const artistInfo = await spotifyClient.getArtist(channel.spotifyArtistId) as any;
      metadataUpdates.name = artistInfo.name || channel.name;
      metadataUpdates.imageUrl = artistInfo.images?.[0]?.url ?? channel.imageUrl;
      // These fields may be undefined with restricted API access
      if (artistInfo.genres?.length) {
        metadataUpdates.genres = JSON.stringify(artistInfo.genres);
      }
      if (artistInfo.popularity != null) {
        metadataUpdates.popularity = artistInfo.popularity;
      }
      if (artistInfo.followers?.total != null) {
        metadataUpdates.followers = artistInfo.followers.total;
      }
    } catch (err) {
      console.warn(`[Sync] Could not refresh artist metadata for ${channel.name}:`, err);
    }

    await db
      .update(curatedSpotifyChannels)
      .set(metadataUpdates)
      .where(eq(curatedSpotifyChannels.id, id));

    const message = errorsCount > 0
      ? `Sincronizado: ${addedTracks} tracks nuevos de ${albumList.length} álbumes (${errorsCount} errores)`
      : `Sincronizado: ${addedTracks} tracks nuevos de ${albumList.length} álbumes`;

    return NextResponse.json({
      success: true,
      data: {
        albumsProcessed: albumList.length,
        tracksAdded: addedTracks,
        tracksSkipped: skippedTracks,
        errors: errorsCount,
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
