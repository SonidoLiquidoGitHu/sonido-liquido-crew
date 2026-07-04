// ===========================================
// ADMIN API: SOCIAL AUTO-POSTING
// GET  — Queue status + summary
// POST — Actions: process-next, populate, reset-cycle, skip-item, validate-token, retry-failed
// ===========================================

import { db } from "@/db/client";
import {
  events,
  artists,
  curatedSpotifyChannels,
  curatedTracks,
  galleryPhotos,
  releaseArtists,
  releases,
  socialPostQueue,
  socialPostsLog,
  verticalVideos,
  videos,
} from "@/db/schema";
// TikTok integration removed per user request
import { socialCredentials } from "@/db/schema";
import {
  type FacebookReelResult,
  type PostQueueItemResult,
  ensurePublicImageUrl,
  extractStoryLinkUrl,
  generateAICaption,
  generateCaption,
  getNextPendingItem,
  isMetaConfiguredAsync,
  postFacebookReel,
  postInstagramReel,
  postToFacebook,
  postToInstagram,
  postToInstagramStory,
  processQueueItem,
  validateToken,
} from "@/lib/clients/meta";
import {
  and,
  count,
  desc,
  sql as drizzleSql,
  eq,
  gt,
  gte,
  isNotNull,
  like,
  ne,
  not,
} from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sonidoliquido.com";

/**
 * Extract YouTube video ID from various URL formats.
 * Works with watch URLs, shorts URLs, embed URLs, and youtu.be shortlinks.
 */
function extractYouTubeId(
  videoUrl?: string | null,
  platformUrl?: string | null,
  embedUrl?: string | null,
): string | null {
  const urls = [embedUrl, platformUrl, videoUrl].filter(Boolean);
  for (const url of urls) {
    if (!url) continue;
    // embed/VIDEO_ID
    const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) return embedMatch[1];
    // shorts/VIDEO_ID or watch?v=VIDEO_ID
    const watchMatch = url.match(/(?:shorts\/|watch\?v=)([a-zA-Z0-9_-]+)/);
    if (watchMatch) return watchMatch[1];
    // youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) return shortMatch[1];
  }
  return null;
}

// ===========================================
// GET — Queue status & summary
// ===========================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    // Schedule config endpoint — used by the Netlify cron function
    if (action === "schedule-config") {
      const config = await getScheduleConfig();
      return NextResponse.json({ success: true, data: config });
    }

    // Today's counts endpoint — used by the Netlify cron function to enforce
    // daily caps. Returns DB-level counts of feed posts and IG stories posted
    // "today" in Mexico City time (CST = UTC-6 permanently).
    //
    // Why a dedicated endpoint instead of reusing recentLogs from GET /:
    //   1. recentLogs is capped at 20 rows, which undercounts on busy days.
    //   2. The previous cap math lived in the cron function and computed
    //      `startOfDayCST` wrong (00:00 UTC - 6h = noon CST yesterday),
    //      causing the cap to "reset" at 6pm CST and let evening hours
    //      over-post.
    //   3. Centralizing the timezone math here means the cron function
    //      doesn't need to know about CST at all.
    if (action === "today-counts") {
      const CST_OFFSET_HOURS = 6;
      const now = new Date();
      // Mexico City is UTC-6. "Today CST" started at 00:00 CST, which is
      // 06:00 UTC of the same calendar day IF current UTC >= 06:00.
      // If current UTC < 06:00, "today CST" started at 06:00 UTC YESTERDAY.
      const startOfTodayCST = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          CST_OFFSET_HOURS,
          0,
          0,
        ),
      );
      if (now.getUTCHours() < CST_OFFSET_HOURS) {
        // Before 06:00 UTC → CST is still on yesterday's calendar date.
        startOfTodayCST.setTime(
          startOfTodayCST.getTime() - 24 * 60 * 60 * 1000,
        );
      }

      // Count successful FEED posts since startOfTodayCST.
      // Feed posts = status='success', postedAt >= startOfTodayCST, AND
      // queueId NOT prefixed with 'throwback-' or 'autopost-event-'.
      //
      // IMPORTANT: use drizzle operators (gte, not, like) instead of raw
      // drizzleSql. The postedAt column is integer mode "timestamp", which
      // stores unix SECONDS. Drizzle's gte() knows how to convert a Date
      // object to the correct integer; raw drizzleSql would pass the Date
      // through to the driver as a string, silently breaking the comparison
      // and returning 0 (which would then disable the daily cap entirely).
      const feedCountRow = await db
        .select({ count: count() })
        .from(socialPostsLog)
        .where(
          and(
            eq(socialPostsLog.status, "success"),
            gte(socialPostsLog.postedAt, startOfTodayCST),
            not(like(socialPostsLog.queueId, "throwback-%")),
            not(like(socialPostsLog.queueId, "autopost-event-%")),
          ),
        );

      // Count successful IG STORIES since startOfTodayCST.
      // Stories = status='success' AND postedAt >= startOfTodayCST AND
      // queueId LIKE 'throwback-%' (the prefix applied by
      // handleProcessNextStoryOnly when it logs a Story).
      //
      // CRITICAL FIX (2026-06-20): The previous filter on platform='instagram_story'
      // silently returned 0 in production (likely a column-value mismatch in
      // older deployed rows), which made the daily cap NEVER trigger and let
      // stories post every single scheduled hour. Stories are now identified
      // by their queueId prefix 'throwback-' (set by handleProcessNextStoryOnly),
      // which is deterministic and immune to platform-value drift.
      const storyCountRow = await db
        .select({ count: count() })
        .from(socialPostsLog)
        .where(
          and(
            eq(socialPostsLog.status, "success"),
            like(socialPostsLog.queueId, "throwback-%"),
            gte(socialPostsLog.postedAt, startOfTodayCST),
          ),
        );

      const feedPostsToday = Number(feedCountRow[0]?.count) || 0;
      const storiesToday = Number(storyCountRow[0]?.count) || 0;

      return NextResponse.json({
        success: true,
        data: {
          feedPostsToday,
          storiesToday,
          startOfTodayCST: startOfTodayCST.toISOString(),
          nowUTC: now.toISOString(),
        },
      });
    }

    // ============================================================
    // DIAGNOSTIC: recent-logs — return ALL social_posts_log entries
    // from the last 24h, UNFILTERED (no platform filter, no status
    // filter). Used to diagnose why story-history returns 0 while
    // stories are visibly being posted to IG.
    // ============================================================
    if (action === "recent-logs") {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentLogs = await db
        .select({
          id: socialPostsLog.id,
          queueId: socialPostsLog.queueId,
          platform: socialPostsLog.platform,
          contentType: socialPostsLog.contentType,
          sourceId: socialPostsLog.sourceId,
          status: socialPostsLog.status,
          errorMessage: socialPostsLog.errorMessage,
          postedAt: socialPostsLog.postedAt,
          createdAt: socialPostsLog.createdAt,
        })
        .from(socialPostsLog)
        .where(gte(socialPostsLog.postedAt, oneDayAgo))
        .orderBy(desc(socialPostsLog.postedAt))
        .limit(200);

      // Also get a platform breakdown of ALL logs (no time filter)
      const allPlatformBreakdown = await db
        .select({
          platform: socialPostsLog.platform,
          count: count(),
        })
        .from(socialPostsLog)
        .groupBy(socialPostsLog.platform);

      return NextResponse.json({
        success: true,
        data: {
          recentCount: recentLogs.length,
          window: "24h",
          since: oneDayAgo.toISOString(),
          recentLogs: recentLogs.map((l) => ({
            postedAt: l.postedAt ? new Date(l.postedAt).toISOString() : null,
            createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : null,
            platform: l.platform,
            status: l.status,
            queueId: l.queueId,
            contentType: l.contentType,
            sourceId: l.sourceId,
            errorMessage: l.errorMessage,
          })),
          allPlatformBreakdown,
        },
      });
    }

    // ============================================================
    // DIAGNOSTIC: story-history — return ALL IG story logs from
    // the past 14 days so we can see exactly when stories were
    // posted and identify the spam pattern.
    // ============================================================
    if (action === "story-history") {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const storyLogs = await db
        .select({
          id: socialPostsLog.id,
          queueId: socialPostsLog.queueId,
          platform: socialPostsLog.platform,
          contentType: socialPostsLog.contentType,
          sourceId: socialPostsLog.sourceId,
          imageUrl: socialPostsLog.imageUrl,
          status: socialPostsLog.status,
          errorMessage: socialPostsLog.errorMessage,
          postedAt: socialPostsLog.postedAt,
        })
        .from(socialPostsLog)
        .where(
          and(
            eq(socialPostsLog.platform, "instagram_story"),
            gte(socialPostsLog.postedAt, fourteenDaysAgo),
          ),
        )
        .orderBy(desc(socialPostsLog.postedAt))
        .limit(500);

      return NextResponse.json({
        success: true,
        data: {
          count: storyLogs.length,
          window: "14 days",
          since: fourteenDaysAgo.toISOString(),
          stories: storyLogs.map((s) => ({
            postedAt: s.postedAt ? new Date(s.postedAt).toISOString() : null,
            status: s.status,
            queueId: s.queueId,
            contentType: s.contentType,
            sourceId: s.sourceId,
            imageUrl: s.imageUrl,
            errorMessage: s.errorMessage,
          })),
        },
      });
    }

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
        maxCycle: drizzleSql`MAX(CAST(${socialPostQueue.cycleNumber} AS INTEGER))`,
      })
      .from(socialPostQueue);

    const currentCycle = Number(cycleInfo[0]?.maxCycle) || 0;

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
      .limit(10);

    // Meta API configuration status
    // Check both env vars and DB credentials
    const metaDbCreds = await db
      .select()
      .from(socialCredentials)
      .where(eq(socialCredentials.platform, "meta"));
    const metaCredMap = new Map(metaDbCreds.map((c) => [c.key, c.value]));

    const metaStatus = {
      configured: !!(
        (process.env.META_SYSTEM_USER_TOKEN ||
          metaCredMap.get("META_SYSTEM_USER_TOKEN")) &&
        (process.env.FACEBOOK_PAGE_ID || metaCredMap.get("FACEBOOK_PAGE_ID"))
      ),
      appId: !!(process.env.META_APP_ID || metaCredMap.get("META_APP_ID")),
      appSecret: !!(
        process.env.META_APP_SECRET || metaCredMap.get("META_APP_SECRET")
      ),
      systemUserToken: !!(
        process.env.META_SYSTEM_USER_TOKEN ||
        metaCredMap.get("META_SYSTEM_USER_TOKEN")
      ),
      facebookPageId: !!(
        process.env.FACEBOOK_PAGE_ID || metaCredMap.get("FACEBOOK_PAGE_ID")
      ),
    };

    // Get available content counts for population
    const contentCounts = await getContentCounts();

    return NextResponse.json({
      success: true,
      data: {
        queue: {
          total: Object.values(summaryMap).reduce((a, b) => a + b, 0),
          pending: summaryMap.pending || 0,
          processing: summaryMap.processing || 0,
          posted: summaryMap.posted || 0,
          failed: summaryMap.failed || 0,
          skipped: summaryMap.skipped || 0,
          byContentType: contentMap,
          currentCycle,
        },
        nextPending,
        recentLogs,
        metaStatus,
        contentCounts,
        scheduleConfig: await getScheduleConfig(),
      },
    });
  } catch (error) {
    console.error("[Social API] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch queue status" },
      { status: 500 },
    );
  }
}

// ===========================================
// POST — Actions
// ===========================================

