import {
  artistsRepository,
  releasesRepository,
  videosRepository,
  eventsRepository,
  productsRepository,
  subscribersRepository,
  playlistsRepository,
  syncJobsRepository,
  siteSettingsRepository,
} from "@/lib/repositories";
import { spotifyClient, youtubeClient, dropboxClient, mailchimpClient } from "@/lib/clients";
import { parseISODuration } from "@/lib/utils";
import {
  AppError,
  DatabaseError,
  ExternalApiError,
  NotFoundError,
  ValidationError,
  ErrorCode,
  errorLogger,
  getErrorMessage,
} from "@/lib/errors";
import type { Artist, Release, Video } from "@/types";

// ===========================================
// ARTISTS SERVICE
// ===========================================

export const artistsService = {
  async getAll(options?: Parameters<typeof artistsRepository.findAll>[0]) {
    try {
      return await artistsRepository.findAll(options);
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "artists", getErrorMessage(error), error as Error)
      );
      // Return empty array instead of throwing to prevent page crashes
      return [];
    }
  },

  async getById(id: string) {
    try {
      if (!id || typeof id !== "string") {
        throw ValidationError.invalidInput("id", "Artist ID must be a non-empty string");
      }

      const artist = await artistsRepository.findById(id);
      if (!artist) {
        errorLogger.warn(`Artist not found by ID`, { id });
        return null;
      }

      const [externalProfiles, releases] = await Promise.all([
        artistsRepository.getExternalProfiles(id),
        releasesRepository.findAll({ artistId: id }),
      ]);

      return { ...artist, externalProfiles, releaseCount: releases.length };
    } catch (error) {
      if (error instanceof AppError) throw error;
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "artist", `ID: ${id}`, error as Error)
      );
      throw DatabaseError.queryFailed("fetch", "artist", `Failed to get artist by ID: ${id}`, error as Error);
    }
  },

  async getBySlug(slug: string) {
    try {
      if (!slug || typeof slug !== "string") {
        throw ValidationError.invalidInput("slug", "Artist slug must be a non-empty string");
      }

      const artist = await artistsRepository.findBySlugWithDetails(slug);
      if (!artist) {
        errorLogger.warn(`Artist not found by slug`, { slug });
      }
      return artist;
    } catch (error) {
      if (error instanceof AppError) throw error;
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "artist", `Slug: ${slug}`, error as Error)
      );
      throw DatabaseError.queryFailed("fetch", "artist", `Failed to get artist by slug: ${slug}`, error as Error);
    }
  },

  async getFeatured(limit = 5) {
    try {
      if (limit < 1 || limit > 100) {
        throw ValidationError.invalidInput("limit", "Limit must be between 1 and 100");
      }
      return await artistsRepository.findFeatured(limit);
    } catch (error) {
      if (error instanceof AppError) throw error;
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "featured artists", getErrorMessage(error), error as Error)
      );
      throw DatabaseError.queryFailed("fetch", "featured artists", undefined, error as Error);
    }
  },

  async getWithConflicts() {
    try {
      return await artistsRepository.findWithConflicts();
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "conflicted artists", getErrorMessage(error), error as Error)
      );
      throw DatabaseError.queryFailed("fetch", "conflicted artists", undefined, error as Error);
    }
  },

  async search(query: string) {
    try {
      if (!query || query.trim().length < 2) {
        throw ValidationError.invalidInput("query", "Search query must be at least 2 characters");
      }
      return await artistsRepository.search(query.trim());
    } catch (error) {
      if (error instanceof AppError) throw error;
      errorLogger.log(
        DatabaseError.queryFailed("search", "artists", `Query: "${query}"`, error as Error)
      );
      throw DatabaseError.queryFailed("search", "artists", `Search failed for: "${query}"`, error as Error);
    }
  },

  async getCount() {
    try {
      return await artistsRepository.count();
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("count", "artists", getErrorMessage(error), error as Error)
      );
      throw DatabaseError.queryFailed("count", "artists", undefined, error as Error);
    }
  },

  async syncFromSpotify(spotifyId: string) {
    const context = { service: "ArtistsService", method: "syncFromSpotify", entityId: spotifyId };

    try {
      if (!spotifyId || typeof spotifyId !== "string") {
        throw ValidationError.invalidInput("spotifyId", "Spotify ID must be a non-empty string");
      }

      if (!spotifyClient.isConfigured()) {
        throw new AppError(
          "Spotify API is not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.",
          ErrorCode.SPOTIFY_ERROR,
          503,
          context
        );
      }

      errorLogger.info(`Syncing artist from Spotify`, { spotifyId });

      const spotifyArtist = await spotifyClient.getArtist(spotifyId);

      if (!spotifyArtist) {
        throw ExternalApiError.notFound("Spotify", "Artist", spotifyId);
      }

      const existing = await artistsRepository.findBySpotifyId(spotifyId);

      if (existing) {
        errorLogger.info(`Updating existing artist from Spotify`, { artistId: existing.id, spotifyId });
        return await artistsRepository.update(existing.id, {
          profileImageUrl: spotifyArtist.images[0]?.url,
        });
      }

      errorLogger.info(`Creating new artist from Spotify`, { name: spotifyArtist.name, spotifyId });

      const artist = await artistsRepository.create({
        name: spotifyArtist.name,
        role: "mc",
        profileImageUrl: spotifyArtist.images[0]?.url,
        verificationStatus: "pending",
      });

      await artistsRepository.addExternalProfile({
        artistId: artist.id,
        platform: "spotify",
        externalId: spotifyId,
        externalUrl: spotifyArtist.external_urls.spotify,
        isVerified: true,
      });

      return artist;
    } catch (error) {
      if (error instanceof AppError) throw error;

      errorLogger.log(
        ExternalApiError.spotifyError("sync artist", `Spotify ID: ${spotifyId}`, undefined, error as Error)
      );
      throw ExternalApiError.spotifyError("sync artist", getErrorMessage(error), undefined, error as Error);
    }
  },
};

