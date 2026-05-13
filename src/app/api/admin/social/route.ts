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
} from "@/db/schema";
import { eq, desc, sql as drizzleSql, and, count, isNotNull } from "drizzle-orm";
import {
  isMetaConfiguredAsync,
  validateToken,
  processQueueItem,
  getNextPendingItem,
  ensurePublicImageUrl,
  generateCaption,
  postToFacebook,
  postToInstagram,
  postInstagramReel,
  postFacebookReel,
  type PostQueueItemResult,
  type FacebookReelResult,
} from "@/lib/clients/meta";
import { isTikTokConfigured, validateTikTokToken } from "@/lib/clients/tiktok";
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

    // TikTok configuration status
    const tiktokDbCreds = await db
      .select()
      .from(socialCredentials)
      .where(eq(socialCredentials.platform, "tiktok"));
    const tiktokCredMap = new Map(tiktokDbCreds.map((c) => [c.key, c.value]));

    const tiktokStatus = {
      configured: !!(
        (process.env.TIKTOK_CLIENT_KEY || tiktokCredMap.get("TIKTOK_CLIENT_KEY")) &&
        (process.env.TIKTOK_ACCESS_TOKEN || tiktokCredMap.get("TIKTOK_ACCESS_TOKEN"))
      ),
      clientKey: !!(process.env.TIKTOK_CLIENT_KEY || tiktokCredMap.get("TIKTOK_CLIENT_KEY")),
      clientSecret: !!(process.env.TIKTOK_CLIENT_SECRET || tiktokCredMap.get("TIKTOK_CLIENT_SECRET")),
      accessToken: !!(process.env.TIKTOK_ACCESS_TOKEN || tiktokCredMap.get("TIKTOK_ACCESS_TOKEN")),
    };

    // Get available content counts for population
    const contentCounts = await getContentCounts();

    return NextResponse.json({
      success: true,
      data: {
        queue: {
          total: Object.values(summaryMap).reduce((a, b) => a + b, 0),
          pending: summaryMap["pending"] || 0,
          posted: summaryMap["posted"] || 0,
          failed: summaryMap["failed"] || 0,
          skipped: summaryMap["skipped"] || 0,
          byContentType: contentMap,
          currentCycle,
        },
        nextPending,
        recentLogs,
        metaStatus,
        tiktokStatus,
        contentCounts,
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
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case "process-next":
        return await handleProcessNext();
      case "populate":
        return await handlePopulate(body.options || {});
      case "post-upcoming-release":
        return await handlePostUpcomingRelease(body);
      case "post-reel":
        return await handlePostReel(body);
      case "reset-cycle":
        return await handleResetCycle();
      case "skip-item":
        return await handleSkipItem(body.queueId);
      case "validate-token":
        return await handleValidateToken();
      case "validate-tiktok":
        return await handleValidateTikTok();
      case "retry-failed":
        return await handleRetryFailed();
      case "clear-queue":
        return await handleClearQueue();
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Social API] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Request failed" },
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

  const fbStatus = result.facebook.success ? "success" : `failed: ${result.facebook.error}`;
  const igStatus = result.instagram.success ? "success" : `failed: ${result.instagram.error}`;
  const tkStatus = result.tiktok.success ? "success" : isTikTokConfigured() ? `failed: ${result.tiktok.error}` : "skipped (not configured)";

  return NextResponse.json({
    success: result.facebook.success || result.instagram.success || result.tiktok.success,
    message: `Posted to FB: ${fbStatus}, IG: ${igStatus}, TikTok: ${tkStatus}`,
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
      message: "Meta API no configurada. Configura META_SYSTEM_USER_TOKEN y FACEBOOK_PAGE_ID en la sección de credenciales o como variables de entorno.",
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
      });
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
      });
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
      message: "Meta API no configurada. Configura META_SYSTEM_USER_TOKEN y FACEBOOK_PAGE_ID en la sección de credenciales.",
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
      });
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
      });
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
      platforms,
      force = false,
    } = options;

    // Default platforms: FB + IG + TikTok (TikTok is included but will be skipped if not configured)
    const targetPlatforms = platforms || ["facebook", "instagram", "tiktok"];
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
        });

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
        });

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
        });

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
          });

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
            totalAdded: galleryCount + releasesCount + artistsCount + curatedCount + reelsCount,
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
          // When posting to Meta, the ensurePublicImageUrl will try its best
          if (!imageUrl) {
            imageUrl = video.videoUrl || `${SITE_URL}/reels`;
          }

          const key = `vertical_video:${video.id}`;
          if (existingSourceIds.has(key)) continue;

          const artist = video.artistId ? artistMapVV.get(video.artistId) : null;
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
            linkUrl: artist
              ? `${SITE_URL}/artistas/${artist.slug}`
              : video.platformUrl || `${SITE_URL}/reels`,
            queueOrder: queueOrder++,
            cycleNumber: 1,
            status: "pending",
            platforms: platformsJson,
            postedPlatforms: "[]",
          });

          existingSourceIds.add(key);
          reelsCount++;
        }
      } catch (err) {
        console.warn("[Social API Populate] Vertical videos table may not exist yet:", err);
      }
    }

    // ========================================
    // Summary
    // ========================================
    const totalAdded = galleryCount + releasesCount + artistsCount + curatedCount + reelsCount;
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

async function handleResetCycle() {
  try {
    // First count how many will be reset
    const postedItems = await db
      .select({ count: count() })
      .from(socialPostQueue)
      .where(eq(socialPostQueue.status, "posted"));

    const resetCount = postedItems[0]?.count || 0;

    // Reset all posted items to pending for a new cycle
    await db
      .update(socialPostQueue)
      .set({
        status: "pending",
        postedPlatforms: "[]",
        errorMessage: null,
        postedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(socialPostQueue.status, "posted"));

    return NextResponse.json({
      success: true,
      message: `Se reiniciaron ${resetCount} items publicados a pendientes para un nuevo ciclo.`,
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
    .set({ status: "skipped", updatedAt: new Date() })
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

async function handleValidateTikTok() {
  const tiktokInfo = await validateTikTokToken();
  return NextResponse.json({
    success: true,
    data: tiktokInfo,
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

    // Reset all failed items to pending
    await db
      .update(socialPostQueue)
      .set({
        status: "pending",
        postedPlatforms: "[]",
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(socialPostQueue.status, "failed"));

    return NextResponse.json({
      success: true,
      message: `Se reiniciaron ${failedCount} items fallidos a pendientes para reintento.`,
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

    return {
      galleryPhotos: galleryCount[0]?.count || 0,
      releases: releasesCount[0]?.count || 0,
      artists: artistsCount[0]?.count || 0,
      curatedTracks: curatedTracksCount,
      verticalVideos: verticalVideosCount,
    };
  } catch (error) {
    console.warn("[Social API] Error getting content counts:", error);
    return {
      galleryPhotos: 0,
      releases: 0,
      artists: 0,
      curatedTracks: 0,
      verticalVideos: 0,
    };
  }
}
