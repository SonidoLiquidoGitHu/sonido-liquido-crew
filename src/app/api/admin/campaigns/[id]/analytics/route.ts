import { db, isDatabaseConfigured } from "@/db/client";
import { campaignActions, campaigns, videoAnalytics } from "@/db/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const exportEmails = searchParams.get("export") === "emails";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 },
      );
    }

    // Fetch campaign
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id));

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 },
      );
    }

    // Build date filter
    const dateFilters = [];
    if (startDate) {
      dateFilters.push(gte(campaignActions.createdAt, new Date(startDate)));
    }
    if (endDate) {
      dateFilters.push(lte(campaignActions.createdAt, new Date(endDate)));
    }

    // Fetch all actions
    const whereConditions = [
      eq(campaignActions.campaignId, id),
      ...dateFilters,
    ];
    const actions = await db
      .select()
      .from(campaignActions)
      .where(and(...whereConditions))
      .orderBy(desc(campaignActions.createdAt));

    // If export emails, return CSV
    if (exportEmails) {
      const emails = actions
        .filter((a) => a.email)
        .map((a) => ({
          email: a.email,
          presave: a.completedPresave,
          follow: a.completedFollow,
          download: a.completedDownload,
          date: a.createdAt?.toISOString() || "",
        }));

      const csv = [
        "Email,Pre-save,Follow,Download,Fecha",
        ...emails.map(
          (e) =>
            `${e.email},${e.presave ? "Sí" : "No"},${e.follow ? "Sí" : "No"},${e.download ? "Sí" : "No"},${e.date}`,
        ),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${campaign.slug}-emails-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Calculate analytics
    const totalActions = actions.length;
    const uniqueEmails = new Set(
      actions.filter((a) => a.email).map((a) => a.email),
    ).size;
    const totalPresaves = actions.filter((a) => a.completedPresave).length;
    const totalFollows = actions.filter((a) => a.completedFollow).length;
    const totalDownloads = actions.filter((a) => a.completedDownload).length;

    // Daily stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats: Record<
      string,
      { views: number; conversions: number; downloads: number }
    > = {};
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      dailyStats[dateKey] = { views: 0, conversions: 0, downloads: 0 };
    }

    actions.forEach((action) => {
      if (!action.createdAt) return;
      const dateKey = action.createdAt.toISOString().split("T")[0];
      if (dailyStats[dateKey]) {
        dailyStats[dateKey].conversions++;
        if (action.completedDownload) {
          dailyStats[dateKey].downloads++;
        }
      }
    });

    // Source breakdown
    const sources: Record<string, number> = {};
    actions.forEach((action) => {
      const source = action.referrer
        ? new URL(action.referrer).hostname.replace("www.", "")
        : "directo";
      sources[source] = (sources[source] || 0) + 1;
    });

    // Recent actions
    const recentActions = actions.slice(0, 50).map((a) => ({
      id: a.id,
      email: a.email,
      presave: a.completedPresave,
      follow: a.completedFollow,
      download: a.completedDownload,
      date: a.createdAt?.toISOString() || "",
      source: a.referrer
        ? new URL(a.referrer).hostname.replace("www.", "")
        : "directo",
    }));

    // ===========================================
    // WHO'S LISTENING DATA
    // ===========================================
    // Fetch all video/audio analytics events for this campaign
    const listeningEvents = await db
      .select()
      .from(videoAnalytics)
      .where(
        and(
          eq(videoAnalytics.contentId, id),
          eq(videoAnalytics.contentType, "campaign"),
        ),
      )
      .orderBy(desc(videoAnalytics.createdAt));

    // Build a map: sessionId → listening data
    const sessionMap = new Map<
      string,
      {
        sessionId: string;
        ipAddress: string | null;
        userAgent: string | null;
        playCount: number;
        maxPercent: number;
        totalWatchTime: number;
        duration: number;
        firstPlayAt: Date | null;
        lastPlayAt: Date | null;
        completed: boolean;
      }
    >();

    for (const event of listeningEvents) {
      const sid = event.sessionId;
      if (!sessionMap.has(sid)) {
        sessionMap.set(sid, {
          sessionId: sid,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          playCount: 0,
          maxPercent: 0,
          totalWatchTime: 0,
          duration: event.duration,
          firstPlayAt: null,
          lastPlayAt: null,
          completed: false,
        });
      }
      const entry = sessionMap.get(sid)!;
      if (event.eventType === "play") {
        entry.playCount++;
        if (!entry.firstPlayAt) entry.firstPlayAt = event.createdAt;
        entry.lastPlayAt = event.createdAt;
      }
      if (event.maxPercentWatched > entry.maxPercent) {
        entry.maxPercent = event.maxPercentWatched;
      }
      if (event.totalWatchTime > entry.totalWatchTime) {
        entry.totalWatchTime = event.totalWatchTime;
      }
      if (event.eventType === "complete") {
        entry.completed = true;
      }
    }

    // Correlate sessions with campaign actions (match by IP address)
    const ipToEmail = new Map<string, string>();
    const ipToAction = new Map<string, (typeof actions)[0] | null>();
    for (const action of actions) {
      if (action.ipAddress) {
        if (action.email) ipToEmail.set(action.ipAddress, action.email);
        ipToAction.set(action.ipAddress, action);
      }
    }

    // Build the listeners list
    const listeners = Array.from(sessionMap.values())
      .map((session) => {
        const email = session.ipAddress
          ? ipToEmail.get(session.ipAddress) || null
          : null;
        const action = session.ipAddress
          ? ipToAction.get(session.ipAddress) || null
          : null;
        // Determine label: email if known, otherwise truncated IP
        const label =
          email ||
          (session.ipAddress
            ? `${session.ipAddress.split(".").slice(0, 3).join(".")}.xxx`
            : "Desconocido");
        return {
          sessionId: session.sessionId,
          label,
          email,
          ipAddress: session.ipAddress,
          playCount: session.playCount,
          maxPercent: session.maxPercent,
          totalWatchTime: session.totalWatchTime,
          duration: session.duration,
          firstPlayAt: session.firstPlayAt?.toISOString() || null,
          lastPlayAt: session.lastPlayAt?.toISOString() || null,
          completed: session.completed,
          presave: action?.completedPresave || false,
          follow: action?.completedFollow || false,
        };
      })
      // Sort: known emails first, then by most recent play
      .sort((a, b) => {
        if (a.email && !b.email) return -1;
        if (!a.email && b.email) return 1;
        return (b.lastPlayAt || "").localeCompare(a.lastPlayAt || "");
      });

    // Listening summary stats
    const listeningStats = {
      totalListeners: listeners.length,
      knownListeners: listeners.filter((l) => l.email).length,
      anonymousListeners: listeners.filter((l) => !l.email).length,
      totalPlays: listeners.reduce((sum, l) => sum + l.playCount, 0),
      avgListenPercent:
        listeners.length > 0
          ? Math.round(
              listeners.reduce((sum, l) => sum + l.maxPercent, 0) /
                listeners.length,
            )
          : 0,
      completionRate:
        listeners.length > 0
          ? Math.round(
              (listeners.filter((l) => l.completed).length / listeners.length) *
                100,
            )
          : 0,
      totalListenTimeSeconds: listeners.reduce(
        (sum, l) => sum + l.totalWatchTime,
        0,
      ),
    };

    return NextResponse.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          title: campaign.title,
          slug: campaign.slug,
          type: campaign.campaignType,
          isActive: campaign.isActive,
          totalViews: campaign.totalViews,
          totalConversions: campaign.totalConversions,
          totalDownloads: campaign.totalDownloads,
        },
        stats: {
          totalActions,
          uniqueEmails,
          totalPresaves,
          totalFollows,
          totalDownloads,
          conversionRate:
            campaign.totalViews > 0
              ? (
                  (campaign.totalConversions / campaign.totalViews) *
                  100
                ).toFixed(1)
              : "0",
        },
        dailyStats: Object.entries(dailyStats)
          .map(([date, stats]) => ({ date, ...stats }))
          .reverse(),
        sources: Object.entries(sources)
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        recentActions,
        listening: {
          stats: listeningStats,
          listeners,
        },
      },
    });
  } catch (error) {
    console.error("[API] Error fetching campaign analytics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