export async function POST(request: NextRequest) {
  try {
    // Ensure we always return JSON, never HTML error pages
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const action = body.action as string;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Missing 'action' field in request body" },
        { status: 400 },
      );
    }

    switch (action) {
      case "process-next":
        return await handleProcessNext(body as { alsoPostStory?: boolean });
      case "process-next-story-only":
        return await handleProcessNextStoryOnly();
      case "populate":
        return await handlePopulate(
          (body.options as Record<string, unknown>) || {},
        );
      case "post-upcoming-release":
        return await handlePostUpcomingRelease(
          body as Parameters<typeof handlePostUpcomingRelease>[0],
        );
      case "post-reel":
        return await handlePostReel(
          body as Parameters<typeof handlePostReel>[0],
        );
      case "post-upcoming-event":
        return await handlePostUpcomingEvent(
          body as Parameters<typeof handlePostUpcomingEvent>[0],
        );
      case "autopost-upcoming-event":
        return await handleAutopostUpcomingEvent();
      case "reset-cycle":
        return await handleResetCycle();
      case "skip-item":
        return await handleSkipItem(body.queueId as string);
      case "validate-token":
        return await handleValidateToken();
      case "retry-failed":
        return await handleRetryFailed();
      case "clear-queue":
        return await handleClearQueue();
      case "validate-reel-token":
        return await handleValidateReelToken();
      case "save-schedule-config":
        return await handleSaveScheduleConfig(body);
      case "generate-ai-caption":
        return await handleGenerateAICaption(body);
      case "debug-autopost":
        return await handleDebugAutopost();
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[Social API] POST error:", error);
    // ALWAYS return JSON — never let Next.js return an HTML error page
    const errorMessage =
      error instanceof Error ? error.message : "Request failed";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: `Error interno: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
}

// ===========================================
// ACTION HANDLERS
// ===========================================

async function handleProcessNext(options?: { alsoPostStory?: boolean }) {
  if (!(await isMetaConfiguredAsync())) {
    return NextResponse.json({
      success: false,
      message:
        "Meta API not configured. Set META_SYSTEM_USER_TOKEN and FACEBOOK_PAGE_ID in the credentials section below, or as Netlify env vars.",
    });
  }

  const nextItem = await getNextPendingItem();
  if (!nextItem) {
    return NextResponse.json({
      success: false,
      message:
        "No pending items in queue. All items have been posted or queue is empty. Populate the queue first.",
    });
  }

  // Ensure image URL is publicly accessible for Meta API
  nextItem.imageUrl = ensurePublicImageUrl(nextItem.imageUrl);

  const alsoPostStory = !!options?.alsoPostStory;
  console.log(
    `[Social API] Processing queue item: ${nextItem.contentType} (${nextItem.sourceId})${alsoPostStory ? " [also-post-story]" : ""}`,
  );

  const result = await processQueueItem(nextItem, { alsoPostStory });

  const fbStatus = result.facebook.success
    ? "success"
    : `failed: ${result.facebook.error || "unknown error"}`;
  const igStatus = result.instagram.success
    ? "success"
    : `failed: ${result.instagram.error || "unknown error"}`;
  const storyStatus = result.instagramStory
    ? result.instagramStory.success
      ? "success"
      : `failed: ${result.instagramStory.error || "unknown error"}`
    : "skipped";

  return NextResponse.json({
    success: result.facebook.success || result.instagram.success,
    message: `Posted to FB: ${fbStatus}, IG: ${igStatus}, IG Story: ${storyStatus}`,
    result,
  });
}

// ===========================================
// PROCESS-NEXT-STORY-ONLY — Throwback IG Story that does NOT consume a feed slot
// ===========================================
//
// This handler is called by the cron function at "story hours" (when the hour
// is in AUTOPOST_STORY_SCHEDULE_HOURS but NOT in AUTOPOST_SCHEDULE_HOURS).
// It posts an Instagram Story ONLY — no FB wall, no IG feed — using a
// previously-posted queue item as throwback content.
//
// Key properties:
//   - Does NOT advance the regular feed queue's round-robin pointer.
//   - Does NOT count against maxPostsPerDay (the daily cap is for feed posts).
//   - Picks a "throwback" item: queue items with status='posted' (excluding
//     vertical_videos, which post as Reels not Stories), preferring items
//     posted more recently, but skipping any item that has been used as a
//     Story in the last 7 days (deduplication).
//   - Logs to social_posts_log with platform='instagram_story' and queueId
//     prefixed with 'throwback-' so the cron's daily-count filter excludes it.

async function handleProcessNextStoryOnly() {
  if (!(await isMetaConfiguredAsync())) {
    return NextResponse.json({
      success: false,
      message:
        "Meta API not configured. Set META_SYSTEM_USER_TOKEN and FACEBOOK_PAGE_ID in the credentials section below, or as Netlify env vars.",
    });
  }

  try {
    // Pre-validate the token before attempting the post
    const tokenInfo = await validateToken();
    if (!tokenInfo.isValid) {
      const errorDetail = tokenInfo.raw?.message || "Token inválido";
      return NextResponse.json({
        success: false,
        message: `Token de Meta API inválido: ${errorDetail}`,
      });
    }

    // Find items posted as feed in the last 30 days, excluding vertical videos
    // (those post as Reels, not Stories). Pick the most recently posted one
    // that has NOT been used as a Story in the last 7 days.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get recently-posted queue items (exclude vertical_video — those are Reels)
    const recentPostedItems = await db
      .select({
        id: socialPostQueue.id,
        contentType: socialPostQueue.contentType,
        sourceId: socialPostQueue.sourceId,
        imageUrl: socialPostQueue.imageUrl,
        caption: socialPostQueue.caption,
        linkUrl: socialPostQueue.linkUrl,
        postedAt: socialPostQueue.postedAt,
        artistId: socialPostQueue.artistId,
        releaseId: socialPostQueue.releaseId,
      })
      .from(socialPostQueue)
      .where(
        and(
          eq(socialPostQueue.status, "posted"),
          isNotNull(socialPostQueue.postedAt),
          gt(socialPostQueue.postedAt, thirtyDaysAgo),
        ),
      )
      .orderBy(desc(socialPostQueue.postedAt))
      .limit(50);

    // Filter out vertical videos
    const eligibleItems = recentPostedItems.filter(
      (item) => item.contentType !== "vertical_video",
    );

    if (eligibleItems.length === 0) {
      return NextResponse.json({
        success: false,
        message:
          "No throwback items available for Story posting. Post items to the feed first.",
      });
    }

    // Get recent story logs (last 7 days) for deduplication.
    // CRITICAL FIX (2026-06-20): Was filtering on platform='instagram_story'
    // which silently returned 0 in production (same column-value drift bug as
    // today-counts). Switched to queueId prefix 'throwback-' which is
    // deterministic. Without this fix, recentStorySourceIds was empty, so
    // the .find() below matched the FIRST eligible item every single time
    // and posted the same Story every hour forever.
    const recentStoryLogs = await db
      .select({
        sourceId: socialPostsLog.sourceId,
      })
      .from(socialPostsLog)
      .where(
        and(
          like(socialPostsLog.queueId, "throwback-%"),
          eq(socialPostsLog.status, "success"),
          gt(socialPostsLog.postedAt, sevenDaysAgo),
        ),
      );

    // Build a dedup set keyed by sourceId only. CRITICAL FIX (2026-06-20):
    // The previous key was `${sourceId}::${imageUrl}`. But the imageUrl in
    // social_posts_log is the rewritten publicImageUrl (e.g.
    // https://sonidoliquido.com/api/social/og/...), while socialPostQueue
    // stores the original URL (e.g. https://i.scdn.co/...). These never
    // matched, so dedup never fired.
    const recentStorySourceIds = new Set(
      recentStoryLogs.map((log) => log.sourceId).filter(Boolean),
    );

    // Pick the first eligible item whose sourceId has NOT been used as a
    // Story in the last 7 days. CRITICAL FIX (2026-06-20): Removed the
    // `|| eligibleItems[0]` fallback — that fallback defeated the dedup
    // entirely, because once all 50 eligible items had been used as
    // stories, it just reposted the most recent one forever.
    const throwbackItem = eligibleItems.find(
      (item) => !recentStorySourceIds.has(item.sourceId),
    );

    if (!throwbackItem) {
      return NextResponse.json({
        success: false,
        message:
          "All recently-posted items have already been used as Stories in the last 7 days. Skipping to prevent duplicates.",
        skipped: true,
        reason: "dedup_exhausted",
      });
    }

    if (!throwbackItem.imageUrl) {
      return NextResponse.json({
        success: false,
        message: "No throwback item with a usable image was found.",
      });
    }

    // Ensure image URL is publicly accessible for Meta API
    const publicImageUrl = ensurePublicImageUrl(throwbackItem.imageUrl);

    console.log(
      `[Social API] Story-only throwback: ${throwbackItem.contentType} (${throwbackItem.sourceId}) ` +
        `originally posted ${throwbackItem.postedAt?.toISOString()}`,
    );

    // Post ONLY as Instagram Story (no FB wall, no IG feed)
    // Extract the best link from the caption (Spotify > YouTube > any URL > fallback)
    // so the Story link sticker points to the same external link visible in the post.
    const storyLink = extractStoryLinkUrl(
      throwbackItem.caption,
      throwbackItem.linkUrl,
    );
    const storyResult = await postToInstagramStory(
      publicImageUrl,
      throwbackItem.caption || "",
      storyLink,
      { composeForStory: true },
    );

    // Log to social_posts_log with queueId prefixed 'throwback-' so the
    // cron's daily-count filter excludes it from maxPostsPerDay
    let logError: string | null = null;
    try {
      await db.insert(socialPostsLog).values({
        id: crypto.randomUUID(),
        queueId: `throwback-${throwbackItem.id}`,
        platform: "instagram_story",
        // biome-ignore lint/suspicious/noExplicitAny: dynamic type
        contentType: throwbackItem.contentType as any,
        sourceId: throwbackItem.sourceId,
        imageUrl: publicImageUrl,
        caption: throwbackItem.caption || null,
        linkUrl: throwbackItem.linkUrl || null,
        platformPostId: storyResult.mediaId || null,
        platformPostUrl: storyResult.permalink || null,
        metaApiResponse: null,
        status: storyResult.success ? "success" : "failed",
        errorMessage: storyResult.error || null,
        postedAt: new Date(),
      // biome-ignore lint/suspicious/noExplicitAny: dynamic type
      } as any);
    } catch (logErr) {
      logError = logErr instanceof Error ? logErr.message : String(logErr);
      console.error(
        "[Social API] Failed to log throwback story result:",
        logError,
      );
    }

    return NextResponse.json({
      success: storyResult.success,
      message: storyResult.success
        ? `Throwback IG Story posted (source: ${throwbackItem.contentType} ${throwbackItem.sourceId})`
        : `Story post failed: ${storyResult.error || "unknown error"}`,
      result: {
        queueId: throwbackItem.id,
        contentType: throwbackItem.contentType,
        sourceId: throwbackItem.sourceId,
        instagramStory: storyResult,
      },
      throwback: true,
      logError, // null if log insert succeeded; error message if it failed
    });
  } catch (error) {
    console.error("[Social API] process-next-story-only error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Request failed";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: `Error en story-only: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
}

// ===========================================
// POST UPCOMING RELEASE — Direct post from upcoming releases editor
// ===========================================

