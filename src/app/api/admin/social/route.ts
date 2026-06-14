// ===========================================
// ADMIN API: SOCIAL AUTO-POSTING
// GET  — Queue status + summary
// POST — Actions: process-next, populate, reset-cycle, skip-item, validate-token, retry-failed
// ===========================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  socialPostQueue,
  socialPostsLog,
  artists,
  releases,
  releaseArtists,
  galleryPhotos,
  curatedTracks,
  curatedSpotifyChannels,
  verticalVideos,
  videos,
  events,
} from "@/db/schema";
import { eq, desc, sql as drizzleSql, and, count, isNotNull, gt } from "drizzle-orm";
import {
  isMetaConfiguredAsync,
  validateToken,
  processQueueItem,
  getNextPendingItem,
  ensurePublicImageUrl,
  generateCaption,
  generateAICaption,
  postToFacebook,
  postToInstagram,
  postToInstagramStory,
  postInstagramReel,
  postFacebookReel,
  type PostQueueItemResult,
  type FacebookReelResult,
} from "@/lib/clients/meta";
// TikTok integration removed per user request
import { socialCredentials } from "@/db/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sonidoliquido.com";

/**
 * Extract YouTube video ID from various URL formats.
 * Works with watch URLs, shorts URLs, embed URLs, and youtu.be shortlinks.
 */
function extractYouTubeId(
  videoUrl?: string | null,
  platformUrl?: string | null,
  embedUrl?: string | null
): string | null {
  const urls = [embedUrl, platformUrl, videoUrl].filter(Boolean);
  for (const url of urls) {
    if (!url) continue;
    // embed/VIDEO_ID
    const embedMatch = url.match(/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) return embedMatch[1];
    // shorts/VIDEO_ID or watch?v=VIDEO_ID
    const watchMatch = url.match(/(?:shorts\/|watch\?v=)([a-zA-Z0-9_-]+)/);
    if (watchMatch) return watchMatch[1];
    // youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) return shortMatch[1];
  }
  return null;
}

// ===========================================
// GET — Queue status & summary
// ===========================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    // Schedule config endpoint — used by the Netlify cron function
    if (action === "schedule-config") {
      const config = await getScheduleConfig();
      return NextResponse.json({ success: true, data: config });
    }

    // Get queue summary
    const queueSummary = await db
      .select({
        status: socialPostQueue.status,
        count: count(),
      })
      .from(socialPostQueue)
      .groupBy(socialPostQueue.status);

    const summaryMap: Record<string, number> = {};
    for (const row of queueSummary) {
      summaryMap[row.status] = row.count;
    }

    // Get content type breakdown
    const contentBreakdown = await db
      .select({
        contentType: socialPostQueue.contentType,
        count: count(),
      })
      .from(socialPostQueue)
      .groupBy(socialPostQueue.contentType);

    const contentMap: Record<string, number> = {};
    for (const row of contentBreakdown) {
      contentMap[row.contentType] = row.count;
    }

    // Get current cycle info
    const cycleInfo = await db
      .select({
        maxCycle: drizzleSql`MAX(CAST(${socialPostQueue.cycleNumber} AS INTEGER))`,
      })
      .from(socialPostQueue);

    const currentCycle = Number(cycleInfo[0]?.maxCycle) || 0;

    // Get recent post history (last 20)
    const recentLogs = await db
      .select()
      .from(socialPostsLog)
      .orderBy(desc(socialPostsLog.postedAt))
      .limit(20);

    // Get next pending items (preview)
    const nextPending = await db
      .select()
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "pending"))
      .orderBy(socialPostQueue.queueOrder)
      .limit(10);

    // Meta API configuration status
    // Check both env vars and DB credentials
    const metaDbCreds = await db
      .select()
      .from(socialCredentials)
      .where(eq(socialCredentials.platform, "meta"));
    const metaCredMap = new Map(metaDbCreds.map((c) => [c.key, c.value]));

    const metaStatus = {
      configured: !!(
        (process.env.META_SYSTEM_USER_TOKEN || metaCredMap.get("META_SYSTEM_USER_TOKEN")) &&
        (process.env.FACEBOOK_PAGE_ID || metaCredMap.get("FACEBOOK_PAGE_ID"))
      ),
      appId: !!(process.env.META_APP_ID || metaCredMap.get("META_APP_ID")),
      appSecret: !!(process.env.META_APP_SECRET || metaCredMap.get("META_APP_SECRET")),
      systemUserToken: !!(process.env.META_SYSTEM_USER_TOKEN || metaCredMap.get("META_SYSTEM_USER_TOKEN")),
      facebookPageId: !!(process.env.FACEBOOK_PAGE_ID || metaCredMap.get("FACEBOOK_PAGE_ID")),
    };

    // Get available content counts for population
    const contentCounts = await getContentCounts();

    return NextResponse.json({
      success: true,
      data: {
        queue: {
          total: Object.values(summaryMap).reduce((a, b) => a + b, 0),
          pending: summaryMap["pending"] || 0,
          processing: summaryMap["processing"] || 0,
          posted: summaryMap["posted"] || 0,
          failed: summaryMap["failed"] || 0,
          skipped: summaryMap["skipped"] || 0,
          byContentType: contentMap,
          currentCycle,
        },
        nextPending,
        recentLogs,
        metaStatus,
        contentCounts,
        scheduleConfig: await getScheduleConfig(),
      },
    });
  } catch (error) {
    console.error("[Social API] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch queue status" },
      { status: 500 }
    );
  }
}

// ===========================================
// POST — Actions
// ===========================================

