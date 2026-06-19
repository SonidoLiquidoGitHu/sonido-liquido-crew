import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// ===========================================
// NETLIFY SCHEDULED FUNCTION - SOCIAL AUTO-POSTER
// ===========================================
// Runs every hour and processes N items per run based on config.
// The actual posting is controlled by AUTOPOST_POSTS_PER_RUN and
// AUTOPOST_SCHEDULE_HOURS stored in the social_credentials DB table.
//
// FEED HOURS (AUTOPOST_SCHEDULE_HOURS, Mexico City time):
//   At each feed hour, the cron calls process-next, which picks the next
//   pending item from the queue and posts it to FB (wall) + IG (feed).
//   These calls are capped by AUTOPOST_MAX_POSTS_PER_DAY.
//
// STORY HOURS (AUTOPOST_STORY_SCHEDULE_HOURS, Mexico City time):
//   At each story hour, the cron calls process-next-story-only, which
//   picks a recently-posted queue item as throwback content and posts
//   it as an Instagram Story ONLY (no FB wall, no IG feed, no queue
//   advancement). Story-only calls do NOT count against
//   AUTOPOST_MAX_POSTS_PER_DAY.
//
// If a given hour is in BOTH schedules (overlapping), both calls fire
// in that order: feed first, then throwback story.
//
// MANUAL TRIGGER (POST with Bearer CRON_SECRET):
//   Bypasses the hour-matching check. Runs both feed and story paths
//   so admins can verify both work. The feed path still respects
//   maxPostsPerDay; the story path always fires once.
//
// Schedule matching uses hour-granularity: if the cron runs at an hour
// that matches a scheduled hour (in UTC), it posts.
//
// Mexico City is permanently UTC-6 (DST abolished in 2022).

