import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { beats, beatDownloads } from "@/db/schema";
import { eq, sql, desc, and, gte } from "drizzle-orm";

/**
 * GET /api/admin/beats/stats
 *
 * Returns detailed statistics for the beats section.
 * Supports optional query params:
 *   - period: "7d" | "30d" | "90d" | "all" (default "30d")
 *   - beatId: specific beat ID (optional, returns single beat stats)
 */
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";
    const beatId = searchParams.get("beatId");

    // Calculate date range
    const now = new Date();
    let sinceDate: Date;
    switch (period) {
      case "7d":
        sinceDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        sinceDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        sinceDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        sinceDate = new Date(0); // all time
    }

    const sinceTimestamp = Math.floor(sinceDate.getTime() / 1000);

    // ---- Overall aggregates ----
    const [totals] = await db
      .select({
        totalBeats: sql<number>`count(*)`,
        totalPlays: sql<number>`coalesce(sum(${beats.playCount}), 0)`,
        totalDownloads: sql<number>`coalesce(sum(${beats.downloadCount}), 0)`,
        totalViews: sql<number>`coalesce(sum(${beats.viewCount}), 0)`,
        activeBeats: sql<number>`coalesce(sum(case when ${beats.isActive} = 1 then 1 else 0 end), 0)`,
        gatedBeats: sql<number>`coalesce(sum(case when ${beats.gateEnabled} = 1 then 1 else 0 end), 0)`,
      })
      .from(beats);

    // ---- Downloads in period ----
    const periodDownloads = beatId
      ? await db
          .select({
            count: sql<number>`count(*)`,
            withEmail: sql<number>`coalesce(sum(case when ${beatDownloads.email} is not null then 1 else 0 end), 0)`,
            spotifyFollow: sql<number>`coalesce(sum(case when ${beatDownloads.completedSpotifyFollow} = 1 then 1 else 0 end), 0)`,
            spotifyPlay: sql<number>`coalesce(sum(case when ${beatDownloads.completedSpotifyPlay} = 1 then 1 else 0 end), 0)`,
            hyperfollow: sql<number>`coalesce(sum(case when ${beatDownloads.completedHyperfollow} = 1 then 1 else 0 end), 0)`,
            instagramShare: sql<number>`coalesce(sum(case when ${beatDownloads.completedInstagramShare} = 1 then 1 else 0 end), 0)`,
            facebookShare: sql<number>`coalesce(sum(case when ${beatDownloads.completedFacebookShare} = 1 then 1 else 0 end), 0)`,
            customAction: sql<number>`coalesce(sum(case when ${beatDownloads.completedCustomAction} = 1 then 1 else 0 end), 0)`,
          })
          .from(beatDownloads)
          .where(
            and(
              eq(beatDownloads.beatId, beatId),
              gte(beatDownloads.createdAt, new Date(sinceTimestamp * 1000))
            )
          )
      : await db
          .select({
            count: sql<number>`count(*)`,
            withEmail: sql<number>`coalesce(sum(case when ${beatDownloads.email} is not null then 1 else 0 end), 0)`,
            spotifyFollow: sql<number>`coalesce(sum(case when ${beatDownloads.completedSpotifyFollow} = 1 then 1 else 0 end), 0)`,
            spotifyPlay: sql<number>`coalesce(sum(case when ${beatDownloads.completedSpotifyPlay} = 1 then 1 else 0 end), 0)`,
            hyperfollow: sql<number>`coalesce(sum(case when ${beatDownloads.completedHyperfollow} = 1 then 1 else 0 end), 0)`,
            instagramShare: sql<number>`coalesce(sum(case when ${beatDownloads.completedInstagramShare} = 1 then 1 else 0 end), 0)`,
            facebookShare: sql<number>`coalesce(sum(case when ${beatDownloads.completedFacebookShare} = 1 then 1 else 0 end), 0)`,
            customAction: sql<number>`coalesce(sum(case when ${beatDownloads.completedCustomAction} = 1 then 1 else 0 end), 0)`,
          })
          .from(beatDownloads)
          .where(gte(beatDownloads.createdAt, new Date(sinceTimestamp * 1000)));

    // ---- Per-beat stats ----
    const beatStats = await db
      .select({
        id: beats.id,
        title: beats.title,
        slug: beats.slug,
        isActive: beats.isActive,
        gateEnabled: beats.gateEnabled,
        playCount: beats.playCount,
        downloadCount: beats.downloadCount,
        viewCount: beats.viewCount,
        // Downloads in period
        periodDownloads: sql<number>`coalesce((
          select count(*) from ${beatDownloads}
          where ${beatDownloads.beatId} = ${beats.id}
          and ${beatDownloads.createdAt} >= ${new Date(sinceTimestamp * 1000)}
        ), 0)`,
        // Gate completion rate: downloads / views
        gateCompletionRate: sql<number>`case
          when ${beats.viewCount} > 0 then round(cast(${beats.downloadCount} as real) / cast(${beats.viewCount} as real) * 100, 1)
          else 0
        end`,
        // Unique emails collected
        uniqueEmails: sql<number>`coalesce((
          select count(distinct ${beatDownloads.email}) from ${beatDownloads}
          where ${beatDownloads.beatId} = ${beats.id}
          and ${beatDownloads.email} is not null
        ), 0)`,
        // Last download date
        lastDownloadAt: sql<string | null>`(
          select strftime('%Y-%m-%dT%H:%M:%SZ', ${beatDownloads.createdAt}, 'unixepoch')
          from ${beatDownloads}
          where ${beatDownloads.beatId} = ${beats.id}
          order by ${beatDownloads.createdAt} desc
          limit 1
        )`,
        // Spotify follow completion
        spotifyFollowCount: sql<number>`coalesce((
          select count(*) from ${beatDownloads}
          where ${beatDownloads.beatId} = ${beats.id}
          and ${beatDownloads.completedSpotifyFollow} = 1
        ), 0)`,
        // Spotify play completion
        spotifyPlayCount: sql<number>`coalesce((
          select count(*) from ${beatDownloads}
          where ${beatDownloads.beatId} = ${beats.id}
          and ${beatDownloads.completedSpotifyPlay} = 1
        ), 0)`,
      })
      .from(beats)
      .orderBy(desc(beats.createdAt));

    // ---- Daily downloads chart data (last 30 days) ----
    const dailyDownloads = await db
      .select({
        date: sql<string>`date(${beatDownloads.createdAt}, 'unixepoch')`,
        count: sql<number>`count(*)`,
      })
      .from(beatDownloads)
      .where(
        and(
          beatId ? eq(beatDownloads.beatId, beatId) : undefined,
          gte(beatDownloads.createdAt, new Date(sinceTimestamp * 1000))
        )
      )
      .groupBy(sql`date(${beatDownloads.createdAt}, 'unixepoch')`)
      .orderBy(sql`date(${beatDownloads.createdAt}, 'unixepoch')`);

    // ---- Recent downloads ----
    const recentDownloads = await db
      .select({
        id: beatDownloads.id,
        beatId: beatDownloads.beatId,
        beatTitle: beats.title,
        email: beatDownloads.email,
        name: beatDownloads.name,
        completedSpotifyFollow: beatDownloads.completedSpotifyFollow,
        completedSpotifyPlay: beatDownloads.completedSpotifyPlay,
        completedHyperfollow: beatDownloads.completedHyperfollow,
        completedInstagramShare: beatDownloads.completedInstagramShare,
        completedFacebookShare: beatDownloads.completedFacebookShare,
        completedCustomAction: beatDownloads.completedCustomAction,
        createdAt: beatDownloads.createdAt,
      })
      .from(beatDownloads)
      .leftJoin(beats, eq(beatDownloads.beatId, beats.id))
      .where(
        beatId
          ? and(
              eq(beatDownloads.beatId, beatId),
              gte(beatDownloads.createdAt, new Date(sinceTimestamp * 1000))
            )
          : gte(beatDownloads.createdAt, new Date(sinceTimestamp * 1000))
      )
      .orderBy(desc(beatDownloads.createdAt))
      .limit(50);

    // Calculate conversion rates
    const overallConversionRate = totals.totalViews > 0
      ? Math.round((totals.totalDownloads / totals.totalViews) * 100 * 10) / 10
      : 0;

    const periodConversionRate = totals.totalViews > 0
      ? Math.round((periodDownloads[0].count / Math.max(totals.totalViews, 1)) * 100 * 10) / 10
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        period,
        sinceDate: sinceDate.toISOString(),
        overview: {
          ...totals,
          overallConversionRate,
          periodDownloads: periodDownloads[0].count,
          periodConversionRate,
        },
        gateActions: periodDownloads[0],
        beatStats,
        dailyDownloads,
        recentDownloads,
      },
    });
  } catch (error) {
    console.error("[API] Error fetching beat stats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch beat stats" },
      { status: 500 }
    );
  }
}
