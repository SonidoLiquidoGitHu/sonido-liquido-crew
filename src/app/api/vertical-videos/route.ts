import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { verticalVideos, verticalVideoTags, tags } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// ===========================================
// GET - Public: List published vertical videos
// ===========================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const featured = searchParams.get("featured") === "true";
    const artistId = searchParams.get("artistId");

    const conditions = [eq(verticalVideos.isPublished, true)];
    if (featured) conditions.push(eq(verticalVideos.isFeatured, true));
    if (artistId) conditions.push(eq(verticalVideos.artistId, artistId));

    const allVideos = await db
      .select()
      .from(verticalVideos)
      .where(and(...conditions))
      .orderBy(desc(verticalVideos.isFeatured), desc(verticalVideos.createdAt))
      .limit(limit)
      .offset(offset);

    // Fetch tags for each video
    const videosWithTags = await Promise.all(
      allVideos.map(async (video) => {
        const videoTagRows = await db
          .select({ tag: tags })
          .from(verticalVideoTags)
          .innerJoin(tags, eq(verticalVideoTags.tagId, tags.id))
          .where(eq(verticalVideoTags.videoId, video.id));

        return {
          ...video,
          tags: videoTagRows.map((row) => row.tag),
        };
      })
    );

    // Get total count for pagination
    const [countResult] = await db
      .select({ total: sql<number>`count(*)` })
      .from(verticalVideos)
      .where(and(...conditions));

    return NextResponse.json({
      success: true,
      data: videosWithTags,
      total: countResult?.total || 0,
    });
  } catch (error) {
    console.error("Failed to fetch vertical videos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch vertical videos" },
      { status: 500 }
    );
  }
}
