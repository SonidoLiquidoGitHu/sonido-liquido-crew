import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sessionFromCookies, refreshAccessToken, sessionToCookies } from "@/lib/spotify-auth";
import { searchTracks } from "@/lib/spotify-playlists";

/**
 * GET /api/playlists/search?q=...&limit=...
 * Search for tracks on Spotify using the authenticated user's token.
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
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);

    if (!query) {
      return NextResponse.json({ error: "Search query (q) is required" }, { status: 400 });
    }

    const tracks = await searchTracks(session.accessToken, query, limit);
    return NextResponse.json({ tracks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
