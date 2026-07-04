import { db, isDatabaseConfigured } from "@/db/client";
import { artists, videos } from "@/db/schema";
import { videosService } from "@/lib/services";
import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const artistSlug = searchParams.get("artistSlug");
    const artistId = searchParams.get("artistId");
    const isFeatured =
      searchParams.get("isFeatured") === "true" ? true : undefined;
    const limit = Number.parseInt(searchParams.get("limit") || "20");

    // If artistSlug is provided, look up the artist first
    let resolvedArtistId = artistId;
    if (artistSlug && !artistId && isDatabaseConfigured()) {
      const [artist] = await db
        .select({ id: artists.id })
        .from(artists)
        .where(eq(artists.slug, artistSlug))
        .limit(1);

      if (artist) {
        resolvedArtistId = artist.id;
      }
    }

    // If we have an artistId, fetch videos for that artist
    if (resolvedArtistId && isDatabaseConfigured()) {
      const conditions = [eq(videos.artistId, resolvedArtistId)];
      if (isFeatured) {
        conditions.push(eq(videos.isFeatured, true));
      }

      const artistVideos = await db
        .select()
        .from(videos)
        .where(and(...conditions))
        .orderBy(desc(videos.publishedAt), desc(videos.createdAt))
        .limit(limit);

      return NextResponse.json({
        success: true,
        data: artistVideos,
      });
    }

    // Default: fetch all videos
    const options = {
      artistId: resolvedArtistId || undefined,
      isFeatured,
      limit,
    };

    const allVideos = await videosService.getAll(options);
    const total = await videosService.getCount();

    return NextResponse.json({
      success: true,
      data: allVideos,
      total,
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch videos" },
      { status: 500 },
    );
  }
}