async function handlePostUpcomingRelease(body: {
  imageUrl?: string;
  caption?: string;
  linkUrl?: string;
  releaseId?: string;
  platforms?: string[];
}) {
  const {
    imageUrl,
    caption,
    linkUrl,
    releaseId,
    platforms = ["facebook", "instagram"],
  } = body;

  if (!imageUrl) {
    return NextResponse.json({
      success: false,
      message: "Se requiere una imagen (portada) para publicar",
    });
  }

  if (!caption) {
    return NextResponse.json({
      success: false,
      message: "Se requiere un caption para publicar",
    });
  }

  if (!(await isMetaConfiguredAsync())) {
    return NextResponse.json({
      success: false,
      message:
        "Meta API no configurada. Configura META_SYSTEM_USER_TOKEN y FACEBOOK_PAGE_ID en la sección de credenciales de /admin/social.",
    });
  }

  // Pre-validate the token before attempting the post
  const tokenInfo = await validateToken();
  if (!tokenInfo.isValid) {
    const errorDetail = tokenInfo.raw?.message || "Token inválido";
    const errorCode = tokenInfo.raw?.code || "";
    let guidance = "";
    if (
      errorCode === 190 ||
      errorDetail.includes("Invalid OAuth") ||
      errorDetail.includes("Cannot parse")
    ) {
      guidance =
        " El token parece ser inválido o ha expirado. Genera un nuevo System User Token en business.facebook.com → Business Settings → Users → System Users.";
    }
    return NextResponse.json({
      success: false,
      message: `Token de Meta API inválido: ${errorDetail}.${guidance}`,
      tokenError: {
        code: errorCode,
        message: errorDetail,
        type: tokenInfo.raw?.type,
      },
    });
  }

  // Ensure image URL is publicly accessible for Meta API
  const publicImageUrl = ensurePublicImageUrl(imageUrl);

  console.log(
    `[Social API] Direct post for upcoming release: ${releaseId || "unknown"}`,
  );

  const results: {
    facebook?: {
      success: boolean;
      postId?: string;
      postUrl?: string;
      error?: string;
    };
    instagram?: {
      success: boolean;
      mediaId?: string;
      permalink?: string;
      error?: string;
    };
  } = {};

  // Post to Facebook
  if (platforms.includes("facebook")) {
    const fbResult = await postToFacebook(publicImageUrl, caption, linkUrl);
    results.facebook = {
      success: fbResult.success,
      postId: fbResult.postId || undefined,
      postUrl: fbResult.postUrl || undefined,
      error: fbResult.error || undefined,
    };

    // Log the result
    try {
      await db.insert(socialPostsLog).values({
        id: crypto.randomUUID(),
        queueId: `direct-${releaseId || crypto.randomUUID()}`,
        platform: "facebook",
        contentType: "spotify_track",
        sourceId: releaseId || "upcoming-release-direct",
        imageUrl: publicImageUrl,
        caption,
        linkUrl: linkUrl || null,
        platformPostId: fbResult.postId,
        platformPostUrl: fbResult.postUrl,
        metaApiResponse: null,
        status: fbResult.success ? "success" : "failed",
        errorMessage: fbResult.error || null,
        postedAt: new Date(),
      // biome-ignore lint/suspicious/noExplicitAny: dynamic type
      } as any);
    } catch (logError) {
      console.error("[Social API] Failed to log FB result:", logError);
    }
  }

  // Post to Instagram
  if (platforms.includes("instagram")) {
    const igResult = await postToInstagram(publicImageUrl, caption);
    results.instagram = {
      success: igResult.success,
      mediaId: igResult.mediaId || undefined,
      permalink: igResult.permalink || undefined,
      error: igResult.error || undefined,
    };

    // Log the result
    try {
      await db.insert(socialPostsLog).values({
        id: crypto.randomUUID(),
        queueId: `direct-${releaseId || crypto.randomUUID()}`,
        platform: "instagram",
        contentType: "spotify_track",
        sourceId: releaseId || "upcoming-release-direct",
        imageUrl: publicImageUrl,
        caption,
        linkUrl: linkUrl || null,
        platformPostId: igResult.mediaId,
        platformPostUrl: igResult.permalink,
        metaApiResponse: null,
        status: igResult.success ? "success" : "failed",
        errorMessage: igResult.error || null,
        postedAt: new Date(),
      // biome-ignore lint/suspicious/noExplicitAny: dynamic type
      } as any);
    } catch (logError) {
      console.error("[Social API] Failed to log IG result:", logError);
    }
  }

  const anySuccess = results.facebook?.success || results.instagram?.success;
  const errorMessages: string[] = [];
  if (results.facebook && !results.facebook.success)
    errorMessages.push(`FB: ${results.facebook.error}`);
  if (results.instagram && !results.instagram.success)
    errorMessages.push(`IG: ${results.instagram.error}`);

  return NextResponse.json({
    success: anySuccess,
    message: anySuccess
      ? `Publicado exitosamente en ${results.facebook?.success ? "Facebook" : ""}${results.facebook?.success && results.instagram?.success ? " e " : ""}${results.instagram?.success ? "Instagram" : ""}`
      : `Error al publicar: ${errorMessages.join(", ")}`,
    results,
  });
}

// ===========================================
// POST REEL — Post a video as Reel on IG and/or FB
// ===========================================

async function handlePostReel(body: {
  videoUrl: string;
  caption: string;
  platforms?: string[];
  releaseId?: string;
  releaseTitle?: string;
}) {
  const {
    videoUrl,
    caption,
    platforms = ["instagram", "facebook"],
    releaseId,
    releaseTitle,
  } = body;

  if (!videoUrl) {
    return NextResponse.json({
      success: false,
      message: "Se requiere un video (URL) para publicar como Reel",
    });
  }

  if (!caption) {
    return NextResponse.json({
      success: false,
      message: "Se requiere un caption para publicar como Reel",
    });
  }

  if (!(await isMetaConfiguredAsync())) {
    return NextResponse.json({
      success: false,
      message:
        "Meta API no configurada. Configura META_SYSTEM_USER_TOKEN y FACEBOOK_PAGE_ID en la sección de credenciales de /admin/social.",
    });
  }

  // Pre-validate the token before attempting the reel post
  const tokenInfo = await validateToken();
  if (!tokenInfo.isValid) {
    const errorDetail = tokenInfo.raw?.message || "Token inválido";
    const errorCode = tokenInfo.raw?.code || "";
    let guidance = "";
    if (
      errorCode === 190 ||
      errorDetail.includes("Invalid OAuth") ||
      errorDetail.includes("Cannot parse")
    ) {
      guidance =
        " El token parece ser inválido o ha expirado. Genera un nuevo System User Token en business.facebook.com → Business Settings → Users → System Users.";
    }
    return NextResponse.json({
      success: false,
      message: `Token de Meta API inválido: ${errorDetail}.${guidance}`,
      tokenError: {
        code: errorCode,
        message: errorDetail,
        type: tokenInfo.raw?.type,
      },
    });
  }

  console.log(
    `[Social API] Posting Reel for upcoming release: ${releaseTitle || releaseId || "unknown"}`,
  );

  const results: {
    instagram?: {
      success: boolean;
      mediaId?: string;
      permalink?: string;
      error?: string;
    };
    facebook?: {
      success: boolean;
      reelId?: string;
      postUrl?: string;
      error?: string;
    };
  } = {};

  // Post to Instagram as Reel
  if (platforms.includes("instagram")) {
    const igResult = await postInstagramReel(videoUrl, caption, true);
    results.instagram = {
      success: igResult.success,
      mediaId: igResult.mediaId || undefined,
      permalink: igResult.permalink || undefined,
      error: igResult.error || undefined,
    };

    // Log the result
    try {
      await db.insert(socialPostsLog).values({
        id: crypto.randomUUID(),
        queueId: `reel-${releaseId || crypto.randomUUID()}`,
        platform: "instagram_reel",
        contentType: "vertical_video",
        sourceId: releaseId || "upcoming-release-reel",
        imageUrl: videoUrl,
        caption,
        linkUrl: null,
        platformPostId: igResult.mediaId,
        platformPostUrl: igResult.permalink,
        metaApiResponse: null,
        status: igResult.success ? "success" : "failed",
        errorMessage: igResult.error || null,
        postedAt: new Date(),
      // biome-ignore lint/suspicious/noExplicitAny: dynamic type
      } as any);
    } catch (logError) {
      console.error("[Social API] Failed to log IG Reel result:", logError);
    }
  }

  // Post to Facebook as Reel
  if (platforms.includes("facebook")) {
    const fbResult = await postFacebookReel(videoUrl, caption);
    results.facebook = {
      success: fbResult.success,
      reelId: fbResult.reelId || undefined,
      postUrl: fbResult.postUrl || undefined,
      error: fbResult.error || undefined,
    };

    // Log the result
    try {
      await db.insert(socialPostsLog).values({
        id: crypto.randomUUID(),
        queueId: `reel-${releaseId || crypto.randomUUID()}`,
        platform: "facebook_reel",
        contentType: "vertical_video",
        sourceId: releaseId || "upcoming-release-reel",
        imageUrl: videoUrl,
        caption,
        linkUrl: null,
        platformPostId: fbResult.reelId,
        platformPostUrl: fbResult.postUrl,
        metaApiResponse: null,
        status: fbResult.success ? "success" : "failed",
        errorMessage: fbResult.error || null,
        postedAt: new Date(),
      // biome-ignore lint/suspicious/noExplicitAny: dynamic type
      } as any);
    } catch (logError) {
      console.error("[Social API] Failed to log FB Reel result:", logError);
    }
  }

  const anySuccess = results.instagram?.success || results.facebook?.success;
  const errorMessages: string[] = [];
  if (results.instagram && !results.instagram.success)
    errorMessages.push(`IG Reel: ${results.instagram.error}`);
  if (results.facebook && !results.facebook.success)
    errorMessages.push(`FB Reel: ${results.facebook.error}`);

  const successPlatforms: string[] = [];
  if (results.instagram?.success) successPlatforms.push("Instagram Reels");
  if (results.facebook?.success) successPlatforms.push("Facebook Reels");

  return NextResponse.json({
    success: anySuccess,
    message: anySuccess
      ? `Reel publicado exitosamente en ${successPlatforms.join(" y ")}`
      : `Error al publicar Reel: ${errorMessages.join(", ")}`,
    results,
  });
}

/**
 * Populate the queue from existing site content.
 * This is the main action that fills the queue with items to post.
 * It reads gallery photos, releases, artist profiles, and curated tracks from the DB.
 */
