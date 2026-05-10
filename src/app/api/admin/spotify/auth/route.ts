import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

/**
 * Initiate Spotify OAuth Authorization Code flow.
 * Redirects the user to Spotify's authorization page where they grant
 * access to their playlists. After approval, Spotify redirects back
 * to our callback endpoint.
 *
 * Required scopes:
 * - playlist-read-private: Read user's private playlists
 * - playlist-read-collaborative: Read collaborative playlists
 *
 * IMPORTANT: The redirect URI must be registered in the Spotify Developer Dashboard.
 * Go to https://developer.spotify.com/dashboard → App Settings → Redirect URIs
 * Add: https://sonidoliquido.com/api/admin/spotify/callback
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";

  // Determine the callback URL:
  // 1. NEXT_PUBLIC_BASE_URL env var (most reliable, set in Netlify)
  // 2. Hardcoded production URL (failsafe)
  // 3. From the request origin (works in production)
  // 4. Fallback to localhost for local dev
  const PRODUCTION_BASE_URL = "https://sonidoliquido.com";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    || PRODUCTION_BASE_URL
    || new URL(request.url).origin;
  const redirectUri = `${baseUrl}/api/admin/spotify/callback`;

  console.log("[Spotify OAuth] Redirect URI:", redirectUri);

  const scopes = [
    "playlist-read-private",
    "playlist-read-collaborative",
  ].join(" ");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state: crypto.randomUUID(),
    // NOTE: Do NOT set show_dialog=true. When show_dialog is true, Spotify shows
    // the consent screen every time and often does NOT return a refresh_token on
    // re-authorization. Without it, Spotify silently re-authorizes and consistently
    // returns a refresh_token, which is essential for long-lived connections.
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
