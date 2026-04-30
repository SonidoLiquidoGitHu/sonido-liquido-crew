import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { artists, artistExternalProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { artistsRoster } from "@/lib/data/artists-roster";
import { generateUUID, slugify } from "@/lib/utils";
import { spotifyClient } from "@/lib/clients";
import {
  AppError,
  DatabaseError,
  ExternalApiError,
  errorLogger,
  getErrorMessage,
  createErrorResponse,
  ErrorCode,
} from "@/lib/errors";

// Spotify oembed endpoint (no auth, no rate limits)
async function fetchArtistEmbed(spotifyId: string): Promise<{
  name: string;
  imageUrl: string | null;
} | null> {
  const context = { service: "SpotifySync", method: "fetchArtistEmbed", entityId: spotifyId };

  try {
    const url = `https://open.spotify.com/oembed?url=https://open.spotify.com/artist/${spotifyId}`;

    errorLogger.info(`Fetching Spotify oembed data`, { spotifyId, url });

    const response = await fetch(url, {
      headers: {
        "User-Agent": "SonidoLiquido/1.0",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");

      if (response.status === 404) {
        errorLogger.warn(`Spotify artist not found via oembed`, { spotifyId });
        return null;
      }

      if (response.status === 429) {
        errorLogger.warn(`Spotify oembed rate limited`, { spotifyId });
        throw ExternalApiError.rateLimited("Spotify", parseInt(response.headers.get("Retry-After") || "60", 10));
      }

      errorLogger.warn(`Spotify oembed request failed`, {
        spotifyId,
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText.substring(0, 200),
      });

      return null;
    }

    const data = await response.json();

    if (!data || typeof data !== "object") {
      errorLogger.warn(`Invalid response from Spotify oembed`, { spotifyId, data });
      return null;
    }

    return {
      name: data.title || "",
      imageUrl: data.thumbnail_url || null,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;

    errorLogger.log(
      ExternalApiError.spotifyError(
        "fetch artist oembed",
        `Spotify ID: ${spotifyId} - ${getErrorMessage(error)}`,
        undefined,
        error as Error
      )
    );
    return null;
  }
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const context = { service: "SpotifySync", method: "POST", requestId };

  errorLogger.info(`Starting Spotify sync`, { requestId });

  try {
    // Check database configuration
    if (!isDatabaseConfigured()) {
      const error = DatabaseError.notConfigured();
      errorLogger.log(error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            help: "Set DATABASE_URL and DATABASE_AUTH_TOKEN environment variables",
          },
        },
        { status: 503 }
      );
    }

    // Parse request body
    let body: { mode?: string } = {};
    try {
      body = await request.json();
    } catch (parseError) {
      errorLogger.warn(`Failed to parse request body, using defaults`, { requestId });
      body = {};
    }

    const mode = body.mode || "sync"; // "sync" | "seed" | "images-only" | "stats"
    errorLogger.info(`Sync mode: ${mode}`, { requestId, mode });

    let processed = 0;
    let failed = 0;
    let created = 0;
    const errors: Array<{ artist: string; error: string; code?: string }> = [];

    // Mode: seed - Create artists from roster if they don't exist
    if (mode === "seed") {
      errorLogger.info(`[Spotify Sync] Seeding ${artistsRoster.length} artists from roster...`, { requestId });

      for (const rosterArtist of artistsRoster) {
        try {
          errorLogger.info(`Processing roster artist`, { name: rosterArtist.name, spotifyId: rosterArtist.spotifyId });

          // Check if artist exists
          const [existing] = await db
            .select()
            .from(artists)
            .where(eq(artists.slug, rosterArtist.slug))
            .limit(1);

          if (!existing) {
            // Fetch image from Spotify
            errorLogger.info(`Fetching image for new artist`, { name: rosterArtist.name });
            const embedData = await fetchArtistEmbed(rosterArtist.spotifyId);

            // Add delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Create artist
            const artistId = generateUUID();

            try {
              await db.insert(artists).values({
                id: artistId,
                name: rosterArtist.name,
                slug: rosterArtist.slug,
                role: (rosterArtist.role as "mc" | "dj" | "producer" | "cantante") || "mc",
                bio: rosterArtist.bio || null,
                profileImageUrl: embedData?.imageUrl || null,
                isActive: true,
                verificationStatus: "verified",
              });
            } catch (dbError) {
              const error = DatabaseError.queryFailed(
                "insert",
                "artist",
                `Name: ${rosterArtist.name} - ${getErrorMessage(dbError)}`,
                dbError as Error
              );
              errorLogger.log(error);
              throw error;
            }

            // Add Spotify profile
            try {
              await db.insert(artistExternalProfiles).values({
                id: generateUUID(),
                artistId,
                platform: "spotify",
                externalId: rosterArtist.spotifyId,
                externalUrl: rosterArtist.spotifyUrl,
                isVerified: true,
              });
            } catch (dbError) {
              errorLogger.warn(`Failed to add Spotify profile for ${rosterArtist.name}`, {
                error: getErrorMessage(dbError),
              });
            }

            // Add Instagram profile if available
            if (rosterArtist.instagramUrl) {
              try {
                await db.insert(artistExternalProfiles).values({
                  id: generateUUID(),
                  artistId,
                  platform: "instagram",
                  externalUrl: rosterArtist.instagramUrl,
                  handle: rosterArtist.instagramHandle,
                  isVerified: false,
                });
              } catch (dbError) {
                errorLogger.warn(`Failed to add Instagram profile for ${rosterArtist.name}`, {
                  error: getErrorMessage(dbError),
                });
              }
            }

            // Add YouTube profile if available
            if (rosterArtist.youtubeUrl) {
              try {
                await db.insert(artistExternalProfiles).values({
                  id: generateUUID(),
                  artistId,
                  platform: "youtube",
                  externalUrl: rosterArtist.youtubeUrl,
                  handle: rosterArtist.youtubeHandle,
                  isVerified: false,
                });
              } catch (dbError) {
                errorLogger.warn(`Failed to add YouTube profile for ${rosterArtist.name}`, {
                  error: getErrorMessage(dbError),
                });
              }
            }

            created++;
            errorLogger.info(`✓ Created artist: ${rosterArtist.name}`, { artistId, hasImage: !!embedData?.imageUrl });
          } else {
            // Update existing artist with roster data
            try {
              await db
                .update(artists)
                .set({
                  role: (rosterArtist.role as "mc" | "dj" | "producer" | "cantante") || existing.role,
                  bio: rosterArtist.bio || existing.bio,
                  updatedAt: new Date(),
                })
                .where(eq(artists.id, existing.id));
              processed++;
              errorLogger.info(`✓ Updated existing artist: ${rosterArtist.name}`, { artistId: existing.id });
            } catch (dbError) {
              errorLogger.warn(`Failed to update artist ${rosterArtist.name}`, {
                error: getErrorMessage(dbError),
              });
            }
          }
        } catch (error) {
          failed++;
          const errorMessage = getErrorMessage(error);
          const errorCode = error instanceof AppError ? error.code : ErrorCode.UNKNOWN_ERROR;
          errors.push({
            artist: rosterArtist.name,
            error: errorMessage,
            code: errorCode,
          });
          errorLogger.warn(`Failed to seed artist: ${rosterArtist.name}`, { error: errorMessage });
        }
      }

      errorLogger.info(`Seed operation complete`, { created, processed, failed, requestId });

      return NextResponse.json({
        success: true,
        mode: "seed",
        created,
        processed,
        failed,
        errors: errors.length > 0 ? errors : undefined,
        message: `Seeded roster: ${created} created, ${processed} updated${failed > 0 ? `, ${failed} failed` : ""}`,
        requestId,
      });
    }

    // Mode: stats - Sync follower stats using full Spotify API
    if (mode === "stats") {
      // Check if Spotify API is configured
      if (!spotifyClient.isConfigured()) {
        return NextResponse.json({
          success: false,
          error: {
            code: "SPOTIFY_NOT_CONFIGURED",
            message: "Spotify API credentials not configured",
            help: "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables",
          },
        }, { status: 503 });
      }

      errorLogger.info(`Fetching all artists for stats sync`, { requestId });

      // Get artists and their Spotify profiles separately to avoid relation issues
      let allArtists;
      let allProfiles;
      try {
        allArtists = await db.select().from(artists);
        allProfiles = await db.select().from(artistExternalProfiles).where(eq(artistExternalProfiles.platform, "spotify"));
      } catch (dbError) {
        const error = DatabaseError.queryFailed("fetch", "artists", getErrorMessage(dbError), dbError as Error);
        errorLogger.log(error);
        return NextResponse.json(createErrorResponse(error), { status: 500 });
      }

      // Get all Spotify IDs - filter for valid, non-empty IDs
      const spotifyIds: { artistId: string; spotifyId: string; profileId: string; artistName: string }[] = [];
      for (const artist of allArtists) {
        const spotifyProfile = allProfiles.find(p => p.artistId === artist.id);
        // Only add if externalId exists, is a string, and is not empty
        if (spotifyProfile?.externalId && typeof spotifyProfile.externalId === "string" && spotifyProfile.externalId.trim().length > 0) {
          spotifyIds.push({
            artistId: artist.id,
            spotifyId: spotifyProfile.externalId.trim(),
            profileId: spotifyProfile.id,
            artistName: artist.name,
          });
        }
      }

      errorLogger.info(`Found ${spotifyIds.length} artists with valid Spotify IDs`, { requestId, ids: spotifyIds.map(s => s.spotifyId) });

      if (spotifyIds.length === 0) {
        return NextResponse.json({
          success: false,
          mode: "stats",
          error: {
            code: "NO_SPOTIFY_IDS",
            message: "No artists found with valid Spotify IDs",
            help: "Ensure artists have Spotify profiles with external IDs configured",
          },
        }, { status: 400 });
      }

      // Fetch stats from Spotify API (batched by 50)
      const chunks: typeof spotifyIds[] = [];
      for (let i = 0; i < spotifyIds.length; i += 50) {
        chunks.push(spotifyIds.slice(i, i + 50));
      }

      for (const chunk of chunks) {
        try {
          // Validate all IDs in the chunk are valid
          const validIds = chunk.filter(c => c.spotifyId && c.spotifyId.length > 0).map(c => c.spotifyId);

          if (validIds.length === 0) {
            errorLogger.warn(`Skipping chunk with no valid IDs`, { requestId });
            continue;
          }

          errorLogger.info(`Fetching Spotify data for ${validIds.length} artists`, { requestId, ids: validIds });

          const spotifyArtists = await spotifyClient.getArtists(validIds);

          for (const spotifyArtist of spotifyArtists) {
            if (!spotifyArtist) continue;

            const mapping = chunk.find(c => c.spotifyId === spotifyArtist.id);
            if (!mapping) continue;

            try {
              // Update artist with followers
              await db
                .update(artists)
                .set({
                  followers: spotifyArtist.followers?.total || 0,
                  profileImageUrl: spotifyArtist.images?.[0]?.url || undefined,
                  updatedAt: new Date(),
                })
                .where(eq(artists.id, mapping.artistId));

              // Update external profile with sync time
              await db
                .update(artistExternalProfiles)
                .set({
                  followerCount: spotifyArtist.followers?.total || 0,
                  lastSynced: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(artistExternalProfiles.id, mapping.profileId));

              processed++;
              errorLogger.info(`✓ Synced stats for ${spotifyArtist.name}: ${spotifyArtist.followers?.total} followers`, {
                artistId: mapping.artistId,
              });
            } catch (dbError) {
              failed++;
              errors.push({
                artist: spotifyArtist.name,
                error: getErrorMessage(dbError),
              });
            }
          }
        } catch (apiError) {
          failed += chunk.length;
          const errorMsg = getErrorMessage(apiError);
          errorLogger.warn(`Failed to fetch Spotify batch`, { error: errorMsg, chunk: chunk.map(c => c.spotifyId) });
          errors.push({
            artist: `Batch of ${chunk.length} artists`,
            error: errorMsg,
          });
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      return NextResponse.json({
        success: true,
        mode: "stats",
        processed,
        failed,
        errors: errors.length > 0 ? errors : undefined,
        message: `Synced stats for ${processed} artists${failed > 0 ? `, ${failed} failed` : ""}`,
        requestId,
      });
    }

    // Mode: sync or images-only - Sync images from Spotify
    errorLogger.info(`Fetching all artists for image sync`, { requestId });

    let allArtists;
    try {
      allArtists = await db.query.artists.findMany({
        with: {
          externalProfiles: true,
        },
      });
    } catch (dbError) {
      const error = DatabaseError.queryFailed("fetch", "artists with profiles", getErrorMessage(dbError), dbError as Error);
      errorLogger.log(error);
      return NextResponse.json(createErrorResponse(error), { status: 500 });
    }

    errorLogger.info(`Found ${allArtists.length} artists to process`, { requestId });

    for (const artist of allArtists) {
      const spotifyProfile = artist.externalProfiles?.find(
        (p) => p.platform === "spotify"
      );

      if (!spotifyProfile?.externalId) {
        // Try to find in roster by slug
        const rosterArtist = artistsRoster.find(r => r.slug === artist.slug);
        if (rosterArtist) {
          // Add missing Spotify profile
          try {
            await db.insert(artistExternalProfiles).values({
              id: generateUUID(),
              artistId: artist.id,
              platform: "spotify",
              externalId: rosterArtist.spotifyId,
              externalUrl: rosterArtist.spotifyUrl,
              isVerified: true,
            });
            errorLogger.info(`✓ Added Spotify profile for ${artist.name}`, { artistId: artist.id });
          } catch (dbError) {
            errorLogger.warn(`Failed to add Spotify profile for ${artist.name}`, {
              error: getErrorMessage(dbError),
            });
          }
        } else {
          errorLogger.warn(`No Spotify ID found for artist`, {
            artistName: artist.name,
            artistId: artist.id,
            help: "Add artist to artistsRoster or manually add Spotify profile",
          });
        }
        continue;
      }

      // Small delay to be nice to the server
      await new Promise((resolve) => setTimeout(resolve, 150));

      try {
        const embedData = await fetchArtistEmbed(spotifyProfile.externalId);

        if (embedData?.imageUrl) {
          await db
            .update(artists)
            .set({
              profileImageUrl: embedData.imageUrl,
              updatedAt: new Date(),
            })
            .where(eq(artists.id, artist.id));

          processed++;
          errorLogger.info(`✓ Updated image for ${artist.name}`, {
            artistId: artist.id,
            imageUrl: embedData.imageUrl.substring(0, 50) + "...",
          });
        } else {
          failed++;
          errors.push({
            artist: artist.name,
            error: "No image found in Spotify oembed response",
            code: ErrorCode.API_INVALID_RESPONSE,
          });
          errorLogger.warn(`No image found for ${artist.name}`, {
            spotifyId: spotifyProfile.externalId,
          });
        }
      } catch (error) {
        failed++;
        errors.push({
          artist: artist.name,
          error: getErrorMessage(error),
          code: error instanceof AppError ? error.code : ErrorCode.UNKNOWN_ERROR,
        });
        errorLogger.warn(`Failed to sync ${artist.name}`, { error: getErrorMessage(error) });
      }
    }

    errorLogger.info(`Sync operation complete`, { processed, failed, requestId });

    return NextResponse.json({
      success: true,
      mode: "sync",
      processed,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      message: `Synced ${processed} artists using embed API${failed > 0 ? `, ${failed} failed` : ""}`,
      requestId,
    });
  } catch (error) {
    errorLogger.log(
      error instanceof AppError
        ? error
        : new AppError(
            `Spotify sync failed: ${getErrorMessage(error)}`,
            ErrorCode.UNKNOWN_ERROR,
            500,
            context,
            error as Error
          )
    );

    return NextResponse.json(
      createErrorResponse(error, "Failed to run Spotify sync"),
      { status: error instanceof AppError ? error.statusCode : 500 }
    );
  }
}

export async function GET() {
  const requestId = Math.random().toString(36).substring(7);

  try {
    if (!isDatabaseConfigured()) {
      errorLogger.info(`Database not configured, returning default status`, { requestId });
      return NextResponse.json({
        success: true,
        data: {
          totalArtists: 0,
          artistsWithImages: 0,
          artistsWithoutImages: 0,
          rosterCount: artistsRoster.length,
          lastSync: null,
          databaseConfigured: false,
        },
        requestId,
      });
    }

    let allArtists;
    try {
      allArtists = await db.query.artists.findMany();
    } catch (dbError) {
      const error = DatabaseError.queryFailed("fetch", "artists", getErrorMessage(dbError), dbError as Error);
      errorLogger.log(error);
      return NextResponse.json(createErrorResponse(error), { status: 500 });
    }

    const artistsWithImages = allArtists.filter((a) => a.profileImageUrl);
    const artistsWithoutImages = allArtists.filter((a) => !a.profileImageUrl);

    return NextResponse.json({
      success: true,
      data: {
        totalArtists: allArtists.length,
        artistsWithImages: artistsWithImages.length,
        artistsWithoutImages: artistsWithoutImages.length,
        artistsNeedingSync: artistsWithoutImages.map((a) => ({ id: a.id, name: a.name, slug: a.slug })),
        rosterCount: artistsRoster.length,
        lastSync: null, // Will be enabled after migration
        databaseConfigured: true,
      },
      requestId,
    });
  } catch (error) {
    errorLogger.log(
      error instanceof AppError
        ? error
        : new AppError(
            `Failed to fetch Spotify sync status: ${getErrorMessage(error)}`,
            ErrorCode.UNKNOWN_ERROR,
            500,
            { service: "SpotifySync", method: "GET", requestId },
            error as Error
          )
    );

    return NextResponse.json(
      createErrorResponse(error, "Failed to fetch sync status"),
      { status: 500 }
    );
  }
}
