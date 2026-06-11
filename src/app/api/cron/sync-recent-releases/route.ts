import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { releases, releaseArtists, artists, artistExternalProfiles } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";
import { spotifyClient } from "@/lib/clients";
import { releasesRepository } from "@/lib/repositories";

// ===========================================
// LIGHTWEIGHT DAILY SYNC - RECENT RELEASES ONLY
// ===========================================
// Designed for scheduled/cron use. Uses spotifyClient (env var credentials).
// Processes one artist at a time via ?artist=INDEX (0-14) or all.
// Handles multi-artist collaborations properly.
//
// IMPORTANT: Uses fire-and-forget pattern. Responds immediately with 202
// and processes in the background. This prevents Netlify CDN inactivity timeouts.
// Set ?wait=true to wait for results (may timeout for large syncs).

export const maxDuration = 60;

const SLC_ARTISTS = [
  { name: "Brez", spotifyId: "2jJmTEMkGQfH3BxoG3MQvF" },
  { name: "Bruno Grasso", spotifyId: "4fNQqyvcM71IyF2EitEtCj" },
  { name: "Chas 7P", spotifyId: "3RAg8fPmZ8RnacJO8MhLP1" },
  { name: "Codak", spotifyId: "2zrv1oduhIYh29vvQZwI5r" },
  { name: "Dilema", spotifyId: "3eCEorgAoZkvnAQLdy4x38" },
  { name: "Fancy Freak", spotifyId: "5TMoczTLclVyzzDY5qf3Yb" },
  { name: "Hassyel", spotifyId: "6AN9ek9RwrLbSp9rT2lcDG" },
  { name: "Kev Cabrone", spotifyId: "0QdRhOmiqAcV1dPCoiSIQJ" },
  { name: "Latin Geisha", spotifyId: "16YScXC67nAnFDcA2LGdY0" },
  { name: "Pepe Levine", spotifyId: "5HrBwfVDf0HXzGDrJ6Znqc" },
  { name: "Q Master Weed", spotifyId: "4T4Z7jvUcMV16VsslRRuC5" },
  { name: "Reick One", spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ" },
  { name: "X Santa-Ana", spotifyId: "2Apt0MjZGqXAd1pl4LNQrR" },
  { name: "Zaque", spotifyId: "4WQmw3fIx9F7iPKL5v8SCN" },
];

function mapAlbumType(albumType: string): "album" | "ep" | "single" | "compilation" {
  switch (albumType.toLowerCase()) {
    case "album": return "album";
    case "single": return "single";
    case "compilation": return "compilation";
    default: return "single";
  }
}

function parseReleaseDate(dateStr: string): Date {
  const parts = dateStr.split("-");
  if (parts.length === 1) return new Date(`${dateStr}-01-01`);
  if (parts.length === 2) return new Date(`${dateStr}-01`);
  return new Date(dateStr);
}

function getBestCoverImage(images: { url: string; width: number; height: number }[]): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort((a, b) => (b.width || 0) - (a.width || 0));
  return sorted[0]?.url || null;
}

