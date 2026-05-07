import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { playlistTracks, curatedPlaylists } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const DEFAULT_COVER_COLORS = [
  "#f97316", "#22c55e", "#3b82f6", "#8b5cf6", "#eab308",
];

// Fallback playlists with placeholder Spotify IDs (admin can replace via admin panel)
const FALLBACK_PLAYLISTS: Array<{ id: string; name: string; description: string; coverColor: string; spotifyPlaylistId: string | null; spotifyPlaylistUrl: string | null; trackCount?: number }> = [
  { id: "gran-reserva", name: "Gran Reserva", description: "Los mejores tracks del roster", coverColor: "#f97316", spotifyPlaylistId: "2y0Z7WdObJY1IvCLCXwUez", spotifyPlaylistUrl: "https://open.spotify.com/playlist/2y0Z7WdObJY1IvCLCXwUez" },
  { id: "weekly-picks", name: "Picks de la Semana", description: "Selección semanal", coverColor: "#22c55e", spotifyPlaylistId: null, spotifyPlaylistUrl: null },
  { id: "new-releases", name: "Nuevos Lanzamientos", description: "Lo más reciente", coverColor: "#3b82f6", spotifyPlaylistId: null, spotifyPlaylistUrl: null },
  { id: "classics", name: "Clásicos", description: "Tracks clásicos del crew", coverColor: "#8b5cf6", spotifyPlaylistId: null, spotifyPlaylistUrl: null },
  { id: "collaborations", name: "Colaboraciones", description: "Featurings y colaboraciones", coverColor: "#eab308", spotifyPlaylistId: null, spotifyPlaylistUrl: null },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get("id");

    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: playlistId ? { id: playlistId, name: "", description: "", tracks: [], trackCount: 0 } : FALLBACK_PLAYLISTS,
      });
    }

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

    // Also filter by isActive
    if (!useFallback) {
      dbPlaylistRows = dbPlaylistRows.filter(p => p.isActive !== false);
    }

    if (dbPlaylistRows.length === 0) {
      useFallback = true;
    }

    const playlistList = useFallback
      ? FALLBACK_PLAYLISTS
      : dbPlaylistRows.map((p, i) => ({
          id: p.id,
          name: p.name,
          description: p.description || "",
          coverColor: p.coverColor || DEFAULT_COVER_COLORS[i % DEFAULT_COVER_COLORS.length],
          coverImageUrl: p.coverImageUrl || null,
          spotifyPlaylistId: p.spotifyPlaylistId || null,
          spotifyPlaylistUrl: p.spotifyPlaylistUrl || null,
          trackCount: p.trackCount || 0,
        }));

    if (playlistId) {
      const playlist = playlistList.find((p) => p.id === playlistId);
      if (!playlist) {
        return NextResponse.json(
          { success: false, error: "Playlist not found" },
          { status: 404 }
        );
      }

      // Try to get tracks from DB, but don't fail if empty
      let tracks: any[] = [];
      try {
        tracks = await db
          .select()
          .from(playlistTracks)
          .where(eq(playlistTracks.playlistId, playlistId))
          .orderBy(asc(playlistTracks.position));
      } catch {
        // Table may not exist or be empty
      }

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
          trackCount: tracks.length || playlist.trackCount || 0,
        },
      });
    }

    // Return all playlists - DON'T filter out empty ones
    // Get track counts from DB for non-fallback playlists
    let allTracks: any[] = [];
    if (!useFallback) {
      try {
        allTracks = await db.select().from(playlistTracks);
      } catch {
        // ignore
      }
    }

    const playlistsWithCounts = playlistList.map((playlist) => {
      const count = useFallback
        ? playlist.trackCount || 0
        : allTracks.filter((t) => t.playlistId === playlist.id && t.isActive).length;
      return {
        ...playlist,
        trackCount: count || playlist.trackCount || 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: playlistsWithCounts,
    });
  } catch (error) {
    console.error("[Public Playlists API] Error:", error);
    return NextResponse.json({
      success: true,
      data: FALLBACK_PLAYLISTS,
    });
  }
}
