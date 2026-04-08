import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { playlistTracks, curatedPlaylists } from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Fallback playlists for backwards compatibility if table doesn't exist
const FALLBACK_PLAYLISTS = [
  { id: "gran-reserva", name: "Gran Reserva", slug: "gran-reserva", description: "Los mejores tracks del roster" },
  { id: "weekly-picks", name: "Picks de la Semana", slug: "picks-de-la-semana", description: "Selección semanal" },
  { id: "new-releases", name: "Nuevos Lanzamientos", slug: "nuevos-lanzamientos", description: "Lo más reciente" },
  { id: "classics", name: "Clásicos", slug: "clasicos", description: "Tracks clásicos del crew" },
  { id: "collaborations", name: "Colaboraciones", slug: "colaboraciones", description: "Featurings y colaboraciones" },
];

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

      // Get playlist info
      let playlist = null;
      try {
        const [pl] = await db
          .select()
          .from(curatedPlaylists)
          .where(eq(curatedPlaylists.id, playlistId))
          .limit(1);
        playlist = pl || FALLBACK_PLAYLISTS.find(p => p.id === playlistId);
      } catch {
        playlist = FALLBACK_PLAYLISTS.find(p => p.id === playlistId);
      }

      return NextResponse.json({
        success: true,
        data: tracks,
        playlist,
      });
    }

    // Get all playlists from database
    let playlists: any[] = [];
    try {
      playlists = await db
        .select()
        .from(curatedPlaylists)
        .where(eq(curatedPlaylists.isActive, true))
        .orderBy(desc(curatedPlaylists.priority), asc(curatedPlaylists.name));
    } catch {
      // Table might not exist yet, use fallback
      playlists = FALLBACK_PLAYLISTS;
    }

    // If no playlists in DB, use fallback
    if (playlists.length === 0) {
      playlists = FALLBACK_PLAYLISTS;
    }

    // Get track counts
    const allTracks = await db.select().from(playlistTracks);

    const playlistsWithCounts = playlists.map(playlist => {
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

// POST - Create new playlist OR Add track to playlist
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json();

    // Check if this is a playlist creation or track addition
    if (body.createPlaylist) {
      // CREATE NEW PLAYLIST
      const { name, description } = body;

      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: "El nombre es requerido" },
          { status: 400 }
        );
      }

      const id = generateUUID();
      const slug = slugify(name);

      const newPlaylist = {
        id,
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        coverImageUrl: null,
        isPublic: true,
        isActive: true,
        priority: 0,
      };

      await db.insert(curatedPlaylists).values(newPlaylist);

      return NextResponse.json({
        success: true,
        data: newPlaylist,
        message: `Playlist "${name}" creada`,
      });
    }

    // ADD TRACK TO PLAYLIST
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

    // Get playlist name
    let playlistName = null;
    try {
      const [playlist] = await db
        .select()
        .from(curatedPlaylists)
        .where(eq(curatedPlaylists.id, playlistId))
        .limit(1);
      playlistName = playlist?.name || null;
    } catch {
      playlistName = FALLBACK_PLAYLISTS.find(p => p.id === playlistId)?.name || null;
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
      message: `"${trackName}" added to ${playlistName}`,
    });
  } catch (error) {
    console.error("[Playlists API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error processing request" },
      { status: 500 }
    );
  }
}

// PUT - Update playlist
export async function PUT(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { id, name, description, isActive, priority } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de playlist requerido" },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
      updateData.slug = slugify(name);
    }
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (priority !== undefined) updateData.priority = priority;

    await db
      .update(curatedPlaylists)
      .set(updateData)
      .where(eq(curatedPlaylists.id, id));

    // Also update playlist name in tracks
    if (name !== undefined) {
      await db
        .update(playlistTracks)
        .set({ playlistName: name.trim() })
        .where(eq(playlistTracks.playlistId, id));
    }

    return NextResponse.json({
      success: true,
      message: "Playlist actualizada",
    });
  } catch (error) {
    console.error("[Playlists API] Error updating playlist:", error);
    return NextResponse.json(
      { success: false, error: "Error updating playlist" },
      { status: 500 }
    );
  }
}

// DELETE - Delete playlist
export async function DELETE(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get("id");

    if (!playlistId) {
      return NextResponse.json(
        { success: false, error: "ID de playlist requerido" },
        { status: 400 }
      );
    }

    // Delete all tracks in the playlist first
    await db
      .delete(playlistTracks)
      .where(eq(playlistTracks.playlistId, playlistId));

    // Delete the playlist
    await db
      .delete(curatedPlaylists)
      .where(eq(curatedPlaylists.id, playlistId));

    return NextResponse.json({
      success: true,
      message: "Playlist eliminada",
    });
  } catch (error) {
    console.error("[Playlists API] Error deleting playlist:", error);
    return NextResponse.json(
      { success: false, error: "Error deleting playlist" },
      { status: 500 }
    );
  }
}
