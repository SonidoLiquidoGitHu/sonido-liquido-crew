import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { tags, photoTags } from "@/db/schema";
import { eq, desc, sql, or } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";

// GET - List all tags (optionally filter by gallery-related)
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const searchParams = request.nextUrl.searchParams;
    const galleryOnly = searchParams.get("galleryOnly") === "true";

    let allTags;

    if (galleryOnly) {
      // Get only tags that have been used on photos
      allTags = await db
        .select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
          category: tags.category,
          createdAt: tags.createdAt,
          photoCount: sql<number>`(SELECT COUNT(*) FROM photo_tags WHERE tag_id = ${tags.id})`.as("photo_count"),
        })
        .from(tags)
        .where(or(eq(tags.category, "gallery"), eq(tags.category, "photo")))
        .orderBy(tags.name);
    } else {
      allTags = await db
        .select({
          id: tags.id,
          name: tags.name,
          slug: tags.slug,
          category: tags.category,
          createdAt: tags.createdAt,
          photoCount: sql<number>`(SELECT COUNT(*) FROM photo_tags WHERE tag_id = ${tags.id})`.as("photo_count"),
        })
        .from(tags)
        .orderBy(tags.name);
    }

    return NextResponse.json({
      success: true,
      data: allTags,
    });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

// POST - Create tag
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: "Tag name is required" },
        { status: 400 }
      );
    }

    const slug = slugify(body.name);

    // Check if tag already exists
    const [existing] = await db
      .select()
      .from(tags)
      .where(eq(tags.slug, slug))
      .limit(1);

    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing,
        message: "Tag already exists",
      });
    }

    const [tag] = await db
      .insert(tags)
      .values({
        id: generateUUID(),
        name: body.name,
        slug: slug,
        category: body.category || "gallery",
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: tag,
    });
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create tag" },
      { status: 500 }
    );
  }
}

// DELETE - Delete tag
export async function DELETE(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { tagId } = body;

    if (!tagId) {
      return NextResponse.json(
        { success: false, error: "Tag ID is required" },
        { status: 400 }
      );
    }

    // Delete tag (cascade will handle photo_tags)
    await db.delete(tags).where(eq(tags.id, tagId));

    return NextResponse.json({
      success: true,
      message: "Tag deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}
