import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { releases, releaseArtists, artists, artistExternalProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

// ===========================================
// FIX MISSING ARTIST LINKS FOR COLLABORATION RELEASES
// ===========================================
// Uses Spotify's "Get Several Albums" API (up to 20 at a time) to
// detect all artists on each release and create missing releaseArtists entries.

const SPOTIFY_CLIENT_ID = (process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568").trim();
const SPOTIFY_CLIENT_SECRET = (process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6").trim();

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

async function getSpotifyToken(): Promise<string> {
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new Error(`Spotify auth failed: ${response.status}`);
  const data = await response.json();
  return data.access_token;
}

// Fetch up to 20 albums at once from Spotify
async function getSeveralAlbums(albumIds: string[], token: string): Promise<Map<string, { artists: { id: string; name: string }[] }>> {
  const result = new Map<string, { artists: { id: string; name: string }[] }>();
  if (albumIds.length === 0) return result;

  const url = `https://api.spotify.com/v1/albums?ids=${albumIds.join(",")}&market=MX`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    console.error(`[Fix Links] Spotify albums API error: ${response.status}`);
    return result;
  }

  const data = await response.json();
  for (const album of (data.albums || [])) {
    if (album) {
      result.set(album.id, {
        artists: (album.artists || []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })),
      });
    }
  }
  return result;
}

export async function POST() {
  console.log("[Fix Links] Starting artist link fix using Spotify API...");

  const results = {
    success: true,
    totalReleasesChecked: 0,
    newLinksCreated: 0,
    errors: [] as string[],
    fixes: [] as { release: string; artist: string }[],
  };

  try {
    // Get Spotify token
    const token = await getSpotifyToken();
    console.log("[Fix Links] Got Spotify token");

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

    // Process in batches of 20 (Spotify API limit)
    const BATCH_SIZE = 20;
    for (let i = 0; i < releasesWithSpotify.length; i += BATCH_SIZE) {
      const batch = releasesWithSpotify.slice(i, i + BATCH_SIZE);
      const spotifyIds = batch.map(r => r.spotifyId!).filter(Boolean);

      console.log(`[Fix Links] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(releasesWithSpotify.length / BATCH_SIZE)}...`);

      try {
        const albumsData = await getSeveralAlbums(spotifyIds, token);

        for (const release of batch) {
          if (!release.spotifyId) continue;
          const albumInfo = albumsData.get(release.spotifyId);
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

        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < releasesWithSpotify.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (batchError) {
        results.errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${(batchError as Error).message}`);
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
    message: "Use POST to fix missing artist links for collaboration releases using Spotify API",
    artists: Object.values(SLC_SPOTIFY_IDS),
  });
}
