import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionFromCookies, refreshAccessToken, sessionToCookies } from "@/lib/spotify-auth";
import { getUserPlaylists, getPlaylist, getPlaylistTracks } from "@/lib/spotify-playlists";

/**
 * GET /api/playlists
 * List the authenticated user's playlists, or get a single playlist with tracks.
 *
 * Query params:
 * - playlistId: If provided, returns full playlist details + tracks
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

    // Auto-refresh if expired
    if (session.expiresAt <= Date.now()) {
      try {
        const tokens = await refreshAccessToken(session.refreshToken);
        session = {
          ...session,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: Date.now() + (tokens.expiresIn - 60) * 1000,
        };
        for (const c of sessionToCookies(session)) {
          cookieStore.set(c.name, c.value, c.options as Record<string, string | number | boolean>);
        }
      } catch {
        return NextResponse.json({ error: "Token refresh failed" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get("playlistId");

    if (playlistId) {
      // Get single playlist with tracks
      const [playlist, tracks] = await Promise.all([
        getPlaylist(session.accessToken, playlistId),
        getPlaylistTracks(session.accessToken, playlistId),
      ]);

      if (!playlist) {
        return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
      }

      return NextResponse.json({ playlist, tracks });
    }

    // List all user playlists
    const playlists = await getUserPlaylists(session.accessToken, session.user.id);
    return NextResponse.json({ playlists, user: session.user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
