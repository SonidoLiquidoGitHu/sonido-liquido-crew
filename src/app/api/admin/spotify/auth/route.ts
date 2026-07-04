import { getSpotifyCredentials } from "@/lib/clients/spotify-tokens";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Initiate Spotify OAuth Authorization Code flow.
 * Redirects the user to Spotify's authorization page where they grant
 * access to their playlists. After approval, Spotify redirects back
 * to our callback endpoint.
 *
 * Required scopes:
 * - playlist-read-private: Read user's private playlists
 * - playlist-read-collaborative: Read collaborative playlists
 * - user-read-private: Read user profile (needed for token validation)
 *
 * IMPORTANT: The redirect URI must be registered in the Spotify Developer Dashboard.
 * Go to https://developer.spotify.com/dashboard → App Settings → Redirect URIs
 * Add: https://sonidoliquido.com/api/admin/spotify/callback
 */
export async function GET(request: NextRequest) {
  const { clientId } = getSpotifyCredentials();

  // Determine the callback URL:
  // 1. NEXT_PUBLIC_BASE_URL env var (most reliable, set in Netlify)
  // 2. Hardcoded production URL (failsafe)
  // 3. From the request origin (works in production)
  // 4. Fallback to localhost for local dev
  const PRODUCTION_BASE_URL = "https://sonidoliquido.com";
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    PRODUCTION_BASE_URL ||
    new URL(request.url).origin;
  const redirectUri = `${baseUrl}/api/admin/spotify/callback`;

  console.log("[Spotify OAuth] Redirect URI:", redirectUri);

  const scopes = [
    "playlist-read-private",
    "playlist-read-collaborative",
    "user-read-private",
    "user-read-email",
  ].join(" ");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state: crypto.randomUUID(),
    // Force the consent screen so Spotify re-requests ALL scopes.
    // Without this, Spotify silently re-authorizes and may NOT include
    // new/changed scopes, which causes 403 when trying to read playlist tracks.
    show_dialog: "true",
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
