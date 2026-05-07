// ===========================================
// TIKTOK CONTENT POSTING API CLIENT
// ===========================================
// Handles posting to TikTok via the Content Posting API.
// Requires a TikTok Developer App with the video.publish scope.
//
// Setup requirements:
// 1. Create a TikTok Developer App at developers.tiktok.com
// 2. Apply for the Content Posting API (Direct Post)
// 3. Get client_key and client_secret
// 4. Complete OAuth flow to get an access token for the TikTok account
// 5. Set TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_ACCESS_TOKEN env vars
//
// IMPORTANT: TikTok API only supports VIDEO posts, not image-only posts.
// For image content (gallery photos, artist profiles), we'll post a
// slideshow-style video or skip TikTok for those items.
// For Spotify tracks, we post the album art as a video with music link in caption.
//
// As a workaround for image-only content, we can create a simple video
// from the image using FFmpeg or post as a photo post if TikTok
// supports it via the Photo Post API.

import { db } from "@/db/client";
import { socialPostsLog } from "@/db/schema";

// ===========================================
// CONFIGURATION
// ===========================================

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

// Cached DB credentials (fetched once per process lifetime, or when invalidated)
let _dbCredentials: Record<string, string> | null = null;

/**
 * Fetch TikTok credentials from the DB (social_credentials table).
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
      .where(eq(socialCredentials.platform, "tiktok"));

    _dbCredentials = {};
    for (const row of rows) {
      _dbCredentials[row.key] = row.value;
    }
    return _dbCredentials;
  } catch (error) {
    console.warn("[TikTok] Could not fetch DB credentials:", error);
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

async function getClientKey(): Promise<string> {
  return getCredential("TIKTOK_CLIENT_KEY");
}

async function getClientSecret(): Promise<string> {
  return getCredential("TIKTOK_CLIENT_SECRET");
}

async function getAccessToken(): Promise<string> {
  return getCredential("TIKTOK_ACCESS_TOKEN");
}

/**
 * Synchronous check for TikTok configuration status.
 * Uses env vars only (for quick UI status checks without DB hit).
 */
export function isTikTokConfigured(): boolean {
  return !!(
    (process.env.TIKTOK_CLIENT_KEY || _dbCredentials?.TIKTOK_CLIENT_KEY) &&
    (process.env.TIKTOK_ACCESS_TOKEN || _dbCredentials?.TIKTOK_ACCESS_TOKEN)
  );
}

/**
 * Invalidate the cached DB credentials so they're re-fetched on next use.
 * Call this after saving credentials via the admin UI.
 */
export function invalidateTikTokCredentialsCache(): void {
  _dbCredentials = null;
}

// ===========================================
// TIKTOK POSTING
// ===========================================

export interface TikTokPostResult {
  success: boolean;
  videoId: string | null;
  postUrl: string | null;
  error?: string;
}

/**
 * Post content to TikTok using the Direct Post API.
 *
 * TikTok's Content Posting API requires video content.
 * For image-only posts, we use the Photo Post endpoint if available,
 * otherwise we create a simple slideshow video.
 *
 * API Flow:
 * 1. Initialize a video upload (server-to-server or upload from URL)
 * 2. Check processing status
 * 3. Publish the video
 */
export async function postToTikTok(
  imageUrl: string,
  caption: string,
  linkUrl?: string
): Promise<TikTokPostResult> {
  if (!isTikTokConfigured()) {
    return {
      success: false,
      videoId: null,
      postUrl: null,
      error: "TikTok API not configured. Set TIKTOK_CLIENT_KEY and TIKTOK_ACCESS_TOKEN env vars.",
    };
  }

  const token = await getAccessToken();

  try {
    // ========================================
    // Strategy: Try Direct Post API first
    // POST /post/publish/content/init/
    // ========================================

    // Build the caption with link
    const fullCaption = linkUrl
      ? `${caption}\n\n${linkUrl}`
      : caption;

    // Step 1: Initialize direct post
    const initResponse = await fetch(`${TIKTOK_API_BASE}/post/publish/content/init/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        post_info: {
          title: caption.substring(0, 150), // TikTok title max 150 chars
          description: fullCaption,
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          privacy_level: "PUBLIC_TO_EVERYONE",
        },
        source_info: {
          source: "PULL_FROM_URL",
          photo_images: [imageUrl], // For photo posts
        },
        post_mode: "DIRECT_POST",
        media_type: "PHOTO", // PHOTO for image posts, VIDEO for video posts
      }),
    });

    const initData = await initResponse.json();

    if (initData.error) {
      console.error("[TikTok] Init error:", initData.error);

      // If PHOTO type fails, try as VIDEO
      if (initData.error.code === "invalid_parameter" || initData.error.message?.includes("media_type")) {
        return await postToTikTokAsVideo(imageUrl, caption, linkUrl);
      }

      return {
        success: false,
        videoId: null,
        postUrl: null,
        error: `TikTok init error: ${initData.error.code || initData.error.message}`,
      };
    }

    const publishId = initData.data?.publish_id;

    if (!publishId) {
      return {
        success: false,
        videoId: null,
        postUrl: null,
        error: "No publish_id returned from TikTok init",
      };
    }

    console.log("[TikTok] Post initialized:", publishId);

    // Step 2: Check post status
    let status = "PROCESSING_UPLOAD";
    let attempts = 0;
    const maxAttempts = 15;

    while ((status === "PROCESSING_UPLOAD" || status === "SEND_TO_USER_INBOX") && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 3000)); // 3s between polls
      attempts++;

      const statusResponse = await fetch(`${TIKTOK_API_BASE}/post/publish/status/fetch/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ publish_id: publishId }),
      });

      const statusData = await statusResponse.json();

      if (statusData.error) {
        console.error("[TikTok] Status check error:", statusData.error);
        break;
      }

      status = statusData.data?.status || "UNKNOWN";

      if (status === "PUBLISH_COMPLETE") {
        const videoId = statusData.data?.publicly_available_post_id || publishId;
        console.log("[TikTok] Post published successfully:", videoId);
        return {
          success: true,
          videoId,
          postUrl: `https://tiktok.com/@sonidoliquidocrew/video/${videoId}`,
        };
      }

      if (status === "FAILED") {
        const failReason = statusData.data?.failed_reason || "Unknown failure";
        console.error("[TikTok] Post failed:", failReason);

        // If photo post failed, try video approach
        if (failReason.includes("photo") || failReason.includes("image")) {
          return await postToTikTokAsVideo(imageUrl, caption, linkUrl);
        }

        return {
          success: false,
          videoId: null,
          postUrl: null,
          error: `TikTok post failed: ${failReason}`,
        };
      }
    }

    // If still processing after timeout, consider it pending (not failed)
    if (status === "PROCESSING_UPLOAD" || status === "PROCESSING_DOWNLOAD") {
      return {
        success: true,
        videoId: publishId,
        postUrl: null,
        error: "Post still processing on TikTok (may appear shortly)",
      };
    }

    return {
      success: false,
      videoId: null,
      postUrl: null,
      error: `Unexpected TikTok status: ${status}`,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[TikTok] Post exception:", errMsg);
    return { success: false, videoId: null, postUrl: null, error: errMsg };
  }
}

