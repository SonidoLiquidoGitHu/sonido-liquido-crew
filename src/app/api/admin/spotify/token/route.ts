import {
  getSpotifyUserAccessToken,
  readSetting,
} from "@/lib/clients/spotify-tokens";
import { NextResponse } from "next/server";

/**
 * Get a valid Spotify user access token.
 * If the stored access token is expired, refreshes it using the stored refresh token.
 * Returns the access token and its expiry time.
 *
 * This endpoint also handles reading token values with retry logic for
 * Turso DB replication lag (which can happen right after an OAuth callback).
 */
export async function GET() {
  try {
    // For OAuth callback flow: the callback stores tokens, then the frontend
    // might immediately call this endpoint. Turso replication lag can cause
    // the read to miss the just-written tokens. So we retry once after 1s.
    let refreshToken: string | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      refreshToken = await readSetting("spotify_refresh_token");

      if (refreshToken) break;

      if (attempt === 0) {
        console.log(
          "[Spotify Token] No refresh token found on first attempt — waiting 1s and retrying (possible replication lag)...",
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (!refreshToken) {
      return NextResponse.json({
        connected: false,
        error:
          "No Spotify account connected. Click 'Connect Spotify' to authorize.",
      });
    }

    // Use the shared token management — handles expiry check and refresh
    const accessToken = await getSpotifyUserAccessToken();

    if (!accessToken) {
      // Token refresh failed — tokens may have been cleared by the refresh function
      // Check if the refresh token still exists
      const refreshTokenStillExists = await readSetting(
        "spotify_refresh_token",
      );
      if (refreshTokenStillExists) {
        // Refresh token exists but refresh failed — temporary issue
        return NextResponse.json({
          connected: false,
          error:
            "Failed to refresh Spotify access token. Please try again in a moment.",
          refreshFailed: true,
        });
      }
      // Refresh token was cleared — definitive auth failure
      return NextResponse.json({
        connected: false,
        error:
          "Spotify authorization expired. Please reconnect your Spotify account.",
      });
    }

    // Get the expiry time for the frontend
    const expiryStr = await readSetting("spotify_access_token_expiry");
    const expiry = Number.parseInt(expiryStr || "0", 10);
    const expiresIn = Math.max(0, Math.floor((expiry - Date.now()) / 1000));

    return NextResponse.json({
      connected: true,
      accessToken,
      expiresIn,
    });
  } catch (error) {
    console.error("[Spotify Token] Error:", error);
    return NextResponse.json(
      { connected: false, error: "Failed to get Spotify access token" },
      { status: 500 },
    );
  }
}
