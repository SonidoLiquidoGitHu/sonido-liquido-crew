// ===========================================
// META GRAPH API CLIENT
// ===========================================
// Handles posting to Facebook Page and Instagram Business Account
// via the Meta Graph API using a System User token.
// Also coordinates with the TikTok client for multi-platform posting.
//
// Key learnings from live API testing:
// - FB: Use /{page-id}/feed (link post) with Page access token.
//       /{page-id}/photos requires deprecated publish_actions.
// - IG: Use System User token directly for IG container + publish.
// - Image URLs must be publicly accessible for IG (Spotify CDN works,
//   but Dropbox raw links may need the image proxy).
// - Page access token is obtained by exchanging system user token
//   via GET /{page-id}?fields=access_token

import { db } from "@/db/client";
import { socialPostQueue, socialPostsLog } from "@/db/schema";
import { eq, and, sql as drizzleSql } from "drizzle-orm";
import { postToTikTok, isTikTokConfigured, type TikTokPostResult } from "./tiktok";

// ===========================================
// CONFIGURATION
// ===========================================

const META_GRAPH_API = "https://graph.facebook.com/v21.0";

// Cached DB credentials (fetched once per process lifetime, or when invalidated)
let _dbCredentials: Record<string, string> | null = null;

/**
 * Fetch credentials from the DB (social_credentials table).
 * DB values take priority over env vars.
 */
async function getDbCredentials(): Promise<Record<string, string>> {
  if (_dbCredentials) return _dbCredentials;

  try {
    const { db } = await import("@/db/client");
    const { socialCredentials } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const rows = await db
      .select()
      .from(socialCredentials)
      .where(eq(socialCredentials.platform, "meta"));

    _dbCredentials = {};
    for (const row of rows) {
      _dbCredentials[row.key] = row.value;
    }
    return _dbCredentials;
  } catch (error) {
    console.warn("[Meta] Could not fetch DB credentials:", error);
    return {};
  }
}

/**
 * Get a credential value: DB first, then env var fallback.
 */
async function getCredential(envKey: string): Promise<string> {
  const dbCreds = await getDbCredentials();
  return dbCreds[envKey] || process.env[envKey] || "";
}

async function getAppId(): Promise<string> {
  return getCredential("META_APP_ID");
}

async function getAppSecret(): Promise<string> {
  return getCredential("META_APP_SECRET");
}

async function getSystemUserToken(): Promise<string> {
  return getCredential("META_SYSTEM_USER_TOKEN");
}

async function getFacebookPageId(): Promise<string> {
  return getCredential("FACEBOOK_PAGE_ID");
}

/**
 * Async check for Meta configuration status.
 * Checks DB credentials first, then env vars as fallback.
 * This ensures serverless cold starts (where cache is empty)
 * still detect credentials stored in the DB.
 */
export async function isMetaConfiguredAsync(): Promise<boolean> {
  const token = await getCredential("META_SYSTEM_USER_TOKEN");
  const pageId = await getCredential("FACEBOOK_PAGE_ID");
  return !!(token && pageId);
}

/**
 * Synchronous check for Meta configuration status.
 * Uses cached DB credentials + env vars only.
 * Prefer isMetaConfiguredAsync() for accurate checks,
 * especially in serverless functions where cache may be empty.
 */
function isMetaConfigured(): boolean {
  return !!(
    (process.env.META_SYSTEM_USER_TOKEN || _dbCredentials?.META_SYSTEM_USER_TOKEN) &&
    (process.env.FACEBOOK_PAGE_ID || _dbCredentials?.FACEBOOK_PAGE_ID)
  );
}

/**
 * Invalidate the cached DB credentials so they're re-fetched on next use.
 * Call this after saving credentials via the admin UI.
 */
export function invalidateMetaCredentialsCache(): void {
  _dbCredentials = null;
  _pageAccessToken = null;
  _igBusinessAccountId = null;
}

// ===========================================
// PAGE ACCESS TOKEN (cached)
// ===========================================

let _pageAccessToken: string | null = null;

async function getPageAccessToken(): Promise<string> {
  if (_pageAccessToken) return _pageAccessToken;

  const systemToken = await getSystemUserToken();
  const pageId = await getFacebookPageId();

  try {
    const response = await fetch(
      `${META_GRAPH_API}/${pageId}?fields=access_token&access_token=${systemToken}`
    );
    const data = await response.json();
    if (data.access_token) {
      _pageAccessToken = data.access_token;
      console.log("[Meta] Obtained Page access token");
      return _pageAccessToken!;
    }
    // Fallback: system token itself
    console.warn("[Meta] Could not get Page token, using system token directly");
    return systemToken;
  } catch (error) {
    console.warn("[Meta] Page token exchange failed:", error);
    return systemToken;
  }
}

// ===========================================
// INSTAGRAM BUSINESS ACCOUNT ID (cached)
// ===========================================

let _igBusinessAccountId: string | null = null;

async function getInstagramBusinessAccountId(): Promise<string | null> {
  if (_igBusinessAccountId) return _igBusinessAccountId;

  const token = await getSystemUserToken(); // System token works for IG
  const pageId = await getFacebookPageId();

  try {
    const response = await fetch(
      `${META_GRAPH_API}/${pageId}?fields=instagram_business_account&access_token=${token}`
    );
    const data = await response.json();
    if (data.instagram_business_account?.id) {
      _igBusinessAccountId = data.instagram_business_account.id;
      console.log("[Meta] Instagram Business Account ID:", _igBusinessAccountId);
      return _igBusinessAccountId;
    }
    console.warn("[Meta] No Instagram Business Account found for this page");
    return null;
  } catch (error) {
    console.error("[Meta] Error fetching IG Business Account ID:", error);
    return null;
  }
}

// ===========================================
// TOKEN VALIDATION
// ===========================================

export interface TokenInfo {
  isValid: boolean;
  appId: string;
  userId: string;
  userName: string;
  expiresAt: number | null; // null = never expires
  scopes: string[];
  type: string;
  pageAccessible: boolean;
  igAccountAccessible: boolean;
  raw?: any;
}

