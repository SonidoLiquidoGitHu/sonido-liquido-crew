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
      console.error("[Spotify OAuth] No refresh token in response");
      return NextResponse.redirect(
        new URL("/admin/curated-channels/playlists?spotify_error=no_refresh_token", request.url)
      );
    }

    console.log("[Spotify OAuth] Successfully obtained tokens. Expires in:", expiresIn, "seconds");

    // Store the tokens in site_settings
    await upsertSetting("spotify_refresh_token", refreshToken, "string", "Spotify OAuth refresh token for playlist access");
    await upsertSetting("spotify_access_token", accessToken, "string", "Spotify OAuth access token (temporary)");
    await upsertSetting("spotify_access_token_expiry", String(Date.now() + (expiresIn - 60) * 1000), "number", "Spotify access token expiry timestamp");

    // Redirect back to the playlists page with success indicator
    return NextResponse.redirect(
      new URL("/admin/curated-channels/playlists?spotify_connected=true", request.url)
    );
  } catch (error) {
    console.error("[Spotify OAuth] Callback error:", error);
    return NextResponse.redirect(
      new URL("/admin/curated-channels/playlists?spotify_error=callback_error", request.url)
    );
  }
}

/**
 * Insert or update a site setting
 */
async function upsertSetting(key: string, value: string, type: string, description: string) {
  try {
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
  } catch (error) {
    console.error(`[Spotify OAuth] Failed to save setting ${key}:`, error);
  }
}
