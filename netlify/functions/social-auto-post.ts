import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// ===========================================
// NETLIFY SCHEDULED FUNCTION - SOCIAL AUTO-POSTER
// ===========================================
// Runs every 2 hours and processes N items per run based on config.
// Default: 3 posts/day → 1 post every 8 hours → 1 post per run (every 2h × 1 = 12 posts/day)
// But the actual posting is controlled by AUTOPOST_POSTS_PER_RUN and AUTOPOST_SCHEDULE_HOURS
// stored in the social_credentials DB table.

// Default config (used when DB is not accessible)
const DEFAULT_POSTS_PER_RUN = 1;
const DEFAULT_MAX_POSTS_PER_DAY = 3;

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
    let scheduleHours: number[] = [];
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
          scheduleHours = configData.data.scheduleHours || [];
          maxPostsPerDay = configData.data.maxPostsPerDay || DEFAULT_MAX_POSTS_PER_DAY;
        }
      }
    } catch (err) {
      console.warn("[Social Auto-Post] Could not fetch schedule config, using defaults:", err);
    }

    // Check if we should post at this hour
    if (scheduleHours.length > 0) {
      const currentHourUTC = new Date().getUTCHours();
      // Convert schedule hours (Mexico City = UTC-6) to UTC
      const utcHours = scheduleHours.map(h => (h + 6) % 24);
      if (!utcHours.includes(currentHourUTC)) {
        const nextHour = scheduleHours.find(h => (h + 6) % 24 > currentHourUTC) || scheduleHours[0];
        console.log(
          `[Social Auto-Post] Not scheduled for this hour (UTC ${currentHourUTC}). ` +
          `Scheduled hours (Mexico City): ${scheduleHours.join(", ")}. Next: ${nextHour}:00 CST`
        );
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            message: `Not scheduled for this hour. Next scheduled: ${nextHour}:00 CST`,
            skipped: true,
          }),
        };
      }
    }

    // Process N items per run
    const results: Array<{ success: boolean; message: string }> = [];
    let processedCount = 0;

    for (let i = 0; i < postsPerRun; i++) {
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
          console.log(`[Social Auto-Post] Item ${i + 1}/${postsPerRun} posted:`, data.message);
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
        config: { postsPerRun, scheduleHours, maxPostsPerDay },
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