export async function validateToken(token?: string): Promise<TokenInfo> {
  const tokenToCheck = token || await getSystemUserToken();
  if (!tokenToCheck) {
    return {
      isValid: false,
      appId: "",
      userId: "",
      userName: "",
      expiresAt: null,
      scopes: [],
      type: "",
      pageAccessible: false,
      igAccountAccessible: false,
    };
  }

  try {
    // 1. Validate the token itself using /me endpoint
    const meResponse = await fetch(
      `${META_GRAPH_API}/me?fields=id,name&access_token=${tokenToCheck}`
    );
    const meData = await meResponse.json();

    if (meData.error) {
      console.error("[Meta] Token validation error:", meData.error);
      return {
        isValid: false,
        appId: "",
        userId: meData.id || "",
        userName: "",
        expiresAt: null,
        scopes: [],
        type: "unknown",
        pageAccessible: false,
        igAccountAccessible: false,
        raw: meData.error,
      };
    }

    // 2. Try to access the Facebook Page
    let pageAccessible = false;
    const fbPageId = await getFacebookPageId();
    try {
      const pageRes = await fetch(
        `${META_GRAPH_API}/${fbPageId}?fields=id,name,access_token&access_token=${tokenToCheck}`
      );
      const pageData = await pageRes.json();
      pageAccessible = !pageData.error && !!pageData.access_token;
      if (pageData.access_token) {
        _pageAccessToken = pageData.access_token;
      }
    } catch {
      pageAccessible = false;
    }

    // 3. Try to access the Instagram Business Account
    let igAccountAccessible = false;
    try {
      const igRes = await fetch(
        `${META_GRAPH_API}/${fbPageId}?fields=instagram_business_account&access_token=${tokenToCheck}`
      );
      const igData = await igRes.json();
      igAccountAccessible = !igData.error && !!igData.instagram_business_account?.id;
      if (igData.instagram_business_account?.id) {
        _igBusinessAccountId = igData.instagram_business_account.id;
      }
    } catch {
      igAccountAccessible = false;
    }

    // 4. Try the debug_token endpoint for detailed info (optional, may fail without real App ID)
    let scopes: string[] = [];
    let appId = "";
    let expiresAt: number | null = null;
    let tokenType = "system_user";

    const appIdValue = await getAppId();
    const appSecretValue = await getAppSecret();
    if (appIdValue && appSecretValue) {
      try {
        const debugRes = await fetch(
          `${META_GRAPH_API}/debug_token?input_token=${tokenToCheck}&access_token=${appIdValue}|${appSecretValue}`
        );
        const debugData = await debugRes.json();
        if (!debugData.error && debugData.data) {
          const info = debugData.data;
          scopes = info.scopes || [];
          appId = info.app_id || "";
          expiresAt = info.expires_at ? info.expires_at * 1000 : null;
          tokenType = info.type || "system_user";
        }
      } catch {
        // debug_token not available — non-critical
      }
    }

    return {
      isValid: true,
      appId,
      userId: meData.id || "",
      userName: meData.name || "",
      expiresAt,
      scopes,
      type: tokenType,
      pageAccessible,
      igAccountAccessible,
    };
  } catch (error) {
    console.error("[Meta] Token validation request failed:", error);
    return {
      isValid: false,
      appId: "",
      userId: "",
      userName: "",
      expiresAt: null,
      scopes: [],
      type: "",
      pageAccessible: false,
      igAccountAccessible: false,
    };
  }
}

// ===========================================
// FACEBOOK POSTING
// ===========================================

export interface FacebookPostResult {
  success: boolean;
  postId: string | null;
  postUrl: string | null;
  error?: string;
}

/**
 * Post to the Facebook Page feed.
 *
 * Strategy: Try link post first (/{page-id}/feed with link + message),
 * which works with pages_manage_posts permission. If no link, try
 * photo post as fallback (/{page-id}/photos).
 */
export async function postToFacebook(
  imageUrl: string,
  caption: string,
  linkUrl?: string
): Promise<FacebookPostResult> {
  if (!(await isMetaConfiguredAsync())) {
    return { success: false, postId: null, postUrl: null, error: "Meta API not configured" };
  }

  const pageToken = await getPageAccessToken();
  const pageId = await getFacebookPageId();

  try {
    // Strategy 1: Link post via /feed endpoint
    // This creates a post with an attached link preview (shows image from the URL)
    if (linkUrl) {
      const fullCaption = caption;

      const response = await fetch(`${META_GRAPH_API}/${pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `${fullCaption}\n\n${linkUrl}`,
          link: linkUrl,
          access_token: pageToken,
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.warn("[Meta] FB feed post failed, trying photo post:", data.error.message);
        // Fall through to photo post
      } else {
        const postId = data.id || null;
        const postUrl = postId ? `https://facebook.com/${postId}` : null;
        console.log("[Meta] Facebook feed post successful:", postId);
        return { success: true, postId, postUrl };
      }
    }

    // Strategy 2: Photo post via /photos endpoint
    // This requires publish_actions for user tokens, but works with Page tokens
    // that have pages_manage_posts
    const fullCaption = linkUrl ? `${caption}\n\n${linkUrl}` : caption;

    const photoResponse = await fetch(`${META_GRAPH_API}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: imageUrl,
        message: fullCaption,
        access_token: pageToken,
      }),
    });

    const photoData = await photoResponse.json();

    if (photoData.error) {
      console.error("[Meta] Facebook photo post error:", photoData.error);
      return {
        success: false,
        postId: null,
        postUrl: null,
        error: `${photoData.error.code}: ${photoData.error.message}`,
      };
    }

    const postId = photoData.id || photoData.post_id || null;
    const postUrl = postId ? `https://facebook.com/${postId}` : null;

    console.log("[Meta] Facebook photo post successful:", postId);
    return { success: true, postId, postUrl };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Meta] Facebook post exception:", errMsg);
    return { success: false, postId: null, postUrl: null, error: errMsg };
  }
}

// ===========================================
// INSTAGRAM POSTING
// ===========================================

export interface InstagramPostResult {
  success: boolean;
  mediaId: string | null;
  permalink: string | null;
  error?: string;
}

/**
 * Post a photo to Instagram as a feed post.
 * IG API requires a 2-step process:
 * 1. Create a media container (upload image URL + caption)
 * 2. Wait for processing (poll status)
 * 3. Publish the container
 *
 * IMPORTANT: image_url must point to a publicly accessible image.
 * Spotify CDN URLs and standard image hosts work.
 * Dropbox URLs need the image proxy.
 */
