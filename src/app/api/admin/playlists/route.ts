import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { playlistTracks, curatedPlaylists } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

      // Get playlist info from DB
      const playlistRows = await db
        .select()
        .from(curatedPlaylists)
        .where(eq(curatedPlaylists.id, playlistId))
        .limit(1);

      const playlist = playlistRows[0] || null;

      return NextResponse.json({
        success: true,
        data: tracks,
        playlist: playlist ? {
          id: playlist.id,
          name: playlist.name,
          description: playlist.description,
        } : getFallbackPlaylist(playlistId),
      });
    }

    // Get all playlists with track counts
    let dbPlaylists = await db
      .select()
      .from(curatedPlaylists)
      .orderBy(desc(curatedPlaylists.priority));

    // If no playlists in DB, use fallback
    if (!dbPlaylists || dbPlaylists.length === 0) {
      return NextResponse.json({
        success: true,
        data: getFallbackPlaylists().map(p => ({ id: p.id, name: p.name, description: p.description, trackCount: 0 })),
      });
    }

    const allTracks = await db.select().from(playlistTracks);

    const playlistsWithCounts = dbPlaylists.map(playlist => {
      const playlistTracksFiltered = allTracks.filter(t => t.playlistId === playlist.id && t.isActive);
      return {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description || "",
        trackCount: playlistTracksFiltered.length,
      };
    });

    return NextResponse.json({
      success: true,
      data: playlistsWithCounts,
    });
  } catch (error) {
    console.error("[Playlists API] Error:", error);

    // If curated_playlists table doesn't exist, return fallback
    const { searchParams } = new URL(request.url);
    const playlistIdParam = searchParams.get("playlistId");

    if (playlistIdParam) {
      return NextResponse.json({
        success: true,
        data: [],
        playlist: getFallbackPlaylist(playlistIdParam),
      });
    }

    return NextResponse.json({
      success: true,
      data: getFallbackPlaylists().map(p => ({ id: p.id, name: p.name, description: p.description, trackCount: 0 })),
    });
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

    // Get playlist name from DB or fallback
    let playlistName: string | null = null;
    try {
      const playlistRows = await db
        .select()
        .from(curatedPlaylists)
        .where(eq(curatedPlaylists.id, playlistId))
        .limit(1);
      playlistName = playlistRows[0]?.name || null;
    } catch {
      const fallback = getFallbackPlaylists().find(p => p.id === playlistId);
      playlistName = fallback?.name || null;
    }

    const newTrack = {
      id: generateUUID(),
      playlistId,
      playlistName,
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
      message: `"${trackName}" added to ${playlistName || playlistId}`,
    });
  } catch (error) {
    console.error("[Playlists API] Error adding track:", error);
    return NextResponse.json(
      { success: false, error: "Error adding track to playlist" },
      { status: 500 }
    );
  }
}

// Fallback hardcoded playlists (used if curated_playlists table is empty)
function getFallbackPlaylists() {
  return [
    { id: "gran-reserva", name: "Gran Reserva", slug: "gran-reserva", description: "Los mejores tracks del roster" },
    { id: "weekly-picks", name: "Picks de la Semana", slug: "picks-de-la-semana", description: "Selección semanal" },
    { id: "new-releases", name: "Nuevos Lanzamientos", slug: "nuevos-lanzamientos", description: "Lo más reciente" },
    { id: "classics", name: "Clásicos", slug: "clasicos", description: "Tracks clásicos del crew" },
    { id: "collaborations", name: "Colaboraciones", slug: "colaboraciones", description: "Featurings y colaboraciones" },
  ];
}

function getFallbackPlaylist(playlistId: string) {
  return getFallbackPlaylists().find(p => p.id === playlistId) || null;
}
