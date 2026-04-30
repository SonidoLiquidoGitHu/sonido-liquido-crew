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

    let connected = false;
    let accountName: string | undefined;
    let email: string | undefined;
    let error: string | undefined;
    let testedTokenSource: string | undefined;

    // Test connection - prioritize DATABASE token over environment token
    if (configured) {
      try {
        // PRIORITY: Database token first, then environment token
        let tokenToTest: string;
        if (hasDatabaseToken && tokens.accessToken) {
          tokenToTest = tokens.accessToken;
          testedTokenSource = "database";
          console.log("[Dropbox API] Testing DATABASE token (priority):", tokenToTest.slice(0, 15) + "...");
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