export async function postToInstagram(
  imageUrl: string,
  caption: string
): Promise<InstagramPostResult> {
  if (!(await isMetaConfiguredAsync())) {
    return { success: false, mediaId: null, permalink: null, error: "Meta API not configured" };
  }

  const igAccountId = await getInstagramBusinessAccountId();
  if (!igAccountId) {
    return {
      success: false,
      mediaId: null,
      permalink: null,
      error: "Instagram Business Account not found",
    };
  }

  // Use system user token for IG operations (tested and works)
  const token = await getSystemUserToken();

  try {
    // Step 1: Create media container
    console.log("[Meta] Creating IG container with image:", imageUrl.substring(0, 80));

    const containerResponse = await fetch(`${META_GRAPH_API}/${igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: caption,
        access_token: token,
      }),
    });

    const containerData = await containerResponse.json();

    if (containerData.error) {
      console.error("[Meta] IG container creation error:", containerData.error);
      return {
        success: false,
        mediaId: null,
        permalink: null,
        error: `${containerData.error.code}: ${containerData.error.message}`,
      };
    }

    const containerId = containerData.id;
    console.log("[Meta] IG container created:", containerId);

    // Step 2: Poll container status until FINISHED or ERROR
    let statusCode = "IN_PROGRESS";
    let attempts = 0;
    const maxAttempts = 10;

    while (statusCode === "IN_PROGRESS" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s between polls
      attempts++;

      const statusResponse = await fetch(
        `${META_GRAPH_API}/${containerId}?fields=status_code&access_token=${token}`
      );
      const statusData = await statusResponse.json();
      statusCode = statusData.status_code || "IN_PROGRESS";

      if (statusCode === "FINISHED") {
        break;
      }

      if (statusCode === "ERROR") {
        console.error("[Meta] IG container processing error:", statusData);
        return {
          success: false,
          mediaId: null,
          permalink: null,
          error: `Container processing failed after ${attempts} polls`,
        };
      }
    }

    if (statusCode !== "FINISHED") {
      return {
        success: false,
        mediaId: null,
        permalink: null,
        error: `Container still processing after ${maxAttempts * 2}s timeout`,
      };
    }

    // Step 3: Publish the container
    const publishResponse = await fetch(`${META_GRAPH_API}/${igAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: token,
      }),
    });

    const publishData = await publishResponse.json();

    if (publishData.error) {
      console.error("[Meta] IG publish error:", publishData.error);
      return {
        success: false,
        mediaId: null,
        permalink: null,
        error: `${publishData.error.code}: ${publishData.error.message}`,
      };
    }

    const mediaId = publishData.id;

    // Step 4: Get permalink
    let permalink: string | null = null;
    try {
      const permalinkResponse = await fetch(
        `${META_GRAPH_API}/${mediaId}?fields=permalink&access_token=${token}`
      );
      const permalinkData = await permalinkResponse.json();
      permalink = permalinkData.permalink || null;
    } catch {
      // Non-critical
    }

    console.log("[Meta] Instagram post successful:", mediaId, permalink);
    return { success: true, mediaId, permalink };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Meta] Instagram post exception:", errMsg);
    return { success: false, mediaId: null, permalink: null, error: errMsg };
  }
}

// ===========================================
// INSTAGRAM REELS POSTING
// ===========================================

/**
 * Post a Reel (short video) to Instagram.
 *
 * Follows the same container + poll + publish pattern as postToInstagram,
 * but with these key differences:
 * - Uses media_type: "REELS" in the container creation
 * - Uses video_url instead of image_url
 * - Adds share_to_feed: true (default) so the Reel also appears in the feed
 *
 * Requirements:
 * - Max Reel duration: 90 seconds
 * - Video must be MP4 format, vertical (9:16) recommended
 * - The videoUrl must be publicly accessible (Meta servers download it)
 */
