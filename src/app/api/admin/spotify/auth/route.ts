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
 * Add: https://nidoliquido.com/api/admin/spotify/callback
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";

  // Determine the callback URL:
  // 1. Explicit env var (most reliable)
  // 2. From the request origin (works in production)
  // 3. Fallback to localhost
  const explicitBase = process.env.SPOTIFY_REDIRECT_URI 
    ? process.env.SPOTIFY_REDIRECT_URI.replace("/api/admin/spotify/callback", "")
    : process.env.NEXT_PUBLIC_BASE_URL;
  
  const baseUrl = explicitBase || new URL(request.url).origin;
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
    show_dialog: "false",
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
