import { type NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedPlaylists, playlistTracks, curatedTracks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { spotifyClient, SpotifyClient } from "@/lib/clients/spotify";
import { generateUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";

// POST - Sync tracks from a Spotify playlist into the local curated playlist
// Replaces all existing tracks with the ones from Spotify
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const { id } = await params;

    // Find the local playlist
    const [playlist] = await db
      .select()
      .from(curatedPlaylists)
      .where(eq(curatedPlaylists.id, id))
      .limit(1);

    if (!playlist) {
      return NextResponse.json(
        { success: false, error: "Playlist not found" },
        { status: 404 }
      );
    }

    // Get Spotify playlist ID - from URL, from stored ID, or from request body
    const body = await request.json().catch(() => ({}));
    let spotifyPlaylistId = body.spotifyPlaylistId as string | undefined;

    if (!spotifyPlaylistId && playlist.spotifyPlaylistUrl) {
      spotifyPlaylistId = SpotifyClient.extractId(playlist.spotifyPlaylistUrl) || undefined;
    }

    if (!spotifyPlaylistId && playlist.spotifyPlaylistId) {
      spotifyPlaylistId = playlist.spotifyPlaylistId;
    }

    if (!spotifyPlaylistId && body.spotifyPlaylistUrl) {
      spotifyPlaylistId = SpotifyClient.extractId(body.spotifyPlaylistUrl) || undefined;
    }

    if (!spotifyPlaylistId) {
      return NextResponse.json(
        { success: false, error: "No Spotify playlist ID found. Set a Spotify Playlist URL first." },
        { status: 400 }
      );
    }

    // Check Spotify API is configured
    if (!spotifyClient.isConfigured()) {
      return NextResponse.json(
        { success: false, error: "Spotify API not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET." },
        { status: 503 }
      );
    }

    console.log(`[Spotify Sync] Fetching tracks for playlist "${playlist.name}" from Spotify ID: ${spotifyPlaylistId}`);

    // Fetch all tracks from Spotify
    const spotifyData = await spotifyClient.getPlaylistTracks(spotifyPlaylistId);

    if (!spotifyData.tracks.length) {
      return NextResponse.json(
        { success: false, error: "The Spotify playlist has no tracks or they could not be fetched." },
        { status: 400 }
      );
    }

    // Update playlist metadata from Spotify (name, description, cover, spotify fields)
    const playlistUpdates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Only auto-fill name/description/cover if they're currently empty or match defaults
    if (!playlist.description && spotifyData.description) {
      playlistUpdates.description = spotifyData.description;
    }
    if (!playlist.coverImageUrl && spotifyData.images?.[0]?.url) {
      playlistUpdates.coverImageUrl = spotifyData.images[0].url;
    }
    // Always update Spotify reference fields
    playlistUpdates.spotifyPlaylistId = spotifyPlaylistId;
    playlistUpdates.spotifyPlaylistUrl = spotifyData.external_urls?.spotify || `https://open.spotify.com/playlist/${spotifyPlaylistId}`;

    await db
      .update(curatedPlaylists)
      .set(playlistUpdates)
      .where(eq(curatedPlaylists.id, id));

    // Delete existing tracks for this playlist (full replace)
    await db
      .delete(playlistTracks)
      .where(eq(playlistTracks.playlistId, id));

    // Insert new tracks from Spotify
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const track of spotifyData.tracks) {
      try {
        // Try to find a matching curated track (for the curatedTrackId link)
        let curatedTrackId: string | null = null;
        try {
          const [matchingTrack] = await db
            .select({ id: curatedTracks.id })
            .from(curatedTracks)
            .where(eq(curatedTracks.spotifyTrackId, track.spotifyTrackId))
            .limit(1);
          curatedTrackId = matchingTrack?.id || null;
        } catch {
          // curated_tracks table may not have this track, that's fine
        }

        await db.insert(playlistTracks).values({
          id: generateUUID(),
          playlistId: id,
          playlistName: playlist.name,
          spotifyTrackId: track.spotifyTrackId,
          curatedTrackId,
          trackName: track.trackName,
          artistName: track.artistName,
          albumImageUrl: track.albumImageUrl,
          position: track.position,
          isActive: true,
        });
        added++;
      } catch (e: any) {
        if (e.message?.includes("UNIQUE constraint")) {
          skipped++;
        } else {
          errors.push(`Track "${track.trackName}": ${e.message}`);
        }
      }
    }

    console.log(`[Spotify Sync] Playlist "${playlist.name}": ${added} tracks added, ${skipped} skipped, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      message: `Synced ${added} tracks from Spotify playlist "${spotifyData.name}"`,
      results: {
        playlistName: spotifyData.name,
        tracksAdded: added,
        tracksSkipped: skipped,
        errors: errors.slice(0, 5), // Limit error list
        totalSpotifyTracks: spotifyData.tracks.length,
        metadataUpdated: Object.keys(playlistUpdates).length > 1, // more than just updatedAt
      },
    });
  } catch (error: any) {
    console.error("[Spotify Sync API] Error:", error);

    // Provide user-friendly error messages
    let errorMessage = error.message || "Error syncing playlist from Spotify";
    if (errorMessage.includes("403")) {
      errorMessage = "Spotify API returned 403. The playlist may be private or the API credentials lack access.";
    } else if (errorMessage.includes("404")) {
      errorMessage = "Spotify playlist not found. Check the playlist URL/ID.";
    } else if (errorMessage.includes("429")) {
      errorMessage = "Spotify API rate limit reached. Please try again in a few moments.";
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
