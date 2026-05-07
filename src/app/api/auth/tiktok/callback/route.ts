// ===========================================
// TIKTOK OAUTH: CALLBACK HANDLER
// ===========================================
// Handles the OAuth callback from TikTok.
// Exchanges the authorization code for access + refresh tokens,
// then redirects to the admin Social Auto-Post page with the token info.

import { NextRequest, NextResponse } from "next/server";
import { exchangeTikTokCode } from "@/lib/clients/tiktok";

const REDIRECT_URI =
  process.env.TIKTOK_REDIRECT_URI ||
  "https://sonidoliquido.com/api/auth/tiktok/callback";

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
      const stateData = JSON.parse(
        Buffer.from(state, "base64").toString()
      );
      returnUrl = stateData.returnUrl || "/admin/social";
    }
  } catch {
    // Invalid state, use default
  }

  // Handle user denial or errors
  if (error) {
    console.error("[TikTok OAuth] Error:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`${returnUrl}?tiktok_error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  if (!code) {
    console.error("[TikTok OAuth] No authorization code received");
    return NextResponse.redirect(
      new URL(`${returnUrl}?tiktok_error=no_code`, request.url)
    );
  }

  try {
    // Exchange the authorization code for tokens
    const tokens = await exchangeTikTokCode(code, REDIRECT_URI);

    if (!tokens) {
      console.error("[TikTok OAuth] Token exchange failed");
      return NextResponse.redirect(
        new URL(`${returnUrl}?tiktok_error=token_exchange_failed`, request.url)
      );
    }

    console.log("[TikTok OAuth] Token exchange successful! Open ID:", tokens.openId);

    // Redirect back to admin page with token info in URL params
    // The admin page will display these for the user to save as env vars
    const successUrl = new URL(returnUrl, request.url);
    successUrl.searchParams.set("tiktok_success", "true");
    successUrl.searchParams.set("tiktok_access_token", tokens.accessToken);
    successUrl.searchParams.set("tiktok_refresh_token", tokens.refreshToken);
    successUrl.searchParams.set("tiktok_open_id", tokens.openId);

    return NextResponse.redirect(successUrl);
  } catch (err) {
    console.error("[TikTok OAuth] Callback exception:", err);
    return NextResponse.redirect(
      new URL(`${returnUrl}?tiktok_error=callback_exception`, request.url)
    );
  }
}
