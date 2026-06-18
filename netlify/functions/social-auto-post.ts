import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// ===========================================
// NETLIFY SCHEDULED FUNCTION - SOCIAL AUTO-POSTER
// ===========================================
// Runs every hour and processes N items per run based on config.
// The actual posting is controlled by AUTOPOST_POSTS_PER_RUN and
// AUTOPOST_SCHEDULE_HOURS stored in the social_credentials DB table.
//
// IMPORTANT: Upcoming events are autoposted INDEPENDENTLY at each
// scheduled time — they do NOT consume the regular queue's daily
// post limit. The regular queue continues its round-robin rotation
// as always.
//
// Event autopost frequency is tiered based on proximity:
//   - More than 1 week before the event: 2x/day (12-hour dedup)
//   - Within 1 week of the event: 3x/day (8-hour dedup)
// Events post to Facebook (feed) + Instagram (Story, not feed/Reel).
//
// THROWBACK STORIES: Each scheduled run also posts the queue item to
// Instagram as a Story (in addition to the regular FB feed + IG feed
// post). This means at every scheduled hour, IG gets TWO stories:
//   1. Event Story (from autopost-upcoming-event)
//   2. Throwback Story (from process-next with alsoPostStory: true)
// Vertical videos are excluded — they already post as Reels.
//
// Schedule matching uses a 1-hour window: if the cron runs at an hour
// that is within ±0 hours of a scheduled hour (in UTC), it posts.
// This ensures all CST hours are covered even though the cron only
// fires at the top of each hour.
//
// Mexico City is permanently UTC-6 (DST abolished in 2022).

