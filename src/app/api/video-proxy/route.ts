import { db } from "@/db/client";
import { dropboxLinkCache } from "@/db/schema";
import { eq, lt, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Public video proxy — fast, cached redirect to Dropbox CDN.
 *
 * FIX HISTORY (2026-06-20):
 *   Previous version made 2 sequential Dropbox API calls on EVERY request
 *   (get_shared_link_metadata + get_temporary_link) before returning a 302.
 *   This added 1-5s of latency to every video playback. It also had a
 *   "streaming fallback" that tried to stream the video through the
 *   Netlify serverless function — but Netlify's response body limit (6MB
 *   free / ~28MB Pro) silently truncated large videos, causing playback
 *   to stall mid-video with no resume.
 *
 * NEW STRATEGY (cached redirect-only):
 *   1. Check in-memory Map cache (3h TTL) — fastest path, no DB hit
 *   2. Check DB cache (dropbox_link_cache table) — survives cold starts
 *   3. Call Dropbox API to resolve a fresh temp link, store in both caches
 *   4. Return 302 redirect to the temp link — browser hits dl.dropboxusercontent.com
 *      directly with native Range/seeking support
 *
 *   For non-Dropbox URLs (ucarecdn.com etc.), we still proxy small files
 *   (<5MB) directly. Large non-Dropbox files return 502 — the streaming
 *   fallback was broken and silently truncated videos.
 *
 * Dropbox temp links are valid for ~4 hours; we cache for 3 hours to
 * stay safely below the expiry.
 */

const ALLOWED_HOSTS = [
  "dl.dropboxusercontent.com",
  "dropboxusercontent.com",
  "www.dropbox.com",
  "dropbox.com",
  "ucarecdn.com",
];

const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours (Dropbox temp links last ~4h)
const SMALL_FILE_LIMIT = 5 * 1024 * 1024; // 5MB — only buffer small non-Dropbox files
const UPSTREAM_TIMEOUT_MS = 15_000;

// ============================================================
// IN-MEMORY CACHE (per-instance fast path)
// ============================================================
// Survives across requests on the same Netlify function instance.
// Each entry: { tempLink, expiresAt }
const memCache = new Map<string, { tempLink: string; expiresAt: number }>();

function memGet(url: string): string | null {
  const entry = memCache.get(url);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    memCache.delete(url);
    return null;
  }
  return entry.tempLink;
}

