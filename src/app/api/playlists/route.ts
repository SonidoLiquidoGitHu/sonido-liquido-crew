import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { playlistTracks, curatedTracks } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Predefined playlists (public info)
const PLAYLISTS = [
  {
    id: "gran-reserva",
    name: "Gran Reserva",
    description: "Los mejores tracks del roster",
    coverColor: "#f97316", // Orange
  },
  {
    id: "weekly-picks",
    name: "Picks de la Semana",
    description: "Selección semanal",
    coverColor: "#22c55e", // Green
  },
  {
    id: "new-releases",
    name: "Nuevos Lanzamientos",
    description: "Lo más reciente",
    coverColor: "#3b82f6", // Blue
  },
  {
    id: "classics",
    name: "Clásicos",
    description: "Tracks clásicos del crew",
    coverColor: "#8b5cf6", // Purple
  },
  {
    id: "collaborations",
    name: "Colaboraciones",
    description: "Featurings y colaboraciones",
    coverColor: "#eab308", // Yellow
  },
];

// GET - Get public playlists with track counts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get("id");

    if (!isDatabaseConfigured()) {
      // Return playlists with 0 tracks if DB not configured
      return NextResponse.json({
        success: true,
        data: playlistId
          ? { ...PLAYLISTS.find((p) => p.id === playlistId), tracks: [] }
          : PLAYLISTS.map((p) => ({ ...p, trackCount: 0 })),
      });
    }

    if (playlistId) {
      // Get specific playlist with tracks
      const playlist = PLAYLISTS.find((p) => p.id === playlistId);
      if (!playlist) {
        return NextResponse.json(
          { success: false, error: "Playlist not found" },
          { status: 404 }
        );
      }

      const tracks = await db
        .select()
        .from(playlistTracks)
        .where(eq(playlistTracks.playlistId, playlistId))
        .orderBy(asc(playlistTracks.position));

      return NextResponse.json({
        success: true,
        data: {
          ...playlist,
          tracks: tracks.map((t) => ({
            id: t.id,
            name: t.trackName,
            artist: t.artistName,
            albumImage: t.albumImageUrl,
            spotifyId: t.spotifyTrackId,
            position: t.position,
          })),
          trackCount: tracks.length,
        },
      });
    }

    // Get all playlists with track counts
    const allTracks = await db.select().from(playlistTracks);

    const playlistsWithCounts = PLAYLISTS.map((playlist) => {
      const count = allTracks.filter(
        (t) => t.playlistId === playlist.id && t.isActive
      ).length;
      return { ...playlist, trackCount: count };
    }).filter((p) => p.trackCount > 0); // Only show non-empty playlists

    return NextResponse.json({
      success: true,
      data: playlistsWithCounts,
    });
  } catch (error) {
    console.error("[Public Playlists API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error fetching playlists" },
      { status: 500 }
    );
  }
}
