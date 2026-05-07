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
} from "@/db/schema";
import { eq, desc, sql as drizzleSql, and, count, isNotNull } from "drizzle-orm";
import {
  isMetaConfigured,
  validateToken,
  processQueueItem,
  getNextPendingItem,
  ensurePublicImageUrl,
  generateCaption,
  type PostQueueItemResult,
} from "@/lib/clients/meta";
import { isTikTokConfigured, validateTikTokToken } from "@/lib/clients/tiktok";
import { socialCredentials } from "@/db/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sonidoliquido.com";

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
  if (!isMetaConfigured()) {
    return NextResponse.json({
      success: false,
      message: "Meta API not configured. Set META_SYSTEM_USER_TOKEN and FACEBOOK_PAGE_ID env vars.",
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
  platforms?: string[];
}) {
  try {
    const {
      includeGallery = true,
      includeReleases = true,
      includeArtists = true,
      includeCuratedTracks = true,
      platforms,
    } = options;

    // Default platforms: FB + IG + TikTok (TikTok is included but will be skipped if not configured)
    const targetPlatforms = platforms || ["facebook", "instagram", "tiktok"];
    const platformsJson = JSON.stringify(targetPlatforms);

    // Get existing items to avoid duplicates
    const existing = await db.select().from(socialPostQueue);
    const existingSourceIds = new Set(existing.map((item) => `${item.contentType}:${item.sourceId}`));
    console.log(`[Social API Populate] Found ${existing.length} existing queue items`);

    let queueOrder = existing.length > 0
      ? Math.max(...existing.map((item) => item.queueOrder)) + 1
      : 0;

    let galleryCount = 0;
    let releasesCount = 0;
    let artistsCount = 0;
    let curatedCount = 0;

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
          })
          .from(curatedTracks)
          .where(eq(curatedTracks.isAvailableForPlaylist, true))
          .orderBy(desc(curatedTracks.popularity));

        for (const track of tracks) {
          if (!track.albumImageUrl) continue;

          const key = `curated_track:${track.id}`;
          if (existingSourceIds.has(key)) continue;

          const caption = generateCaption({
            contentType: "curated_track",
            artistName: track.artistName,
            trackName: track.name,
            albumName: track.albumName || undefined,
            spotifyUrl: track.spotifyTrackUrl,
            linkUrl: `${SITE_URL}/discografia`,
          });

          await db.insert(socialPostQueue).values({
            id: crypto.randomUUID(),
            contentType: "curated_track",
            sourceId: track.id,
            artistId: null,
            releaseId: null,
            imageUrl: track.albumImageUrl,
            caption,
            linkUrl: `${SITE_URL}/discografia`,
            queueOrder: queueOrder++,
            cycleNumber: 1,
            status: "pending",
            platforms: platformsJson,
            postedPlatforms: "[]",
          });

          existingSourceIds.add(key);
          curatedCount++;
        }
      } catch (err) {
        console.warn("[Social API Populate] Curated tracks table may not exist yet:", err);
      }
    }

    // ========================================
    // Summary
    // ========================================
    const totalAdded = galleryCount + releasesCount + artistsCount + curatedCount;
    console.log(`[Social API Populate] Complete! Added ${totalAdded} new items`);

    return NextResponse.json({
      success: true,
      message: `Cola poblada exitosamente. Se añadieron ${totalAdded} items nuevos.`,
      details: {
        galleryPhotos: galleryCount,
        releases: releasesCount,
        artistProfiles: artistsCount,
        curatedTracks: curatedCount,
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

    return {
      galleryPhotos: galleryCount[0]?.count || 0,
      releases: releasesCount[0]?.count || 0,
      artists: artistsCount[0]?.count || 0,
      curatedTracks: curatedTracksCount,
    };
  } catch (error) {
    console.warn("[Social API] Error getting content counts:", error);
    return {
      galleryPhotos: 0,
      releases: 0,
      artists: 0,
      curatedTracks: 0,
    };
  }
}
