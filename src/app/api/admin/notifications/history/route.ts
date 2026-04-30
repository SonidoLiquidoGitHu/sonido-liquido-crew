import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { notificationHistory } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

// GET - Get notification history
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Get history entries
    const history = await db
      .select()
      .from(notificationHistory)
      .orderBy(desc(notificationHistory.sentAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(notificationHistory);

    // Get stats
    const [stats] = await db
      .select({
        totalSent: sql<number>`sum(${notificationHistory.successCount})`,
        totalFailed: sql<number>`sum(${notificationHistory.failedCount})`,
        totalNotifications: sql<number>`count(*)`,
      })
      .from(notificationHistory);

    return NextResponse.json({
      success: true,
      data: {
        history,
        pagination: {
          total: countResult?.count || 0,
          limit,
          offset,
          hasMore: offset + limit < (countResult?.count || 0),
        },
        stats: {
          totalSent: stats?.totalSent || 0,
          totalFailed: stats?.totalFailed || 0,
          totalNotifications: stats?.totalNotifications || 0,
          successRate: stats?.totalSent && (stats?.totalSent + (stats?.totalFailed || 0)) > 0
            ? (stats.totalSent / (stats.totalSent + (stats?.totalFailed || 0))) * 100
            : 100,
        },
      },
    });
  } catch (error) {
    console.error("[Notification History] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
