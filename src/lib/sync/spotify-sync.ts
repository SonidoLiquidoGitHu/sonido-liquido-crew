import { spotifyClient } from "@/lib/clients";
import { artistsRepository, releasesRepository, syncJobsRepository } from "@/lib/repositories";
import { generateUUID, slugify } from "@/lib/utils";
import type { SpotifyAlbum } from "@/types";

// ===========================================
// SPOTIFY SYNC SERVICE
// ===========================================

export interface SpotifySyncOptions {
  syncArtists?: boolean;
  syncReleases?: boolean;
  artistIds?: string[]; // Spotify artist IDs to sync
  force?: boolean;
}

export interface SpotifySyncResult {
  success: boolean;
  artistsProcessed: number;
  artistsFailed: number;
  releasesProcessed: number;
  releasesFailed: number;
  errors: string[];
}

/**
 * Sync artists and releases from Spotify
 */
export async function syncSpotify(options: SpotifySyncOptions = {}): Promise<SpotifySyncResult> {
  const result: SpotifySyncResult = {
    success: true,
    artistsProcessed: 0,
    artistsFailed: 0,
    releasesProcessed: 0,
    releasesFailed: 0,
    errors: [],
  };

  // Check if Spotify is configured
  if (!spotifyClient.isConfigured()) {
    result.success = false;
    result.errors.push("Spotify credentials not configured");
    return result;
  }

  // Create sync job
  const syncJob = await syncJobsRepository.create({
    source: "spotify",
    status: "running",
    startedAt: new Date(),
  });

  try {
    await syncJobsRepository.addLog(syncJob.id, "info", "Starting Spotify sync");

    // Get artists to sync
    let artistSpotifyIds: string[] = options.artistIds || [];

    if (artistSpotifyIds.length === 0) {
      // Get all artists with Spotify profiles from database
      const artists = await artistsRepository.findAll({ onlyActive: true });

      for (const artist of artists) {
        const profiles = await artistsRepository.getExternalProfiles(artist.id);
        const spotifyProfile = profiles.find((p) => p.platform === "spotify");
        if (spotifyProfile?.externalId) {
          artistSpotifyIds.push(spotifyProfile.externalId);
        }
      }
    }

    await syncJobsRepository.addLog(
      syncJob.id,
      "info",
      `Found ${artistSpotifyIds.length} artists with Spotify profiles`
    );

    // Sync artists
    if (options.syncArtists !== false && artistSpotifyIds.length > 0) {
      await syncJobsRepository.addLog(syncJob.id, "info", "Syncing artist data from Spotify");

      try {
        const spotifyArtists = await spotifyClient.getArtists(artistSpotifyIds);

        for (const spotifyArtist of spotifyArtists) {
          try {
            const localArtist = await artistsRepository.findBySpotifyId(spotifyArtist.id);

            if (localArtist) {
              // Update artist with latest Spotify data including stats
              await artistsRepository.update(localArtist.id, {
                profileImageUrl: spotifyArtist.images[0]?.url || localArtist.profileImageUrl,
                followers: spotifyArtist.followers?.total || localArtist.followers,
              });

              // Also update the external profile with follower count
              const profiles = await artistsRepository.getExternalProfiles(localArtist.id);
              const spotifyProfile = profiles.find(p => p.platform === "spotify");
              if (spotifyProfile) {
                await artistsRepository.updateExternalProfile(spotifyProfile.id, {
                  followerCount: spotifyArtist.followers?.total,
                  lastSynced: new Date(),
                });
              }

              result.artistsProcessed++;
            }
          } catch (error) {
            result.artistsFailed++;
            result.errors.push(`Failed to sync artist ${spotifyArtist.name}: ${(error as Error).message}`);
            await syncJobsRepository.addLog(
              syncJob.id,
              "error",
              `Failed to sync artist ${spotifyArtist.name}`,
              { error: (error as Error).message }
            );
          }
        }
      } catch (error) {
        result.errors.push(`Failed to fetch artists from Spotify: ${(error as Error).message}`);
        await syncJobsRepository.addLog(syncJob.id, "error", "Failed to fetch artists from Spotify", {
          error: (error as Error).message,
        });
      }
    }

    // Sync releases
    if (options.syncReleases !== false && artistSpotifyIds.length > 0) {
      await syncJobsRepository.addLog(syncJob.id, "info", "Syncing releases from Spotify");

      for (const artistSpotifyId of artistSpotifyIds) {
        try {
          const albums = await spotifyClient.getAllArtistAlbums(artistSpotifyId);
          const localArtist = await artistsRepository.findBySpotifyId(artistSpotifyId);

          if (!localArtist) continue;

          for (const album of albums) {
            try {
              await syncSpotifyRelease(album, localArtist.id);
              result.releasesProcessed++;
            } catch (error) {
              result.releasesFailed++;
              result.errors.push(`Failed to sync release ${album.name}: ${(error as Error).message}`);
            }
          }
        } catch (error) {
          result.errors.push(`Failed to fetch albums for artist ${artistSpotifyId}: ${(error as Error).message}`);
          await syncJobsRepository.addLog(syncJob.id, "error", `Failed to fetch albums for artist`, {
            artistSpotifyId,
            error: (error as Error).message,
          });
        }
      }
    }

    // Update sync job
    await syncJobsRepository.update(syncJob.id, {
      status: result.errors.length === 0 ? "completed" : "completed",
      completedAt: new Date(),
      itemsProcessed: result.artistsProcessed + result.releasesProcessed,
      itemsFailed: result.artistsFailed + result.releasesFailed,
    });

    await syncJobsRepository.addLog(
      syncJob.id,
      result.errors.length === 0 ? "info" : "warning",
      `Spotify sync completed: ${result.artistsProcessed} artists, ${result.releasesProcessed} releases`,
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

    await syncJobsRepository.addLog(syncJob.id, "error", "Spotify sync failed", {
      error: (error as Error).message,
    });
  }

  return result;
}

/**
 * Sync a single release from Spotify
 */
async function syncSpotifyRelease(album: SpotifyAlbum, artistId: string): Promise<void> {
  // Check if release already exists
  const existing = await releasesRepository.findBySpotifyId(album.id);

  const releaseType = mapAlbumType(album.album_type);
  const releaseDate = parseSpotifyDate(album.release_date);

  if (existing) {
    // Update existing release
    await releasesRepository.update(existing.id, {
      title: album.name,
      coverImageUrl: album.images[0]?.url,
      spotifyUrl: album.external_urls.spotify,
      releaseDate,
      releaseType,
    });
  } else {
    // Create new release
    await releasesRepository.create(
      {
        title: album.name,
        slug: slugify(album.name),
        releaseType,
        releaseDate,
        coverImageUrl: album.images[0]?.url,
        spotifyId: album.id,
        spotifyUrl: album.external_urls.spotify,
        isUpcoming: releaseDate > new Date(),
      },
      [artistId],
      artistId
    );
  }
}

/**
 * Map Spotify album type to our release type
 */
function mapAlbumType(albumType: string): "album" | "ep" | "single" | "compilation" {
  switch (albumType) {
    case "album":
      return "album";
    case "single":
      return "single";
    case "compilation":
      return "compilation";
    default:
      return "single";
  }
}

/**
 * Parse Spotify date format (YYYY, YYYY-MM, or YYYY-MM-DD)
 */
function parseSpotifyDate(dateStr: string): Date {
  const parts = dateStr.split("-");
  const year = parseInt(parts[0], 10);
  const month = parts[1] ? parseInt(parts[1], 10) - 1 : 0;
  const day = parts[2] ? parseInt(parts[2], 10) : 1;
  return new Date(year, month, day);
}

/**
 * Sync a single artist from Spotify by ID
 */
export async function syncSpotifyArtist(spotifyId: string): Promise<boolean> {
  if (!spotifyClient.isConfigured()) {
    throw new Error("Spotify credentials not configured");
  }

  try {
    const spotifyArtist = await spotifyClient.getArtist(spotifyId);
    const existing = await artistsRepository.findBySpotifyId(spotifyId);

    if (existing) {
      // Update existing artist with latest Spotify data
      await artistsRepository.update(existing.id, {
        profileImageUrl: spotifyArtist.images[0]?.url,
        followers: spotifyArtist.followers?.total,
      });

      // Update external profile with sync time
      const profiles = await artistsRepository.getExternalProfiles(existing.id);
      const spotifyProfile = profiles.find(p => p.platform === "spotify");
      if (spotifyProfile) {
        await artistsRepository.updateExternalProfile(spotifyProfile.id, {
          followerCount: spotifyArtist.followers?.total,
          lastSynced: new Date(),
        });
      }
    } else {
      const artist = await artistsRepository.create({
        name: spotifyArtist.name,
        slug: slugify(spotifyArtist.name),
        role: "mc",
        profileImageUrl: spotifyArtist.images[0]?.url,
        followers: spotifyArtist.followers?.total,
        verificationStatus: "pending",
      });

      await artistsRepository.addExternalProfile({
        artistId: artist.id,
        platform: "spotify",
        externalId: spotifyId,
        externalUrl: spotifyArtist.external_urls.spotify,
        followerCount: spotifyArtist.followers?.total,
        lastSynced: new Date(),
        isVerified: true,
      });
    }

    return true;
  } catch (error) {
    console.error("Failed to sync Spotify artist:", error);
    return false;
  }
}