export async function postInstagramReel(
  videoUrl: string,
  caption: string,
  shareToFeed: boolean = true
): Promise<InstagramPostResult> {
  if (!(await isMetaConfiguredAsync())) {
    return { success: false, mediaId: null, permalink: null, error: "Meta API not configured" };
  }

  const igAccountId = await getInstagramBusinessAccountId();
  if (!igAccountId) {
    return {
      success: false,
      mediaId: null,
      permalink: null,
      error: "Instagram Business Account not found",
    };
  }

  // Resolve Dropbox URLs to temporary direct links
  const resolvedVideoUrl = await resolveDropboxVideoUrl(videoUrl);

  // Use system user token for IG operations
  const token = await getSystemUserToken();

  try {
    // Step 1: Create Reels container
    console.log("[Meta] Creating IG Reels container with video:", resolvedVideoUrl.substring(0, 80));

    const containerResponse = await fetch(`${META_GRAPH_API}/${igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: resolvedVideoUrl,
        caption: caption,
        share_to_feed: shareToFeed,
        access_token: token,
      }),
    });

    const containerData = await containerResponse.json();

    if (containerData.error) {
      console.error("[Meta] IG Reels container creation error:", containerData.error);
      return {
        success: false,
        mediaId: null,
        permalink: null,
        error: `${containerData.error.code}: ${containerData.error.message}`,
      };
    }

    const containerId = containerData.id;
    console.log("[Meta] IG Reels container created:", containerId);

    // Step 2: Poll container status until FINISHED or ERROR
    // Video processing can take significantly longer than images.
    // Use exponential backoff: 3s, 3s, 5s, 5s, 8s, 8s, 10s... up to 90s total
    let statusCode = "IN_PROGRESS";
    let attempts = 0;
    const maxAttempts = 15;
    const backoffDelay = (attempt: number) => {
      // Exponential backoff: start at 3s, cap at 10s
      const delays = [3, 3, 5, 5, 8, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10];
      return (delays[attempt] || 10) * 1000;
    };

    while (statusCode === "IN_PROGRESS" && attempts < maxAttempts) {
      const delay = backoffDelay(attempts);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempts++;

      const statusResponse = await fetch(
        `${META_GRAPH_API}/${containerId}?fields=status_code&access_token=${token}`
      );
      const statusData = await statusResponse.json();
      statusCode = statusData.status_code || "IN_PROGRESS";

      console.log(`[Meta] IG Reels container status: ${statusCode} (attempt ${attempts}/${maxAttempts}, waited ${delay/1000}s)`);

      if (statusCode === "FINISHED") {
        break;
      }

      if (statusCode === "ERROR") {
        console.error("[Meta] IG Reels container processing error:", statusData);
        return {
          success: false,
          mediaId: null,
          permalink: null,
          error: `Reels container processing failed: ${statusData.status_message || 'after ' + attempts + ' polls'}`,
        };
      }
    }

    if (statusCode !== "FINISHED") {
      // Container is still processing but we need to return.
      // Don't treat this as a hard failure — the container exists and may finish later.
      // Return the containerId so the caller can check status later.
      console.warn(`[Meta] IG Reels container still processing after ~90s. Container ID: ${containerId}`);
      return {
        success: false,
        mediaId: null,
        permalink: null,
        error: `Reels container still processing (ID: ${containerId}). It may finish shortly — check Instagram in a few minutes.`,
      };
    }

    // Step 3: Publish the container
    const publishResponse = await fetch(`${META_GRAPH_API}/${igAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: token,
      }),
    });

    const publishData = await publishResponse.json();

    if (publishData.error) {
      console.error("[Meta] IG Reels publish error:", publishData.error);
      return {
        success: false,
        mediaId: null,
        permalink: null,
        error: `${publishData.error.code}: ${publishData.error.message}`,
      };
    }

    const mediaId = publishData.id;

    // Step 4: Get permalink
    let permalink: string | null = null;
    try {
      const permalinkResponse = await fetch(
        `${META_GRAPH_API}/${mediaId}?fields=permalink&access_token=${token}`
      );
      const permalinkData = await permalinkResponse.json();
      permalink = permalinkData.permalink || null;
    } catch {
      // Non-critical
    }

    console.log("[Meta] Instagram Reel published successfully:", mediaId, permalink);
    return { success: true, mediaId, permalink };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Meta] Instagram Reel post exception:", errMsg);
    return { success: false, mediaId: null, permalink: null, error: errMsg };
  }
}

// ===========================================
// FACEBOOK REELS POSTING
// ===========================================

export interface FacebookReelResult {
  success: boolean;
  reelId: string | null;
  postUrl: string | null;
  error?: string;
}

/**
 * Post a Reel (short video) to a Facebook Page.
 *
 * Facebook Reels use a different endpoint than regular feed posts:
 * 1. Start upload: POST /{page-id}/video_reels with upload_phase: "start"
 * 2. Finish upload: POST /{page-id}/video_reels with upload_phase: "finish", video_url, description
 * 3. Poll for processing status
 *
 * Requirements:
 * - Video must be MP4 format, vertical (9:16) recommended
 * - Max duration: 90 seconds
 * - The videoUrl must be publicly accessible
 */
export async function postFacebookReel(
  videoUrl: string,
  caption: string
): Promise<FacebookReelResult> {
  if (!(await isMetaConfiguredAsync())) {
    return { success: false, reelId: null, postUrl: null, error: "Meta API not configured" };
  }

  const pageToken = await getPageAccessToken();
  const pageId = await getFacebookPageId();

  // Resolve Dropbox URLs to temporary direct links
  const resolvedVideoUrl = await resolveDropboxVideoUrl(videoUrl);

  try {
    // ===== Strategy A: Use /{page-id}/video_reels with start/finish flow =====
    // Step 1: Start upload phase
    console.log("[Meta] Starting FB Reel upload for page:", pageId);

    const startResponse = await fetch(`${META_GRAPH_API}/${pageId}/video_reels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upload_phase: "start",
        access_token: pageToken,
      }),
    });

    const startData = await startResponse.json();
    console.log("[Meta] FB Reel start response:", JSON.stringify(startData).substring(0, 200));

    if (startData.error) {
      console.error("[Meta] FB Reel start upload error:", startData.error);
      // If start phase fails, fall through to Strategy B
    }

    const videoId = startData.id;

    if (videoId) {
      // Step 2: Finish upload with video_url and description
      console.log("[Meta] Finishing FB Reel upload with video URL:", resolvedVideoUrl.substring(0, 80));

      const finishResponse = await fetch(`${META_GRAPH_API}/${pageId}/video_reels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upload_phase: "finish",
          video_url: resolvedVideoUrl,
          access_token: pageToken,
          description: caption,
          video_id: videoId,
        }),
      });

      const finishData = await finishResponse.json();
      console.log("[Meta] FB Reel finish response:", JSON.stringify(finishData).substring(0, 200));

      if (finishData.error) {
        console.error("[Meta] FB Reel finish upload error:", finishData.error);
        // If finish fails, fall through to Strategy B
      } else {
        const reelId = finishData.id || videoId;
        console.log("[Meta] FB Reel upload finished, reel_id:", reelId);

        // Poll for processing status
        const pollResult = await pollFacebookReelStatus(reelId, pageToken);
        const postUrl = reelId ? `https://facebook.com/reel/${reelId}` : null;

        if (pollResult === "ready") {
          console.log("[Meta] Facebook Reel published successfully:", reelId);
          return { success: true, reelId, postUrl };
        } else if (pollResult === "processing") {
          console.warn(`[Meta] FB Reel still processing, but upload was successful`);
          return {
            success: true,
            reelId,
            postUrl,
            error: "Reel uploaded but still processing — check Facebook for final status",
          };
        } else {
          return {
            success: false,
            reelId,
            postUrl: null,
            error: pollResult || "FB Reel processing failed",
          };
        }
      }
    }

    // ===== Strategy B: Fallback — Post video as a regular page video =====
    // If the /video_reels endpoint fails (missing permissions, API issues, etc.),
    // fall back to posting as a regular video which still shows on the page.
    console.log("[Meta] FB Reels endpoint failed, falling back to /videos endpoint");

    const videoResponse = await fetch(`${META_GRAPH_API}/${pageId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_url: resolvedVideoUrl,
        description: caption,
        access_token: pageToken,
      }),
    });

    const videoData = await videoResponse.json();
    console.log("[Meta] FB video fallback response:", JSON.stringify(videoData).substring(0, 200));

    if (videoData.error) {
      console.error("[Meta] FB video fallback error:", videoData.error);
      return {
        success: false,
        reelId: null,
        postUrl: null,
        error: `FB Reel failed (video_id missing) and video fallback also failed: ${videoData.error.code}: ${videoData.error.message}`,
      };
    }

    const fallbackVideoId = videoData.id;
    const postUrl = fallbackVideoId ? `https://facebook.com/${fallbackVideoId}` : null;
    console.log("[Meta] FB video posted as regular video:", fallbackVideoId);

    // Poll for processing
    const pollResult = await pollFacebookVideoStatus(fallbackVideoId, pageToken);

    if (pollResult === "ready" || pollResult === "processing") {
      return {
        success: true,
        reelId: fallbackVideoId,
        postUrl,
        error: pollResult === "processing"
          ? "Video uploaded but still processing — check Facebook"
          : undefined,
      };
    } else {
      return {
        success: false,
        reelId: fallbackVideoId,
        postUrl: null,
        error: pollResult || "FB video upload failed",
      };
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Meta] Facebook Reel post exception:", errMsg);
    return { success: false, reelId: null, postUrl: null, error: errMsg };
  }
}

