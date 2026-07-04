import { db, isDatabaseConfigured } from "@/db/client";
import {
  artistGalleryAssets,
  artists,
  galleryPhotos,
  photoTags,
  tags,
} from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ArtistGalleryAsset {
  id: string;
  assetUrl: string;
  thumbnailUrl: string | null;
  assetType: string;
  caption: string | null;
  credit: string | null;
  isPublic: boolean;
  source: "artist_gallery";
}

interface GalleryPhotoWithTags {
  id: string;
  title: string | null;
  description: string | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  photographer: string | null;
  location: string | null;
  isFeatured: boolean;
  tags: { id: string; name: string; slug: string }[];
  source: "gallery";
}

// GET - Fetch all gallery images for an artist (combines artist_gallery_assets + gallery_photos)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { slug } = await params;
    const limit = Number.parseInt(
      new URL(request.url).searchParams.get("limit") || "20",
    );

    // Find the artist by slug
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.slug, slug))
      .limit(1);

    if (!artist) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Fetch artist gallery assets (uploaded directly to the artist)
    const artistAssets = await db
      .select()
      .from(artistGalleryAssets)
      .where(
        and(
          eq(artistGalleryAssets.artistId, artist.id),
          eq(artistGalleryAssets.isPublic, true),
        ),
      )
      .orderBy(asc(artistGalleryAssets.sortOrder));

    const mappedAssets: ArtistGalleryAsset[] = artistAssets.map((a) => ({
      id: a.id,
      assetUrl: a.assetUrl,
      thumbnailUrl: a.thumbnailUrl,
      assetType: a.assetType,
      caption: a.caption,
      credit: a.credit,
      isPublic: a.isPublic,
      source: "artist_gallery" as const,
    }));

    // Fetch gallery photos tagged with this artist
    const photos = await db
      .select()
      .from(galleryPhotos)
      .where(
        and(
          eq(galleryPhotos.artistId, artist.id),
          eq(galleryPhotos.isPublished, true),
        ),
      )
      .orderBy(galleryPhotos.sortOrder, galleryPhotos.createdAt)
      .limit(limit);

    // Get tags for each gallery photo
    const mappedPhotos: GalleryPhotoWithTags[] = await Promise.all(
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
          id: photo.id,
          title: photo.title,
          description: photo.description,
          imageUrl: photo.imageUrl,
          thumbnailUrl: photo.thumbnailUrl,
          photographer: photo.photographer,
          location: photo.location,
          isFeatured: photo.isFeatured,
          tags: photoTagsList,
          source: "gallery" as const,
        };
      }),
    );

    // Combine both sources, artist assets first
    const combined = [...mappedAssets, ...mappedPhotos];

    return NextResponse.json({
      success: true,
      data: combined,
      meta: {
        artistId: artist.id,
        artistName: artist.name,
        totalAssets: mappedAssets.length,
        totalPhotos: mappedPhotos.length,
      },
    });
  } catch (error) {
    console.error("[Artist Gallery] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error fetching artist gallery" },
      { status: 500 },
    );
  }
}
