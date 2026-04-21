import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeCodeForTokens,
  getSpotifyUser,
  sessionToCookies,
} from "@/lib/spotify-auth";

/**
 * GET /api/auth/spotify/callback
 * Handles the OAuth callback from Spotify.
 * Exchanges the authorization code for tokens, fetches user profile,
 * and stores the session in encrypted cookies.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // User denied access
  if (error) {
    return NextResponse.redirect(
      new URL(`/playlists?auth_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/playlists?auth_error=no_code", request.url)
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Fetch user profile
    const user = await getSpotifyUser(tokens.accessToken);

    // Build session
    const session = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: Date.now() + (tokens.expiresIn - 60) * 1000,
      user: {
        id: user.id,
        displayName: user.display_name,
        email: user.email,
        image: user.images?.[0]?.url ?? "",
      },
    };

    // Store in cookies
    const cookieStore = await cookies();
    const sessionCookies = sessionToCookies(session);
    for (const c of sessionCookies) {
      cookieStore.set(c.name, c.value, c.options as Record<string, string | number | boolean>);
    }

    // Redirect to admin playlist page
    return NextResponse.redirect(
      new URL("/playlists/admin?auth_success=true", request.url)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Spotify OAuth callback error:", message);
    return NextResponse.redirect(
      new URL(`/playlists?auth_error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
