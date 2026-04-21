import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  sessionFromCookies,
  refreshAccessToken,
  sessionToCookies,
} from "@/lib/spotify-auth";

/**
 * GET /api/auth/spotify/me
 * Returns the current Spotify user session.
 * Automatically refreshes the token if it's expired.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const allCookies: Record<string, string | undefined> = {};
    const allKeys = cookieStore.getAll();
    for (const c of allKeys) {
      allCookies[c.name] = c.value;
    }

    let session = sessionFromCookies(allCookies);
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    // Auto-refresh if token is expired
    if (session.expiresAt <= Date.now()) {
      try {
        const tokens = await refreshAccessToken(session.refreshToken);
        session = {
          ...session,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: Date.now() + (tokens.expiresIn - 60) * 1000,
        };

        // Update cookies
        const sessionCookies = sessionToCookies(session);
        for (const c of sessionCookies) {
          cookieStore.set(c.name, c.value, c.options as Record<string, string | number | boolean>);
        }
      } catch {
        // Refresh failed — session is invalid
        return NextResponse.json({ authenticated: false }, { status: 200 });
      }
    }

    return NextResponse.json({
      authenticated: true,
      user: session.user,
      expiresAt: session.expiresAt,
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
