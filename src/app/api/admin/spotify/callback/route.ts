import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  const clientId = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6";

  // Determine the redirect URI — must match what was used in the /auth endpoint
  // Use the same logic as the auth route to ensure consistency
  const PRODUCTION_BASE_URL = "https://sonidoliquido.com";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    || PRODUCTION_BASE_URL
    || new URL(request.url).origin;
  const redirectUri = `${baseUrl}/api/admin/spotify/callback`;

  try {
    // Exchange the authorization code for tokens
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
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
      // This can happen if the user already authorized the app and show_dialog was not used.
      // Check if we already have a refresh_token stored in the DB — if so, keep using it.
      console.warn("[Spotify OAuth] No refresh token in response — checking DB for existing refresh token...");
      const [existingRefresh] = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, "spotify_refresh_token"))
        .limit(1);

      if (!existingRefresh?.value) {
        console.error("[Spotify OAuth] No refresh token in response and none stored in DB — cannot maintain long-lived connection");
        return NextResponse.redirect(
          new URL("/admin/curated-channels/playlists?spotify_error=no_refresh_token", request.url)
        );
      }
      // We have an existing refresh token — just update the access token
      console.log("[Spotify OAuth] Using existing refresh token from DB, updating access token only");
    }

    console.log("[Spotify OAuth] Successfully obtained tokens. Expires in:", expiresIn, "seconds");

    // Store the tokens in site_settings — THROW on failure instead of silently catching
    try {
      // Only update refresh_token if we got a new one (Spotify may not return it on re-auth)
      if (refreshToken) {
        await upsertSetting("spotify_refresh_token", refreshToken, "string", "Spotify OAuth refresh token for playlist access");
      }
      await upsertSetting("spotify_access_token", accessToken, "string", "Spotify OAuth access token (temporary)");
      await upsertSetting("spotify_access_token_expiry", String(Date.now() + (expiresIn - 60) * 1000), "number", "Spotify access token expiry timestamp");
    } catch (dbError) {
      console.error("[Spotify OAuth] CRITICAL: Failed to store tokens in database:", dbError);
      return NextResponse.redirect(
        new URL("/admin/curated-channels/playlists?spotify_error=db_write_failed", request.url)
      );
    }

    // Verify tokens were actually stored by reading them back
    try {
      const [verifyRefresh] = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, "spotify_refresh_token"))
        .limit(1);

      if (!verifyRefresh?.value) {
        console.error("[Spotify OAuth] CRITICAL: Token verification failed — refresh_token not found in DB after write");
        return NextResponse.redirect(
          new URL("/admin/curated-channels/playlists?spotify_error=token_verify_failed", request.url)
        );
      }

      console.log("[Spotify OAuth] Token storage verified successfully");
    } catch (verifyError) {
      console.error("[Spotify OAuth] Token verification check failed:", verifyError);
      // Don't fail the whole flow — the tokens might be stored, we just can't verify
    }

    // Redirect back to the playlists page with success indicator
    // IMPORTANT: Include the access token and expiry in the redirect URL so the
    // frontend has it immediately WITHOUT needing a DB read. This is critical because
    // Turso DB replication lag can cause the /api/admin/spotify/token endpoint to
    // return { connected: false } right after we just stored the tokens here.
    // The access token is short-lived (1 hour) and the URL is cleaned up by the
    // frontend immediately, so the security risk is minimal (same as OAuth implicit grant).
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

/**
 * Insert or update a site setting
 * THROWS on error instead of catching silently — caller must handle errors
 */
async function upsertSetting(key: string, value: string, type: string, description: string) {
  const [existing] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);

  if (existing) {
    await db
      .update(siteSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(siteSettings.key, key));
  } else {
    await db.insert(siteSettings).values({
      id: crypto.randomUUID(),
      key,
      value,
      type: type as "string" | "number" | "boolean" | "json",
      description,
    });
  }
}