export async function POST(request: NextRequest) {
  try {
    // Ensure we always return JSON, never HTML error pages
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const action = body.action as string;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Missing 'action' field in request body" },
        { status: 400 }
      );
    }

    switch (action) {
      case "process-next":
        return await handleProcessNext();
      case "populate":
        return await handlePopulate(body.options as Record<string, unknown> || {});
      case "post-upcoming-release":
        return await handlePostUpcomingRelease(body as Parameters<typeof handlePostUpcomingRelease>[0]);
      case "post-reel":
        return await handlePostReel(body as Parameters<typeof handlePostReel>[0]);
      case "post-upcoming-event":
        return await handlePostUpcomingEvent(body as Parameters<typeof handlePostUpcomingEvent>[0]);
      case "autopost-upcoming-event":
        return await handleAutopostUpcomingEvent();
      case "reset-cycle":
        return await handleResetCycle();
      case "skip-item":
        return await handleSkipItem(body.queueId as string);
      case "validate-token":
        return await handleValidateToken();
      case "retry-failed":
        return await handleRetryFailed();
      case "clear-queue":
        return await handleClearQueue();
      case "validate-reel-token":
        return await handleValidateReelToken();
      case "save-schedule-config":
        return await handleSaveScheduleConfig(body);
      case "generate-ai-caption":
        return await handleGenerateAICaption(body);
      case "debug-autopost":
        return await handleDebugAutopost();
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Social API] POST error:", error);
    // ALWAYS return JSON — never let Next.js return an HTML error page
    const errorMessage = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json(
      { success: false, error: errorMessage, message: `Error interno: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// ===========================================
// ACTION HANDLERS
// ===========================================

async function handleProcessNext() {
  if (!(await isMetaConfiguredAsync())) {
    return NextResponse.json({
      success: false,
      message: "Meta API not configured. Set META_SYSTEM_USER_TOKEN and FACEBOOK_PAGE_ID in the credentials section below, or as Netlify env vars.",
    });
  }

  const nextItem = await getNextPendingItem();
  if (!nextItem) {
    return NextResponse.json({
      success: false,
      message: "No pending items in queue. All items have been posted or queue is empty. Populate the queue first.",
    });
  }

  // Ensure image URL is publicly accessible for Meta API
  nextItem.imageUrl = ensurePublicImageUrl(nextItem.imageUrl);

  console.log(`[Social API] Processing queue item: ${nextItem.contentType} (${nextItem.sourceId})`);

  const result = await processQueueItem(nextItem);

  const fbStatus = result.facebook.success ? "success" : `failed: ${result.facebook.error || "unknown error"}`;
  const igStatus = result.instagram.success ? "success" : `failed: ${result.instagram.error || "unknown error"}`;

  return NextResponse.json({
    success: result.facebook.success || result.instagram.success,
    message: `Posted to FB: ${fbStatus}, IG: ${igStatus}`,
    result,
  });
}

// ===========================================
// POST UPCOMING RELEASE — Direct post from upcoming releases editor
// ===========================================

async function handlePostUpcomingRelease(body: {
  imageUrl?: string;
  caption?: string;
  linkUrl?: string;
  releaseId?: string;
  platforms?: string[];
}) {
  const { imageUrl, caption, linkUrl, releaseId, platforms = ["facebook", "instagram"] } = body;

  if (!imageUrl) {
    return NextResponse.json({
      success: false,
      message: "Se requiere una imagen (portada) para publicar",
    });
  }

  if (!caption) {
    return NextResponse.json({
      success: false,
      message: "Se requiere un caption para publicar",
    });
  }

  if (!(await isMetaConfiguredAsync())) {
    return NextResponse.json({
      success: false,
      message: "Meta API no configurada. Configura META_SYSTEM_USER_TOKEN y FACEBOOK_PAGE_ID en la sección de credenciales de /admin/social.",
    });
  }

  // Pre-validate the token before attempting the post
  const tokenInfo = await validateToken();
  if (!tokenInfo.isValid) {
    const errorDetail = tokenInfo.raw?.message || "Token inválido";
    const errorCode = tokenInfo.raw?.code || "";
    let guidance = "";
    if (errorCode === 190 || errorDetail.includes("Invalid OAuth") || errorDetail.includes("Cannot parse")) {
      guidance = " El token parece ser inválido o ha expirado. Genera un nuevo System User Token en business.facebook.com → Business Settings → Users → System Users.";
    }
    return NextResponse.json({
      success: false,
      message: `Token de Meta API inválido: ${errorDetail}.${guidance}`,
      tokenError: { code: errorCode, message: errorDetail, type: tokenInfo.raw?.type },
    });
  }

  // Ensure image URL is publicly accessible for Meta API
  const publicImageUrl = ensurePublicImageUrl(imageUrl);

  console.log(`[Social API] Direct post for upcoming release: ${releaseId || "unknown"}`);

  const results: {
    facebook?: { success: boolean; postId?: string; postUrl?: string; error?: string };
    instagram?: { success: boolean; mediaId?: string; permalink?: string; error?: string };
  } = {};

  // Post to Facebook
  if (platforms.includes("facebook")) {
    const fbResult = await postToFacebook(publicImageUrl, caption, linkUrl);
    results.facebook = {
      success: fbResult.success,
      postId: fbResult.postId || undefined,
      postUrl: fbResult.postUrl || undefined,
      error: fbResult.error || undefined,
    };

    // Log the result
    try {
      await db.insert(socialPostsLog).values({
        id: crypto.randomUUID(),
        queueId: `direct-${releaseId || crypto.randomUUID()}`,
        platform: "facebook",
        contentType: "spotify_track",
        sourceId: releaseId || "upcoming-release-direct",
        imageUrl: publicImageUrl,
        caption,
        linkUrl: linkUrl || null,
        platformPostId: fbResult.postId,
        platformPostUrl: fbResult.postUrl,
        metaApiResponse: null,
        status: fbResult.success ? "success" : "failed",
        errorMessage: fbResult.error || null,
        postedAt: new Date(),
      } as any);
    } catch (logError) {
      console.error("[Social API] Failed to log FB result:", logError);
    }
  }

  // Post to Instagram
  if (platforms.includes("instagram")) {
    const igResult = await postToInstagram(publicImageUrl, caption);
    results.instagram = {
      success: igResult.success,
      mediaId: igResult.mediaId || undefined,
      permalink: igResult.permalink || undefined,
      error: igResult.error || undefined,
    };

    // Log the result
    try {
      await db.insert(socialPostsLog).values({
        id: crypto.randomUUID(),
        queueId: `direct-${releaseId || crypto.randomUUID()}`,
        platform: "instagram",
        contentType: "spotify_track",
        sourceId: releaseId || "upcoming-release-direct",
        imageUrl: publicImageUrl,
        caption,
        linkUrl: linkUrl || null,
        platformPostId: igResult.mediaId,
        platformPostUrl: igResult.permalink,
        metaApiResponse: null,
        status: igResult.success ? "success" : "failed",
        errorMessage: igResult.error || null,
        postedAt: new Date(),
      } as any);
    } catch (logError) {
      console.error("[Social API] Failed to log IG result:", logError);
    }
  }

  const anySuccess = results.facebook?.success || results.instagram?.success;
  const errorMessages: string[] = [];
  if (results.facebook && !results.facebook.success) errorMessages.push(`FB: ${results.facebook.error}`);
  if (results.instagram && !results.instagram.success) errorMessages.push(`IG: ${results.instagram.error}`);

  return NextResponse.json({
    success: anySuccess,
    message: anySuccess
      ? `Publicado exitosamente en ${results.facebook?.success ? "Facebook" : ""}${results.facebook?.success && results.instagram?.success ? " e " : ""}${results.instagram?.success ? "Instagram" : ""}`
      : `Error al publicar: ${errorMessages.join(", ")}`,
    results,
  });
}

// ===========================================
// POST REEL — Post a video as Reel on IG and/or FB
// ===========================================

async function handlePostReel(body: {
  videoUrl: string;
  caption: string;
  platforms?: string[];
  releaseId?: string;
  releaseTitle?: string;
}) {
  const { videoUrl, caption, platforms = ["instagram", "facebook"], releaseId, releaseTitle } = body;

  if (!videoUrl) {
    return NextResponse.json({
      success: false,
      message: "Se requiere un video (URL) para publicar como Reel",
    });
  }

  if (!caption) {
    return NextResponse.json({
      success: false,
      message: "Se requiere un caption para publicar como Reel",
    });
  }

  if (!(await isMetaConfiguredAsync())) {
    return NextResponse.json({
      success: false,
      message: "Meta API no configurada. Configura META_SYSTEM_USER_TOKEN y FACEBOOK_PAGE_ID en la sección de credenciales de /admin/social.",
    });
  }

  // Pre-validate the token before attempting the reel post
  const tokenInfo = await validateToken();
  if (!tokenInfo.isValid) {
    const errorDetail = tokenInfo.raw?.message || "Token inválido";
    const errorCode = tokenInfo.raw?.code || "";
    let guidance = "";
    if (errorCode === 190 || errorDetail.includes("Invalid OAuth") || errorDetail.includes("Cannot parse")) {
      guidance = " El token parece ser inválido o ha expirado. Genera un nuevo System User Token en business.facebook.com → Business Settings → Users → System Users.";
    }
    return NextResponse.json({
      success: false,
      message: `Token de Meta API inválido: ${errorDetail}.${guidance}`,
      tokenError: { code: errorCode, message: errorDetail, type: tokenInfo.raw?.type },
    });
  }

  console.log(`[Social API] Posting Reel for upcoming release: ${releaseTitle || releaseId || "unknown"}`);

  const results: {
    instagram?: { success: boolean; mediaId?: string; permalink?: string; error?: string };
    facebook?: { success: boolean; reelId?: string; postUrl?: string; error?: string };
  } = {};

  // Post to Instagram as Reel
  if (platforms.includes("instagram")) {
    const igResult = await postInstagramReel(videoUrl, caption, true);
    results.instagram = {
      success: igResult.success,
      mediaId: igResult.mediaId || undefined,
      permalink: igResult.permalink || undefined,
      error: igResult.error || undefined,
    };

    // Log the result
    try {
      await db.insert(socialPostsLog).values({
        id: crypto.randomUUID(),
        queueId: `reel-${releaseId || crypto.randomUUID()}`,
        platform: "instagram_reel",
        contentType: "vertical_video",
        sourceId: releaseId || "upcoming-release-reel",
        imageUrl: videoUrl,
        caption,
        linkUrl: null,
        platformPostId: igResult.mediaId,
        platformPostUrl: igResult.permalink,
        metaApiResponse: null,
        status: igResult.success ? "success" : "failed",
        errorMessage: igResult.error || null,
        postedAt: new Date(),
      } as any);
    } catch (logError) {
      console.error("[Social API] Failed to log IG Reel result:", logError);
    }
  }

  // Post to Facebook as Reel
  if (platforms.includes("facebook")) {
    const fbResult = await postFacebookReel(videoUrl, caption);
    results.facebook = {
      success: fbResult.success,
      reelId: fbResult.reelId || undefined,
      postUrl: fbResult.postUrl || undefined,
      error: fbResult.error || undefined,
    };

    // Log the result
    try {
      await db.insert(socialPostsLog).values({
        id: crypto.randomUUID(),
        queueId: `reel-${releaseId || crypto.randomUUID()}`,
        platform: "facebook_reel",
        contentType: "vertical_video",
        sourceId: releaseId || "upcoming-release-reel",
        imageUrl: videoUrl,
        caption,
        linkUrl: null,
        platformPostId: fbResult.reelId,
        platformPostUrl: fbResult.postUrl,
        metaApiResponse: null,
        status: fbResult.success ? "success" : "failed",
        errorMessage: fbResult.error || null,
        postedAt: new Date(),
      } as any);
    } catch (logError) {
      console.error("[Social API] Failed to log FB Reel result:", logError);
    }
  }

  const anySuccess = results.instagram?.success || results.facebook?.success;
  const errorMessages: string[] = [];
  if (results.instagram && !results.instagram.success) errorMessages.push(`IG Reel: ${results.instagram.error}`);
  if (results.facebook && !results.facebook.success) errorMessages.push(`FB Reel: ${results.facebook.error}`);

  const successPlatforms: string[] = [];
  if (results.instagram?.success) successPlatforms.push("Instagram Reels");
  if (results.facebook?.success) successPlatforms.push("Facebook Reels");

  return NextResponse.json({
    success: anySuccess,
    message: anySuccess
      ? `Reel publicado exitosamente en ${successPlatforms.join(" y ")}`
      : `Error al publicar Reel: ${errorMessages.join(", ")}`,
    results,
  });
}

/**
 * Populate the queue from existing site content.
 * This is the main action that fills the queue with items to post.
 * It reads gallery photos, releases, artist profiles, and curated tracks from the DB.
 */
async function handlePopulate(options: {
  includeGallery?: boolean;
  includeReleases?: boolean;
  includeArtists?: boolean;
  includeCuratedTracks?: boolean;
  includeVerticalVideos?: boolean;
  includeYoutubeVideos?: boolean;
  includeEvents?: boolean;
  platforms?: string[];
  force?: boolean; // If true, re-add items even if they already exist in the queue
}) {
  try {
    const {
      includeGallery = true,
      includeReleases = true,
      includeArtists = true,
      includeCuratedTracks = true,
      includeVerticalVideos = true,
      includeYoutubeVideos = true,
      includeEvents = true,
      platforms,
      force = false,
    } = options;

    // Default platforms: FB + IG
    const targetPlatforms = platforms || ["facebook", "instagram"];
    const platformsJson = JSON.stringify(targetPlatforms);

    // Get existing items to avoid duplicates (unless force is enabled)
    const existing = await db.select().from(socialPostQueue);
    const existingSourceIds = force
      ? new Set<string>() // Force mode: allow duplicates
      : new Set(existing.map((item) => `${item.contentType}:${item.sourceId}`));
    console.log(`[Social API Populate] Found ${existing.length} existing queue items${force ? " (force mode: duplicates allowed)" : ""}`);

    let queueOrder = existing.length > 0
      ? Math.max(...existing.map((item) => item.queueOrder)) + 1
      : 0;

    let galleryCount = 0;
    let releasesCount = 0;
    let artistsCount = 0;
    let curatedCount = 0;
    let reelsCount = 0;
    let youtubeVideosCount = 0;
    let eventsCount = 0;

    // ========================================
    // 1. Gallery Photos
    // ========================================
    if (includeGallery) {
      console.log("[Social API Populate] Processing gallery photos...");

      const photos = await db
        .select({
          id: galleryPhotos.id,
          title: galleryPhotos.title,
          imageUrl: galleryPhotos.imageUrl,
          artistId: galleryPhotos.artistId,
          location: galleryPhotos.location,
          photographer: galleryPhotos.photographer,
        })
        .from(galleryPhotos)
        .where(eq(galleryPhotos.isPublished, true))
        .orderBy(galleryPhotos.sortOrder);

      // Get artist names
      const allArtists = await db.select({
        id: artists.id,
        name: artists.name,
        slug: artists.slug,
        role: artists.role,
      }).from(artists).where(eq(artists.isActive, true));

      const artistMap = new Map(allArtists.map((a) => [a.id, a]));

      for (const photo of photos) {
        const key = `gallery_photo:${photo.id}`;
        if (existingSourceIds.has(key)) continue;

        const artist = photo.artistId ? artistMap.get(photo.artistId) : null;
        const caption = generateCaption({
          contentType: "gallery_photo",
          artistName: artist?.name,
          photoTitle: photo.title || undefined,
          photoLocation: photo.location || undefined,
          photographer: photo.photographer || undefined,
          linkUrl: artist ? `${SITE_URL}/artistas/${artist.slug}` : `${SITE_URL}/galeria`,
        });

        await db.insert(socialPostQueue).values({
          id: crypto.randomUUID(),
          contentType: "gallery_photo",
          sourceId: photo.id,
          artistId: photo.artistId || null,
          releaseId: null,
          imageUrl: photo.imageUrl,
          caption,
          linkUrl: artist ? `${SITE_URL}/artistas/${artist.slug}` : `${SITE_URL}/galeria`,
          queueOrder: queueOrder++,
          cycleNumber: 1,
          status: "pending",
          platforms: platformsJson,
          postedPlatforms: "[]",
        } as any);

        existingSourceIds.add(key);
        galleryCount++;
      }
    }

    // ========================================
    // 2. Releases (Spotify tracks with cover art)
    // ========================================
    if (includeReleases) {
      console.log("[Social API Populate] Processing releases...");

      const allReleases = await db
        .select({
          id: releases.id,
          title: releases.title,
          slug: releases.slug,
          releaseType: releases.releaseType,
          releaseDate: releases.releaseDate,
          coverImageUrl: releases.coverImageUrl,
          spotifyUrl: releases.spotifyUrl,
        })
        .from(releases)
        .where(eq(releases.isUpcoming, false))
        .orderBy(releases.releaseDate);

      const allArtists = await db.select({
        id: artists.id,
        name: artists.name,
        slug: artists.slug,
        role: artists.role,
      }).from(artists).where(eq(artists.isActive, true));

      const artistMap = new Map(allArtists.map((a) => [a.id, a]));

      const releaseArtistRows = await db.select().from(releaseArtists);
      const releaseArtistMap = new Map<string, string[]>();
      for (const ra of releaseArtistRows) {
        const existing = releaseArtistMap.get(ra.releaseId) || [];
        existing.push(ra.artistId);
        releaseArtistMap.set(ra.releaseId, existing);
      }

      for (const release of allReleases) {
        if (!release.coverImageUrl) continue;

        const key = `spotify_track:${release.id}`;
        if (existingSourceIds.has(key)) continue;

        const artistIds = releaseArtistMap.get(release.id) || [];
        const primaryArtistId = artistIds[0];
        const primaryArtist = primaryArtistId ? artistMap.get(primaryArtistId) : null;

        const caption = generateCaption({
          contentType: "spotify_track",
          artistName: primaryArtist?.name,
          artistRole: primaryArtist?.role || undefined,
          releaseTitle: release.title,
          releaseType: release.releaseType,
          releaseDate: release.releaseDate,
          spotifyUrl: release.spotifyUrl || undefined,
          linkUrl: `${SITE_URL}/lanzamientos/${release.slug}`,
        });

        await db.insert(socialPostQueue).values({
          id: crypto.randomUUID(),
          contentType: "spotify_track",
          sourceId: release.id,
          artistId: primaryArtistId || null,
          releaseId: release.id,
          imageUrl: release.coverImageUrl,
          caption,
          linkUrl: `${SITE_URL}/lanzamientos/${release.slug}`,
          queueOrder: queueOrder++,
          cycleNumber: 1,
          status: "pending",
          platforms: platformsJson,
          postedPlatforms: "[]",
        } as any);

        existingSourceIds.add(key);
        releasesCount++;
      }
    }

    // ========================================
    // 3. Artist Profiles
    // ========================================
    if (includeArtists) {
      console.log("[Social API Populate] Processing artist profiles...");

      const allArtists = await db.select({
        id: artists.id,
        name: artists.name,
        slug: artists.slug,
        role: artists.role,
        profileImageUrl: artists.profileImageUrl,
        featuredImageUrl: artists.featuredImageUrl,
      }).from(artists).where(eq(artists.isActive, true));

      for (const artist of allArtists) {
        const imageUrl = artist.featuredImageUrl || artist.profileImageUrl;
        if (!imageUrl) continue;

        const key = `artist_profile:${artist.id}`;
        if (existingSourceIds.has(key)) continue;

        const caption = generateCaption({
          contentType: "artist_profile",
          artistName: artist.name,
          artistRole: artist.role,
          linkUrl: `${SITE_URL}/artistas/${artist.slug}`,
        });

        await db.insert(socialPostQueue).values({
          id: crypto.randomUUID(),
          contentType: "artist_profile",
          sourceId: artist.id,
          artistId: artist.id,
          releaseId: null,
          imageUrl,
          caption,
          linkUrl: `${SITE_URL}/artistas/${artist.slug}`,
          queueOrder: queueOrder++,
          cycleNumber: 1,
          status: "pending",
          platforms: platformsJson,
          postedPlatforms: "[]",
        } as any);

        existingSourceIds.add(key);
        artistsCount++;
      }
    }

    // ========================================
    // 4. Curated Tracks (from curated Spotify artists)
    // ========================================
    if (includeCuratedTracks) {
      console.log("[Social API Populate] Processing curated tracks...");

      try {
        const tracks = await db
          .select({
            id: curatedTracks.id,
            spotifyTrackId: curatedTracks.spotifyTrackId,
            spotifyTrackUrl: curatedTracks.spotifyTrackUrl,
            name: curatedTracks.name,
            artistName: curatedTracks.artistName,
            albumName: curatedTracks.albumName,
            albumImageUrl: curatedTracks.albumImageUrl,
            curatedChannelId: curatedTracks.curatedChannelId,
            popularity: curatedTracks.popularity,
          })
          .from(curatedTracks)
          .where(eq(curatedTracks.isAvailableForPlaylist, true))
          .orderBy(desc(curatedTracks.popularity));

        console.log(`[Social API Populate] Found ${tracks.length} curated tracks available for playlist`);

        let skippedNoImage = 0;
        let skippedDuplicate = 0;

        for (const track of tracks) {
          if (!track.albumImageUrl) {
            skippedNoImage++;
            continue;
          }

          const key = `curated_track:${track.id}`;
          if (existingSourceIds.has(key)) {
            skippedDuplicate++;
            continue;
          }

          // Use the specific Spotify track URL as the link
          // This gives users a direct link to listen to the track
          const trackLinkUrl = track.spotifyTrackUrl || `${SITE_URL}/discografia`;

          const caption = generateCaption({
            contentType: "curated_track",
            artistName: track.artistName,
            trackName: track.name,
            albumName: track.albumName || undefined,
            spotifyUrl: track.spotifyTrackUrl,
            linkUrl: trackLinkUrl,
          });

          await db.insert(socialPostQueue).values({
            id: crypto.randomUUID(),
            contentType: "curated_track",
            sourceId: track.id,
            artistId: null,
            releaseId: null,
            imageUrl: track.albumImageUrl,
            caption,
            linkUrl: trackLinkUrl,
            queueOrder: queueOrder++,
            cycleNumber: 1,
            status: "pending",
            platforms: platformsJson,
            postedPlatforms: "[]",
          } as any);

          existingSourceIds.add(key);
          curatedCount++;
        }

        console.log(
          `[Social API Populate] Curated tracks: ${curatedCount} added, ${skippedNoImage} skipped (no image), ${skippedDuplicate} skipped (duplicate)`
        );
      } catch (err) {
        console.error("[Social API Populate] Curated tracks error:", err);
        // Return the error details in the response so the admin can see what went wrong
        return NextResponse.json({
          success: false,
          message: `Error al procesar tracks curados: ${err instanceof Error ? err.message : String(err)}`,
          error: "curated_tracks_error",
          details: {
            galleryPhotos: galleryCount,
            releases: releasesCount,
            artistProfiles: artistsCount,
            curatedTracks: curatedCount,
            verticalVideos: reelsCount,
            youtubeVideos: youtubeVideosCount,
            totalAdded: galleryCount + releasesCount + artistsCount + curatedCount + reelsCount + youtubeVideosCount,
          },
        }, { status: 500 });
      }
    }

    // ========================================
    // 5. Vertical Videos (Reels / Shorts)
    // ========================================
    if (includeVerticalVideos) {
      console.log("[Social API Populate] Processing vertical videos (reels)...");

      try {
        const videos = await db
          .select({
            id: verticalVideos.id,
            title: verticalVideos.title,
            thumbnailUrl: verticalVideos.thumbnailUrl,
            videoUrl: verticalVideos.videoUrl,
            artistId: verticalVideos.artistId,
            platform: verticalVideos.platform,
            platformUrl: verticalVideos.platformUrl,
            embedUrl: verticalVideos.embedUrl,
          })
          .from(verticalVideos)
          .where(eq(verticalVideos.isPublished, true))
          .orderBy(verticalVideos.displayOrder);

        // Get artist names (reuse the allArtists map if available, otherwise fetch)
        const allArtistsVV = await db.select({
          id: artists.id,
          name: artists.name,
          slug: artists.slug,
          role: artists.role,
        }).from(artists).where(eq(artists.isActive, true));
        const artistMapVV = new Map(allArtistsVV.map((a) => [a.id, a]));

        for (const video of videos) {
          // Use thumbnail as the image for social post
          // Auto-generate YouTube thumbnails if no explicit thumbnail exists
          let imageUrl = video.thumbnailUrl;

          if (!imageUrl) {
            // Try to auto-generate YouTube thumbnail from video URL
            const ytId = extractYouTubeId(video.videoUrl, video.platformUrl, video.embedUrl);
            if (ytId) {
              imageUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
            }
          }

          // Don't skip videos without thumbnails — include them in the queue
          // For videos without thumbnails, use the video URL itself as imageUrl
          // The admin UI handles broken images with a fallback icon
          if (!imageUrl) {
            imageUrl = video.videoUrl || `${SITE_URL}/reels`;
          }

          // For vertical videos, store the video URL in linkUrl so processQueueItem
          // can use it for Reel posting. Also store the website link separately.
          // Format: "VIDEO_URL|||WEBSITE_URL" — processQueueItem will parse this.
          const artist = video.artistId ? artistMapVV.get(video.artistId) : null;
          const videoUrl = video.videoUrl || video.platformUrl || "";
          const websiteUrl = artist
            ? `${SITE_URL}/artistas/${artist.slug}`
            : video.platformUrl || `${SITE_URL}/reels`;
          const linkUrlValue = videoUrl ? `${videoUrl}|||${websiteUrl}` : websiteUrl;

          const key = `vertical_video:${video.id}`;
          if (existingSourceIds.has(key)) continue;

          const caption = generateCaption({
            contentType: "vertical_video",
            artistName: artist?.name,
            videoTitle: video.title || undefined,
            videoPlatform: video.platform || undefined,
            linkUrl: artist
              ? `${SITE_URL}/artistas/${artist.slug}`
              : `${SITE_URL}/reels`,
          });

          await db.insert(socialPostQueue).values({
            id: crypto.randomUUID(),
            contentType: "vertical_video",
            sourceId: video.id,
            artistId: video.artistId || null,
            releaseId: null,
            imageUrl,
            caption,
            linkUrl: linkUrlValue,
            queueOrder: queueOrder++,
            cycleNumber: 1,
            status: "pending",
            platforms: platformsJson,
            postedPlatforms: "[]",
          } as any);

          existingSourceIds.add(key);
          reelsCount++;
        }
      } catch (err) {
        console.warn("[Social API Populate] Vertical videos table may not exist yet:", err);
      }
    }

    // ========================================
    // 6. YouTube Videos (music videos from the videos table)
    // ========================================
    if (includeYoutubeVideos) {
      console.log("[Social API Populate] Processing YouTube videos...");

      try {
        const ytVideos = await db
          .select({
            id: videos.id,
            title: videos.title,
            youtubeId: videos.youtubeId,
            youtubeUrl: videos.youtubeUrl,
            thumbnailUrl: videos.thumbnailUrl,
            artistId: videos.artistId,
            releaseId: videos.releaseId,
          })
          .from(videos)
          .orderBy(videos.displayOrder);

        // Get artist names
        const allArtistsYT = await db.select({
          id: artists.id,
          name: artists.name,
          slug: artists.slug,
          role: artists.role,
        }).from(artists).where(eq(artists.isActive, true));
        const artistMapYT = new Map(allArtistsYT.map((a) => [a.id, a]));

        for (const video of ytVideos) {
          // Generate YouTube thumbnail URL if no explicit thumbnail exists
          let imageUrl = video.thumbnailUrl;
          if (!imageUrl && video.youtubeId) {
            imageUrl = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
          }
          if (!imageUrl) continue; // Skip videos without any image available

          const key = `youtube_video:${video.id}`;
          if (existingSourceIds.has(key)) continue;

          const artist = video.artistId ? artistMapYT.get(video.artistId) : null;
          const caption = generateCaption({
            contentType: "youtube_video",
            artistName: artist?.name,
            videoTitle: video.title || undefined,
            videoPlatform: "youtube",
            linkUrl: video.youtubeUrl || (artist ? `${SITE_URL}/artistas/${artist.slug}` : `${SITE_URL}/videos`),
          });

          await db.insert(socialPostQueue).values({
            id: crypto.randomUUID(),
            contentType: "youtube_video",
            sourceId: video.id,
            artistId: video.artistId || null,
            releaseId: video.releaseId || null,
            imageUrl,
            caption,
            linkUrl: video.youtubeUrl || (artist ? `${SITE_URL}/artistas/${artist.slug}` : `${SITE_URL}/videos`),
            queueOrder: queueOrder++,
            cycleNumber: 1,
            status: "pending",
            platforms: platformsJson,
            postedPlatforms: "[]",
          } as any);

          existingSourceIds.add(key);
          youtubeVideosCount++;
        }

        console.log(`[Social API Populate] YouTube videos: ${youtubeVideosCount} added`);
      } catch (err) {
        console.warn("[Social API Populate] YouTube videos table may not exist yet:", err);
      }
    }

    // ========================================
    // 7. Upcoming Events
    // ========================================
    if (includeEvents) {
      console.log("[Social API Populate] Processing upcoming events...");

      try {
        // Only include future events (not past or cancelled)
        const now = new Date();
        const upcomingEvents = await db
          .select({
            id: events.id,
            title: events.title,
            venue: events.venue,
            city: events.city,
            country: events.country,
            eventDate: events.eventDate,
            eventTime: events.eventTime,
            ticketUrl: events.ticketUrl,
            imageUrl: events.imageUrl,
            isFeatured: events.isFeatured,
          })
          .from(events)
          .where(
            and(
              gt(events.eventDate, now),
              eq(events.isCancelled, false)
            )
          )
          .orderBy(events.eventDate);

        console.log(`[Social API Populate] Found ${upcomingEvents.length} upcoming events`);

        let skippedNoImage = 0;

        for (const event of upcomingEvents) {
          if (!event.imageUrl) {
            skippedNoImage++;
            continue;
          }

          const key = `event:${event.id}`;
          if (existingSourceIds.has(key)) continue;

          // Build the event page link
          // Events use /proximos/[slug] or /proximos depending on URL structure
          const eventLinkUrl = `${SITE_URL}/proximos`;

          const caption = generateCaption({
            contentType: "event",
            eventTitle: event.title,
            eventVenue: event.venue,
            eventCity: event.city,
            eventDate: event.eventDate,
            eventTime: event.eventTime || undefined,
            ticketUrl: event.ticketUrl || undefined,
            linkUrl: eventLinkUrl,
          });

          // Prioritize featured events by giving them lower queue order
          // (they'll be posted sooner in the rotation)
          const priorityOrder = event.isFeatured ? 0 : queueOrder;

          await db.insert(socialPostQueue).values({
            id: crypto.randomUUID(),
            contentType: "event",
            sourceId: event.id,
            artistId: null,
            releaseId: null,
            imageUrl: event.imageUrl,
            caption,
            linkUrl: eventLinkUrl,
            queueOrder: event.isFeatured ? priorityOrder : queueOrder,
            cycleNumber: 1,
            status: "pending",
            platforms: platformsJson,
            postedPlatforms: "[]",
          } as any);

          existingSourceIds.add(key);
          queueOrder++;
          eventsCount++;
        }

        console.log(
          `[Social API Populate] Events: ${eventsCount} added, ${skippedNoImage} skipped (no image)`
        );
      } catch (err) {
        console.warn("[Social API Populate] Events table may not exist yet:", err);
      }
    }

    // ========================================
    // Summary
    // ========================================
    const totalAdded = galleryCount + releasesCount + artistsCount + curatedCount + reelsCount + youtubeVideosCount + eventsCount;
    console.log(`[Social API Populate] Complete! Added ${totalAdded} new items`);

    return NextResponse.json({
      success: true,
      message: `Cola poblada exitosamente. Se añadieron ${totalAdded} items nuevos.`,
      details: {
        galleryPhotos: galleryCount,
        releases: releasesCount,
        artistProfiles: artistsCount,
        curatedTracks: curatedCount,
        verticalVideos: reelsCount,
        youtubeVideos: youtubeVideosCount,
        events: eventsCount,
        totalAdded,
        platforms: targetPlatforms,
      },
    });
  } catch (error) {
    console.error("[Social API] Populate error:", error);
    return NextResponse.json({
      success: false,
      message: "Error al poblar la cola",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

// ===========================================
// POST UPCOMING EVENT — Direct post for events from admin
// ===========================================

async function handlePostUpcomingEvent(body: {
  eventId?: string;
  imageUrl?: string;
  caption?: string;
  linkUrl?: string;
  platforms?: string[];
}) {
  const { eventId, imageUrl, caption, linkUrl, platforms = ["facebook", "instagram"] } = body;

  // If eventId is provided, fetch event details from DB
  let finalImageUrl = imageUrl;
  let finalCaption = caption;
  let finalLinkUrl = linkUrl;

  if (eventId) {
    const eventRows = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    const event = eventRows[0];
    if (event) {
      finalImageUrl = finalImageUrl || event.imageUrl || undefined;
      finalLinkUrl = finalLinkUrl || `${SITE_URL}/proximos`;

      if (!finalCaption) {
        finalCaption = generateCaption({
          contentType: "event",
          eventTitle: event.title,
          eventVenue: event.venue,
          eventCity: event.city,
          eventDate: event.eventDate,
          eventTime: event.eventTime || undefined,
          ticketUrl: event.ticketUrl || undefined,
          linkUrl: finalLinkUrl,
        });
      }
    }
  }

  if (!finalImageUrl) {
    return NextResponse.json({
      success: false,
      message: "Se requiere una imagen (portada del evento) para publicar",
    });
  }

  if (!finalCaption) {
    return NextResponse.json({
      success: false,
      message: "Se requiere un caption para publicar",
    });
  }

  if (!(await isMetaConfiguredAsync())) {
    return NextResponse.json({
      success: false,
      message: "Meta API no configurada. Configura META_SYSTEM_USER_TOKEN y FACEBOOK_PAGE_ID en la sección de credenciales de /admin/social.",
    });
  }

  // Pre-validate the token before attempting the post
  const tokenInfo = await validateToken();
  if (!tokenInfo.isValid) {
    const errorDetail = tokenInfo.raw?.message || "Token inválido";
    const errorCode = tokenInfo.raw?.code || "";
    let guidance = "";
    if (errorCode === 190 || errorDetail.includes("Invalid OAuth") || errorDetail.includes("Cannot parse")) {
      guidance = " El token parece ser inválido o ha expirado. Genera un nuevo System User Token en business.facebook.com → Business Settings → Users → System Users.";
    }
    return NextResponse.json({
      success: false,
      message: `Token de Meta API inválido: ${errorDetail}.${guidance}`,
      tokenError: { code: errorCode, message: errorDetail, type: tokenInfo.raw?.type },
    });
  }

  // Ensure image URL is publicly accessible for Meta API
  const publicImageUrl = ensurePublicImageUrl(finalImageUrl);

  console.log(`[Social API] Direct post for upcoming event: ${eventId || "unknown"}`);

  const results: {
    facebook?: { success: boolean; postId?: string; postUrl?: string; error?: string };
    instagram_story?: { success: boolean; mediaId?: string; permalink?: string; error?: string };
  } = {};

  // Post to Facebook (feed post)
  if (platforms.includes("facebook")) {
    const fbResult = await postToFacebook(publicImageUrl, finalCaption, finalLinkUrl);
    results.facebook = {
      success: fbResult.success,
      postId: fbResult.postId || undefined,
      postUrl: fbResult.postUrl || undefined,
      error: fbResult.error || undefined,
    };

    // Log the result
    try {
      await db.insert(socialPostsLog).values({
        id: crypto.randomUUID(),
        queueId: `event-${eventId || crypto.randomUUID()}`,
        platform: "facebook",
        contentType: "event",
        sourceId: eventId || "event-direct",
        imageUrl: publicImageUrl,
        caption: finalCaption,
        linkUrl: finalLinkUrl || null,
        platformPostId: fbResult.postId,
        platformPostUrl: fbResult.postUrl,
        metaApiResponse: null,
        status: fbResult.success ? "success" : "failed",
        errorMessage: fbResult.error || null,
        postedAt: new Date(),
      } as any);
    } catch (logError) {
      console.error("[Social API] Failed to log FB event result:", logError);
    }
  }

  // Post to Instagram as a Story (events always go to Stories on IG)
  if (platforms.includes("instagram")) {
    const igResult = await postToInstagramStory(publicImageUrl, finalCaption, finalLinkUrl);
    results.instagram_story = {
      success: igResult.success,
      mediaId: igResult.mediaId || undefined,
      permalink: igResult.permalink || undefined,
      error: igResult.error || undefined,
    };

    // Log the result
    try {
      await db.insert(socialPostsLog).values({
        id: crypto.randomUUID(),
        queueId: `event-${eventId || crypto.randomUUID()}`,
        platform: "instagram_story",
        contentType: "event",
        sourceId: eventId || "event-direct",
        imageUrl: publicImageUrl,
        caption: finalCaption,
        linkUrl: finalLinkUrl || null,
        platformPostId: igResult.mediaId,
        platformPostUrl: igResult.permalink,
        metaApiResponse: null,
        status: igResult.success ? "success" : "failed",
        errorMessage: igResult.error || null,
        postedAt: new Date(),
      } as any);
    } catch (logError) {
      console.error("[Social API] Failed to log IG Story event result:", logError);
    }
  }

  const anySuccess = results.facebook?.success || results.instagram_story?.success;
  const errorMessages: string[] = [];
  if (results.facebook && !results.facebook.success) errorMessages.push(`FB: ${results.facebook.error}`);
  if (results.instagram_story && !results.instagram_story.success) errorMessages.push(`IG Story: ${results.instagram_story.error}`);

  return NextResponse.json({
    success: anySuccess,
    message: anySuccess
      ? `Evento publicado exitosamente en ${results.facebook?.success ? "Facebook" : ""}${results.facebook?.success && results.instagram_story?.success ? " e " : ""}${results.instagram_story?.success ? "Instagram Story" : ""}`
      : `Error al publicar evento: ${errorMessages.join(", ")}`,
    results,
  });
}

// ===========================================
// DEBUG AUTOPOST — Diagnostic endpoint for troubleshooting why posts aren't going out
// ===========================================

async function handleDebugAutopost() {
  const now = new Date();
  const diagnostics: Record<string, unknown> = {
    timestamp: now.toISOString(),
    timestampUTC: now.toUTCString(),
  };

  // 1. Check Meta API configuration
  const metaConfigured = await isMetaConfiguredAsync();
  diagnostics.metaConfigured = metaConfigured;

  if (metaConfigured) {
    try {
      const tokenInfo = await validateToken();
      diagnostics.tokenValid = tokenInfo.isValid;
      diagnostics.tokenError = tokenInfo.isValid ? null : (tokenInfo.raw?.message || "Invalid token");
    } catch (err) {
      diagnostics.tokenValid = false;
      diagnostics.tokenError = err instanceof Error ? err.message : "Token validation failed";
    }
  }

  // 2. Check schedule config
  try {
    const config = await getScheduleConfig();
    diagnostics.scheduleConfig = config;

    // Calculate UTC schedule hours
    const CST_OFFSET = 6;
    const utcScheduleHours = config.scheduleHours.map(h => (h + CST_OFFSET) % 24);
    const currentHourUTC = now.getUTCHours();
    const currentHourCST = (currentHourUTC - CST_OFFSET + 24) % 24;

    diagnostics.currentTimeUTC = currentHourUTC;
    diagnostics.currentTimeCST = currentHourCST;
    diagnostics.utcScheduleHours = utcScheduleHours;
    diagnostics.shouldPostNow = utcScheduleHours.includes(currentHourUTC);
    diagnostics.nextScheduledCST = config.scheduleHours
      .map(h => ({ cst: h, utc: (h + CST_OFFSET) % 24 }))
      .sort((a, b) => a.utc - b.utc)
      .find(entry => entry.utc > currentHourUTC)?.cst || config.scheduleHours[0];
  } catch (err) {
    diagnostics.scheduleConfigError = err instanceof Error ? err.message : "Failed to read schedule config";
  }

  // 3. Check queue status
  try {
    const pendingCount = await db
      .select({ count: count() })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "pending"));

    const processingCount = await db
      .select({ count: count() })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "processing"));

    diagnostics.queuePending = pendingCount[0]?.count || 0;
    diagnostics.queueProcessing = processingCount[0]?.count || 0;

    // Stuck processing items (processing for > 10 minutes)
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const stuckItems = await db
      .select({ id: socialPostQueue.id, contentType: socialPostQueue.contentType, updatedAt: socialPostQueue.updatedAt })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "processing"))
      .limit(10);

    diagnostics.stuckProcessingItems = stuckItems.filter(item => {
      const updated = item.updatedAt ? new Date(item.updatedAt) : null;
      return updated && updated < tenMinutesAgo;
    }).length;
  } catch (err) {
    diagnostics.queueError = err instanceof Error ? err.message : "Failed to read queue";
  }

  // 4. Check upcoming events
  try {
    const upcomingEvents = await db
      .select({
        id: events.id,
        title: events.title,
        eventDate: events.eventDate,
        imageUrl: events.imageUrl,
        isCancelled: events.isCancelled,
      })
      .from(events)
      .where(eq(events.isCancelled, false))
      .orderBy(events.eventDate)
      .limit(5);

    diagnostics.upcomingEvents = upcomingEvents.map(e => ({
      id: e.id,
      title: e.title,
      eventDate: e.eventDate,
      hasImage: !!e.imageUrl,
      isPast: new Date(e.eventDate) < now,
    }));
  } catch (err) {
    diagnostics.eventsError = err instanceof Error ? err.message : "Failed to read events";
  }

  // 5. Check recent post log
  try {
    const recentLogs = await db
      .select({
        id: socialPostsLog.id,
        platform: socialPostsLog.platform,
        contentType: socialPostsLog.contentType,
        status: socialPostsLog.status,
        errorMessage: socialPostsLog.errorMessage,
        postedAt: socialPostsLog.postedAt,
        queueId: socialPostsLog.queueId,
      })
      .from(socialPostsLog)
      .orderBy(desc(socialPostsLog.postedAt))
      .limit(10);

    diagnostics.recentLogs = recentLogs.map(l => ({
      platform: l.platform,
      contentType: l.contentType,
      status: l.status,
      errorMessage: l.errorMessage,
      postedAt: l.postedAt ? new Date(l.postedAt).toISOString() : null,
      queueId: l.queueId,
    }));

    // Check if any posts were made today (CST day)
    const startOfDayCST = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 6 * 60 * 60 * 1000);
    const todayPosts = recentLogs.filter(l =>
      l.status === "success" &&
      l.postedAt &&
      new Date(l.postedAt) >= startOfDayCST
    );
    diagnostics.todayPostsCount = todayPosts.length;
    diagnostics.todayPosts = todayPosts.map(l => ({
      platform: l.platform,
      contentType: l.contentType,
      queueId: l.queueId,
      postedAt: l.postedAt ? new Date(l.postedAt).toISOString() : null,
    }));
  } catch (err) {
    diagnostics.logsError = err instanceof Error ? err.message : "Failed to read logs";
  }

  // 6. Check DB credentials (schedule config stored in DB)
  try {
    const creds = await db
      .select({ key: socialCredentials.key, value: socialCredentials.value })
      .from(socialCredentials)
      .where(eq(socialCredentials.platform, "meta"));

    const credKeys = creds.map(c => c.key);
    diagnostics.dbCredentialKeys = credKeys;
    diagnostics.hasAutopostScheduleHours = credKeys.includes("AUTOPOST_SCHEDULE_HOURS");
    diagnostics.hasAutopostPostsPerRun = credKeys.includes("AUTOPOST_POSTS_PER_RUN");
    diagnostics.hasAutopostMaxPostsPerDay = credKeys.includes("AUTOPOST_MAX_POSTS_PER_DAY");

    // Show the actual schedule hours value (don't expose secrets)
    const scheduleHoursCred = creds.find(c => c.key === "AUTOPOST_SCHEDULE_HOURS");
    diagnostics.autopostScheduleHoursValue = scheduleHoursCred?.value || null;
  } catch (err) {
    diagnostics.credentialsError = err instanceof Error ? err.message : "Failed to read credentials";
  }

  // 7. Identify likely issues
  const issues: string[] = [];
  if (!metaConfigured) issues.push("Meta API is not configured — META_SYSTEM_USER_TOKEN and/or FACEBOOK_PAGE_ID are missing");
  if (diagnostics.tokenValid === false) issues.push(`Meta API token is invalid: ${diagnostics.tokenError}`);
  if ((diagnostics.queuePending as number) === 0) issues.push("Queue has no pending items — populate the queue first");
  if ((diagnostics.stuckProcessingItems as number) > 0) issues.push(`${diagnostics.stuckProcessingItems} items stuck in 'processing' status — they may need to be reset`);
  if (!diagnostics.hasAutopostScheduleHours) issues.push("AUTOPOST_SCHEDULE_HOURS not found in DB — schedule config may not have been saved (cron will use defaults: 4am, 10am, 3pm CST)");
  if ((diagnostics.upcomingEvents as unknown[])?.length === 0) issues.push("No upcoming events found in the database");
  if ((diagnostics.todayPostsCount as number) === 0) issues.push("No successful posts today — the cron may not be running or may be skipping this hour");

  diagnostics.likelyIssues = issues.length > 0 ? issues : ["No obvious issues found — check Netlify function logs for the social-auto-post cron"];

  return NextResponse.json({
    success: true,
    diagnostics,
  });
}

// ===========================================
// AUTOPOST UPCOMING EVENT — Independent event posting for the cron job
// ===========================================
// This handler is called by the social-auto-post cron function 3 times/day.
// It posts the nearest upcoming event to FB (feed post) + IG (Story) independently
// of the regular queue rotation. Event posts do NOT count against the queue's daily limit.
// Dedup is tiered based on event proximity:
//   - More than 1 week away: 2x/day (12-hour dedup window)
//   - Within 1 week of the event: 3x/day (8-hour dedup window)
//
// Instagram uses Stories (not feed posts or Reels) for events — Stories create
// urgency and match the time-sensitive nature of upcoming events.

async function handleAutopostUpcomingEvent() {
  if (!(await isMetaConfiguredAsync())) {
    return NextResponse.json({
      success: false,
      message: "Meta API not configured. Cannot autopost events.",
    });
  }

  try {
    // Find the nearest upcoming event (future date, not cancelled, has image)
    const now = new Date();
    const upcomingEvents = await db
      .select({
        id: events.id,
        title: events.title,
        venue: events.venue,
        city: events.city,
        country: events.country,
        eventDate: events.eventDate,
        eventTime: events.eventTime,
        ticketUrl: events.ticketUrl,
        imageUrl: events.imageUrl,
        isFeatured: events.isFeatured,
      })
      .from(events)
      .where(
        and(
          gt(events.eventDate, now),
          eq(events.isCancelled, false),
          isNotNull(events.imageUrl)
        )
      )
      .orderBy(events.eventDate)
      .limit(5); // Check top 5 in case the nearest was recently posted

    if (upcomingEvents.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No upcoming events with images to autopost.",
        noEvents: true,
      });
    }

    // Tiered event posting frequency based on proximity:
    // - More than 1 week away: 2 times/day → 12-hour dedup window (43200s)
    // - Within 1 week of the event: 3 times/day → 8-hour dedup window (28800s)
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const DEDUP_FAR_MS = 12 * 60 * 60;  // 12 hours in seconds (events >1 week away)
    const DEDUP_NEAR_MS = 8 * 60 * 60;   // 8 hours in seconds (events within 1 week)

    let selectedEvent: typeof upcomingEvents[0] | null = null;
    let selectedDedupWindow = DEDUP_FAR_MS;

    for (const event of upcomingEvents) {
      // Determine dedup window based on how close the event is
      const timeUntilEvent = new Date(event.eventDate).getTime() - now.getTime();
      const dedupWindow = timeUntilEvent <= ONE_WEEK_MS ? DEDUP_NEAR_MS : DEDUP_FAR_MS;

      const recentlyPosted = await db
        .select({ id: socialPostsLog.id })
        .from(socialPostsLog)
        .where(
          and(
            eq(socialPostsLog.contentType, "event"),
            eq(socialPostsLog.sourceId, event.id),
            eq(socialPostsLog.status, "success"),
            drizzleSql`${socialPostsLog.postedAt} > (unixepoch() - ${dedupWindow})`
          )
        )
        .limit(1);

      if (recentlyPosted.length === 0) {
        selectedEvent = event;
        selectedDedupWindow = dedupWindow;
        break;
      }

      const dedupHours = dedupWindow / 3600;
      console.log(`[Social API] Event "${event.title}" was posted in last ${dedupHours}h, skipping.`);
    }

    if (!selectedEvent) {
      return NextResponse.json({
        success: false,
        message: "All upcoming events were already posted recently.",
        alreadyPosted: true,
      });
    }

    // Generate caption and post
    const eventLinkUrl = `${SITE_URL}/proximos`;
    const caption = generateCaption({
      contentType: "event",
      eventTitle: selectedEvent.title,
      eventVenue: selectedEvent.venue,
      eventCity: selectedEvent.city,
      eventDate: selectedEvent.eventDate,
      eventTime: selectedEvent.eventTime || undefined,
      ticketUrl: selectedEvent.ticketUrl || undefined,
      linkUrl: eventLinkUrl,
    });

    const publicImageUrl = ensurePublicImageUrl(selectedEvent.imageUrl!);

    console.log(`[Social API] Autoposting upcoming event: ${selectedEvent.title} (${selectedEvent.id})`);

    const results: {
      facebook?: { success: boolean; postId?: string; postUrl?: string; error?: string };
      instagram_story?: { success: boolean; mediaId?: string; permalink?: string; error?: string };
    } = {};

    const platforms = ["facebook", "instagram_story"];

    // Post to Facebook (regular feed post)
    if (platforms.includes("facebook")) {
      const fbResult = await postToFacebook(publicImageUrl, caption, eventLinkUrl);
      results.facebook = {
        success: fbResult.success,
        postId: fbResult.postId || undefined,
        postUrl: fbResult.postUrl || undefined,
        error: fbResult.error || undefined,
      };

      // Log with queueId prefix "autopost-event" so we can distinguish these from manual posts
      try {
        await db.insert(socialPostsLog).values({
          id: crypto.randomUUID(),
          queueId: `autopost-event-${selectedEvent.id}`,
          platform: "facebook",
          contentType: "event",
          sourceId: selectedEvent.id,
          imageUrl: publicImageUrl,
          caption,
          linkUrl: eventLinkUrl,
          platformPostId: fbResult.postId,
          platformPostUrl: fbResult.postUrl,
          metaApiResponse: null,
          status: fbResult.success ? "success" : "failed",
          errorMessage: fbResult.error || null,
          postedAt: new Date(),
        } as any);
      } catch (logError) {
        console.error("[Social API] Failed to log autopost FB event result:", logError);
      }
    }

    // Post to Instagram as a Story (not feed post, not Reel)
    // Events go to Stories for more visibility and urgency — they disappear after 24h,
    // which matches the time-sensitive nature of upcoming events.
    if (platforms.includes("instagram_story")) {
      const igResult = await postToInstagramStory(publicImageUrl, caption, eventLinkUrl);
      results.instagram_story = {
        success: igResult.success,
        mediaId: igResult.mediaId || undefined,
        permalink: igResult.permalink || undefined,
        error: igResult.error || undefined,
      };

      try {
        await db.insert(socialPostsLog).values({
          id: crypto.randomUUID(),
          queueId: `autopost-event-${selectedEvent.id}`,
          platform: "instagram_story",
          contentType: "event",
          sourceId: selectedEvent.id,
          imageUrl: publicImageUrl,
          caption,
          linkUrl: eventLinkUrl,
          platformPostId: igResult.mediaId,
          platformPostUrl: igResult.permalink,
          metaApiResponse: null,
          status: igResult.success ? "success" : "failed",
          errorMessage: igResult.error || null,
          postedAt: new Date(),
        } as any);
      } catch (logError) {
        console.error("[Social API] Failed to log autopost IG Story event result:", logError);
      }
    }

    const anySuccess = results.facebook?.success || results.instagram_story?.success;
    const errorMessages: string[] = [];
    if (results.facebook && !results.facebook.success) errorMessages.push(`FB: ${results.facebook.error}`);
    if (results.instagram_story && !results.instagram_story.success) errorMessages.push(`IG Story: ${results.instagram_story.error}`);

    return NextResponse.json({
      success: anySuccess,
      message: anySuccess
        ? `Evento autoposteado: "${selectedEvent.title}" en ${results.facebook?.success ? "Facebook" : ""}${results.facebook?.success && results.instagram_story?.success ? " e " : ""}${results.instagram_story?.success ? "Instagram Story" : ""}`
        : `Error al autopostear evento "${selectedEvent.title}": ${errorMessages.join(", ")}`,
      event: {
        id: selectedEvent.id,
        title: selectedEvent.title,
        venue: selectedEvent.venue,
        city: selectedEvent.city,
        eventDate: selectedEvent.eventDate,
      },
      results,
    });
  } catch (error) {
    console.error("[Social API] Autopost upcoming event error:", error);
    return NextResponse.json({
      success: false,
      message: "Error al autopostear evento próximo",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

async function handleResetCycle() {
  try {
    // First count how many will be reset
    const postedItems = await db
      .select({ count: count() })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "posted"));

    const skippedItems = await db
      .select({ count: count() })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "skipped"));

    const processingItems = await db
      .select({ count: count() })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "processing"));

    const resetCount = (postedItems[0]?.count || 0) + (skippedItems[0]?.count || 0) + (processingItems[0]?.count || 0);

    // Reset all posted, skipped, and processing items to pending for a new cycle
    await db
      .update(socialPostQueue)
      .set({
        status: "pending",
        postedPlatforms: "[]",
        errorMessage: null,
        postedAt: null,
        updatedAt: new Date(),
      } as any)
      .where(
        drizzleSql`${socialPostQueue.status} IN ('posted', 'skipped', 'processing')`
      );

    return NextResponse.json({
      success: true,
      message: `Se reiniciaron ${resetCount} items a pendientes para un nuevo ciclo.`,
    });
  } catch (error) {
    console.error("[Social API] Reset cycle error:", error);
    return NextResponse.json({
      success: false,
      message: "Error al reiniciar ciclo",
    });
  }
}

async function handleSkipItem(queueId: string) {
  if (!queueId) {
    return NextResponse.json(
      { success: false, error: "queueId is required" },
      { status: 400 }
    );
  }

  await db
    .update(socialPostQueue)
    .set({ status: "skipped", updatedAt: new Date() } as any)
    .where(eq(socialPostQueue.id, queueId));

  return NextResponse.json({
    success: true,
    message: "Item saltado",
  });
}

async function handleValidateToken() {
  const tokenInfo = await validateToken();
  return NextResponse.json({
    success: true,
    data: tokenInfo,
  });
}

async function handleValidateReelToken() {
  // Pre-validate the Meta token for reel posting
  // Returns detailed info about what's ready and what's missing
  if (!(await isMetaConfiguredAsync())) {
    return NextResponse.json({
      success: false,
      data: {
        configured: false,
        message: "Meta API no configurada. Configura META_SYSTEM_USER_TOKEN y FACEBOOK_PAGE_ID en /admin/social.",
        canPostReel: false,
      },
    });
  }

  const tokenInfo = await validateToken();
  if (!tokenInfo.isValid) {
    const errorDetail = tokenInfo.raw?.message || "Token inválido";
    const errorCode = tokenInfo.raw?.code || "";
    let guidance = "";
    if (errorCode === 190 || errorDetail.includes("Invalid OAuth") || errorDetail.includes("Cannot parse")) {
      guidance = "Genera un nuevo System User Token en business.facebook.com → Business Settings → Users → System Users.";
    }
    return NextResponse.json({
      success: false,
      data: {
        configured: true,
        tokenValid: false,
        message: `Token inválido: ${errorDetail}`,
        guidance,
        canPostReel: false,
        error: { code: errorCode, message: errorDetail },
      },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      configured: true,
      tokenValid: true,
      pageAccessible: tokenInfo.pageAccessible,
      igAccountAccessible: tokenInfo.igAccountAccessible,
      canPostReel: tokenInfo.pageAccessible || tokenInfo.igAccountAccessible,
      message: tokenInfo.igAccountAccessible
        ? "Token válido. Se puede publicar en Instagram Reels y Facebook Reels."
        : tokenInfo.pageAccessible
          ? "Token válido. Se puede publicar en Facebook Reels pero no se encontró cuenta de Instagram Business."
          : "Token válido pero no se puede acceder a la página de Facebook ni a la cuenta de Instagram.",
    },
  });
}

async function handleRetryFailed() {
  try {
    // Count failed items first
    const failedItems = await db
      .select({ count: count() })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "failed"));

    const failedCount = failedItems[0]?.count || 0;

    // Also count stuck "processing" items (from crashed runs)
    const processingItems = await db
      .select({ count: count() })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "processing"));

    const processingCount = processingItems[0]?.count || 0;

    // Reset all failed items to pending
    await db
      .update(socialPostQueue)
      .set({
        status: "pending",
        postedPlatforms: "[]",
        errorMessage: null,
        updatedAt: new Date(),
      } as any)
      .where(eq(socialPostQueue.status, "failed"));

    // Also recover stuck "processing" items back to "pending"
    await db
      .update(socialPostQueue)
      .set({
        status: "pending",
        updatedAt: new Date(),
      } as any)
      .where(eq(socialPostQueue.status, "processing"));

    const totalReset = failedCount + processingCount;
    const message = processingCount > 0
      ? `Se reiniciaron ${failedCount} items fallidos y ${processingCount} items atorados a pendientes para reintento.`
      : `Se reiniciaron ${failedCount} items fallidos a pendientes para reintento.`;

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("[Social API] Retry failed error:", error);
    return NextResponse.json({
      success: false,
      message: "Error al reintentar items fallidos",
    });
  }
}

async function handleClearQueue() {
  try {
    // Only clear pending items (not posted or in-progress)
    const pendingItems = await db
      .select({ count: count() })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "pending"));

    const pendingCount = pendingItems[0]?.count || 0;

    await db
      .delete(socialPostQueue)
      .where(eq(socialPostQueue.status, "pending"));

    return NextResponse.json({
      success: true,
      message: `Se eliminaron ${pendingCount} items pendientes de la cola.`,
    });
  } catch (error) {
    console.error("[Social API] Clear queue error:", error);
    return NextResponse.json({
      success: false,
      message: "Error al limpiar cola",
    });
  }
}

// ===========================================
// HELPER: Get content counts for population preview
// ===========================================

async function getContentCounts() {
  try {
    const galleryCount = await db
      .select({ count: count() })
      .from(galleryPhotos)
      .where(eq(galleryPhotos.isPublished, true));

    const releasesCount = await db
      .select({ count: count() })
      .from(releases)
      .where(eq(releases.isUpcoming, false));

    const artistsCount = await db
      .select({ count: count() })
      .from(artists)
      .where(eq(artists.isActive, true));

    let curatedTracksCount = 0;
    try {
      const ctCount = await db
        .select({ count: count() })
        .from(curatedTracks)
        .where(eq(curatedTracks.isAvailableForPlaylist, true));
      curatedTracksCount = ctCount[0]?.count || 0;
    } catch {
      // Table may not exist yet
    }

    let verticalVideosCount = 0;
    try {
      const vvCount = await db
        .select({ count: count() })
        .from(verticalVideos)
        .where(eq(verticalVideos.isPublished, true));
      verticalVideosCount = vvCount[0]?.count || 0;
    } catch {
      // Table may not exist yet
    }

    let youtubeVideosCount = 0;
    try {
      const ytvCount = await db
        .select({ count: count() })
        .from(videos);
      youtubeVideosCount = ytvCount[0]?.count || 0;
    } catch {
      // Table may not exist yet
    }

    let eventsCount = 0;
    try {
      const now = new Date();
      const evtCount = await db
        .select({ count: count() })
        .from(events)
        .where(
          and(
            gt(events.eventDate, now),
            eq(events.isCancelled, false)
          )
        );
      eventsCount = evtCount[0]?.count || 0;
    } catch {
      // Table may not exist yet
    }

    return {
      galleryPhotos: galleryCount[0]?.count || 0,
      releases: releasesCount[0]?.count || 0,
      artists: artistsCount[0]?.count || 0,
      curatedTracks: curatedTracksCount,
      verticalVideos: verticalVideosCount,
      youtubeVideos: youtubeVideosCount,
      events: eventsCount,
    };
  } catch (error) {
    console.warn("[Social API] Error getting content counts:", error);
    return {
      galleryPhotos: 0,
      releases: 0,
      artists: 0,
      curatedTracks: 0,
      verticalVideos: 0,
      youtubeVideos: 0,
      events: 0,
    };
  }
}

// ===========================================
// SCHEDULE CONFIG — Store/retrieve posting schedule in social_credentials
// ===========================================
// Keys used: AUTOPOST_SCHEDULE_HOURS (comma-separated hours in Mexico City time, e.g. "4,10,15")
//            AUTOPOST_POSTS_PER_RUN (number of queue items to process per cron run)
//            AUTOPOST_MAX_POSTS_PER_DAY (maximum posts per day)

const DEFAULT_SCHEDULE_HOURS = [4, 10, 15]; // 4am, 10am, 3pm Mexico City time (CST = UTC-6 permanently)
const DEFAULT_POSTS_PER_RUN = 1;
const DEFAULT_MAX_POSTS_PER_DAY = 3;

async function getScheduleConfig(): Promise<{
  scheduleHours: number[];
  postsPerRun: number;
  maxPostsPerDay: number;
}> {
  try {
    const creds = await db
      .select()
      .from(socialCredentials)
      .where(eq(socialCredentials.platform, "meta"));

    const credMap = new Map(creds.map(c => [c.key, c.value]));

    const scheduleHoursStr = credMap.get("AUTOPOST_SCHEDULE_HOURS");
    const postsPerRunStr = credMap.get("AUTOPOST_POSTS_PER_RUN");
    const maxPostsPerDayStr = credMap.get("AUTOPOST_MAX_POSTS_PER_DAY");

    let scheduleHours = DEFAULT_SCHEDULE_HOURS;
    if (scheduleHoursStr) {
      const parsed = scheduleHoursStr.split(",").map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 23);
      if (parsed.length > 0) scheduleHours = parsed.sort((a, b) => a - b);
    }

    let postsPerRun = DEFAULT_POSTS_PER_RUN;
    if (postsPerRunStr) {
      const parsed = parseInt(postsPerRunStr);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) postsPerRun = parsed;
    }

    let maxPostsPerDay = DEFAULT_MAX_POSTS_PER_DAY;
    if (maxPostsPerDayStr) {
      const parsed = parseInt(maxPostsPerDayStr);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 24) maxPostsPerDay = parsed;
    }

    return { scheduleHours, postsPerRun, maxPostsPerDay };
  } catch (error) {
    console.warn("[Social API] Error reading schedule config:", error);
    return {
      scheduleHours: DEFAULT_SCHEDULE_HOURS,
      postsPerRun: DEFAULT_POSTS_PER_RUN,
      maxPostsPerDay: DEFAULT_MAX_POSTS_PER_DAY,
    };
  }
}

async function handleSaveScheduleConfig(body: Record<string, unknown>) {
  try {
    const { scheduleHours, postsPerRun, maxPostsPerDay } = body;

    const configToSave: Array<{ key: string; value: string }> = [];

    if (Array.isArray(scheduleHours)) {
      const validHours = scheduleHours
        .map(Number)
        .filter((n: number) => !isNaN(n) && n >= 0 && n <= 23)
        .sort((a: number, b: number) => a - b);
      if (validHours.length > 0) {
        configToSave.push({ key: "AUTOPOST_SCHEDULE_HOURS", value: validHours.join(",") });
      }
    }

    if (postsPerRun !== undefined) {
      const val = parseInt(String(postsPerRun));
      if (!isNaN(val) && val >= 1 && val <= 10) {
        configToSave.push({ key: "AUTOPOST_POSTS_PER_RUN", value: String(val) });
      }
    }

    if (maxPostsPerDay !== undefined) {
      const val = parseInt(String(maxPostsPerDay));
      if (!isNaN(val) && val >= 1 && val <= 24) {
        configToSave.push({ key: "AUTOPOST_MAX_POSTS_PER_DAY", value: String(val) });
      }
    }

    for (const config of configToSave) {
      const existing = await db
        .select({ id: socialCredentials.id })
        .from(socialCredentials)
        .where(
          and(
            eq(socialCredentials.platform, "meta"),
            eq(socialCredentials.key, config.key)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(socialCredentials)
          .set({ value: config.value, updatedAt: new Date() } as any)
          .where(
            and(
              eq(socialCredentials.platform, "meta"),
              eq(socialCredentials.key, config.key)
            )
          );
      } else {
        await db.insert(socialCredentials).values({
          id: crypto.randomUUID(),
          platform: "meta",
          key: config.key,
          value: config.value,
          isFromUi: true,
        } as any);
      }
    }

    const savedConfig = await getScheduleConfig();

    return NextResponse.json({
      success: true,
      message: "Configuración de horario guardada exitosamente",
      data: savedConfig,
    });
  } catch (error) {
    console.error("[Social API] Save schedule config error:", error);
    return NextResponse.json(
      { success: false, error: "Error al guardar la configuración de horario" },
      { status: 500 }
    );
  }
}

// ===========================================
// GENERATE AI CAPTION — Preview/test AI caption generation
// ===========================================

async function handleGenerateAICaption(body: Record<string, unknown>) {
  try {
    const contentType = body.contentType as string;
    if (!contentType) {
      return NextResponse.json(
        { success: false, error: "contentType is required" },
        { status: 400 }
      );
    }

    const ctx = {
      contentType: contentType as "gallery_photo" | "spotify_track" | "artist_profile" | "curated_track" | "vertical_video" | "youtube_video" | "event",
      artistName: body.artistName as string | undefined,
      artistRole: body.artistRole as string | undefined,
      releaseTitle: body.releaseTitle as string | undefined,
      releaseType: body.releaseType as string | undefined,
      releaseDate: body.releaseDate ? new Date(body.releaseDate as string) : undefined,
      trackName: body.trackName as string | undefined,
      albumName: body.albumName as string | undefined,
      photoLocation: body.photoLocation as string | undefined,
      photographer: body.photographer as string | undefined,
      videoTitle: body.videoTitle as string | undefined,
      videoPlatform: body.videoPlatform as string | undefined,
      linkUrl: body.linkUrl as string | undefined,
      spotifyUrl: body.spotifyUrl as string | undefined,
      eventTitle: body.eventTitle as string | undefined,
      eventVenue: body.eventVenue as string | undefined,
      eventCity: body.eventCity as string | undefined,
      eventDate: body.eventDate ? new Date(body.eventDate as string) : undefined,
      eventTime: body.eventTime as string | undefined,
      ticketUrl: body.ticketUrl as string | undefined,
    };

    // Generate both AI and template captions for comparison
    const [aiCaption, templateCaption] = await Promise.all([
      generateAICaption(ctx, body.variationIndex as number | undefined).catch(() => null),
      Promise.resolve(generateCaption(ctx, body.variationIndex as number | undefined)),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        aiCaption,
        templateCaption,
        context: ctx,
      },
    });
  } catch (error) {
    console.error("[Social API] Generate AI caption error:", error);
    return NextResponse.json(
      { success: false, error: `Error al generar caption: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
