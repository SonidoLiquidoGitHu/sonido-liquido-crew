import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionFromCookies, refreshAccessToken, sessionToCookies } from "@/lib/spotify-auth";
import { uploadPlaylistCover } from "@/lib/spotify-playlists";

/**
 * POST /api/playlists/cover
 * Upload a custom cover image for a playlist.
 *
 * Body: { playlistId: string, imageBase64: string }
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
    const { playlistId, imageBase64 } = body;

    if (!playlistId || !imageBase64) {
      return NextResponse.json({ error: "playlistId and imageBase64 are required" }, { status: 400 });
    }

    const success = await uploadPlaylistCover(session.accessToken, playlistId, imageBase64);
    return NextResponse.json({ success });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