// ===========================================
// FACEBOOK REEL/VIDEO STATUS POLLING HELPERS
// ===========================================

/**
 * Poll a Facebook Reel's processing status.
 * Returns "ready" if published, "processing" if still in progress, or an error string.
 */
async function pollFacebookReelStatus(
  reelId: string,
  pageToken: string,
  maxAttempts: number = 10
): Promise<"ready" | "processing" | string> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    attempts++;

    try {
      const statusResponse = await fetch(
        `${META_GRAPH_API}/${reelId}?fields=status,processing_progress&access_token=${pageToken}`
      );
      const statusData = await statusResponse.json();

      const status = statusData.status;
      const progress = statusData.processing_progress;

      console.log(
        `[Meta] FB Reel processing status: ${status}${progress !== undefined ? ` (${progress}%)` : ""} (attempt ${attempts}/${maxAttempts})`
      );

      if (status === "ready" || status === "published" || status === "complete") {
        return "ready";
      }

      if (status === "error" || status === "failed") {
        return `FB Reel processing failed: ${JSON.stringify(statusData)}`;
      }

      if (statusData.error) {
        return `${statusData.error.code}: ${statusData.error.message}`;
      }
    } catch (statusErr) {
      console.warn("[Meta] FB Reel status poll failed:", statusErr);
    }
  }

  return "processing";
}

/**
 * Poll a regular Facebook video's processing status.
 * Returns "ready" if published, "processing" if still in progress, or an error string.
 */
async function pollFacebookVideoStatus(
  videoId: string,
  pageToken: string,
  maxAttempts: number = 10
): Promise<"ready" | "processing" | string> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    attempts++;

    try {
      const statusResponse = await fetch(
        `${META_GRAPH_API}/${videoId}?fields=status,processing_progress&access_token=${pageToken}`
      );
      const statusData = await statusResponse.json();

      const status = statusData.status;
      const progress = statusData.processing_progress;

      console.log(
        `[Meta] FB video processing status: ${status}${progress !== undefined ? ` (${progress}%)` : ""} (attempt ${attempts}/${maxAttempts})`
      );

      if (status === "ready" || status === "published" || status === "complete" || status === "video_ready") {
        return "ready";
      }

      if (status === "error" || status === "failed") {
        return `FB video processing failed: ${JSON.stringify(statusData)}`;
      }

      if (statusData.error) {
        return `${statusData.error.code}: ${statusData.error.message}`;
      }
    } catch (statusErr) {
      console.warn("[Meta] FB video status poll failed:", statusErr);
    }
  }

  return "processing";
}

// ===========================================
// VIDEO URL HELPERS
// ===========================================

/**
 * Ensure a video URL is publicly accessible.
 * For Dropbox URLs, we cannot use the image proxy (Netlify has ~6MB response limit),
 * so these need to be resolved server-side via resolveDropboxVideoUrl() before
 * calling the Meta API.
 *
 * For other hosts (direct CDN URLs, etc.), the URL is returned as-is.
 */
export function ensurePublicVideoUrl(videoUrl: string): string {
  // For Dropbox URLs, we need server-side resolution to a temporary link
  // This will be handled by the API route that calls this function
  // For now, just return the URL as-is if it's not a Dropbox URL
  const needsProxyHosts = [
    "dl.dropboxusercontent.com",
    "dropboxusercontent.com",
    "www.dropbox.com",
    "dropbox.com",
  ];

  const needsResolution = needsProxyHosts.some(host => videoUrl.includes(host));

  if (needsResolution) {
    // Return as-is — the API route will resolve this to a temporary link
    // before calling this function
    return videoUrl;
  }

  return videoUrl;
}

/**
 * Resolve a Dropbox shared link to a temporary direct download URL.
 * Temporary links are valid for 4 hours and include proper CORS headers.
 * Meta API servers can download directly from these URLs.
 */
export async function resolveDropboxVideoUrl(videoUrl: string): Promise<string> {
  if (!videoUrl.includes("dropbox")) return videoUrl;

  try {
    const { dropboxClient } = await import("@/lib/clients/dropbox");
    const token = await dropboxClient.getAccessToken();

    // Convert to shared link format for metadata lookup
    let sharedLink = videoUrl;
    if (sharedLink.includes("raw=1")) {
      sharedLink = sharedLink.replace("?raw=1", "?dl=0").replace("&raw=1", "&dl=0");
    }
    if (!sharedLink.includes("?")) {
      sharedLink += "?dl=0";
    }

    // Get shared link metadata to find the file path
    const metaResponse = await fetch(
      "https://api.dropboxapi.com/2/sharing/get_shared_link_metadata",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: sharedLink }),
      }
    );

    if (!metaResponse.ok) {
      console.warn("[Meta] Could not get Dropbox metadata for video URL");
      return videoUrl; // Return original as fallback
    }

    const metaData = await metaResponse.json();
    const filePath = metaData.path_lower || metaData.path_display;

    if (!filePath) {
      console.warn("[Meta] Could not determine Dropbox file path");
      return videoUrl;
    }

    // Get a temporary direct link (valid 4 hours, has CORS headers)
    const tempLinkResponse = await fetch(
      "https://api.dropboxapi.com/2/files/get_temporary_link",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: filePath }),
      }
    );

    if (!tempLinkResponse.ok) {
      console.warn("[Meta] Could not get Dropbox temporary link");
      return videoUrl;
    }

    const tempLinkData = await tempLinkResponse.json();
    if (tempLinkData.link) {
      console.log("[Meta] Resolved Dropbox video to temporary link:", filePath);
      return tempLinkData.link;
    }

    return videoUrl;
  } catch (err) {
    console.warn("[Meta] Dropbox video URL resolution failed:", err);
    return videoUrl;
  }
}