// Default config (used when DB is not accessible)
const DEFAULT_POSTS_PER_RUN = 1;
const DEFAULT_MAX_POSTS_PER_DAY = 3;
const DEFAULT_SCHEDULE_HOURS = [4, 10, 15]; // 4am, 10am, 3pm CST
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

    const shouldPostNow = utcScheduleHours.includes(currentHourUTC);

    // For manual triggers, always allow posting regardless of schedule
    if (!shouldPostNow && !isManualTrigger) {
      // Find the next scheduled hour for the log message
      const nextCstHour = scheduleHours
        .map(h => ({ cst: h, utc: (h + CST_OFFSET) % 24 }))
        .sort((a, b) => a.utc - b.utc)
        .find(entry => entry.utc > currentHourUTC) || scheduleHours
        .map(h => ({ cst: h, utc: (h + CST_OFFSET) % 24 }))
        .sort((a, b) => a.utc - b.utc)[0];

      console.log(
        `[Social Auto-Post] Not scheduled for this hour (UTC ${currentHourUTC} = CST ${currentHourUTC - CST_OFFSET >= 0 ? currentHourUTC - CST_OFFSET : currentHourUTC - CST_OFFSET + 24}). ` +
        `Scheduled hours (Mexico City): ${scheduleHours.join(", ")}. Next: ${nextCstHour?.cst}:00 CST`
      );
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: `Not scheduled for this hour. Next scheduled: ${nextCstHour?.cst}:00 CST`,
          skipped: true,
          currentHourUTC,
          scheduleHours,
          utcScheduleHours,
        }),
      };
    }

    console.log(
      `[Social Auto-Post] Hour matches schedule! UTC ${currentHourUTC} = CST ${currentHourUTC - CST_OFFSET >= 0 ? currentHourUTC - CST_OFFSET : currentHourUTC - CST_OFFSET + 24}. ` +
      `Will process up to ${postsPerRun} item(s). Max ${maxPostsPerDay} posts/day.`
    );

    // ===========================================
    // STEP 1: AUTOPOST UPCOMING EVENT (independent of queue)
    // ===========================================
    // This runs first and does NOT count against the queue's daily limit.
    // If there's an upcoming event that hasn't been posted within its
    // dedup window (12h if >1 week away, 8h if within 1 week),
    // it gets posted to FB+IG before we touch the regular queue.
    let eventAutopostResult: { success: boolean; message: string; event?: any } | null = null;

    try {
      console.log("[Social Auto-Post] Step 1: Checking for upcoming events to autopost...");
      const eventResponse = await fetch(`${siteUrl}/api/admin/social`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "autopost-upcoming-event" }),
        signal: AbortSignal.timeout(50_000),
      });

      const eventData = await eventResponse.json();

      if (eventData.success) {
        console.log(`[Social Auto-Post] Event autoposted: ${eventData.message}`);
        eventAutopostResult = {
          success: true,
          message: eventData.message,
          event: eventData.event,
        };
      } else if (eventData.noEvents) {
        console.log("[Social Auto-Post] No upcoming events to autopost.");
        eventAutopostResult = { success: false, message: "No upcoming events" };
      } else if (eventData.alreadyPosted) {
        console.log("[Social Auto-Post] Upcoming event already posted recently, skipping.");
        eventAutopostResult = { success: false, message: "Event already posted recently" };
      } else {
        console.warn(`[Social Auto-Post] Event autopost failed: ${eventData.message || eventData.error}`);
        eventAutopostResult = { success: false, message: eventData.message || eventData.error || "Unknown error" };
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      console.warn(`[Social Auto-Post] Event autopost exception: ${errMsg}`);
      eventAutopostResult = { success: false, message: errMsg };
    }

    // ===========================================
    // STEP 2: PROCESS REGULAR QUEUE (as always)
    // ===========================================
    // The regular queue runs independently of the event autopost.
    // Daily limits only apply to the regular queue, NOT the event autopost.

    // Check how many posts were already made today (for maxPostsPerDay enforcement)
    // Only count regular queue posts (not autopost-event-* entries)
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
          // Only count regular queue posts — exclude autopost-event-* entries
          // since those are independent and don't consume the daily limit
          postsMadeToday = logData.data.recentLogs.filter(
            (log: any) =>
              log.status === "success" &&
              new Date(log.postedAt) >= startOfDayCST &&
              !log.queueId?.startsWith("autopost-event-")
          ).length;
        }
      }
    } catch (err) {
      console.warn("[Social Auto-Post] Could not check today's post count:", err);
    }

    // Check if we've already hit the daily limit
    if (postsMadeToday >= maxPostsPerDay) {
      console.log(
        `[Social Auto-Post] Daily limit reached: ${postsMadeToday}/${maxPostsPerDay} queue posts already made today. Skipping regular queue.`
      );
      // Still return success if the event was posted
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: !!eventAutopostResult?.success,
          message: `Daily queue limit reached (${postsMadeToday}/${maxPostsPerDay}). Event autopost: ${eventAutopostResult?.message || "N/A"}`,
          elapsed: `${elapsed}s`,
          eventAutopost: eventAutopostResult,
          queueResult: { skipped: true, reason: "daily_limit_reached", postsMadeToday, maxPostsPerDay },
        }),
      };
    }

    // Calculate how many items we can still post today
    const remainingQuota = maxPostsPerDay - postsMadeToday;
    const itemsToProcess = Math.min(postsPerRun, remainingQuota);

    console.log(
      `[Social Auto-Post] Queue posts today: ${postsMadeToday}/${maxPostsPerDay}. ` +
      `Can process ${itemsToProcess} item(s) this run (requested: ${postsPerRun}).`
    );

    // Process N items per run
    const results: Array<{ success: boolean; message: string }> = [];
    let processedCount = 0;

    for (let i = 0; i < itemsToProcess; i++) {
      const processUrl = `${siteUrl}/api/admin/social`;

      try {
        const response = await fetch(processUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "process-next", alsoPostStory: true }),
          signal: AbortSignal.timeout(50_000), // 50 second timeout per item
        });

        const data = await response.json();

        if (response.ok && data.success) {
          console.log(`[Social Auto-Post] Queue item ${i + 1}/${itemsToProcess} posted:`, data.message);
          results.push({ success: true, message: data.message });
          processedCount++;
        } else if (response.ok && !data.success) {
          // No more items to post — stop processing
          console.log(`[Social Auto-Post] No more items to post after ${processedCount} items:`, data.message);
          results.push({ success: false, message: data.message });
          break;
        } else {
          // API error
          console.error(`[Social Auto-Post] API error on item ${i + 1}:`, data);
          results.push({ success: false, message: data.error || data.message || "API error" });
          // Continue to next item instead of stopping entirely
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`[Social Auto-Post] Exception on item ${i + 1}:`, errMsg);
        results.push({ success: false, message: errMsg });
        // Continue to next item
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const successCount = results.filter(r => r.success).length;

    console.log(
      `[Social Auto-Post] Run complete in ${elapsed}s: Event autopost=${eventAutopostResult?.success ? "yes" : "no"}, Queue: ${successCount}/${results.length} items posted`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: eventAutopostResult?.success || successCount > 0,
        message: `Event autopost: ${eventAutopostResult?.message || "N/A"} | Queue: ${successCount}/${results.length} items in ${elapsed}s`,
        elapsed: `${elapsed}s`,
        eventAutopost: eventAutopostResult,
        queueResults: results,
        config: { postsPerRun, scheduleHours, maxPostsPerDay, itemsToProcess, postsMadeToday },
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