// ===========================================
// RELEASES SERVICE
// ===========================================

export const releasesService = {
  async getAll(options?: Parameters<typeof releasesRepository.findAll>[0]) {
    try {
      return await releasesRepository.findAll(options);
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "releases", getErrorMessage(error), error as Error)
      );
      // Return empty array instead of throwing to prevent page crashes
      return [];
    }
  },

  async getBySlug(slug: string) {
    try {
      if (!slug) {
        throw ValidationError.invalidInput("slug", "Release slug is required");
      }
      return await releasesRepository.findBySlugWithArtists(slug);
    } catch (error) {
      if (error instanceof AppError) throw error;
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "release", `Slug: ${slug}`, error as Error)
      );
      throw DatabaseError.queryFailed("fetch", "release", `Failed to get release by slug: ${slug}`, error as Error);
    }
  },

  async getUpcoming(limit = 5) {
    try {
      return await releasesRepository.findUpcoming(limit);
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "upcoming releases", getErrorMessage(error), error as Error)
      );
      // Return empty array instead of throwing to prevent page crashes
      return [];
    }
  },

  async getNextUpcoming() {
    try {
      return await releasesRepository.findNextUpcoming();
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "next upcoming release", getErrorMessage(error), error as Error)
      );
      // Return null instead of throwing to prevent page crashes
      return null;
    }
  },

  async getFeatured(limit = 10) {
    try {
      return await releasesRepository.findFeatured(limit);
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "featured releases", getErrorMessage(error), error as Error)
      );
      // Return empty array instead of throwing to prevent page crashes
      return [];
    }
  },

  async getLatest(limit = 10) {
    try {
      return await releasesRepository.findLatest(limit);
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "latest releases", getErrorMessage(error), error as Error)
      );
      // Return empty array instead of throwing to prevent page crashes
      return [];
    }
  },

  async getByYear() {
    try {
      return await releasesRepository.countByYear();
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("count", "releases by year", getErrorMessage(error), error as Error)
      );
      throw DatabaseError.queryFailed("count", "releases by year", undefined, error as Error);
    }
  },

  async getByArtist() {
    try {
      return await releasesRepository.countByArtist();
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("count", "releases by artist", getErrorMessage(error), error as Error)
      );
      throw DatabaseError.queryFailed("count", "releases by artist", undefined, error as Error);
    }
  },

  async getCount() {
    try {
      return await releasesRepository.count();
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("count", "releases", getErrorMessage(error), error as Error)
      );
      throw DatabaseError.queryFailed("count", "releases", undefined, error as Error);
    }
  },

  async getStats() {
    try {
      const { db, isDatabaseConfigured } = await import("@/db/client");
      const { releases } = await import("@/db/schema");
      const { sql } = await import("drizzle-orm");

      if (!isDatabaseConfigured()) {
        return { total: 0, albums: 0, singles: 0, maxiSingles: 0, eps: 0, compilations: 0, mixtapes: 0 };
      }

      // Get all counts in a single optimized query using CASE statements
      // This handles case-insensitivity and is more efficient than multiple queries
      const [result] = await db
        .select({
          total: sql<number>`count(*)`,
          albums: sql<number>`sum(case when lower(${releases.releaseType}) = 'album' then 1 else 0 end)`,
          singles: sql<number>`sum(case when lower(${releases.releaseType}) = 'single' then 1 else 0 end)`,
          maxiSingles: sql<number>`sum(case when lower(${releases.releaseType}) = 'maxi-single' then 1 else 0 end)`,
          eps: sql<number>`sum(case when lower(${releases.releaseType}) = 'ep' then 1 else 0 end)`,
          compilations: sql<number>`sum(case when lower(${releases.releaseType}) = 'compilation' then 1 else 0 end)`,
          mixtapes: sql<number>`sum(case when lower(${releases.releaseType}) = 'mixtape' then 1 else 0 end)`,
        })
        .from(releases);

      return {
        total: Number(result?.total || 0),
        albums: Number(result?.albums || 0),
        singles: Number(result?.singles || 0),
        maxiSingles: Number(result?.maxiSingles || 0),
        eps: Number(result?.eps || 0),
        compilations: Number(result?.compilations || 0),
        mixtapes: Number(result?.mixtapes || 0),
      };
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("stats", "releases", getErrorMessage(error), error as Error)
      );
      return { total: 0, albums: 0, singles: 0, maxiSingles: 0, eps: 0, compilations: 0, mixtapes: 0 };
    }
  },

  async search(query: string) {
    try {
      if (!query || query.trim().length < 2) {
        throw ValidationError.invalidInput("query", "Search query must be at least 2 characters");
      }
      return await releasesRepository.search(query.trim());
    } catch (error) {
      if (error instanceof AppError) throw error;
      errorLogger.log(
        DatabaseError.queryFailed("search", "releases", `Query: "${query}"`, error as Error)
      );
      throw DatabaseError.queryFailed("search", "releases", `Search failed for: "${query}"`, error as Error);
    }
  },
};

