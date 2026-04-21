import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionFromCookies, refreshAccessToken, sessionToCookies } from "@/lib/spotify-auth";
import { updatePlaylistDetails, replacePlaylistTracks, addTracksToPlaylist, removeTracksFromPlaylist } from "@/lib/spotify-playlists";

/**
 * POST /api/playlists/update
 * Update a playlist's details or tracks.
 *
 * Body: {
 *   playlistId: string,
 *   action: "details" | "replace_tracks" | "add_tracks" | "remove_tracks",
 *   data: object (depends on action)
 * }
 */
export async function POST(request: Request) {
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

    const body = await request.json();
    const { playlistId, action, data } = body;

    if (!playlistId || !action) {
      return NextResponse.json({ error: "playlistId and action are required" }, { status: 400 });
    }

    switch (action) {
      case "details": {
        const success = await updatePlaylistDetails(session.accessToken, playlistId, data);
        return NextResponse.json({ success });
      }
      case "replace_tracks": {
        const success = await replacePlaylistTracks(session.accessToken, playlistId, data.uris ?? []);
        return NextResponse.json({ success });
      }
      case "add_tracks": {
        const result = await addTracksToPlaylist(session.accessToken, playlistId, data.uris ?? [], data.position);
        return NextResponse.json({ result });
      }
      case "remove_tracks": {
        const result = await removeTracksFromPlaylist(session.accessToken, playlistId, data.uris ?? [], data.snapshotId);
        return NextResponse.json({ result });
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