// ===========================================
// DELETE POSTS (for cleanup)
// ===========================================

/**
 * Delete a Facebook Page post.
 */
export async function deleteFacebookPost(postId: string): Promise<boolean> {
  try {
    const pageToken = await getPageAccessToken();
    const response = await fetch(
      `${META_GRAPH_API}/${postId}?access_token=${pageToken}`,
      { method: "DELETE" }
    );
    const data = await response.json();
    return data.success === true;
  } catch {
    return false;
  }
}

/**
 * Delete an Instagram media post.
 */
export async function deleteInstagramPost(mediaId: string): Promise<boolean> {
  try {
    const token = await getSystemUserToken();
    const response = await fetch(
      `${META_GRAPH_API}/${mediaId}?access_token=${token}`,
      { method: "DELETE" }
    );
    const data = await response.json();
    return data.success === true;
  } catch {
    return false;
  }
}

// ===========================================
// POST METRICS (for updating engagement data)
// ===========================================

export interface PostMetrics {
  likes: number;
  comments: number;
  shares?: number;
  reach?: number;
  impressions?: number;
}

export async function getFacebookPostMetrics(postId: string): Promise<PostMetrics | null> {
  try {
    const pageToken = await getPageAccessToken();
    const response = await fetch(
      `${META_GRAPH_API}/${postId}?fields=likes.limit(0).summary(true),comments.limit(0).summary(true),shares&access_token=${pageToken}`
    );
    const data = await response.json();

    if (data.error) {
      console.error("[Meta] FB metrics error:", data.error);
      return null;
    }

    return {
      likes: data.likes?.summary?.total_count || 0,
      comments: data.comments?.summary?.total_count || 0,
      shares: data.shares?.count || 0,
    };
  } catch (error) {
    console.error("[Meta] FB metrics fetch error:", error);
    return null;
  }
}

export async function getInstagramPostMetrics(mediaId: string): Promise<PostMetrics | null> {
  try {
    const token = await getSystemUserToken();
    const response = await fetch(
      `${META_GRAPH_API}/${mediaId}?fields=like_count,comments_count&access_token=${token}`
    );
    const data = await response.json();

    if (data.error) {
      console.error("[Meta] IG metrics error:", data.error);
      return null;
    }

    return {
      likes: data.like_count || 0,
      comments: data.comments_count || 0,
    };
  } catch (error) {
    console.error("[Meta] IG metrics fetch error:", error);
    return null;
  }
}

// ===========================================
// COMPREHENSIVE POST FUNCTION
// ===========================================

export interface PostQueueItemResult {
  queueId: string;
  facebook: FacebookPostResult;
  instagram: InstagramPostResult;
  tiktok: TikTokPostResult;
}

// Type helper — the queue item as returned from DB
export interface SocialPostQueueWithId {
  id: string;
  contentType: string;
  sourceId: string;
  artistId: string | null;
  releaseId: string | null;
  imageUrl: string;
  caption: string | null;
  linkUrl: string | null;
  queueOrder: number;
  cycleNumber: number;
  status: string;
  platforms: string;
  postedPlatforms: string | null;
  errorMessage: string | null;
}

/**
 * Process a single queue item: post to FB, IG, and/or TikTok, log results, update queue status.
 */
