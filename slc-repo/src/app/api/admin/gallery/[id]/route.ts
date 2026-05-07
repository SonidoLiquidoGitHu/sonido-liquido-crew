import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { galleryPhotos, photoTags, tags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// GET - Get single photo with tags
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const [photo] = await db
      .select()
      .from(galleryPhotos)
      .where(eq(galleryPhotos.id, id))
      .limit(1);

    if (!photo) {
      return NextResponse.json(
        { success: false, error: "Photo not found" },
        { status: 404 }
      );
    }

    // Get tags
    const photoTagsList = await db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
      })
      .from(photoTags)
      .innerJoin(tags, eq(photoTags.tagId, tags.id))
      .where(eq(photoTags.photoId, id));

    return NextResponse.json({
      success: true,
      data: {
        ...photo,
        tags: photoTagsList,
      },
    });
  } catch (error) {
    console.error("Error fetching photo:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch photo" },
      { status: 500 }
    );
  }
}

// PUT - Update photo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    // Update photo
    const [photo] = await db
      .update(galleryPhotos)
      .set({
        title: body.title,
        description: body.description,
        albumId: body.albumId || null,
        artistId: body.artistId || null,
        photographer: body.photographer,
        location: body.location,
        takenAt: body.takenAt ? new Date(body.takenAt) : null,
        isFeatured: body.isFeatured,
        isPublished: body.isPublished,
        sortOrder: body.sortOrder,
        altText: body.altText,
        updatedAt: new Date(),
      })
      .where(eq(galleryPhotos.id, id))
      .returning();

    if (!photo) {
      return NextResponse.json(
        { success: false, error: "Photo not found" },
        { status: 404 }
      );
    }

    // Update tags if provided
    if (body.tagIds !== undefined) {
      // Remove existing tags
      await db.delete(photoTags).where(eq(photoTags.photoId, id));

      // Add new tags
      if (body.tagIds.length > 0) {
        for (const tagId of body.tagIds) {
          await db.insert(photoTags).values({
            id: generateUUID(),
            photoId: id,
            tagId: tagId,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: photo,
    });
  } catch (error) {
    console.error("Error updating photo:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update photo" },
      { status: 500 }
    );
  }
}

// DELETE - Delete photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    // Delete photo tags
    await db.delete(photoTags).where(eq(photoTags.photoId, id));

    // Delete photo
    const result = await db
      .delete(galleryPhotos)
      .where(eq(galleryPhotos.id, id));

    return NextResponse.json({
      success: true,
      message: "Photo deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