async function handlePopulate(options: {
  includeGallery?: boolean;
  includeReleases?: boolean;
  includeArtists?: boolean;
  includeCuratedTracks?: boolean;
  includeVerticalVideos?: boolean;
  includeYoutubeVideos?: boolean;
  includeEvents?: boolean;
  platforms?: string[];
  force?: boolean; // If true, re-add items even if they already exist in the queue
}) {
  try {
    const {
      includeGallery = true,
      includeReleases = true,
      includeArtists = true,
      includeCuratedTracks = true,
      includeVerticalVideos = true,
      includeYoutubeVideos = true,
      includeEvents = true,
      platforms,
      force = false,
    } = options;

    // Default platforms: FB + IG
    const targetPlatforms = platforms || ["facebook", "instagram"];
    const platformsJson = JSON.stringify(targetPlatforms);

    // Get existing items to avoid duplicates (unless force is enabled)
    const existing = await db.select().from(socialPostQueue);
    const existingSourceIds = force
      ? new Set<string>() // Force mode: allow duplicates
      : new Set(existing.map((item) => `${item.contentType}:${item.sourceId}`));
    console.log(
      `[Social API Populate] Found ${existing.length} existing queue items${force ? " (force mode: duplicates allowed)" : ""}`,
    );

    let queueOrder =
      existing.length > 0
        ? Math.max(...existing.map((item) => item.queueOrder)) + 1
        : 0;

    let galleryCount = 0;
    let releasesCount = 0;
    let artistsCount = 0;
    let curatedCount = 0;
    let reelsCount = 0;
    let youtubeVideosCount = 0;
    let eventsCount = 0;

    // ========================================
    // 1. Gallery Photos
    // ========================================
    if (includeGallery) {
      console.log("[Social API Populate] Processing gallery photos...");

      const photos = await db
        .select({
          id: galleryPhotos.id,
          title: galleryPhotos.title,
          imageUrl: galleryPhotos.imageUrl,
          artistId: galleryPhotos.artistId,
          location: galleryPhotos.location,
          photographer: galleryPhotos.photographer,
        })
        .from(galleryPhotos)
        .where(eq(galleryPhotos.isPublished, true))
        .orderBy(galleryPhotos.sortOrder);

      // Get artist names
      const allArtists = await db
        .select({
          id: artists.id,
          name: artists.name,
          slug: artists.slug,
          role: artists.role,
        })
        .from(artists)
        .where(eq(artists.isActive, true));

      const artistMap = new Map(allArtists.map((a) => [a.id, a]));

      for (const photo of photos) {
        const key = `gallery_photo:${photo.id}`;
        if (existingSourceIds.has(key)) continue;

        const artist = photo.artistId ? artistMap.get(photo.artistId) : null;
        const caption = generateCaption({
          contentType: "gallery_photo",
          artistName: artist?.name,
          photoTitle: photo.title || undefined,
          photoLocation: photo.location || undefined,
          photographer: photo.photographer || undefined,
          linkUrl: artist
            ? `${SITE_URL}/artistas/${artist.slug}`
            : `${SITE_URL}/galeria`,
        });

        await db.insert(socialPostQueue).values({
          id: crypto.randomUUID(),
          contentType: "gallery_photo",
          sourceId: photo.id,
          artistId: photo.artistId || null,
          releaseId: null,
          imageUrl: photo.imageUrl,
          caption,
          linkUrl: artist
            ? `${SITE_URL}/artistas/${artist.slug}`
            : `${SITE_URL}/galeria`,
          queueOrder: queueOrder++,
          cycleNumber: 1,
          status: "pending",
          platforms: platformsJson,
          postedPlatforms: "[]",
        // biome-ignore lint/suspicious/noExplicitAny: dynamic type
        } as any);

        existingSourceIds.add(key);
        galleryCount++;
      }
    }

    // ========================================
    // 2. Releases (Spotify tracks with cover art)
    // ========================================
    if (includeReleases) {
      console.log("[Social API Populate] Processing releases...");

      const allReleases = await db
        .select({
          id: releases.id,
          title: releases.title,
          slug: releases.slug,
          releaseType: releases.releaseType,
          releaseDate: releases.releaseDate,
          coverImageUrl: releases.coverImageUrl,
          spotifyUrl: releases.spotifyUrl,
        })
        .from(releases)
        .where(eq(releases.isUpcoming, false))
        .orderBy(releases.releaseDate);

      const allArtists = await db
        .select({
          id: artists.id,
          name: artists.name,
          slug: artists.slug,
          role: artists.role,
        })
        .from(artists)
        .where(eq(artists.isActive, true));

      const artistMap = new Map(allArtists.map((a) => [a.id, a]));

      const releaseArtistRows = await db.select().from(releaseArtists);
      const releaseArtistMap = new Map<string, string[]>();
      for (const ra of releaseArtistRows) {
        const existing = releaseArtistMap.get(ra.releaseId) || [];
        existing.push(ra.artistId);
        releaseArtistMap.set(ra.releaseId, existing);
      }

      for (const release of allReleases) {
        if (!release.coverImageUrl) continue;

        const key = `spotify_track:${release.id}`;
        if (existingSourceIds.has(key)) continue;

        const artistIds = releaseArtistMap.get(release.id) || [];
        const primaryArtistId = artistIds[0];
        const primaryArtist = primaryArtistId
          ? artistMap.get(primaryArtistId)
          : null;

        const caption = generateCaption({
          contentType: "spotify_track",
          artistName: primaryArtist?.name,
          artistRole: primaryArtist?.role || undefined,
          releaseTitle: release.title,
          releaseType: release.releaseType,
          releaseDate: release.releaseDate,
          spotifyUrl: release.spotifyUrl || undefined,
          linkUrl: `${SITE_URL}/lanzamientos/${release.slug}`,
        });

        await db.insert(socialPostQueue).values({
          id: crypto.randomUUID(),
          contentType: "spotify_track",
          sourceId: release.id,
          artistId: primaryArtistId || null,
          releaseId: release.id,
          imageUrl: release.coverImageUrl,
          caption,
          linkUrl: `${SITE_URL}/lanzamientos/${release.slug}`,
          queueOrder: queueOrder++,
          cycleNumber: 1,
          status: "pending",
          platforms: platformsJson,
          postedPlatforms: "[]",
        // biome-ignore lint/suspicious/noExplicitAny: dynamic type
        } as any);

        existingSourceIds.add(key);
        releasesCount++;
      }
    }

    // ========================================
    // 3. Artist Profiles
    // ========================================
    if (includeArtists) {
      console.log("[Social API Populate] Processing artist profiles...");

      const allArtists = await db
        .select({
          id: artists.id,
          name: artists.name,
          slug: artists.slug,
          role: artists.role,
          profileImageUrl: artists.profileImageUrl,
          featuredImageUrl: artists.featuredImageUrl,
        })
        .from(artists)
        .where(eq(artists.isActive, true));

      for (const artist of allArtists) {
        const imageUrl = artist.featuredImageUrl || artist.profileImageUrl;
        if (!imageUrl) continue;

        const key = `artist_profile:${artist.id}`;
        if (existingSourceIds.has(key)) continue;

        const caption = generateCaption({
          contentType: "artist_profile",
          artistName: artist.name,
          artistRole: artist.role,
          linkUrl: `${SITE_URL}/artistas/${artist.slug}`,
        });

        await db.insert(socialPostQueue).values({
          id: crypto.randomUUID(),
          contentType: "artist_profile",
          sourceId: artist.id,
          artistId: artist.id,
          releaseId: null,
          imageUrl,
          caption,
          linkUrl: `${SITE_URL}/artistas/${artist.slug}`,
          queueOrder: queueOrder++,
          cycleNumber: 1,
          status: "pending",
          platforms: platformsJson,
          postedPlatforms: "[]",
        // biome-ignore lint/suspicious/noExplicitAny: dynamic type
        } as any);

        existingSourceIds.add(key);
        artistsCount++;
      }
    }

    // ========================================
    // 4. Curated Tracks (from curated Spotify artists)
    // ========================================
    if (includeCuratedTracks) {
      console.log("[Social API Populate] Processing curated tracks...");

      try {
        const tracks = await db
          .select({
            id: curatedTracks.id,
            spotifyTrackId: curatedTracks.spotifyTrackId,
            spotifyTrackUrl: curatedTracks.spotifyTrackUrl,
            name: curatedTracks.name,
            artistName: curatedTracks.artistName,
            albumName: curatedTracks.albumName,
            albumImageUrl: curatedTracks.albumImageUrl,
            curatedChannelId: curatedTracks.curatedChannelId,
            popularity: curatedTracks.popularity,
          })
          .from(curatedTracks)
          .where(eq(curatedTracks.isAvailableForPlaylist, true))
          .orderBy(desc(curatedTracks.popularity));

        console.log(
          `[Social API Populate] Found ${tracks.length} curated tracks available for playlist`,
        );

        let skippedNoImage = 0;
        let skippedDuplicate = 0;

        for (const track of tracks) {
          if (!track.albumImageUrl) {
            skippedNoImage++;
            continue;
          }

          const key = `curated_track:${track.id}`;
          if (existingSourceIds.has(key)) {
            skippedDuplicate++;
            continue;
          }

          // Use the specific Spotify track URL as the link
          // This gives users a direct link to listen to the track
          const trackLinkUrl =
            track.spotifyTrackUrl || `${SITE_URL}/discografia`;

          const caption = generateCaption({
            contentType: "curated_track",
            artistName: track.artistName,
            trackName: track.name,
            albumName: track.albumName || undefined,
            spotifyUrl: track.spotifyTrackUrl,
            linkUrl: trackLinkUrl,
          });

          await db.insert(socialPostQueue).values({
            id: crypto.randomUUID(),
            contentType: "curated_track",
            sourceId: track.id,
            artistId: null,
            releaseId: null,
            imageUrl: track.albumImageUrl,
            caption,
            linkUrl: trackLinkUrl,
            queueOrder: queueOrder++,
            cycleNumber: 1,
            status: "pending",
            platforms: platformsJson,
            postedPlatforms: "[]",
          // biome-ignore lint/suspicious/noExplicitAny: dynamic type
          } as any);

          existingSourceIds.add(key);
          curatedCount++;
        }

        console.log(
          `[Social API Populate] Curated tracks: ${curatedCount} added, ${skippedNoImage} skipped (no image), ${skippedDuplicate} skipped (duplicate)`,
        );
      } catch (err) {
        console.error("[Social API Populate] Curated tracks error:", err);
        // Return the error details in the response so the admin can see what went wrong
        return NextResponse.json(
          {
            success: false,
            message: `Error al procesar tracks curados: ${err instanceof Error ? err.message : String(err)}`,
            error: "curated_tracks_error",
            details: {
              galleryPhotos: galleryCount,
              releases: releasesCount,
              artistProfiles: artistsCount,
              curatedTracks: curatedCount,
              verticalVideos: reelsCount,
              youtubeVideos: youtubeVideosCount,
              totalAdded:
                galleryCount +
                releasesCount +
                artistsCount +
                curatedCount +
                reelsCount +
                youtubeVideosCount,
            },
          },
          { status: 500 },
        );
      }
    }

    // ========================================
    // 5. Vertical Videos (Reels / Shorts)
    // ========================================
    if (includeVerticalVideos) {
      console.log(
        "[Social API Populate] Processing vertical videos (reels)...",
      );

      try {
        const videos = await db
          .select({
            id: verticalVideos.id,
            title: verticalVideos.title,
            thumbnailUrl: verticalVideos.thumbnailUrl,
            videoUrl: verticalVideos.videoUrl,
            artistId: verticalVideos.artistId,
            platform: verticalVideos.platform,
            platformUrl: verticalVideos.platformUrl,
            embedUrl: verticalVideos.embedUrl,
          })
          .from(verticalVideos)
          .where(eq(verticalVideos.isPublished, true))
          .orderBy(verticalVideos.displayOrder);

        // Get artist names (reuse the allArtists map if available, otherwise fetch)
        const allArtistsVV = await db
          .select({
            id: artists.id,
            name: artists.name,
            slug: artists.slug,
            role: artists.role,
          })
          .from(artists)
          .where(eq(artists.isActive, true));
        const artistMapVV = new Map(allArtistsVV.map((a) => [a.id, a]));

        for (const video of videos) {
          // Use thumbnail as the image for social post
          // Auto-generate YouTube thumbnails if no explicit thumbnail exists
          let imageUrl = video.thumbnailUrl;

          if (!imageUrl) {
            // Try to auto-generate YouTube thumbnail from video URL
            const ytId = extractYouTubeId(
              video.videoUrl,
              video.platformUrl,
              video.embedUrl,
            );
            if (ytId) {
              imageUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
            }
          }

          // Don't skip videos without thumbnails — include them in the queue
          // For videos without thumbnails, use the video URL itself as imageUrl
          // The admin UI handles broken images with a fallback icon
          if (!imageUrl) {
            imageUrl = video.videoUrl || `${SITE_URL}/reels`;
          }

          // For vertical videos, store the video URL in linkUrl so processQueueItem
          // can use it for Reel posting. Also store the website link separately.
          // Format: "VIDEO_URL|||WEBSITE_URL" — processQueueItem will parse this.
          const artist = video.artistId
            ? artistMapVV.get(video.artistId)
            : null;
          const videoUrl = video.videoUrl || video.platformUrl || "";
          const websiteUrl = artist
            ? `${SITE_URL}/artistas/${artist.slug}`
            : video.platformUrl || `${SITE_URL}/reels`;
          const linkUrlValue = videoUrl
            ? `${videoUrl}|||${websiteUrl}`
            : websiteUrl;

          const key = `vertical_video:${video.id}`;
          if (existingSourceIds.has(key)) continue;

          const caption = generateCaption({
            contentType: "vertical_video",
            artistName: artist?.name,
            videoTitle: video.title || undefined,
            videoPlatform: video.platform || undefined,
            linkUrl: artist
              ? `${SITE_URL}/artistas/${artist.slug}`
              : `${SITE_URL}/reels`,
          });

          await db.insert(socialPostQueue).values({
            id: crypto.randomUUID(),
            contentType: "vertical_video",
            sourceId: video.id,
            artistId: video.artistId || null,
            releaseId: null,
            imageUrl,
            caption,
            linkUrl: linkUrlValue,
            queueOrder: queueOrder++,
            cycleNumber: 1,
            status: "pending",
            platforms: platformsJson,
            postedPlatforms: "[]",
          // biome-ignore lint/suspicious/noExplicitAny: dynamic type
          } as any);

          existingSourceIds.add(key);
          reelsCount++;
        }
      } catch (err) {
        console.warn(
          "[Social API Populate] Vertical videos table may not exist yet:",
          err,
        );
      }
    }

    // ========================================
    // 6. YouTube Videos (music videos from the videos table)
    // ========================================
    if (includeYoutubeVideos) {
      console.log("[Social API Populate] Processing YouTube videos...");

      try {
        const ytVideos = await db
          .select({
            id: videos.id,
            title: videos.title,
            youtubeId: videos.youtubeId,
            youtubeUrl: videos.youtubeUrl,
            thumbnailUrl: videos.thumbnailUrl,
            artistId: videos.artistId,
            releaseId: videos.releaseId,
          })
          .from(videos)
          .orderBy(videos.displayOrder);

        // Get artist names
        const allArtistsYT = await db
          .select({
            id: artists.id,
            name: artists.name,
            slug: artists.slug,
            role: artists.role,
          })
          .from(artists)
          .where(eq(artists.isActive, true));
        const artistMapYT = new Map(allArtistsYT.map((a) => [a.id, a]));

        for (const video of ytVideos) {
          // Generate YouTube thumbnail URL if no explicit thumbnail exists
          let imageUrl = video.thumbnailUrl;
          if (!imageUrl && video.youtubeId) {
            imageUrl = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
          }
          if (!imageUrl) continue; // Skip videos without any image available

          const key = `youtube_video:${video.id}`;
          if (existingSourceIds.has(key)) continue;

          const artist = video.artistId
            ? artistMapYT.get(video.artistId)
            : null;
          const caption = generateCaption({
            contentType: "youtube_video",
            artistName: artist?.name,
            videoTitle: video.title || undefined,
            videoPlatform: "youtube",
            linkUrl:
              video.youtubeUrl ||
              (artist
                ? `${SITE_URL}/artistas/${artist.slug}`
                : `${SITE_URL}/videos`),
          });

          await db.insert(socialPostQueue).values({
            id: crypto.randomUUID(),
            contentType: "youtube_video",
            sourceId: video.id,
            artistId: video.artistId || null,
            releaseId: video.releaseId || null,
            imageUrl,
            caption,
            linkUrl:
              video.youtubeUrl ||
              (artist
                ? `${SITE_URL}/artistas/${artist.slug}`
                : `${SITE_URL}/videos`),
            queueOrder: queueOrder++,
            cycleNumber: 1,
            status: "pending",
            platforms: platformsJson,
            postedPlatforms: "[]",
          // biome-ignore lint/suspicious/noExplicitAny: dynamic type
          } as any);

          existingSourceIds.add(key);
          youtubeVideosCount++;
        }

        console.log(
          `[Social API Populate] YouTube videos: ${youtubeVideosCount} added`,
        );
      } catch (err) {
        console.warn(
          "[Social API Populate] YouTube videos table may not exist yet:",
          err,
        );
      }
    }

    // ========================================
    // 7. Upcoming Events
    // ========================================
    if (includeEvents) {
      console.log("[Social API Populate] Processing upcoming events...");

      try {
        // Only include future events (not past or cancelled)
        const now = new Date();
        const upcomingEvents = await db
          .select({
            id: events.id,
            title: events.title,
            venue: events.venue,
            city: events.city,
            country: events.country,
            eventDate: events.eventDate,
            eventTime: events.eventTime,
            ticketUrl: events.ticketUrl,
            imageUrl: events.imageUrl,
            isFeatured: events.isFeatured,
          })
          .from(events)
          .where(and(gt(events.eventDate, now), eq(events.isCancelled, false)))
          .orderBy(events.eventDate);

        console.log(
          `[Social API Populate] Found ${upcomingEvents.length} upcoming events`,
        );

        let skippedNoImage = 0;

        for (const event of upcomingEvents) {
          if (!event.imageUrl) {
            skippedNoImage++;
            continue;
          }

          const key = `event:${event.id}`;
          if (existingSourceIds.has(key)) continue;

          // Build the event page link
          // Events use /proximos/[slug] or /proximos depending on URL structure
          const eventLinkUrl = `${SITE_URL}/proximos`;

          const caption = generateCaption({
            contentType: "event",
            eventTitle: event.title,
            eventVenue: event.venue,
            eventCity: event.city,
            eventDate: event.eventDate,
            eventTime: event.eventTime || undefined,
            ticketUrl: event.ticketUrl || undefined,
            linkUrl: eventLinkUrl,
          });

          // Prioritize featured events by giving them lower queue order
          // (they'll be posted sooner in the rotation)
          const priorityOrder = event.isFeatured ? 0 : queueOrder;

          await db.insert(socialPostQueue).values({
            id: crypto.randomUUID(),
            contentType: "event",
            sourceId: event.id,
            artistId: null,
            releaseId: null,
            imageUrl: event.imageUrl,
            caption,
            linkUrl: eventLinkUrl,
            queueOrder: event.isFeatured ? priorityOrder : queueOrder,
            cycleNumber: 1,
            status: "pending",
            platforms: platformsJson,
            postedPlatforms: "[]",
          // biome-ignore lint/suspicious/noExplicitAny: dynamic type
          } as any);

          existingSourceIds.add(key);
          queueOrder++;
          eventsCount++;
        }

        console.log(
          `[Social API Populate] Events: ${eventsCount} added, ${skippedNoImage} skipped (no image)`,
        );
      } catch (err) {
        console.warn(
          "[Social API Populate] Events table may not exist yet:",
          err,
        );
      }
    }

    // ========================================
    // Summary
    // ========================================
    const totalAdded =
      galleryCount +
      releasesCount +
      artistsCount +
      curatedCount +
      reelsCount +
      youtubeVideosCount +
      eventsCount;
    console.log(
      `[Social API Populate] Complete! Added ${totalAdded} new items`,
    );

    return NextResponse.json({
      success: true,
      message: `Cola poblada exitosamente. Se añadieron ${totalAdded} items nuevos.`,
      details: {
        galleryPhotos: galleryCount,
        releases: releasesCount,
        artistProfiles: artistsCount,
        curatedTracks: curatedCount,
        verticalVideos: reelsCount,
        youtubeVideos: youtubeVideosCount,
        events: eventsCount,
        totalAdded,
        platforms: targetPlatforms,
      },
    });
  } catch (error) {
    console.error("[Social API] Populate error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al poblar la cola",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

// ===========================================
// POST UPCOMING EVENT — Direct post for events from admin
// ===========================================

async function handlePostUpcomingEvent(body: {
  eventId?: string;
  imageUrl?: string;
  caption?: string;
  linkUrl?: string;
  platforms?: string[];
}) {
  const {
    eventId,
    imageUrl,
    caption,
    linkUrl,
    platforms = ["facebook", "instagram"],
  } = body;

  // If eventId is provided, fetch event details from DB
  let finalImageUrl = imageUrl;
  let finalCaption = caption;
  let finalLinkUrl = linkUrl;

  if (eventId) {
    const eventRows = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    const event = eventRows[0];
    if (event) {
      finalImageUrl = finalImageUrl || event.imageUrl || undefined;
      finalLinkUrl = finalLinkUrl || `${SITE_URL}/proximos`;

      if (!finalCaption) {
        finalCaption = generateCaption({
          contentType: "event",
          eventTitle: event.title,
          eventVenue: event.venue,
          eventCity: event.city,
          eventDate: event.eventDate,
          eventTime: event.eventTime || undefined,
          ticketUrl: event.ticketUrl || undefined,
          linkUrl: finalLinkUrl,
        });
      }
    }
  }

  if (!finalImageUrl) {
    return NextResponse.json({
      success: false,
      message: "Se requiere una imagen (portada del evento) para publicar",
    });
  }

  if (!finalCaption) {
    return NextResponse.json({
      success: false,
      message: "Se requiere un caption para publicar",
    });
  }

  if (!(await isMetaConfiguredAsync())) {
    return NextResponse.json({
      success: false,
      message:
        "Meta API no configurada. Configura META_SYSTEM_USER_TOKEN y FACEBOOK_PAGE_ID en la sección de credenciales de /admin/social.",
    });
  }

  // Pre-validate the token before attempting the post
  const tokenInfo = await validateToken();
  if (!tokenInfo.isValid) {
    const errorDetail = tokenInfo.raw?.message || "Token inválido";
    const errorCode = tokenInfo.raw?.code || "";
    let guidance = "";
    if (
      errorCode === 190 ||
      errorDetail.includes("Invalid OAuth") ||
      errorDetail.includes("Cannot parse")
    ) {
      guidance =
        " El token parece ser inválido o ha expirado. Genera un nuevo System User Token en business.facebook.com → Business Settings → Users → System Users.";
    }
    return NextResponse.json({
      success: false,
      message: `Token de Meta API inválido: ${errorDetail}.${guidance}`,
      tokenError: {
        code: errorCode,
        message: errorDetail,
        type: tokenInfo.raw?.type,
      },
    });
  }

  // Ensure image URL is publicly accessible for Meta API
  const publicImageUrl = ensurePublicImageUrl(finalImageUrl);

  console.log(
    `[Social API] Direct post for upcoming event: ${eventId || "unknown"}`,
  );

  const results: {
    facebook?: {
      success: boolean;
      postId?: string;
      postUrl?: string;
      error?: string;
    };
    instagram_story?: {
      success: boolean;
      mediaId?: string;
      permalink?: string;
      error?: string;
    };
  } = {};

  // Post to Facebook (feed post)
  if (platforms.includes("facebook")) {
    const fbResult = await postToFacebook(
      publicImageUrl,
      finalCaption,
      finalLinkUrl,
    );
    results.facebook = {
      success: fbResult.success,
      postId: fbResult.postId || undefined,
      postUrl: fbResult.postUrl || undefined,
      error: fbResult.error || undefined,
    };

    // Log the result
    try {
      await db.insert(socialPostsLog).values({
        id: crypto.randomUUID(),
        queueId: `event-${eventId || crypto.randomUUID()}`,
        platform: "facebook",
        contentType: "event",
        sourceId: eventId || "event-direct",
        imageUrl: publicImageUrl,
        caption: finalCaption,
        linkUrl: finalLinkUrl || null,
        platformPostId: fbResult.postId,
        platformPostUrl: fbResult.postUrl,
        metaApiResponse: null,
        status: fbResult.success ? "success" : "failed",
        errorMessage: fbResult.error || null,
        postedAt: new Date(),
      // biome-ignore lint/suspicious/noExplicitAny: dynamic type
      } as any);
    } catch (logError) {
      console.error("[Social API] Failed to log FB event result:", logError);
    }
  }

  // Post to Instagram as a Story (events always go to Stories on IG)
  if (platforms.includes("instagram")) {
    // Extract the best link from the caption for the Story link sticker
    const storyLink = extractStoryLinkUrl(finalCaption, finalLinkUrl);
    const igResult = await postToInstagramStory(
      publicImageUrl,
      finalCaption,
      storyLink,
    );
    results.instagram_story = {
      success: igResult.success,
      mediaId: igResult.mediaId || undefined,
      permalink: igResult.permalink || undefined,
      error: igResult.error || undefined,
    };

    // Log the result
    try {
      await db.insert(socialPostsLog).values({
        id: crypto.randomUUID(),
        queueId: `event-${eventId || crypto.randomUUID()}`,
        platform: "instagram_story",
        contentType: "event",
        sourceId: eventId || "event-direct",
        imageUrl: publicImageUrl,
        caption: finalCaption,
        linkUrl: finalLinkUrl || null,
        platformPostId: igResult.mediaId,
        platformPostUrl: igResult.permalink,
        metaApiResponse: null,
        status: igResult.success ? "success" : "failed",
        errorMessage: igResult.error || null,
        postedAt: new Date(),
      // biome-ignore lint/suspicious/noExplicitAny: dynamic type
      } as any);
    } catch (logError) {
      console.error(
        "[Social API] Failed to log IG Story event result:",
        logError,
      );
    }
  }

  const anySuccess =
    results.facebook?.success || results.instagram_story?.success;
  const errorMessages: string[] = [];
  if (results.facebook && !results.facebook.success)
    errorMessages.push(`FB: ${results.facebook.error}`);
  if (results.instagram_story && !results.instagram_story.success)
    errorMessages.push(`IG Story: ${results.instagram_story.error}`);

  return NextResponse.json({
    success: anySuccess,
    message: anySuccess
      ? `Evento publicado exitosamente en ${results.facebook?.success ? "Facebook" : ""}${results.facebook?.success && results.instagram_story?.success ? " e " : ""}${results.instagram_story?.success ? "Instagram Story" : ""}`
      : `Error al publicar evento: ${errorMessages.join(", ")}`,
    results,
  });
}

// ===========================================
// DEBUG AUTOPOST — Diagnostic endpoint for troubleshooting why posts aren't going out
// ===========================================

async function handleDebugAutopost() {
  const now = new Date();
  const diagnostics: Record<string, unknown> = {
    timestamp: now.toISOString(),
    timestampUTC: now.toUTCString(),
  };

  // 1. Check Meta API configuration
  const metaConfigured = await isMetaConfiguredAsync();
  diagnostics.metaConfigured = metaConfigured;

  if (metaConfigured) {
    try {
      const tokenInfo = await validateToken();
      diagnostics.tokenValid = tokenInfo.isValid;
      diagnostics.tokenError = tokenInfo.isValid
        ? null
        : tokenInfo.raw?.message || "Invalid token";
    } catch (err) {
      diagnostics.tokenValid = false;
      diagnostics.tokenError =
        err instanceof Error ? err.message : "Token validation failed";
    }
  }

  // 2. Check schedule config
  try {
    const config = await getScheduleConfig();
    diagnostics.scheduleConfig = config;

    // Calculate UTC schedule hours
    const CST_OFFSET = 6;
    const utcScheduleHours = config.scheduleHours.map(
      (h) => (h + CST_OFFSET) % 24,
    );
    const currentHourUTC = now.getUTCHours();
    const currentHourCST = (currentHourUTC - CST_OFFSET + 24) % 24;

    diagnostics.currentTimeUTC = currentHourUTC;
    diagnostics.currentTimeCST = currentHourCST;
    diagnostics.utcScheduleHours = utcScheduleHours;
    diagnostics.shouldPostNow = utcScheduleHours.includes(currentHourUTC);
    diagnostics.nextScheduledCST =
      config.scheduleHours
        .map((h) => ({ cst: h, utc: (h + CST_OFFSET) % 24 }))
        .sort((a, b) => a.utc - b.utc)
        .find((entry) => entry.utc > currentHourUTC)?.cst ||
      config.scheduleHours[0];
  } catch (err) {
    diagnostics.scheduleConfigError =
      err instanceof Error ? err.message : "Failed to read schedule config";
  }

  // 3. Check queue status
  try {
    const pendingCount = await db
      .select({ count: count() })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "pending"));

    const processingCount = await db
      .select({ count: count() })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "processing"));

    diagnostics.queuePending = pendingCount[0]?.count || 0;
    diagnostics.queueProcessing = processingCount[0]?.count || 0;

    // Stuck processing items (processing for > 10 minutes)
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const stuckItems = await db
      .select({
        id: socialPostQueue.id,
        contentType: socialPostQueue.contentType,
        updatedAt: socialPostQueue.updatedAt,
      })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "processing"))
      .limit(10);

    diagnostics.stuckProcessingItems = stuckItems.filter((item) => {
      const updated = item.updatedAt ? new Date(item.updatedAt) : null;
      return updated && updated < tenMinutesAgo;
    }).length;
  } catch (err) {
    diagnostics.queueError =
      err instanceof Error ? err.message : "Failed to read queue";
  }

  // 4. Check upcoming events
  try {
    const upcomingEvents = await db
      .select({
        id: events.id,
        title: events.title,
        eventDate: events.eventDate,
        imageUrl: events.imageUrl,
        isCancelled: events.isCancelled,
      })
      .from(events)
      .where(eq(events.isCancelled, false))
      .orderBy(events.eventDate)
      .limit(5);

    diagnostics.upcomingEvents = upcomingEvents.map((e) => ({
      id: e.id,
      title: e.title,
      eventDate: e.eventDate,
      hasImage: !!e.imageUrl,
      isPast: new Date(e.eventDate) < now,
    }));
  } catch (err) {
    diagnostics.eventsError =
      err instanceof Error ? err.message : "Failed to read events";
  }

  // 5. Check recent post log
  try {
    const recentLogs = await db
      .select({
        id: socialPostsLog.id,
        platform: socialPostsLog.platform,
        contentType: socialPostsLog.contentType,
        status: socialPostsLog.status,
        errorMessage: socialPostsLog.errorMessage,
        postedAt: socialPostsLog.postedAt,
        queueId: socialPostsLog.queueId,
      })
      .from(socialPostsLog)
      .orderBy(desc(socialPostsLog.postedAt))
      .limit(10);

    diagnostics.recentLogs = recentLogs.map((l) => ({
      platform: l.platform,
      contentType: l.contentType,
      status: l.status,
      errorMessage: l.errorMessage,
      postedAt: l.postedAt ? new Date(l.postedAt).toISOString() : null,
      queueId: l.queueId,
    }));

    // Check how many posts were made today (CST day) — use the same
    // timezone-correct math as the today-counts endpoint so the debug
    // panel shows accurate numbers.
    const CST_OFFSET_HOURS = 6;
    const startOfDayCST = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        CST_OFFSET_HOURS,
        0,
        0,
      ),
    );
    if (now.getUTCHours() < CST_OFFSET_HOURS) {
      startOfDayCST.setTime(startOfDayCST.getTime() - 24 * 60 * 60 * 1000);
    }
    // Use DB-level count (not the 10-row JS filter above, which undercounts)
    const todayFeedCountRow = await db
      .select({ count: count() })
      .from(socialPostsLog)
      .where(
        and(
          eq(socialPostsLog.status, "success"),
          gte(socialPostsLog.postedAt, startOfDayCST),
          not(like(socialPostsLog.queueId, "throwback-%")),
          not(like(socialPostsLog.queueId, "autopost-event-%")),
        ),
      );
    const todayStoryCountRow = await db
      .select({ count: count() })
      .from(socialPostsLog)
      .where(
        and(
          eq(socialPostsLog.status, "success"),
          eq(socialPostsLog.platform, "instagram_story"),
          gte(socialPostsLog.postedAt, startOfDayCST),
        ),
      );
    const todayFeedCount = Number(todayFeedCountRow[0]?.count) || 0;
    const todayStoryCount = Number(todayStoryCountRow[0]?.count) || 0;
    diagnostics.todayPostsCount = todayFeedCount + todayStoryCount;
    diagnostics.todayFeedCount = todayFeedCount;
    diagnostics.todayStoryCount = todayStoryCount;
    diagnostics.startOfDayCST = startOfDayCST.toISOString();

    // Keep the recent-logs based view for backwards compat (shows actual
    // log entries, not just a count)
    const todayPosts = recentLogs.filter(
      (l) =>
        l.status === "success" &&
        l.postedAt &&
        new Date(l.postedAt) >= startOfDayCST,
    );
    diagnostics.todayPosts = todayPosts.map((l) => ({
      platform: l.platform,
      contentType: l.contentType,
      queueId: l.queueId,
      postedAt: l.postedAt ? new Date(l.postedAt).toISOString() : null,
    }));
  } catch (err) {
    diagnostics.logsError =
      err instanceof Error ? err.message : "Failed to read logs";
  }

  // 6. Check DB credentials (schedule config stored in DB)
  try {
    const creds = await db
      .select({ key: socialCredentials.key, value: socialCredentials.value })
      .from(socialCredentials)
      .where(eq(socialCredentials.platform, "meta"));

    const credKeys = creds.map((c) => c.key);
    diagnostics.dbCredentialKeys = credKeys;
    diagnostics.hasAutopostScheduleHours = credKeys.includes(
      "AUTOPOST_SCHEDULE_HOURS",
    );
    diagnostics.hasAutopostStoryScheduleHours = credKeys.includes(
      "AUTOPOST_STORY_SCHEDULE_HOURS",
    );
    diagnostics.hasAutopostPostsPerRun = credKeys.includes(
      "AUTOPOST_POSTS_PER_RUN",
    );
    diagnostics.hasAutopostMaxPostsPerDay = credKeys.includes(
      "AUTOPOST_MAX_POSTS_PER_DAY",
    );

    // Show the actual schedule hours value (don't expose secrets)
    const scheduleHoursCred = creds.find(
      (c) => c.key === "AUTOPOST_SCHEDULE_HOURS",
    );
    diagnostics.autopostScheduleHoursValue = scheduleHoursCred?.value || null;
    const storyScheduleHoursCred = creds.find(
      (c) => c.key === "AUTOPOST_STORY_SCHEDULE_HOURS",
    );
    diagnostics.autopostStoryScheduleHoursValue =
      storyScheduleHoursCred?.value || null;
  } catch (err) {
    diagnostics.credentialsError =
      err instanceof Error ? err.message : "Failed to read credentials";
  }

  // 7. Identify likely issues
  const issues: string[] = [];
  if (!metaConfigured)
    issues.push(
      "Meta API is not configured — META_SYSTEM_USER_TOKEN and/or FACEBOOK_PAGE_ID are missing",
    );
  if (diagnostics.tokenValid === false)
    issues.push(`Meta API token is invalid: ${diagnostics.tokenError}`);
  if ((diagnostics.queuePending as number) === 0)
    issues.push("Queue has no pending items — populate the queue first");
  if ((diagnostics.stuckProcessingItems as number) > 0)
    issues.push(
      `${diagnostics.stuckProcessingItems} items stuck in 'processing' status — they may need to be reset`,
    );
  if (!diagnostics.hasAutopostScheduleHours)
    issues.push(
      "AUTOPOST_SCHEDULE_HOURS not found in DB — schedule config may not have been saved (cron will use defaults: 4am, 10am, 3pm CST)",
    );
  if ((diagnostics.upcomingEvents as unknown[])?.length === 0)
    issues.push("No upcoming events found in the database");
  if ((diagnostics.todayPostsCount as number) === 0)
    issues.push(
      "No successful posts today — the cron may not be running or may be skipping this hour",
    );

  diagnostics.likelyIssues =
    issues.length > 0
      ? issues
      : [
          "No obvious issues found — check Netlify function logs for the social-auto-post cron",
        ];

  return NextResponse.json({
    success: true,
    diagnostics,
  });
}

