import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { presaveClicks, upcomingReleases } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

// Hash IP for privacy
function hashIP(ip: string): string {
  return crypto.createHash("sha256").update(ip + "presave-salt").digest("hex").substring(0, 16);
}

// POST - Track a presave click
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true }); // Silently succeed
    }

    const body = await request.json();
    const { releaseId, platform, source = "website" } = body;

    if (!releaseId || !platform) {
      return NextResponse.json(
        { success: false, error: "releaseId and platform are required" },
        { status: 400 }
      );
    }

    // Get user info
    const userAgent = request.headers.get("user-agent") || undefined;
    const referrer = request.headers.get("referer") || undefined;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
               request.headers.get("x-real-ip") ||
               "unknown";
    const ipHash = hashIP(ip);

    // Insert click record
    await db.insert(presaveClicks).values({
      upcomingReleaseId: releaseId,
      platform,
      source,
      referrer,
      userAgent,
      ipHash,
    });

    // Increment presave count on the release
    await db
      .update(upcomingReleases)
      .set({
        presaveCount: sql`${upcomingReleases.presaveCount} + 1`,
      })
      .where(eq(upcomingReleases.id, releaseId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Presave Track] Error:", error);
    // Silently succeed to not break user experience
    return NextResponse.json({ success: true });
  }
}

// GET - Get presave analytics for a release (admin)
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const releaseId = searchParams.get("releaseId");

    if (!releaseId) {
      // Return overall stats
      const stats = await db
        .select({
          platform: presaveClicks.platform,
          source: presaveClicks.source,
          count: sql<number>`count(*)`,
        })
        .from(presaveClicks)
        .groupBy(presaveClicks.platform, presaveClicks.source);

      return NextResponse.json({
        success: true,
        data: stats,
      });
    }

    // Get stats for specific release
    const clicks = await db
      .select({
        platform: presaveClicks.platform,
        source: presaveClicks.source,
        count: sql<number>`count(*)`,
        uniqueUsers: sql<number>`count(distinct ${presaveClicks.ipHash})`,
      })
      .from(presaveClicks)
      .where(eq(presaveClicks.upcomingReleaseId, releaseId))
      .groupBy(presaveClicks.platform, presaveClicks.source);

    // Get timeline (clicks per day)
    const timeline = await db
      .select({
        date: sql<string>`date(${presaveClicks.clickedAt})`,
        count: sql<number>`count(*)`,
      })
      .from(presaveClicks)
      .where(eq(presaveClicks.upcomingReleaseId, releaseId))
      .groupBy(sql`date(${presaveClicks.clickedAt})`)
      .orderBy(sql`date(${presaveClicks.clickedAt})`);

    return NextResponse.json({
      success: true,
      data: {
        byPlatform: clicks,
        timeline,
      },
    });
  } catch (error) {
    console.error("[Presave Analytics] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get analytics" },
      { status: 500 }
    );
  }
}
