// ===========================================
// META GRAPH API CLIENT
// ===========================================
// Handles posting to Facebook Page and Instagram Business Account
// via the Meta Graph API using a System User token.

import { db } from "@/db/client";
import { socialPostQueue, socialPostsLog } from "@/db/schema";
import { eq, and, sql as drizzleSql } from "drizzle-orm";

// ===========================================
// CONFIGURATION
// ===========================================

const META_GRAPH_API = "https://graph.facebook.com/v21.0";

function getAppId(): string {
  return process.env.META_APP_ID || "";
}

function getAppSecret(): string {
  return process.env.META_APP_SECRET || "";
}

function getSystemUserToken(): string {
  return process.env.META_SYSTEM_USER_TOKEN || "";
}

function getFacebookPageId(): string {
  return process.env.FACEBOOK_PAGE_ID || "163429477044436";
}

function isMetaConfigured(): boolean {
  return !!(getSystemUserToken() && getFacebookPageId());
}

// ===========================================
// PAGE ACCESS TOKEN
// ===========================================
// The System User token can be exchanged for a Page-specific token

async function getPageAccessToken(): Promise<string> {
  const systemToken = getSystemUserToken();
  const pageId = getFacebookPageId();

  // For System Users with pages_manage_posts permission,
  // the system user token itself works for Page operations.
  // But we can also get a dedicated Page access token.
  try {
    const response = await fetch(
      `${META_GRAPH_API}/${pageId}?fields=access_token&access_token=${systemToken}`
    );
    const data = await response.json();
    if (data.access_token) {
      return data.access_token;
    }
  } catch (error) {
    console.warn("[Meta] Could not exchange for Page token, using system token directly:", error);
  }

  return systemToken;
}

// ===========================================
// INSTAGRAM BUSINESS ACCOUNT ID
// ===========================================
// IG Business Account is linked to the FB Page

let _igBusinessAccountId: string | null = null;

