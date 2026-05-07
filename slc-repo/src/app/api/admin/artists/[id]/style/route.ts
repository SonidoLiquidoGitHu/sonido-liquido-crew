import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { artistStyles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// GET - Fetch artist style
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    const { id } = await params;

    const [style] = await db
      .select()
      .from(artistStyles)
      .where(eq(artistStyles.artistId, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: style || null,
    });
  } catch (error: any) {
    // Handle table not existing error gracefully
    if (error?.message?.includes("no such table") || error?.code === "SQLITE_ERROR") {
      console.warn("[API] artist_styles table does not exist yet - run migrations");
      return NextResponse.json({
        success: true,
        data: null,
        warning: "Artist styles table not found - run database migrations",
      });
    }
    console.error("[API] Error fetching artist style:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch artist style" },
      { status: 500 }
    );
  }
}

// PUT - Update or create artist style
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Check if style exists
    const [existing] = await db
      .select()
      .from(artistStyles)
      .where(eq(artistStyles.artistId, id))
      .limit(1);

    let style;

    if (existing) {
      // Update existing
      [style] = await db
        .update(artistStyles)
        .set({
          settings: body.settings,
          applyToNewContent: body.applyToNewContent ?? true,
          updatedAt: new Date(),
        })
        .where(eq(artistStyles.artistId, id))
        .returning();
    } else {
      // Create new
      [style] = await db
        .insert(artistStyles)
        .values({
          id: generateUUID(),
          artistId: id,
          settings: body.settings,
          applyToNewContent: body.applyToNewContent ?? true,
        })
        .returning();
    }

    console.log(`[API] Updated artist style for artist: ${id}`);

    return NextResponse.json({
      success: true,
      data: style,
    });
  } catch (error: any) {
    // Handle table not existing error gracefully
    if (error?.message?.includes("no such table") || error?.code === "SQLITE_ERROR") {
      console.warn("[API] artist_styles table does not exist yet - run migrations");
      return NextResponse.json(
        { success: false, error: "Artist styles table not found - run database migrations" },
        { status: 503 }
      );
    }
    console.error("[API] Error updating artist style:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update artist style" },
      { status: 500 }
    );
  }
}

// DELETE - Remove artist style
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { id } = await params;

    await db.delete(artistStyles).where(eq(artistStyles.artistId, id));

    console.log(`[API] Deleted artist style for artist: ${id}`);

    return NextResponse.json({
      success: true,
      message: "Artist style deleted successfully",
    });
  } catch (error) {
    console.error("[API] Error deleting artist style:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete artist style" },
      { status: 500 }
    );
  }
}
