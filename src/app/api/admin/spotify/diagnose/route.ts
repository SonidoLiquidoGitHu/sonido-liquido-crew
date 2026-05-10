import { NextResponse } from "next/server";
import {
  getSpotifyUserAccessToken,
  getClientCredentialsToken,
  getSpotifyCredentials,
  readSetting,
  validateAccessToken,
} from "@/lib/clients/spotify-tokens";

export const dynamic = "force-dynamic";

/**
 * Spotify connection diagnostic endpoint.
 * Tests the Spotify connection end-to-end and returns detailed info
 * about token status, scopes, and what works/doesn't work.
 *
 * This helps debug the persistent "denied access" error by showing
 * exactly what's happening with the Spotify tokens and API access.
 */
export async function GET() {
  const diagnosis: {
    timestamp: string;
    steps: Array<{ step: string; status: string; detail?: string }>;
    summary?: Record<string, unknown>;
    error?: string;
  } = {
    timestamp: new Date().toISOString(),
    steps: [],
  };

  try {
    // Step 1: Check credentials
    const { clientId, clientSecret } = getSpotifyCredentials();
    diagnosis.steps.push({
      step: "credentials",
      status: clientId && clientSecret ? "ok" : "missing",
      detail: `Client ID: ${clientId ? clientId.slice(0, 8) + '...' : 'NOT SET'}, Secret: ${clientSecret ? 'set' : 'NOT SET'}`,
    });

    // Step 2: Check refresh token in DB
    const refreshToken = await readSetting("spotify_refresh_token");
    diagnosis.steps.push({
      step: "refresh_token_in_db",
      status: refreshToken ? "found" : "missing",
      detail: refreshToken ? `${refreshToken.slice(0, 8)}...` : "No refresh token stored in database",
    });

    // Step 3: Check access token in DB
    const accessToken = await readSetting("spotify_access_token");
    const expiryStr = await readSetting("spotify_access_token_expiry");
    const expiry = parseInt(expiryStr || "0", 10);
    const isExpired = accessToken ? Date.now() >= expiry : true;

    diagnosis.steps.push({
      step: "access_token_in_db",
      status: accessToken ? (isExpired ? "expired" : "valid") : "missing",
      detail: accessToken
        ? `${accessToken.slice(0, 8)}... expires ${isExpired ? `${Math.floor((Date.now() - expiry) / 1000)}s ago` : `in ${Math.floor((expiry - Date.now()) / 1000)}s`}`
        : "No access token stored",
    });

    // Step 4: Try to get a user access token (this handles refresh if needed)
    const userToken = await getSpotifyUserAccessToken();
    diagnosis.steps.push({
      step: "get_user_token",
      status: userToken ? "success" : "failed",
      detail: userToken ? `${userToken.slice(0, 8)}...` : "Could not obtain user access token (refresh may have failed)",
    });

    // Step 5: Validate the user token by calling /me
    if (userToken) {
      const validation = await validateAccessToken(userToken);
      diagnosis.steps.push({
        step: "validate_user_token",
        status: validation.valid ? "valid" : "invalid",
        detail: validation.valid
          ? `User: ${validation.userId}, Scopes: ${validation.scopes?.join(', ')}`
          : validation.error || "Token validation failed",
      });

      // Check if required scopes are present
      if (validation.valid && validation.scopes) {
        const requiredScopes = ["playlist-read-private", "playlist-read-collaborative"];
        const missingScopes = requiredScopes.filter(s => !validation.scopes?.includes(s));
        diagnosis.steps.push({
          step: "scope_check",
          status: missingScopes.length === 0 ? "ok" : "missing_scopes",
          detail: missingScopes.length === 0
            ? "All required playlist scopes present"
            : `Missing scopes: ${missingScopes.join(', ')}. Available: ${validation.scopes.join(', ')}`,
        });
      }
    }

    // Step 6: Test client credentials
    const ccToken = await getClientCredentialsToken();
    diagnosis.steps.push({
      step: "client_credentials",
      status: ccToken ? "success" : "failed",
      detail: ccToken ? `${ccToken.slice(0, 8)}...` : "Could not obtain client credentials token",
    });

    // Step 7: Test actual playlist access with user token
    if (userToken) {
      try {
        const testResponse = await fetch(
          "https://api.spotify.com/v1/me/playlists?limit=1",
          {
            headers: { Authorization: `Bearer ${userToken}` },
            signal: AbortSignal.timeout(10_000),
          }
        );
        const testBody = await testResponse.text().catch(() => "");
        diagnosis.steps.push({
          step: "test_playlist_access_user_token",
          status: testResponse.ok ? "success" : `failed_${testResponse.status}`,
          detail: testResponse.ok
            ? `Can read user's playlists (${JSON.parse(testBody).total} playlists found)`
            : `Status ${testResponse.status}: ${testBody.slice(0, 300)}`,
        });
      } catch (err) {
        diagnosis.steps.push({
          step: "test_playlist_access_user_token",
          status: "error",
          detail: (err as Error).message,
        });
      }
    }

    // Summary
    const hasRefreshToken = !!refreshToken;
    const canGetUserToken = !!userToken;
    const ccWorks = !!ccToken;

    diagnosis.summary = {
      connected: hasRefreshToken,
      canAccessUserPlaylists: canGetUserToken,
      canAccessPublicPlaylists: ccWorks,
      recommendation: !hasRefreshToken
        ? "Connect Spotify first via /api/admin/spotify/auth"
        : !canGetUserToken
          ? "Refresh token exists but token refresh fails. Try reconnecting Spotify."
          : "Connection appears healthy. If sync still fails, check playlist URL/ID and scopes.",
    };

    return NextResponse.json(diagnosis);
  } catch (error) {
    diagnosis.error = (error as Error).message;
    return NextResponse.json(diagnosis, { status: 500 });
  }
}
