import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { videos, artists } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "6", 10);

    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Fetch random videos with artist info
    const randomVideos = await db
      .select({
        id: videos.id,
        title: videos.title,
        description: videos.description,
        youtubeId: videos.youtubeId,
        youtubeUrl: videos.youtubeUrl,
        thumbnailUrl: videos.thumbnailUrl,
        duration: videos.duration,
        viewCount: videos.viewCount,
        publishedAt: videos.publishedAt,
        isFeatured: videos.isFeatured,
        artistId: videos.artistId,
        artistName: artists.name,
        artistSlug: artists.slug,
      })
      .from(videos)
      .leftJoin(artists, eq(videos.artistId, artists.id))
      .orderBy(sql`RANDOM()`)
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: randomVideos,
    });
  } catch (error) {
    console.error("[API] Error fetching random videos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch random videos" },
      { status: 500 }
    );
  }
}
