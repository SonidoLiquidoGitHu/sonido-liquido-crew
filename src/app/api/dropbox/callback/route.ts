import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";
import { clearDropboxTokenCache } from "@/lib/clients/dropbox";

// Dropbox OAuth credentials - trim to remove any accidental whitespace
const DROPBOX_APP_KEY = (process.env.DROPBOX_APP_KEY || "").trim();
const DROPBOX_APP_SECRET = (process.env.DROPBOX_APP_SECRET || "").trim();

interface DropboxTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  uid: string;
  account_id: string;
}

/**
 * GET - OAuth callback handler
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Get the origin for redirect
  const origin = request.nextUrl.origin;
  const adminSyncUrl = `${origin}/admin/sync`;

  // Handle errors from Dropbox
  if (error) {
    console.error("[Dropbox OAuth] Error from Dropbox:", error, errorDescription);
    return NextResponse.redirect(
      `${adminSyncUrl}?dropbox_error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  // Verify we have the authorization code
  if (!code) {
    console.error("[Dropbox OAuth] No authorization code received");
    return NextResponse.redirect(
      `${adminSyncUrl}?dropbox_error=${encodeURIComponent("No authorization code received")}`
    );
  }

  // Verify state (CSRF protection) - optional check
  const storedState = request.cookies.get("dropbox_oauth_state")?.value;
  if (storedState && state && storedState !== state) {
    console.error("[Dropbox OAuth] State mismatch");
    return NextResponse.redirect(
      `${adminSyncUrl}?dropbox_error=${encodeURIComponent("Invalid state - please try again")}`
    );
  }

  try {
    // Exchange code for tokens - use exact URI from Dropbox app settings
    // This MUST match exactly what's configured in Dropbox App Console
    const redirectUri = "https://sonidoliquido.com/api/dropbox/callback";

    console.log("[Dropbox OAuth] Exchanging code for tokens...");
    console.log("[Dropbox OAuth] Redirect URI:", redirectUri);
    console.log("[Dropbox OAuth] App Key:", DROPBOX_APP_KEY ? DROPBOX_APP_KEY.substring(0, 4) + "..." : "NOT SET");
    console.log("[Dropbox OAuth] App Secret:", DROPBOX_APP_SECRET ? "SET" : "NOT SET");

    if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
      console.error("[Dropbox OAuth] Missing credentials!");
      return NextResponse.redirect(
        `${adminSyncUrl}?dropbox_error=${encodeURIComponent("Dropbox credentials not configured in Netlify")}`
      );
    }

    const tokenResponse = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        client_id: DROPBOX_APP_KEY,
        client_secret: DROPBOX_APP_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error("[Dropbox OAuth] Token exchange failed:", tokenResponse.status, errorBody);

      // Parse error for better message
      let errorMsg = `Token exchange failed: ${tokenResponse.status}`;
      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.error_description) {
          errorMsg = errorJson.error_description;
        } else if (errorJson.error) {
          errorMsg = errorJson.error;
        }
      } catch (e) {
        errorMsg = errorBody || errorMsg;
      }

      return NextResponse.redirect(
        `${adminSyncUrl}?dropbox_error=${encodeURIComponent(errorMsg)}`
      );
    }

    const tokens: DropboxTokenResponse = await tokenResponse.json();
    console.log("[Dropbox OAuth] Token exchange successful!");
    console.log("[Dropbox OAuth] Got refresh token:", !!tokens.refresh_token);
    console.log("[Dropbox OAuth] Expires in:", tokens.expires_in, "seconds");

    // Check database
    if (!isDatabaseConfigured()) {
      console.error("[Dropbox OAuth] Database not configured");
      return NextResponse.redirect(
        `${adminSyncUrl}?dropbox_error=${encodeURIComponent("Database not configured")}`
      );
    }

    // Save access token
    await saveDropboxSetting("dropbox_access_token", tokens.access_token, "Dropbox OAuth access token");

    // Save refresh token if we got one
    if (tokens.refresh_token) {
      await saveDropboxSetting("dropbox_refresh_token", tokens.refresh_token, "Dropbox OAuth refresh token");
    }

    // Save token expiry (expires_in is in seconds)
    const expiryTime = Date.now() + (tokens.expires_in * 1000);
    await saveDropboxSetting("dropbox_token_expiry", expiryTime.toString(), "Dropbox token expiry timestamp");

    // Clear any cached tokens
    clearDropboxTokenCache();

    // Get account info for confirmation
    let accountName = "";
    try {
      const accountResponse = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "Content-Type": "application/json",
        },
        body: "null",
      });

      if (accountResponse.ok) {
        const accountData = await accountResponse.json();
        accountName = accountData.name?.display_name || accountData.email || "";
        console.log("[Dropbox OAuth] Connected to account:", accountName);
      }
    } catch (e) {
      console.warn("[Dropbox OAuth] Failed to get account name:", e);
    }

    // Create success response and clear the state cookie
    const response = NextResponse.redirect(
      `${adminSyncUrl}?dropbox_success=${encodeURIComponent(accountName || "connected")}`
    );
    response.cookies.delete("dropbox_oauth_state");

    return response;

  } catch (error) {
    console.error("[Dropbox OAuth] Error:", error);
    return NextResponse.redirect(
      `${adminSyncUrl}?dropbox_error=${encodeURIComponent((error as Error).message)}`
    );
  }
}

/**
 * Helper to save a Dropbox setting to the database
 */
async function saveDropboxSetting(key: string, value: string, description: string): Promise<void> {
  try {
    // Check if setting exists
    const existing = await db
      .select({ id: siteSettings.id })
      .from(siteSettings)
      .where(eq(siteSettings.key, key))
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing
      await db
        .update(siteSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(siteSettings.key, key));
    } else {
      // Insert new
      await db.insert(siteSettings).values({
        id: generateUUID(),
        key,
        value,
        type: "string",
        description,
      });
    }
    console.log(`[Dropbox OAuth] Saved ${key}`);
  } catch (error) {
    console.error(`[Dropbox OAuth] Failed to save ${key}:`, error);
    throw error;
  }
}
