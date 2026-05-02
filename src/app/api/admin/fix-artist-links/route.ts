import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { releases, releaseArtists, artists, artistExternalProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";
import { spotifyClient } from "@/lib/clients";

// ===========================================
// FIX MISSING ARTIST LINKS FOR COLLABORATION RELEASES
// ===========================================
// Strategy: For each roster artist, fetch their recent albums from Spotify
// (which works with client credentials), then check each album against
// our DB to create missing artist-release links.

const SLC_ARTISTS = [
  { name: "Brez", spotifyId: "2jJmTEMkGQfH3BxoG3MQvF" },
  { name: "Bruno Grasso", spotifyId: "4fNQqyvcM71IyF2EitEtCj" },
  { name: "Chas 7P", spotifyId: "3RAg8fPmZ8RnacJO8MhLP1" },
  { name: "Codak", spotifyId: "2zrv1oduhIYh29vvQZwI5r" },
  { name: "Dilema", spotifyId: "3eCEorgAoZkvnAQLdy4x38" },
  { name: "Doctor Destino", spotifyId: "5urer15JPbCELf17LVia7w" },
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

export async function POST() {
  console.log("[Fix Links] Starting artist link fix using per-artist album fetch...");

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
        error: "Spotify API not configured.",
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
    for (const slcArtist of SLC_ARTISTS) {
      if (!spotifyIdToDbArtist.has(slcArtist.spotifyId)) {
        const dbArtist = dbArtists.find(a => a.name.toLowerCase() === slcArtist.name.toLowerCase());
        if (dbArtist) spotifyIdToDbArtist.set(slcArtist.spotifyId, dbArtist);
      }
    }

    // Get all existing release-artist links
    const allReleaseArtists = await db.select().from(releaseArtists);
    const existingLinks = new Set<string>();
    for (const ra of allReleaseArtists) {
      existingLinks.add(`${ra.releaseId}|${ra.artistId}`);
    }

    // For each roster artist, fetch their recent albums from Spotify
    // Then find those albums in our DB and create missing links
    for (const slcArtist of SLC_ARTISTS) {
      try {
        const dbArtist = spotifyIdToDbArtist.get(slcArtist.spotifyId);
        if (!dbArtist) {
          results.errors.push(`${slcArtist.name} not found in DB`);
          continue;
        }

        // Fetch albums from Spotify for this artist (this endpoint works!)
        const albumsResponse = await spotifyClient.getArtistAlbums(slcArtist.spotifyId, {
          includeGroups: "album,single,compilation",
          limit: 50,
          offset: 0,
        });

        console.log(`[Fix Links] ${slcArtist.name}: found ${albumsResponse.items.length} albums on Spotify`);

        for (const album of albumsResponse.items) {
          // Find this album in our DB by Spotify ID
          const [dbRelease] = await db.select().from(releases)
            .where(eq(releases.spotifyId, album.id))
            .limit(1);

          if (!dbRelease) continue; // Not in our DB yet

          results.totalReleasesChecked++;

          // Check if this artist is already linked
          const linkKey = `${dbRelease.id}|${dbArtist.id}`;
          if (!existingLinks.has(linkKey)) {
            try {
              await db.insert(releaseArtists).values({
                id: generateUUID(),
                releaseId: dbRelease.id,
                artistId: dbArtist.id,
                isPrimary: album.artists[0]?.id === slcArtist.spotifyId,
              });
              existingLinks.add(linkKey);
              results.newLinksCreated++;
              results.fixes.push({ release: dbRelease.title, artist: slcArtist.name });
              console.log(`[Fix Links] Linked "${dbRelease.title}" → ${slcArtist.name}`);
            } catch {
              // Duplicate, ignore
            }
          }
        }

        // Small delay between artists
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (artistError) {
        results.errors.push(`Error processing ${slcArtist.name}: ${(artistError as Error).message}`);
      }
    }

    console.log(`[Fix Links] Complete: ${results.newLinksCreated} new links created`);

    return NextResponse.json({
      ...results,
      success: true,
      message: `Fixed ${results.newLinksCreated} missing artist links`,
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
    spotifyConfigured: spotifyClient.isConfigured(),
  });
}
