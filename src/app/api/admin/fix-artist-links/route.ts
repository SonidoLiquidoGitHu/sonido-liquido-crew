import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { releases, releaseArtists, artists, artistExternalProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";
import { spotifyClient } from "@/lib/clients";

// ===========================================
// FIX MISSING ARTIST LINKS FOR COLLABORATION RELEASES
// ===========================================
// Uses the spotifyClient (which uses proper env var credentials) to
// fetch all artists on each release and create missing releaseArtists entries.

const SLC_SPOTIFY_IDS: Record<string, string> = {
  "2jJmTEMkGQfH3BxoG3MQvF": "Brez",
  "4fNQqyvcM71IyF2EitEtCj": "Bruno Grasso",
  "3RAg8fPmZ8RnacJO8MhLP1": "Chas 7P",
  "2zrv1oduhIYh29vvQZwI5r": "Codak",
  "3eCEorgAoZkvnAQLdy4x38": "Dilema",
  "5urer15JPbCELf17LVia7w": "Doctor Destino",
  "5TMoczTLclVyzzDY5qf3Yb": "Fancy Freak",
  "6AN9ek9RwrLbSp9rT2lcDG": "Hassyel",
  "0QdRhOmiqAcV1dPCoiSIQJ": "Kev Cabrone",
  "16YScXC67nAnFDcA2LGdY0": "Latin Geisha",
  "5HrBwfVDf0HXzGDrJ6Znqc": "Pepe Levine",
  "4T4Z7jvUcMV16VsslRRuC5": "Q Master Weed",
  "4UqFXhJVb9zy2SbNx4ycJQ": "Reick One",
  "2Apt0MjZGqXAd1pl4LNQrR": "X Santa-Ana",
  "4WQmw3fIx9F7iPKL5v8SCN": "Zaque",
};

export async function POST() {
  console.log("[Fix Links] Starting artist link fix using spotifyClient...");

  const results = {
    success: true,
    totalReleasesChecked: 0,
    newLinksCreated: 0,
    errors: [] as string[],
    fixes: [] as { release: string; artist: string }[],
  };

  try {
    if (!spotifyClient.isConfigured()) {
      return NextResponse.json({
        ...results,
        success: false,
        error: "Spotify API not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET env vars.",
      }, { status: 503 });
    }

    // Get all DB artists with their Spotify IDs
    const dbArtists = await db.select().from(artists);
    const spotifyProfiles = await db.select().from(artistExternalProfiles)
      .where(eq(artistExternalProfiles.platform, "spotify"));

    // Build Spotify ID → DB artist map
    const spotifyIdToDbArtist = new Map<string, typeof dbArtists[0]>();
    for (const artist of dbArtists) {
      const profile = spotifyProfiles.find(p => p.artistId === artist.id);
      if (profile?.externalId) {
        spotifyIdToDbArtist.set(profile.externalId, artist);
      }
    }
    // Also add SLC artists by known Spotify IDs
    for (const [spotifyId, name] of Object.entries(SLC_SPOTIFY_IDS)) {
      if (!spotifyIdToDbArtist.has(spotifyId)) {
        const dbArtist = dbArtists.find(a => a.name.toLowerCase() === name.toLowerCase());
        if (dbArtist) spotifyIdToDbArtist.set(spotifyId, dbArtist);
      }
    }

    // Get all existing release-artist links
    const allReleaseArtists = await db.select().from(releaseArtists);
    const existingLinks = new Set<string>();
    for (const ra of allReleaseArtists) {
      existingLinks.add(`${ra.releaseId}|${ra.artistId}`);
    }

    // Get all releases with Spotify IDs
    const allReleases = await db.select().from(releases);
    const releasesWithSpotify = allReleases.filter(r => r.spotifyId);
    results.totalReleasesChecked = releasesWithSpotify.length;

    // Use spotifyClient.getAlbums() which handles batching (20 at a time)
    const allSpotifyIds = releasesWithSpotify.map(r => r.spotifyId!).filter(Boolean);
    console.log(`[Fix Links] Fetching ${allSpotifyIds.length} albums from Spotify...`);

    const spotifyAlbums = await spotifyClient.getAlbums(allSpotifyIds);
    console.log(`[Fix Links] Got ${spotifyAlbums.length} albums from Spotify`);

    // Build a map from spotify album ID → album data
    const albumMap = new Map(spotifyAlbums.map(a => [a.id, a]));

    for (const release of releasesWithSpotify) {
      if (!release.spotifyId) continue;
      const albumInfo = albumMap.get(release.spotifyId);
      if (!albumInfo) continue;

      // For each Spotify artist on this album, check if they're in our roster
      for (const spotifyArtist of albumInfo.artists) {
        const dbArtist = spotifyIdToDbArtist.get(spotifyArtist.id);
        if (dbArtist) {
          const linkKey = `${release.id}|${dbArtist.id}`;
          if (!existingLinks.has(linkKey)) {
            try {
              await db.insert(releaseArtists).values({
                id: generateUUID(),
                releaseId: release.id,
                artistId: dbArtist.id,
                isPrimary: spotifyArtist.id === albumInfo.artists[0]?.id,
              });
              existingLinks.add(linkKey);
              results.newLinksCreated++;
              results.fixes.push({ release: release.title, artist: dbArtist.name });
              console.log(`[Fix Links] Linked "${release.title}" → ${dbArtist.name}`);
            } catch {
              // Duplicate, ignore
            }
          }
        }
      }
    }

    console.log(`[Fix Links] Complete: ${results.newLinksCreated} new links created`);

    return NextResponse.json({
      ...results,
      success: true,
      message: `Fixed ${results.newLinksCreated} missing artist links across ${results.totalReleasesChecked} releases`,
    });

  } catch (error) {
    console.error("[Fix Links] Error:", error);
    return NextResponse.json({
      ...results,
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST to fix missing artist links for collaboration releases using spotifyClient",
    artists: Object.values(SLC_SPOTIFY_IDS),
    spotifyConfigured: spotifyClient.isConfigured(),
  });
}
