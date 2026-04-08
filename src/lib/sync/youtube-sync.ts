import { youtubeClient, YouTubeClient } from "@/lib/clients";
import { artistsRepository, videosRepository, syncJobsRepository } from "@/lib/repositories";
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
 * Sync videos from YouTube channels
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
    result.errors.push("YouTube API key not configured");
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
      channelInfos = options.channelIds.map((id) => ({ channelId: id, artistId: null }));
    } else {
      // Get all artists with YouTube profiles from database
      const artists = await artistsRepository.findAll({ onlyActive: true });

      for (const artist of artists) {
        const profiles = await artistsRepository.getExternalProfiles(artist.id);
        const ytProfile = profiles.find((p) => p.platform === "youtube");

        if (ytProfile?.externalUrl) {
          const channelInfo = YouTubeClient.extractChannelInfo(ytProfile.externalUrl);

          if (channelInfo) {
            if (channelInfo.type === "id") {
              channelInfos.push({ channelId: channelInfo.value, artistId: artist.id });
            } else {
              // Handle by resolving from URL
              try {
                const channel = await youtubeClient.getChannelByHandle(channelInfo.value);
                if (channel) {
                  channelInfos.push({ channelId: channel.id, artistId: artist.id });
                }
              } catch (error) {
                result.errors.push(`Failed to resolve channel handle @${channelInfo.value}`);
              }
            }
          }
        }
      }
    }

    await syncJobsRepository.addLog(
      syncJob.id,
      "info",
      `Found ${channelInfos.length} YouTube channels to sync`
    );

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
                thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium.url,
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
                thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium.url,
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

    // Update sync job
    await syncJobsRepository.update(syncJob.id, {
      status: result.errors.length === 0 ? "completed" : "completed",
      completedAt: new Date(),
      itemsProcessed: result.videosProcessed,
      itemsFailed: result.videosFailed,
    });

    await syncJobsRepository.addLog(
      syncJob.id,
      result.errors.length === 0 ? "info" : "warning",
      `YouTube sync completed: ${result.videosProcessed} videos synced`,
      { errors: result.errors }
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
        thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium.url,
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
        thumbnailUrl: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium.url,
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
