// ===========================================
// ADMIN API: SOCIAL AUTO-POSTING
// GET  — Queue status + summary
// POST — Actions: process-next, populate, reset-cycle, skip-item
// ===========================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { socialPostQueue, socialPostsLog } from "@/db/schema";
import { eq, desc, sql as drizzleSql, and, count } from "drizzle-orm";
import {
  isMetaConfigured,
  validateToken,
  processQueueItem,
  getNextPendingItem,
  type PostQueueItemResult,
} from "@/lib/clients/meta";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ===========================================
// GET — Queue status & summary
// ===========================================

export async function GET(request: NextRequest) {
  try {
    // Get queue summary
    const queueSummary = await db
      .select({
        status: socialPostQueue.status,
        count: count(),
      })
      .from(socialPostQueue)
      .groupBy(socialPostQueue.status);

    const summaryMap: Record<string, number> = {};
    for (const row of queueSummary) {
      summaryMap[row.status] = row.count;
    }

    // Get content type breakdown
    const contentBreakdown = await db
      .select({
        contentType: socialPostQueue.contentType,
        count: count(),
      })
      .from(socialPostQueue)
      .groupBy(socialPostQueue.contentType);

    const contentMap: Record<string, number> = {};
    for (const row of contentBreakdown) {
      contentMap[row.contentType] = row.count;
    }

    // Get current cycle info
    const cycleInfo = await db
      .select({
        maxCycle: drizzleSql`MAX(${socialPostQueue.cycleNumber})`,
      })
      .from(socialPostQueue);

    const currentCycle = cycleInfo[0]?.maxCycle || 0;

    // Get recent post history (last 20)
    const recentLogs = await db
      .select()
      .from(socialPostsLog)
      .orderBy(desc(socialPostsLog.postedAt))
      .limit(20);

    // Get next pending items (preview)
    const nextPending = await db
      .select()
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "pending"))
      .orderBy(socialPostQueue.queueOrder)
      .limit(5);

    // Meta API configuration status
    const metaStatus = {
      configured: isMetaConfigured(),
      appId: !!process.env.META_APP_ID,
      appSecret: !!process.env.META_APP_SECRET,
      systemUserToken: !!process.env.META_SYSTEM_USER_TOKEN,
      facebookPageId: !!process.env.FACEBOOK_PAGE_ID,
    };

    return NextResponse.json({
      success: true,
      data: {
        queue: {
          total: Object.values(summaryMap).reduce((a, b) => a + b, 0),
          pending: summaryMap["pending"] || 0,
          posted: summaryMap["posted"] || 0,
          failed: summaryMap["failed"] || 0,
          skipped: summaryMap["skipped"] || 0,
          byContentType: contentMap,
          currentCycle,
        },
        nextPending,
        recentLogs,
        metaStatus,
      },
    });
  } catch (error) {
    console.error("[Social API] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch queue status" },
      { status: 500 }
    );
  }
}

// ===========================================
// POST — Actions
// ===========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case "process-next":
        return await handleProcessNext();
      case "populate":
        return await handlePopulate();
      case "reset-cycle":
        return await handleResetCycle();
      case "skip-item":
        return await handleSkipItem(body.queueId);
      case "validate-token":
        return await handleValidateToken();
      case "retry-failed":
        return await handleRetryFailed();
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Social API] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Request failed" },
      { status: 500 }
    );
  }
}

// ===========================================
// ACTION HANDLERS
// ===========================================

async function handleProcessNext() {
  if (!isMetaConfigured()) {
    return NextResponse.json({
      success: false,
      message: "Meta API not configured. Set META_SYSTEM_USER_TOKEN and FACEBOOK_PAGE_ID env vars.",
    });
  }

  const nextItem = await getNextPendingItem();
  if (!nextItem) {
    return NextResponse.json({
      success: false,
      message: "No pending items in queue. All items have been posted or queue is empty.",
    });
  }

  console.log(`[Social API] Processing queue item: ${nextItem.contentType} (${nextItem.sourceId})`);

  const result = await processQueueItem(nextItem);

  const fbStatus = result.facebook.success ? "success" : `failed: ${result.facebook.error}`;
  const igStatus = result.instagram.success ? "success" : `failed: ${result.instagram.error}`;

  return NextResponse.json({
    success: result.facebook.success || result.instagram.success,
    message: `Posted to FB: ${fbStatus}, IG: ${igStatus}`,
    result,
  });
}

async function handlePopulate() {
  // Call the populate script's logic via internal API
  const siteUrl = process.env.URL || process.env.DEPLOY_URL || "http://localhost:3000";

  return NextResponse.json({
    success: true,
    message: "Use the populate-social-queue script to populate the queue. Run: npx tsx scripts/populate-social-queue.ts",
  });
}

async function handleResetCycle() {
  // Reset all items to pending for a new cycle
  const result = await db
    .update(socialPostQueue)
    .set({
      status: "pending",
      postedPlatforms: "[]",
      errorMessage: null,
      postedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(socialPostQueue.status, "posted"));

  const count2 = result?.rowsAffected ?? 0;

  return NextResponse.json({
    success: true,
    message: `Reset ${count2} posted items back to pending for a new cycle.`,
  });
}

async function handleSkipItem(queueId: string) {
  if (!queueId) {
    return NextResponse.json(
      { success: false, error: "queueId is required" },
      { status: 400 }
    );
  }

  await db
    .update(socialPostQueue)
    .set({ status: "skipped", updatedAt: new Date() })
    .where(eq(socialPostQueue.id, queueId));

  return NextResponse.json({
    success: true,
    message: "Item skipped",
  });
}

async function handleValidateToken() {
  const tokenInfo = await validateToken();
  return NextResponse.json({
    success: true,
    data: tokenInfo,
  });
}

async function handleRetryFailed() {
  // Reset all failed items to pending
  const result = await db
    .update(socialPostQueue)
    .set({
      status: "pending",
      postedPlatforms: "[]",
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(socialPostQueue.status, "failed"));

  const count2 = result?.rowsAffected ?? 0;

  return NextResponse.json({
    success: true,
    message: `Reset ${count2} failed items to pending for retry.`,
  });
}