// ===========================================
// AUTOPOST UPCOMING EVENT — Independent event posting for the cron job
// ===========================================
// This handler is called by the social-auto-post cron function 3 times/day.
// It posts the nearest upcoming event to FB (feed post) + IG (Story) independently
// of the regular queue rotation. Event posts do NOT count against the queue's daily limit.
// Dedup is tiered based on event proximity:
//   - More than 1 week away: 2x/day (12-hour dedup window)
//   - Within 1 week of the event: 3x/day (8-hour dedup window)
//
// Instagram uses Stories (not feed posts or Reels) for events — Stories create
// urgency and match the time-sensitive nature of upcoming events.

async function handleAutopostUpcomingEvent() {
  if (!(await isMetaConfiguredAsync())) {
    return NextResponse.json({
      success: false,
      message: "Meta API not configured. Cannot autopost events.",
    });
  }

  try {
    // Find the nearest upcoming event (future date, not cancelled, has image)
    const now = new Date();
    const upcomingEvents = await db
      .select({
        id: events.id,
        title: events.title,
        venue: events.venue,
        city: events.city,
        country: events.country,
        eventDate: events.eventDate,
        eventTime: events.eventTime,
        ticketUrl: events.ticketUrl,
        imageUrl: events.imageUrl,
        isFeatured: events.isFeatured,
      })
      .from(events)
      .where(
        and(
          gt(events.eventDate, now),
          eq(events.isCancelled, false),
          isNotNull(events.imageUrl),
        ),
      )
      .orderBy(events.eventDate)
      .limit(5); // Check top 5 in case the nearest was recently posted

    if (upcomingEvents.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No upcoming events with images to autopost.",
        noEvents: true,
      });
    }

    // Tiered event posting frequency based on proximity:
    // - ALL events more than 1 week away: 2 posts/day max (12h dedup, cap=2)
    // - AT LEAST ONE event within 1 week: 3 posts/day max (8h dedup, cap=3)
    //
    // The hard cap is DYNAMIC — it depends on whether any upcoming event is
    // close. This means when nothing is imminent, you see at most 2 event
    // Stories per day. When something is within 1 week, you see up to 3.
    // The cap applies to TOTAL event posts across all events, not per-event.
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const DEDUP_FAR_HOURS = 12; // events >1 week away → 12h between posts
    const DEDUP_NEAR_HOURS = 8; // events within 1 week → 8h between posts

    // If ANY upcoming event is within 1 week, allow 3/day. Otherwise cap at 2/day.
    const anyEventWithinWeek = upcomingEvents.some(
      (e) => new Date(e.eventDate).getTime() - now.getTime() <= ONE_WEEK_MS,
    );
    const HARD_24H_CAP = anyEventWithinWeek ? 3 : 2;

    // === HARD BACKSTOP: count successful event IG Story posts in the last 24h ===
    // IMPORTANT: We count ONLY platform='instagram_story' entries because each
    // event autopost creates TWO log rows (one for FB, one for IG Story). If
    // we counted both, the cap would be off by 2x. Counting only IG Story
    // entries gives us the true number of event Story posts the user sees.
    const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recent24hPosts = await db
      .select({ id: socialPostsLog.id })
      .from(socialPostsLog)
      .where(
        and(
          eq(socialPostsLog.contentType, "event"),
          eq(socialPostsLog.platform, "instagram_story"),
          eq(socialPostsLog.status, "success"),
          gt(socialPostsLog.postedAt, cutoff24h),
        ),
      );
    const postsInLast24h = recent24hPosts.length;

    if (postsInLast24h >= HARD_24H_CAP) {
      console.log(
        `[Social API] Hard 24h cap reached: ${postsInLast24h}/${HARD_24H_CAP} event IG Story posts in the last 24h (cap is ${HARD_24H_CAP} because ${anyEventWithinWeek ? "an event is within 1 week" : "no events within 1 week"}). Refusing to post.`,
      );
      return NextResponse.json({
        success: false,
        message: `Hard daily cap reached: ${postsInLast24h} event IG Story posts in the last 24h (max ${HARD_24H_CAP}). Skipping.`,
        alreadyPosted: true,
        postsInLast24h,
        hardCap: HARD_24H_CAP,
      });
    }

    let selectedEvent: (typeof upcomingEvents)[0] | null = null;
    let selectedDedupHours = DEDUP_FAR_HOURS;

    for (const event of upcomingEvents) {
      // Determine dedup window based on how close the event is
      const timeUntilEvent =
        new Date(event.eventDate).getTime() - now.getTime();
      const dedupHours =
        timeUntilEvent <= ONE_WEEK_MS ? DEDUP_NEAR_HOURS : DEDUP_FAR_HOURS;
      const cutoff = new Date(now.getTime() - dedupHours * 60 * 60 * 1000);

      // Use Drizzle's gt() with a JS Date so the timestamp comparison works
      // regardless of whether Drizzle stores timestamps as seconds or ms
      // internally. The previous raw SQL `postedAt > unixepoch() - N` was
      // unreliable in Turso and caused the same event to be re-posted
      // every cron run.
      const recentlyPosted = await db
        .select({ id: socialPostsLog.id })
        .from(socialPostsLog)
        .where(
          and(
            eq(socialPostsLog.contentType, "event"),
            eq(socialPostsLog.sourceId, event.id),
            eq(socialPostsLog.status, "success"),
            gt(socialPostsLog.postedAt, cutoff),
          ),
        )
        .limit(1);

      if (recentlyPosted.length === 0) {
        selectedEvent = event;
        selectedDedupHours = dedupHours;
        break;
      }

      console.log(
        `[Social API] Event "${event.title}" was posted in last ${dedupHours}h, skipping.`,
      );
    }

    if (!selectedEvent) {
      return NextResponse.json({
        success: false,
        message: "All upcoming events were already posted recently.",
        alreadyPosted: true,
      });
    }

    // Generate caption and post
    const eventLinkUrl = `${SITE_URL}/proximos`;
    const caption = generateCaption({
      contentType: "event",
      eventTitle: selectedEvent.title,
      eventVenue: selectedEvent.venue,
      eventCity: selectedEvent.city,
      eventDate: selectedEvent.eventDate,
      eventTime: selectedEvent.eventTime || undefined,
      ticketUrl: selectedEvent.ticketUrl || undefined,
      linkUrl: eventLinkUrl,
    });

    // biome-ignore lint/style/noNonNullAssertion: guaranteed non-null
    const publicImageUrl = ensurePublicImageUrl(selectedEvent.imageUrl!);

    console.log(
      `[Social API] Autoposting upcoming event: ${selectedEvent.title} (${selectedEvent.id}) [dedup window: ${selectedDedupHours}h, posts in last 24h: ${postsInLast24h}/${HARD_24H_CAP}]`,
    );

    const results: {
      facebook?: {
        success: boolean;
        postId?: string;
        postUrl?: string;
        error?: string;
      };
      instagram_story?: {
        success: boolean;
        mediaId?: string;
        permalink?: string;
        error?: string;
      };
    } = {};

    const platforms = ["facebook", "instagram_story"];

    // Post to Facebook (regular feed post)
    if (platforms.includes("facebook")) {
      const fbResult = await postToFacebook(
        publicImageUrl,
        caption,
        eventLinkUrl,
      );
      results.facebook = {
        success: fbResult.success,
        postId: fbResult.postId || undefined,
        postUrl: fbResult.postUrl || undefined,
        error: fbResult.error || undefined,
      };

      // Log with queueId prefix "autopost-event" so we can distinguish these from manual posts
      try {
        await db.insert(socialPostsLog).values({
          id: crypto.randomUUID(),
          queueId: `autopost-event-${selectedEvent.id}`,
          platform: "facebook",
          contentType: "event",
          sourceId: selectedEvent.id,
          imageUrl: publicImageUrl,
          caption,
          linkUrl: eventLinkUrl,
          platformPostId: fbResult.postId,
          platformPostUrl: fbResult.postUrl,
          metaApiResponse: null,
          status: fbResult.success ? "success" : "failed",
          errorMessage: fbResult.error || null,
          postedAt: new Date(),
        // biome-ignore lint/suspicious/noExplicitAny: dynamic type
        } as any);
      } catch (logError) {
        console.error(
          "[Social API] Failed to log autopost FB event result:",
          logError,
        );
      }
    }

    // Post to Instagram as a Story (not feed post, not Reel)
    // Events go to Stories for more visibility and urgency — they disappear after 24h,
    // which matches the time-sensitive nature of upcoming events.
    if (platforms.includes("instagram_story")) {
      // Extract the best link from the caption for the Story link sticker
      const storyLink = extractStoryLinkUrl(caption, eventLinkUrl);
      const igResult = await postToInstagramStory(
        publicImageUrl,
        caption,
        storyLink,
      );
      results.instagram_story = {
        success: igResult.success,
        mediaId: igResult.mediaId || undefined,
        permalink: igResult.permalink || undefined,
        error: igResult.error || undefined,
      };

      try {
        await db.insert(socialPostsLog).values({
          id: crypto.randomUUID(),
          queueId: `autopost-event-${selectedEvent.id}`,
          platform: "instagram_story",
          contentType: "event",
          sourceId: selectedEvent.id,
          imageUrl: publicImageUrl,
          caption,
          linkUrl: eventLinkUrl,
          platformPostId: igResult.mediaId,
          platformPostUrl: igResult.permalink,
          metaApiResponse: null,
          status: igResult.success ? "success" : "failed",
          errorMessage: igResult.error || null,
          postedAt: new Date(),
        // biome-ignore lint/suspicious/noExplicitAny: dynamic type
        } as any);
      } catch (logError) {
        console.error(
          "[Social API] Failed to log autopost IG Story event result:",
          logError,
        );
      }
    }

    const anySuccess =
      results.facebook?.success || results.instagram_story?.success;
    const errorMessages: string[] = [];
    if (results.facebook && !results.facebook.success)
      errorMessages.push(`FB: ${results.facebook.error}`);
    if (results.instagram_story && !results.instagram_story.success)
      errorMessages.push(`IG Story: ${results.instagram_story.error}`);

    return NextResponse.json({
      success: anySuccess,
      message: anySuccess
        ? `Evento autoposteado: "${selectedEvent.title}" en ${results.facebook?.success ? "Facebook" : ""}${results.facebook?.success && results.instagram_story?.success ? " e " : ""}${results.instagram_story?.success ? "Instagram Story" : ""}`
        : `Error al autopostear evento "${selectedEvent.title}": ${errorMessages.join(", ")}`,
      event: {
        id: selectedEvent.id,
        title: selectedEvent.title,
        venue: selectedEvent.venue,
        city: selectedEvent.city,
        eventDate: selectedEvent.eventDate,
      },
      results,
    });
  } catch (error) {
    console.error("[Social API] Autopost upcoming event error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Error al autopostear evento próximo",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

async function handleResetCycle() {
  try {
    // First count how many will be reset
    const postedItems = await db
      .select({ count: count() })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "posted"));

    const skippedItems = await db
      .select({ count: count() })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "skipped"));

    const processingItems = await db
      .select({ count: count() })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "processing"));

    const resetCount =
      (postedItems[0]?.count || 0) +
      (skippedItems[0]?.count || 0) +
      (processingItems[0]?.count || 0);

    // Reset all posted, skipped, and processing items to pending for a new cycle
    await db
      .update(socialPostQueue)
      .set({
        status: "pending",
        postedPlatforms: "[]",
        errorMessage: null,
        postedAt: null,
        updatedAt: new Date(),
      // biome-ignore lint/suspicious/noExplicitAny: dynamic type
      } as any)
      .where(
        drizzleSql`${socialPostQueue.status} IN ('posted', 'skipped', 'processing')`,
      );

    return NextResponse.json({
      success: true,
      message: `Se reiniciaron ${resetCount} items a pendientes para un nuevo ciclo.`,
    });
  } catch (error) {
    console.error("[Social API] Reset cycle error:", error);
    return NextResponse.json({
      success: false,
      message: "Error al reiniciar ciclo",
    });
  }
}

