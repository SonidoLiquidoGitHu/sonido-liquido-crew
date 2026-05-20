import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  testDropboxConnection,
  saveDropboxToken,
  clearDropboxTokenCache,
  refreshDropboxToken,
  dropboxClient,
  isOAuthConfigured,
  getOAuthStatus,
} from "@/lib/clients/dropbox";

/**
 * GET - Get Dropbox connection status
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";

    console.log("[Dropbox API] Checking Dropbox status...", forceRefresh ? "(force refresh)" : "");

    // If force refresh requested, clear cache first
    if (forceRefresh) {
      clearDropboxTokenCache();
      console.log("[Dropbox API] Cache cleared for force refresh");
    }

    // Check OAuth configuration
    const oauthStatus = getOAuthStatus();
    console.log("[Dropbox API] OAuth configured:", oauthStatus.configured);

    // Check for direct environment token (works without database)
    const envToken = (process.env.DROPBOX_ACCESS_TOKEN || "").trim();
    const hasEnvToken = Boolean(envToken);

    if (!isDatabaseConfigured()) {
      console.warn("[Dropbox API] Database not configured, checking env token...");

      // If we have an env token, test it
      if (hasEnvToken) {
        const testResult = await testDropboxConnection(envToken);
        return NextResponse.json({
          success: true,
          data: {
            configured: true,
            connected: testResult.success,
            hasEnvToken: true,
            hasDatabaseToken: false,
            hasRefreshToken: false,
            oauthConfigured: oauthStatus.configured,
            accountName: testResult.accountName,
            email: testResult.email,
            error: testResult.error,
            usingEnvToken: true,
            tokenSource: "environment",
            debug: "Using DROPBOX_ACCESS_TOKEN from environment (no database)",
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          configured: false,
          connected: false,
          hasEnvToken: false,
          hasDatabaseToken: false,
          hasRefreshToken: false,
          oauthConfigured: oauthStatus.configured,
          tokenSource: "none",
          debug: "Database not configured and no DROPBOX_ACCESS_TOKEN in environment",
        },
      });
    }

    // Fetch all Dropbox-related settings from database
    console.log("[Dropbox API] Querying database for tokens...");
    let tokens: { accessToken: string | null; refreshToken: string | null; expiry: string | null; updatedAt: Date | null } = {
      accessToken: null,
      refreshToken: null,
      expiry: null,
      updatedAt: null,
    };

    try {
      const results = await db
        .select()
        .from(siteSettings)
        .where(
          inArray(siteSettings.key, [
            "dropbox_access_token",
            "dropbox_refresh_token",
            "dropbox_token_expiry"
          ])
        );

      for (const row of results) {
        if (row.key === "dropbox_access_token") {
          tokens.accessToken = row.value;
          tokens.updatedAt = row.updatedAt;
        }
        if (row.key === "dropbox_refresh_token") tokens.refreshToken = row.value;
        if (row.key === "dropbox_token_expiry") tokens.expiry = row.value;
      }

      console.log("[Dropbox API] Database tokens found:", {
        hasAccessToken: !!tokens.accessToken,
        tokenPreview: tokens.accessToken ? `${tokens.accessToken.slice(0, 15)}...` : null,
        hasRefreshToken: !!tokens.refreshToken,
        expiry: tokens.expiry,
        updatedAt: tokens.updatedAt?.toISOString(),
      });
    } catch (dbError) {
      console.error("[Dropbox API] Database query failed:", dbError);

      // Try env token as fallback when database fails
      if (hasEnvToken) {
        console.log("[Dropbox API] Testing env token as fallback...");
        const testResult = await testDropboxConnection(envToken);
        return NextResponse.json({
          success: true,
          data: {
            configured: true,
            connected: testResult.success,
            hasEnvToken: true,
            hasDatabaseToken: false,
            hasRefreshToken: false,
            oauthConfigured: oauthStatus.configured,
            accountName: testResult.accountName,
            email: testResult.email,
            error: testResult.error,
            usingEnvToken: true,
            tokenSource: "environment (database failed)",
            debug: `Database query failed, using DROPBOX_ACCESS_TOKEN: ${(dbError as Error).message}`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          configured: false,
          connected: false,
          hasEnvToken: false,
          hasDatabaseToken: false,
          hasRefreshToken: false,
          oauthConfigured: oauthStatus.configured,
          tokenSource: "none (database failed)",
          debug: `Database query failed: ${(dbError as Error).message}`,
        },
      });
    }

    const hasDatabaseToken = Boolean(tokens.accessToken);
    const hasRefreshTokenInDb = Boolean(tokens.refreshToken);

    // IMPORTANT: Database token has priority over environment token
    const configured = hasDatabaseToken || hasEnvToken;
    const tokenSource = hasDatabaseToken ? "database" : hasEnvToken ? "environment" : "none";

    // Check if token is expired (only relevant for OAuth tokens with expiry)
    let isExpired = false;
    if (tokens.expiry) {
      const expiryTime = parseInt(tokens.expiry, 10);
      isExpired = Date.now() > expiryTime;
    }

    // AUTO-REFRESH: If the token is expired but we have a refresh_token,
    // refresh it BEFORE testing the connection. This prevents the user from
    // seeing "not connected" when the access token naturally expires (every ~4hrs).
    if (isExpired && hasRefreshTokenInDb && tokens.refreshToken) {
      console.log("[Dropbox API] Access token expired, auto-refreshing before status check...");
      const DROPBOX_APP_KEY = (process.env.DROPBOX_APP_KEY || "").trim();
      const DROPBOX_APP_SECRET = (process.env.DROPBOX_APP_SECRET || "").trim();

      if (DROPBOX_APP_KEY && DROPBOX_APP_SECRET) {
        try {
          const refreshResponse = await fetch("https://api.dropboxapi.com/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: tokens.refreshToken,
              client_id: DROPBOX_APP_KEY,
              client_secret: DROPBOX_APP_SECRET,
            }),
          });

          if (refreshResponse.ok) {
            const tokenData = await refreshResponse.json();
            const newAccessToken = tokenData.access_token;
            const newExpiresIn = tokenData.expires_in || 14400;
            const newExpiryTime = Date.now() + newExpiresIn * 1000;

            // Save refreshed token to DB
            await upsertDbSetting("dropbox_access_token", newAccessToken);
            await upsertDbSetting("dropbox_token_expiry", newExpiryTime.toString());
            if (tokenData.refresh_token) {
              await upsertDbSetting("dropbox_refresh_token", tokenData.refresh_token);
            }

            // Update local variables so the connection test below uses the new token
            tokens.accessToken = newAccessToken;
            tokens.expiry = newExpiryTime.toString();
            isExpired = false;

            console.log("[Dropbox API] Token auto-refreshed successfully");
          } else {
            const errorBody = await refreshResponse.text();
            console.error("[Dropbox API] Auto-refresh failed:", refreshResponse.status, errorBody);

            // If refresh token is invalid (400), clear tokens — user must re-auth
            if (refreshResponse.status === 400) {
              console.error("[Dropbox API] Refresh token invalid — clearing tokens");
              await clearDbDropboxTokens();
              tokens.accessToken = null;
              tokens.refreshToken = null;
              tokens.expiry = null;
            }
          }
        } catch (refreshError) {
          console.error("[Dropbox API] Auto-refresh error:", refreshError);
        }
      } else {
        console.warn("[Dropbox API] Cannot auto-refresh: missing DROPBOX_APP_KEY or DROPBOX_APP_SECRET");
      }
    }

    // Recalculate after potential refresh
    const hasDatabaseTokenAfterRefresh = Boolean(tokens.accessToken);

    let connected = false;
    let accountName: string | undefined;
    let email: string | undefined;
    let error: string | undefined;
    let testedTokenSource: string | undefined;

    // Test connection - prioritize DATABASE token over environment token
    if (hasDatabaseTokenAfterRefresh || hasEnvToken) {
      try {
        // PRIORITY: Database token first, then environment token
        let tokenToTest: string;
        if (hasDatabaseTokenAfterRefresh && tokens.accessToken) {
          tokenToTest = tokens.accessToken;
          testedTokenSource = "database";
          console.log("[Dropbox API] Testing DATABASE token:", tokenToTest.slice(0, 15) + "...");
        } else if (hasEnvToken) {
          tokenToTest = envToken;
          testedTokenSource = "environment";
          console.log("[Dropbox API] Testing ENVIRONMENT token (fallback):", tokenToTest.slice(0, 15) + "...");
        } else {
          tokenToTest = "";
        }

        if (tokenToTest) {
          const result = await testDropboxConnection(tokenToTest);
          connected = result.success;
          accountName = result.accountName;
          email = result.email;
          error = result.error;

          // If connection test failed with the DB token but we have a refresh_token,
          // try refreshing one more time and retesting
          if (!result.success && testedTokenSource === "database" && hasRefreshTokenInDb && tokens.refreshToken) {
            console.log("[Dropbox API] Connection test failed, attempting token refresh...");
            const DROPBOX_APP_KEY = (process.env.DROPBOX_APP_KEY || "").trim();
            const DROPBOX_APP_SECRET = (process.env.DROPBOX_APP_SECRET || "").trim();

            if (DROPBOX_APP_KEY && DROPBOX_APP_SECRET) {
              try {
                const refreshResponse = await fetch("https://api.dropboxapi.com/oauth2/token", {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: new URLSearchParams({
                    grant_type: "refresh_token",
                    refresh_token: tokens.refreshToken,
                    client_id: DROPBOX_APP_KEY,
                    client_secret: DROPBOX_APP_SECRET,
                  }),
                });

                if (refreshResponse.ok) {
                  const tokenData = await refreshResponse.json();
                  const newAccessToken = tokenData.access_token;
                  const newExpiresIn = tokenData.expires_in || 14400;
                  const newExpiryTime = Date.now() + newExpiresIn * 1000;

                  await upsertDbSetting("dropbox_access_token", newAccessToken);
                  await upsertDbSetting("dropbox_token_expiry", newExpiryTime.toString());
                  if (tokenData.refresh_token) {
                    await upsertDbSetting("dropbox_refresh_token", tokenData.refresh_token);
                  }

                  // Re-test with the new token
                  const retryResult = await testDropboxConnection(newAccessToken);
                  if (retryResult.success) {
                    connected = true;
                    accountName = retryResult.accountName;
                    email = retryResult.email;
                    error = undefined;
                    console.log("[Dropbox API] Reconnected successfully after refresh");
                  }
                } else if (refreshResponse.status === 400) {
                  // Refresh token invalid — clear tokens
                  await clearDbDropboxTokens();
                }
              } catch (retryErr) {
                console.error("[Dropbox API] Retry refresh error:", retryErr);
              }
            }
          }

          if (!result.success && testedTokenSource === "database" && hasEnvToken) {
            // If database token failed and we have env token, note it
            console.log("[Dropbox API] Database token failed, env token available as backup");
          }
        }
      } catch (err) {
        error = (err as Error).message;
      }
    }

    // Get storage info if connected
    let storageInfo: { used: number; allocated: number } | undefined;
    if (connected) {
      try {
        storageInfo = await dropboxClient.getSpaceUsage();
      } catch {
        // Ignore storage info errors
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        configured,
        connected,
        hasEnvToken,
        hasDatabaseToken,
        hasRefreshToken: hasRefreshTokenInDb,
        isExpired,
        oauthConfigured: oauthStatus.configured,
        accountName,
        email,
        error,
        storage: storageInfo,
        // Show which token source is being used
        tokenSource,
        testedTokenSource,
        usingEnvToken: !hasDatabaseToken && hasEnvToken,
        // Mask the token for display
        tokenPreview: tokens.accessToken
          ? `${tokens.accessToken.slice(0, 10)}...${tokens.accessToken.slice(-4)}`
          : hasEnvToken
          ? `ENV:${envToken.slice(0, 10)}...`
          : undefined,
        // Show when token was saved
        tokenSavedAt: tokens.updatedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("[API] Error getting Dropbox status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get Dropbox status" },
      { status: 500 }
    );
  }
}

/**
 * POST - Test and save Dropbox token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, action } = body;

    // Action: test - Just test the token without saving
    if (action === "test") {
      if (!token) {
        return NextResponse.json(
          { success: false, error: "Token is required" },
          { status: 400 }
        );
      }

      const result = await testDropboxConnection(token);

      return NextResponse.json({
        success: result.success,
        data: {
          connected: result.success,
          accountName: result.accountName,
          email: result.email,
        },
        error: result.error,
      });
    }

    // Action: save - Test and save the token
    if (action === "save") {
      if (!token) {
        return NextResponse.json(
          { success: false, error: "Token is required" },
          { status: 400 }
        );
      }

      const cleanToken = token.trim();
      console.log("[API] Saving Dropbox token, length:", cleanToken.length);

      // First test the token
      const testResult = await testDropboxConnection(cleanToken);
      if (!testResult.success) {
        console.log("[API] Token test failed:", testResult.error);
        return NextResponse.json({
          success: false,
          error: testResult.error || "Token inválido",
        }, { status: 400 });
      }

      console.log("[API] Token test passed, saving to database...");

      // Save to database
      try {
        const saved = await saveDropboxToken(cleanToken);
        if (!saved) {
          console.error("[API] saveDropboxToken returned false");
          return NextResponse.json({
            success: false,
            error: "Failed to save token to database - check server logs",
          }, { status: 500 });
        }
      } catch (saveError) {
        console.error("[API] Exception saving token:", saveError);
        return NextResponse.json({
          success: false,
          error: `Database error: ${(saveError as Error).message}`,
        }, { status: 500 });
      }

      console.log(`[API] Dropbox token saved for account: ${testResult.accountName}`);

      return NextResponse.json({
        success: true,
        data: {
          saved: true,
          accountName: testResult.accountName,
          email: testResult.email,
        },
        message: `Connected to Dropbox account: ${testResult.accountName}`,
      });
    }

    // Action: clear - Remove the database token
    if (action === "clear") {
      if (!isDatabaseConfigured()) {
        return NextResponse.json({
          success: false,
          error: "Database not configured",
        }, { status: 503 });
      }

      // Delete all Dropbox settings
      await db
        .delete(siteSettings)
        .where(inArray(siteSettings.key, [
          "dropbox_access_token",
          "dropbox_refresh_token",
          "dropbox_token_expiry"
        ]));

      clearDropboxTokenCache();

      console.log("[API] Dropbox tokens cleared");

      return NextResponse.json({
        success: true,
        message: "Dropbox disconnected",
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[API] Error managing Dropbox token:", error);
    return NextResponse.json(
      { success: false, error: "Failed to manage Dropbox token" },
      { status: 500 }
    );
  }
}

/**
 * Insert or update a Dropbox setting in site_settings (used by auto-refresh)
 */
async function upsertDbSetting(key: string, value: string): Promise<void> {
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
        description: `Dropbox ${key.replace("dropbox_", "")}`,
      });
    }
  } catch (error) {
    console.error(`[Dropbox API] Failed to save setting ${key}:`, error);
  }
}

/**
 * Clear all Dropbox tokens from the database (for invalid refresh tokens)
 */
async function clearDbDropboxTokens(): Promise<void> {
  try {
    const keys = ["dropbox_access_token", "dropbox_token_expiry", "dropbox_refresh_token"];
    for (const key of keys) {
      await db
        .update(siteSettings)
        .set({ value: null, updatedAt: new Date() })
        .where(eq(siteSettings.key, key));
    }
    clearDropboxTokenCache();
    console.log("[Dropbox API] Tokens cleared from database");
  } catch (error) {
    console.error("[Dropbox API] Failed to clear tokens:", error);
  }
}
