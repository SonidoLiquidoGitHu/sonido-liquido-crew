// ===========================================
// ADMIN API: IMPORT SPOTIFY PLAYLIST
// POST — Import a playlist from Spotify (creates curated_playlist + playlist_tracks)
// Uses server-side Spotify Client Credentials (no user OAuth needed for read-only)
// ===========================================

import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedPlaylists, playlistTracks, curatedTracks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";
import { spotifyClient, SpotifyClient } from "@/lib/clients/spotify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST — Import a Spotify playlist
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { spotifyUrl, customName } = body;

    if (!spotifyUrl || !spotifyUrl.trim()) {
      return NextResponse.json(
        { success: false, error: "Spotify playlist URL is required" },
        { status: 400 }
      );
    }

    // Extract playlist ID from URL
    const playlistId = SpotifyClient.extractId(spotifyUrl.trim());
    if (!playlistId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not extract playlist ID from URL. Please use a valid Spotify playlist URL (e.g. https://open.spotify.com/playlist/...)",
        },
        { status: 400 }
      );
    }

    console.log(`[Spotify Import] Importing playlist ${playlistId}...`);

    // Fetch playlist metadata + all tracks using Client Credentials flow
    // (no user OAuth needed — public playlists are readable with client credentials)
    const playlistData = await spotifyClient.getPlaylistTracks(playlistId);

    if (!playlistData.tracks || playlistData.tracks.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This playlist has no tracks, or it is private and cannot be accessed with the server's Spotify credentials. Make the playlist public on Spotify first, then try again.",
        },
        { status: 400 }
      );
    }

    const playlistName = customName?.trim() || playlistData.name;
    const playlistSlug = slugify(playlistName);

    // Check for slug uniqueness
    const existing = await db
      .select()
      .from(curatedPlaylists)
      .where(eq(curatedPlaylists.slug, playlistSlug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `A playlist with the slug "${playlistSlug}" already exists. Try a different custom name.`,
        },
        { status: 409 }
      );
    }

    // Use Spotify's playlist cover image if available
    const coverImageUrl =
      playlistData.images?.[0]?.url || null;
    const spotifyPlaylistUrl =
      playlistData.external_urls?.spotify || spotifyUrl.trim();

    // Create the curated playlist
    const newPlaylistId = generateUUID();
    const newPlaylist = {
      id: newPlaylistId,
      name: playlistName,
      slug: playlistSlug,
      description: playlistData.description || `Imported from Spotify: ${playlistData.name}`,
      coverImageUrl,
      coverColor: "#1DB954", // Spotify green as default
      spotifyPlaylistId: playlistId,
      spotifyPlaylistUrl,
      isPublic: true,
      isActive: true,
      priority: 0,
      trackCount: playlistData.tracks.length,
    };

    await db.insert(curatedPlaylists).values(newPlaylist);

    console.log(
      `[Spotify Import] Created playlist "${playlistName}" (${newPlaylistId}) with ${playlistData.tracks.length} tracks`
    );

    // Insert playlist_tracks entries
    let tracksAdded = 0;
    let tracksSkipped = 0;
    const trackInsertBatch = [];

    for (const track of playlistData.tracks) {
      // Skip tracks without essential data
      if (!track.spotifyTrackId || !track.trackName) {
        tracksSkipped++;
        continue;
      }

      const trackId = generateUUID();
      trackInsertBatch.push({
        id: trackId,
        playlistId: newPlaylistId,
        playlistName: playlistName,
        spotifyTrackId: track.spotifyTrackId,
        curatedTrackId: null, // Will be linked below if a matching curated_track exists
        trackName: track.trackName,
        artistName: track.artistName,
        albumImageUrl: track.albumImageUrl,
        position: track.position,
        isActive: true,
        addedBy: "spotify-import",
      });

      tracksAdded++;
    }

    // Insert in batches of 50 to avoid SQL too long errors
    const batchSize = 50;
    for (let i = 0; i < trackInsertBatch.length; i += batchSize) {
      const batch = trackInsertBatch.slice(i, i + batchSize);
      await db.insert(playlistTracks).values(batch);
    }

    // Try to link playlist_tracks to existing curated_tracks (best-effort, non-blocking)
    try {
      let linkedCount = 0;
      for (const track of playlistData.tracks) {
        if (!track.spotifyTrackId) continue;

        // Check if a curated_track with this spotifyTrackId already exists
        const existingTrack = await db
          .select({ id: curatedTracks.id })
          .from(curatedTracks)
          .where(eq(curatedTracks.spotifyTrackId, track.spotifyTrackId))
          .limit(1);

        if (existingTrack.length > 0) {
          // Update the playlist_track to reference the curated_track
          await db
            .update(playlistTracks)
            .set({ curatedTrackId: existingTrack[0].id })
            .where(eq(playlistTracks.spotifyTrackId, track.spotifyTrackId));
          linkedCount++;
        }
      }
      if (linkedCount > 0) {
        console.log(
          `[Spotify Import] Linked ${linkedCount} playlist tracks to existing curated tracks`
        );
      }
    } catch (linkErr) {
      // Non-fatal: linking is best-effort
      console.warn(
        "[Spotify Import] Could not link playlist tracks to curated tracks:",
        linkErr
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        playlist: newPlaylist,
        tracksAdded,
        tracksSkipped,
      },
      message: `Playlist "${playlistName}" importada exitosamente con ${tracksAdded} tracks desde Spotify.${
        tracksSkipped > 0 ? ` (${tracksSkipped} tracks omitidos por datos incompletos)` : ""
      }`,
    });
  } catch (error) {
    console.error("[Spotify Import] Error:", error);
    const message =
      error instanceof Error ? error.message : "Error importing Spotify playlist";

    // Provide helpful error messages for common Spotify API errors
    if (message.includes("401") || message.includes("403")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No se pudo acceder a esta playlist de Spotify. Puede ser privada o el servidor no tiene credenciales válidas. Asegúrate de que la playlist sea pública en Spotify.",
        },
        { status: 403 }
      );
    }

    if (message.includes("404")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Playlist no encontrada en Spotify. Verifica que la URL sea correcta.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Error al importar playlist: ${message}` },
      { status: 500 }
    );
  }
}