// Default config (used when DB is not accessible)
const DEFAULT_POSTS_PER_RUN = 1;
const DEFAULT_MAX_POSTS_PER_DAY = 3;
const DEFAULT_SCHEDULE_HOURS = [4, 10, 15]; // 4am, 10am, 3pm CST
const DEFAULT_STORY_SCHEDULE_HOURS = [4, 10, 15]; // Default: same as feed
const CST_OFFSET = 6; // Mexico City = UTC-6

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const startTime = Date.now();
  console.log("[Social Auto-Post] Starting scheduled post run...");

  const siteUrl = process.env.URL || process.env.DEPLOY_URL || "https://sonidoliquido.com";
  const cronSecret = process.env.CRON_SECRET || "";

  // Allow manual trigger via POST with auth
  const isManualTrigger = event.httpMethod === "POST";
  const authHeader = event.headers["authorization"] || "";
  if (isManualTrigger && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
  };

  try {
    // First, get the schedule config from the API
    const configUrl = `${siteUrl}/api/admin/social?action=schedule-config`;
    let postsPerRun = DEFAULT_POSTS_PER_RUN;
    let scheduleHours: number[] = DEFAULT_SCHEDULE_HOURS;
    let storyScheduleHours: number[] = DEFAULT_STORY_SCHEDULE_HOURS;
    let maxPostsPerDay = DEFAULT_MAX_POSTS_PER_DAY;

    try {
      const configRes = await fetch(configUrl, {
        headers,
        signal: AbortSignal.timeout(10_000),
      });
      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData.success && configData.data) {
          postsPerRun = configData.data.postsPerRun || DEFAULT_POSTS_PER_RUN;
          // Only override default if the DB returned actual schedule hours
          if (configData.data.scheduleHours && configData.data.scheduleHours.length > 0) {
            scheduleHours = configData.data.scheduleHours;
          }
          if (configData.data.storyScheduleHours && configData.data.storyScheduleHours.length > 0) {
            storyScheduleHours = configData.data.storyScheduleHours;
          } else {
            // Back-compat: if story schedule not set, mirror the feed schedule
            storyScheduleHours = scheduleHours;
          }
          maxPostsPerDay = configData.data.maxPostsPerDay || DEFAULT_MAX_POSTS_PER_DAY;
        }
      }
    } catch (err) {
      console.warn("[Social Auto-Post] Could not fetch schedule config, using defaults:", err);
    }

    // Check if we should post at this hour
    // Convert schedule hours (CST) to UTC and check if the current UTC hour matches
    const currentHourUTC = new Date().getUTCHours();
    const utcScheduleHours = scheduleHours.map(h => (h + CST_OFFSET) % 24);
    const utcStoryScheduleHours = storyScheduleHours.map(h => (h + CST_OFFSET) % 24);

    const shouldPostFeed = utcScheduleHours.includes(currentHourUTC);
    const shouldPostStory = utcStoryScheduleHours.includes(currentHourUTC);
    const shouldRunAnything = shouldPostFeed || shouldPostStory;

    // For manual triggers, always run both feed and story
    const effectiveShouldPostFeed = isManualTrigger || shouldPostFeed;
    const effectiveShouldPostStory = isManualTrigger || shouldPostStory;

    if (!shouldRunAnything && !isManualTrigger) {
      // Build a list of upcoming hours for both schedules for the log message
      const nextFeedHour = scheduleHours
        .map(h => ({ cst: h, utc: (h + CST_OFFSET) % 24 }))
        .sort((a, b) => a.utc - b.utc)
        .find(entry => entry.utc > currentHourUTC) || scheduleHours
        .map(h => ({ cst: h, utc: (h + CST_OFFSET) % 24 }))
        .sort((a, b) => a.utc - b.utc)[0];

      const nextStoryHour = storyScheduleHours
        .map(h => ({ cst: h, utc: (h + CST_OFFSET) % 24 }))
        .sort((a, b) => a.utc - b.utc)
        .find(entry => entry.utc > currentHourUTC) || storyScheduleHours
        .map(h => ({ cst: h, utc: (h + CST_OFFSET) % 24 }))
        .sort((a, b) => a.utc - b.utc)[0];

      console.log(
        `[Social Auto-Post] Not scheduled for this hour (UTC ${currentHourUTC} = CST ${currentHourUTC - CST_OFFSET >= 0 ? currentHourUTC - CST_OFFSET : currentHourUTC - CST_OFFSET + 24}). ` +
        `Feed hours (Mexico City): ${scheduleHours.join(", ")}. Next feed: ${nextFeedHour?.cst}:00 CST. ` +
        `Story hours (Mexico City): ${storyScheduleHours.join(", ")}. Next story: ${nextStoryHour?.cst}:00 CST.`
      );
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: `Not scheduled for this hour. Next feed: ${nextFeedHour?.cst}:00 CST. Next story: ${nextStoryHour?.cst}:00 CST`,
          skipped: true,
          currentHourUTC,
          scheduleHours,
          storyScheduleHours,
          utcScheduleHours,
          utcStoryScheduleHours,
        }),
      };
    }

    console.log(
      `[Social Auto-Post] Hour matches schedule! UTC ${currentHourUTC} = CST ${currentHourUTC - CST_OFFSET >= 0 ? currentHourUTC - CST_OFFSET : currentHourUTC - CST_OFFSET + 24}. ` +
      `Feed: ${effectiveShouldPostFeed ? "YES" : "no"}. Story: ${effectiveShouldPostStory ? "YES" : "no"}. ` +
      `Feed cap: ${maxPostsPerDay} posts/day.`
    );

    // ===========================================
    // STEP 1: AUTOPOST UPCOMING EVENT — DISABLED INDEFINITELY
    // ===========================================
    // The event autopost has been posting the same event to IG Stories
    // repeatedly despite multiple fix attempts. Until we can verify the
    // dedup/cap logic actually works against real production data, this
    // step is OFF.
    //
    // Events will still appear in the regular queue rotation (Step 2) and
    // post to FB + IG feed (NOT Stories) in their proper turn.
    let eventAutopostResult: { success: boolean; message: string; event?: any } | null = null;
    eventAutopostResult = {
      success: false,
      message: "Event autopost DISABLED — was posting duplicates to IG Stories",
    };
    console.log("[Social Auto-Post] Step 1 (event autopost) DISABLED");

    // ===========================================
    // STEP 2: PROCESS REGULAR FEED QUEUE (with daily cap)
    // ===========================================
    // Only runs when this hour is a feed hour (or manual trigger).
    // The daily cap (maxPostsPerDay) ONLY applies to feed posts —
    // throwback stories in Step 3 do NOT consume this quota.
    let feedResult: { success: boolean; message: string; processedCount: number; skipped: boolean; reason?: string } = {
      success: false,
      message: "Feed path not run",
      processedCount: 0,
      skipped: true,
      reason: "not_triggered",
    };

    if (effectiveShouldPostFeed) {
      // Check how many feed posts were already made today
      // (excludes throwback-* and autopost-event-* entries from social_posts_log)
      let postsMadeToday = 0;
      try {
        const logUrl = `${siteUrl}/api/admin/social`; // GET returns recentLogs
        const logRes = await fetch(logUrl, {
          headers,
          signal: AbortSignal.timeout(10_000),
        });
        if (logRes.ok) {
          const logData = await logRes.json();
          if (logData.success && logData.data?.recentLogs) {
            const now = new Date();
            const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            // Count successful posts from today (using Mexico City day: CST = UTC-6)
            const startOfDayCST = new Date(startOfDayUTC.getTime() - CST_OFFSET * 60 * 60 * 1000);
            // Only count regular feed queue posts — exclude throwback-* and autopost-event-*
            postsMadeToday = logData.data.recentLogs.filter(
              (log: any) =>
                log.status === "success" &&
                new Date(log.postedAt) >= startOfDayCST &&
                !log.queueId?.startsWith("autopost-event-") &&
                !log.queueId?.startsWith("throwback-")
            ).length;
          }
        }
      } catch (err) {
        console.warn("[Social Auto-Post] Could not check today's feed post count:", err);
      }

      if (postsMadeToday >= maxPostsPerDay) {
        console.log(
          `[Social Auto-Post] Feed daily limit reached: ${postsMadeToday}/${maxPostsPerDay} feed posts already made today. Skipping feed path.`
        );
        feedResult = {
          success: false,
          message: `Daily feed limit reached (${postsMadeToday}/${maxPostsPerDay})`,
          processedCount: 0,
          skipped: true,
          reason: "daily_limit_reached",
        };
      } else {
        const remainingQuota = maxPostsPerDay - postsMadeToday;
        const itemsToProcess = Math.min(postsPerRun, remainingQuota);

        console.log(
          `[Social Auto-Post] Feed posts today: ${postsMadeToday}/${maxPostsPerDay}. ` +
          `Can process ${itemsToProcess} item(s) this run (requested: ${postsPerRun}).`
        );

        const feedResults: Array<{ success: boolean; message: string }> = [];
        let processedCount = 0;

        for (let i = 0; i < itemsToProcess; i++) {
          const processUrl = `${siteUrl}/api/admin/social`;

          try {
            // Feed path: process-next WITHOUT alsoPostStory. Stories are
            // handled separately in Step 3 via process-next-story-only.
            const bodyPayload: Record<string, unknown> = { action: "process-next" };

            const response = await fetch(processUrl, {
              method: "POST",
              headers,
              body: JSON.stringify(bodyPayload),
              signal: AbortSignal.timeout(50_000),
            });

            const data = await response.json();

            if (response.ok && data.success) {
              console.log(`[Social Auto-Post] Feed item ${i + 1}/${itemsToProcess} posted:`, data.message);
              feedResults.push({ success: true, message: data.message });
              processedCount++;
            } else if (response.ok && !data.success) {
              console.log(`[Social Auto-Post] No more feed items after ${processedCount} items:`, data.message);
              feedResults.push({ success: false, message: data.message });
              break;
            } else {
              console.error(`[Social Auto-Post] API error on feed item ${i + 1}:`, data);
              feedResults.push({ success: false, message: data.error || data.message || "API error" });
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : "Unknown error";
            console.error(`[Social Auto-Post] Exception on feed item ${i + 1}:`, errMsg);
            feedResults.push({ success: false, message: errMsg });
          }
        }

        const successCount = feedResults.filter(r => r.success).length;
        feedResult = {
          success: successCount > 0,
          message: `Feed: ${successCount}/${feedResults.length} items posted`,
          processedCount,
          skipped: false,
        };
      }
    }

    // ===========================================
    // STEP 3: THROWBACK IG STORY (separate from feed cap)
    // ===========================================
    // Only runs when this hour is a story hour (or manual trigger).
    // Calls process-next-story-only which picks a recently-posted item
    // and posts ONLY an IG Story (no FB wall, no IG feed). Does NOT
    // count against maxPostsPerDay.
    let storyResult: { success: boolean; message: string; throwback?: boolean } = {
      success: false,
      message: "Story path not run",
    };

    if (effectiveShouldPostStory) {
      const storyUrl = `${siteUrl}/api/admin/social`;
      try {
        const response = await fetch(storyUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "process-next-story-only" }),
          signal: AbortSignal.timeout(50_000),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          console.log("[Social Auto-Post] Throwback IG Story posted:", data.message);
          storyResult = {
            success: true,
            message: data.message,
            throwback: !!data.throwback,
          };
        } else {
          console.warn("[Social Auto-Post] Throwback IG Story did not post:", data.message || data.error);
          storyResult = {
            success: false,
            message: data.message || data.error || "Story post failed",
          };
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        console.error("[Social Auto-Post] Exception on throwback story:", errMsg);
        storyResult = { success: false, message: errMsg };
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(
      `[Social Auto-Post] Run complete in ${elapsed}s: ` +
      `Feed=${feedResult.message}, Story=${storyResult.success ? "yes" : "no"}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: feedResult.success || storyResult.success,
        message: `Feed: ${feedResult.message} | Story: ${storyResult.message} | in ${elapsed}s`,
        elapsed: `${elapsed}s`,
        eventAutopost: eventAutopostResult,
        feedResult,
        storyResult,
        config: {
          postsPerRun,
          scheduleHours,
          storyScheduleHours,
          maxPostsPerDay,
          shouldPostFeed: effectiveShouldPostFeed,
          shouldPostStory: effectiveShouldPostStory,
        },
      }),
    };
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Social Auto-Post] Exception after ${elapsed}s:`, errMsg);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Internal error",
        error: errMsg,
        elapsed: `${elapsed}s`,
      }),
    };
  }
};

export { handler };
