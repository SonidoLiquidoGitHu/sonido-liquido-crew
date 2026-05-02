import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// ===========================================
// NETLIFY SCHEDULED FUNCTION - DAILY SPOTIFY SYNC
// ===========================================
// This function runs automatically every 6 hours via Netlify's cron scheduler.
// It calls the app's lightweight sync endpoint which only fetches
// the first page (20 most recent releases) per artist from Spotify.
// This keeps the discografía up-to-date without requiring manual syncs.

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const startTime = Date.now();
  console.log("[Scheduled Sync] Starting daily Spotify releases sync...");

  // Netlify provides the site URL via process.env.URL
  const siteUrl = process.env.URL || process.env.DEPLOY_URL || "https://sonidoliquido.com";
  const cronSecret = process.env.CRON_SECRET || "";

  try {
    const syncUrl = `${siteUrl}/api/cron/sync-recent-releases`;

    console.log(`[Scheduled Sync] Calling: ${syncUrl}`);

    const response = await fetch(syncUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Pass the CRON_SECRET for authentication
        ...(cronSecret ? { "Authorization": `Bearer ${cronSecret}` } : {}),
      },
      signal: AbortSignal.timeout(55_000), // 55 second timeout
    });

    const data = await response.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (data.success) {
      console.log(`[Scheduled Sync] Completed in ${elapsed}s: ${data.newReleasesCreated} new releases, ${data.existingReleasesSkipped} existing`);
    } else {
      console.error(`[Scheduled Sync] Failed in ${elapsed}s:`, data.error);
    }

    return {
      statusCode: response.ok ? 200 : 500,
      body: JSON.stringify({
        message: "Scheduled sync completed",
        elapsed: `${elapsed}s`,
        result: data,
      }),
    };
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const errorMessage = (error as Error).message;
    console.error(`[Scheduled Sync] Error after ${elapsed}s:`, errorMessage);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Scheduled sync failed",
        elapsed: `${elapsed}s`,
        error: errorMessage,
      }),
    };
  }
};

export { handler };
