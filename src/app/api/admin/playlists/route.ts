import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { playlistTracks } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Predefined playlists
const PLAYLISTS = [
  { id: "gran-reserva", name: "Gran Reserva", description: "Los mejores tracks del roster" },
  { id: "weekly-picks", name: "Picks de la Semana", description: "Selección semanal" },
  { id: "new-releases", name: "Nuevos Lanzamientos", description: "Lo más reciente" },
  { id: "classics", name: "Clásicos", description: "Tracks clásicos del crew" },
  { id: "collaborations", name: "Colaboraciones", description: "Featurings y colaboraciones" },
] as const;

// GET - List all playlists with track counts
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get("playlistId");

    if (playlistId) {
      // Get tracks for a specific playlist
      const tracks = await db
        .select()
        .from(playlistTracks)
        .where(eq(playlistTracks.playlistId, playlistId))
        .orderBy(asc(playlistTracks.position));

      return NextResponse.json({
        success: true,
        data: tracks,
        playlist: PLAYLISTS.find(p => p.id === playlistId),
      });
    }

    // Get all playlists with track counts
    const allTracks = await db.select().from(playlistTracks);

    const playlistsWithCounts = PLAYLISTS.map(playlist => {
      const playlistTracksFiltered = allTracks.filter(t => t.playlistId === playlist.id && t.isActive);
      return {
        ...playlist,
        trackCount: playlistTracksFiltered.length,
      };
    });

    return NextResponse.json({
      success: true,
      data: playlistsWithCounts,
    });
  } catch (error) {
    console.error("[Playlists API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error fetching playlists" },
      { status: 500 }
    );
  }
}

// POST - Add track to playlist
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json();
    const {
      playlistId,
      spotifyTrackId,
      curatedTrackId,
      trackName,
      artistName,
      albumImageUrl,
    } = body;

    if (!playlistId || !spotifyTrackId || !trackName || !artistName) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if already exists
    const existingTracks = await db
      .select()
      .from(playlistTracks)
      .where(eq(playlistTracks.playlistId, playlistId));

    const alreadyInPlaylist = existingTracks.find(
      t => t.spotifyTrackId === spotifyTrackId && t.isActive
    );

    if (alreadyInPlaylist) {
      return NextResponse.json(
        { success: false, error: "Track already in playlist" },
        { status: 409 }
      );
    }

    // Get the next position
    const maxPosition = Math.max(0, ...existingTracks.map(t => t.position));

    const playlist = PLAYLISTS.find(p => p.id === playlistId);

    const newTrack = {
      id: generateUUID(),
      playlistId,
      playlistName: playlist?.name || null,
      spotifyTrackId,
      curatedTrackId: curatedTrackId || null,
      trackName,
      artistName,
      albumImageUrl: albumImageUrl || null,
      position: maxPosition + 1,
      isActive: true,
    };

    await db.insert(playlistTracks).values(newTrack);

    return NextResponse.json({
      success: true,
      data: newTrack,
      message: `"${trackName}" added to ${playlist?.name}`,
    });
  } catch (error) {
    console.error("[Playlists API] Error adding track:", error);
    return NextResponse.json(
      { success: false, error: "Error adding track to playlist" },
      { status: 500 }
    );
  }
}
