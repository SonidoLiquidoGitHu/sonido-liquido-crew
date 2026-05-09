import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get a valid Spotify user access token.
 * If the stored access token is expired, refreshes it using the stored refresh token.
 * Returns the access token and its expiry time.
 */
export async function GET() {
  try {
    // Get stored tokens from site_settings
    const [accessTokenRow] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "spotify_access_token"))
      .limit(1);

    const [expiryRow] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "spotify_access_token_expiry"))
      .limit(1);

    const [refreshTokenRow] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "spotify_refresh_token"))
      .limit(1);

    if (!refreshTokenRow?.value) {
      return NextResponse.json({
        connected: false,
        error: "No Spotify account connected. Click 'Connect Spotify' to authorize.",
      });
    }

    const accessToken = accessTokenRow?.value;
    const expiry = parseInt(expiryRow?.value || "0", 10);
    const refreshToken = refreshTokenRow.value;

    // Check if the current access token is still valid (with 60s buffer)
    if (accessToken && Date.now() < expiry) {
      return NextResponse.json({
        connected: true,
        accessToken,
        expiresIn: Math.floor((expiry - Date.now()) / 1000),
      });
    }

    // Access token expired — refresh it
    console.log("[Spotify Token] Access token expired, refreshing...");

    const clientId = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6";
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const refreshResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!refreshResponse.ok) {
      const errorBody = await refreshResponse.text();
      console.error("[Spotify Token] Refresh failed:", refreshResponse.status, errorBody);

      // If refresh token is invalid, user needs to re-authorize
      if (refreshResponse.status === 400 || refreshResponse.status === 401) {
        // Clear the stored tokens
        await clearSpotifyTokens();
        return NextResponse.json({
          connected: false,
          error: "Spotify authorization expired. Please reconnect your Spotify account.",
        });
      }

      return NextResponse.json({
        connected: false,
        error: "Failed to refresh Spotify access token.",
      });
    }

    const tokenData = await refreshResponse.json();
    const newAccessToken = tokenData.access_token;
    const newExpiresIn = tokenData.expires_in;
    const newRefreshToken = tokenData.refresh_token; // May or may not be returned

    // Update stored tokens
    const newExpiry = String(Date.now() + (newExpiresIn - 60) * 1000);

    await upsertSetting("spotify_access_token", newAccessToken, "string");
    await upsertSetting("spotify_access_token_expiry", newExpiry, "number");

    // Spotify sometimes returns a new refresh token — save it if present
    if (newRefreshToken) {
      await upsertSetting("spotify_refresh_token", newRefreshToken, "string");
    }

    console.log("[Spotify Token] Access token refreshed successfully");

    return NextResponse.json({
      connected: true,
      accessToken: newAccessToken,
      expiresIn: newExpiresIn,
    });
  } catch (error) {
    console.error("[Spotify Token] Error:", error);
    return NextResponse.json(
      { connected: false, error: "Failed to get Spotify access token" },
      { status: 500 }
    );
  }
}

async function upsertSetting(key: string, value: string, type: string) {
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
      });
    }
  } catch (error) {
    console.error(`[Spotify Token] Failed to save setting ${key}:`, error);
  }
}

async function clearSpotifyTokens() {
  try {
    const keys = ["spotify_access_token", "spotify_access_token_expiry", "spotify_refresh_token"];
    for (const key of keys) {
      await db
        .update(siteSettings)
        .set({ value: null, updatedAt: new Date() })
        .where(eq(siteSettings.key, key));
    }
  } catch (error) {
    console.error("[Spotify Token] Failed to clear tokens:", error);
  }
}