// ===========================================
// VIDEOS SERVICE
// ===========================================

export const videosService = {
  async getAll(options?: Parameters<typeof videosRepository.findAll>[0]) {
    try {
      return await videosRepository.findAll(options);
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "videos", getErrorMessage(error), error as Error)
      );
      // Return empty array instead of throwing to prevent page crashes
      return [];
    }
  },

  async getById(id: string) {
    try {
      if (!id) {
        throw ValidationError.invalidInput("id", "Video ID is required");
      }
      return await videosRepository.findById(id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "video", `ID: ${id}`, error as Error)
      );
      throw DatabaseError.queryFailed("fetch", "video", `Failed to get video by ID: ${id}`, error as Error);
    }
  },

  async getFeatured(limit = 5) {
    try {
      return await videosRepository.findFeatured(limit);
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "featured videos", getErrorMessage(error), error as Error)
      );
      throw DatabaseError.queryFailed("fetch", "featured videos", undefined, error as Error);
    }
  },

  async getCount() {
    try {
      return await videosRepository.count();
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("count", "videos", getErrorMessage(error), error as Error)
      );
      throw DatabaseError.queryFailed("count", "videos", undefined, error as Error);
    }
  },

  async syncFromYouTube(youtubeId: string, artistId?: string) {
    const context = { service: "VideosService", method: "syncFromYouTube", entityId: youtubeId };

    try {
      if (!youtubeId || typeof youtubeId !== "string") {
        throw ValidationError.invalidInput("youtubeId", "YouTube ID must be a non-empty string");
      }

      if (!youtubeClient.isConfigured()) {
        throw new AppError(
          "YouTube API is not configured. Set YOUTUBE_API_KEY environment variable.",
          ErrorCode.YOUTUBE_ERROR,
          503,
          context
        );
      }

      // Check if video already exists
      const existing = await videosRepository.findByYouTubeId(youtubeId);
      if (existing) {
        errorLogger.info(`Video already exists in database`, { youtubeId, videoId: existing.id });
        return existing;
      }

      errorLogger.info(`Fetching video from YouTube`, { youtubeId });

      const ytVideo = await youtubeClient.getVideo(youtubeId);
      if (!ytVideo) {
        throw ExternalApiError.notFound("YouTube", "Video", youtubeId);
      }

      errorLogger.info(`Creating video record from YouTube`, { title: ytVideo.snippet.title, youtubeId });

      return await videosRepository.create({
        title: ytVideo.snippet.title,
        description: ytVideo.snippet.description,
        youtubeId,
        youtubeUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
        thumbnailUrl: ytVideo.snippet.thumbnails.high?.url || ytVideo.snippet.thumbnails.medium.url,
        duration: parseISODuration(ytVideo.contentDetails.duration),
        viewCount: parseInt(ytVideo.statistics.viewCount, 10),
        publishedAt: new Date(ytVideo.snippet.publishedAt),
        artistId,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;

      errorLogger.log(
        ExternalApiError.youtubeError("sync video", `YouTube ID: ${youtubeId}`, undefined, error as Error)
      );
      throw ExternalApiError.youtubeError("sync video", getErrorMessage(error), undefined, error as Error);
    }
  },
};

// ===========================================
// EVENTS SERVICE
// ===========================================

export const eventsService = {
  async getAll(options?: Parameters<typeof eventsRepository.findAll>[0]) {
    try {
      return await eventsRepository.findAll(options);
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "events", getErrorMessage(error), error as Error)
      );
      throw DatabaseError.queryFailed("fetch", "events", undefined, error as Error);
    }
  },

  async getUpcoming(limit = 5) {
    try {
      return await eventsRepository.findUpcoming(limit);
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "upcoming events", getErrorMessage(error), error as Error)
      );
      throw DatabaseError.queryFailed("fetch", "upcoming events", undefined, error as Error);
    }
  },

  async getPast(limit = 10) {
    try {
      return await eventsRepository.findPast(limit);
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "past events", getErrorMessage(error), error as Error)
      );
      throw DatabaseError.queryFailed("fetch", "past events", undefined, error as Error);
    }
  },

  async getById(id: string) {
    try {
      if (!id) {
        throw ValidationError.invalidInput("id", "Event ID is required");
      }
      return await eventsRepository.findById(id);
    } catch (error) {
      if (error instanceof AppError) throw error;
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "event", `ID: ${id}`, error as Error)
      );
      throw DatabaseError.queryFailed("fetch", "event", `Failed to get event by ID: ${id}`, error as Error);
    }
  },
};

