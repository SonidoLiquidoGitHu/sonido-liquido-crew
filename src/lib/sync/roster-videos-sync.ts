import { youtubeClient, YouTubeClient } from "@/lib/clients";
import { videosRepository, syncJobsRepository, siteSettingsRepository } from "@/lib/repositories";
import { generateUUID } from "@/lib/utils";

// ===========================================
// ROSTER MEMBERS YOUTUBE CHANNELS
// ===========================================

// Real artist data with YouTube channels
const rosterYoutubeChannels = [
  {
    name: "Zaque",
    slug: "zaque",
    youtube: "https://youtube.com/@zakeuno",
  },
  {
    name: "Doctor Destino",
    slug: "doctor-destino",
    youtube: "https://youtube.com/@doctordestinohiphop",
  },
  {
    name: "Brez",
    slug: "brez",
    youtube: "https://youtube.com/@brezhiphopmexicoslc25",
  },
  {
    name: "Bruno Grasso",
    slug: "bruno-grasso",
    youtube: "https://youtube.com/@brunograssosl",
  },
  {
    name: "Dilema",
    slug: "dilema",
    youtube: "https://youtube.com/@dilema999",
  },
  {
    name: "Kev Cabrone",
    slug: "kev-cabrone",
    youtube: "https://youtube.com/@kevcabrone",
  },
  {
    name: "X Santa-Ana",
    slug: "x-santa-ana",
    youtube: "https://youtube.com/@xsanta-ana",
  },
  {
    name: "Latin Geisha",
    slug: "latin-geisha",
    youtube: "https://youtube.com/@latingeishamx",
  },
  {
    name: "Q Master Weed",
    slug: "q-master-weed",
    youtube: "https://youtube.com/@qmasterw",
  },
  {
    name: "Chas 7P",
    slug: "chas-7p",
    youtube: "https://youtube.com/@chas7p347",
  },
  {
    name: "Fancy Freak",
    slug: "fancy-freak",
    youtube: "https://youtube.com/@fancyfreakdj",
  },
  {
    name: "Pepe Levine",
    slug: "pepe-levine",
    youtube: "https://youtube.com/@pepelevineonline",
  },
  {
    name: "Reick One",
    slug: "reick-one",
    youtube: "https://youtube.com/channel/UCMvZBwXGDTnXVV7NbYKWfaA",
  },
  {
    name: "Hassyel",
    slug: "hassyel",
    youtube: "https://youtube.com/channel/UCZp_YCv7jK3-lEtvSONNs8A",
  },
];

// ===========================================
// INTERFACES
// ===========================================

export interface RosterVideosSyncOptions {
  videosPerMonth?: number;
  maxVideosPerChannel?: number;
  force?: boolean; // Force sync even if already synced this month
}

export interface RosterVideosSyncResult {
  success: boolean;
  videosSynced: number;
  videosSkipped: number;
  newVideosAvailable: number;
  channelsProcessed: number;
  channelsFailed: number;
  errors: string[];
  alreadySyncedThisMonth: boolean;
  lastSyncDate?: string;
}

interface CandidateVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number;
  viewCount: number;
  publishedAt: Date;
  artistName: string;
  artistSlug: string;
}

// ===========================================
// MONTHLY SYNC TRACKING
// ===========================================

const LAST_ROSTER_SYNC_KEY = "roster_videos_last_sync";

async function getLastSyncDate(): Promise<Date | null> {
  const value = await siteSettingsRepository.get(LAST_ROSTER_SYNC_KEY);
  if (!value) return null;
  return new Date(value);
}

async function setLastSyncDate(date: Date): Promise<void> {
  await siteSettingsRepository.set(LAST_ROSTER_SYNC_KEY, date.toISOString(), "string");
}

function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
}

// ===========================================
// MAIN SYNC FUNCTION
// ===========================================

/**
 * Sync 4 random videos per month from roster members' YouTube channels.
 * Only fetches videos that haven't been loaded yet.
 */
