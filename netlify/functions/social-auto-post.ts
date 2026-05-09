import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// ===========================================
// NETLIFY SCHEDULED FUNCTION - SOCIAL AUTO-POSTER
// ===========================================
// Runs 3x daily (4am, 10am, 3pm Mexico City time = 10am, 4pm, 9pm UTC)
// Picks the next pending item from social_post_queue and posts to FB + IG.
// Only processes ONE item per run (3 items/day × 2 platforms = 6 posts/day).

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const startTime = Date.now();
  console.log("[Social Auto-Post] Starting scheduled post...");

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
    // Call the app's internal API to process the next queue item
    // The API route is POST /api/admin/social with {action: "process-next"}
    const processUrl = `${siteUrl}/api/admin/social`;

    const response = await fetch(processUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
      },
      body: JSON.stringify({ action: "process-next" }),
      signal: AbortSignal.timeout(50_000), // 50 second timeout
    });

    const data = await response.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (response.ok && data.success) {
      console.log(`[Social Auto-Post] Success in ${elapsed}s:`, data.message);

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: data.message,
          elapsed: `${elapsed}s`,
          result: data.result,
        }),
      };
    }

    // No items to post or other non-error response
    if (response.ok && !data.success) {
      console.log(`[Social Auto-Post] No items to post (${elapsed}s):`, data.message);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: false,
          message: data.message || "No pending items",
          elapsed: `${elapsed}s`,
        }),
      };
    }

    // API returned an error
    console.error(`[Social Auto-Post] API error (${response.status}):`, data);
    return {
      statusCode: response.status,
      body: JSON.stringify({
        success: false,
        message: "API error",
        error: data.error || data.message,
        elapsed: `${elapsed}s`,
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