function memSet(url: string, tempLink: string): void {
  memCache.set(url, { tempLink, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ============================================================
// DB CACHE (survives cold starts, shared across instances)
// ============================================================
async function dbGet(dropboxUrl: string): Promise<string | null> {
  try {
    const rows = await db
      .select({
        tempLink: dropboxLinkCache.tempLink,
        expiresAt: dropboxLinkCache.expiresAt,
      })
      .from(dropboxLinkCache)
      .where(eq(dropboxLinkCache.dropboxUrl, dropboxUrl))
      .limit(1);
    if (rows.length === 0) return null;
    const expiresAt = rows[0].expiresAt
      ? new Date(rows[0].expiresAt as unknown as string).getTime()
      : 0;
    if (Date.now() >= expiresAt) {
      // Stale — delete it
      await db
        .delete(dropboxLinkCache)
        .where(eq(dropboxLinkCache.dropboxUrl, dropboxUrl));
      return null;
    }
    return rows[0].tempLink;
  } catch (err) {
    console.warn("[video-proxy] DB cache read failed (non-fatal):", err);
    return null;
  }
}

async function dbSet(dropboxUrl: string, tempLink: string): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
    // Upsert: replace if exists, else insert
    await db
      .insert(dropboxLinkCache)
      .values({
        dropboxUrl,
        tempLink,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: dropboxLinkCache.dropboxUrl,
        set: { tempLink, expiresAt, createdAt: new Date() },
      });
  } catch (err) {
    console.warn("[video-proxy] DB cache write failed (non-fatal):", err);
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let videoUrl = searchParams.get("url");

  if (!videoUrl) {
    return NextResponse.json(
      { error: "Missing url parameter" },
      { status: 400 },
    );
  }

  // Strip cache-buster params (e.g. _retry=1_1234567890)
  const retryMatch = videoUrl.match(/[&?]_retry=\d+_\d+$/);
  if (retryMatch) {
    videoUrl = videoUrl.replace(retryMatch[0], "");
  }

  // Normalize dl.dropboxusercontent.com URLs → www.dropbox.com?raw=1
  if (videoUrl.includes("dl.dropboxusercontent.com")) {
    const fixed = videoUrl.replace(
      "dl.dropboxusercontent.com",
      "www.dropbox.com",
    );
    if (!fixed.includes("raw=1")) {
      videoUrl = `${fixed + (fixed.includes("?") ? "&" : "?")}raw=1`;
    } else {
      videoUrl = fixed;
    }
  }

  // Add raw=1 to Dropbox URLs missing it
  if (
    videoUrl.includes("dropbox.com") &&
    !videoUrl.includes("raw=1") &&
    !videoUrl.includes("dl.dropboxusercontent.com")
  ) {
    if (videoUrl.includes("dl=0")) {
      videoUrl = videoUrl.replace("?dl=0", "?raw=1").replace("&dl=0", "&raw=1");
    } else {
      videoUrl = `${videoUrl + (videoUrl.includes("?") ? "&" : "?")}raw=1`;
    }
  }

  // Validate host
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(videoUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const isAllowed = ALLOWED_HOSTS.some(
    (host) =>
      parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`),
  );
  if (!isAllowed) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  const isDropbox =
    videoUrl.includes("dropbox.com") &&
    !videoUrl.includes("dl.dropboxusercontent.com");

  // ============================================================
  // DROPBOX PATH: cached redirect
  // ============================================================
  if (isDropbox) {
    // 1. Check in-memory cache
    const memHit = memGet(videoUrl);
    if (memHit) {
      const res = NextResponse.redirect(memHit, 302);
      res.headers.set(
        "Cache-Control",
        "public, max-age=1800, stale-while-revalidate=300",
      );
      return res;
    }

    // 2. Check DB cache
    const dbHit = await dbGet(videoUrl);
    if (dbHit) {
      memSet(videoUrl, dbHit); // populate in-memory for next hit
      const res = NextResponse.redirect(dbHit, 302);
      res.headers.set(
        "Cache-Control",
        "public, max-age=1800, stale-while-revalidate=300",
      );
      return res;
    }

    // 3. Resolve via Dropbox API, cache, redirect
    try {
      const tempLink = await resolveDropboxTempLink(videoUrl);
      if (tempLink) {
        memSet(videoUrl, tempLink);
        await dbSet(videoUrl, tempLink);
        const res = NextResponse.redirect(tempLink, 302);
        res.headers.set(
          "Cache-Control",
          "public, max-age=1800, stale-while-revalidate=300",
        );
        return res;
      }
      // API returned null — link is invalid or Dropbox is having issues.
      // Do NOT fall back to streaming (it's broken on Netlify). Return 502.
      console.error(
        "[video-proxy] Dropbox API returned no temp link for:",
        videoUrl,
      );
      return NextResponse.json(
        {
          error:
            "Could not resolve Dropbox link. The shared link may be invalid or deleted.",
        },
        { status: 502 },
      );
    } catch (err) {
      console.error("[video-proxy] Dropbox API resolution failed:", err);
      return NextResponse.json(
        { error: "Dropbox API resolution failed" },
        { status: 502 },
      );
    }
  }

  // ============================================================
  // NON-DROPBOX PATH: small-file proxy only
  // ============================================================
  // Streaming large files through the function is broken on Netlify
  // (6MB response limit silently truncates). Only proxy small files
  // that fit safely in memory. For large files, return 502 and let
  // the frontend handle it (should be rare — all videos are on Dropbox).
  try {
    const rangeHeader = request.headers.get("range");
    const fetchHeaders: Record<string, string> = {
      "User-Agent": "SonidoLiquido-VideoProxy/1.0",
    };
    if (rangeHeader) fetchHeaders.Range = rangeHeader;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    const response = await fetch(videoUrl, {
      signal: controller.signal,
      headers: fetchHeaders,
    });
    clearTimeout(timeout);

    if (!response.ok && response.status !== 206) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: response.status },
      );
    }

    const contentLength = response.headers.get("content-length");
    const bodyLength = contentLength ? Number.parseInt(contentLength, 10) : 0;

    // If body is too large, refuse to stream — it would be silently truncated
    if (bodyLength > SMALL_FILE_LIMIT) {
      return NextResponse.json(
        {
          error: `Video too large to proxy (${bodyLength} bytes). Use a Dropbox URL or CDN instead.`,
        },
        { status: 502 },
      );
    }

    // Determine content type
    let contentType = response.headers.get("content-type") || "video/mp4";
    if (
      !contentType.startsWith("video/") &&
      !contentType.startsWith("application/octet-stream")
    ) {
      const pathname = new URL(videoUrl).pathname.toLowerCase();
      contentType = pathname.includes(".webm") ? "video/webm" : "video/mp4";
    } else if (contentType.startsWith("application/octet-stream")) {
      contentType = "video/mp4";
    }

    const responseHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      Vary: "Accept-Encoding, Range",
    };
    if (contentLength) responseHeaders["Content-Length"] = contentLength;
    const contentRange = response.headers.get("content-range");
    if (contentRange) responseHeaders["Content-Range"] = contentRange;

    // Buffer small files (safe — under 5MB)
    if (response.body) {
      const body = await response.arrayBuffer();
      return new NextResponse(body, {
        status: response.status === 206 ? 206 : 200,
        headers: responseHeaders,
      });
    }

    return NextResponse.json(
      { error: "No response body from upstream" },
      { status: 502 },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json({ error: "Upstream timeout" }, { status: 504 });
    }
    console.error("[video-proxy] Error fetching:", videoUrl, error);
    return NextResponse.json(
      { error: "Failed to fetch video" },
      { status: 500 },
    );
  }
}

// ============================================================
// DROPBOX API RESOLUTION (only called on cache miss)
// ============================================================
async function resolveDropboxTempLink(
  sharedLinkUrl: string,
): Promise<string | null> {
  const { dropboxClient } = await import("@/lib/clients/dropbox");

  // Convert URL to a format the metadata API can resolve
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

  // Step 1: Get file metadata from the shared link
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

  if (!metaResponse.ok) {
    console.warn(
      `[video-proxy] Dropbox metadata API returned ${metaResponse.status}`,
    );
    return null;
  }

  const metaData = await metaResponse.json();
  const filePath = metaData.path_lower || metaData.path_display;

  if (!filePath) {
    console.warn("[video-proxy] Dropbox metadata did not contain a file path");
    return null;
  }

  // Step 2: Get a temporary direct download link
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

  if (!tempLinkResponse.ok) {
    console.warn(
      `[video-proxy] Dropbox temp link API returned ${tempLinkResponse.status}`,
    );
    return null;
  }

  const tempLinkData = await tempLinkResponse.json();
  return tempLinkData.link || null;
}
