import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get a valid Spotify user access token.
 * If the stored access token is expired, refreshes it using the stored refresh token.
 * Returns the access token and its expiry time.
 *
 * This endpoint also handles reading all three token values in a single batch
 * to minimize DB round-trips, and includes retry logic for DB read failures
 * (which can happen with Turso replication lag right after an OAuth callback).
 */
export async function GET() {
  try {
    // Batch-read all three token settings from DB
    // If the first read returns nothing, retry once after a short delay
    // to handle Turso replication lag after an OAuth callback write.
    let refreshTokenRow: { value: string | null } | undefined;
    let accessTokenRow: { value: string | null } | undefined;
    let expiryRow: { value: string | null } | undefined;

    for (let attempt = 0; attempt < 2; attempt++) {
      const [rt] = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, "spotify_refresh_token"))
        .limit(1);

      const [at] = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, "spotify_access_token"))
        .limit(1);

      const [ex] = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, "spotify_access_token_expiry"))
        .limit(1);

      refreshTokenRow = rt;
      accessTokenRow = at;
      expiryRow = ex;

      // If we found a refresh token, we're good — no need to retry
      if (refreshTokenRow?.value) break;

      // If this is the first attempt and we got nothing, wait a moment and retry
      // (Turso replication lag after an OAuth callback)
      if (attempt === 0) {
        console.log("[Spotify Token] No refresh token found on first attempt — waiting 1s and retrying (possible replication lag)...");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

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
      signal: AbortSignal.timeout(15_000),
    });

    if (!refreshResponse.ok) {
      const errorBody = await refreshResponse.text();
      console.error("[Spotify Token] Refresh failed:", refreshResponse.status, errorBody);

      // Only clear tokens on definitive auth failures (400 = invalid refresh token, 401 = bad client)
      // Do NOT clear on 403 (could be temporary) or 5xx (server error)
      if (refreshResponse.status === 400 || refreshResponse.status === 401) {
        await clearSpotifyTokens();
        return NextResponse.json({
          connected: false,
          error: "Spotify authorization expired. Please reconnect your Spotify account.",
        });
      }

      // For 403 or server errors, don't clear tokens — they might still be valid later
      // Return connected: false but with refreshFailed flag so the client knows
      // the connection exists but refresh is temporarily failing
      return NextResponse.json({
        connected: false,
        error: "Failed to refresh Spotify access token. Please try again in a moment.",
        refreshFailed: true,
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
        description: `Spotify ${key}`,
      });
    }
  } catch (error) {
    console.error(`[Spotify Token] Failed to save setting ${key}:`, error);
    throw error; // Re-throw so caller knows the write failed
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
