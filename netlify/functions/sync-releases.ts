import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// ===========================================
// NETLIFY SCHEDULED FUNCTION - DAILY SPOTIFY SYNC
// ===========================================
// This function runs automatically every 6 hours via Netlify's cron scheduler.
// It calls the app's sync endpoint for each artist individually.
// The sync endpoint now uses fire-and-forget for full syncs,
// but processes single-artist requests synchronously (fast enough).

const SLC_ARTIST_COUNT = 15;

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const startTime = Date.now();
  console.log("[Scheduled Sync] Starting daily Spotify releases sync...");

  const siteUrl = process.env.URL || process.env.DEPLOY_URL || "https://sonidoliquido.com";
  const cronSecret = process.env.CRON_SECRET || "";

  const results = {
    artistsProcessed: 0,
    totalNewReleases: 0,
    totalNewLinks: 0,
    errors: [] as string[],
  };

  // Process each artist one at a time via the API route
  // Single-artist requests respond synchronously (within CDN timeout)
  for (let i = 0; i < SLC_ARTIST_COUNT; i++) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Stop if approaching timeout (leave 15s buffer)
    if (Date.now() - startTime > 45000) {
      console.log(`[Scheduled Sync] Approaching timeout after ${elapsed}s, stopping at artist ${i}/${SLC_ARTIST_COUNT}`);
      break;
    }

    try {
      const syncUrl = `${siteUrl}/api/cron/sync-recent-releases?artist=${i}`;

      const response = await fetch(syncUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cronSecret ? { "Authorization": `Bearer ${cronSecret}` } : {}),
        },
        signal: AbortSignal.timeout(25_000), // 25 second timeout per artist
      });

      if (response.ok || response.status === 202) {
        try {
          const data = await response.json();
          results.artistsProcessed++;
          results.totalNewReleases += data.newReleasesCreated || 0;
          results.totalNewLinks += data.newArtistLinksCreated || 0;
          console.log(`[Scheduled Sync] Artist ${i}: accepted (${elapsed}s) - ${data.message || 'processing'}`);
        } catch {
          results.artistsProcessed++;
          console.log(`[Scheduled Sync] Artist ${i}: accepted (${elapsed}s)`);
        }
      } else {
        const errorText = await response.text().catch(() => "Unknown error");
        results.errors.push(`Artist ${i}: ${response.status} - ${errorText.substring(0, 200)}`);
        console.error(`[Scheduled Sync] Artist ${i} failed: ${response.status}`);
      }
    } catch (error) {
      const errorMsg = (error as Error).message;
      results.errors.push(`Artist ${i}: ${errorMsg}`);
      console.error(`[Scheduled Sync] Artist ${i} failed:`, errorMsg);
    }

    // Delay between artists
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`[Scheduled Sync] Completed in ${totalElapsed}s: ${results.artistsProcessed}/${SLC_ARTIST_COUNT} artists, ${results.totalNewReleases} new releases, ${results.totalNewLinks} new links`);

  // Trigger ISR revalidation after sync
  try {
    const revalidateUrl = `${siteUrl}/api/revalidate?path=/`;
    await fetch(revalidateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5_000),
    }).catch(() => {}); // Best effort
  } catch { /* non-critical */ }

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Scheduled sync completed",
      elapsed: `${totalElapsed}s`,
      ...results,
    }),
  };
};

export { handler };
