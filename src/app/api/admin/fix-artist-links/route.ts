import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { releases, releaseArtists, artists, artistExternalProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";
import { spotifyClient } from "@/lib/clients";

// ===========================================
// FIX MISSING ARTIST LINKS - ONE ARTIST AT A TIME
// ===========================================
// Usage: POST /api/admin/fix-artist-links?artist=3eCEorgAoZkvnAQLdy4x38
// or:   POST /api/admin/fix-artist-links?artist=all  (processes one at a time)

const SLC_ARTIST_MAP: Record<string, string> = {
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

export async function POST(request: NextRequest) {
  const artistId = request.nextUrl.searchParams.get("artist");

  if (!artistId) {
    return NextResponse.json({
      success: false,
      error: "Provide ?artist=SPOTIFY_ID to fix one artist, or ?artist=all to process the first unprocessed artist",
      availableArtists: SLC_ARTIST_MAP,
    });
  }

  const results = {
    success: true,
    artist: artistId,
    artistName: SLC_ARTIST_MAP[artistId] || "Unknown",
    albumsChecked: 0,
    newLinksCreated: 0,
    fixes: [] as { release: string; artist: string }[],
    errors: [] as string[],
  };

  try {
    if (!spotifyClient.isConfigured()) {
      return NextResponse.json({ ...results, success: false, error: "Spotify not configured" }, { status: 503 });
    }

    // Get DB artists
    const dbArtists = await db.select().from(artists);
    const spotifyProfiles = await db.select().from(artistExternalProfiles)
      .where(eq(artistExternalProfiles.platform, "spotify"));

    // Build Spotify ID → DB artist map
    const spotifyIdToDbArtist = new Map<string, typeof dbArtists[0]>();
    for (const artist of dbArtists) {
      const profile = spotifyProfiles.find(p => p.artistId === artist.id);
      if (profile?.externalId) spotifyIdToDbArtist.set(profile.externalId, artist);
    }
    for (const [spId, name] of Object.entries(SLC_ARTIST_MAP)) {
      if (!spotifyIdToDbArtist.has(spId)) {
        const dbArtist = dbArtists.find(a => a.name.toLowerCase() === name.toLowerCase());
        if (dbArtist) spotifyIdToDbArtist.set(spId, dbArtist);
      }
    }

    // Get existing links
    const allReleaseArtists = await db.select().from(releaseArtists);
    const existingLinks = new Set<string>();
    for (const ra of allReleaseArtists) existingLinks.add(`${ra.releaseId}|${ra.artistId}`);

    // Fetch this artist's albums from Spotify
    const albumsResponse = await spotifyClient.getArtistAlbums(artistId, {
      includeGroups: "album,single,compilation",
      limit: 50,
    });

    results.albumsChecked = albumsResponse.items.length;

    for (const album of albumsResponse.items) {
      // Find in DB
      const [dbRelease] = await db.select().from(releases)
        .where(eq(releases.spotifyId, album.id))
        .limit(1);

      if (!dbRelease) continue;

      // Link this artist if not already linked
      const dbArtist = spotifyIdToDbArtist.get(artistId);
      if (dbArtist) {
        const linkKey = `${dbRelease.id}|${dbArtist.id}`;
        if (!existingLinks.has(linkKey)) {
          try {
            await db.insert(releaseArtists).values({
              id: generateUUID(),
              releaseId: dbRelease.id,
              artistId: dbArtist.id,
              isPrimary: album.artists[0]?.id === artistId,
            });
            existingLinks.add(linkKey);
            results.newLinksCreated++;
            results.fixes.push({ release: dbRelease.title, artist: dbArtist.name });
          } catch { /* duplicate */ }
        }
      }

      // Also link any other roster artists on this album
      for (const albumArtist of album.artists) {
        if (albumArtist.id === artistId) continue; // Already handled above
        const otherDbArtist = spotifyIdToDbArtist.get(albumArtist.id);
        if (otherDbArtist && dbRelease) {
          const otherLinkKey = `${dbRelease.id}|${otherDbArtist.id}`;
          if (!existingLinks.has(otherLinkKey)) {
            try {
              await db.insert(releaseArtists).values({
                id: generateUUID(),
                releaseId: dbRelease.id,
                artistId: otherDbArtist.id,
                isPrimary: album.artists[0]?.id === albumArtist.id,
              });
              existingLinks.add(otherLinkKey);
              results.newLinksCreated++;
              results.fixes.push({ release: dbRelease.title, artist: otherDbArtist.name });
            } catch { /* duplicate */ }
          }
        }
      }
    }

    return NextResponse.json({
      ...results,
      success: true,
      message: `Fixed ${results.newLinksCreated} missing links for ${results.artistName}`,
    });

  } catch (error) {
    return NextResponse.json({
      ...results,
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "POST with ?artist=SPOTIFY_ID to fix one artist's links. Process artists one at a time to avoid timeouts.",
    spotifyConfigured: spotifyClient.isConfigured(),
    artists: Object.entries(SLC_ARTIST_MAP).map(([id, name]) => ({ spotifyId: id, name })),
  });
}