async function getInstagramBusinessAccountId(): Promise<string | null> {
  if (_igBusinessAccountId) return _igBusinessAccountId;

  const pageToken = await getPageAccessToken();
  const pageId = getFacebookPageId();

  try {
    const response = await fetch(
      `${META_GRAPH_API}/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
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
  expiresAt: number | null; // null = never expires
  scopes: string[];
  type: string;
}

export async function validateToken(token?: string): Promise<TokenInfo> {
  const tokenToCheck = token || getSystemUserToken();
  if (!tokenToCheck) {
    return { isValid: false, appId: "", userId: "", expiresAt: null, scopes: [], type: "" };
  }

  try {
    const response = await fetch(
      `${META_GRAPH_API}/debug_token?input_token=${tokenToCheck}&access_token=${getAppId()}|${getAppSecret()}`
    );
    const data = await response.json();

    if (data.error) {
      console.error("[Meta] Token validation error:", data.error);
      return { isValid: false, appId: "", userId: "", expiresAt: null, scopes: [], type: "" };
    }

    const info = data.data;
    return {
      isValid: info.is_valid === true,
      appId: info.app_id || "",
      userId: info.user_id || "",
      expiresAt: info.expires_at ? info.expires_at * 1000 : null,
      scopes: info.scopes || [],
      type: info.type || "",
    };
  } catch (error) {
    console.error("[Meta] Token validation request failed:", error);
    return { isValid: false, appId: "", userId: "", expiresAt: null, scopes: [], type: "" };
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
 * Post a photo to the Facebook Page feed.
 * Uses the /{page-id}/photos endpoint for a photo post with caption.
 */
export async function postToFacebook(
  imageUrl: string,
  caption: string,
  linkUrl?: string
): Promise<FacebookPostResult> {
  if (!isMetaConfigured()) {
    return { success: false, postId: null, postUrl: null, error: "Meta API not configured" };
  }

  const pageToken = await getPageAccessToken();
  const pageId = getFacebookPageId();

  try {
    // Build the caption with link if provided
    const fullCaption = linkUrl ? `${caption}\n\n${linkUrl}` : caption;

    const response = await fetch(`${META_GRAPH_API}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: imageUrl, // External image URL (Meta will fetch it)
        message: fullCaption,
        access_token: pageToken,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("[Meta] Facebook post error:", data.error);
      return {
        success: false,
        postId: null,
        postUrl: null,
        error: `${data.error.code}: ${data.error.message}`,
      };
    }

    const postId = data.id || data.post_id || null;
    const postUrl = postId ? `https://facebook.com/${postId}` : null;

    console.log("[Meta] Facebook post successful:", postId);
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
 * 1. Create a media container
 * 2. Publish the container
 */
export async function postToInstagram(
  imageUrl: string,
  caption: string
): Promise<InstagramPostResult> {
  if (!isMetaConfigured()) {
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

  const pageToken = await getPageAccessToken();

  try {
    // Step 1: Create media container
    const containerResponse = await fetch(`${META_GRAPH_API}/${igAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl, // Must be publicly accessible
        caption: caption,
        access_token: pageToken,
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

    // Step 2: Wait a moment for processing, then publish
    // Meta recommends polling the container status, but for photos
    // a short delay is usually sufficient
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check container status
    const statusResponse = await fetch(
      `${META_GRAPH_API}/${containerId}?fields=status_code&access_token=${pageToken}`
    );
    const statusData = await statusResponse.json();

    if (statusData.status_code === "ERROR") {
      console.error("[Meta] IG container processing error:", statusData);
      return {
        success: false,
        mediaId: null,
        permalink: null,
        error: "Container processing failed",
      };
    }

    // Step 3: Publish the container
    const publishResponse = await fetch(`${META_GRAPH_API}/${igAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: pageToken,
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

    // Get permalink
    let permalink: string | null = null;
    try {
      const permalinkResponse = await fetch(
        `${META_GRAPH_API}/${mediaId}?fields=permalink&access_token=${pageToken}`
      );
      const permalinkData = await permalinkResponse.json();
      permalink = permalinkData.permalink || null;
    } catch {
      // Non-critical — we still have the media ID
    }

    console.log("[Meta] Instagram post successful:", mediaId);
    return { success: true, mediaId, permalink };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Meta] Instagram post exception:", errMsg);
    return { success: false, mediaId: null, permalink: null, error: errMsg };
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

/**
 * Fetch engagement metrics for a Facebook post.
 */
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

/**
 * Fetch engagement metrics for an Instagram media post.
 */
export async function getInstagramPostMetrics(mediaId: string): Promise<PostMetrics | null> {
  try {
    const pageToken = await getPageAccessToken();
    const response = await fetch(
      `${META_GRAPH_API}/${mediaId}?fields=like_count,comments_count&access_token=${pageToken}`
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
// Posts a single queue item to all configured platforms

export interface PostQueueItemResult {
  queueId: string;
  facebook: FacebookPostResult;
  instagram: InstagramPostResult;
}

/**
 * Process a single queue item: post to FB and/or IG, log results, update queue status.
 */
export async function processQueueItem(item: SocialPostQueueWithId): Promise<PostQueueItemResult> {
  const platforms: string[] = JSON.parse(item.platforms || "[]");
  const postedPlatforms: string[] = JSON.parse(item.postedPlatforms || "[]");

  let fbResult: FacebookPostResult = { success: false, postId: null, postUrl: null };
  let igResult: InstagramPostResult = { success: false, mediaId: null, permalink: null };

  // Post to Facebook
  if (platforms.includes("facebook") && !postedPlatforms.includes("facebook")) {
    fbResult = await postToFacebook(item.imageUrl, item.caption || "", item.linkUrl || undefined);

    // Log the result
    await db.insert(socialPostsLog).values({
      id: crypto.randomUUID(),
      queueId: item.id,
      platform: "facebook",
      contentType: item.contentType as "gallery_photo" | "spotify_track" | "artist_profile",
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

    if (fbResult.success) {
      postedPlatforms.push("facebook");
    }
  }

  // Post to Instagram
  if (platforms.includes("instagram") && !postedPlatforms.includes("instagram")) {
    igResult = await postToInstagram(item.imageUrl, item.caption || "");

    // Log the result
    await db.insert(socialPostsLog).values({
      id: crypto.randomUUID(),
      queueId: item.id,
      platform: "instagram",
      contentType: item.contentType as "gallery_photo" | "spotify_track" | "artist_profile",
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

    if (igResult.success) {
      postedPlatforms.push("instagram");
    }
  }

  // Update queue item status
  const allTargetPlatformsPosted = platforms.every((p) => postedPlatforms.includes(p));
  const anyFailed = (!fbResult.success && platforms.includes("facebook") && !postedPlatforms.includes("facebook")) ||
                    (!igResult.success && platforms.includes("instagram") && !postedPlatforms.includes("instagram"));

  let newStatus: "posted" | "failed" | "pending" = "pending";
  if (allTargetPlatformsPosted) {
    newStatus = "posted";
  } else if (anyFailed && postedPlatforms.length === 0) {
    newStatus = "failed";
  }
  // If some platforms succeeded but not all, keep as "pending" so the cron retries

  await db
    .update(socialPostQueue)
    .set({
      status: newStatus,
      postedPlatforms: JSON.stringify(postedPlatforms),
      postedAt: allTargetPlatformsPosted ? new Date() : undefined,
      errorMessage: anyFailed
        ? `FB: ${fbResult.error || "ok"} | IG: ${igResult.error || "ok"}`
        : null,
      updatedAt: new Date(),
    })
    .where(eq(socialPostQueue.id, item.id));

  return { queueId: item.id, facebook: fbResult, instagram: igResult };
}

// Type helper — the queue item as returned from DB
interface SocialPostQueueWithId {
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

// ===========================================
// CAPTION TEMPLATES
// ===========================================

export interface CaptionContext {
  contentType: "gallery_photo" | "spotify_track" | "artist_profile";
  artistName?: string;
  artistRole?: string;
  releaseTitle?: string;
  releaseType?: string;
  photoTitle?: string;
  photoLocation?: string;
  photographer?: string;
  linkUrl?: string;
  spotifyUrl?: string;
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
      const photoCredit = ctx.photographer ? `Foto: ${ctx.photographer}` : "";
      const location = ctx.photoLocation ? ` ${ctx.photoLocation}` : "";
      const artistTag = ctx.artistName ? ` ${ctx.artistName}` : "";

      if (ctx.artistName) {
        return [
          `${ctx.artistName} en accion${location}`,
          photoCredit,
          "",
          `Descubre mas de ${ctx.artistName} en ${ctx.linkUrl || `${siteUrl}/artistas`}`,
          "",
          hashtags,
        ]
          .filter(Boolean)
          .join("\n");
      }

      return [
        `Sonido Liquido Crew${location}`,
        photoCredit,
        "",
        `Mas en ${siteUrl}`,
        "",
        hashtags,
      ]
        .filter(Boolean)
        .join("\n");
    }

    case "spotify_track": {
      const typeLabel = ctx.releaseType === "album" ? "el album" : ctx.releaseType === "ep" ? "el EP" : "el sencillo";
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

// Re-export for convenience
export { isMetaConfigured, getInstagramBusinessAccountId, getPageAccessToken };
