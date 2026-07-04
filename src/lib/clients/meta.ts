// ===========================================
// META GRAPH API CLIENT
// ===========================================
// Handles posting to Facebook Page and Instagram Business Account
// via the Meta Graph API using a System User token.
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
import { eq, and, desc, sql as drizzleSql } from "drizzle-orm";

// ===========================================
// CONFIGURATION
// ===========================================

const META_GRAPH_API = "https://graph.facebook.com/v22.0";

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
// STORY LINK EXTRACTION
// ===========================================

/**
 * Extract the best URL from a caption to use as a Story link sticker.
 *
 * Priority:
 * 1. Spotify URLs (open.spotify.com) — preferred for music content
 * 2. YouTube URLs (youtube.com, youtu.be) — for video content
 * 3. Any other URL found in the caption (e.g., feature.fm, linkfire)
 * 4. Fall back to the provided linkUrl
 *
 * This ensures that Story link stickers point to the same external links
 * that appear in the feed post captions (Spotify, YouTube, etc.) rather
 * than the internal website URLs stored in linkUrl.
 */
export function extractStoryLinkUrl(
  caption: string | null | undefined,
  fallbackLinkUrl?: string | null
): string | undefined {
  if (!caption) return fallbackLinkUrl || undefined;

  // Priority 1: Spotify URLs
  const spotifyMatch = caption.match(/https?:\/\/open\.spotify\.com\/[^\s)]+/);
  if (spotifyMatch) return spotifyMatch[0];

  // Priority 2: YouTube URLs
  const ytMatch = caption.match(/https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?[^\s)]+|youtu\.be\/[^\s)]+)/);
  if (ytMatch) return ytMatch[0];

  // Priority 3: Any other URL (feature.fm, linkfire, sonidoliquido.com, etc.)
  const anyUrlMatch = caption.match(/https?:\/\/[^\s)<>"]+/);
  if (anyUrlMatch) return anyUrlMatch[0];

  // Priority 4: Fallback
  return fallbackLinkUrl || undefined;
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
    return { success: false, postId: null, postUrl: null, error: "Meta API not configured — set META_SYSTEM_USER_TOKEN and FACEBOOK_PAGE_ID" };
  }

  const pageToken = await getPageAccessToken();
  const pageId = await getFacebookPageId();

  if (!pageToken) {
    return { success: false, postId: null, postUrl: null, error: "Could not obtain a Page access token — check META_SYSTEM_USER_TOKEN and FACEBOOK_PAGE_ID" };
  }

  if (!pageId) {
    return { success: false, postId: null, postUrl: null, error: "FACEBOOK_PAGE_ID is not set" };
  }

  try {
    // Strategy 1: Photo post via /photos endpoint (most reliable)
    // This uploads an image with the caption as a Page photo post.
    // Works with pages_manage_posts permission + Page access token.
    const fullCaption = linkUrl ? `${caption}\n\n${linkUrl}` : caption;

    console.log("[Meta] Posting to FB Page photos with image:", imageUrl?.substring(0, 80));

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
      console.error("[Meta] FB photo post error:", JSON.stringify(photoData.error));
      const fbErrorMsg = photoData.error.message || photoData.error.type || `Error code ${photoData.error.code || "unknown"}`;

      // If photo post fails, try feed post with link as fallback
      if (linkUrl) {
        console.warn("[Meta] FB photo post failed, trying feed link post as fallback...");
        const feedResponse = await fetch(`${META_GRAPH_API}/${pageId}/feed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: fullCaption,
            link: linkUrl,
            access_token: pageToken,
          }),
        });

        const feedData = await feedResponse.json();

        if (feedData.error) {
          console.error("[Meta] FB feed post also failed:", JSON.stringify(feedData.error));
          const feedErrorMsg = feedData.error.message || feedData.error.type || `Error code ${feedData.error.code || "unknown"}`;
          return {
            success: false,
            postId: null,
            postUrl: null,
            error: `Photo post: ${fbErrorMsg} | Feed post: ${feedErrorMsg}`,
          };
        }

        const postId = feedData.id || null;
        const postUrl = postId ? `https://facebook.com/${postId}` : null;
        console.log("[Meta] Facebook feed link post successful (fallback):", postId);
        return { success: true, postId, postUrl };
      }

      return {
        success: false,
        postId: null,
        postUrl: null,
        error: fbErrorMsg,
      };
    }

    const postId = photoData.post_id || photoData.id || null;
    const postUrl = postId ? `https://facebook.com/${postId}` : null;

    console.log("[Meta] Facebook photo post successful:", postId);
    return { success: true, postId, postUrl };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
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
    return { success: false, mediaId: null, permalink: null, error: "Meta API not configured — set META_SYSTEM_USER_TOKEN and FACEBOOK_PAGE_ID" };
  }

  const igAccountId = await getInstagramBusinessAccountId();
  if (!igAccountId) {
    return {
      success: false,
      mediaId: null,
      permalink: null,
      error: "Instagram Business Account not found — make sure your FB Page is connected to an IG Business Account in Meta Business Settings",
    };
  }

  if (!imageUrl) {
    return {
      success: false,
      mediaId: null,
      permalink: null,
      error: "No image URL provided — Instagram requires a publicly accessible image URL",
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
      console.error("[Meta] IG container creation error:", JSON.stringify(containerData.error));
      const igErrorMsg = containerData.error.message || containerData.error.type || `Error code ${containerData.error.code || "unknown"}`;
      // Common IG errors guidance
      let guidance = "";
      if (igErrorMsg.includes("could not download") || igErrorMsg.includes("could not retrieve")) {
        guidance = " — The image URL is not publicly accessible. Make sure it's a direct URL (not Dropbox/Google Drive). Spotify CDN URLs work.";
      } else if (igErrorMsg.includes("OAuth") || igErrorMsg.includes("permission")) {
        guidance = " — Check that your System User Token has instagram_basic and instagram_content_publish permissions.";
      }
      return {
        success: false,
        mediaId: null,
        permalink: null,
        error: `${igErrorMsg}${guidance}`,
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
        error: publishData.error.message || publishData.error.type || `IG Publish Error ${publishData.error.code || 'unknown'}`,
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
// INSTAGRAM STORIES POSTING
// ===========================================

/**
 * Post a photo to Instagram as a Story (not feed post, not Reel).
 *
 * IG Stories use the same container + poll + publish pattern as feed posts,
 * but with media_type: "STORIES" in the container creation.
 * Stories appear at the top of followers' feeds and disappear after 24 hours.
 *
 * Key differences from feed posts:
 * - Uses media_type: "STORIES" in the container
 * - No permalink (Stories don't have public URLs)
 * - Recommended image aspect ratio: 9:16 (1080x1920) for full-screen stories
 * - Stories support images only (not videos — for video stories use Reels with STORIES placement)
 *
 * IMPORTANT: image_url must point to a publicly accessible image.
 * The caption is included but may not be visible on the Story itself —
 * it's stored as metadata and can include a link sticker if linkUrl is provided.
 */
export async function postToInstagramStory(
  imageUrl: string,
  caption: string,
  linkUrl?: string,
  options?: { composeForStory?: boolean }
): Promise<InstagramPostResult> {
  if (!(await isMetaConfiguredAsync())) {
    return { success: false, mediaId: null, permalink: null, error: "Meta API not configured — set META_SYSTEM_USER_TOKEN and FACEBOOK_PAGE_ID" };
  }

  const igAccountId = await getInstagramBusinessAccountId();
  if (!igAccountId) {
    return {
      success: false,
      mediaId: null,
      permalink: null,
      error: "Instagram Business Account not found — make sure your FB Page is connected to an IG Business Account in Meta Business Settings",
    };
  }

  // If composeForStory is requested, route the image through the Story composer
  // endpoint which pads the image to a 1080×1920 frame with black bars.
  // This prevents Instagram from auto-cropping the image (which was causing
  // images to appear oversized/cut off in Stories).
  let finalImageUrl = imageUrl;
  if (options?.composeForStory && imageUrl) {
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "https://sonidoliquido.com";
      const composerUrl = `${siteUrl}/api/social/story-image?url=${encodeURIComponent(imageUrl)}`;
      // Quick HEAD request to verify the composer can fetch + process the image.
      // If it fails, fall back to the raw image URL (IG will crop it — better
      // than failing the entire Story post).
      const probe = await fetch(composerUrl, { method: "GET", signal: AbortSignal.timeout(20_000) });
      if (probe.ok) {
        finalImageUrl = composerUrl;
        console.log("[Meta] Story image composer: using composed 1080×1920 image");
      } else {
        console.warn(`[Meta] Story image composer returned HTTP ${probe.status}, falling back to raw image URL`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.warn(`[Meta] Story image composer failed (${msg}), falling back to raw image URL`);
    }
  }

  if (!imageUrl) {
    return {
      success: false,
      mediaId: null,
      permalink: null,
      error: "No image URL provided — Instagram Stories requires a publicly accessible image URL",
    };
  }

  // Use system user token for IG operations
  const token = await getSystemUserToken();

  try {
    // Step 1: Create Story container
    console.log("[Meta] Creating IG Story container with image:", imageUrl.substring(0, 80));

    const containerBody: Record<string, string | boolean> = {
      media_type: "STORIES",
      image_url: finalImageUrl,
      access_token: token,
    };

    // Add caption if provided (visible as text overlay on some story formats)
    if (caption) {
      containerBody.caption = caption;
    }

    // If a link URL is provided, attach it as a link sticker
    // This requires instagram_content_publish + instagram_manage_comments permissions
    if (linkUrl) {
      // Link stickers on Stories via API: attach the URL to the story
      // The IG Graph API supports link stickers via the "link" parameter on story containers
      containerBody.link = linkUrl;
    }

    const containerResponse = await fetch(`${META_GRAPH_API}/${igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody),
    });

    const containerData = await containerResponse.json();

    if (containerData.error) {
      console.error("[Meta] IG Story container creation error:", JSON.stringify(containerData.error));
      const igErrorMsg = containerData.error.message || containerData.error.type || `Error code ${containerData.error.code || "unknown"}`;
      let guidance = "";
      if (igErrorMsg.includes("could not download") || igErrorMsg.includes("could not retrieve")) {
        guidance = " — The image URL is not publicly accessible. Make sure it's a direct URL (not Dropbox/Google Drive).";
      } else if (igErrorMsg.includes("OAuth") || igErrorMsg.includes("permission")) {
        guidance = " — Check that your System User Token has instagram_basic and instagram_content_publish permissions.";
      } else if (igErrorMsg.includes("link")) {
        guidance = " — IG Story link stickers require instagram_content_publish permission and a verified account.";
      }
      return {
        success: false,
        mediaId: null,
        permalink: null,
        error: `${igErrorMsg}${guidance}`,
      };
    }

    const containerId = containerData.id;
    console.log("[Meta] IG Story container created:", containerId);

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
        console.error("[Meta] IG Story container processing error:", statusData);
        return {
          success: false,
          mediaId: null,
          permalink: null,
          error: `Story container processing failed after ${attempts} polls`,
        };
      }
    }

    if (statusCode !== "FINISHED") {
      return {
        success: false,
        mediaId: null,
        permalink: null,
        error: `Story container still processing after ${maxAttempts * 2}s timeout`,
      };
    }

    // Step 3: Publish the Story container
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
      console.error("[Meta] IG Story publish error:", publishData.error);
      return {
        success: false,
        mediaId: null,
        permalink: null,
        error: publishData.error.message || publishData.error.type || `IG Story Publish Error ${publishData.error.code || 'unknown'}`,
      };
    }

    const mediaId = publishData.id;

    // Note: Stories don't have public permalinks like feed posts
    console.log("[Meta] Instagram Story published successfully:", mediaId);
    return { success: true, mediaId, permalink: null };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Meta] Instagram Story post exception:", errMsg);
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
        error: containerData.error.message || containerData.error.type || `IG Error ${containerData.error.code || 'unknown'}`,
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
        error: publishData.error.message || publishData.error.type || `IG Publish Error ${publishData.error.code || 'unknown'}`,
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
        error: `FB Reel failed and video fallback also failed: ${videoData.error.message || videoData.error.type || 'Error ' + (videoData.error.code || 'unknown')}`,
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
        return statusData.error.message || statusData.error.type || `Error ${statusData.error.code || 'unknown'}`;
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
        return statusData.error.message || statusData.error.type || `Error ${statusData.error.code || 'unknown'}`;
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
  instagramStory?: InstagramPostResult;
}

export interface ProcessQueueItemOptions {
  /**
   * If true, also post the queue item to Instagram as a Story (in addition to
   * the regular FB feed + IG feed posts). Used by the autopost cron so that
   * each scheduled run produces a "throwback Story" alongside the event Story.
   * Vertical videos are excluded — they post as Reels, not Stories.
   */
  alsoPostStory?: boolean;
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
 * Check if AI captions are enabled in site settings.
 * Defaults to true (enabled) if no setting exists.
 */
async function isAICaptionEnabled(): Promise<boolean> {
  try {
    const { db } = await import("@/db/client");
    const { siteSettings } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    const rows = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, "social_ai_captions"))
      .limit(1);

    if (rows.length === 0) return true; // Default: enabled
    return rows[0].value !== "false" && rows[0].value !== "0";
  } catch {
    return true; // Default: enabled
  }
}

/**
 * Regenerate a caption for a queue item at post time.
 * This ensures:
 * 1. The 90-day "Nueva música" vs "Música" logic is evaluated at post time (not populate time)
 * 2. Different variation index per cycle, so repeated cycles get different captions
 * 3. The caption matches the current state of the release (new vs catalog)
 * 4. AI captions are used when enabled (site setting "social_ai_captions")
 */
async function regenerateCaptionForItem(item: SocialPostQueueWithId): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sonidoliquido.com";

  // Use cycleNumber as variation seed — different cycle = different caption style
  const variationIndex = item.cycleNumber || 0;

  // For spotify_track items, fetch the release date to apply 90-day logic
  let releaseDate: Date | null = null;
  if (item.contentType === "spotify_track" && item.releaseId) {
    try {
      const { releases } = await import("@/db/schema");
      const releaseRows = await db
        .select({ releaseDate: releases.releaseDate })
        .from(releases)
        .where(eq(releases.id, item.releaseId))
        .limit(1);
      if (releaseRows[0]?.releaseDate) {
        releaseDate = releaseRows[0].releaseDate;
      }
    } catch (err) {
      console.warn("[Social] Could not fetch release date for caption:", err);
    }
  }

  // Build a minimal caption context from the queue item data
  // The full context was available at populate time, but we reconstruct what we can
  const ctx: CaptionContext = {
    contentType: item.contentType as CaptionContext["contentType"],
    linkUrl: item.linkUrl || undefined,
    releaseDate,
  };

  // Try to extract artist name from the existing caption as a hint
  const existingCaption = item.caption || "";
  if (existingCaption.includes(" de ")) {
    const match = existingCaption.match(/de\s+([^\n,—]+)/);
    if (match) {
      ctx.artistName = match[1].trim();
    }
  }

  // For tracks, try to extract release title from existing caption
  if (item.contentType === "spotify_track") {
    const titleMatch = existingCaption.match(/^.{1,80}—\s*(.+?)(?:\s*—|\s*$)/m);
    if (titleMatch) {
      ctx.releaseTitle = titleMatch[1].trim();
    }
    // Extract Spotify URL from existing caption
    const urlMatch = existingCaption.match(/(https:\/\/open\.spotify\.com\/[^\s]+)/);
    if (urlMatch) {
      ctx.spotifyUrl = urlMatch[1];
    }
  }

  // For curated tracks, try to extract track name
  if (item.contentType === "curated_track") {
    const trackMatch = existingCaption.match(/"([^"]+)"/);
    if (trackMatch) {
      ctx.trackName = trackMatch[1];
    }
  }

  // For events, fetch full event details from DB for richer captions
  if (item.contentType === "event") {
    try {
      const { events } = await import("@/db/schema");
      const eventRows = await db
        .select()
        .from(events)
        .where(eq(events.id, item.sourceId))
        .limit(1);
      const event = eventRows[0];
      if (event) {
        ctx.eventTitle = event.title;
        ctx.eventVenue = event.venue;
        ctx.eventCity = event.city;
        ctx.eventDate = event.eventDate;
        ctx.eventTime = event.eventTime || undefined;
        ctx.ticketUrl = event.ticketUrl || undefined;
      }
    } catch (err) {
      console.warn("[Social] Could not fetch event details for caption:", err);
    }
  }

  // Try AI caption if enabled, fall back to template-based
  const useAI = await isAICaptionEnabled();
  if (useAI) {
    try {
      return await generateAICaption(ctx, variationIndex);
    } catch (err) {
      console.warn("[Social] AI caption failed, using template:", err);
    }
  }

  const caption = generateCaption(ctx, variationIndex);
  // Safety: ensure "años" is always spelled with ñ, never "anos"
  return caption.replace(/\banos\b/g, "años");
}

/**
 * Process a single queue item: post to FB and/or IG, log results, update queue status.
 * Regenerates the caption at post time with variation to avoid repetition.
 */
export async function processQueueItem(
  item: SocialPostQueueWithId,
  options?: ProcessQueueItemOptions
): Promise<PostQueueItemResult> {
  // Filter out removed platforms (e.g. "tiktok" was removed per user request)
  const SUPPORTED_PLATFORMS = ["facebook", "instagram"];
  let platforms: string[] = JSON.parse(item.platforms || "[]").filter((p: string) => SUPPORTED_PLATFORMS.includes(p));
  let postedPlatforms: string[] = JSON.parse(item.postedPlatforms || "[]").filter((p: string) => SUPPORTED_PLATFORMS.includes(p));

  // If the platforms list was modified (e.g. tiktok removed), update it in the DB
  const originalPlatforms: string[] = JSON.parse(item.platforms || "[]");
  if (JSON.stringify(platforms) !== JSON.stringify(originalPlatforms)) {
    console.log(`[Social] Filtering out unsupported platforms from item ${item.id}: ${originalPlatforms.join(",")} → ${platforms.join(",")}`);
    try {
      await db
        .update(socialPostQueue)
        .set({
          platforms: JSON.stringify(platforms),
          postedPlatforms: JSON.stringify(postedPlatforms),
          updatedAt: new Date(),
        } as any)
        .where(eq(socialPostQueue.id, item.id));
    } catch (err) {
      console.warn("[Social] Failed to update platforms list:", err);
    }
  }

  // Check if all target platforms have already been posted — mark as posted and skip
  const allTargetPlatformsPosted = platforms.length > 0 && platforms.every((p) => postedPlatforms.includes(p));
  if (allTargetPlatformsPosted) {
    console.log(`[Social] Item ${item.id} already posted to all target platforms (${platforms.join(",")}). Marking as posted.`);
    try {
      await db
        .update(socialPostQueue)
        .set({
          status: "posted",
          postedAt: new Date(),
          updatedAt: new Date(),
          errorMessage: null,
        } as any)
        .where(eq(socialPostQueue.id, item.id));
    } catch (err) {
      console.warn("[Social] Failed to mark item as posted:", err);
    }
    // Return a success result so the caller knows this item is done
    return {
      queueId: item.id,
      facebook: { success: true, postId: null, postUrl: null, error: "already posted" },
      instagram: { success: true, mediaId: null, permalink: null, error: "already posted" },
    };
  }

  // If no supported platforms remain after filtering, mark as skipped
  if (platforms.length === 0) {
    console.log(`[Social] Item ${item.id} has no supported platforms. Marking as skipped.`);
    try {
      await db
        .update(socialPostQueue)
        .set({
          status: "skipped",
          errorMessage: "No supported platforms (tiktok removed)",
          updatedAt: new Date(),
        } as any)
        .where(eq(socialPostQueue.id, item.id));
    } catch (err) {
      console.warn("[Social] Failed to mark item as skipped:", err);
    }
    return {
      queueId: item.id,
      facebook: { success: false, postId: null, postUrl: null, error: "no supported platforms" },
      instagram: { success: false, mediaId: null, permalink: null, error: "no supported platforms" },
    };
  }

  // Regenerate caption at post time with variation
  // This ensures: (1) 90-day "nueva" logic is current, (2) captions vary between posts
  let caption = item.caption || "";
  try {
    caption = await regenerateCaptionForItem(item);
  } catch (err) {
    console.warn("[Social] Caption regeneration failed, using original:", err);
  }

  // Default results with explicit error field so we never get "undefined" in messages
  let fbResult: FacebookPostResult = { success: false, postId: null, postUrl: null, error: "not attempted" };
  let igResult: InstagramPostResult = { success: false, mediaId: null, permalink: null, error: "not attempted" };
  let igStoryResult: InstagramPostResult | undefined = undefined;

  // Check if this is a vertical video — post as Reels on both FB and IG
  const isVerticalVideo = item.contentType === "vertical_video";
  let videoUrl = "";
  let websiteLink = "";

  if (isVerticalVideo) {
    // Parse the video URL from linkUrl (format: "VIDEO_URL|||WEBSITE_URL" or just a URL)
    if (item.linkUrl && item.linkUrl.includes("|||")) {
      const parts = item.linkUrl.split("|||");
      videoUrl = parts[0];
      websiteLink = parts[1];
    } else if (item.linkUrl) {
      // Fallback: if no separator, treat linkUrl as video URL if it looks like a video
      videoUrl = item.linkUrl;
      websiteLink = item.linkUrl;
    }

    // If no video URL found, we can't post a Reel — fall back to image post
    if (!videoUrl || videoUrl.startsWith("/")) {
      console.warn(`[Social] Vertical video item ${item.id} has no usable video URL. Falling back to image post.`);
    } else {
      console.log(`[Social] Posting vertical video as Reel: ${item.sourceId} (video: ${videoUrl.substring(0, 60)}...)`);

      // Post to Facebook as Reel
      if (platforms.includes("facebook") && !postedPlatforms.includes("facebook")) {
        console.log(`[Social] Posting to Facebook Reel: ${item.contentType} (${item.sourceId})`);
        try {
          const fbReelResult = await postFacebookReel(videoUrl, caption);

          // Map FacebookReelResult to FacebookPostResult
          fbResult = {
            success: fbReelResult.success,
            postId: fbReelResult.reelId,
            postUrl: fbReelResult.postUrl,
            error: fbReelResult.error || undefined,
          };

          // Log the result
          try {
            await db.insert(socialPostsLog).values({
              id: crypto.randomUUID(),
              queueId: item.id,
              platform: "facebook_reel",
              contentType: item.contentType as any,
              sourceId: item.sourceId,
              imageUrl: videoUrl,
              caption: item.caption,
              linkUrl: websiteLink || null,
              platformPostId: fbReelResult.reelId,
              platformPostUrl: fbReelResult.postUrl,
              metaApiResponse: null,
              status: fbReelResult.success ? "success" : "failed",
              errorMessage: fbReelResult.error || null,
              postedAt: new Date(),
            } as any);
          } catch (logError) {
            console.error("[Social] Failed to log FB Reel result:", logError);
          }

          if (fbReelResult.success) {
            postedPlatforms.push("facebook");
          }
        } catch (err) {
          console.error("[Social] FB Reel posting exception:", err);
          fbResult = { success: false, postId: null, postUrl: null, error: err instanceof Error ? err.message : "FB Reel failed" };
        }
      }

      // Post to Instagram as Reel
      if (platforms.includes("instagram") && !postedPlatforms.includes("instagram")) {
        console.log(`[Social] Posting to Instagram Reel: ${item.contentType} (${item.sourceId})`);
        try {
          igResult = await postInstagramReel(videoUrl, caption, true);

          // Log the result
          try {
            await db.insert(socialPostsLog).values({
              id: crypto.randomUUID(),
              queueId: item.id,
              platform: "instagram_reel",
              contentType: item.contentType as any,
              sourceId: item.sourceId,
              imageUrl: videoUrl,
              caption: item.caption,
              linkUrl: websiteLink || null,
              platformPostId: igResult.mediaId,
              platformPostUrl: igResult.permalink,
              metaApiResponse: null,
              status: igResult.success ? "success" : "failed",
              errorMessage: igResult.error || null,
              postedAt: new Date(),
            } as any);
          } catch (logError) {
            console.error("[Social] Failed to log IG Reel result:", logError);
          }

          if (igResult.success) {
            postedPlatforms.push("instagram");
          }
        } catch (err) {
          console.error("[Social] IG Reel posting exception:", err);
          igResult = { success: false, mediaId: null, permalink: null, error: err instanceof Error ? err.message : "IG Reel failed" };
        }
      }
    }
  }

  // Standard image posting (for non-video items, or vertical videos that fell back to image)
  if (!isVerticalVideo || (!videoUrl && item.linkUrl && item.linkUrl.startsWith("/"))) {
  if (platforms.includes("facebook") && !postedPlatforms.includes("facebook")) {
    console.log(`[Social] Posting to Facebook: ${item.contentType} (${item.sourceId})`);
    fbResult = await postToFacebook(item.imageUrl, caption, item.linkUrl || undefined);

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
      } as any);
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
    igResult = await postToInstagram(item.imageUrl, caption);

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
      } as any);
    } catch (logError) {
      console.error("[Social] Failed to log IG result:", logError);
    }

    if (igResult.success) {
      postedPlatforms.push("instagram");
    }
  }
  } // End of standard image posting block

  // ===========================================
  // OPTIONAL: ALSO POST TO INSTAGRAM STORY (throwback Story)
  // ===========================================
  // Triggered by the autopost cron (alsoPostStory: true) so that each
  // scheduled run produces an IG Story from queue content alongside the
  // event Story. Vertical videos are excluded because they already post
  // as Reels. The Story post is best-effort: a failure here does NOT
  // fail the overall queue item — the item is still considered posted
  // if FB + IG feed succeeded.
  //
  // EVENTS are excluded from this throwback Story path because they
  // were causing duplicate Story spam (the autopost-upcoming-event
  // handler was also posting events to Stories, and its dedup was
  // unreliable). Events now go to FB + IG feed only via the queue.
  // If you want events on Stories, post them manually via the admin UI.
  if (
    options?.alsoPostStory &&
    !isVerticalVideo &&
    item.imageUrl &&
    item.contentType !== "event"
  ) {
    console.log(`[Social] Also posting to Instagram Story: ${item.contentType} (${item.sourceId})`);
    try {
      // Extract the best link from the caption (Spotify > YouTube > any URL > fallback)
      // so the Story link sticker points to the same external link visible in the post.
      const storyLink = extractStoryLinkUrl(caption, item.linkUrl);
      igStoryResult = await postToInstagramStory(
        item.imageUrl,
        caption,
        storyLink,
        { composeForStory: true }
      );

      // Log the Story result separately so it shows up in admin history
      try {
        await db.insert(socialPostsLog).values({
          id: crypto.randomUUID(),
          queueId: item.id,
          platform: "instagram_story",
          contentType: item.contentType as any,
          sourceId: item.sourceId,
          imageUrl: item.imageUrl,
          caption: item.caption,
          linkUrl: item.linkUrl,
          platformPostId: igStoryResult.mediaId,
          platformPostUrl: igStoryResult.permalink,
          metaApiResponse: null,
          status: igStoryResult.success ? "success" : "failed",
          errorMessage: igStoryResult.error || null,
          postedAt: new Date(),
        } as any);
      } catch (logError) {
        console.error("[Social] Failed to log IG Story result:", logError);
      }

      if (!igStoryResult.success) {
        console.warn(`[Social] IG Story post failed (non-blocking): ${igStoryResult.error}`);
      }
    } catch (err) {
      console.error("[Social] IG Story posting exception (non-blocking):", err);
      igStoryResult = {
        success: false,
        mediaId: null,
        permalink: null,
        error: err instanceof Error ? err.message : "IG Story failed",
      };
    }
  }

  // Update queue item status
  const allPlatformsNowPosted = platforms
    .every((p) => postedPlatforms.includes(p));
  const anyPlatformSucceeded = postedPlatforms.length > 0;
  const anyFailed =
    (!fbResult.success && platforms.includes("facebook") && !postedPlatforms.includes("facebook")) ||
    (!igResult.success && platforms.includes("instagram") && !postedPlatforms.includes("instagram"));

  let newStatus: "posted" | "failed" | "pending" = "pending";
  if (allPlatformsNowPosted) {
    newStatus = "posted";
  } else if (anyFailed && !anyPlatformSucceeded) {
    newStatus = "failed";
  }
  // If some platforms succeeded but not all, keep as "pending" so the cron retries the failed ones
  // The postedPlatforms tracking prevents re-posting to already-succeeded platforms

  const updateData: Record<string, any> = {
    status: newStatus,
    postedPlatforms: JSON.stringify(postedPlatforms),
    updatedAt: new Date(),
  };

  if (allPlatformsNowPosted) {
    updateData.postedAt = new Date();
  }

  if (anyFailed) {
    const errors: string[] = [];
    if (!fbResult.success && platforms.includes("facebook")) errors.push(`FB: ${fbResult.error || "unknown error"}`);
    if (!igResult.success && platforms.includes("instagram")) errors.push(`IG: ${igResult.error || "unknown error"}`);
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

  return { queueId: item.id, facebook: fbResult, instagram: igResult, instagramStory: igStoryResult };
}

// ===========================================
// CAPTION TEMPLATES
// ===========================================

export interface CaptionContext {
  contentType: "gallery_photo" | "spotify_track" | "artist_profile" | "curated_track" | "vertical_video" | "youtube_video" | "event";
  artistName?: string;
  artistRole?: string;
  releaseTitle?: string;
  releaseType?: string;
  releaseDate?: Date | null; // For 90-day "Nueva música" logic
  photoTitle?: string;
  photoLocation?: string;
  photographer?: string;
  linkUrl?: string;
  spotifyUrl?: string;
  trackName?: string;
  albumName?: string;
  videoTitle?: string;
  videoPlatform?: string;
  // Event-specific fields
  eventTitle?: string;
  eventVenue?: string;
  eventCity?: string;
  eventDate?: Date | null;
  eventTime?: string;
  ticketUrl?: string;
}

/**
 * Check if a release date is within 90 days (considered "new").
 */
function isNewRelease(releaseDate?: Date | null): boolean {
  if (!releaseDate) return false;
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  return new Date(releaseDate) > ninetyDaysAgo;
}

// Multiple caption variations per content type to avoid repetition
// Each array has several options; we pick one based on a rotation index
const CAPTION_VARIATIONS = {
  gallery_photo: [
    {
      withArtist: (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
        const location = ctx.photoLocation ? ` ${ctx.photoLocation}` : "";
        const photoCredit = ctx.photographer ? `\nFoto: ${ctx.photographer}` : "";
        return [
          `${ctx.artistName} en acción${location}${photoCredit}`,
          "",
          `Descubre más de ${ctx.artistName} en ${ctx.linkUrl || `${siteUrl}/artistas`}`,
          "",
          hashtags,
        ].join("\n");
      },
      withoutArtist: (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
        const location = ctx.photoLocation ? ` ${ctx.photoLocation}` : "";
        const photoCredit = ctx.photographer ? `\nFoto: ${ctx.photographer}` : "";
        return [
          `Sonido Líquido Crew${location}${photoCredit}`,
          "",
          `Más en ${siteUrl}`,
          "",
          hashtags,
        ].join("\n");
      },
    },
    {
      withArtist: (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
        const location = ctx.photoLocation ? ` desde ${ctx.photoLocation}` : "";
        const photoCredit = ctx.photographer ? ` | Foto: ${ctx.photographer}` : "";
        return [
          `Capturando la esencia de ${ctx.artistName}${location}${photoCredit}`,
          "",
          `${ctx.artistName} es parte del colectivo → ${ctx.linkUrl || `${siteUrl}/artistas`}`,
          "",
          hashtags,
        ].join("\n");
      },
      withoutArtist: (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
        const location = ctx.photoLocation ? ` ${ctx.photoLocation}` : "";
        const photoCredit = ctx.photographer ? `\nFoto: ${ctx.photographer}` : "";
        return [
          `El colectivo en su elemento${location}${photoCredit}`,
          "",
          `Hip hop mexicano desde 1999 → ${siteUrl}`,
          "",
          hashtags,
        ].join("\n");
      },
    },
    {
      withArtist: (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
        const photoCredit = ctx.photographer ? `\n📸 ${ctx.photographer}` : "";
        return [
          `${ctx.artistName} representando${photoCredit}`,
          "",
          `Conoce al roster completo → ${ctx.linkUrl || `${siteUrl}/artistas`}`,
          "",
          hashtags,
        ].join("\n");
      },
      withoutArtist: (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
        const photoCredit = ctx.photographer ? `\n📸 ${ctx.photographer}` : "";
        return [
          `Sonido Líquido Crew — la familia del hip hop mexicano${photoCredit}`,
          "",
          `${siteUrl}`,
          "",
          hashtags,
        ].join("\n");
      },
    },
  ],

  spotify_track: [
    {
      newRelease: (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
        const typeLabel = ctx.releaseType === "album" ? "el álbum" : ctx.releaseType === "ep" ? "el EP" : ctx.releaseType === "mixtape" ? "la mixtape" : "el sencillo";
        const artistLine = ctx.artistName || "Sonido Líquido Crew";
        return [
          `🔥 Nueva música de ${artistLine}`,
          `${ctx.releaseTitle || "Nuevo lanzamiento"} — ${typeLabel} ya disponible`,
          "",
          `Escucha en Spotify: ${ctx.spotifyUrl || ctx.linkUrl || `${siteUrl}/discografia`}`,
          "",
          hashtags,
        ].join("\n");
      },
      oldRelease: (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
        const typeLabel = ctx.releaseType === "album" ? "el álbum" : ctx.releaseType === "ep" ? "el EP" : ctx.releaseType === "mixtape" ? "la mixtape" : "el sencillo";
        const artistLine = ctx.artistName || "Sonido Líquido Crew";
        return [
          `🎶 Música de ${artistLine}`,
          `${ctx.releaseTitle || "Lanzamiento"} — ${typeLabel}`,
          "",
          `Escucha en Spotify: ${ctx.spotifyUrl || ctx.linkUrl || `${siteUrl}/discografia`}`,
          "",
          hashtags,
        ].join("\n");
      },
    },
    {
      newRelease: (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
        const artistLine = ctx.artistName || "Sonido Líquido Crew";
        return [
          `${ctx.releaseTitle || "Nuevo lanzamiento"} — ${artistLine}`,
          "Acaba de salir. Ya está en Spotify 👊",
          "",
          `${ctx.spotifyUrl || ctx.linkUrl || `${siteUrl}/discografia`}`,
          "",
          hashtags,
        ].join("\n");
      },
      oldRelease: (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
        const artistLine = ctx.artistName || "Sonido Líquido Crew";
        return [
          `${ctx.releaseTitle || "Lanzamiento"} — ${artistLine}`,
          "Clásico del colectivo, sigue sonando 🔊",
          "",
          `${ctx.spotifyUrl || ctx.linkUrl || `${siteUrl}/discografia`}`,
          "",
          hashtags,
        ].join("\n");
      },
    },
    {
      newRelease: (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
        const typeLabel = ctx.releaseType === "album" ? "Álbum" : ctx.releaseType === "ep" ? "EP" : ctx.releaseType === "mixtape" ? "Mixtape" : "Sencillo";
        const artistLine = ctx.artistName || "Sonido Líquido Crew";
        return [
          `Nuevo ${typeLabel.toLowerCase()} de ${artistLine}: "${ctx.releaseTitle || "Nuevo lanzamiento"}"`,
          "Ya disponible en todas las plataformas",
          "",
          `▶️ ${ctx.spotifyUrl || ctx.linkUrl || `${siteUrl}/discografia`}`,
          "",
          hashtags,
        ].join("\n");
      },
      oldRelease: (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
        const typeLabel = ctx.releaseType === "album" ? "Álbum" : ctx.releaseType === "ep" ? "EP" : ctx.releaseType === "mixtape" ? "Mixtape" : "Sencillo";
        const artistLine = ctx.artistName || "Sonido Líquido Crew";
        return [
          `${typeLabel} de ${artistLine}: "${ctx.releaseTitle || "Lanzamiento"}"`,
          "Del catálogo de Sonido Líquido, sigue vigente",
          "",
          `▶️ ${ctx.spotifyUrl || ctx.linkUrl || `${siteUrl}/discografia`}`,
          "",
          hashtags,
        ].join("\n");
      },
    },
  ],

  artist_profile: [
    (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
      const roleLabels: Record<string, string> = {
        mc: "MC", dj: "DJ", producer: "Productor", cantante: "Cantante", divo: "Divo", lado_b: "Lado B",
      };
      const roleLabel = ctx.artistRole ? roleLabels[ctx.artistRole] || ctx.artistRole : "Artista";
      return [
        `${ctx.artistName} — ${roleLabel} de Sonido Líquido Crew`,
        "",
        "25 años de hip hop mexicano, y seguimos rompiendo",
        "",
        `Conoce más: ${ctx.linkUrl || `${siteUrl}/artistas`}`,
        "",
        hashtags,
      ].join("\n");
    },
    (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
      const roleLabels: Record<string, string> = {
        mc: "MC", dj: "DJ", producer: "Productor", cantante: "Cantante", divo: "Divo", lado_b: "Lado B",
      };
      const roleLabel = ctx.artistRole ? roleLabels[ctx.artistRole] || ctx.artistRole : "Artista";
      return [
        `El roster de SLC: ${ctx.artistName} (${roleLabel})`,
        "",
        "Más de 25 años haciendo historia en el rap mexicano",
        "",
        `${ctx.linkUrl || `${siteUrl}/artistas`}`,
        "",
        hashtags,
      ].join("\n");
    },
    (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
      return [
        `${ctx.artistName} — pieza clave del colectivo`,
        "",
        "Sonido Líquido Crew, la escuela del hip hop nacional",
        "",
        `→ ${ctx.linkUrl || `${siteUrl}/artistas`}`,
        "",
        hashtags,
      ].join("\n");
    },
  ],

  curated_track: [
    (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
      const artistLine = ctx.artistName || "Sonido Líquido Crew";
      const trackLine = ctx.trackName ? `"${ctx.trackName}"` : "";
      const albumLine = ctx.albumName ? ` del álbum "${ctx.albumName}"` : "";
      return [
        `${artistLine} — ${trackLine}${albumLine}`.trim(),
        "",
        "Descubre más música del roster en nuestra playlist curada",
        "",
        `Escucha: ${ctx.spotifyUrl || ctx.linkUrl || `${siteUrl}/discografia`}`,
        "",
        hashtags,
      ].join("\n");
    },
    (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
      const artistLine = ctx.artistName || "Sonido Líquido Crew";
      const trackLine = ctx.trackName ? `${ctx.trackName}` : "";
      return [
        `🎵 ${trackLine} — ${artistLine}`,
        "",
        "De la playlist curada del colectivo",
        "",
        `${ctx.spotifyUrl || ctx.linkUrl || `${siteUrl}/discografia`}`,
        "",
        hashtags,
      ].join("\n");
    },
    (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
      const artistLine = ctx.artistName || "Sonido Líquido Crew";
      const trackLine = ctx.trackName ? `"${ctx.trackName}" de ` : "Track de ";
      return [
        `${trackLine}${artistLine}`,
        "",
        "Cada semana una recomendación del roster 🔥",
        "",
        `Escucha ahora: ${ctx.spotifyUrl || ctx.linkUrl || `${siteUrl}/discografia`}`,
        "",
        hashtags,
      ].join("\n");
    },
  ],

  vertical_video: [
    (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
      const artistLine = ctx.artistName || "Sonido Líquido Crew";
      const titleLine = ctx.videoTitle || "Video exclusivo";
      const platformLabel = ctx.videoPlatform === "youtube" ? "YouTube" : ctx.videoPlatform === "instagram" ? "Instagram" : "";
      return [
        `${artistLine} — ${titleLine}`,
        "",
        platformLabel ? `Mira el video completo en ${platformLabel}` : "Mira el video completo",
        "",
        `Más contenido: ${ctx.linkUrl || `${siteUrl}/reels`}`,
        "",
        hashtags,
        "#Reels #Shorts #VideoMusical",
      ].join("\n");
    },
    (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
      const artistLine = ctx.artistName || "Sonido Líquido Crew";
      const titleLine = ctx.videoTitle || "Video exclusivo";
      return [
        `🎬 ${titleLine} — ${artistLine}`,
        "",
        "Contenido visual del colectivo",
        "",
        `${ctx.linkUrl || `${siteUrl}/reels`}`,
        "",
        hashtags,
        "#Reels #Shorts",
      ].join("\n");
    },
  ],

  youtube_video: [
    (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
      const artistLine = ctx.artistName || "Sonido Líquido Crew";
      const titleLine = ctx.videoTitle || "Video musical";
      const ytLink = ctx.linkUrl || `${siteUrl}/videos`;
      return [
        `${artistLine} — ${titleLine}`,
        "",
        "Mira el video completo en YouTube",
        ytLink,
        "",
        hashtags,
        "#YouTube #VideoMusical #HipHopMexico",
      ].join("\n");
    },
    (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
      const artistLine = ctx.artistName || "Sonido Líquido Crew";
      const titleLine = ctx.videoTitle || "Video oficial";
      const ytLink = ctx.linkUrl || `${siteUrl}/videos`;
      return [
        `🎬 ${titleLine} — ${artistLine}`,
        "",
        "Video oficial del colectivo",
        ytLink,
        "",
        hashtags,
        "#YouTube #MusicVideo",
      ].join("\n");
    },
    (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
      const artistLine = ctx.artistName || "Sonido Líquido Crew";
      const titleLine = ctx.videoTitle || "Nuevo video";
      const ytLink = ctx.linkUrl || `${siteUrl}/videos`;
      return [
        `Visualmente poderoso — ${titleLine}`,
        `${artistLine} en pantalla grande`,
        "",
        ytLink,
        "",
        hashtags,
        "#VideoOficial #HipHop",
      ].join("\n");
    },
  ],

  // ========================================
  // Event captions
  // ========================================
  event: [
    (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
      const title = ctx.eventTitle || "Evento Sonido Líquido";
      const venue = ctx.eventVenue || "";
      const city = ctx.eventCity || "";
      const dateStr = ctx.eventDate ? formatDateEs(ctx.eventDate) : "";
      const timeStr = ctx.eventTime || "";
      const location = [venue, city].filter(Boolean).join(", ");
      const dateTime = [dateStr, timeStr].filter(Boolean).join(" — ");
      const ticketLine = ctx.ticketUrl ? `\nBoletos: ${ctx.ticketUrl}` : "";
      return [
        `📍 ${title}`,
        location ? ` ${location}` : "",
        dateTime ? ` ${dateTime}` : "",
        ticketLine,
        "",
        `Más info: ${ctx.linkUrl || `${siteUrl}/proximos`}`,
        "",
        hashtags,
        "#Evento #EnVivo #HipHopMexico",
      ].filter(Boolean).join("\n");
    },
    (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
      const title = ctx.eventTitle || "Próximo evento";
      const venue = ctx.eventVenue || "";
      const city = ctx.eventCity || "";
      const dateStr = ctx.eventDate ? formatDateEs(ctx.eventDate) : "";
      const timeStr = ctx.eventTime || "";
      const location = [venue, city].filter(Boolean).join(", ");
      const dateTime = [dateStr, timeStr].filter(Boolean).join(" | ");
      const ticketLine = ctx.ticketUrl ? `\nCompra tu boleto: ${ctx.ticketUrl}` : "";
      return [
        `Se viene ${title}`,
        location ? ` ${location}` : "",
        dateTime ? ` ${dateTime}` : "",
        ticketLine,
        "",
        `No te lo pierdas → ${ctx.linkUrl || `${siteUrl}/proximos`}`,
        "",
        hashtags,
        "#EnVivo #Concierto #RapMexicano",
      ].filter(Boolean).join("\n");
    },
    (ctx: CaptionContext, siteUrl: string, hashtags: string) => {
      const title = ctx.eventTitle || "Evento";
      const venue = ctx.eventVenue || "";
      const city = ctx.eventCity || "";
      const dateStr = ctx.eventDate ? formatDateEs(ctx.eventDate) : "";
      const timeStr = ctx.eventTime || "";
      const location = [venue, city].filter(Boolean).join(", ");
      const dateTime = [dateStr, timeStr].filter(Boolean).join(" — ");
      const ticketLine = ctx.ticketUrl ? `\nEntradas: ${ctx.ticketUrl}` : "";
      return [
        `El hip hop en vivo — ${title}`,
        location ? ` ${location}` : "",
        dateTime ? ` ${dateTime}` : "",
        ticketLine,
        "",
        "Sonido Líquido Crew presente",
        ctx.linkUrl || `${siteUrl}/proximos`,
        "",
        hashtags,
        "#EnVivo #HipHop #Evento",
      ].filter(Boolean).join("\n");
    },
  ],
};

/**
 * Format a Date in Spanish locale string (e.g. "15 de julio de 2025").
 */
function formatDateEs(date: Date): string {
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const d = new Date(date);
  return `${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

/**
 * Generate a caption for a social media post based on content type and context.
 * All captions are in Spanish, matching the SLC brand voice.
 * Uses variation rotation to avoid repetitive captions.
 *
 * Key logic:
 * - Releases ≤90 days old: "Nueva música de..."
 * - Releases >90 days old: "Música de..." (without "nueva")
 * - "años" always spelled with ñ (not "anos")
 */
export function generateCaption(ctx: CaptionContext, variationIndex?: number): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sonidoliquido.com";
  const hashtags = "#SonidoLiquido #HipHopMexico #HipHop #CDMX #RapMexicano";
  const isNew = isNewRelease(ctx.releaseDate);

  switch (ctx.contentType) {
    case "gallery_photo": {
      const variations = CAPTION_VARIATIONS.gallery_photo;
      const idx = variationIndex !== undefined ? variationIndex % variations.length : 0;
      const variation = variations[idx];
      if (ctx.artistName) {
        return variation.withArtist(ctx, siteUrl, hashtags);
      }
      return variation.withoutArtist(ctx, siteUrl, hashtags);
    }

    case "spotify_track": {
      const variations = CAPTION_VARIATIONS.spotify_track;
      const idx = variationIndex !== undefined ? variationIndex % variations.length : 0;
      const variation = variations[idx];
      if (isNew) {
        return variation.newRelease(ctx, siteUrl, hashtags);
      }
      return variation.oldRelease(ctx, siteUrl, hashtags);
    }

    case "artist_profile": {
      const variations = CAPTION_VARIATIONS.artist_profile;
      const idx = variationIndex !== undefined ? variationIndex % variations.length : 0;
      return variations[idx](ctx, siteUrl, hashtags);
    }

    case "curated_track": {
      const variations = CAPTION_VARIATIONS.curated_track;
      const idx = variationIndex !== undefined ? variationIndex % variations.length : 0;
      return variations[idx](ctx, siteUrl, hashtags);
    }

    case "vertical_video": {
      const variations = CAPTION_VARIATIONS.vertical_video;
      const idx = variationIndex !== undefined ? variationIndex % variations.length : 0;
      return variations[idx](ctx, siteUrl, hashtags);
    }

    case "youtube_video": {
      const variations = CAPTION_VARIATIONS.youtube_video;
      const idx = variationIndex !== undefined ? variationIndex % variations.length : 0;
      return variations[idx](ctx, siteUrl, hashtags);
    }

    case "event": {
      const variations = CAPTION_VARIATIONS.event;
      const idx = variationIndex !== undefined ? variationIndex % variations.length : 0;
      return variations[idx](ctx, siteUrl, hashtags);
    }

    default:
      return `Sonido Líquido Crew — Hip Hop México desde 1999\n\n${siteUrl}\n\n${hashtags}`;
  }
}

// ===========================================
// AI-POWERED CAPTION GENERATION
// ===========================================

/**
 * Generate a unique, creative caption using AI (z-ai-web-dev-sdk).
 *
 * This function uses the LLM to produce varied, on-brand captions in Spanish
 * that match the Sonido Líquido Crew voice. It receives the same CaptionContext
 * as generateCaption() and produces a fresh caption each time.
 *
 * The AI is instructed to:
 * - Write in Spanish, matching the SLC brand voice (street, authentic, hip hop)
 * - Use "años" (with ñ), never "anos"
 * - Label releases ≤90 days old as "nueva música", older ones without "nueva"
 * - Include relevant hashtags
 * - Keep the caption concise and engaging for social media
 * - Vary the tone and phrasing each time (no repetition)
 *
 * Falls back to generateCaption() if AI fails.
 */
export async function generateAICaption(ctx: CaptionContext, variationIndex?: number): Promise<string> {
  try {
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    const zai = await ZAI.create();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sonidoliquido.com";
    const isNew = isNewRelease(ctx.releaseDate);
    const daysSinceRelease = ctx.releaseDate
      ? Math.floor((Date.now() - new Date(ctx.releaseDate).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Build context description for the AI
    const contextParts: string[] = [];
    contextParts.push(`Tipo de contenido: ${ctx.contentType}`);

    if (ctx.artistName) contextParts.push(`Artista: ${ctx.artistName}`);
    if (ctx.artistRole) contextParts.push(`Rol: ${ctx.artistRole}`);
    if (ctx.releaseTitle) contextParts.push(`Título: ${ctx.releaseTitle}`);
    if (ctx.releaseType) contextParts.push(`Tipo de lanzamiento: ${ctx.releaseType}`);
    if (daysSinceRelease !== null) {
      contextParts.push(`Días desde lanzamiento: ${daysSinceRelease} (${isNew ? "NUEVA — usar 'nueva música'" : "catálogo — NO usar 'nueva'"})`);
    }
    if (ctx.trackName) contextParts.push(`Track: ${ctx.trackName}`);
    if (ctx.albumName) contextParts.push(`Álbum: ${ctx.albumName}`);
    if (ctx.photoLocation) contextParts.push(`Ubicación: ${ctx.photoLocation}`);
    if (ctx.photographer) contextParts.push(`Fotógrafo: ${ctx.photographer}`);
    if (ctx.videoTitle) contextParts.push(`Video: ${ctx.videoTitle}`);
    if (ctx.videoPlatform) contextParts.push(`Plataforma video: ${ctx.videoPlatform}`);
    if (ctx.eventTitle) contextParts.push(`Evento: ${ctx.eventTitle}`);
    if (ctx.eventVenue) contextParts.push(`Lugar: ${ctx.eventVenue}`);
    if (ctx.eventCity) contextParts.push(`Ciudad: ${ctx.eventCity}`);
    if (ctx.eventDate) contextParts.push(`Fecha del evento: ${formatDateEs(ctx.eventDate)}${ctx.eventTime ? ` a las ${ctx.eventTime}` : ""}`);
    if (ctx.ticketUrl) contextParts.push(`Boletos: ${ctx.ticketUrl}`);
    if (ctx.linkUrl) contextParts.push(`Link: ${ctx.linkUrl}`);
    if (ctx.spotifyUrl) contextParts.push(`Spotify: ${ctx.spotifyUrl}`);

    const variationSeed = variationIndex ?? Math.floor(Math.random() * 100);

    const systemPrompt = `Eres el community manager de Sonido Líquido Crew, un colectivo de hip hop mexicano con más de 25 años de trayectoria. Tu voz es auténtica, calle, directa, con sabor a hip hop. Erescribes captions para redes sociales (Instagram, Facebook).

REGLAS ESTRICTAS:
1. SIEMPRE escribe en español.
2. SIEMPRE usa "años" con ñ, NUNCA "anos".
3. Para lanzamientos de 90 días o menos: usa "nueva música" o "nuevo lanzamiento".
4. Para lanzamientos de más de 90 días: NO uses "nueva" — es música de catálogo.
5. Incluye SIEMPRE estos hashtags: #SonidoLiquido #HipHopMexico #HipHop #CDMX #RapMexicano
6. Incluye SIEMPRE un link (el proporcionado o ${siteUrl}).
7. Sé creativo y variado — no repitas frases. Cambia el tono, las frases, el estilo.
8. Mantén el caption conciso (3-5 líneas + hashtags).
9. NO uses emojis excesivos (máximo 2-3 por caption).
10. Cada caption debe ser diferente. Variación #${variationSeed}.
11. Para eventos: SIEMPRE incluye lugar, fecha y link a boletos si hay. Agrega #Evento #EnVivo a los hashtags.`;

    const userPrompt = `Genera un caption para este post de redes sociales:

${contextParts.join("\n")}

Responde SOLO con el caption, sin explicaciones adicionales.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const aiCaption = completion.choices[0]?.message?.content?.trim();

    if (aiCaption && aiCaption.length > 20) {
      // Verify the caption doesn't have "anos" (without ñ)
      const safeCaption = aiCaption.replace(/\banos\b/g, "años");
      console.log("[Social AI] Generated AI caption successfully");
      return safeCaption;
    }

    console.warn("[Social AI] AI caption was too short or empty, falling back to template");
    return generateCaption(ctx, variationIndex);
  } catch (error) {
    console.warn("[Social AI] AI caption generation failed, falling back to template:", error);
    return generateCaption(ctx, variationIndex);
  }
}

// ===========================================
// QUEUE HELPERS
// ===========================================

// Content type rotation order for round-robin posting
// This ensures we never post the same content type twice in a row
const CONTENT_TYPE_ROTATION = [
  "gallery_photo",
  "spotify_track",
  "artist_profile",
  "curated_track",
  "youtube_video",
  "event",
] as const;

/**
 * Get the next pending item from the queue using round-robin logic.
 * Cycles through content types: gallery_photo → spotify_track → artist_profile → curated_track → youtube_video → repeat
 * This ensures we never post the same content type twice in a row (no duplicates).
 */
export async function getNextPendingItem(): Promise<SocialPostQueueWithId | null> {
  if (!isDatabaseConfiguredLocal()) {
    console.warn("[Social] Database not configured");
    return null;
  }

  try {
    // Step 1: Find out what content type was last posted
    const lastPosted = await db
      .select({
        contentType: socialPostsLog.contentType,
      })
      .from(socialPostsLog)
      .where(eq(socialPostsLog.status, "success"))
      .orderBy(desc(socialPostsLog.postedAt))
      .limit(1);

    const lastContentType = lastPosted[0]?.contentType as string | undefined;

    // Step 2: Determine the rotation order starting from the type AFTER the last posted
    let rotationStartIndex = 0;
    if (lastContentType) {
      const lastIdx = CONTENT_TYPE_ROTATION.indexOf(lastContentType as any);
      if (lastIdx >= 0) {
        rotationStartIndex = (lastIdx + 1) % CONTENT_TYPE_ROTATION.length;
      }
    }

    // Step 3: Try each content type in round-robin order until we find a pending item
    for (let i = 0; i < CONTENT_TYPE_ROTATION.length; i++) {
      const typeIndex = (rotationStartIndex + i) % CONTENT_TYPE_ROTATION.length;
      const nextType = CONTENT_TYPE_ROTATION[typeIndex];

      // Atomically claim the item: fetch pending, then immediately set to "processing"
      // This prevents the race condition where the cron fires again before the item is marked "posted"
      const items = await db
        .select()
        .from(socialPostQueue)
        .where(
          and(
            eq(socialPostQueue.status, "pending"),
            eq(socialPostQueue.contentType, nextType)
          )
        )
        .orderBy(socialPostQueue.queueOrder, socialPostQueue.cycleNumber)
        .limit(1);

      if (items.length > 0) {
        const item = items[0];

        // Check if this image was recently posted (within last 48h) — prevents same-photo duplicates
        // NOTE: postedAt is stored as integer Unix timestamp, so we compare with unixepoch() not datetime()
        const recentlyPosted = await db
          .select({ imageUrl: socialPostsLog.imageUrl, postedAt: socialPostsLog.postedAt })
          .from(socialPostsLog)
          .where(
            and(
              eq(socialPostsLog.status, "success"),
              eq(socialPostsLog.imageUrl, item.imageUrl!),
              drizzleSql`${socialPostsLog.postedAt} > (unixepoch() - 172800)`
            )
          )
          .limit(1);

        if (recentlyPosted.length > 0) {
          console.log(`[Social] Skipping ${nextType} item ${item.id} — same image was posted in the last 48 hours. Marking as skipped.`);
          await db
            .update(socialPostQueue)
            .set({
              status: "skipped",
              errorMessage: "Skipped: same image posted in last 48h (dedup)",
              updatedAt: new Date(),
            } as any)
            .where(eq(socialPostQueue.id, item.id));
          // Continue to next item in the rotation, don't return
          continue;
        }

        // Check if this exact contentType:sourceId was posted recently (within last 48h)
        // NOTE: postedAt is stored as integer Unix timestamp, so we compare with unixepoch() not datetime()
        const recentlyPostedSource = await db
          .select({ sourceId: socialPostsLog.sourceId, postedAt: socialPostsLog.postedAt })
          .from(socialPostsLog)
          .where(
            and(
              eq(socialPostsLog.status, "success"),
              eq(socialPostsLog.contentType, item.contentType as any),
              eq(socialPostsLog.sourceId, item.sourceId!),
              drizzleSql`${socialPostsLog.postedAt} > (unixepoch() - 172800)`
            )
          )
          .limit(1);

        if (recentlyPostedSource.length > 0) {
          console.log(`[Social] Skipping ${nextType} item ${item.id} — same content was posted in the last 48 hours. Marking as skipped.`);
          await db
            .update(socialPostQueue)
            .set({
              status: "skipped",
              errorMessage: "Skipped: same content posted in last 48h (dedup)",
              updatedAt: new Date(),
            } as any)
            .where(eq(socialPostQueue.id, item.id));
          continue;
        }

        // Atomically claim: set status to "processing" so no other run picks this up
        const claimed = await db
          .update(socialPostQueue)
          .set({ status: "processing", updatedAt: new Date() } as any)
          .where(
            and(
              eq(socialPostQueue.id, item.id),
              eq(socialPostQueue.status, "pending") // Only claim if still pending
            )
          )
          .returning();

        if (claimed.length === 0) {
          // Another process claimed it first — skip and try next
          console.log(`[Social] Item ${item.id} was claimed by another process. Skipping.`);
          continue;
        }

        console.log(`[Social] Round-robin: last was ${lastContentType || "none"}, next is ${nextType}`);
        return claimed[0] as unknown as SocialPostQueueWithId;
      }
    }

    // Step 4: No pending items in rotation types — try any other type as fallback
    const anyItems = await db
      .select()
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "pending"))
      .orderBy(socialPostQueue.queueOrder, socialPostQueue.cycleNumber)
      .limit(1);

    if (anyItems.length > 0) {
      const item = anyItems[0];

      // Same dedup checks for fallback items (48h window)
      // NOTE: postedAt is stored as integer Unix timestamp, so we compare with unixepoch() not datetime()
      const recentlyPosted = await db
        .select({ imageUrl: socialPostsLog.imageUrl })
        .from(socialPostsLog)
        .where(
          and(
            eq(socialPostsLog.status, "success"),
            eq(socialPostsLog.imageUrl, item.imageUrl!),
            drizzleSql`${socialPostsLog.postedAt} > (unixepoch() - 172800)`
          )
        )
        .limit(1);

      if (recentlyPosted.length > 0) {
        console.log(`[Social] Skipping fallback item ${item.id} — same image posted in last 48h. Marking as skipped.`);
        await db
          .update(socialPostQueue)
          .set({
            status: "skipped",
            errorMessage: "Skipped: same image posted in last 48h (dedup)",
            updatedAt: new Date(),
          } as any)
          .where(eq(socialPostQueue.id, item.id));
        return null; // Don't try more fallback items this run
      }

      // Atomic claim
      const claimed = await db
        .update(socialPostQueue)
        .set({ status: "processing", updatedAt: new Date() } as any)
        .where(
          and(
            eq(socialPostQueue.id, item.id),
            eq(socialPostQueue.status, "pending")
          )
        )
        .returning();

      if (claimed.length > 0) {
        console.log(`[Social] Round-robin: no rotation types pending, falling back to ${item.contentType}`);
        return claimed[0] as unknown as SocialPostQueueWithId;
      }
    }

    // Step 5: All items are posted — try to reset for a new cycle
    // Only resets if the last post was on a previous calendar day (prevents same-day duplicates)
    const didReset = await resetCycleIfNeeded();
    if (didReset) {
      // Cycle was reset — try to pick up a pending item from the new cycle
      // Use recursive call but with a depth limit to prevent infinite loops
      return getNextPendingItemRecursive(1);
    }
    return null;
  } catch (error) {
    console.error("[Social] Error fetching next pending item:", error);
    return null;
  }
}

/**
 * Recursive wrapper for getNextPendingItem with depth limit.
 * Prevents infinite loops when a cycle reset triggers another search.
 */
async function getNextPendingItemRecursive(depth: number): Promise<SocialPostQueueWithId | null> {
  if (depth > 2) {
    console.log("[Social] Max recursive depth reached in getNextPendingItem. Stopping.");
    return null;
  }
  return getNextPendingItem();
}

/**
 * If all items in the current cycle are posted, increment cycle and reset to pending.
 * IMPORTANT: Only resets if the last post was on a PREVIOUS calendar day (Mexico City time).
 * This prevents same-day duplicates — each item is posted once per cycle, and cycles
 * only reset on a new day.
 *
 * @returns true if the cycle was reset, false otherwise
 */
async function resetCycleIfNeeded(): Promise<boolean> {
  try {
    // First, recover any stuck "processing" items (from crashed runs) back to "pending"
    // If they've been in "processing" for more than 10 minutes, they're likely from a crashed run
    // NOTE: updatedAt is stored as integer Unix timestamp, so we compare with unixepoch() not datetime()
    const staleProcessing = await db
      .update(socialPostQueue)
      .set({ status: "pending", updatedAt: new Date() } as any)
      .where(
        and(
          eq(socialPostQueue.status, "processing"),
          drizzleSql`${socialPostQueue.updatedAt} < (unixepoch() - 600)`
        )
      )
      .returning();

    if (staleProcessing.length > 0) {
      console.log(`[Social] Recovered ${staleProcessing.length} stuck "processing" items back to "pending"`);
    }

    // Get current max cycle number using raw SQL
    const result = await db
      .select({
        maxCycle: drizzleSql`MAX(CAST(${socialPostQueue.cycleNumber} AS INTEGER))`,
      })
      .from(socialPostQueue);

    const currentCycle = Number(result[0]?.maxCycle) || 1;

    // Check if all items in the current cycle are posted or skipped
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
      // All posted or skipped! Check if we should start a new cycle.
      // COOLDOWN: Only reset if the last successful post was on a PREVIOUS calendar day
      // (in Mexico City timezone). This prevents same-day duplicates.
      const lastPost = await db
        .select({ postedAt: socialPostsLog.postedAt })
        .from(socialPostsLog)
        .where(eq(socialPostsLog.status, "success"))
        .orderBy(desc(socialPostsLog.postedAt))
        .limit(1);

      if (lastPost.length > 0 && lastPost[0].postedAt) {
        const lastPostDate = new Date(lastPost[0].postedAt);
        // Convert to Mexico City timezone (UTC-6) for date comparison
        const cstOffset = 6 * 60 * 60 * 1000; // 6 hours in ms
        const lastPostCST = new Date(lastPostDate.getTime() - cstOffset);
        const nowCST = new Date(Date.now() - cstOffset);

        const lastPostDay = `${lastPostCST.getUTCFullYear()}-${lastPostCST.getUTCMonth()}-${lastPostCST.getUTCDate()}`;
        const todayDay = `${nowCST.getUTCFullYear()}-${nowCST.getUTCMonth()}-${nowCST.getUTCDate()}`;

        if (lastPostDay === todayDay) {
          // Same day — don't reset the cycle yet. Wait for a new day.
          console.log(
            `[Social] All items posted/skipped in cycle ${currentCycle}, but last post was today (Mexico City). ` +
            `Waiting for a new day before resetting cycle to prevent duplicates.`
          );
          return false;
        }
      }

      // Either no posts exist yet, or the last post was on a previous day — safe to reset
      const nextCycle = currentCycle + 1;
      console.log(`[Social] All items posted/skipped in cycle ${currentCycle}. Last post was on a previous day. Starting cycle ${nextCycle}.`);

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
        } as any);

      return true;
    }

    return false;
  } catch (error) {
    console.error("[Social] Error resetting cycle:", error);
    return false;
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
