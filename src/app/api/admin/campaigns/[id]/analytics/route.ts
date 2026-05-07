import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { campaigns, campaignActions } from "@/db/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
        { status: 503 }
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
        { status: 404 }
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
    const whereConditions = [eq(campaignActions.campaignId, id), ...dateFilters];
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
            `${e.email},${e.presave ? "Sí" : "No"},${e.follow ? "Sí" : "No"},${e.download ? "Sí" : "No"},${e.date}`
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
    const uniqueEmails = new Set(actions.filter((a) => a.email).map((a) => a.email)).size;
    const totalPresaves = actions.filter((a) => a.completedPresave).length;
    const totalFollows = actions.filter((a) => a.completedFollow).length;
    const totalDownloads = actions.filter((a) => a.completedDownload).length;

    // Daily stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats: Record<string, { views: number; conversions: number; downloads: number }> = {};
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
      source: a.referrer ? new URL(a.referrer).hostname.replace("www.", "") : "directo",
    }));

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
          conversionRate: campaign.totalViews > 0
            ? ((campaign.totalConversions / campaign.totalViews) * 100).toFixed(1)
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
      },
    });
  } catch (error) {
    console.error("[API] Error fetching campaign analytics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
