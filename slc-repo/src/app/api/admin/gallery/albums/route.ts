import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { galleryAlbums, galleryPhotos } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";

// GET - List all albums with photo counts
export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const albums = await db
      .select({
        id: galleryAlbums.id,
        title: galleryAlbums.title,
        slug: galleryAlbums.slug,
        description: galleryAlbums.description,
        coverPhotoId: galleryAlbums.coverPhotoId,
        sortOrder: galleryAlbums.sortOrder,
        isPublished: galleryAlbums.isPublished,
        createdAt: galleryAlbums.createdAt,
        updatedAt: galleryAlbums.updatedAt,
        photoCount: sql<number>`(SELECT COUNT(*) FROM gallery_photos WHERE album_id = ${galleryAlbums.id})`.as("photo_count"),
      })
      .from(galleryAlbums)
      .orderBy(galleryAlbums.sortOrder, desc(galleryAlbums.createdAt));

    // Get cover photos
    const albumsWithCovers = await Promise.all(
      albums.map(async (album) => {
        let coverPhoto = null;
        if (album.coverPhotoId) {
          const [photo] = await db
            .select({ imageUrl: galleryPhotos.imageUrl, thumbnailUrl: galleryPhotos.thumbnailUrl })
            .from(galleryPhotos)
            .where(eq(galleryPhotos.id, album.coverPhotoId))
            .limit(1);
          coverPhoto = photo;
        }
        return {
          ...album,
          coverPhoto,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: albumsWithCovers,
    });
  } catch (error) {
    console.error("Error fetching albums:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch albums" },
      { status: 500 }
    );
  }
}

// POST - Create album
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();

    if (!body.title) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    const [album] = await db
      .insert(galleryAlbums)
      .values({
        id: generateUUID(),
        title: body.title,
        slug: slugify(body.title),
        description: body.description || null,
        coverPhotoId: body.coverPhotoId || null,
        sortOrder: body.sortOrder || 0,
        isPublished: body.isPublished || false,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: album,
    });
  } catch (error) {
    console.error("Error creating album:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create album" },
      { status: 500 }
    );
  }
}
