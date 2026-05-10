import { NextRequest, NextResponse } from "next/server";
import {
  upsertSetting,
  storeSpotifyTokens,
  readSetting,
  validateAccessToken,
  getSpotifyAuthHeader,
} from "@/lib/clients/spotify-tokens";

/**
 * Spotify OAuth callback endpoint.
 * Receives the authorization code from Spotify and exchanges it for
 * access + refresh tokens. Stores the refresh token in site_settings
 * so it can be used later to obtain access tokens without user interaction.
 *
 * IMPORTANT: The redirect URI sent here MUST match exactly what was sent
 * in the /auth endpoint. We detect it from the request origin.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // User denied access
  if (error) {
    console.error("[Spotify OAuth] User denied access:", error);
    return NextResponse.redirect(
      new URL("/admin/curated-channels/playlists?spotify_error=access_denied", request.url)
    );
  }

  if (!code) {
    console.error("[Spotify OAuth] No authorization code received");
    return NextResponse.redirect(
      new URL("/admin/curated-channels/playlists?spotify_error=no_code", request.url)
    );
  }

  // Determine the redirect URI — must match what was used in the /auth endpoint
  const PRODUCTION_BASE_URL = "https://sonidoliquido.com";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    || PRODUCTION_BASE_URL
    || new URL(request.url).origin;
  const redirectUri = `${baseUrl}/api/admin/spotify/callback`;

  try {
    // Exchange the authorization code for tokens
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: getSpotifyAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error("[Spotify OAuth] Token exchange failed:", tokenResponse.status, errorBody);
      return NextResponse.redirect(
        new URL("/admin/curated-channels/playlists?spotify_error=token_exchange_failed", request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    if (!refreshToken) {
      // Spotify sometimes doesn't return a refresh_token on re-authorization.
      // Check if we already have one stored in the DB.
      console.warn("[Spotify OAuth] No refresh token in response — checking DB for existing refresh token...");
      const existingRefresh = await readSetting("spotify_refresh_token");

      if (!existingRefresh) {
        console.error("[Spotify OAuth] No refresh token in response and none stored in DB — cannot maintain long-lived connection");
        return NextResponse.redirect(
          new URL("/admin/curated-channels/playlists?spotify_error=no_refresh_token", request.url)
        );
      }
      console.log("[Spotify OAuth] Using existing refresh token from DB, updating access token only");
    }

    console.log("[Spotify OAuth] Successfully obtained tokens. Expires in:", expiresIn, "seconds");

    // Store the tokens using the shared module
    try {
      await storeSpotifyTokens({
        accessToken,
        refreshToken: refreshToken || undefined,
        expiresIn,
      });
    } catch (dbError) {
      console.error("[Spotify OAuth] CRITICAL: Failed to store tokens in database:", dbError);
      return NextResponse.redirect(
        new URL("/admin/curated-channels/playlists?spotify_error=db_write_failed", request.url)
      );
    }

    // Verify tokens were stored and validate the access token works
    try {
      const storedRefresh = await readSetting("spotify_refresh_token");
      if (!storedRefresh) {
        console.error("[Spotify OAuth] CRITICAL: Refresh token not found in DB after write");
        return NextResponse.redirect(
          new URL("/admin/curated-channels/playlists?spotify_error=token_verify_failed", request.url)
        );
      }

      // Validate the access token by calling /me — this confirms the token works
      // and that the scopes are correct BEFORE we tell the user "connected successfully"
      const validation = await validateAccessToken(accessToken);
      if (!validation.valid) {
        console.error("[Spotify OAuth] Access token validation failed:", validation.error);
        // Token was stored but doesn't work — this could be a scope issue
        return NextResponse.redirect(
          new URL("/admin/curated-channels/playlists?spotify_error=token_verify_failed", request.url)
        );
      }

      console.log(`[Spotify OAuth] Token validated — user: ${validation.userId}, scopes: ${validation.scopes?.join(', ')}`);

      // Verify the token has the required scopes
      const requiredScopes = ["playlist-read-private", "playlist-read-collaborative"];
      const missingScopes = requiredScopes.filter(s => !validation.scopes?.includes(s));
      if (missingScopes.length > 0) {
        console.warn("[Spotify OAuth] Token is missing required scopes:", missingScopes);
        // Don't fail the flow — the user might still be able to read public playlists
        // But log it prominently for debugging
      }
    } catch (verifyError) {
      console.error("[Spotify OAuth] Token verification check failed:", verifyError);
      // Don't fail the whole flow — the tokens might be stored, we just can't verify
    }

    // Redirect back to the playlists page with success indicator
    // Include the access token in the redirect URL so the frontend has it immediately
    // WITHOUT needing a DB read (critical for Turso replication lag).
    const redirectUrl = new URL("/admin/curated-channels/playlists", request.url);
    redirectUrl.searchParams.set("spotify_connected", "true");
    redirectUrl.searchParams.set("spotify_access_token", accessToken);
    redirectUrl.searchParams.set("spotify_expires_in", String(expiresIn));

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[Spotify OAuth] Callback error:", error);
    return NextResponse.redirect(
      new URL("/admin/curated-channels/playlists?spotify_error=callback_error", request.url)
    );
  }
}
