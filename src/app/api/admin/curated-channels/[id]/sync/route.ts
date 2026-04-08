import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels, curatedTracks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { spotifyClient, SpotifyRateLimitError } from "@/lib/clients/spotify";
import { generateUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";

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
    const albums = await spotifyClient.getAllArtistAlbums(channel.spotifyArtistId);

    let addedTracks = 0;
    let skippedTracks = 0;

    // For each album, get tracks
    for (const album of albums) {
      try {
        // Get full album details with tracks
        // The Spotify API returns tracks for full album requests
        const fullAlbum = await spotifyClient.getAlbum(album.id) as any;

        if (!fullAlbum.tracks?.items) continue;

        for (const track of fullAlbum.tracks.items as any[]) {
          // Check if track already exists
          const existing = await db
            .select()
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
            spotifyAlbumId: fullAlbum.id as string,
            name: track.name as string,
            artistName: track.artists?.map((a: any) => a.name).join(", ") || channel.name,
            artistIds: JSON.stringify(track.artists?.map((a: any) => a.id) || []),
            albumName: fullAlbum.name as string,
            albumImageUrl: fullAlbum.images?.[0]?.url || null,
            durationMs: track.duration_ms || null,
            previewUrl: track.preview_url || null,
            releaseDate: fullAlbum.release_date || null,
            popularity: track.popularity || null,
            explicit: Boolean(track.explicit),
            curatedChannelId: id,
            isAvailableForPlaylist: true,
            isFeatured: false,
          };

          await db.insert(curatedTracks).values(newTrack);
          addedTracks++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`[Sync] Error processing album ${album.name}:`, err);
        continue;
      }
    }

    // Update last synced timestamp
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
        albumsProcessed: albums.length,
        tracksAdded: addedTracks,
        tracksSkipped: skippedTracks,
      },
      message: `Synced ${addedTracks} new tracks from ${albums.length} albums`,
    });
  } catch (error) {
    console.error("[Curated Channels API] Error syncing channel:", error);

    // Handle rate limit errors with helpful message
    if (error instanceof SpotifyRateLimitError) {
      return NextResponse.json({
        success: false,
        error: error.message,
        rateLimited: true,
        retryAfterSeconds: error.retryAfterSeconds,
        hint: "Para resolver esto: 1) Crea una app en https://developer.spotify.com/dashboard 2) Agrega SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET en Netlify",
      }, { status: 429 });
    }

    return NextResponse.json(
      { success: false, error: "Error de conexión" },
      { status: 500 }
    );
  }
}