async function handleSkipItem(queueId: string) {
  if (!queueId) {
    return NextResponse.json(
      { success: false, error: "queueId is required" },
      { status: 400 },
    );
  }

  await db
    .update(socialPostQueue)
    // biome-ignore lint/suspicious/noExplicitAny: dynamic type
    .set({ status: "skipped", updatedAt: new Date() } as any)
    .where(eq(socialPostQueue.id, queueId));

  return NextResponse.json({
    success: true,
    message: "Item saltado",
  });
}

async function handleValidateToken() {
  const tokenInfo = await validateToken();
  return NextResponse.json({
    success: true,
    data: tokenInfo,
  });
}

async function handleValidateReelToken() {
  // Pre-validate the Meta token for reel posting
  // Returns detailed info about what's ready and what's missing
  if (!(await isMetaConfiguredAsync())) {
    return NextResponse.json({
      success: false,
      data: {
        configured: false,
        message:
          "Meta API no configurada. Configura META_SYSTEM_USER_TOKEN y FACEBOOK_PAGE_ID en /admin/social.",
        canPostReel: false,
      },
    });
  }

  const tokenInfo = await validateToken();
  if (!tokenInfo.isValid) {
    const errorDetail = tokenInfo.raw?.message || "Token inválido";
    const errorCode = tokenInfo.raw?.code || "";
    let guidance = "";
    if (
      errorCode === 190 ||
      errorDetail.includes("Invalid OAuth") ||
      errorDetail.includes("Cannot parse")
    ) {
      guidance =
        "Genera un nuevo System User Token en business.facebook.com → Business Settings → Users → System Users.";
    }
    return NextResponse.json({
      success: false,
      data: {
        configured: true,
        tokenValid: false,
        message: `Token inválido: ${errorDetail}`,
        guidance,
        canPostReel: false,
        error: { code: errorCode, message: errorDetail },
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      configured: true,
      tokenValid: true,
      pageAccessible: tokenInfo.pageAccessible,
      igAccountAccessible: tokenInfo.igAccountAccessible,
      canPostReel: tokenInfo.pageAccessible || tokenInfo.igAccountAccessible,
      message: tokenInfo.igAccountAccessible
        ? "Token válido. Se puede publicar en Instagram Reels y Facebook Reels."
        : tokenInfo.pageAccessible
          ? "Token válido. Se puede publicar en Facebook Reels pero no se encontró cuenta de Instagram Business."
          : "Token válido pero no se puede acceder a la página de Facebook ni a la cuenta de Instagram.",
    },
  });
}

async function handleRetryFailed() {
  try {
    // Count failed items first
    const failedItems = await db
      .select({ count: count() })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "failed"));

    const failedCount = failedItems[0]?.count || 0;

    // Also count stuck "processing" items (from crashed runs)
    const processingItems = await db
      .select({ count: count() })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "processing"));

    const processingCount = processingItems[0]?.count || 0;

    // Reset all failed items to pending
    await db
      .update(socialPostQueue)
      .set({
        status: "pending",
        postedPlatforms: "[]",
        errorMessage: null,
        updatedAt: new Date(),
      // biome-ignore lint/suspicious/noExplicitAny: dynamic type
      } as any)
      .where(eq(socialPostQueue.status, "failed"));

    // Also recover stuck "processing" items back to "pending"
    await db
      .update(socialPostQueue)
      .set({
        status: "pending",
        updatedAt: new Date(),
      // biome-ignore lint/suspicious/noExplicitAny: dynamic type
      } as any)
      .where(eq(socialPostQueue.status, "processing"));

    const totalReset = failedCount + processingCount;
    const message =
      processingCount > 0
        ? `Se reiniciaron ${failedCount} items fallidos y ${processingCount} items atorados a pendientes para reintento.`
        : `Se reiniciaron ${failedCount} items fallidos a pendientes para reintento.`;

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("[Social API] Retry failed error:", error);
    return NextResponse.json({
      success: false,
      message: "Error al reintentar items fallidos",
    });
  }
}

