import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { videoAnalytics, videoAnalyticsAggregates } from "@/db/schema/analytics";
import { eq, and, sql } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// Generate a session ID for anonymous tracking
function getSessionId(request: NextRequest): string {
  const existingSession = request.cookies.get("video_session")?.value;
  if (existingSession) return existingSession;
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true }); // Silently skip if no DB
    }

    const body = await request.json();
    const {
      contentId,
      contentType,
      eventType,
      currentTime,
      duration,
      percentWatched,
      maxPercentWatched,
      totalWatchTime
    } = body;

    if (!contentId || !contentType || !eventType) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sessionId = getSessionId(request);
    const ipAddress = request.headers.get("x-forwarded-for") ||
                      request.headers.get("x-real-ip") ||
                      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Record the analytics event
    await db.insert(videoAnalytics).values({
      id: generateUUID(),
      contentId,
      contentType,
      sessionId,
      eventType,
      currentTime: currentTime || 0,
      duration: duration || 0,
      percentWatched: percentWatched || 0,
      maxPercentWatched: maxPercentWatched || 0,
      totalWatchTime: totalWatchTime || 0,
      ipAddress,
      userAgent,
    });

    // Update daily aggregates for "play" and "complete" events
    if (eventType === "play" || eventType === "complete") {
      const today = new Date().toISOString().split("T")[0];
      const aggregateId = `${contentType}_${contentId}_${today}`;

      // Try to get existing aggregate
      const [existing] = await db
        .select()
        .from(videoAnalyticsAggregates)
        .where(eq(videoAnalyticsAggregates.id, aggregateId))
        .limit(1);

      if (existing) {
        // Update existing
        await db
          .update(videoAnalyticsAggregates)
          .set({
            totalPlays: eventType === "play"
              ? sql`${videoAnalyticsAggregates.totalPlays} + 1`
              : existing.totalPlays,
            completionCount: eventType === "complete"
              ? sql`${videoAnalyticsAggregates.completionCount} + 1`
              : existing.completionCount,
            completed: eventType === "complete"
              ? sql`${videoAnalyticsAggregates.completed} + 1`
              : existing.completed,
            totalWatchTimeSeconds: sql`${videoAnalyticsAggregates.totalWatchTimeSeconds} + ${totalWatchTime || 0}`,
            updatedAt: new Date(),
          })
          .where(eq(videoAnalyticsAggregates.id, aggregateId));
      } else {
        // Create new aggregate
        await db.insert(videoAnalyticsAggregates).values({
          id: aggregateId,
          contentId,
          contentType,
          date: today,
          totalPlays: eventType === "play" ? 1 : 0,
          uniqueViewers: 1,
          totalWatchTimeSeconds: totalWatchTime || 0,
          avgWatchPercent: percentWatched || 0,
          completionCount: eventType === "complete" ? 1 : 0,
          completed: eventType === "complete" ? 1 : 0,
        });
      }
    }

    // Set session cookie if not exists
    const response = NextResponse.json({ success: true });
    if (!request.cookies.get("video_session")) {
      response.cookies.set("video_session", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24 hours
      });
    }

    return response;
  } catch (error) {
    console.error("[Video Analytics] Error:", error);
    // Return success anyway to not break the client
    return NextResponse.json({ success: true });
  }
}

// GET: Retrieve analytics for a specific content
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: { totalPlays: 0, avgWatchPercent: 0, completionRate: 0 },
      });
    }

    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get("contentId");
    const contentType = searchParams.get("contentType");

    if (!contentId || !contentType) {
      return NextResponse.json(
        { success: false, error: "Missing contentId or contentType" },
        { status: 400 }
      );
    }

    // Get aggregated stats
    const aggregates = await db
      .select()
      .from(videoAnalyticsAggregates)
      .where(
        and(
          eq(videoAnalyticsAggregates.contentId, contentId),
          eq(videoAnalyticsAggregates.contentType, contentType as "campaign" | "beat")
        )
      );

    // Calculate totals
    const totals = aggregates.reduce(
      (acc, curr) => ({
        totalPlays: acc.totalPlays + curr.totalPlays,
        totalWatchTime: acc.totalWatchTime + curr.totalWatchTimeSeconds,
        completions: acc.completions + curr.completionCount,
        avgPercent: acc.avgPercent + curr.avgWatchPercent,
      }),
      { totalPlays: 0, totalWatchTime: 0, completions: 0, avgPercent: 0 }
    );

    const avgWatchPercent = aggregates.length > 0
      ? Math.round(totals.avgPercent / aggregates.length)
      : 0;
    const completionRate = totals.totalPlays > 0
      ? Math.round((totals.completions / totals.totalPlays) * 100)
      : 0;

    // Format watch time
    const hours = Math.floor(totals.totalWatchTime / 3600);
    const minutes = Math.floor((totals.totalWatchTime % 3600) / 60);
    const formattedWatchTime = hours > 0
      ? `${hours}h ${minutes}m`
      : `${minutes}m`;

    return NextResponse.json({
      success: true,
      data: {
        totalPlays: totals.totalPlays,
        totalWatchTime: totals.totalWatchTime,
        formattedWatchTime,
        avgWatchPercent,
        completionRate,
        completions: totals.completions,
        dailyStats: aggregates.map(a => ({
          date: a.date,
          plays: a.totalPlays,
          completions: a.completionCount,
        })),
      },
    });
  } catch (error) {
    console.error("[Video Analytics] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
