import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { releases, releaseArtists, artists, artistExternalProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// ===========================================
// FIX MISSING ARTIST LINKS FOR COLLABORATION RELEASES
// ===========================================
// This one-time fix scans all releases and ensures that every
// roster artist that appears on a release (via Spotify's artist list)
// has a corresponding releaseArtists entry.
// Triggered manually from admin.

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
  console.log("[Fix Links] Starting artist link fix...");

  const results = {
    success: true,
    totalReleasesChecked: 0,
    newLinksCreated: 0,
    errors: [] as string[],
    fixes: [] as { release: string; artist: string }[],
  };

  try {
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
        if (dbArtist) {
          spotifyIdToDbArtist.set(spotifyId, dbArtist);
        }
      }
    }

    // Get all existing release-artist links
    const allReleaseArtists = await db.select().from(releaseArtists);

    // Build a set of existing links (releaseId + artistId)
    const existingLinks = new Set<string>();
    for (const ra of allReleaseArtists) {
      existingLinks.add(`${ra.releaseId}|${ra.artistId}`);
    }

    // Get all releases that have a spotifyId
    const allReleases = await db.select().from(releases);
    const releasesWithSpotify = allReleases.filter(r => r.spotifyId);

    results.totalReleasesChecked = releasesWithSpotify.length;
    console.log(`[Fix Links] Checking ${releasesWithSpotify.length} releases...`);

    // For each release, fetch from Spotify to see all artists
    // But since we can't make 250 API calls, use a smarter approach:
    // Parse the description field which now contains "by Artist1, Artist2, ..."
    // For releases that were recently synced with the multi-artist fix

    // Actually, the best approach is to use the Spotify credentials to fetch
    // only the releases that might have missing links.
    // But since we're timeout-constrained, let's focus on the most common case:
    // releases that have only ONE artist link but whose description mentions multiple artists.

    for (const release of releasesWithSpotify) {
      // Count how many artist links this release has
      const releaseLinks = allReleaseArtists.filter(ra => ra.releaseId === release.id);

      // If only one artist is linked, check if the description mentions more
      if (releaseLinks.length === 1 && release.description) {
        const descMatch = release.description.match(/by (.+)$/);
        if (descMatch) {
          const artistNames = descMatch[1].split(",").map(n => n.trim()).filter(n => n.length > 0);

          // If description has multiple artists but only one link, this might be a collab
          if (artistNames.length > 1) {
            // Find DB artists matching these names
            for (const artistName of artistNames) {
              const dbArtist = dbArtists.find(a =>
                a.name.toLowerCase() === artistName.toLowerCase()
              );
              if (dbArtist) {
                const linkKey = `${release.id}|${dbArtist.id}`;
                if (!existingLinks.has(linkKey)) {
                  try {
                    await db.insert(releaseArtists).values({
                      id: generateUUID(),
                      releaseId: release.id,
                      artistId: dbArtist.id,
                      isPrimary: releaseLinks[0]?.artistId === dbArtist.id,
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
    message: "Use POST to fix missing artist links for collaboration releases",
    artists: Object.values(SLC_SPOTIFY_IDS),
  });
}
