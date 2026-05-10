/**
 * Shared Spotify Token Management
 *
 * Single source of truth for reading, refreshing, and storing Spotify OAuth tokens.
 * Used by:
 *   - /api/admin/spotify/token/route.ts
 *   - /api/admin/spotify/callback/route.ts
 *   - /api/admin/curated-playlists/[id]/sync-spotify/route.ts
 *
 * This module eliminates the 3 separate duplicate implementations that were
 * causing inconsistencies and bugs.
 */

import { db } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

// ===========================================
// CREDENTIALS
// ===========================================

export function getSpotifyCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6";
  return { clientId, clientSecret };
}

export function getSpotifyAuthHeader(): string {
  const { clientId, clientSecret } = getSpotifyCredentials();
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

// ===========================================
// SETTINGS CRUD
// ===========================================

/**
 * Insert or update a site setting.
 * Throws on error so callers know if the write failed.
 */
export async function upsertSetting(key: string, value: string, type: string, description?: string): Promise<void> {
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
      description: description || `Spotify ${key}`,
    });
  }
}

/**
 * Read a single setting value by key.
 * Returns null if not found or value is null.
 */
export async function readSetting(key: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1);
  return row?.value ?? null;
}

// ===========================================
// TOKEN STORAGE
// ===========================================

const SPOTIFY_TOKEN_KEYS = [
  "spotify_refresh_token",
  "spotify_access_token",
  "spotify_access_token_expiry",
] as const;

/**
 * Store all Spotify tokens in a single batch.
 * Used after OAuth callback or token refresh.
 */
export async function storeSpotifyTokens(params: {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}): Promise<void> {
  const expiryMs = String(Date.now() + (params.expiresIn - 60) * 1000);

  await upsertSetting("spotify_access_token", params.accessToken, "string", "Spotify OAuth access token (temporary)");
  await upsertSetting("spotify_access_token_expiry", expiryMs, "number", "Spotify access token expiry timestamp");

  // Spotify may not always return a new refresh_token on re-authorization
  if (params.refreshToken) {
    await upsertSetting("spotify_refresh_token", params.refreshToken, "string", "Spotify OAuth refresh token for playlist access");
  }
}

/**
 * Clear all Spotify tokens (set to null).
 * Used when tokens are definitively invalid (e.g., refresh returns 400).
 */
export async function clearSpotifyTokens(): Promise<void> {
  for (const key of SPOTIFY_TOKEN_KEYS) {
    await db
      .update(siteSettings)
      .set({ value: null, updatedAt: new Date() })
      .where(eq(siteSettings.key, key));
  }
  console.log("[Spotify Tokens] All tokens cleared");
}

// ===========================================
// TOKEN RETRIEVAL & REFRESH
// ===========================================

/**
 * Get a valid Spotify user access token.
 * If the stored access token is expired, refreshes it using the stored refresh token.
 * Returns null if no user token is available.
 *
 * @param forceRefresh - If true, skip cached token and force a refresh
 * @param retryCount - Internal: retry count for Turso replication lag
 */
export async function getSpotifyUserAccessToken(forceRefresh = false, retryCount = 1): Promise<string | null> {
  try {
    const refreshToken = await readSetting("spotify_refresh_token");

    if (!refreshToken) {
      console.log("[Spotify Tokens] No refresh token found in DB");
      return null;
    }

    if (!forceRefresh) {
      const accessToken = await readSetting("spotify_access_token");
      const expiryStr = await readSetting("spotify_access_token_expiry");
      const expiry = parseInt(expiryStr || "0", 10);

      // Check if current access token is still valid (with 60s buffer)
      if (accessToken && Date.now() < expiry - 60000) {
        const remainingSec = Math.floor((expiry - Date.now()) / 1000);
        console.log(`[Spotify Tokens] Using cached access token (expires in ${remainingSec}s)`);
        return accessToken;
      }

      if (accessToken) {
        console.log(`[Spotify Tokens] Access token expired. Expiry: ${expiry}, Now: ${Date.now()}, Diff: ${Math.floor((Date.now() - expiry) / 1000)}s ago`);
      } else {
        console.log("[Spotify Tokens] No access token in DB, refreshing...");
      }
    }

    // Access token expired or force refresh requested — refresh it
    console.log(`[Spotify Tokens] ${forceRefresh ? 'Force refreshing' : 'Refreshing expired'} user access token...`);

    const refreshResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: getSpotifyAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!refreshResponse.ok) {
      const errorBody = await refreshResponse.text().catch(() => "");
      console.error(`[Spotify Tokens] Token refresh failed: ${refreshResponse.status} ${errorBody.slice(0, 500)}`);

      // Only clear tokens on definitive auth failures (400 = invalid refresh token, 401 = bad client)
      // Don't clear on 403 or 5xx — these could be temporary
      if (refreshResponse.status === 400 || refreshResponse.status === 401) {
        console.log("[Spotify Tokens] Definitive auth failure, clearing tokens");
        await clearSpotifyTokens();
      }

      // If this was a transient failure and we still have a cached access token,
      // return it even if it's slightly expired — it might still work
      if (refreshResponse.status !== 400 && refreshResponse.status !== 401) {
        const cachedAccessToken = await readSetting("spotify_access_token");
        if (cachedAccessToken) {
          console.warn("[Spotify Tokens] Refresh failed with transient error, trying cached access token as last resort");
          return cachedAccessToken;
        }
      }

      return null;
    }

    const tokenData = await refreshResponse.json();
    const newAccessToken = tokenData.access_token;
    const newExpiresIn = tokenData.expires_in;
    const newRefreshToken = tokenData.refresh_token; // May or may not be returned
    const grantedScopes = tokenData.scope; // Spotify returns granted scopes

    // Store the refreshed tokens
    await storeSpotifyTokens({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken || undefined,
      expiresIn: newExpiresIn,
    });

    console.log(`[Spotify Tokens] User access token refreshed successfully, expires in ${newExpiresIn}s, scopes: ${grantedScopes || 'not returned'}`);
    return newAccessToken;
  } catch (error) {
    console.error("[Spotify Tokens] Failed to get user access token:", error);

    // Last resort: try returning cached token even if expired
    if (!forceRefresh) {
      try {
        const cachedAccessToken = await readSetting("spotify_access_token");
        if (cachedAccessToken) {
          console.warn("[Spotify Tokens] Exception during refresh, trying cached access token as last resort");
          return cachedAccessToken;
        }
      } catch {
        // Give up completely
      }
    }

    return null;
  }
}

/**
 * Get a Spotify client-credentials access token (no user context, public data only).
 * Used as a fallback when user auth fails for public playlists.
 */
export async function getClientCredentialsToken(): Promise<string | null> {
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: getSpotifyAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
      }).toString(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(`[Spotify Tokens] Client credentials token failed: ${response.status} ${errorBody.slice(0, 200)}`);
      return null;
    }

    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.error("[Spotify Tokens] Client credentials token error:", error);
    return null;
  }
}

/**
 * Validate that an access token works by calling the /me endpoint.
 * Returns the user's Spotify ID if valid, null if invalid.
 */
export async function validateAccessToken(accessToken: string): Promise<{ valid: boolean; userId?: string; scopes?: string[]; error?: string }> {
  try {
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        valid: true,
        userId: data.id,
        scopes: data.scope?.split(" ") || [],
      };
    }

    const errorBody = await response.text().catch(() => "");
    return {
      valid: false,
      error: `Spotify /me returned ${response.status}: ${errorBody.slice(0, 200)}`,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to validate token: ${(error as Error).message}`,
    };
  }
}
