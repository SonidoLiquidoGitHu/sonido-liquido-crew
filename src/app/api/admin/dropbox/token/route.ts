// ===========================================
// DROPBOX TOKEN API - Returns access token for browser uploads
// Automatically refreshes expired tokens using the stored refresh_token.
// ===========================================

import { db, isDatabaseConfigured } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET - Get Dropbox token for direct browser upload
// If the stored access token is expired, automatically refreshes it using
// the stored refresh_token before returning it to the client.
export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 },
      );
    }

    // Read all Dropbox token data from database in one query
    const results = await db
      .select()
      .from(siteSettings)
      .where(
        inArray(siteSettings.key, [
          "dropbox_access_token",
          "dropbox_token_expiry",
          "dropbox_refresh_token",
        ]),
      );

    let accessToken: string | null = null;
    let expiryTime: number | null = null;
    let refreshToken: string | null = null;

    for (const row of results) {
      if (row.key === "dropbox_access_token") {
        accessToken = row.value;
      } else if (row.key === "dropbox_token_expiry") {
        expiryTime = row.value ? Number.parseInt(row.value, 10) : null;
      } else if (row.key === "dropbox_refresh_token") {
        refreshToken = row.value;
      }
    }

    // Fallback to environment variable if no database token
    if (!accessToken) {
      const envToken = (process.env.DROPBOX_ACCESS_TOKEN || "").trim();
      if (envToken) {
        accessToken = envToken;
        console.log(
          "[Dropbox Token] Using DROPBOX_ACCESS_TOKEN from environment (no database token)",
        );
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Dropbox not connected" },
        { status: 401 },
      );
    }

    // Check if token is expired or about to expire (with 5 minute buffer)
    const isExpired = expiryTime && Date.now() > expiryTime - 5 * 60 * 1000;

    if (isExpired && refreshToken) {
      // Token is expired — refresh it automatically using the stored refresh_token
      console.log(
        "[Dropbox Token] Access token expired, refreshing with refresh_token...",
      );

      const DROPBOX_APP_KEY = (process.env.DROPBOX_APP_KEY || "").trim();
      const DROPBOX_APP_SECRET = (process.env.DROPBOX_APP_SECRET || "").trim();

      if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
        console.error(
          "[Dropbox Token] Missing DROPBOX_APP_KEY or DROPBOX_APP_SECRET env vars — cannot refresh token",
        );
        // Return the expired token anyway — the upload might fail, but at least we tried
        console.warn(
          "[Dropbox Token] Returning expired token (cannot refresh without app credentials)",
        );
      } else {
        try {
          const refreshResponse = await fetch(
            "https://api.dropboxapi.com/oauth2/token",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: DROPBOX_APP_KEY,
                client_secret: DROPBOX_APP_SECRET,
              }),
            },
          );

          if (refreshResponse.ok) {
            const tokenData = await refreshResponse.json();
            const newAccessToken = tokenData.access_token;
            const newExpiresIn = tokenData.expires_in; // seconds
            const newExpiryTime = Date.now() + newExpiresIn * 1000;

            // Save the new access token and expiry to DB
            await upsertSetting("dropbox_access_token", newAccessToken);
            await upsertSetting(
              "dropbox_token_expiry",
              newExpiryTime.toString(),
            );

            // If a new refresh_token was returned (rare but possible), save it too
            if (tokenData.refresh_token) {
              await upsertSetting(
                "dropbox_refresh_token",
                tokenData.refresh_token,
              );
            }

            console.log(
              "[Dropbox Token] Token refreshed successfully, expires in",
              newExpiresIn,
              "seconds",
            );

            return NextResponse.json({
              success: true,
              data: {
                token: newAccessToken,
                accessToken: newAccessToken,
                expiresAt: newExpiryTime,
              },
            });
          }
          const errorBody = await refreshResponse.text();
          console.error(
            "[Dropbox Token] Refresh failed:",
            refreshResponse.status,
            errorBody,
          );

          // If refresh token is invalid (400), clear all tokens — user must re-auth
          if (refreshResponse.status === 400) {
            console.error(
              "[Dropbox Token] Refresh token is invalid — clearing all Dropbox tokens. User must reconnect.",
            );
            await clearDropboxTokens();
            return NextResponse.json(
              {
                success: false,
                error:
                  "Dropbox session expired. Please reconnect your Dropbox account in the Sync page.",
              },
              { status: 401 },
            );
          }

          // For other errors (5xx, network), the existing token might still work
          // or the error might be temporary — don't clear tokens
          console.warn(
            "[Dropbox Token] Refresh failed but keeping existing token — error may be temporary",
          );
        } catch (refreshError) {
          console.error(
            "[Dropbox Token] Refresh request failed:",
            refreshError,
          );
          // Network error during refresh — keep the existing token, it might still work
        }
      }
    } else if (isExpired && !refreshToken) {
      console.warn(
        "[Dropbox Token] Access token expired and no refresh_token available. User must reconnect Dropbox.",
      );
      // Don't clear the token — the env var fallback might still work
      // But warn the user
      return NextResponse.json(
        {
          success: false,
          error:
            "Dropbox token expired and no refresh token available. Please reconnect your Dropbox account in the Sync page.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        token: accessToken, // Field name expected by all consumer components
        accessToken, // Keep for backward compatibility
        expiresAt: expiryTime,
      },
    });
  } catch (error) {
    console.error("[Dropbox Token] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get token" },
      { status: 500 },
    );
  }
}

/**
 * Insert or update a Dropbox setting in site_settings
 */
async function upsertSetting(key: string, value: string): Promise<void> {
  try {
    const [existing] = await db
      .select({ id: siteSettings.id })
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
        type: "string",
        description: `Dropbox ${key}`,
      });
    }
  } catch (error) {
    console.error(`[Dropbox Token] Failed to save setting ${key}:`, error);
  }
}

/**
 * Clear all Dropbox tokens from the database (forces re-auth)
 */
async function clearDropboxTokens(): Promise<void> {
  try {
    const keys = [
      "dropbox_access_token",
      "dropbox_token_expiry",
      "dropbox_refresh_token",
    ];
    for (const key of keys) {
      await db
        .update(siteSettings)
        .set({ value: null, updatedAt: new Date() })
        .where(eq(siteSettings.key, key));
    }
  } catch (error) {
    console.error("[Dropbox Token] Failed to clear tokens:", error);
  }
}