export async function syncRosterVideos(
  options: RosterVideosSyncOptions = {}
): Promise<RosterVideosSyncResult> {
  const {
    videosPerMonth = 4,
    maxVideosPerChannel = 10,
    force = false,
  } = options;

  const result: RosterVideosSyncResult = {
    success: true,
    videosSynced: 0,
    videosSkipped: 0,
    newVideosAvailable: 0,
    channelsProcessed: 0,
    channelsFailed: 0,
    errors: [],
    alreadySyncedThisMonth: false,
  };

  // Check if YouTube API is configured
  if (!youtubeClient.isConfigured()) {
    result.success = false;
    result.errors.push("YouTube API key not configured. Set YOUTUBE_API_KEY in environment variables.");
    return result;
  }

  // Check if already synced this month
  const lastSync = await getLastSyncDate();
  if (lastSync) {
    result.lastSyncDate = lastSync.toISOString();
    if (!force && isSameMonth(lastSync, new Date())) {
      result.alreadySyncedThisMonth = true;
      result.errors.push(`Ya se sincronizaron videos este mes (${lastSync.toLocaleDateString("es-MX")}). Usa force=true para forzar.`);
      return result;
    }
  }

  // Create sync job
  const syncJob = await syncJobsRepository.create({
    source: "youtube",
    status: "running",
    startedAt: new Date(),
  });

  try {
    await syncJobsRepository.addLog(
      syncJob.id,
      "info",
      `Iniciando sincronización mensual de videos del roster (${videosPerMonth} videos)`
    );

    // Collect candidate videos from all channels
    const allCandidates: CandidateVideo[] = [];

    for (const artist of rosterYoutubeChannels) {
      try {
        await syncJobsRepository.addLog(syncJob.id, "info", `Procesando canal de ${artist.name}`);

        // Validate youtube URL exists
        if (!artist.youtube) {
          result.errors.push(`${artist.name}: No tiene URL de YouTube configurada`);
          result.channelsFailed++;
          continue;
        }

        // Extract channel info from URL
        const channelInfo = YouTubeClient.extractChannelInfo(artist.youtube);
        if (!channelInfo) {
          result.errors.push(`${artist.name}: No se pudo extraer info del canal de ${artist.youtube}`);
          result.channelsFailed++;
          continue;
        }

        // Resolve channel ID
        let channelId: string | null = null;
        if (channelInfo.type === "id") {
          channelId = channelInfo.value;
        } else {
          // Handle @handle format
          try {
            const channel = await youtubeClient.getChannelByHandle(channelInfo.value);
            if (channel && channel.id) {
              channelId = channel.id;
            } else {
              result.errors.push(`${artist.name}: Canal @${channelInfo.value} no encontrado en YouTube`);
              result.channelsFailed++;
              continue;
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            result.errors.push(`${artist.name}: Error resolviendo handle @${channelInfo.value} - ${errorMsg}`);
            result.channelsFailed++;
            continue;
          }
        }

        if (!channelId) {
          result.errors.push(`${artist.name}: No se pudo obtener channelId`);
          result.channelsFailed++;
          continue;
        }

        // Fetch recent videos from channel
        let videos: Awaited<ReturnType<typeof youtubeClient.getChannelVideos>> = [];
        try {
          videos = await youtubeClient.getChannelVideos(channelId, maxVideosPerChannel);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          result.errors.push(`${artist.name}: Error obteniendo videos - ${errorMsg}`);
          result.channelsFailed++;
          continue;
        }

        if (!videos || videos.length === 0) {
          // Not an error, just no videos found
          await syncJobsRepository.addLog(syncJob.id, "info", `${artist.name}: Sin videos públicos`);
          result.channelsProcessed++;
          continue;
        }

        // Filter out videos that already exist
        for (const video of videos) {
          if (!video || !video.id) continue;

          const existing = await videosRepository.findByYouTubeId(video.id);
          if (existing) {
            result.videosSkipped++;
            continue;
          }

          // Safely extract video data with fallbacks
          const thumbnailUrl = video.snippet?.thumbnails?.high?.url
            || video.snippet?.thumbnails?.medium?.url
            || video.snippet?.thumbnails?.default?.url
            || "";

          const duration = video.contentDetails?.duration
            ? YouTubeClient.parseDuration(video.contentDetails.duration)
            : 0;

          const viewCount = video.statistics?.viewCount
            ? parseInt(video.statistics.viewCount, 10)
            : 0;

          // Add to candidates
          allCandidates.push({
            videoId: video.id,
            title: video.snippet?.title || "Sin título",
            description: video.snippet?.description || "",
            thumbnailUrl,
            duration,
            viewCount,
            publishedAt: video.snippet?.publishedAt
              ? new Date(video.snippet.publishedAt)
              : new Date(),
            artistName: artist.name,
            artistSlug: artist.slug,
          });
        }

        result.channelsProcessed++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(`${artist.name}: ${errorMsg}`);
        result.channelsFailed++;
        await syncJobsRepository.addLog(syncJob.id, "error", `Error procesando ${artist.name}`, {
          error: errorMsg,
        });
      }
    }

    result.newVideosAvailable = allCandidates.length;

    await syncJobsRepository.addLog(
      syncJob.id,
      "info",
      `Encontrados ${allCandidates.length} videos nuevos de ${result.channelsProcessed} canales`
    );

    // If no new videos available
    if (allCandidates.length === 0) {
      await syncJobsRepository.addLog(syncJob.id, "info", "No hay videos nuevos disponibles");
      await syncJobsRepository.update(syncJob.id, {
        status: "completed",
        completedAt: new Date(),
        itemsProcessed: 0,
      });
      return result;
    }

    // Select random videos (up to videosPerMonth)
    const selectedVideos = shuffleArray(allCandidates).slice(0, Math.min(videosPerMonth, allCandidates.length));

    // Import videos to database
    for (const candidate of selectedVideos) {
      try {
        // Try to find artistId from database by slug
        let artistId: string | null = null;
        try {
          const { artistsRepository } = await import("@/lib/repositories");
          const artist = await artistsRepository.findBySlug(candidate.artistSlug);
          if (artist) {
            artistId = artist.id;
          }
        } catch {
          // Artist not found in database, that's ok
        }

        await videosRepository.create({
          title: candidate.title,
          description: candidate.description,
          youtubeId: candidate.videoId,
          youtubeUrl: `https://www.youtube.com/watch?v=${candidate.videoId}`,
          thumbnailUrl: candidate.thumbnailUrl,
          duration: candidate.duration,
          viewCount: candidate.viewCount,
          publishedAt: candidate.publishedAt,
          artistId,
          isFeatured: false,
        });

        result.videosSynced++;

        await syncJobsRepository.addLog(syncJob.id, "info", `Video guardado: ${candidate.title} (${candidate.artistName})`);
      } catch (error) {
        result.errors.push(`Error guardando video "${candidate.title}": ${(error as Error).message}`);
      }
    }

    // Update last sync date
    await setLastSyncDate(new Date());

    // Update sync job
    await syncJobsRepository.update(syncJob.id, {
      status: result.errors.length === 0 ? "completed" : "completed",
      completedAt: new Date(),
      itemsProcessed: result.videosSynced,
      itemsFailed: result.channelsFailed,
    });

    await syncJobsRepository.addLog(
      syncJob.id,
      result.errors.length === 0 ? "info" : "warning",
      `Sincronización completada: ${result.videosSynced} videos nuevos guardados`,
      { errors: result.errors }
    );

  } catch (error) {
    result.success = false;
    result.errors.push(`Sincronización fallida: ${(error as Error).message}`);

    await syncJobsRepository.update(syncJob.id, {
      status: "failed",
      completedAt: new Date(),
      errorMessage: (error as Error).message,
    });

    await syncJobsRepository.addLog(syncJob.id, "error", "Sincronización fallida", {
      error: (error as Error).message,
    });
  }

  return result;
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get status of roster videos sync
 */
export async function getRosterVideosSyncStatus(): Promise<{
  lastSync: string | null;
  canSyncThisMonth: boolean;
  totalChannels: number;
}> {
  const lastSync = await getLastSyncDate();
  const canSyncThisMonth = !lastSync || !isSameMonth(lastSync, new Date());

  return {
    lastSync: lastSync?.toISOString() || null,
    canSyncThisMonth,
    totalChannels: rosterYoutubeChannels.length,
  };
}