// ===========================================
// PRODUCTS SERVICE
// ===========================================

export const productsService = {
  async getAll(options?: Parameters<typeof productsRepository.findAll>[0]) {
    try {
      return await productsRepository.findAll(options);
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "products", getErrorMessage(error), error as Error)
      );
      throw DatabaseError.queryFailed("fetch", "products", undefined, error as Error);
    }
  },

  async getBySlug(slug: string) {
    try {
      if (!slug) {
        throw ValidationError.invalidInput("slug", "Product slug is required");
      }
      return await productsRepository.findBySlug(slug);
    } catch (error) {
      if (error instanceof AppError) throw error;
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "product", `Slug: ${slug}`, error as Error)
      );
      throw DatabaseError.queryFailed("fetch", "product", `Failed to get product by slug: ${slug}`, error as Error);
    }
  },

  async getCount() {
    try {
      return await productsRepository.count();
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("count", "products", getErrorMessage(error), error as Error)
      );
      throw DatabaseError.queryFailed("count", "products", undefined, error as Error);
    }
  },
};

// ===========================================
// SUBSCRIBERS SERVICE
// ===========================================

export const subscribersService = {
  async subscribe(email: string, name?: string, source?: string) {
    const context = { service: "SubscribersService", method: "subscribe" };

    try {
      if (!email || typeof email !== "string") {
        throw ValidationError.missingRequired("email");
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw ValidationError.invalidInput("email", "Invalid email format");
      }

      errorLogger.info(`Creating new subscriber`, { email: email.substring(0, 3) + "***", source });

      const subscriber = await subscribersRepository.create({ email, name, source });

      // Sync to Mailchimp if configured (adds "sonidoliquido.com" tag automatically)
      if (mailchimpClient.isConfigured()) {
        try {
          await mailchimpClient.addSubscriber(email, { name, source });
          errorLogger.info(`Subscriber synced to Mailchimp with tag "sonidoliquido.com"`, {
            email: email.substring(0, 3) + "***",
            source,
          });
        } catch (error) {
          // Log but don't fail the subscription
          errorLogger.warn(`Failed to sync subscriber to Mailchimp: ${getErrorMessage(error)}`, {
            email: email.substring(0, 3) + "***",
            error: getErrorMessage(error),
          });
        }
      }

      return subscriber;
    } catch (error) {
      if (error instanceof AppError) throw error;
      errorLogger.log(
        DatabaseError.queryFailed("create", "subscriber", `Email: ${email?.substring(0, 3)}***`, error as Error)
      );
      throw DatabaseError.queryFailed("create", "subscriber", getErrorMessage(error), error as Error);
    }
  },

  async unsubscribe(email: string) {
    const context = { service: "SubscribersService", method: "unsubscribe" };

    try {
      if (!email || typeof email !== "string") {
        throw ValidationError.missingRequired("email");
      }

      errorLogger.info(`Unsubscribing user`, { email: email.substring(0, 3) + "***" });

      const subscriber = await subscribersRepository.unsubscribe(email);

      if (mailchimpClient.isConfigured()) {
        try {
          await mailchimpClient.unsubscribe(email);
          errorLogger.info(`Subscriber removed from Mailchimp`, { email: email.substring(0, 3) + "***" });
        } catch (error) {
          errorLogger.warn(`Failed to unsubscribe from Mailchimp: ${getErrorMessage(error)}`, {
            email: email.substring(0, 3) + "***",
            error: getErrorMessage(error),
          });
        }
      }

      return subscriber;
    } catch (error) {
      if (error instanceof AppError) throw error;
      errorLogger.log(
        DatabaseError.queryFailed("unsubscribe", "subscriber", `Email: ${email?.substring(0, 3)}***`, error as Error)
      );
      throw DatabaseError.queryFailed("unsubscribe", "subscriber", getErrorMessage(error), error as Error);
    }
  },

  async getCount() {
    try {
      return await subscribersRepository.count();
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("count", "subscribers", getErrorMessage(error), error as Error)
      );
      throw DatabaseError.queryFailed("count", "subscribers", undefined, error as Error);
    }
  },
};

