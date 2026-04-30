import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { pressKits, artists } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// GET - List all press kits
export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const allKits = await db
      .select({
        id: pressKits.id,
        artistId: pressKits.artistId,
        title: pressKits.title,
        description: pressKits.description,
        downloadUrl: pressKits.downloadUrl,
        fileSize: pressKits.fileSize,
        isActive: pressKits.isActive,
        downloadCount: pressKits.downloadCount,
        createdAt: pressKits.createdAt,
        artistName: artists.name,
      })
      .from(pressKits)
      .leftJoin(artists, eq(pressKits.artistId, artists.id))
      .orderBy(desc(pressKits.createdAt));

    return NextResponse.json({
      success: true,
      data: allKits,
    });
  } catch (error) {
    console.error("[API] Error fetching press kits:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch press kits" },
      { status: 500 }
    );
  }
}

// POST - Create a new press kit
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();

    if (!body.title || !body.downloadUrl) {
      return NextResponse.json(
        { success: false, error: "Title and download URL are required" },
        { status: 400 }
      );
    }

    const id = generateUUID();

    const [created] = await db
      .insert(pressKits)
      .values({
        id,
        artistId: body.artistId || null,
        title: body.title,
        description: body.description || null,
        downloadUrl: body.downloadUrl,
        fileSize: body.fileSize || null,
        isActive: body.isActive !== false,
      })
      .returning();

    console.log(`[API] Created press kit: ${created.title}`);

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (error) {
    console.error("[API] Error creating press kit:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create press kit" },
      { status: 500 }
    );
  }
}

// PUT - Update a press kit
export async function PUT(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: "Press kit ID is required" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(pressKits)
      .set({
        artistId: body.artistId || null,
        title: body.title,
        description: body.description || null,
        downloadUrl: body.downloadUrl,
        fileSize: body.fileSize || null,
        isActive: body.isActive !== false,
        updatedAt: new Date(),
      })
      .where(eq(pressKits.id, body.id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Press kit not found" },
        { status: 404 }
      );
    }

    console.log(`[API] Updated press kit: ${updated.title}`);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("[API] Error updating press kit:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update press kit" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a press kit
export async function DELETE(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Press kit ID is required" },
        { status: 400 }
      );
    }

    await db.delete(pressKits).where(eq(pressKits.id, id));

    console.log(`[API] Deleted press kit: ${id}`);

    return NextResponse.json({
      success: true,
      message: "Press kit deleted successfully",
    });
  } catch (error) {
    console.error("[API] Error deleting press kit:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete press kit" },
      { status: 500 }
    );
  }
}
