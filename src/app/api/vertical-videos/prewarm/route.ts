// ===========================================
// VERTICAL VIDEOS PREWARM ENDPOINT
// ===========================================
// Resolves and caches Dropbox temp links for all published vertical videos
// in a single batch. Called by the client when the /reels page loads, so
// that by the time the user clicks a video, the cache is hot and the
// /api/video-proxy 302 redirect is instant (no 1-5s Dropbox API wait).
//
// HOW IT WORKS:
//   1. Fetches all published vertical video URLs from the DB
//   2. Filters to only Dropbox URLs (the ones that need cache resolution)
//   3. For each, checks if the DB cache already has a fresh entry
//   4. For cache misses, calls the Dropbox API in parallel (max 5 concurrent)
//      to resolve temp links and stores them in the DB cache
//   5. Returns a summary so the client can verify the prewarm worked
//
// WHY THIS HELPS:
//   Without prewarm: user clicks video → /api/video-proxy → Dropbox API
//   (1-5s) → 302 → browser downloads video from Dropbox CDN.
//
//   With prewarm: page loads → prewarm fires in background → by the time
//   user clicks, /api/video-proxy returns the 302 instantly (cache hit).
//
// RATE LIMIT / SAFETY:
//   - Max 5 concurrent Dropbox API calls (avoids hitting rate limits)
//   - Only resolves cache misses (no redundant API calls)
//   - Returns 200 even if some URLs fail to resolve (best-effort)
//   - Public endpoint (no auth) — only returns success/failure counts,
//     not actual URLs

import { db, isDatabaseConfigured } from "@/db/client";
import { dropboxLinkCache, verticalVideos } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_CONCURRENT = 5;
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours (matches video-proxy)

export async function GET(_req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: "Database not configured" },
      { status: 500 },
    );
  }

  try {
    // 1. Get all published Dropbox video URLs
    const videos = await db
      .select({ url: verticalVideos.videoUrl })
      .from(verticalVideos)
      .where(eq(verticalVideos.isPublished, true));

    // Normalize + filter to Dropbox URLs only
    const dropboxUrls = videos
      .map((v) => v.url)
      .filter((url): url is string => Boolean(url))
      .map(normalizeDropboxUrl)
      .filter((url) => url.includes("dropbox.com"))
      .filter((url, idx, arr) => arr.indexOf(url) === idx); // dedupe

    if (dropboxUrls.length === 0) {
      return NextResponse.json({
        success: true,
        prewarmed: 0,
        cached: 0,
        failed: 0,
        total: 0,
      });
    }

    // 2. Check which URLs are already cached + fresh
    const now = Date.now();
    const cachedRows = await db
      .select({
        url: dropboxLinkCache.dropboxUrl,
        expiresAt: dropboxLinkCache.expiresAt,
      })
      .from(dropboxLinkCache)
      .where(
        sql`${dropboxLinkCache.dropboxUrl} IN (${sql.join(
          dropboxUrls.map((u) => sql`${u}`),
          sql`,`,
        )})`,
      );

    const cachedFresh = new Set(
      cachedRows
        .filter((row) => {
          const expiresAt = row.expiresAt
            ? new Date(row.expiresAt as unknown as string).getTime()
            : 0;
          return expiresAt > now;
        })
        .map((row) => row.url),
    );

    const toPrewarm = dropboxUrls.filter((url) => !cachedFresh.has(url));

    // 3. Resolve cache misses in parallel (limited concurrency)
    let prewarmed = 0;
    let failed = 0;

    for (let i = 0; i < toPrewarm.length; i += MAX_CONCURRENT) {
      const batch = toPrewarm.slice(i, i + MAX_CONCURRENT);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const tempLink = await resolveDropboxTempLink(url);
          if (tempLink) {
            // Cache it
            await db
              .insert(dropboxLinkCache)
              .values({
                dropboxUrl: url,
                tempLink,
                expiresAt: new Date(now + CACHE_TTL_MS),
              })
              .onConflictDoUpdate({
                target: dropboxLinkCache.dropboxUrl,
                set: {
                  tempLink,
                  expiresAt: new Date(now + CACHE_TTL_MS),
                  createdAt: new Date(),
                },
              });
            return true;
          }
          return false;
        }),
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          prewarmed++;
        } else {
          failed++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      prewarmed,
      cached: cachedFresh.size,
      failed,
      total: dropboxUrls.length,
    });
  } catch (error) {
    console.error("[prewarm] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ===========================================
// HELPERS
// ===========================================

function normalizeDropboxUrl(url: string): string {
  // Mirror the normalization in /api/video-proxy/route.ts
  if (url.includes("dl.dropboxusercontent.com")) {
    const fixed = url.replace(
      "dl.dropboxusercontent.com",
      "www.dropbox.com",
    );
    if (!fixed.includes("raw=1")) {
      return `${fixed + (fixed.includes("?") ? "&" : "?")}raw=1`;
    }
    return fixed;
  }

  if (
    url.includes("dropbox.com") &&
    !url.includes("raw=1") &&
    !url.includes("dl.dropboxusercontent.com")
  ) {
    if (url.includes("dl=0")) {
      return url.replace("?dl=0", "?raw=1").replace("&dl=0", "&raw=1");
    }
    return `${url + (url.includes("?") ? "&" : "?")}raw=1`;
  }

  return url;
}

async function resolveDropboxTempLink(
  sharedLinkUrl: string,
): Promise<string | null> {
  try {
    const { dropboxClient } = await import("@/lib/clients/dropbox");

    let sharedLink = sharedLinkUrl;
    if (sharedLink.includes("raw=1")) {
      sharedLink = sharedLink
        .replace("?raw=1", "?dl=0")
        .replace("&raw=1", "&dl=0");
    }
    if (!sharedLink.includes("?")) {
      sharedLink += "?dl=0";
    }

    const token = await dropboxClient.getAccessToken();

    // Step 1: Get file metadata
    const metaResponse = await fetch(
      "https://api.dropboxapi.com/2/sharing/get_shared_link_metadata",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: sharedLink }),
      },
    );

    if (!metaResponse.ok) return null;

    const metaData = await metaResponse.json();
    const filePath = metaData.path_lower || metaData.path_display;
    if (!filePath) return null;

    // Step 2: Get temp link
    const tempLinkResponse = await fetch(
      "https://api.dropboxapi.com/2/files/get_temporary_link",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: filePath }),
      },
    );

    if (!tempLinkResponse.ok) return null;

    const tempLinkData = await tempLinkResponse.json();
    return tempLinkData.link || null;
  } catch (err) {
    console.warn(
      `[prewarm] Failed to resolve ${sharedLinkUrl.substring(0, 80)}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