// ===========================================
// PLAYLISTS SERVICE
// ===========================================

export const playlistsService = {
  async getAll(options?: Parameters<typeof playlistsRepository.findAll>[0]) {
    try {
      return await playlistsRepository.findAll(options);
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "playlists", getErrorMessage(error), error as Error)
      );
      throw DatabaseError.queryFailed("fetch", "playlists", undefined, error as Error);
    }
  },

  async syncFromSpotify(playlistId: string) {
    const context = { service: "PlaylistsService", method: "syncFromSpotify", entityId: playlistId };

    try {
      if (!playlistId || typeof playlistId !== "string") {
        throw ValidationError.invalidInput("playlistId", "Spotify playlist ID must be a non-empty string");
      }

      if (!spotifyClient.isConfigured()) {
        throw new AppError(
          "Spotify API is not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.",
          ErrorCode.SPOTIFY_ERROR,
          503,
          context
        );
      }

      errorLogger.info(`Syncing playlist from Spotify`, { playlistId });

      const spotifyPlaylist = await spotifyClient.getPlaylist(playlistId);

      if (!spotifyPlaylist) {
        throw ExternalApiError.notFound("Spotify", "Playlist", playlistId);
      }

      const existing = await playlistsRepository.findBySpotifyId(playlistId);

      if (existing) {
        errorLogger.info(`Updating existing playlist`, { playlistId, internalId: existing.id });
        return await playlistsRepository.update(existing.id, {
          name: spotifyPlaylist.name,
          description: spotifyPlaylist.description,
          coverImageUrl: spotifyPlaylist.images[0]?.url,
          trackCount: spotifyPlaylist.tracks.total,
        });
      }

      errorLogger.info(`Creating new playlist`, { name: spotifyPlaylist.name, playlistId });

      return await playlistsRepository.create({
        name: spotifyPlaylist.name,
        description: spotifyPlaylist.description,
        spotifyId: playlistId,
        spotifyUrl: spotifyPlaylist.external_urls.spotify,
        coverImageUrl: spotifyPlaylist.images[0]?.url,
        trackCount: spotifyPlaylist.tracks.total,
        isOfficial: true,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;

      errorLogger.log(
        ExternalApiError.spotifyError("sync playlist", `Playlist ID: ${playlistId}`, undefined, error as Error)
      );
      throw ExternalApiError.spotifyError("sync playlist", getErrorMessage(error), undefined, error as Error);
    }
  },
};

// ===========================================
// DASHBOARD SERVICE
// ===========================================

export const dashboardService = {
  async getSummary() {
    const context = { service: "DashboardService", method: "getSummary" };

    try {
      errorLogger.info(`Fetching dashboard summary`);

      const [
        totalArtists,
        totalReleases,
        totalVideos,
        totalProducts,
        totalSubscribers,
        latestReleases,
        releasesPerYear,
        releasesPerArtist,
        spotifySync,
        youtubeSync,
        dropboxSync,
        upcomingStats,
      ] = await Promise.all([
        artistsRepository.count().catch((e) => {
          errorLogger.warn(`Failed to count artists: ${getErrorMessage(e)}`);
          return 0;
        }),
        releasesRepository.count().catch((e) => {
          errorLogger.warn(`Failed to count releases: ${getErrorMessage(e)}`);
          return 0;
        }),
        videosRepository.count().catch((e) => {
          errorLogger.warn(`Failed to count videos: ${getErrorMessage(e)}`);
          return 0;
        }),
        productsRepository.count().catch((e) => {
          errorLogger.warn(`Failed to count products: ${getErrorMessage(e)}`);
          return 0;
        }),
        subscribersRepository.count().catch((e) => {
          errorLogger.warn(`Failed to count subscribers: ${getErrorMessage(e)}`);
          return 0;
        }),
        releasesRepository.findLatest(5).catch((e) => {
          errorLogger.warn(`Failed to fetch latest releases: ${getErrorMessage(e)}`);
          return [];
        }),
        releasesRepository.countByYear().catch((e) => {
          errorLogger.warn(`Failed to count releases by year: ${getErrorMessage(e)}`);
          return [];
        }),
        releasesRepository.countByArtist().catch((e) => {
          errorLogger.warn(`Failed to count releases by artist: ${getErrorMessage(e)}`);
          return [];
        }),
        syncJobsRepository.findLatest("spotify").catch(() => null),
        syncJobsRepository.findLatest("youtube").catch(() => null),
        syncJobsRepository.findLatest("dropbox").catch(() => null),
        // Fetch upcoming releases stats
        (async () => {
          try {
            const { db, isDatabaseConfigured } = await import("@/db/client");
            const { upcomingReleases } = await import("@/db/schema");
            const { eq, and, gte, desc, sql } = await import("drizzle-orm");

            if (!isDatabaseConfigured()) {
              return { activeReleases: 0, totalPresaves: 0, topRelease: null };
            }

            const now = new Date();

            // Get active releases count
            const activeReleases = await db
              .select()
              .from(upcomingReleases)
              .where(
                and(
                  eq(upcomingReleases.isActive, true),
                  gte(upcomingReleases.releaseDate, now)
                )
              );

            // Get total presaves
            const [presaveSum] = await db
              .select({ total: sql<number>`COALESCE(SUM(${upcomingReleases.presaveCount}), 0)` })
              .from(upcomingReleases);

            // Get top release by presaves
            const [topRelease] = await db
              .select({
                title: upcomingReleases.title,
                artistName: upcomingReleases.artistName,
                presaveCount: upcomingReleases.presaveCount,
              })
              .from(upcomingReleases)
              .where(eq(upcomingReleases.isActive, true))
              .orderBy(desc(upcomingReleases.presaveCount))
              .limit(1);

            return {
              activeReleases: activeReleases.length,
              totalPresaves: presaveSum?.total || 0,
              topRelease: topRelease || null,
            };
          } catch (e) {
            errorLogger.warn(`Failed to fetch upcoming stats: ${getErrorMessage(e)}`);
            return { activeReleases: 0, totalPresaves: 0, topRelease: null };
          }
        })(),
      ]);

      return {
        totalArtists,
        totalReleases,
        totalVideos,
        totalProducts,
        totalOrders: 0,
        totalSubscribers,
        totalDownloads: 0,
        recentOrders: [],
        latestReleases,
        syncHealth: {
          spotify: spotifySync,
          youtube: youtubeSync,
          dropbox: dropboxSync,
        },
        analytics: {
          totalViews: 0,
          totalDownloads: 0,
          conversionRate: 0,
        },
        releasesPerYear,
        releasesPerArtist,
        upcomingStats,
      };
    } catch (error) {
      errorLogger.log(
        new AppError(
          `Failed to generate dashboard summary: ${getErrorMessage(error)}`,
          ErrorCode.DB_QUERY_FAILED,
          500,
          context,
          error as Error
        )
      );
      // Return fallback values instead of throwing to prevent page crashes
      return {
        totalArtists: 0,
        totalReleases: 0,
        totalVideos: 0,
        totalProducts: 0,
        totalOrders: 0,
        totalSubscribers: 0,
        totalDownloads: 0,
        recentOrders: [],
        latestReleases: [],
        syncHealth: {
          spotify: null,
          youtube: null,
          dropbox: null,
        },
        analytics: {
          totalViews: 0,
          totalDownloads: 0,
          conversionRate: 0,
        },
        releasesPerYear: [],
        releasesPerArtist: [],
        upcomingStats: {
          activeReleases: 0,
          totalPresaves: 0,
          topRelease: null,
        },
      };
    }
  },
};

// ===========================================
// BEATS SERVICE
// ===========================================

export const beatsService = {
  async getFeatured(limit = 5) {
    const context = { service: "BeatsService", method: "getFeatured" };

    try {
      const { db, isDatabaseConfigured } = await import("@/db/client");
      const { beats } = await import("@/db/schema");
      const { eq, desc, and } = await import("drizzle-orm");

      if (!isDatabaseConfigured()) {
        errorLogger.warn("Database not configured for beats service");
        return [];
      }

      const featuredBeats = await db
        .select()
        .from(beats)
        .where(and(eq(beats.isActive, true), eq(beats.isFeatured, true)))
        .orderBy(desc(beats.createdAt))
        .limit(limit);

      return featuredBeats;
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "featured beats", getErrorMessage(error), error as Error)
      );
      // Return empty array instead of throwing to prevent page crashes
      return [];
    }
  },

  async getAll(options?: { onlyActive?: boolean; limit?: number }) {
    const context = { service: "BeatsService", method: "getAll" };

    try {
      const { db, isDatabaseConfigured } = await import("@/db/client");
      const { beats } = await import("@/db/schema");
      const { eq, desc } = await import("drizzle-orm");

      if (!isDatabaseConfigured()) {
        errorLogger.warn("Database not configured for beats service");
        return [];
      }

      const allBeats = options?.onlyActive !== false
        ? await db.select().from(beats).where(eq(beats.isActive, true)).orderBy(desc(beats.createdAt))
        : await db.select().from(beats).orderBy(desc(beats.createdAt));

      if (options?.limit) {
        return allBeats.slice(0, options.limit);
      }

      return allBeats;
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "beats", getErrorMessage(error), error as Error)
      );
      return [];
    }
  },

  async getBySlug(slug: string) {
    const context = { service: "BeatsService", method: "getBySlug", entityId: slug };

    try {
      if (!slug) {
        throw ValidationError.invalidInput("slug", "Beat slug is required");
      }

      const { db, isDatabaseConfigured } = await import("@/db/client");
      const { beats } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");

      if (!isDatabaseConfigured()) {
        errorLogger.warn("Database not configured for beats service", { slug });
        return null;
      }

      const [beat] = await db
        .select()
        .from(beats)
        .where(eq(beats.slug, slug))
        .limit(1);

      if (!beat) {
        errorLogger.warn(`Beat not found by slug`, { slug });
      }

      return beat || null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "beat", `Slug: ${slug}`, error as Error)
      );
      return null;
    }
  },
};

