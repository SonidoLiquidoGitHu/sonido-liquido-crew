import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  refreshAccessToken,
  sessionFromCookies,
  sessionToCookies,
} from "@/lib/spotify-auth";

/**
 * POST /api/auth/spotify/refresh
 * Refreshes the Spotify access token using the stored refresh token.
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const allCookies: Record<string, string | undefined> = {};
    const allKeys = cookieStore.getAll();
    for (const c of allKeys) {
      allCookies[c.name] = c.value;
    }

    const session = sessionFromCookies(allCookies);
    if (!session) {
      return NextResponse.json({ error: "No session found" }, { status: 401 });
    }

    // Refresh the token
    const tokens = await refreshAccessToken(session.refreshToken);

    // Update session
    const updatedSession = {
      ...session,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + (tokens.expiresIn - 60) * 1000,
    };

    // Store updated cookies
    const sessionCookies = sessionToCookies(updatedSession);
    for (const c of sessionCookies) {
      cookieStore.set(c.name, c.value, c.options as Record<string, string | number | boolean>);
    }

    return NextResponse.json({ success: true, expiresAt: updatedSession.expiresAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
