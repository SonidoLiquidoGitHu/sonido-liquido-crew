import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { presaveClicks, upcomingReleases } from "@/db/schema";
import { sql, eq, gte, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";
    const releaseId = searchParams.get("releaseId");

    // Calculate date filter
    let dateFilter = new Date();
    switch (range) {
      case "7d":
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case "30d":
        dateFilter.setDate(dateFilter.getDate() - 30);
        break;
      case "90d":
        dateFilter.setDate(dateFilter.getDate() - 90);
        break;
      case "all":
        dateFilter = new Date(0); // Beginning of time
        break;
    }

    const dateFilterStr = dateFilter.toISOString();

    // Build base query conditions
    const conditions = [
      sql`${presaveClicks.clickedAt} >= ${dateFilterStr}`,
    ];

    if (releaseId) {
      conditions.push(eq(presaveClicks.upcomingReleaseId, releaseId));
    }

    // Get total clicks and unique users
    const [totals] = await db
      .select({
        totalClicks: sql<number>`count(*)`,
        uniqueUsers: sql<number>`count(distinct ${presaveClicks.ipHash})`,
      })
      .from(presaveClicks)
      .where(sql`${presaveClicks.clickedAt} >= ${dateFilterStr}`);

    // Get clicks by platform
    const byPlatform = await db
      .select({
        platform: presaveClicks.platform,
        count: sql<number>`count(*)`,
        uniqueUsers: sql<number>`count(distinct ${presaveClicks.ipHash})`,
      })
      .from(presaveClicks)
      .where(sql`${presaveClicks.clickedAt} >= ${dateFilterStr}`)
      .groupBy(presaveClicks.platform)
      .orderBy(desc(sql`count(*)`));

    // Get clicks by source
    const bySource = await db
      .select({
        source: presaveClicks.source,
        count: sql<number>`count(*)`,
      })
      .from(presaveClicks)
      .where(sql`${presaveClicks.clickedAt} >= ${dateFilterStr}`)
      .groupBy(presaveClicks.source)
      .orderBy(desc(sql`count(*)`));

    // Get timeline (daily counts)
    const timeline = await db
      .select({
        date: sql<string>`date(${presaveClicks.clickedAt})`,
        count: sql<number>`count(*)`,
      })
      .from(presaveClicks)
      .where(sql`${presaveClicks.clickedAt} >= ${dateFilterStr}`)
      .groupBy(sql`date(${presaveClicks.clickedAt})`)
      .orderBy(sql`date(${presaveClicks.clickedAt})`);

    // Calculate percentages
    const totalClicks = totals?.totalClicks || 0;

    const platformWithPercentage = byPlatform.map(p => ({
      ...p,
      percentage: totalClicks > 0 ? (p.count / totalClicks) * 100 : 0,
    }));

    const sourceWithPercentage = bySource.map(s => ({
      ...s,
      percentage: totalClicks > 0 ? (s.count / totalClicks) * 100 : 0,
    }));

    // Get total views for conversion rate
    const [viewTotals] = await db
      .select({
        totalViews: sql<number>`sum(${upcomingReleases.viewCount})`,
      })
      .from(upcomingReleases);

    const conversionRate = viewTotals?.totalViews > 0
      ? (totalClicks / viewTotals.totalViews) * 100
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalClicks,
          uniqueUsers: totals?.uniqueUsers || 0,
          topPlatform: byPlatform[0]?.platform || null,
          topSource: bySource[0]?.source || null,
          conversionRate,
        },
        byPlatform: platformWithPercentage,
        bySource: sourceWithPercentage,
        timeline,
      },
    });
  } catch (error) {
    console.error("[Presave Analytics] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