async function handleClearQueue() {
  try {
    // Only clear pending items (not posted or in-progress)
    const pendingItems = await db
      .select({ count: count() })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "pending"));

    const pendingCount = pendingItems[0]?.count || 0;

    await db
      .delete(socialPostQueue)
      .where(eq(socialPostQueue.status, "pending"));

    return NextResponse.json({
      success: true,
      message: `Se eliminaron ${pendingCount} items pendientes de la cola.`,
    });
  } catch (error) {
    console.error("[Social API] Clear queue error:", error);
    return NextResponse.json({
      success: false,
      message: "Error al limpiar cola",
    });
  }
}

// ===========================================
// HELPER: Get content counts for population preview
// ===========================================

async function getContentCounts() {
  try {
    const galleryCount = await db
      .select({ count: count() })
      .from(galleryPhotos)
      .where(eq(galleryPhotos.isPublished, true));

    const releasesCount = await db
      .select({ count: count() })
      .from(releases)
      .where(eq(releases.isUpcoming, false));

    const artistsCount = await db
      .select({ count: count() })
      .from(artists)
      .where(eq(artists.isActive, true));

    let curatedTracksCount = 0;
    try {
      const ctCount = await db
        .select({ count: count() })
        .from(curatedTracks)
        .where(eq(curatedTracks.isAvailableForPlaylist, true));
      curatedTracksCount = ctCount[0]?.count || 0;
    } catch {
      // Table may not exist yet
    }

    let verticalVideosCount = 0;
    try {
      const vvCount = await db
        .select({ count: count() })
        .from(verticalVideos)
        .where(eq(verticalVideos.isPublished, true));
      verticalVideosCount = vvCount[0]?.count || 0;
    } catch {
      // Table may not exist yet
    }

    let youtubeVideosCount = 0;
    try {
      const ytvCount = await db.select({ count: count() }).from(videos);
      youtubeVideosCount = ytvCount[0]?.count || 0;
    } catch {
      // Table may not exist yet
    }

    let eventsCount = 0;
    try {
      const now = new Date();
      const evtCount = await db
        .select({ count: count() })
        .from(events)
        .where(and(gt(events.eventDate, now), eq(events.isCancelled, false)));
      eventsCount = evtCount[0]?.count || 0;
    } catch {
      // Table may not exist yet
    }

    return {
      galleryPhotos: galleryCount[0]?.count || 0,
      releases: releasesCount[0]?.count || 0,
      artists: artistsCount[0]?.count || 0,
      curatedTracks: curatedTracksCount,
      verticalVideos: verticalVideosCount,
      youtubeVideos: youtubeVideosCount,
      events: eventsCount,
    };
  } catch (error) {
    console.warn("[Social API] Error getting content counts:", error);
    return {
      galleryPhotos: 0,
      releases: 0,
      artists: 0,
      curatedTracks: 0,
      verticalVideos: 0,
      youtubeVideos: 0,
      events: 0,
    };
  }
}