// ===========================================
// UPCOMING RELEASES SERVICE
// ===========================================

export const upcomingReleasesService = {
  async getActive(limit = 10) {
    try {
      const { db, isDatabaseConfigured } = await import("@/db/client");
      const { upcomingReleases } = await import("@/db/schema");
      const { eq, and, gte, desc } = await import("drizzle-orm");

      if (!isDatabaseConfigured()) {
        return [];
      }

      const now = new Date();
      const releases = await db
        .select()
        .from(upcomingReleases)
        .where(
          and(
            eq(upcomingReleases.isActive, true),
            gte(upcomingReleases.releaseDate, now)
          )
        )
        .orderBy(upcomingReleases.releaseDate)
        .limit(limit);

      return releases;
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "upcoming releases", getErrorMessage(error), error as Error)
      );
      return [];
    }
  },

  async getFeatured(limit = 5) {
    try {
      const { db, isDatabaseConfigured } = await import("@/db/client");
      const { upcomingReleases } = await import("@/db/schema");
      const { eq, and, gte, desc } = await import("drizzle-orm");

      if (!isDatabaseConfigured()) {
        return [];
      }

      const now = new Date();
      const releases = await db
        .select()
        .from(upcomingReleases)
        .where(
          and(
            eq(upcomingReleases.isActive, true),
            eq(upcomingReleases.isFeatured, true),
            gte(upcomingReleases.releaseDate, now)
          )
        )
        .orderBy(upcomingReleases.releaseDate)
        .limit(limit);

      return releases;
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "featured upcoming releases", getErrorMessage(error), error as Error)
      );
      return [];
    }
  },

  async getByArtistName(artistName: string, limit = 5) {
    try {
      const { db, isDatabaseConfigured } = await import("@/db/client");
      const { upcomingReleases } = await import("@/db/schema");
      const { eq, and, gte, like, or, desc } = await import("drizzle-orm");

      if (!isDatabaseConfigured()) {
        return [];
      }

      const now = new Date();
      // Search in artistName or featuredArtists (which is JSON but stored as text)
      const releases = await db
        .select()
        .from(upcomingReleases)
        .where(
          and(
            eq(upcomingReleases.isActive, true),
            gte(upcomingReleases.releaseDate, now),
            or(
              eq(upcomingReleases.artistName, artistName),
              like(upcomingReleases.artistName, `%${artistName}%`),
              like(upcomingReleases.featuredArtists, `%${artistName}%`)
            )
          )
        )
        .orderBy(upcomingReleases.releaseDate)
        .limit(limit);

      return releases;
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "artist upcoming releases", getErrorMessage(error), error as Error)
      );
      return [];
    }
  },

  async getBySlug(slug: string) {
    try {
      const { db, isDatabaseConfigured } = await import("@/db/client");
      const { upcomingReleases } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");

      if (!isDatabaseConfigured()) {
        return null;
      }

      const [release] = await db
        .select()
        .from(upcomingReleases)
        .where(eq(upcomingReleases.slug, slug))
        .limit(1);

      return release || null;
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "upcoming release", `Slug: ${slug}`, error as Error)
      );
      return null;
    }
  },

  async incrementPresaveCount(id: string) {
    try {
      const { db, isDatabaseConfigured } = await import("@/db/client");
      const { upcomingReleases } = await import("@/db/schema");
      const { eq, sql } = await import("drizzle-orm");

      if (!isDatabaseConfigured()) {
        return;
      }

      await db
        .update(upcomingReleases)
        .set({
          presaveCount: sql`${upcomingReleases.presaveCount} + 1`,
        })
        .where(eq(upcomingReleases.id, id));
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("update", "upcoming release presave count", `ID: ${id}`, error as Error)
      );
    }
  },
};

