import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { artists, artistExternalProfiles, releases, releaseArtists } from "@/db/schema";
import { spotifyClient } from "@/lib/clients";
import { generateUUID, slugify } from "@/lib/utils";
import { eq, and, sql } from "drizzle-orm";

// ===========================================
// SYNC RELEASES FROM SPOTIFY
// ===========================================

interface SyncResult {
  artistName: string;
  artistId: string;
  spotifyId: string;
  albumsFound: number;
  albumsCreated: number;
  albumsSkipped: number;
  errors: string[];
}

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    if (!spotifyClient.isConfigured()) {
      return NextResponse.json(
        { success: false, error: "Spotify API credentials not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const specificArtistId = body.artistId; // Optional: sync only one artist

    console.log("[Sync Releases] Starting Spotify releases sync...");

    // Get all artists with their Spotify profiles
    const allArtists = await db.select().from(artists);

    const artistsToSync = specificArtistId
      ? allArtists.filter(a => a.id === specificArtistId)
      : allArtists;

    const results: SyncResult[] = [];
    let totalCreated = 0;
    let totalSkipped = 0;

    for (const artist of artistsToSync) {
      const result: SyncResult = {
        artistName: artist.name,
        artistId: artist.id,
        spotifyId: "",
        albumsFound: 0,
        albumsCreated: 0,
        albumsSkipped: 0,
        errors: [],
      };

      try {
        // Get Spotify profile for this artist
        const [spotifyProfile] = await db
          .select()
          .from(artistExternalProfiles)
          .where(
            and(
              eq(artistExternalProfiles.artistId, artist.id),
              eq(artistExternalProfiles.platform, "spotify")
            )
          )
          .limit(1);

        if (!spotifyProfile?.externalId) {
          result.errors.push("No Spotify profile found");
          results.push(result);
          continue;
        }

        result.spotifyId = spotifyProfile.externalId;
        console.log(`[Sync Releases] Fetching albums for ${artist.name} (${spotifyProfile.externalId})...`);

        // Fetch all albums from Spotify (albums, singles, compilations, appears_on)
        const spotifyAlbums = await spotifyClient.getAllArtistAlbums(spotifyProfile.externalId);
        result.albumsFound = spotifyAlbums.length;

        console.log(`[Sync Releases] Found ${spotifyAlbums.length} albums for ${artist.name}`);

        for (const album of spotifyAlbums) {
          try {
            // Check if release already exists by Spotify ID
            const [existingRelease] = await db
              .select()
              .from(releases)
              .where(eq(releases.spotifyId, album.id))
              .limit(1);

            if (existingRelease) {
              result.albumsSkipped++;
              totalSkipped++;
              continue;
            }

            // Determine release type
            let releaseType: "album" | "ep" | "single" | "compilation" = "single";
            if (album.album_type === "album") {
              releaseType = album.total_tracks > 6 ? "album" : "ep";
            } else if (album.album_type === "compilation") {
              releaseType = "compilation";
            } else if (album.album_type === "single") {
              releaseType = "single";
            }

            // Create slug (ensure uniqueness)
            let baseSlug = slugify(album.name);
            let slug = baseSlug;
            let counter = 1;

            while (true) {
              const [existingSlug] = await db
                .select()
                .from(releases)
                .where(eq(releases.slug, slug))
                .limit(1);

              if (!existingSlug) break;
              slug = `${baseSlug}-${counter}`;
              counter++;
            }

            // Create the release
            const releaseId = generateUUID();
            const releaseDate = new Date(album.release_date);

            await db.insert(releases).values({
              id: releaseId,
              title: album.name,
              slug,
              releaseType,
              releaseDate,
              coverImageUrl: album.images?.[0]?.url || null,
              spotifyId: album.id,
              spotifyUrl: album.external_urls?.spotify || null,
              description: `${releaseType === "album" ? "Álbum" : releaseType === "ep" ? "EP" : "Single"} de ${artist.name}. ${album.total_tracks} tracks.`,
              isUpcoming: releaseDate > new Date(),
              isFeatured: false,
            });

            // Create artist-release relationship
            await db.insert(releaseArtists).values({
              id: generateUUID(),
              releaseId,
              artistId: artist.id,
              isPrimary: true,
            });

            result.albumsCreated++;
            totalCreated++;

            console.log(`[Sync Releases] Created: ${album.name} (${releaseType})`);
          } catch (albumError) {
            const errMsg = `Failed to create ${album.name}: ${(albumError as Error).message}`;
            result.errors.push(errMsg);
            console.error(`[Sync Releases] ${errMsg}`);
          }
        }
      } catch (artistError) {
        result.errors.push(`Artist sync failed: ${(artistError as Error).message}`);
        console.error(`[Sync Releases] Error syncing ${artist.name}:`, artistError);
      }

      results.push(result);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`[Sync Releases] Complete: ${totalCreated} created, ${totalSkipped} skipped`);

    return NextResponse.json({
      success: true,
      message: `Synced releases: ${totalCreated} created, ${totalSkipped} already existed`,
      totalCreated,
      totalSkipped,
      results,
    });
  } catch (error) {
    console.error("[Sync Releases] Error:", error);
    return NextResponse.json(
      { success: false, error: `Failed to sync releases: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Get current release stats
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
    }

    const allReleases = await db.select().from(releases);
    const allArtists = await db.select().from(artists);

    // Get artists with their Spotify profiles
    const artistsWithProfiles = await Promise.all(
      allArtists.map(async (artist) => {
        const [spotifyProfile] = await db
          .select()
          .from(artistExternalProfiles)
          .where(
            and(
              eq(artistExternalProfiles.artistId, artist.id),
              eq(artistExternalProfiles.platform, "spotify")
            )
          )
          .limit(1);

        // Count releases for this artist
        const artistReleases = await db
          .select({ count: sql<number>`count(*)` })
          .from(releaseArtists)
          .where(eq(releaseArtists.artistId, artist.id));

        return {
          id: artist.id,
          name: artist.name,
          spotifyId: spotifyProfile?.externalId || null,
          releaseCount: artistReleases[0]?.count || 0,
        };
      })
    );

    const releasesByType = {
      album: allReleases.filter(r => r.releaseType === "album").length,
      ep: allReleases.filter(r => r.releaseType === "ep").length,
      single: allReleases.filter(r => r.releaseType === "single").length,
      compilation: allReleases.filter(r => r.releaseType === "compilation").length,
    };

    return NextResponse.json({
      success: true,
      data: {
        totalReleases: allReleases.length,
        totalArtists: allArtists.length,
        releasesByType,
        spotifyConfigured: spotifyClient.isConfigured(),
        artists: artistsWithProfiles,
      },
    });
  } catch (error) {
    console.error("[Sync Releases] GET error:", error);
    return NextResponse.json(
      { success: false, error: `Failed to get release stats: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
