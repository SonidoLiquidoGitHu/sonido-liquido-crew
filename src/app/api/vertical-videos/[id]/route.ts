import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { verticalVideos, verticalVideoTags, tags } from "@/db/schema";
import { generateUUID } from "@/lib/utils";
import { eq, sql } from "drizzle-orm";

// ===========================================
// GET - Public: Get a single vertical video by ID
// ===========================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [video] = await db
      .select()
      .from(verticalVideos)
      .where(eq(verticalVideos.id, id));

    if (!video || !video.isPublished) {
      return NextResponse.json(
        { success: false, error: "Video not found" },
        { status: 404 }
      );
    }

    // Increment view count
    await db
      .update(verticalVideos)
      .set({ viewCount: sql`${verticalVideos.viewCount} + 1` })
      .where(eq(verticalVideos.id, id));

    // Fetch tags
    const videoTagRows = await db
      .select({ tag: tags })
      .from(verticalVideoTags)
      .innerJoin(tags, eq(verticalVideoTags.tagId, tags.id))
      .where(eq(verticalVideoTags.videoId, id));

    return NextResponse.json({
      success: true,
      data: { ...video, viewCount: video.viewCount + 1, tags: videoTagRows.map((r) => r.tag) },
    });
  } catch (error) {
    console.error("Failed to fetch vertical video:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch vertical video" },
      { status: 500 }
    );
  }
}

// ===========================================
// POST - Track a share event
// ===========================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { platform } = body; // "whatsapp", "twitter", "facebook", "copy", "native", "tiktok", "instagram"

    // Increment share count
    await db
      .update(verticalVideos)
      .set({ shareCount: sql`${verticalVideos.shareCount} + 1` })
      .where(eq(verticalVideos.id, id));

    const [updated] = await db
      .select({ shareCount: verticalVideos.shareCount })
      .from(verticalVideos)
      .where(eq(verticalVideos.id, id));

    return NextResponse.json({
      success: true,
      data: { shareCount: updated?.shareCount || 0 },
    });
  } catch (error) {
    console.error("Failed to track share:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track share" },
      { status: 500 }
    );
  }
}
