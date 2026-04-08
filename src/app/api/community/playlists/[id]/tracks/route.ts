import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { userPlaylists, userPlaylistTracks, playlistCollaborators } from "@/db/schema";
import { eq, and, desc, max } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// Helper to check permissions
async function checkPermissions(playlistId: string, email: string): Promise<{
  canAddTracks: boolean;
  canRemoveTracks: boolean;
  isOwner: boolean;
}> {
  // Check if owner
  const [playlist] = await db
    .select()
    .from(userPlaylists)
    .where(eq(userPlaylists.id, playlistId))
    .limit(1);

  if (!playlist) {
    return { canAddTracks: false, canRemoveTracks: false, isOwner: false };
  }

  if (playlist.ownerEmail === email) {
    return { canAddTracks: true, canRemoveTracks: true, isOwner: true };
  }

  // Check collaborator permissions
  const [collaborator] = await db
    .select()
    .from(playlistCollaborators)
    .where(
      and(
        eq(playlistCollaborators.playlistId, playlistId),
        eq(playlistCollaborators.email, email),
        eq(playlistCollaborators.isActive, true)
      )
    )
    .limit(1);

  if (collaborator && collaborator.acceptedAt) {
    return {
      canAddTracks: collaborator.canAddTracks ?? true,
      canRemoveTracks: collaborator.canRemoveTracks ?? false,
      isOwner: false,
    };
  }

  return { canAddTracks: false, canRemoveTracks: false, isOwner: false };
}

// GET - Get tracks for a playlist
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const tracks = await db
      .select()
      .from(userPlaylistTracks)
      .where(eq(userPlaylistTracks.playlistId, playlistId))
      .orderBy(userPlaylistTracks.position);

    return NextResponse.json({
      success: true,
      data: tracks.map((t) => ({
        id: t.trackId,
        internalId: t.id,
        type: t.trackType,
        title: t.trackTitle,
        artist: t.trackArtist,
        coverUrl: t.trackCoverUrl,
        duration: t.trackDuration,
        spotifyUri: t.spotifyUri,
        position: t.position,
        addedAt: t.addedAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[Playlist Tracks] Error fetching:", error);
    return NextResponse.json(
      { success: false, error: "Error al cargar tracks" },
      { status: 500 }
    );
  }
}

// POST - Add a track to the playlist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      email,
      trackType,
      trackId,
      trackTitle,
      trackArtist,
      trackCoverUrl,
      trackDuration,
      spotifyUri
    } = body;

    if (!email || !trackId || !trackTitle || !trackArtist) {
      return NextResponse.json(
        { success: false, error: "Email, trackId, título y artista son requeridos" },
        { status: 400 }
      );
    }

    // Check permissions
    const permissions = await checkPermissions(playlistId, email);

    if (!permissions.canAddTracks) {
      return NextResponse.json(
        { success: false, error: "No tienes permiso para agregar tracks" },
        { status: 403 }
      );
    }

    // Check if track already exists in playlist
    const [existing] = await db
      .select()
      .from(userPlaylistTracks)
      .where(
        and(
          eq(userPlaylistTracks.playlistId, playlistId),
          eq(userPlaylistTracks.trackId, trackId)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Este track ya está en la playlist" },
        { status: 400 }
      );
    }

    // Get max position
    const [maxPos] = await db
      .select({ maxPosition: max(userPlaylistTracks.position) })
      .from(userPlaylistTracks)
      .where(eq(userPlaylistTracks.playlistId, playlistId));

    const newPosition = (maxPos?.maxPosition ?? -1) + 1;

    // Add track
    const [track] = await db
      .insert(userPlaylistTracks)
      .values({
        id: generateUUID(),
        playlistId,
        trackType: trackType || "spotify",
        trackId,
        trackTitle,
        trackArtist,
        trackCoverUrl: trackCoverUrl || null,
        trackDuration: trackDuration || null,
        spotifyUri: spotifyUri || null,
        position: newPosition,
      })
      .returning();

    // Update playlist cover if first track
    if (newPosition === 0 && trackCoverUrl) {
      await db
        .update(userPlaylists)
        .set({ coverImageUrl: trackCoverUrl, updatedAt: new Date() })
        .where(eq(userPlaylists.id, playlistId));
    }

    // Update playlist timestamp
    await db
      .update(userPlaylists)
      .set({ updatedAt: new Date() })
      .where(eq(userPlaylists.id, playlistId));

    console.log(`[Playlist Tracks] Added: ${trackTitle} to ${playlistId} by ${email}`);

    return NextResponse.json({
      success: true,
      data: {
        id: track.trackId,
        internalId: track.id,
        type: track.trackType,
        title: track.trackTitle,
        artist: track.trackArtist,
        coverUrl: track.trackCoverUrl,
        duration: track.trackDuration,
        spotifyUri: track.spotifyUri,
        position: track.position,
      },
    });
  } catch (error) {
    console.error("[Playlist Tracks] Error adding:", error);
    return NextResponse.json(
      { success: false, error: "Error al agregar track" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a track from the playlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const trackInternalId = searchParams.get("trackId");
    const email = searchParams.get("email");

    if (!trackInternalId || !email) {
      return NextResponse.json(
        { success: false, error: "trackId y email son requeridos" },
        { status: 400 }
      );
    }

    // Check permissions
    const permissions = await checkPermissions(playlistId, email);

    if (!permissions.canRemoveTracks) {
      return NextResponse.json(
        { success: false, error: "No tienes permiso para eliminar tracks" },
        { status: 403 }
      );
    }

    // Delete track
    await db
      .delete(userPlaylistTracks)
      .where(
        and(
          eq(userPlaylistTracks.id, trackInternalId),
          eq(userPlaylistTracks.playlistId, playlistId)
        )
      );

    // Update playlist timestamp
    await db
      .update(userPlaylists)
      .set({ updatedAt: new Date() })
      .where(eq(userPlaylists.id, playlistId));

    console.log(`[Playlist Tracks] Removed: ${trackInternalId} from ${playlistId} by ${email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Playlist Tracks] Error removing:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar track" },
      { status: 500 }
    );
  }
}

// PUT - Reorder tracks
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { email, trackOrder } = body;

    if (!email || !trackOrder || !Array.isArray(trackOrder)) {
      return NextResponse.json(
        { success: false, error: "Email y trackOrder son requeridos" },
        { status: 400 }
      );
    }

    // Check permissions (need canAddTracks for reordering)
    const permissions = await checkPermissions(playlistId, email);

    if (!permissions.canAddTracks) {
      return NextResponse.json(
        { success: false, error: "No tienes permiso para reordenar tracks" },
        { status: 403 }
      );
    }

    // Update positions
    for (let i = 0; i < trackOrder.length; i++) {
      const trackId = trackOrder[i];
      await db
        .update(userPlaylistTracks)
        .set({ position: i })
        .where(
          and(
            eq(userPlaylistTracks.id, trackId),
            eq(userPlaylistTracks.playlistId, playlistId)
          )
        );
    }

    // Update playlist timestamp
    await db
      .update(userPlaylists)
      .set({ updatedAt: new Date() })
      .where(eq(userPlaylists.id, playlistId));

    console.log(`[Playlist Tracks] Reordered ${playlistId} by ${email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Playlist Tracks] Error reordering:", error);
    return NextResponse.json(
      { success: false, error: "Error al reordenar tracks" },
      { status: 500 }
    );
  }
}