export async function processQueueItem(item: SocialPostQueueWithId): Promise<PostQueueItemResult> {
  const platforms: string[] = JSON.parse(item.platforms || "[]");
  const postedPlatforms: string[] = JSON.parse(item.postedPlatforms || "[]");

  let fbResult: FacebookPostResult = { success: false, postId: null, postUrl: null };
  let igResult: InstagramPostResult = { success: false, mediaId: null, permalink: null };
  let tkResult: TikTokPostResult = { success: false, videoId: null, postUrl: null };

  // Post to Facebook
  if (platforms.includes("facebook") && !postedPlatforms.includes("facebook")) {
    console.log(`[Social] Posting to Facebook: ${item.contentType} (${item.sourceId})`);
    fbResult = await postToFacebook(item.imageUrl, item.caption || "", item.linkUrl || undefined);

    // Log the result
    try {
      await db.insert(socialPostsLog).values({
        id: crypto.randomUUID(),
        queueId: item.id,
        platform: "facebook",
        contentType: item.contentType as any,
        sourceId: item.sourceId,
        imageUrl: item.imageUrl,
        caption: item.caption,
        linkUrl: item.linkUrl,
        platformPostId: fbResult.postId,
        platformPostUrl: fbResult.postUrl,
        metaApiResponse: null,
        status: fbResult.success ? "success" : "failed",
        errorMessage: fbResult.error || null,
        postedAt: new Date(),
      });
    } catch (logError) {
      console.error("[Social] Failed to log FB result:", logError);
    }

    if (fbResult.success) {
      postedPlatforms.push("facebook");
    }
  }

  // Post to Instagram
  if (platforms.includes("instagram") && !postedPlatforms.includes("instagram")) {
    console.log(`[Social] Posting to Instagram: ${item.contentType} (${item.sourceId})`);
    igResult = await postToInstagram(item.imageUrl, item.caption || "");

    // Log the result
    try {
      await db.insert(socialPostsLog).values({
        id: crypto.randomUUID(),
        queueId: item.id,
        platform: "instagram",
        contentType: item.contentType as any,
        sourceId: item.sourceId,
        imageUrl: item.imageUrl,
        caption: item.caption,
        linkUrl: item.linkUrl,
        platformPostId: igResult.mediaId,
        platformPostUrl: igResult.permalink,
        metaApiResponse: null,
        status: igResult.success ? "success" : "failed",
        errorMessage: igResult.error || null,
        postedAt: new Date(),
      });
    } catch (logError) {
      console.error("[Social] Failed to log IG result:", logError);
    }

    if (igResult.success) {
      postedPlatforms.push("instagram");
    }
  }

  // Post to TikTok
  if (platforms.includes("tiktok") && !postedPlatforms.includes("tiktok")) {
    if (isTikTokConfigured()) {
      console.log(`[Social] Posting to TikTok: ${item.contentType} (${item.sourceId})`);
      tkResult = await postToTikTok(item.imageUrl, item.caption || "", item.linkUrl || undefined);

      // Log the result
      try {
        await db.insert(socialPostsLog).values({
          id: crypto.randomUUID(),
          queueId: item.id,
          platform: "tiktok",
          contentType: item.contentType as any,
          sourceId: item.sourceId,
          imageUrl: item.imageUrl,
          caption: item.caption,
          linkUrl: item.linkUrl,
          platformPostId: tkResult.videoId,
          platformPostUrl: tkResult.postUrl,
          metaApiResponse: null,
          status: tkResult.success ? "success" : "failed",
          errorMessage: tkResult.error || null,
          postedAt: new Date(),
        });
      } catch (logError) {
        console.error("[Social] Failed to log TikTok result:", logError);
      }

      if (tkResult.success) {
        postedPlatforms.push("tiktok");
      }
    } else {
      console.log("[Social] TikTok not configured — skipping TikTok post");
    }
  }

  // Update queue item status
  const allTargetPlatformsPosted = platforms
    .filter(p => p === "tiktok" ? isTikTokConfigured() : true) // Skip TikTok if not configured
    .every((p) => postedPlatforms.includes(p));
  const anyPlatformSucceeded = postedPlatforms.length > 0;
  const anyFailed =
    (!fbResult.success && platforms.includes("facebook") && !postedPlatforms.includes("facebook")) ||
    (!igResult.success && platforms.includes("instagram") && !postedPlatforms.includes("instagram")) ||
    (isTikTokConfigured() && !tkResult.success && platforms.includes("tiktok") && !postedPlatforms.includes("tiktok"));

  let newStatus: "posted" | "failed" | "pending" = "pending";
  if (allTargetPlatformsPosted) {
    newStatus = "posted";
  } else if (anyFailed && !anyPlatformSucceeded) {
    newStatus = "failed";
  }
  // If some platforms succeeded but not all, keep as "pending" so the cron retries the failed ones

  const updateData: Record<string, any> = {
    status: newStatus,
    postedPlatforms: JSON.stringify(postedPlatforms),
    updatedAt: new Date(),
  };

  if (allTargetPlatformsPosted) {
    updateData.postedAt = new Date();
  }

  if (anyFailed) {
    const errors: string[] = [];
    if (!fbResult.success && platforms.includes("facebook")) errors.push(`FB: ${fbResult.error || "ok"}`);
    if (!igResult.success && platforms.includes("instagram")) errors.push(`IG: ${igResult.error || "ok"}`);
    if (isTikTokConfigured() && !tkResult.success && platforms.includes("tiktok")) errors.push(`TK: ${tkResult.error || "ok"}`);
    updateData.errorMessage = errors.join(" | ");
  } else {
    updateData.errorMessage = null;
  }

  try {
    await db
      .update(socialPostQueue)
      .set(updateData)
      .where(eq(socialPostQueue.id, item.id));
  } catch (updateError) {
    console.error("[Social] Failed to update queue item:", updateError);
  }

  return { queueId: item.id, facebook: fbResult, instagram: igResult, tiktok: tkResult };
}

// ===========================================
// CAPTION TEMPLATES
// ===========================================

export interface CaptionContext {
  contentType: "gallery_photo" | "spotify_track" | "artist_profile" | "curated_track" | "vertical_video";
  artistName?: string;
  artistRole?: string;
  releaseTitle?: string;
  releaseType?: string;
  photoTitle?: string;
  photoLocation?: string;
  photographer?: string;
  linkUrl?: string;
  spotifyUrl?: string;
  trackName?: string;
  albumName?: string;
  videoTitle?: string;
  videoPlatform?: string;
}

/**
 * Generate a caption for a social media post based on content type and context.
 * All captions are in Spanish, matching the SLC brand voice.
 */
