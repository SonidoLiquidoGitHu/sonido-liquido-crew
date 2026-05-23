import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { analytics } from "@/db/schema";
import { generateUUID } from "@/lib/utils";
import { sql, desc, and, gte, eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, page, event, entityType, entityId, metadata } = body;

    // Get user info from headers
    const userAgent = request.headers.get("user-agent") || "unknown";
    const referer = request.headers.get("referer") || null;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    // Simple session ID from a combination of IP and user agent
    const sessionId = Buffer.from(`${ip}-${userAgent.slice(0, 50)}`).toString("base64").slice(0, 32);

    const eventType = type === "pageview" ? "page_view" : (event || type);

    console.log(`[Analytics] ${eventType}: ${page || entityId || ""}`, {
      sessionId: sessionId.slice(0, 8),
      referer: referer?.slice(0, 50),
    });

    // If database is configured, store the event
    if (isDatabaseConfigured()) {
      try {
        await db.insert(analytics).values({
          id: generateUUID(),
          eventType,
          entityType: entityType || (type === "pageview" ? "page" : null),
          entityId: entityId || page || null,
          metadata: metadata || null,
          sessionId,
          ipAddress: ip,
          userAgent: userAgent.slice(0, 500),
          referrer: referer,
        });
      } catch (dbError) {
        // Tables might not exist, log but don't fail
        console.log("[Analytics] DB not ready, skipping storage");
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Analytics] Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// GET - Fetch analytics summary (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: {
          totalViews: 0,
          uniqueSessions: 0,
          topPages: [],
          recentEvents: [],
          viewsByDay: [],
          referrers: [],
          devices: [],
          todayViews: 0,
          todaySessions: 0,
        },
      });
    }

    const since = Math.floor(Date.now() / 1000) - days * 86400;
    const todayStart = Math.floor(new Date(new Date().toISOString().split("T")[0]).getTime() / 1000);

    // Run all queries in parallel
    const [
      totalViewsResult,
      uniqueSessionsResult,
      todayViewsResult,
      todaySessionsResult,
      topPagesResult,
      recentEventsResult,
      viewsByDayResult,
      referrersResult,
      devicesResult,
    ] = await Promise.all([
      // Total page views in period
      db
        .select({ count: sql<number>`count(*)` })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(since * 1000))
          )
        ),

      // Unique sessions in period
      db
        .select({ count: sql<number>`count(distinct ${analytics.sessionId})` })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(since * 1000))
          )
        ),

      // Today's page views
      db
        .select({ count: sql<number>`count(*)` })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(todayStart * 1000))
          )
        ),

      // Today's unique sessions
      db
        .select({ count: sql<number>`count(distinct ${analytics.sessionId})` })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(todayStart * 1000))
          )
        ),

      // Top pages
      db
        .select({
          page: analytics.entityId,
          views: sql<number>`count(*)`,
        })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(since * 1000))
          )
        )
        .groupBy(analytics.entityId)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      // Recent events
      db
        .select({
          eventType: analytics.eventType,
          entityId: analytics.entityId,
          referrer: analytics.referrer,
          createdAt: analytics.createdAt,
        })
        .from(analytics)
        .orderBy(desc(analytics.createdAt))
        .limit(20),

      // Views by day
      db
        .select({
          date: sql<string>`date(${analytics.createdAt}, 'unixepoch')`,
          views: sql<number>`count(*)`,
          uniqueVisitors: sql<number>`count(distinct ${analytics.sessionId})`,
        })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(since * 1000))
          )
        )
        .groupBy(sql`date(${analytics.createdAt}, 'unixepoch')`)
        .orderBy(sql`date(${analytics.createdAt}, 'unixepoch')`)
        .limit(60),

      // Top referrers
      db
        .select({
          referrer: analytics.referrer,
          count: sql<number>`count(*)`,
        })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(since * 1000)),
            sql`${analytics.referrer} IS NOT NULL`,
            sql`${analytics.referrer} != ''`,
            sql`${analytics.referrer} != 'unknown'`
          )
        )
        .groupBy(analytics.referrer)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      // Device breakdown (simplified from user agent)
      db
        .select({
          isMobile: sql<number>`CASE WHEN ${analytics.userAgent} LIKE '%Mobile%' OR ${analytics.userAgent} LIKE '%Android%' OR ${analytics.userAgent} LIKE '%iPhone%' THEN 1 ELSE 0 END`,
          count: sql<number>`count(distinct ${analytics.sessionId})`,
        })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(since * 1000))
          )
        )
        .groupBy(sql`CASE WHEN ${analytics.userAgent} LIKE '%Mobile%' OR ${analytics.userAgent} LIKE '%Android%' OR ${analytics.userAgent} LIKE '%iPhone%' THEN 1 ELSE 0 END`),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalViews: Number(totalViewsResult[0]?.count || 0),
        uniqueSessions: Number(uniqueSessionsResult[0]?.count || 0),
        todayViews: Number(todayViewsResult[0]?.count || 0),
        todaySessions: Number(todaySessionsResult[0]?.count || 0),
        topPages: topPagesResult.map((p) => ({
          page: p.page || "/",
          views: Number(p.views),
        })),
        recentEvents: recentEventsResult.map((e) => ({
          eventType: e.eventType,
          entityId: e.entityId,
          referrer: e.referrer,
          createdAt: e.createdAt?.toISOString?.() || e.createdAt,
        })),
        viewsByDay: viewsByDayResult.map((d) => ({
          date: d.date,
          views: Number(d.views),
          uniqueVisitors: Number(d.uniqueVisitors),
        })),
        referrers: referrersResult.map((r) => ({
          referrer: r.referrer || "direct",
          count: Number(r.count),
        })),
        devices: {
          mobile: Number(devicesResult.find((d) => d.isMobile === 1)?.count || 0),
          desktop: Number(devicesResult.find((d) => d.isMobile === 0)?.count || 0),
        },
      },
    });
  } catch (error) {
    console.error("[Analytics] Error fetching:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
