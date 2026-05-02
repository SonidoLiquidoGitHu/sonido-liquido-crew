import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// ===========================================
// NETLIFY SCHEDULED FUNCTION - DAILY SPOTIFY SYNC
// ===========================================
// This function runs automatically every 6 hours via Netlify's cron scheduler.
// It calls the app's sync endpoint for each artist individually to avoid
// Netlify function timeouts. Each artist sync takes ~5-10 seconds.
// The sync endpoint uses streaming (NDJSON) to prevent CDN inactivity timeouts.

const SLC_ARTIST_COUNT = 15;

interface SyncLine {
  type: string;
  artist?: string;
  found?: number;
  created?: number;
  linked?: number;
  newReleasesCreated?: number;
  newArtistLinksCreated?: number;
  totalArtistsProcessed?: number;
  errors?: string[];
  message?: string;
  error?: string;
}

async function parseNdjsonResponse(response: Response): Promise<SyncLine[]> {
  const text = await response.text();
  const lines = text.split("\n").filter(l => l.trim());
  return lines.map(l => {
    try { return JSON.parse(l); } catch { return { type: "parse_error", raw: l }; }
  });
}

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

  // Process each artist one at a time to stay within function timeout
  // Each call to the sync endpoint processes one artist's recent releases
  for (let i = 0; i < SLC_ARTIST_COUNT; i++) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Stop if we're approaching the function timeout (leave 15s buffer)
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
        signal: AbortSignal.timeout(20_000), // 20 second timeout per artist (increased for streaming)
      });

      // Parse NDJSON streaming response
      const lines = await parseNdjsonResponse(response);

      // Find the final "complete" or "artist_done" line
      const completeLine = lines.find(l => l.type === "complete");
      const artistDoneLine = lines.find(l => l.type === "artist_done");
      const errorLine = lines.find(l => l.type === "error" || l.type === "artist_error" || l.type === "fatal_error");

      if (completeLine || artistDoneLine) {
        results.artistsProcessed++;
        const newReleases = completeLine?.newReleasesCreated || artistDoneLine?.created || 0;
        const newLinks = completeLine?.newArtistLinksCreated || artistDoneLine?.linked || 0;
        results.totalNewReleases += newReleases;
        results.totalNewLinks += newLinks;
        console.log(`[Scheduled Sync] Artist ${i}: ${newReleases} new, ${newLinks} links (${elapsed}s)`);
      } else if (errorLine) {
        results.errors.push(`Artist ${i}: ${errorLine.error || "Unknown error"}`);
        console.error(`[Scheduled Sync] Artist ${i} error: ${errorLine.error}`);
      } else {
        // Fallback: try parsing as regular JSON (backward compatibility)
        try {
          const data = JSON.parse(await response.text());
          if (data.success) {
            results.artistsProcessed++;
            results.totalNewReleases += data.newReleasesCreated || 0;
            results.totalNewLinks += data.newArtistLinksCreated || 0;
          } else {
            results.errors.push(`Artist ${i}: ${data.error || "Unknown error"}`);
          }
        } catch {
          results.errors.push(`Artist ${i}: Unexpected response format`);
        }
      }
    } catch (error) {
      const errorMsg = (error as Error).message;
      results.errors.push(`Artist ${i}: ${errorMsg}`);
      console.error(`[Scheduled Sync] Artist ${i} failed:`, errorMsg);
      // Continue with next artist
    }

    // Small delay between artists
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`[Scheduled Sync] Completed in ${totalElapsed}s: ${results.artistsProcessed}/${SLC_ARTIST_COUNT} artists, ${results.totalNewReleases} new releases, ${results.totalNewLinks} new links`);

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