export function generateCaption(ctx: CaptionContext): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sonidoliquido.com";
  const hashtags = "#SonidoLiquido #HipHopMexico #HipHop #CDMX #RapMexicano";

  switch (ctx.contentType) {
    case "gallery_photo": {
      const photoCredit = ctx.photographer ? `\nFoto: ${ctx.photographer}` : "";
      const location = ctx.photoLocation ? ` ${ctx.photoLocation}` : "";

      if (ctx.artistName) {
        return [
          `${ctx.artistName} en accion${location}${photoCredit}`,
          "",
          `Descubre mas de ${ctx.artistName} en ${ctx.linkUrl || `${siteUrl}/artistas`}`,
          "",
          hashtags,
        ].join("\n");
      }

      return [
        `Sonido Liquido Crew${location}${photoCredit}`,
        "",
        `Mas en ${siteUrl}`,
        "",
        hashtags,
      ].join("\n");
    }

    case "spotify_track": {
      const typeLabel = ctx.releaseType === "album" ? "el album" : ctx.releaseType === "ep" ? "el EP" : ctx.releaseType === "mixtape" ? "la mixtape" : "el sencillo";
      const artistLine = ctx.artistName || "Sonido Liquido Crew";

      return [
        `Nueva musica de ${artistLine}`,
        `${ctx.releaseTitle || "Nuevo lanzamiento"} — ${typeLabel} ya disponible`,
        "",
        `Escucha en Spotify: ${ctx.spotifyUrl || ctx.linkUrl || `${siteUrl}/discografia`}`,
        "",
        hashtags,
      ].join("\n");
    }

    case "artist_profile": {
      const roleLabels: Record<string, string> = {
        mc: "MC",
        dj: "DJ",
        producer: "Productor",
        cantante: "Cantante",
        divo: "Divo",
        lado_b: "Lado B",
      };
      const roleLabel = ctx.artistRole ? roleLabels[ctx.artistRole] || ctx.artistRole : "Artista";

      return [
        `${ctx.artistName} — ${roleLabel} de Sonido Liquido Crew`,
        "",
        "25 anos de hip hop mexicano, y seguimos rompiendo",
        "",
        `Conoce mas: ${ctx.linkUrl || `${siteUrl}/artistas`}`,
        "",
        hashtags,
      ].join("\n");
    }

    case "curated_track": {
      const artistLine = ctx.artistName || "Sonido Liquido Crew";
      const trackLine = ctx.trackName ? `"${ctx.trackName}"` : "";
      const albumLine = ctx.albumName ? `del album "${ctx.albumName}"` : "";

      return [
        `${artistLine} — ${trackLine} ${albumLine}`.trim(),
        "",
        "Descubre mas musica del roster en nuestra playlist curada",
        "",
        `Escucha: ${ctx.spotifyUrl || ctx.linkUrl || `${siteUrl}/discografia`}`,
        "",
        hashtags,
      ].join("\n");
    }

    case "vertical_video": {
      const artistLine = ctx.artistName || "Sonido Liquido Crew";
      const titleLine = ctx.videoTitle ? `${ctx.videoTitle}` : "Video exclusivo";
      const platformLabel = ctx.videoPlatform === "tiktok" ? "TikTok"
        : ctx.videoPlatform === "youtube" ? "YouTube"
        : ctx.videoPlatform === "instagram" ? "Instagram"
        : "";

      return [
        `${artistLine} — ${titleLine}`,
        "",
        platformLabel ? `Mira el video completo en ${platformLabel}` : "Mira el video completo",
        "",
        `Mas contenido: ${ctx.linkUrl || `${siteUrl}/reels`}`,
        "",
        hashtags,
        "#Reels #Shorts #VideoMusical",
      ].join("\n");
    }

    default:
      return `Sonido Liquido Crew — Hip Hop Mexico desde 1999\n\n${siteUrl}\n\n${hashtags}`;
  }
}

// ===========================================
// QUEUE HELPERS
// ===========================================

/**
 * Get the next pending item from the queue.
 * Uses the no-repeat logic: picks the oldest pending item by queue_order.
 */
export async function getNextPendingItem(): Promise<SocialPostQueueWithId | null> {
  if (!isDatabaseConfiguredLocal()) {
    console.warn("[Social] Database not configured");
    return null;
  }

  try {
    const items = await db
      .select()
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "pending"))
      .orderBy(socialPostQueue.queueOrder, socialPostQueue.cycleNumber)
      .limit(1);

    if (items.length === 0) {
      // Check if all items are posted — if so, reset for a new cycle
      await resetCycleIfNeeded();
      return null;
    }

    return items[0] as unknown as SocialPostQueueWithId;
  } catch (error) {
    console.error("[Social] Error fetching next pending item:", error);
    return null;
  }
}

/**
 * If all items in the current cycle are posted, increment cycle and reset to pending.
 */
async function resetCycleIfNeeded(): Promise<void> {
  try {
    // Get current max cycle number using raw SQL
    const result = await db
      .select({
        maxCycle: drizzleSql`MAX(CAST(${socialPostQueue.cycleNumber} AS INTEGER))`,
      })
      .from(socialPostQueue);

    const currentCycle = Number(result[0]?.maxCycle) || 1;

    // Check if all items in the current cycle are posted
    const pendingCount = await db
      .select({ count: drizzleSql`COUNT(*)` })
      .from(socialPostQueue)
      .where(
        and(
          drizzleSql`CAST(${socialPostQueue.cycleNumber} AS INTEGER) = ${currentCycle}`,
          eq(socialPostQueue.status, "pending")
        )
      );

    if (Number(pendingCount[0]?.count) === 0) {
      // All posted! Start a new cycle
      const nextCycle = currentCycle + 1;
      console.log(`[Social] All items posted in cycle ${currentCycle}. Starting cycle ${nextCycle}.`);

      // Reset all items to pending for the new cycle
      await db
        .update(socialPostQueue)
        .set({
          cycleNumber: nextCycle,
          status: "pending",
          postedPlatforms: "[]",
          errorMessage: null,
          postedAt: null,
          updatedAt: new Date(),
        });
    }
  } catch (error) {
    console.error("[Social] Error resetting cycle:", error);
  }
}

/**
 * Simple check if DB is available (avoids import cycle with client.ts)
 */
function isDatabaseConfiguredLocal(): boolean {
  const url = (process.env.DATABASE_URL ||
    process.env.TURSO_DATABASE_URL ||
    process.env.LIBSQL_URL || "").trim();
  const token = (process.env.DATABASE_AUTH_TOKEN ||
    process.env.TURSO_AUTH_TOKEN || "").trim();
  const isLocal = url.startsWith("file:");
  return isLocal ? !!url : !!(url && token);
}

// ===========================================
// IMAGE URL HELPERS
// ===========================================

/**
 * Ensure an image URL is publicly accessible.
 * For Dropbox URLs and other problematic hosts, route through the image proxy.
 * For Spotify CDN and other public URLs, use as-is.
 *
 * Meta API (especially Instagram) requires the image URL to be publicly
 * accessible and return the correct content-type. Some hosts (like Dropbox)
 * return incorrect content-type headers, which causes IG container creation to fail.
 */
export function ensurePublicImageUrl(imageUrl: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "https://sonidoliquido.com";

  // Hosts that need proxying for Meta API (incorrect content-type or auth requirements)
  const needsProxyHosts = [
    "dl.dropboxusercontent.com",
    "dropboxusercontent.com",
    "www.dropbox.com",
    "dropbox.com",
    "ucarecdn.com",
  ];

  const needsProxy = needsProxyHosts.some(
    (host) => imageUrl.includes(host)
  );

  if (needsProxy) {
    return `${siteUrl}/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }

  // Spotify CDN URLs are publicly accessible — use as-is
  // Unsplash, YouTube, etc. are also public
  return imageUrl;
}

// Re-export for convenience
export { getInstagramBusinessAccountId, getPageAccessToken };