// ===========================================
// SITE SETTINGS SERVICE
// ===========================================

export const siteSettingsService = {
  async get(key: string) {
    try {
      if (!key) {
        throw ValidationError.invalidInput("key", "Setting key is required");
      }
      return await siteSettingsRepository.get(key);
    } catch (error) {
      if (error instanceof AppError) throw error;
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "site setting", `Key: ${key}`, error as Error)
      );
      throw DatabaseError.queryFailed("fetch", "site setting", `Failed to get setting: ${key}`, error as Error);
    }
  },

  async set(key: string, value: string) {
    try {
      if (!key) {
        throw ValidationError.invalidInput("key", "Setting key is required");
      }
      errorLogger.info(`Updating site setting`, { key });
      return await siteSettingsRepository.set(key, value);
    } catch (error) {
      if (error instanceof AppError) throw error;
      errorLogger.log(
        DatabaseError.queryFailed("update", "site setting", `Key: ${key}`, error as Error)
      );
      throw DatabaseError.queryFailed("update", "site setting", `Failed to set setting: ${key}`, error as Error);
    }
  },

  async getAll() {
    try {
      return await siteSettingsRepository.findAll();
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "site settings", getErrorMessage(error), error as Error)
      );
      throw DatabaseError.queryFailed("fetch", "site settings", undefined, error as Error);
    }
  },

  async getSiteInfo() {
    try {
      return await siteSettingsRepository.getMultiple([
        "site_name",
        "site_tagline",
        "contact_email",
        "contact_phone",
        "location",
        "founded_year",
        "spotify_playlist_url",
        "youtube_channel_url",
        "instagram_url",
        "facebook_url",
      ]);
    } catch (error) {
      errorLogger.log(
        DatabaseError.queryFailed("fetch", "site info", getErrorMessage(error), error as Error)
      );
      throw DatabaseError.queryFailed("fetch", "site info", undefined, error as Error);
    }
  },
};
