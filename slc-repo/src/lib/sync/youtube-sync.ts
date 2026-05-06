import { youtubeClient, YouTubeClient } from "@/lib/clients";
import { videosRepository, syncJobsRepository } from "@/lib/repositories";
import { db, isDatabaseConfigured } from "@/db/client";
import { youtubeChannels } from "@/db/schema/videos";
import { artists, artistExternalProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// ===========================================
// YOUTUBE SYNC SERVICE
// ===========================================

export interface YouTubeSyncOptions {
  channelIds?: string[]; // YouTube channel IDs to sync
  maxVideosPerChannel?: number;
  force?: boolean;
}

export interface YouTubeSyncResult {
  success: boolean;
  videosProcessed: number;
  videosFailed: number;
  errors: string[];
}

/**
 * Sync videos from YouTube channels.
 *
 * Channel discovery strategy (in priority order):
 * 1. Explicit channelIds passed via options
 * 2. Active channels from the `youtube_channels` table (set up via admin UI)
 * 3. YouTube URLs in `artist_external_profiles` table
 */
export async function syncYouTube(options: YouTubeSyncOptions = {}): Promise<YouTubeSyncResult> {
  const result: YouTubeSyncResult = {
    success: true,
    videosProcessed: 0,
    videosFailed: 0,
    errors: [],
  };

  // Check if YouTube is configured
  if (!youtubeClient.isConfigured()) {
    result.success = false;
    result.errors.push("YouTube API key not configured. Set YOUTUBE_API_KEY environment variable.");
    return result;
  }

  if (!isDatabaseConfigured()) {
    result.success = false;
    result.errors.push("Database not configured");
    return result;
  }

  // Create sync job
  const syncJob = await syncJobsRepository.create({
    source: "youtube",
    status: "running",
    startedAt: new Date(),
  });

  try {
    await syncJobsRepository.addLog(syncJob.id, "info", "Starting YouTube sync");

    // Get channels to sync
    let channelInfos: { channelId: string; artistId: string | null }[] = [];

    if (options.channelIds && options.channelIds.length > 0) {
      // Explicit channel IDs provided
      channelInfos = options.channelIds.map((id) => ({ channelId: id, artistId: null }));
    } else {
      // Strategy 1: Read from youtube_channels table (primary source of truth)
      try {
        const channels = await db
          .select()
          .from(youtubeChannels)
          .where(eq(youtubeChannels.isActive, true));

        for (const channel of channels) {
          // Check if the channelId is a real YouTube channel ID (starts with UC)
          if (channel.channelId.startsWith("UC")) {
            channelInfos.push({ channelId: channel.channelId, artistId: channel.artistId });
          } else {
            // It's a handle or composite ID — try to resolve it
            const channelInfo = YouTubeClient.extractChannelInfo(channel.channelUrl);
            if (channelInfo) {
              if (channelInfo.type === "id") {
                channelInfos.push({ channelId: channelInfo.value, artistId: channel.artistId });
              } else {
                // Resolve handle to channel ID via YouTube API
                try {
                  const resolved = await youtubeClient.getChannelByHandle(channelInfo.value);
                  if (resolved) {
                    channelInfos.push({ channelId: resolved.id, artistId: channel.artistId });

                    // Update the youtube_channels table with the real channel ID
                    try {
                      await db
                        .update(youtubeChannels)
                        .set({
                          channelId: resolved.id,
                          channelName: resolved.snippet?.title || channel.channelName,
                          thumbnailUrl: resolved.snippet?.thumbnails?.high?.url || resolved.snippet?.thumbnails?.default?.url || channel.thumbnailUrl,
                          subscriberCount: resolved.statistics?.subscriberCount ? parseInt(resolved.statistics.subscriberCount, 10) : channel.subscriberCount,
                          updatedAt: new Date(),
                        })
                        .where(eq(youtubeChannels.id, channel.id));
                    } catch (updateErr) {
                      console.warn(`[YouTube Sync] Could not update channel ${channel.id} with resolved ID:`, updateErr);
                    }
                  }
                } catch (error) {
                  result.errors.push(`Failed to resolve handle @${channelInfo.value} for channel ${channel.channelName}`);
                }
              }
            }
          }
        }

        await syncJobsRepository.addLog(
          syncJob.id,
          "info",
          `Found ${channelInfos.length} active channels from youtube_channels table`
        );
      } catch (dbErr) {
        await syncJobsRepository.addLog(syncJob.id, "warning", `Could not read youtube_channels table: ${(dbErr as Error).message}`);
      }

      // Strategy 2: Fallback to artist_external_profiles for artists not already covered
      try {
        const activeArtists = await db
          .select()
          .from(artists)
          .where(eq(artists.isActive, true));

        const coveredArtistIds = new Set(channelInfos.map(c => c.artistId).filter(Boolean));

        for (const artist of activeArtists) {
          if (coveredArtistIds.has(artist.id)) continue; // Already have this artist's channel

          const profiles = await db
            .select()
            .from(artistExternalProfiles)
            .where(and(
              eq(artistExternalProfiles.artistId, artist.id),
              eq(artistExternalProfiles.platform, "youtube")
            ));

          const ytProfile = profiles[0];

          if (ytProfile?.externalUrl) {
            const channelInfo = YouTubeClient.extractChannelInfo(ytProfile.externalUrl);

            if (channelInfo) {
              if (channelInfo.type === "id") {
                channelInfos.push({ channelId: channelInfo.value, artistId: artist.id });
              } else {
                try {
                  const channel = await youtubeClient.getChannelByHandle(channelInfo.value);
                  if (channel) {
                    channelInfos.push({ channelId: channel.id, artistId: artist.id });
                  }
                } catch (error) {
                  result.errors.push(`Failed to resolve channel handle @${channelInfo.value} for ${artist.name}`);
                }
              }
            }
          }
        }
      } catch (dbErr) {
        await syncJobsRepository.addLog(syncJob.id, "warning", `Could not read artist profiles: ${(dbErr as Error).message}`);
      }
    }

    await syncJobsRepository.addLog(
      syncJob.id,
      "info",
      `Found ${channelInfos.length} YouTube channels to sync`
    );

    if (channelInfos.length === 0) {
      result.errors.push("No YouTube channels found. Add channels via the admin YouTube Channels page, or add YouTube URLs to artist profiles.");
    }

    // Sync videos from each channel
    const maxVideos = options.maxVideosPerChannel || 20;

    for (const { channelId, artistId } of channelInfos) {
      try {
        await syncJobsRepository.addLog(syncJob.id, "info", `Syncing videos from channel ${channelId}`);

        const videos = await youtubeClient.getChannelVideos(channelId, maxVideos);

        for (const video of videos) {
          try {
            const existing = await videosRepository.findByYouTubeId(video.id);

            if (existing) {
              // Update existing video
              await videosRepository.update(existing.id, {
                title: video.snippet.title,
                description: video.snippet.description,
                thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
                viewCount: parseInt(video.statistics.viewCount, 10),
                duration: YouTubeClient.parseDuration(video.contentDetails.duration),
              });
            } else {
              // Create new video
              await videosRepository.create({
                title: video.snippet.title,
                description: video.snippet.description,
                youtubeId: video.id,
                youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
                thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
                duration: YouTubeClient.parseDuration(video.contentDetails.duration),
                viewCount: parseInt(video.statistics.viewCount, 10),
                publishedAt: new Date(video.snippet.publishedAt),
                artistId,
              });
            }

            result.videosProcessed++;
          } catch (error) {
            result.videosFailed++;
            result.errors.push(`Failed to sync video ${video.snippet.title}: ${(error as Error).message}`);
          }
        }
      } catch (error) {
        result.errors.push(`Failed to fetch videos from channel ${channelId}: ${(error as Error).message}`);
        await syncJobsRepository.addLog(syncJob.id, "error", `Failed to fetch videos from channel`, {
          channelId,
          error: (error as Error).message,
        });
      }
    }

    // Set overall success based on whether any videos were actually synced
    if (result.videosProcessed === 0 && channelInfos.length > 0) {
      result.success = false;
    }

    // Update sync job — "completed" even with partial errors (itemsFailed tracks the count)
    await syncJobsRepository.update(syncJob.id, {
      status: "completed",
      completedAt: new Date(),
      itemsProcessed: result.videosProcessed,
      itemsFailed: result.videosFailed,
      errorMessage: result.errors.length > 0 ? result.errors.slice(0, 5).join("; ") : undefined,
    });

    await syncJobsRepository.addLog(
      syncJob.id,
      result.errors.length === 0 ? "info" : "warning",
      `YouTube sync completed: ${result.videosProcessed} videos synced${result.videosFailed > 0 ? `, ${result.videosFailed} failed` : ""}`,
      { errors: result.errors.length > 0 ? result.errors.slice(0, 10) : undefined }
    );

  } catch (error) {
    result.success = false;
    result.errors.push(`Sync failed: ${(error as Error).message}`);

    await syncJobsRepository.update(syncJob.id, {
      status: "failed",
      completedAt: new Date(),
      errorMessage: (error as Error).message,
    });

    await syncJobsRepository.addLog(syncJob.id, "error", "YouTube sync failed", {
      error: (error as Error).message,
    });
  }

  return result;
}

/**
 * Sync a single video from YouTube by ID
 */
export async function syncYouTubeVideo(videoId: string, artistId?: string): Promise<boolean> {
  if (!youtubeClient.isConfigured()) {
    throw new Error("YouTube API key not configured");
  }

  try {
    const video = await youtubeClient.getVideo(videoId);
    if (!video) {
      throw new Error("Video not found");
    }

    const existing = await videosRepository.findByYouTubeId(videoId);

    if (existing) {
      await videosRepository.update(existing.id, {
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
        viewCount: parseInt(video.statistics.viewCount, 10),
        duration: YouTubeClient.parseDuration(video.contentDetails.duration),
        artistId: artistId || existing.artistId,
      });
    } else {
      await videosRepository.create({
        title: video.snippet.title,
        description: video.snippet.description,
        youtubeId: videoId,
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
        duration: YouTubeClient.parseDuration(video.contentDetails.duration),
        viewCount: parseInt(video.statistics.viewCount, 10),
        publishedAt: new Date(video.snippet.publishedAt),
        artistId,
      });
    }

    return true;
  } catch (error) {
    console.error("Failed to sync YouTube video:", error);
    return false;
  }
}

/**
 * Update view counts for all videos
 */
export async function updateVideoViewCounts(): Promise<number> {
  if (!youtubeClient.isConfigured()) {
    throw new Error("YouTube API key not configured");
  }

  const videos = await videosRepository.findAll({ limit: 100 });
  const videoIds = videos.map((v) => v.youtubeId);

  if (videoIds.length === 0) return 0;

  const ytVideos = await youtubeClient.getVideos(videoIds);
  let updated = 0;

  for (const ytVideo of ytVideos) {
    const localVideo = videos.find((v) => v.youtubeId === ytVideo.id);
    if (localVideo) {
      await videosRepository.update(localVideo.id, {
        viewCount: parseInt(ytVideo.statistics.viewCount, 10),
      });
      updated++;
    }
  }

  return updated;
}
