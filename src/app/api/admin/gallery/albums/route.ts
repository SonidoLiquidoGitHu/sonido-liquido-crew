import { db, isDatabaseConfigured } from "@/db/client";
import { galleryAlbums, galleryPhotos } from "@/db/schema";
import { generateUUID, slugify } from "@/lib/utils";
import { desc, inArray, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// GET - List all albums with photo counts
export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Fetch all albums (without the count subquery — we'll batch-fetch
    // counts separately to avoid fragile correlated subqueries that
    // were returning 0 on Turso even when photos existed).
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
      })
      .from(galleryAlbums)
      .orderBy(galleryAlbums.sortOrder, desc(galleryAlbums.createdAt));

    if (albums.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // BATCH FETCH photo counts for all albums in a single query.
    // This replaces the correlated subquery that was returning 0:
    //   (SELECT COUNT(*) FROM gallery_photos WHERE album_id = albums.id)
    // The subquery is technically correct SQL, but was unreliable on
    // Turso/libSQL in practice — possibly due to how the column reference
    // was being resolved. A batched GROUP BY query is more robust.
    const albumIds = albums.map((a) => a.id);
    const countRows = await db
      .select({
        albumId: galleryPhotos.albumId,
        total: sql<number>`count(*)`,
      })
      .from(galleryPhotos)
      .where(inArray(galleryPhotos.albumId, albumIds))
      .groupBy(galleryPhotos.albumId);

    const countMap = new Map<string, number>();
    for (const row of countRows) {
      if (row.albumId) {
        countMap.set(row.albumId, row.total);
      }
    }

    // Get cover photos (batch-fetch all at once instead of N+1)
    const coverPhotoIds = albums
      .map((a) => a.coverPhotoId)
      .filter((id): id is string => Boolean(id));

    const coverPhotos =
      coverPhotoIds.length > 0
        ? await db
            .select({
              id: galleryPhotos.id,
              imageUrl: galleryPhotos.imageUrl,
              thumbnailUrl: galleryPhotos.thumbnailUrl,
            })
            .from(galleryPhotos)
            .where(inArray(galleryPhotos.id, coverPhotoIds))
        : [];

    const coverPhotoMap = new Map<
      string,
      { imageUrl: string; thumbnailUrl: string | null }
    >();
    for (const photo of coverPhotos) {
      coverPhotoMap.set(photo.id, {
        imageUrl: photo.imageUrl,
        thumbnailUrl: photo.thumbnailUrl,
      });
    }

    // Assemble final result
    const albumsWithCovers = albums.map((album) => ({
      ...album,
      photoCount: countMap.get(album.id) || 0,
      coverPhoto: album.coverPhotoId
        ? coverPhotoMap.get(album.coverPhotoId) || null
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: albumsWithCovers,
    });
  } catch (error) {
    console.error("Error fetching albums:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch albums" },
      { status: 500 },
    );
  }
}

// POST - Create album
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 },
      );
    }

    const body = await request.json();

    if (!body.title) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 },
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
      { status: 500 },
    );
  }
}
