import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// ===========================================
// NETLIFY SCHEDULED FUNCTION - SOCIAL AUTO-POSTER
// ===========================================
// Runs every hour and processes N items per run based on config.
// The actual posting is controlled by AUTOPOST_POSTS_PER_RUN and
// AUTOPOST_SCHEDULE_HOURS stored in the social_credentials DB table.
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

  try {
    // First, get the schedule config from the API
    const configUrl = `${siteUrl}/api/admin/social?action=schedule-config`;
    let postsPerRun = DEFAULT_POSTS_PER_RUN;
    let scheduleHours: number[] = DEFAULT_SCHEDULE_HOURS;
    let maxPostsPerDay = DEFAULT_MAX_POSTS_PER_DAY;

    try {
      const configRes = await fetch(configUrl, {
        headers: {
          ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
        },
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

    // Check how many posts were already made today (for maxPostsPerDay enforcement)
    let postsMadeToday = 0;
    try {
      const logUrl = `${siteUrl}/api/admin/social`; // GET returns recentLogs
      const logRes = await fetch(logUrl, {
        headers: {
          ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (logRes.ok) {
        const logData = await logRes.json();
        if (logData.success && logData.data?.recentLogs) {
          const now = new Date();
          const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
          // Count successful posts from today (using Mexico City day: CST = UTC-6)
          const startOfDayCST = new Date(startOfDayUTC.getTime() - CST_OFFSET * 60 * 60 * 1000);
          postsMadeToday = logData.data.recentLogs.filter(
            (log: any) => log.status === "success" && new Date(log.postedAt) >= startOfDayCST
          ).length;
        }
      }
    } catch (err) {
      console.warn("[Social Auto-Post] Could not check today's post count:", err);
    }

    // Check if we've already hit the daily limit
    if (postsMadeToday >= maxPostsPerDay) {
      console.log(
        `[Social Auto-Post] Daily limit reached: ${postsMadeToday}/${maxPostsPerDay} posts already made today. Skipping.`
      );
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: `Daily limit reached: ${postsMadeToday}/${maxPostsPerDay} posts today. Skipping.`,
          skipped: true,
          postsMadeToday,
          maxPostsPerDay,
        }),
      };
    }

    // Calculate how many items we can still post today
    const remainingQuota = maxPostsPerDay - postsMadeToday;
    const itemsToProcess = Math.min(postsPerRun, remainingQuota);

    console.log(
      `[Social Auto-Post] Posts today: ${postsMadeToday}/${maxPostsPerDay}. ` +
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
          headers: {
            "Content-Type": "application/json",
            ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
          },
          body: JSON.stringify({ action: "process-next" }),
          signal: AbortSignal.timeout(50_000), // 50 second timeout per item
        });

        const data = await response.json();

        if (response.ok && data.success) {
          console.log(`[Social Auto-Post] Item ${i + 1}/${itemsToProcess} posted:`, data.message);
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
      `[Social Auto-Post] Run complete in ${elapsed}s: ${successCount}/${results.length} items posted`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: successCount > 0,
        message: `Processed ${successCount}/${results.length} items in ${elapsed}s`,
        elapsed: `${elapsed}s`,
        results,
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
