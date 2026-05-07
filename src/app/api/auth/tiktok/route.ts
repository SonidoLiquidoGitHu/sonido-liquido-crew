// ===========================================
// TIKTOK OAUTH: INITIATE AUTHORIZATION
// ===========================================
// Redirects the user to TikTok's OAuth consent screen.
// After the user authorizes, TikTok redirects back to /api/auth/tiktok/callback

import { NextRequest, NextResponse } from "next/server";

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || "";
const REDIRECT_URI =
  process.env.TIKTOK_REDIRECT_URI ||
  "https://sonidoliquido.com/api/auth/tiktok/callback";

// Scopes needed for Content Posting API
const SCOPES = [
  "user.info.basic",
  "user.info.profile",
  "user.info.stats",
  "video.list",
  "video.publish",
].join(",");

export async function GET(request: NextRequest) {
  if (!TIKTOK_CLIENT_KEY) {
    return NextResponse.json(
      { error: "TikTok Client Key not configured. Set TIKTOK_CLIENT_KEY env var." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const returnUrl = searchParams.get("returnUrl") || "/admin/social";

  // Generate state for CSRF protection
  const state = Buffer.from(
    JSON.stringify({
      returnUrl,
      timestamp: Date.now(),
      nonce: crypto.randomUUID(),
    })
  ).toString("base64");

  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    scope: SCOPES,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    state,
  });

  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

  console.log("[TikTok OAuth] Redirecting to auth URL");
  return NextResponse.redirect(authUrl);
}
