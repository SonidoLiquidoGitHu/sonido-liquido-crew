import { db, isDatabaseConfigured } from "@/db/client";
import { analytics } from "@/db/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Number.parseInt(searchParams.get("days") || "30", 10);

    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: getEmptyData(),
      });
    }

    const since = Math.floor(Date.now() / 1000) - days * 86400;
    const todayStart = Math.floor(
      new Date(new Date().toISOString().split("T")[0]).getTime() / 1000,
    );
    const yesterdayStart = todayStart - 86400;
    const prevPeriodStart = since - days * 86400;

    const [
      totalViews,
      uniqueSessions,
      todayViews,
      todaySessions,
      yesterdayViews,
      yesterdaySessions,
      prevPeriodViews,
      prevPeriodSessions,
      topPages,
      viewsByDay,
      referrers,
      deviceBreakdown,
      recentActivity,
    ] = await Promise.all([
      // Total page views in period
      db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(since * 1000)),
          ),
        )
        .then((r) => Number(r[0]?.count || 0))
        .catch(() => 0),

      // Unique sessions in period
      db
        .select({
          count: sql<number>`cast(count(distinct ${analytics.sessionId}) as integer)`,
        })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(since * 1000)),
          ),
        )
        .then((r) => Number(r[0]?.count || 0))
        .catch(() => 0),

      // Today's page views
      db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(todayStart * 1000)),
          ),
        )
        .then((r) => Number(r[0]?.count || 0))
        .catch(() => 0),

      // Today's unique sessions
      db
        .select({
          count: sql<number>`cast(count(distinct ${analytics.sessionId}) as integer)`,
        })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(todayStart * 1000)),
          ),
        )
        .then((r) => Number(r[0]?.count || 0))
        .catch(() => 0),

      // Yesterday's page views (for comparison)
      db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(yesterdayStart * 1000)),
            sql`${analytics.createdAt} < ${new Date(todayStart * 1000)}`,
          ),
        )
        .then((r) => Number(r[0]?.count || 0))
        .catch(() => 0),

      // Yesterday's unique sessions
      db
        .select({
          count: sql<number>`cast(count(distinct ${analytics.sessionId}) as integer)`,
        })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(yesterdayStart * 1000)),
            sql`${analytics.createdAt} < ${new Date(todayStart * 1000)}`,
          ),
        )
        .then((r) => Number(r[0]?.count || 0))
        .catch(() => 0),

      // Previous period page views (for trend)
      db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(prevPeriodStart * 1000)),
            sql`${analytics.createdAt} < ${new Date(since * 1000)}`,
          ),
        )
        .then((r) => Number(r[0]?.count || 0))
        .catch(() => 0),

      // Previous period unique sessions
      db
        .select({
          count: sql<number>`cast(count(distinct ${analytics.sessionId}) as integer)`,
        })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(prevPeriodStart * 1000)),
            sql`${analytics.createdAt} < ${new Date(since * 1000)}`,
          ),
        )
        .then((r) => Number(r[0]?.count || 0))
        .catch(() => 0),

      // Top pages
      db
        .select({
          page: analytics.entityId,
          views: sql<number>`cast(count(*) as integer)`,
        })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(since * 1000)),
          ),
        )
        .groupBy(analytics.entityId)
        .orderBy(desc(sql`count(*)`))
        .limit(10)
        .then((rows) =>
          rows.map((r) => ({
            page: r.page || "/",
            views: Number(r.views),
          })),
        )
        .catch(() => []),

      // Views by day
      db
        .select({
          date: sql<string>`date(${analytics.createdAt}, 'unixepoch')`,
          views: sql<number>`cast(count(*) as integer)`,
          uniqueVisitors: sql<number>`cast(count(distinct ${analytics.sessionId}) as integer)`,
        })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(since * 1000)),
          ),
        )
        .groupBy(sql`date(${analytics.createdAt}, 'unixepoch')`)
        .orderBy(sql`date(${analytics.createdAt}, 'unixepoch')`)
        .limit(90)
        .then((rows) =>
          rows.map((r) => ({
            date: r.date,
            views: Number(r.views),
            uniqueVisitors: Number(r.uniqueVisitors),
          })),
        )
        .catch(() => []),

      // Top referrers
      db
        .select({
          referrer: analytics.referrer,
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(since * 1000)),
            sql`${analytics.referrer} IS NOT NULL`,
            sql`${analytics.referrer} != ''`,
            sql`${analytics.referrer} != 'unknown'`,
          ),
        )
        .groupBy(analytics.referrer)
        .orderBy(desc(sql`count(*)`))
        .limit(8)
        .then((rows) =>
          rows.map((r) => ({
            referrer: extractDomain(r.referrer || "direct"),
            count: Number(r.count),
          })),
        )
        .catch(() => []),

      // Device breakdown (mobile vs desktop by session)
      db
        .select({
          category: sql<string>`CASE 
            WHEN ${analytics.userAgent} LIKE '%Mobile%' OR ${analytics.userAgent} LIKE '%Android%' AND ${analytics.userAgent} NOT LIKE '%bot%' OR ${analytics.userAgent} LIKE '%iPhone%' THEN 'mobile'
            WHEN ${analytics.userAgent} LIKE '%bot%' OR ${analytics.userAgent} LIKE '%Spider%' OR ${analytics.userAgent} LIKE '%crawler%' THEN 'bot'
            ELSE 'desktop'
          END`,
          count: sql<number>`cast(count(distinct ${analytics.sessionId}) as integer)`,
        })
        .from(analytics)
        .where(
          and(
            eq(analytics.eventType, "page_view"),
            gte(analytics.createdAt, new Date(since * 1000)),
          ),
        )
        .groupBy(
          sql`CASE 
            WHEN ${analytics.userAgent} LIKE '%Mobile%' OR ${analytics.userAgent} LIKE '%Android%' AND ${analytics.userAgent} NOT LIKE '%bot%' OR ${analytics.userAgent} LIKE '%iPhone%' THEN 'mobile'
            WHEN ${analytics.userAgent} LIKE '%bot%' OR ${analytics.userAgent} LIKE '%Spider%' OR ${analytics.userAgent} LIKE '%crawler%' THEN 'bot'
            ELSE 'desktop'
          END`,
        )
        .then((rows) => {
          const result = { mobile: 0, desktop: 0, bot: 0 };
          for (const r of rows) {
            result[r.category as keyof typeof result] = Number(r.count);
          }
          return result;
        })
        .catch(() => ({ mobile: 0, desktop: 0, bot: 0 })),

      // Recent activity (last 10 events of any type)
      db
        .select({
          eventType: analytics.eventType,
          entityId: analytics.entityId,
          referrer: analytics.referrer,
          userAgent: analytics.userAgent,
          createdAt: analytics.createdAt,
        })
        .from(analytics)
        .orderBy(desc(analytics.createdAt))
        .limit(15)
        .then((rows) =>
          rows.map((r) => ({
            eventType: r.eventType,
            page: r.entityId || "/",
            referrer: r.referrer || null,
            isMobile: /Mobile|Android|iPhone/.test(r.userAgent || ""),
            time: r.createdAt?.toISOString?.() || String(r.createdAt),
          })),
        )
        .catch(() => []),
    ]);

    // Calculate trends
    const viewsTrend =
      prevPeriodViews > 0
        ? Math.round(((totalViews - prevPeriodViews) / prevPeriodViews) * 100)
        : totalViews > 0
          ? 100
          : 0;

    const sessionsTrend =
      prevPeriodSessions > 0
        ? Math.round(
            ((uniqueSessions - prevPeriodSessions) / prevPeriodSessions) * 100,
          )
        : uniqueSessions > 0
          ? 100
          : 0;

    // Calculate bounce rate (sessions with only 1 page view)
    const bounceRate = 0; // Would need more complex query; placeholder

    // Calculate avg pages per session
    const avgPagesPerSession =
      uniqueSessions > 0
        ? Math.round((totalViews / uniqueSessions) * 10) / 10
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalViews,
        uniqueSessions,
        todayViews,
        todaySessions,
        yesterdayViews,
        yesterdaySessions,
        viewsTrend,
        sessionsTrend,
        avgPagesPerSession,
        bounceRate,
        topPages,
        viewsByDay,
        referrers,
        devices: deviceBreakdown,
        recentActivity,
      },
    });
  } catch (error) {
    console.error("[Analytics Visitors] Error:", error);
    return NextResponse.json({
      success: true,
      data: getEmptyData(),
    });
  }
}

function getEmptyData() {
  return {
    totalViews: 0,
    uniqueSessions: 0,
    todayViews: 0,
    todaySessions: 0,
    yesterdayViews: 0,
    yesterdaySessions: 0,
    viewsTrend: 0,
    sessionsTrend: 0,
    avgPagesPerSession: 0,
    bounceRate: 0,
    topPages: [],
    viewsByDay: [],
    referrers: [],
    devices: { mobile: 0, desktop: 0, bot: 0 },
    recentActivity: [],
  };
}

function extractDomain(url: string): string {
  try {
    if (url === "direct" || !url.startsWith("http")) return url;
    const parsed = new URL(url);
    return parsed.hostname.replace("www.", "");
  } catch {
    return url.slice(0, 30);
  }
}
