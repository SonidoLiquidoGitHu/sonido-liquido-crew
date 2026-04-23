import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionFromCookies, refreshAccessToken, sessionToCookies } from "@/lib/spotify-auth";
import { getArtistTopTracks } from "@/lib/spotify-playlists";
import { ARTIST_CONFIGS } from "@/lib/artist-config";

/**
 * GET /api/playlists/artist-tracks?artistId=...
 * Get top tracks for a roster artist to add to playlists.
 * If no artistId, returns top tracks for all roster artists.
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const allCookies: Record<string, string | undefined> = {};
    for (const c of cookieStore.getAll()) {
      allCookies[c.name] = c.value;
    }

    let session = sessionFromCookies(allCookies);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (session.expiresAt <= Date.now()) {
      try {
        const tokens = await refreshAccessToken(session.refreshToken);
        session = { ...session, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expiresAt: Date.now() + (tokens.expiresIn - 60) * 1000 };
        for (const c of sessionToCookies(session)) {
          cookieStore.set(c.name, c.value, c.options as Record<string, string | number | boolean>);
        }
      } catch {
        return NextResponse.json({ error: "Token refresh failed" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get("artistId");

    if (artistId) {
      // Get top tracks for a single artist
      const tracks = await getArtistTopTracks(session.accessToken, artistId);
      return NextResponse.json({ artistId, tracks });
    }

    // Get top tracks for ALL roster artists (limited to first 5 tracks each)
    const results = await Promise.all(
      ARTIST_CONFIGS.map(async (config) => {
        const tracks = await getArtistTopTracks(session.accessToken!, config.spotifyId);
        return {
          artistId: config.spotifyId,
          tracks: tracks.slice(0, 5),
        };
      })
    );

    return NextResponse.json({ artists: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