// ===========================================
// SCHEDULE CONFIG — Store/retrieve posting schedule in social_credentials
// ===========================================
// Keys used: AUTOPOST_SCHEDULE_HOURS (comma-separated hours in Mexico City time, e.g. "4,10,15")
//            AUTOPOST_POSTS_PER_RUN (number of queue items to process per cron run)
//            AUTOPOST_MAX_POSTS_PER_DAY (maximum FEED posts per day)
//            AUTOPOST_STORY_SCHEDULE_HOURS (comma-separated hours for throwback IG Stories)
//            AUTOPOST_MAX_STORIES_PER_DAY (maximum IG Stories per day)

const DEFAULT_SCHEDULE_HOURS = [4, 10, 15]; // 4am, 10am, 3pm Mexico City time (CST = UTC-6 permanently)
const DEFAULT_POSTS_PER_RUN = 1;
const DEFAULT_MAX_POSTS_PER_DAY = 4;
const DEFAULT_MAX_STORIES_PER_DAY = 3;
// Default story schedule = same as regular schedule (back-compat: if not set, stories
// post at the same hours as regular feed posts, matching the original Option C behavior)
const DEFAULT_STORY_SCHEDULE_HOURS = [4, 10, 15];

async function getScheduleConfig(): Promise<{
  scheduleHours: number[];
  storyScheduleHours: number[];
  postsPerRun: number;
  maxPostsPerDay: number;
  maxStoriesPerDay: number;
}> {
  try {
    const creds = await db
      .select()
      .from(socialCredentials)
      .where(eq(socialCredentials.platform, "meta"));

    const credMap = new Map(creds.map((c) => [c.key, c.value]));

    const scheduleHoursStr = credMap.get("AUTOPOST_SCHEDULE_HOURS");
    const storyScheduleHoursStr = credMap.get("AUTOPOST_STORY_SCHEDULE_HOURS");
    const postsPerRunStr = credMap.get("AUTOPOST_POSTS_PER_RUN");
    const maxPostsPerDayStr = credMap.get("AUTOPOST_MAX_POSTS_PER_DAY");
    const maxStoriesPerDayStr = credMap.get("AUTOPOST_MAX_STORIES_PER_DAY");

    let scheduleHours = DEFAULT_SCHEDULE_HOURS;
    if (scheduleHoursStr) {
      const parsed = scheduleHoursStr
        .split(",")
        .map(Number)
        .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 23);
      if (parsed.length > 0) scheduleHours = parsed.sort((a, b) => a - b);
    }

    let storyScheduleHours = DEFAULT_STORY_SCHEDULE_HOURS;
    if (storyScheduleHoursStr) {
      const parsed = storyScheduleHoursStr
        .split(",")
        .map(Number)
        .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 23);
      if (parsed.length > 0) storyScheduleHours = parsed.sort((a, b) => a - b);
    }

    let postsPerRun = DEFAULT_POSTS_PER_RUN;
    if (postsPerRunStr) {
      const parsed = Number.parseInt(postsPerRunStr);
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 10)
        postsPerRun = parsed;
    }

    let maxPostsPerDay = DEFAULT_MAX_POSTS_PER_DAY;
    if (maxPostsPerDayStr) {
      const parsed = Number.parseInt(maxPostsPerDayStr);
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 24)
        maxPostsPerDay = parsed;
    }

    let maxStoriesPerDay = DEFAULT_MAX_STORIES_PER_DAY;
    if (maxStoriesPerDayStr) {
      const parsed = Number.parseInt(maxStoriesPerDayStr);
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 24)
        maxStoriesPerDay = parsed;
    }

    return {
      scheduleHours,
      storyScheduleHours,
      postsPerRun,
      maxPostsPerDay,
      maxStoriesPerDay,
    };
  } catch (error) {
    console.warn("[Social API] Error reading schedule config:", error);
    return {
      scheduleHours: DEFAULT_SCHEDULE_HOURS,
      storyScheduleHours: DEFAULT_STORY_SCHEDULE_HOURS,
      postsPerRun: DEFAULT_POSTS_PER_RUN,
      maxPostsPerDay: DEFAULT_MAX_POSTS_PER_DAY,
      maxStoriesPerDay: DEFAULT_MAX_STORIES_PER_DAY,
    };
  }
}

async function handleSaveScheduleConfig(body: Record<string, unknown>) {
  try {
    const {
      scheduleHours,
      storyScheduleHours,
      postsPerRun,
      maxPostsPerDay,
      maxStoriesPerDay,
    } = body;

    const configToSave: Array<{ key: string; value: string }> = [];

    if (Array.isArray(scheduleHours)) {
      const validHours = scheduleHours
        .map(Number)
        .filter((n: number) => !Number.isNaN(n) && n >= 0 && n <= 23)
        .sort((a: number, b: number) => a - b);
      if (validHours.length > 0) {
        configToSave.push({
          key: "AUTOPOST_SCHEDULE_HOURS",
          value: validHours.join(","),
        });
      }
    }

    if (Array.isArray(storyScheduleHours)) {
      const validHours = storyScheduleHours
        .map(Number)
        .filter((n: number) => !Number.isNaN(n) && n >= 0 && n <= 23)
        .sort((a: number, b: number) => a - b);
      if (validHours.length > 0) {
        configToSave.push({
          key: "AUTOPOST_STORY_SCHEDULE_HOURS",
          value: validHours.join(","),
        });
      }
    }

    if (postsPerRun !== undefined) {
      const val = Number.parseInt(String(postsPerRun));
      if (!Number.isNaN(val) && val >= 1 && val <= 10) {
        configToSave.push({
          key: "AUTOPOST_POSTS_PER_RUN",
          value: String(val),
        });
      }
    }

    if (maxPostsPerDay !== undefined) {
      const val = Number.parseInt(String(maxPostsPerDay));
      if (!Number.isNaN(val) && val >= 1 && val <= 24) {
        configToSave.push({
          key: "AUTOPOST_MAX_POSTS_PER_DAY",
          value: String(val),
        });
      }
    }

    if (maxStoriesPerDay !== undefined) {
      const val = Number.parseInt(String(maxStoriesPerDay));
      if (!Number.isNaN(val) && val >= 0 && val <= 24) {
        configToSave.push({
          key: "AUTOPOST_MAX_STORIES_PER_DAY",
          value: String(val),
        });
      }
    }

    for (const config of configToSave) {
      const existing = await db
        .select({ id: socialCredentials.id })
        .from(socialCredentials)
        .where(
          and(
            eq(socialCredentials.platform, "meta"),
            eq(socialCredentials.key, config.key),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(socialCredentials)
          // biome-ignore lint/suspicious/noExplicitAny: dynamic type
          .set({ value: config.value, updatedAt: new Date() } as any)
          .where(
            and(
              eq(socialCredentials.platform, "meta"),
              eq(socialCredentials.key, config.key),
            ),
          );
      } else {
        await db.insert(socialCredentials).values({
          id: crypto.randomUUID(),
          platform: "meta",
          key: config.key,
          value: config.value,
          isFromUi: true,
        // biome-ignore lint/suspicious/noExplicitAny: dynamic type
        } as any);
      }
    }

    const savedConfig = await getScheduleConfig();

    return NextResponse.json({
      success: true,
      message: "Configuración de horario guardada exitosamente",
      data: savedConfig,
    });
  } catch (error) {
    console.error("[Social API] Save schedule config error:", error);
    return NextResponse.json(
      { success: false, error: "Error al guardar la configuración de horario" },
      { status: 500 },
    );
  }
}

// ===========================================
// GENERATE AI CAPTION — Preview/test AI caption generation
// ===========================================

async function handleGenerateAICaption(body: Record<string, unknown>) {
  try {
    const contentType = body.contentType as string;
    if (!contentType) {
      return NextResponse.json(
        { success: false, error: "contentType is required" },
        { status: 400 },
      );
    }

    const ctx = {
      contentType: contentType as
        | "gallery_photo"
        | "spotify_track"
        | "artist_profile"
        | "curated_track"
        | "vertical_video"
        | "youtube_video"
        | "event",
      artistName: body.artistName as string | undefined,
      artistRole: body.artistRole as string | undefined,
      releaseTitle: body.releaseTitle as string | undefined,
      releaseType: body.releaseType as string | undefined,
      releaseDate: body.releaseDate
        ? new Date(body.releaseDate as string)
        : undefined,
      trackName: body.trackName as string | undefined,
      albumName: body.albumName as string | undefined,
      photoLocation: body.photoLocation as string | undefined,
      photographer: body.photographer as string | undefined,
      videoTitle: body.videoTitle as string | undefined,
      videoPlatform: body.videoPlatform as string | undefined,
      linkUrl: body.linkUrl as string | undefined,
      spotifyUrl: body.spotifyUrl as string | undefined,
      eventTitle: body.eventTitle as string | undefined,
      eventVenue: body.eventVenue as string | undefined,
      eventCity: body.eventCity as string | undefined,
      eventDate: body.eventDate
        ? new Date(body.eventDate as string)
        : undefined,
      eventTime: body.eventTime as string | undefined,
      ticketUrl: body.ticketUrl as string | undefined,
    };

    // Generate both AI and template captions for comparison
    const [aiCaption, templateCaption] = await Promise.all([
      generateAICaption(ctx, body.variationIndex as number | undefined).catch(
        () => null,
      ),
      Promise.resolve(
        generateCaption(ctx, body.variationIndex as number | undefined),
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        aiCaption,
        templateCaption,
        context: ctx,
      },
    });
  } catch (error) {
    console.error("[Social API] Generate AI caption error:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Error al generar caption: ${(error as Error).message}`,
      },
      { status: 500 },
    );
  }
}
