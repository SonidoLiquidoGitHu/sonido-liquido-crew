// ===========================================
// SYNC SERVICES INDEX
// ===========================================

export {
  syncSpotify,
  syncSpotifyArtist,
  type SpotifySyncOptions,
  type SpotifySyncResult,
} from "./spotify-sync";

export {
  syncYouTube,
  syncYouTubeVideo,
  updateVideoViewCounts,
  type YouTubeSyncOptions,
  type YouTubeSyncResult,
} from "./youtube-sync";

export {
  syncDropbox,
  syncDropboxFile,
  getDropboxStorageInfo,
  getFileAssets,
  type DropboxSyncOptions,
  type DropboxSyncResult,
} from "./dropbox-sync";

export {
  syncRosterVideos,
  getRosterVideosSyncStatus,
  type RosterVideosSyncOptions,
  type RosterVideosSyncResult,
} from "./roster-videos-sync";

// ===========================================
// UNIFIED SYNC FUNCTION
// ===========================================

import { syncSpotify } from "./spotify-sync";
import { syncYouTube } from "./youtube-sync";
import { syncDropbox } from "./dropbox-sync";
import { syncJobsRepository } from "@/lib/repositories";

export interface SyncAllOptions {
  spotify?: boolean;
  youtube?: boolean;
  dropbox?: boolean;
}

export interface SyncAllResult {
  spotify?: {
    success: boolean;
    artistsProcessed: number;
    releasesProcessed: number;
    errors: string[];
  };
  youtube?: {
    success: boolean;
    videosProcessed: number;
    errors: string[];
  };
  dropbox?: {
    success: boolean;
    filesProcessed: number;
    errors: string[];
  };
  overallSuccess: boolean;
}

/**
 * Run all sync jobs
 */
export async function syncAll(options: SyncAllOptions = {}): Promise<SyncAllResult> {
  const result: SyncAllResult = {
    overallSuccess: true,
  };

  const syncSpotifyEnabled = options.spotify !== false;
  const syncYouTubeEnabled = options.youtube !== false;
  const syncDropboxEnabled = options.dropbox !== false;

  // Run syncs in parallel where possible
  const promises: Promise<void>[] = [];

  if (syncSpotifyEnabled) {
    promises.push(
      syncSpotify().then((res) => {
        result.spotify = {
          success: res.success,
          artistsProcessed: res.artistsProcessed,
          releasesProcessed: res.releasesProcessed,
          errors: res.errors,
        };
        if (!res.success) result.overallSuccess = false;
      })
    );
  }

  if (syncYouTubeEnabled) {
    promises.push(
      syncYouTube().then((res) => {
        result.youtube = {
          success: res.success,
          videosProcessed: res.videosProcessed,
          errors: res.errors,
        };
        if (!res.success) result.overallSuccess = false;
      })
    );
  }

  if (syncDropboxEnabled) {
    promises.push(
      syncDropbox().then((res) => {
        result.dropbox = {
          success: res.success,
          filesProcessed: res.filesProcessed,
          errors: res.errors,
        };
        if (!res.success) result.overallSuccess = false;
      })
    );
  }

  await Promise.all(promises);

  return result;
}

/**
 * Get sync health status
 */
export async function getSyncHealth() {
  try {
    const [spotifyJob, youtubeJob, dropboxJob] = await Promise.all([
      syncJobsRepository.findLatest("spotify").catch(() => null),
      syncJobsRepository.findLatest("youtube").catch(() => null),
      syncJobsRepository.findLatest("dropbox").catch(() => null),
    ]);

    const getStatus = (job: typeof spotifyJob) => {
      if (!job) return "never";
      if (job.status === "running") return "running";
      if (job.status === "failed") return "error";

      // Check if last sync was within 24 hours
      const hoursSinceSync = job.completedAt
        ? (Date.now() - new Date(job.completedAt).getTime()) / (1000 * 60 * 60)
        : Infinity;

      if (hoursSinceSync > 24) return "stale";
      return "healthy";
    };

    return {
      spotify: {
        status: getStatus(spotifyJob),
        lastSync: spotifyJob?.completedAt || null,
        itemsProcessed: spotifyJob?.itemsProcessed || 0,
        itemsFailed: spotifyJob?.itemsFailed || 0,
      },
      youtube: {
        status: getStatus(youtubeJob),
        lastSync: youtubeJob?.completedAt || null,
        itemsProcessed: youtubeJob?.itemsProcessed || 0,
        itemsFailed: youtubeJob?.itemsFailed || 0,
      },
      dropbox: {
        status: getStatus(dropboxJob),
        lastSync: dropboxJob?.completedAt || null,
        itemsProcessed: dropboxJob?.itemsProcessed || 0,
        itemsFailed: dropboxJob?.itemsFailed || 0,
      },
    };
  } catch (error) {
    // Return default values if database is not available
    console.error("Failed to get sync health:", error);
    return {
      spotify: {
        status: "never" as const,
        lastSync: null,
        itemsProcessed: 0,
        itemsFailed: 0,
      },
      youtube: {
        status: "never" as const,
        lastSync: null,
        itemsProcessed: 0,
        itemsFailed: 0,
      },
      dropbox: {
        status: "never" as const,
        lastSync: null,
        itemsProcessed: 0,
        itemsFailed: 0,
      },
    };
  }
}
