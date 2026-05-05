import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels, curatedTracks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { spotifyClient } from "@/lib/clients/spotify";
import { generateUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 second timeout for Netlify

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

    // Fetch albums from Spotify
    console.log(`[Sync] Fetching albums for ${channel.name}...`);
    let albums: any[] = [];
    try {
      albums = await spotifyClient.getAllArtistAlbums(channel.spotifyArtistId);
      console.log(`[Sync] Found ${albums.length} albums for ${channel.name}`);
    } catch (albumFetchErr) {
      console.error(`[Sync] Error fetching albums for ${channel.name}:`, albumFetchErr);
      const errMsg = (albumFetchErr as Error).message || "";
      if (errMsg.includes("400") || errMsg.includes("403")) {
        return NextResponse.json({
          success: false,
          error: "Spotify API no permite acceso a los álbumes de este artista (400/403). La API de Spotify ha restringido algunos endpoints para apps sin autorización de usuario.",
        }, { status: 500 });
      }
      throw albumFetchErr;
    }

    let addedTracks = 0;
    let skippedTracks = 0;
    let errorsCount = 0;

    // Batch fetch albums (20 at a time) instead of one-by-one to reduce API calls
    const BATCH_SIZE = 20;
    const albumIds = albums.map(a => a.id);

    for (let i = 0; i < albumIds.length; i += BATCH_SIZE) {
      const batchIds = albumIds.slice(i, i + BATCH_SIZE);
      console.log(`[Sync] Fetching batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(albumIds.length / BATCH_SIZE)} (${batchIds.length} albums)`);

      try {
        const batchAlbums = await spotifyClient.getAlbums(batchIds);

        for (const fullAlbum of batchAlbums) {
          try {
            const albumData = fullAlbum as any;
            if (!albumData.tracks?.items) continue;

            for (const track of albumData.tracks.items as any[]) {
              try {
                // Check if track already exists
                const existing = await db
                  .select({ id: curatedTracks.id })
                  .from(curatedTracks)
                  .where(eq(curatedTracks.spotifyTrackId, track.id))
                  .limit(1);

                if (existing.length > 0) {
                  skippedTracks++;
                  continue;
                }

                // Add the track
                const newTrack = {
                  id: generateUUID(),
                  spotifyTrackId: track.id as string,
                  spotifyTrackUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
                  spotifyAlbumId: albumData.id as string,
                  name: track.name as string,
                  artistName: track.artists?.map((a: any) => a.name).join(", ") || channel.name,
                  artistIds: JSON.stringify(track.artists?.map((a: any) => a.id) || []),
                  albumName: albumData.name as string,
                  albumImageUrl: albumData.images?.[0]?.url ?? null,
                  durationMs: track.duration_ms ?? null,
                  previewUrl: track.preview_url ?? null,
                  releaseDate: albumData.release_date ?? null,
                  popularity: track.popularity ?? null,
                  explicit: Boolean(track.explicit),
                  curatedChannelId: id,
                  isAvailableForPlaylist: true,
                  isFeatured: false,
                };

                await db.insert(curatedTracks).values(newTrack);
                addedTracks++;
              } catch (trackErr) {
                console.error(`[Sync] Error inserting track ${track.id}:`, trackErr);
                errorsCount++;
              }
            }
          } catch (albumErr) {
            console.error(`[Sync] Error processing album ${fullAlbum.name}:`, albumErr);
            errorsCount++;
          }
        }

        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < albumIds.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (batchErr) {
        console.error(`[Sync] Error fetching batch starting at ${i}:`, batchErr);
        errorsCount++;
        // Fallback: try albums one by one for this batch
        for (const albumId of batchIds) {
          try {
            const fullAlbum = await spotifyClient.getAlbum(albumId) as any;
            if (!fullAlbum.tracks?.items) continue;

            for (const track of fullAlbum.tracks.items as any[]) {
              try {
                const existing = await db
                  .select({ id: curatedTracks.id })
                  .from(curatedTracks)
                  .where(eq(curatedTracks.spotifyTrackId, track.id))
                  .limit(1);

                if (existing.length > 0) {
                  skippedTracks++;
                  continue;
                }

                const newTrack = {
                  id: generateUUID(),
                  spotifyTrackId: track.id as string,
                  spotifyTrackUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
                  spotifyAlbumId: fullAlbum.id as string,
                  name: track.name as string,
                  artistName: track.artists?.map((a: any) => a.name).join(", ") || channel.name,
                  artistIds: JSON.stringify(track.artists?.map((a: any) => a.id) || []),
                  albumName: fullAlbum.name as string,
                  albumImageUrl: fullAlbum.images?.[0]?.url ?? null,
                  durationMs: track.duration_ms ?? null,
                  previewUrl: track.preview_url ?? null,
                  releaseDate: fullAlbum.release_date ?? null,
                  popularity: track.popularity ?? null,
                  explicit: Boolean(track.explicit),
                  curatedChannelId: id,
                  isAvailableForPlaylist: true,
                  isFeatured: false,
                };

                await db.insert(curatedTracks).values(newTrack);
                addedTracks++;
              } catch (trackErr) {
                errorsCount++;
              }
            }
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (err) {
            errorsCount++;
          }
        }
      }
    }

    // Refresh artist metadata from Spotify (popularity, followers, image, genres)
    const metadataUpdates: Record<string, unknown> = {
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };
    try {
      const artistInfo = await spotifyClient.getArtist(channel.spotifyArtistId);
      metadataUpdates.name = artistInfo.name;
      metadataUpdates.imageUrl = artistInfo.images?.[0]?.url ?? channel.imageUrl;
      metadataUpdates.genres = artistInfo.genres?.length ? JSON.stringify(artistInfo.genres) : channel.genres;
      metadataUpdates.popularity = artistInfo.popularity ?? channel.popularity;
      metadataUpdates.followers = artistInfo.followers?.total ?? channel.followers;
    } catch (err) {
      console.warn(`[Sync] Could not refresh artist metadata for ${channel.name}:`, err);
    }

    await db
      .update(curatedSpotifyChannels)
      .set(metadataUpdates)
      .where(eq(curatedSpotifyChannels.id, id));

    const message = errorsCount > 0
      ? `Sincronizado: ${addedTracks} tracks nuevos de ${albums.length} álbumes (${errorsCount} errores)`
      : `Sincronizado: ${addedTracks} tracks nuevos de ${albums.length} álbumes`;

    return NextResponse.json({
      success: true,
      data: {
        albumsProcessed: albums.length,
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
