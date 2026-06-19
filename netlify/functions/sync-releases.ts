import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// ===========================================
// NETLIFY SCHEDULED FUNCTION - DAILY SPOTIFY SYNC
// ===========================================
// This function runs automatically every 6 hours via Netlify's cron scheduler.
// It calls the app's sync endpoint for each artist individually.
//
// The artist roster is DYNAMIC — sourced from the app's `artists` table
// (active artists with a Spotify external profile). This function fetches
// the roster size from GET /api/cron/sync-recent-releases, then iterates
// 0..N-1, calling POST /api/cron/sync-recent-releases?artist=N for each.
//
// To add or remove an artist from the sync roster, edit them in
// /admin/artists — no code change or redeploy needed.

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const startTime = Date.now();
  console.log("[Scheduled Sync] Starting daily Spotify releases sync...");

  const siteUrl = process.env.URL || process.env.DEPLOY_URL || "https://sonidoliquido.com";
  const cronSecret = process.env.CRON_SECRET || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
  };

  const results = {
    artistsProcessed: 0,
    totalNewReleases: 0,
    totalNewLinks: 0,
    errors: [] as string[],
  };

  // Step 1: Fetch the roster size from the API (dynamic, sourced from DB)
  let rosterSize = 0;
  try {
    const statusRes = await fetch(`${siteUrl}/api/cron/sync-recent-releases`, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      rosterSize = statusData?.rosterSize ?? statusData?.artists?.length ?? 0;
      console.log(`[Scheduled Sync] Dynamic roster size: ${rosterSize} artist(s)`);
    } else {
      results.errors.push(`Failed to fetch roster status: ${statusRes.status}`);
      console.error(`[Scheduled Sync] Failed to fetch roster status: ${statusRes.status}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.errors.push(`Failed to fetch roster: ${msg}`);
    console.error("[Scheduled Sync] Failed to fetch roster:", msg);
  }

  if (rosterSize === 0) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Scheduled Sync] Roster is empty. Nothing to sync (${elapsed}s).`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Roster is empty. Add active artists with a Spotify profile in /admin/artists.",
        elapsed: `${elapsed}s`,
        ...results,
      }),
    };
  }

  // Step 2: Process each artist one at a time via the API route.
  // Single-artist requests respond synchronously (within CDN timeout).
  for (let i = 0; i < rosterSize; i++) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Stop if approaching timeout (leave 15s buffer)
    if (Date.now() - startTime > 45000) {
      console.log(`[Scheduled Sync] Approaching timeout after ${elapsed}s, stopping at artist ${i}/${rosterSize}`);
      break;
    }

    try {
      const syncUrl = `${siteUrl}/api/cron/sync-recent-releases?artist=${i}`;

      const response = await fetch(syncUrl, {
        method: "POST",
        headers,
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

  console.log(`[Scheduled Sync] Completed in ${totalElapsed}s: ${results.artistsProcessed}/${rosterSize} artists, ${results.totalNewReleases} new releases, ${results.totalNewLinks} new links`);

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
      rosterSize,
      ...results,
    }),
  };
};

export { handler };
