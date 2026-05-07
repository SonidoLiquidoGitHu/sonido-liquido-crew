import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedTracks } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET - Get a single curated track
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const [track] = await db
      .select()
      .from(curatedTracks)
      .where(eq(curatedTracks.id, id))
      .limit(1);

    if (!track) {
      return NextResponse.json(
        { success: false, error: "Track not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: track,
    });
  } catch (error) {
    console.error("[Curated Tracks API] Error fetching track:", error);
    return NextResponse.json(
      { success: false, error: "Error fetching track" },
      { status: 500 }
    );
  }
}

// PUT - Update a curated track
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const { isAvailableForPlaylist, isFeatured, adminNotes } = body;

    // Check if exists
    const [existing] = await db
      .select()
      .from(curatedTracks)
      .where(eq(curatedTracks.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Track not found" },
        { status: 404 }
      );
    }

    // Update
    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (isAvailableForPlaylist !== undefined) updates.isAvailableForPlaylist = isAvailableForPlaylist;
    if (isFeatured !== undefined) updates.isFeatured = isFeatured;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;

    await db
      .update(curatedTracks)
      .set(updates)
      .where(eq(curatedTracks.id, id));

    return NextResponse.json({
      success: true,
      message: "Track updated successfully",
    });
  } catch (error) {
    console.error("[Curated Tracks API] Error updating track:", error);
    return NextResponse.json(
      { success: false, error: "Error updating track" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a curated track
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    // Check if exists
    const [existing] = await db
      .select()
      .from(curatedTracks)
      .where(eq(curatedTracks.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Track not found" },
        { status: 404 }
      );
    }

    // Delete
    await db
      .delete(curatedTracks)
      .where(eq(curatedTracks.id, id));

    return NextResponse.json({
      success: true,
      message: "Track removed successfully",
    });
  } catch (error) {
    console.error("[Curated Tracks API] Error deleting track:", error);
    return NextResponse.json(
      { success: false, error: "Error deleting track" },
      { status: 500 }
    );
  }
}
