// ===========================================
// TIKTOK OAUTH: CALLBACK HANDLER
// ===========================================
// Handles the OAuth callback from TikTok.
// Exchanges the authorization code for access + refresh tokens,
// saves them to the DB, then redirects to the admin page.

import { db } from "@/db/client";
import { socialCredentials } from "@/db/schema";
import { exchangeTikTokCode } from "@/lib/clients/tiktok";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

const REDIRECT_URI =
  process.env.TIKTOK_REDIRECT_URI ||
  "https://sonidoliquido.com/api/auth/tiktok/callback";

/**
 * Save a credential to the DB, upserting if it already exists.
 */
async function saveCredential(
  platform: "meta" | "tiktok",
  key: string,
  value: string,
) {
  const existing = await db
    .select()
    .from(socialCredentials)
    .where(
      and(
        eq(socialCredentials.platform, platform),
        eq(socialCredentials.key, key),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(socialCredentials)
      .set({ value, isFromUi: true, updatedAt: new Date() })
      .where(eq(socialCredentials.id, existing[0].id));
  } else {
    await db.insert(socialCredentials).values({
      id: crypto.randomUUID(),
      platform,
      key,
      value,
      isFromUi: true,
    });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Parse state to get return URL
  let returnUrl = "/admin/social";
  try {
    if (state) {
      const stateData = JSON.parse(Buffer.from(state, "base64").toString());
      returnUrl = stateData.returnUrl || "/admin/social";
    }
  } catch {
    // Invalid state, use default
  }

  // Handle user denial or errors
  if (error) {
    console.error("[TikTok OAuth] Error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(
        `${returnUrl}?tiktok_error=${encodeURIComponent(errorDescription || error)}`,
        request.url,
      ),
    );
  }

  if (!code) {
    console.error("[TikTok OAuth] No authorization code received");
    return NextResponse.redirect(
      new URL(`${returnUrl}?tiktok_error=no_code`, request.url),
    );
  }

  try {
    // Exchange the authorization code for tokens
    const tokens = await exchangeTikTokCode(code, REDIRECT_URI);

    if (!tokens) {
      console.error("[TikTok OAuth] Token exchange failed");
      return NextResponse.redirect(
        new URL(`${returnUrl}?tiktok_error=token_exchange_failed`, request.url),
      );
    }

    console.log(
      "[TikTok OAuth] Token exchange successful! Open ID:",
      tokens.openId,
    );

    // Save tokens to DB so they're available immediately (no need for env vars)
    try {
      await saveCredential("tiktok", "TIKTOK_ACCESS_TOKEN", tokens.accessToken);
      await saveCredential(
        "tiktok",
        "TIKTOK_REFRESH_TOKEN",
        tokens.refreshToken,
      );
      await saveCredential("tiktok", "TIKTOK_OPEN_ID", tokens.openId);
      console.log("[TikTok OAuth] Tokens saved to DB");
    } catch (dbErr) {
      console.warn("[TikTok OAuth] Could not save tokens to DB:", dbErr);
    }

    // Redirect back to admin page with success
    const successUrl = new URL(returnUrl, request.url);
    successUrl.searchParams.set("tiktok_success", "true");
    successUrl.searchParams.set("tiktok_access_token", tokens.accessToken);
    successUrl.searchParams.set("tiktok_refresh_token", tokens.refreshToken);
    successUrl.searchParams.set("tiktok_open_id", tokens.openId);

    return NextResponse.redirect(successUrl);
  } catch (err) {
    console.error("[TikTok OAuth] Callback exception:", err);
    return NextResponse.redirect(
      new URL(`${returnUrl}?tiktok_error=callback_exception`, request.url),
    );
  }
}