// ===========================================
// CORE SYNC LOGIC (shared between fire-and-forget and wait modes)
// ===========================================
async function runSync(artistsToProcess: typeof SLC_ARTISTS) {
  const results = {
    success: true,
    timestamp: new Date().toISOString(),
    totalArtistsProcessed: 0,
    totalReleasesFound: 0,
    newReleasesCreated: 0,
    existingReleasesSkipped: 0,
    newArtistLinksCreated: 0,
    errors: [] as string[],
    artistBreakdown: [] as { name: string; found: number; created: number; linked: number }[],
  };

  try {
    if (!spotifyClient.isConfigured()) {
      results.success = false;
      results.errors.push("Spotify API not configured");
      return results;
    }

    const dbArtists = await db.select().from(artists);
    const spotifyProfiles = await db.select().from(artistExternalProfiles)
      .where(eq(artistExternalProfiles.platform, "spotify"));

    const artistByNameMap = new Map<string, { artist: typeof dbArtists[0]; spotifyId: string | null }>();
    const artistBySpotifyIdMap = new Map<string, typeof dbArtists[0]>();

    for (const artist of dbArtists) {
      const spotifyProfile = spotifyProfiles.find(p => p.artistId === artist.id);
      const spotifyId = spotifyProfile?.externalId || null;
      artistByNameMap.set(artist.name.toLowerCase(), { artist, spotifyId });
      if (spotifyId) artistBySpotifyIdMap.set(spotifyId, artist);
    }
    for (const slcArtist of SLC_ARTISTS) {
      if (!artistBySpotifyIdMap.has(slcArtist.spotifyId)) {
        const dbEntry = artistByNameMap.get(slcArtist.name.toLowerCase());
        if (dbEntry) artistBySpotifyIdMap.set(slcArtist.spotifyId, dbEntry.artist);
      }
    }

    const processedReleaseIds = new Set<string>();

    for (const slcArtist of artistsToProcess) {
      try {
        const artistData = artistByNameMap.get(slcArtist.name.toLowerCase());
        if (!artistData) {
          results.errors.push(`Artist ${slcArtist.name} not found in database`);
          continue;
        }

        const dbArtist = artistData.artist;

        if (!artistData.spotifyId) {
          try {
            await db.insert(artistExternalProfiles).values({
              id: generateUUID(),
              artistId: dbArtist.id,
              platform: "spotify",
              externalId: slcArtist.spotifyId,
              externalUrl: `https://open.spotify.com/artist/${slcArtist.spotifyId}`,
              isVerified: true,
            });
          } catch { /* might exist */ }
        }

        console.log(`[Cron Sync] Fetching albums for ${slcArtist.name}...`);

        const albumsResponse = await spotifyClient.getArtistAlbums(slcArtist.spotifyId, {
          includeGroups: "album,single,compilation",
          limit: 10, // Spotify reduced max limit to 10 for client credentials
        });
        const albums = albumsResponse.items || [];

        const artistStats = { name: slcArtist.name, found: albums.length, created: 0, linked: 0 };
        results.totalReleasesFound += albums.length;

        for (const album of albums) {
          if (processedReleaseIds.has(album.id)) {
            const [existingRelease] = await db.select().from(releases)
              .where(eq(releases.spotifyId, album.id)).limit(1);
            if (existingRelease) {
              const [existingLink] = await db.select().from(releaseArtists)
                .where(and(eq(releaseArtists.releaseId, existingRelease.id), eq(releaseArtists.artistId, dbArtist.id))).limit(1);
              if (!existingLink) {
                try {
                  await db.insert(releaseArtists).values({ id: generateUUID(), releaseId: existingRelease.id, artistId: dbArtist.id, isPrimary: false });
                  results.newArtistLinksCreated++;
                  artistStats.linked++;
                } catch { /* dup */ }
              }
            }
            continue;
          }
          processedReleaseIds.add(album.id);

          const [existing] = await db.select().from(releases)
            .where(eq(releases.spotifyId, album.id)).limit(1);

          if (existing) {
            // Update missing fields on existing releases (especially coverImageUrl)
            const coverUrl = getBestCoverImage(album.images);
            const updates: Record<string, unknown> = {};
            if (!existing.coverImageUrl && coverUrl) {
              updates.coverImageUrl = coverUrl;
            }
            if (!existing.spotifyUrl && album.external_urls?.spotify) {
              updates.spotifyUrl = album.external_urls.spotify;
            }
            if (Object.keys(updates).length > 0) {
              try {
                await db.update(releases).set(updates).where(eq(releases.id, existing.id));
                console.log(`[Cron Sync] Updated missing fields for: ${existing.title}`);
              } catch { /* non-critical */ }
            }

            results.existingReleasesSkipped++;
            const [existingLink] = await db.select().from(releaseArtists)
              .where(and(eq(releaseArtists.releaseId, existing.id), eq(releaseArtists.artistId, dbArtist.id))).limit(1);
            if (!existingLink) {
              try {
                await db.insert(releaseArtists).values({ id: generateUUID(), releaseId: existing.id, artistId: dbArtist.id, isPrimary: false });
                results.newArtistLinksCreated++;
                artistStats.linked++;
              } catch { /* dup */ }
            }
            continue;
          }

          // Before creating, also try matching by title (for manually-created releases without spotifyId)
          const [manualMatch] = await db.select().from(releases)
            .where(and(
              eq(releases.title, album.name),
              sql`${releases.spotifyId} IS NULL`
            )).limit(1);

          if (manualMatch) {
            // Update the manually-created release with Spotify data
            const coverUrl = getBestCoverImage(album.images);
            const updates: Record<string, unknown> = {
              spotifyId: album.id,
              updatedAt: new Date(),
            };
            if (!manualMatch.coverImageUrl && coverUrl) {
              updates.coverImageUrl = coverUrl;
            }
            if (!manualMatch.spotifyUrl && album.external_urls?.spotify) {
              updates.spotifyUrl = album.external_urls.spotify;
            }
            try {
              await db.update(releases).set(updates).where(eq(releases.id, manualMatch.id));
              console.log(`[Cron Sync] Linked manual release to Spotify: ${album.name}`);

              // Also link the artist if not already linked
              const [existingLink] = await db.select().from(releaseArtists)
                .where(and(eq(releaseArtists.releaseId, manualMatch.id), eq(releaseArtists.artistId, dbArtist.id))).limit(1);
              if (!existingLink) {
                try {
                  await db.insert(releaseArtists).values({ id: generateUUID(), releaseId: manualMatch.id, artistId: dbArtist.id, isPrimary: false });
                  results.newArtistLinksCreated++;
                } catch { /* dup */ }
              }
            } catch { /* non-critical */ }
            results.existingReleasesSkipped++;
            continue;
          }

          const releaseId = generateUUID();
          const releaseSlug = `${slugify(`${album.name}-${slcArtist.name}`)}-${generateUUID().substring(0, 8)}`;
          const releaseDate = parseReleaseDate(album.release_date);
          const coverUrl = getBestCoverImage(album.images);
          const allArtistNames = album.artists.map(a => a.name).join(", ");

          try {
            await db.insert(releases).values({
              id: releaseId,
              title: album.name,
              slug: releaseSlug,
              releaseType: mapAlbumType(album.album_type),
              releaseDate,
              coverImageUrl: coverUrl,
              spotifyId: album.id,
              spotifyUrl: album.external_urls?.spotify || null,
              description: `${album.album_type.charAt(0).toUpperCase() + album.album_type.slice(1)} by ${allArtistNames}`,
              isUpcoming: releaseDate > new Date(),
              isFeatured: album.album_type === "album",
            });

            const isPrimary = (id: string) => id === album.artists[0]?.id;
            let hasAnyLink = false;
            for (const albumArtist of album.artists) {
              const rosterArtist = artistBySpotifyIdMap.get(albumArtist.id);
              if (rosterArtist) {
                try {
                  await db.insert(releaseArtists).values({ id: generateUUID(), releaseId, artistId: rosterArtist.id, isPrimary: isPrimary(albumArtist.id) });
                  hasAnyLink = true;
                } catch { /* dup */ }
              }
            }
            if (!hasAnyLink) {
              await db.insert(releaseArtists).values({ id: generateUUID(), releaseId, artistId: dbArtist.id, isPrimary: true });
            }

            results.newReleasesCreated++;
            artistStats.created++;
            console.log(`[Cron Sync] Created: ${album.name}`);
          } catch (insertError) {
            const errorMsg = (insertError as Error).message;
            if (!errorMsg.includes("UNIQUE") && !errorMsg.includes("duplicate")) {
              results.errors.push(`Failed to insert ${album.name}: ${errorMsg}`);
            }
          }
        }

        results.artistBreakdown.push(artistStats);
        results.totalArtistsProcessed++;
        console.log(`[Cron Sync] ${slcArtist.name}: ${artistStats.created} new, ${artistStats.linked} links, ${artistStats.found} found`);
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (artistError) {
        results.errors.push(`Error processing ${slcArtist.name}: ${(artistError as Error).message}`);
        console.error(`[Cron Sync] Error with ${slcArtist.name}:`, (artistError as Error).message);
      }
    }

    // Auto-convert past-due upcoming releases
    const autoConvertResult = await releasesRepository.autoConvertUpcomingReleases();
    console.log(`[Cron Sync] Complete: ${results.newReleasesCreated} new, ${results.newArtistLinksCreated} links, ${results.errors.length} errors, autoConvert: ${autoConvertResult.converted} converted, ${autoConvertResult.fixed} fixed`);

  } catch (error) {
    results.success = false;
    results.errors.push((error as Error).message);
    console.error("[Cron Sync] Fatal error:", error);
  }

  return results;
}

// ===========================================
// POST - Sync releases
// ===========================================
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const artistIndex = request.nextUrl.searchParams.get("artist");
  const wait = request.nextUrl.searchParams.get("wait") === "true";
  const artistsToProcess = artistIndex !== null
    ? [SLC_ARTISTS[parseInt(artistIndex)]].filter(Boolean)
    : SLC_ARTISTS;

  // IMPORTANT: Always use fire-and-forget pattern to prevent Netlify CDN inactivity timeout.
  // The Spotify API can be slow from serverless environments, and the CDN kills connections
  // after ~10 seconds of inactivity. By responding immediately, we avoid this timeout.
  // Set ?wait=true only for local development or very fast networks.
  if (wait) {
    const results = await runSync(artistsToProcess);
    return NextResponse.json(results);
  }

  // Fire-and-forget: respond immediately, process in background
  // The serverless function will keep running until the promise settles
  console.log(`[Cron Sync] Starting background sync for ${artistsToProcess.length} artist(s)...`);
  const syncPromise = runSync(artistsToProcess);

  // Also trigger ISR revalidation after sync completes
  syncPromise.then(async (results) => {
    if (results.newReleasesCreated > 0) {
      try {
        const { revalidatePath } = await import("next/cache");
        revalidatePath("/");
        revalidatePath("/discografia");
        console.log("[Cron Sync] ISR revalidation triggered");
      } catch { /* non-critical */ }
    }
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    message: `Sync started for ${artistsToProcess.length} artist(s). Processing in background.`,
    artists: artistsToProcess.length,
    timestamp: new Date().toISOString(),
  }, { status: 202 });
}

// ===========================================
// GET - Status check
// ===========================================
export async function GET() {
  try {
    const totalReleases = await db.select().from(releases);
    const latestRelease = totalReleases
      .filter(r => r.releaseDate)
      .sort((a, b) => new Date(b.releaseDate!).getTime() - new Date(a.releaseDate!).getTime())[0];

    return NextResponse.json({
      success: true,
      totalReleases: totalReleases.length,
      latestRelease: latestRelease ? { title: latestRelease.title, releaseDate: latestRelease.releaseDate } : null,
      message: "POST to sync (responds immediately as 202, processes in background). Add ?wait=true to wait for results (may timeout). Add ?artist=0-14 for single artist.",
      spotifyConfigured: spotifyClient.isConfigured(),
      artists: SLC_ARTISTS.map((a, i) => ({ index: i, name: a.name, spotifyId: a.spotifyId })),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
