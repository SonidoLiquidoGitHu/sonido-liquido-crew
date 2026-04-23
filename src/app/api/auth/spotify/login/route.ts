import { NextResponse } from "next/server";
import { SPOTIFY_SCOPES } from "@/lib/spotify-auth";

/**
 * GET /api/auth/spotify/login
 * Redirects the user to Spotify's authorization page.
 */
export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Missing Spotify OAuth configuration" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SPOTIFY_SCOPES.join(" "),
    redirect_uri: redirectUri,
    show_dialog: "true", // Force consent screen so user sees what they're granting
  });

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
}
