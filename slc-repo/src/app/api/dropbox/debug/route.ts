import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { testDropboxConnection } from "@/lib/clients/dropbox";

/**
 * GET - Debug endpoint to check Dropbox OAuth configuration and token status
 */
export async function GET() {
  const appKey = (process.env.DROPBOX_APP_KEY || "").trim();
  const appSecret = (process.env.DROPBOX_APP_SECRET || "").trim();
  const envAccessToken = (process.env.DROPBOX_ACCESS_TOKEN || "").trim();
  const databaseUrl = process.env.DATABASE_URL || "";
  const databaseAuthToken = process.env.DATABASE_AUTH_TOKEN || "";

  // Check database status
  let dbStatus = "NOT CHECKED";
  let dbTokenInfo: {
    hasAccessToken: boolean;
    tokenPreview: string | null;
    hasRefreshToken: boolean;
    expiry: string | null;
    updatedAt: string | null;
  } | null = null;

  try {
    if (isDatabaseConfigured()) {
      dbStatus = "CONFIGURED";

      // Fetch tokens from database
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

        let accessToken: string | null = null;
        let refreshToken: string | null = null;
        let expiry: string | null = null;
        let updatedAt: Date | null = null;

        for (const row of results) {
          if (row.key === "dropbox_access_token") {
            accessToken = row.value;
            updatedAt = row.updatedAt;
          }
          if (row.key === "dropbox_refresh_token") refreshToken = row.value;
          if (row.key === "dropbox_token_expiry") expiry = row.value;
        }

        dbTokenInfo = {
          hasAccessToken: !!accessToken,
          tokenPreview: accessToken ? `${accessToken.slice(0, 15)}...${accessToken.slice(-4)}` : null,
          hasRefreshToken: !!refreshToken,
          expiry: expiry,
          updatedAt: updatedAt?.toISOString() || null,
        };
      } catch (e) {
        dbStatus = `QUERY_ERROR: ${(e as Error).message}`;
      }
    } else {
      dbStatus = "NOT CONFIGURED";
    }
  } catch (e) {
    dbStatus = `ERROR: ${(e as Error).message}`;
  }

  // Test tokens
  let dbTokenTest: { success: boolean; error?: string; accountName?: string } | null = null;
  let envTokenTest: { success: boolean; error?: string; accountName?: string } | null = null;

  if (dbTokenInfo?.hasAccessToken) {
    // Extract actual token from preview is not possible, so we need to query again
    try {
      const results = await db
        .select()
        .from(siteSettings)
        .where(inArray(siteSettings.key, ["dropbox_access_token"]));
      const token = results.find(r => r.key === "dropbox_access_token")?.value;
      if (token) {
        const result = await testDropboxConnection(token);
        dbTokenTest = {
          success: result.success,
          error: result.error,
          accountName: result.accountName,
        };
      }
    } catch (e) {
      dbTokenTest = { success: false, error: (e as Error).message };
    }
  }

  if (envAccessToken) {
    const result = await testDropboxConnection(envAccessToken);
    envTokenTest = {
      success: result.success,
      error: result.error,
      accountName: result.accountName,
    };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",

    // Token priority explanation
    tokenPriority: {
      note: "Database tokens have HIGHER priority than environment tokens",
      order: ["1. Database token (user-saved)", "2. Environment token (fallback only)"],
    },

    // Database token status
    databaseToken: {
      status: dbStatus,
      ...dbTokenInfo,
      testResult: dbTokenTest,
    },

    // Environment token status
    environmentToken: {
      hasToken: !!envAccessToken,
      tokenPreview: envAccessToken ? `${envAccessToken.slice(0, 15)}...` : null,
      testResult: envTokenTest,
      warning: envAccessToken ? "⚠️ Environment tokens are only used as FALLBACK when no database token exists" : null,
    },

    // OAuth config
    oauthConfig: {
      DROPBOX_APP_KEY: appKey ? `${appKey.substring(0, 4)}...${appKey.substring(appKey.length - 4)} (length: ${appKey.length})` : "❌ NOT SET",
      DROPBOX_APP_SECRET: appSecret ? `SET (length: ${appSecret.length})` : "❌ NOT SET",
      configured: !!(appKey && appSecret),
      redirectUri: "https://sonidoliquido.com/api/dropbox/callback",
    },

    // Database config
    databaseConfig: {
      DATABASE_URL: databaseUrl ? `${databaseUrl.substring(0, 30)}... (length: ${databaseUrl.length})` : "❌ NOT SET",
      DATABASE_AUTH_TOKEN: databaseAuthToken ? `SET (length: ${databaseAuthToken.length})` : "❌ NOT SET",
    },

    instructions: {
      "If token shows 'expired' after saving": [
        "1. Make sure you generated a NEW token from Dropbox App Console",
        "2. Click 'Verificar Conexión (Forzar)' to bypass cache",
        "3. Check if DROPBOX_ACCESS_TOKEN env var has an OLD token (this would override your new one)",
        "4. If env var has old token, REMOVE it from Netlify - database tokens have priority now",
      ],
      "To use OAuth (recommended)": [
        "1. Set DROPBOX_APP_KEY and DROPBOX_APP_SECRET in Netlify",
        "2. Add redirect URI in Dropbox App Console: https://sonidoliquido.com/api/dropbox/callback",
        "3. Click 'Conectar con Dropbox' button",
      ],
    },
  });
}
