import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionFromCookies, refreshAccessToken, sessionToCookies } from "@/lib/spotify-auth";
import { createPlaylist } from "@/lib/spotify-playlists";

/**
 * POST /api/playlists/create
 * Create a new Spotify playlist.
 *
 * Body: { name: string, description?: string, public?: boolean }
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
    const { name, description, public: isPublic } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Playlist name is required" }, { status: 400 });
    }

    const playlist = await createPlaylist(session.accessToken, session.user.id, {
      name: name.trim(),
      description: description ?? "",
      public: isPublic ?? true,
    });

    return NextResponse.json({ playlist });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
