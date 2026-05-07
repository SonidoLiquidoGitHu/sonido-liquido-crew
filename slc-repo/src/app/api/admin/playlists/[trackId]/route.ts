import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { playlistTracks } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// PUT - Update a playlist track (position, active status)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const { trackId } = await params;
    const body = await request.json();

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const { position, isActive } = body;

    // Check if exists
    const [existing] = await db
      .select()
      .from(playlistTracks)
      .where(eq(playlistTracks.id, trackId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Track not found in playlist" },
        { status: 404 }
      );
    }

    // Update
    const updates: Record<string, any> = {};

    if (position !== undefined) updates.position = position;
    if (isActive !== undefined) updates.isActive = isActive;

    if (Object.keys(updates).length > 0) {
      await db
        .update(playlistTracks)
        .set(updates)
        .where(eq(playlistTracks.id, trackId));
    }

    return NextResponse.json({
      success: true,
      message: "Track updated successfully",
    });
  } catch (error) {
    console.error("[Playlists API] Error updating track:", error);
    return NextResponse.json(
      { success: false, error: "Error updating track" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a track from playlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  try {
    const { trackId } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    // Check if exists
    const [existing] = await db
      .select()
      .from(playlistTracks)
      .where(eq(playlistTracks.id, trackId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Track not found in playlist" },
        { status: 404 }
      );
    }

    // Delete
    await db
      .delete(playlistTracks)
      .where(eq(playlistTracks.id, trackId));

    return NextResponse.json({
      success: true,
      message: "Track removed from playlist",
    });
  } catch (error) {
    console.error("[Playlists API] Error removing track:", error);
    return NextResponse.json(
      { success: false, error: "Error removing track" },
      { status: 500 }
    );
  }
}
