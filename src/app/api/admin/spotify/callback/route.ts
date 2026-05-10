import { NextRequest, NextResponse } from "next/server";
import {
  storeSpotifyTokens,
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
 *
 * CRITICAL FIX: Previous versions read tokens back from DB after writing to
 * verify they were stored. This could FAIL due to Turso replication lag
 * (write goes to primary, read goes to replica that hasn't caught up yet),
 * causing the entire OAuth flow to fail even though the tokens WERE stored.
 * We now skip the DB read-back verification and trust that the write succeeded
 * (storeSpotifyTokens throws on failure). We still try to validate the token
 * via Spotify's /me endpoint, but this is non-blocking — if it fails, we
 * still redirect with success since the tokens are in the DB.
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
    const grantedScopes = tokenData.scope;

    console.log("[Spotify OAuth] Successfully obtained tokens. Expires in:", expiresIn, "seconds, scopes:", grantedScopes || "not returned");

    if (!refreshToken) {
      console.warn("[Spotify OAuth] No refresh_token in OAuth response. This can happen on re-authorization. The existing refresh token in DB will be preserved.");
      // Don't fail the flow — the existing refresh token in DB is still valid
      // storeSpotifyTokens will skip updating the refresh token if none is provided
    }

    // Store the tokens using the shared module
    // If this throws, we know the write failed — that's a real error
    try {
      await storeSpotifyTokens({
        accessToken,
        refreshToken: refreshToken || undefined,
        expiresIn,
      });
      console.log("[Spotify OAuth] Tokens stored successfully in DB");
    } catch (dbError) {
      console.error("[Spotify OAuth] CRITICAL: Failed to store tokens in database:", dbError);
      return NextResponse.redirect(
        new URL("/admin/curated-channels/playlists?spotify_error=db_write_failed", request.url)
      );
    }

    // Validate the access token AND check scopes BEFORE redirecting success
    // This is critical: if scopes are missing, the user needs to know immediately
    // instead of seeing "connected" and then getting 403 on import.
    let scopesValid = false;
    let scopeWarning = "";
    try {
      const validation = await validateAccessToken(accessToken);
      if (validation.valid) {
        console.log(`[Spotify OAuth] Token validated — user: ${validation.userId}, scopes: ${validation.scopes?.join(', ')}`);

        // Check if required scopes are present
        const requiredScopes = ["playlist-read-private", "playlist-read-collaborative"];
        const missingScopes = requiredScopes.filter(s => !validation.scopes?.includes(s));
        if (missingScopes.length > 0) {
          console.warn("[Spotify OAuth] WARNING: Token is missing required scopes:", missingScopes);
          scopesValid = false;
          scopeWarning = `Faltan permisos de Spotify: ${missingScopes.join(', ')}. Intenta reconectar.`;
        } else {
          scopesValid = true;
        }
      } else {
        console.warn("[Spotify OAuth] Token validation failed:", validation.error);
        // Can't verify scopes — assume they're OK and let import fail if needed
        scopesValid = true;
      }
    } catch (verifyError) {
      console.warn("[Spotify OAuth] Token verification check failed:", verifyError);
      scopesValid = true; // Assume OK
    }

    // If scopes are definitely wrong, redirect with a clear error
    if (!scopesValid) {
      console.error("[Spotify OAuth] Scopes are missing — redirecting with scope_error");
      return NextResponse.redirect(
        new URL(`/admin/curated-channels/playlists?spotify_error=scope_missing&spotify_detail=${encodeURIComponent(scopeWarning)}`, request.url)
      );
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
