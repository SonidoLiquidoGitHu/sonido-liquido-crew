import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { galleryPhotos, photoTags, tags, galleryAlbums } from "@/db/schema";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";

// GET - List all photos with optional filters
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const searchParams = request.nextUrl.searchParams;
    const albumId = searchParams.get("albumId");
    const tagId = searchParams.get("tagId");
    const featured = searchParams.get("featured") === "true";
    const published = searchParams.get("published");
    const limit = parseInt(searchParams.get("limit") || "50");

    let conditions = [];

    if (albumId) {
      conditions.push(eq(galleryPhotos.albumId, albumId));
    }

    if (featured) {
      conditions.push(eq(galleryPhotos.isFeatured, true));
    }

    if (published !== null && published !== undefined) {
      conditions.push(eq(galleryPhotos.isPublished, published === "true"));
    }

    const photos = await db
      .select()
      .from(galleryPhotos)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(galleryPhotos.createdAt))
      .limit(limit);

    // Get tags for each photo
    const photosWithTags = await Promise.all(
      photos.map(async (photo) => {
        const photoTagsList = await db
          .select({
            id: tags.id,
            name: tags.name,
            slug: tags.slug,
          })
          .from(photoTags)
          .innerJoin(tags, eq(photoTags.tagId, tags.id))
          .where(eq(photoTags.photoId, photo.id));

        return {
          ...photo,
          tags: photoTagsList,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: photosWithTags,
      count: photosWithTags.length,
    });
  } catch (error) {
    console.error("Error fetching gallery photos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}

// POST - Batch upload photos
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { photos, albumId, tagIds = [] } = body;

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json(
        { success: false, error: "No photos provided" },
        { status: 400 }
      );
    }

    const createdPhotos = [];

    for (const photoData of photos) {
      const photoId = generateUUID();

      // Create photo
      const [photo] = await db
        .insert(galleryPhotos)
        .values({
          id: photoId,
          title: photoData.title || null,
          description: photoData.description || null,
          imageUrl: photoData.imageUrl,
          thumbnailUrl: photoData.thumbnailUrl || photoData.imageUrl,
          width: photoData.width || null,
          height: photoData.height || null,
          fileSize: photoData.fileSize || null,
          mimeType: photoData.mimeType || null,
          albumId: albumId || null,
          artistId: photoData.artistId || null,
          photographer: photoData.photographer || null,
          location: photoData.location || null,
          takenAt: photoData.takenAt ? new Date(photoData.takenAt) : null,
          isFeatured: photoData.isFeatured || false,
          isPublished: photoData.isPublished !== false,
          sortOrder: photoData.sortOrder || 0,
          altText: photoData.altText || photoData.title || null,
        })
        .returning();

      // Add tags
      const allTagIds = [...tagIds, ...(photoData.tagIds || [])];
      if (allTagIds.length > 0) {
        const uniqueTagIds = [...new Set(allTagIds)];
        for (const tagId of uniqueTagIds) {
          await db.insert(photoTags).values({
            id: generateUUID(),
            photoId: photoId,
            tagId: tagId,
          });
        }
      }

      createdPhotos.push(photo);
    }

    return NextResponse.json({
      success: true,
      data: createdPhotos,
      count: createdPhotos.length,
      message: `Successfully uploaded ${createdPhotos.length} photo(s)`,
    });
  } catch (error) {
    console.error("Error uploading photos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload photos" },
      { status: 500 }
    );
  }
}

// DELETE - Batch delete photos
export async function DELETE(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { photoIds } = body;

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "No photo IDs provided" },
        { status: 400 }
      );
    }

    // Delete photo tags first (cascade should handle this, but being explicit)
    await db.delete(photoTags).where(inArray(photoTags.photoId, photoIds));

    // Delete photos
    await db.delete(galleryPhotos).where(inArray(galleryPhotos.id, photoIds));

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${photoIds.length} photo(s)`,
    });
  } catch (error) {
    console.error("Error deleting photos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete photos" },
      { status: 500 }
    );
  }
}
