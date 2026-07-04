import { db } from "@/db/client";
import {
  tags,
  verticalVideoEvents,
  verticalVideoTags,
  verticalVideos,
} from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// ===========================================
// GET - Public: List published vertical videos + events
// ===========================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const offset = Number.parseInt(searchParams.get("offset") || "0");
    const featured = searchParams.get("featured") === "true";
    const artistId = searchParams.get("artistId");
    const eventId = searchParams.get("eventId");
    const includeEvents = searchParams.get("includeEvents") === "true";

    // Fetch events if requested
    // biome-ignore lint/suspicious/noExplicitAny: dynamic type
    let eventsData: any[] = [];
    if (includeEvents) {
      const allEvents = await db
        .select()
        .from(verticalVideoEvents)
        .where(eq(verticalVideoEvents.isPublished, true))
        .orderBy(desc(verticalVideoEvents.eventDate));

      // Get video count for each event
      eventsData = await Promise.all(
        allEvents.map(async (event) => {
          const [countResult] = await db
            .select({ total: sql<number>`count(*)` })
            .from(verticalVideos)
            .where(
              and(
                eq(verticalVideos.eventId, event.id),
                eq(verticalVideos.isPublished, true),
              ),
            );

          return {
            ...event,
            videoCount: countResult?.total || 0,
          };
        }),
      );
    }

    // Fetch videos
    const conditions = [eq(verticalVideos.isPublished, true)];
    if (featured) conditions.push(eq(verticalVideos.isFeatured, true));
    if (artistId) conditions.push(eq(verticalVideos.artistId, artistId));
    if (eventId) conditions.push(eq(verticalVideos.eventId, eventId));

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
      }),
    );

    // Get total count for pagination
    const [countResult] = await db
      .select({ total: sql<number>`count(*)` })
      .from(verticalVideos)
      .where(and(...conditions));

    return NextResponse.json({
      success: true,
      data: videosWithTags,
      events: eventsData,
      total: countResult?.total || 0,
    });
  } catch (error) {
    console.error("Failed to fetch vertical videos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch vertical videos" },
      { status: 500 },
    );
  }
}