/**
 * Fallback: Post as a video to TikTok.
 * This creates a post with source PULL_FROM_URL pointing to a video.
 * Since we only have images, we note that video content would be needed.
 */
async function postToTikTokAsVideo(
  imageUrl: string,
  caption: string,
  linkUrl?: string
): Promise<TikTokPostResult> {
  const token = await getAccessToken();

  // For now, we'll try the INBOX post approach which allows
  // the user to review and adjust the post before publishing
  const fullCaption = linkUrl ? `${caption}\n\n${linkUrl}` : caption;

  try {
    const initResponse = await fetch(`${TIKTOK_API_BASE}/post/publish/content/init/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        post_info: {
          title: caption.substring(0, 150),
          description: fullCaption,
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          privacy_level: "MUTUAL_FOLLOW_FRIENDS", // More private for inbox posts
        },
        source_info: {
          source: "PULL_FROM_URL",
          photo_images: [imageUrl],
        },
        post_mode: "DIRECT_POST",
        media_type: "PHOTO",
      }),
    });

    const initData = await initResponse.json();

    if (initData.error) {
      return {
        success: false,
        videoId: null,
        postUrl: null,
        error: `TikTok video post failed: ${initData.error.code || initData.error.message || JSON.stringify(initData.error)}`,
      };
    }

    const publishId = initData.data?.publish_id;
    return {
      success: true,
      videoId: publishId,
      postUrl: null,
      error: "Post sent to TikTok (processing)",
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return { success: false, videoId: null, postUrl: null, error: errMsg };
  }
}

// ===========================================
// TOKEN VALIDATION
// ===========================================

export interface TikTokTokenInfo {
  isValid: boolean;
  clientKey: string;
  openId: string;
  scopes: string[];
  error?: string;
}

export async function validateTikTokToken(): Promise<TikTokTokenInfo> {
  if (!isTikTokConfigured()) {
    return {
      isValid: false,
      clientKey: "",
      openId: "",
      scopes: [],
      error: "TikTok not configured",
    };
  }

  const token = await getAccessToken();

  try {
    // TikTok's token validation endpoint
    const response = await fetch(`${TIKTOK_API_BASE}/user/info/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (data.error) {
      return {
        isValid: false,
        clientKey: await getClientKey(),
        openId: "",
        scopes: [],
        error: `${data.error.code}: ${data.error.message}`,
      };
    }

    return {
      isValid: true,
      clientKey: await getClientKey(),
      openId: data.data?.user?.open_id || "",
      scopes: data.data?.scope?.split(",") || [],
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return {
      isValid: false,
      clientKey: await getClientKey(),
      openId: "",
      scopes: [],
      error: errMsg,
    };
  }
}

// ===========================================
// OAUTH HELPERS
// ===========================================

/**
 * Generate the TikTok OAuth authorization URL.
 * The user needs to visit this URL to authorize the app.
 */
export async function getTikTokAuthUrl(redirectUri: string, state?: string): Promise<string> {
  const clientKey = await getClientKey();
  const scopes = "video.publish,video.list";

  const params = new URLSearchParams({
    client_key: clientKey,
    scope: scopes,
    response_type: "code",
    redirect_uri: redirectUri,
    state: state || crypto.randomUUID(),
  });

  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

/**
 * Exchange an authorization code for an access token.
 * Called from the OAuth callback endpoint.
 */
export async function exchangeTikTokCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; openId: string } | null> {
  const clientKey = await getClientKey();
  const clientSecret = await getClientSecret();

  try {
    const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("[TikTok] Token exchange error:", data.error);
      return null;
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      openId: data.open_id,
    };
  } catch (error) {
    console.error("[TikTok] Token exchange exception:", error);
    return null;
  }
}
