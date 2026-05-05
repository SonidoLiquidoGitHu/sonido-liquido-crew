import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels, curatedTracks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { spotifyClient } from "@/lib/clients/spotify";
import { generateUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";

// POST - Fetch top tracks for an existing channel
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

    // Fetch top tracks from Spotify
    console.log(`[Top Tracks] Fetching top tracks for ${channel.name} (${channel.spotifyArtistId})...`);
    const topTracks = await spotifyClient.getArtistTopTracks(channel.spotifyArtistId);
    console.log(`[Top Tracks] Got ${topTracks?.length ?? 0} tracks from Spotify`);

    if (!topTracks || !Array.isArray(topTracks) || topTracks.length === 0) {
      return NextResponse.json({
        success: true,
        data: { tracksAdded: 0, tracksSkipped: 0, totalTopTracks: 0 },
        message: "No se encontraron tracks recientes para este artista. Intenta 'Sincronizar Todo' para obtener todos los tracks de sus álbumes.",
      });
    }

    let addedTracks = 0;
    let skippedTracks = 0;

    for (const track of topTracks) {
      if (!track?.id) {
        console.warn('[Top Tracks] Skipping track with no ID:', track);
        continue;
      }

      try {
        // Check if track already exists
        const existing = await db
          .select()
          .from(curatedTracks)
          .where(eq(curatedTracks.spotifyTrackId, track.id))
          .limit(1);

        if (existing.length > 0) {
          // Mark existing track as featured if it's not already
          if (!existing[0].isFeatured) {
            await db
              .update(curatedTracks)
              .set({ isFeatured: true, updatedAt: new Date() })
              .where(eq(curatedTracks.id, existing[0].id));
          }
          skippedTracks++;
          continue;
        }

        // Add the track as featured
        const newTrack = {
          id: generateUUID(),
          spotifyTrackId: track.id,
          spotifyTrackUrl: (track as any).external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
          spotifyAlbumId: (track as any).album?.id || null,
          name: track.name || 'Unknown',
          artistName: (track as any).artists?.map((a: any) => a.name).join(", ") || channel.name,
          artistIds: JSON.stringify((track as any).artists?.map((a: any) => a.id) || []),
          albumName: (track as any).album?.name || null,
          albumImageUrl: (track as any).album?.images?.[0]?.url ?? null,
          durationMs: track.duration_ms ?? null,
          previewUrl: track.preview_url ?? null,
          releaseDate: (track as any).album?.release_date ?? null,
          popularity: (track as any).popularity ?? null,
          explicit: Boolean((track as any).explicit),
          curatedChannelId: id,
          isAvailableForPlaylist: true,
          isFeatured: true, // Top tracks are featured by default
        };

        await db.insert(curatedTracks).values(newTrack);
        addedTracks++;
      } catch (trackErr) {
        console.error(`[Top Tracks] Error processing track ${track?.id}:`, trackErr);
        // Continue with other tracks
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        tracksAdded: addedTracks,
        tracksSkipped: skippedTracks,
        totalTopTracks: topTracks.length,
      },
      message: `${addedTracks > 0 ? `${addedTracks} top tracks nuevos agregados` : 'Top tracks ya existían'}${skippedTracks > 0 ? ` (${skippedTracks} marcados como destacados)` : ''}`,
    });
  } catch (error) {
    console.error("[Curated Channels API] Error fetching top tracks:", error);
    const errorMsg = error instanceof Error ? error.message : "Error fetching top tracks";
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
