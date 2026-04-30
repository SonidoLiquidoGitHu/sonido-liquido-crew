import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { playlistTracks, curatedPlaylists } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Default cover colors for playlists without one
const DEFAULT_COVER_COLORS = [
  "#f97316", // Orange
  "#22c55e", // Green
  "#3b82f6", // Blue
  "#8b5cf6", // Purple
  "#eab308", // Yellow
];

// Fallback hardcoded playlists (used if curated_playlists table is empty)
const FALLBACK_PLAYLISTS = [
  { id: "gran-reserva", name: "Gran Reserva", description: "Los mejores tracks del roster", coverColor: "#f97316" },
  { id: "weekly-picks", name: "Picks de la Semana", description: "Selección semanal", coverColor: "#22c55e" },
  { id: "new-releases", name: "Nuevos Lanzamientos", description: "Lo más reciente", coverColor: "#3b82f6" },
  { id: "classics", name: "Clásicos", description: "Tracks clásicos del crew", coverColor: "#8b5cf6" },
  { id: "collaborations", name: "Colaboraciones", description: "Featurings y colaboraciones", coverColor: "#eab308" },
];

// GET - Get public playlists with track counts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get("id");

    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: playlistId ? { id: playlistId, name: "", description: "", tracks: [], trackCount: 0 } : [],
      });
    }

    // Try to get playlists from the curated_playlists table
    let useFallback = false;
    let dbPlaylistRows: any[] = [];

    try {
      dbPlaylistRows = await db
        .select()
        .from(curatedPlaylists)
        .where(eq(curatedPlaylists.isPublic, true))
        .orderBy(desc(curatedPlaylists.priority));
    } catch {
      useFallback = true;
    }

    if (dbPlaylistRows.length === 0) {
      useFallback = true;
    }

    // Build unified playlist list
    const playlistList = useFallback
      ? FALLBACK_PLAYLISTS
      : dbPlaylistRows.map((p, i) => ({
          id: p.id,
          name: p.name,
          description: p.description || "",
          coverColor: p.coverColor || DEFAULT_COVER_COLORS[i % DEFAULT_COVER_COLORS.length],
        }));

    if (playlistId) {
      // Get specific playlist with tracks
      const playlist = playlistList.find((p) => p.id === playlistId);
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

    const playlistsWithCounts = playlistList
      .map((playlist) => {
        const count = allTracks.filter(
          (t) => t.playlistId === playlist.id && t.isActive
        ).length;
        return {
          ...playlist,
          trackCount: count,
        };
      })
      .filter((p) => p.trackCount > 0); // Only show non-empty playlists

    return NextResponse.json({
      success: true,
      data: playlistsWithCounts,
    });
  } catch (error) {
    console.error("[Public Playlists API] Error:", error);

    // If DB query fails (e.g., table doesn't exist), return empty
    return NextResponse.json({
      success: true,
      data: [],
    });
  }
}
