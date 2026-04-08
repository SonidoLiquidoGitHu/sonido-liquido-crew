import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { customStyles, artistStyles, artists } from "@/db/schema";
import { eq, desc, and, or } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// GET - Fetch all custom styles or filter by category/artist
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const artistId = searchParams.get("artistId");
    const includePublic = searchParams.get("includePublic") === "true";

    // Build conditions
    const conditions = [];

    if (category) {
      conditions.push(eq(customStyles.category, category as any));
    }

    if (artistId) {
      if (includePublic) {
        conditions.push(
          or(
            eq(customStyles.artistId, artistId),
            eq(customStyles.isPublic, true)
          )
        );
      } else {
        conditions.push(eq(customStyles.artistId, artistId));
      }
    }

    const allStyles = await db
      .select()
      .from(customStyles)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(customStyles.usageCount), desc(customStyles.createdAt));

    return NextResponse.json({
      success: true,
      data: allStyles,
    });
  } catch (error: any) {
    // Handle table not existing error gracefully
    if (error?.message?.includes("no such table") || error?.code === "SQLITE_ERROR") {
      console.warn("[API] custom_styles table does not exist yet - run migrations");
      return NextResponse.json({
        success: true,
        data: [],
        warning: "Styles table not found - run database migrations",
      });
    }
    console.error("[API] Error fetching styles:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch styles" },
      { status: 500 }
    );
  }
}

// POST - Create a new custom style
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();

    if (!body.name || !body.settings) {
      return NextResponse.json(
        { success: false, error: "Name and settings are required" },
        { status: 400 }
      );
    }

    const id = generateUUID();

    const [style] = await db
      .insert(customStyles)
      .values({
        id,
        name: body.name,
        description: body.description || null,
        settings: body.settings,
        previewImageUrl: body.previewImageUrl || null,
        category: body.category || "general",
        artistId: body.artistId || null,
        isPublic: body.isPublic || false,
        isDefault: body.isDefault || false,
        createdBy: body.createdBy || null,
      })
      .returning();

    console.log(`[API] Created custom style: ${style.name}`);

    return NextResponse.json({
      success: true,
      data: style,
    });
  } catch (error: any) {
    // Handle table not existing error gracefully
    if (error?.message?.includes("no such table") || error?.code === "SQLITE_ERROR") {
      console.warn("[API] custom_styles table does not exist yet - run migrations");
      return NextResponse.json(
        { success: false, error: "Styles table not found - run database migrations" },
        { status: 503 }
      );
    }
    console.error("[API] Error creating style:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create style" },
      { status: 500 }
    );
  }
}

// PUT - Update a custom style
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
        { success: false, error: "Style ID is required" },
        { status: 400 }
      );
    }

    const [style] = await db
      .update(customStyles)
      .set({
        name: body.name,
        description: body.description || null,
        settings: body.settings,
        previewImageUrl: body.previewImageUrl || null,
        category: body.category || "general",
        artistId: body.artistId || null,
        isPublic: body.isPublic || false,
        isDefault: body.isDefault || false,
        updatedAt: new Date(),
      })
      .where(eq(customStyles.id, body.id))
      .returning();

    if (!style) {
      return NextResponse.json(
        { success: false, error: "Style not found" },
        { status: 404 }
      );
    }

    console.log(`[API] Updated custom style: ${style.name}`);

    return NextResponse.json({
      success: true,
      data: style,
    });
  } catch (error) {
    console.error("[API] Error updating style:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update style" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a custom style
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
        { success: false, error: "Style ID is required" },
        { status: 400 }
      );
    }

    await db.delete(customStyles).where(eq(customStyles.id, id));

    console.log(`[API] Deleted custom style: ${id}`);

    return NextResponse.json({
      success: true,
      message: "Style deleted successfully",
    });
  } catch (error) {
    console.error("[API] Error deleting style:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete style" },
      { status: 500 }
    );
  }
}
