import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { galleryPhotos, photoTags, tags, galleryAlbums } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

// GET - Public gallery photos
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [], albums: [] });
    }

    const searchParams = request.nextUrl.searchParams;
    const albumSlug = searchParams.get("album");
    const tagSlug = searchParams.get("tag");
    const featured = searchParams.get("featured") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");

    let conditions = [eq(galleryPhotos.isPublished, true)];

    // Filter by album slug
    if (albumSlug) {
      const [album] = await db
        .select()
        .from(galleryAlbums)
        .where(and(eq(galleryAlbums.slug, albumSlug), eq(galleryAlbums.isPublished, true)))
        .limit(1);

      if (album) {
        conditions.push(eq(galleryPhotos.albumId, album.id));
      } else {
        return NextResponse.json({ success: true, data: [], albums: [] });
      }
    }

    // Filter by featured
    if (featured) {
      conditions.push(eq(galleryPhotos.isFeatured, true));
    }

    let photos = await db
      .select()
      .from(galleryPhotos)
      .where(and(...conditions))
      .orderBy(galleryPhotos.sortOrder, desc(galleryPhotos.createdAt))
      .limit(limit);

    // Filter by tag slug if provided
    if (tagSlug) {
      const [tag] = await db
        .select()
        .from(tags)
        .where(eq(tags.slug, tagSlug))
        .limit(1);

      if (tag) {
        const photoIdsWithTag = await db
          .select({ photoId: photoTags.photoId })
          .from(photoTags)
          .where(eq(photoTags.tagId, tag.id));

        const photoIds = photoIdsWithTag.map((p) => p.photoId);
        photos = photos.filter((p) => photoIds.includes(p.id));
      }
    }

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

    // Get published albums
    const albums = await db
      .select()
      .from(galleryAlbums)
      .where(eq(galleryAlbums.isPublished, true))
      .orderBy(galleryAlbums.sortOrder);

    return NextResponse.json({
      success: true,
      data: photosWithTags,
      albums,
    });
  } catch (error) {
    console.error("Error fetching gallery:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch gallery" },
      { status: 500 }
    );
  }
}
