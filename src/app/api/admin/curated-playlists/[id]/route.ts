import { type NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedPlaylists, playlistTracks } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET - Get a single curated playlist with details and track count
export async function GET(
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

    // Get track count
    const tracks = await db
      .select()
      .from(playlistTracks)
      .where(eq(playlistTracks.playlistId, id));

    const activeTrackCount = tracks.filter((t) => t.isActive).length;

    return NextResponse.json({
      success: true,
      data: {
        ...playlist,
        trackCount: activeTrackCount,
        tracks: tracks.sort((a, b) => a.position - b.position),
      },
    });
  } catch (error) {
    console.error("[Curated Playlists API] Error getting playlist:", error);
    return NextResponse.json(
      { success: false, error: "Error fetching playlist" },
      { status: 500 }
    );
  }
}

// PUT - Update playlist metadata
export async function PUT(
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
    const body = await request.json();

    // Check if playlist exists
    const [existing] = await db
      .select()
      .from(curatedPlaylists)
      .where(eq(curatedPlaylists.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Playlist not found" },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.slug !== undefined) updates.slug = body.slug;
    if (body.description !== undefined) updates.description = body.description || null;
    if (body.coverImageUrl !== undefined) updates.coverImageUrl = body.coverImageUrl || null;
    if (body.coverColor !== undefined) updates.coverColor = body.coverColor || null;
    if (body.spotifyPlaylistId !== undefined) updates.spotifyPlaylistId = body.spotifyPlaylistId || null;
    if (body.spotifyPlaylistUrl !== undefined) updates.spotifyPlaylistUrl = body.spotifyPlaylistUrl || null;
    if (body.isPublic !== undefined) updates.isPublic = body.isPublic;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.priority !== undefined) updates.priority = body.priority;

    // Always update the timestamp when making changes
    updates.updatedAt = new Date();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    // Check slug uniqueness if slug is being updated
    if (updates.slug && updates.slug !== existing.slug) {
      const [slugConflict] = await db
        .select()
        .from(curatedPlaylists)
        .where(eq(curatedPlaylists.slug, updates.slug as string))
        .limit(1);

      if (slugConflict) {
        return NextResponse.json(
          { success: false, error: "A playlist with this slug already exists" },
          { status: 409 }
        );
      }
    }

    await db
      .update(curatedPlaylists)
      .set(updates)
      .where(eq(curatedPlaylists.id, id));

    // Fetch updated playlist
    const [updated] = await db
      .select()
      .from(curatedPlaylists)
      .where(eq(curatedPlaylists.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Playlist updated successfully",
    });
  } catch (error) {
    console.error("[Curated Playlists API] Error updating playlist:", error);
    return NextResponse.json(
      { success: false, error: "Error updating playlist" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a curated playlist
export async function DELETE(
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

    // Check if playlist exists
    const [existing] = await db
      .select()
      .from(curatedPlaylists)
      .where(eq(curatedPlaylists.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Playlist not found" },
        { status: 404 }
      );
    }

    // Delete playlist tracks first
    await db
      .delete(playlistTracks)
      .where(eq(playlistTracks.playlistId, id));

    // Delete the playlist
    await db
      .delete(curatedPlaylists)
      .where(eq(curatedPlaylists.id, id));

    return NextResponse.json({
      success: true,
      message: `Playlist "${existing.name}" deleted successfully`,
    });
  } catch (error) {
    console.error("[Curated Playlists API] Error deleting playlist:", error);
    return NextResponse.json(
      { success: false, error: "Error deleting playlist" },
      { status: 500 }
    );
  }
}
