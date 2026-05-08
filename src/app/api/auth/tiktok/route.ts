// ===========================================
// TIKTOK OAUTH: INITIATE AUTHORIZATION
// ===========================================
// Redirects the user to TikTok's OAuth consent screen.
// After the user authorizes, TikTok redirects back to /api/auth/tiktok/callback

import { NextRequest, NextResponse } from "next/server";
import { getTikTokAuthUrl } from "@/lib/clients/tiktok";

const REDIRECT_URI =
  process.env.TIKTOK_REDIRECT_URI ||
  "https://sonidoliquido.com/api/auth/tiktok/callback";

export async function GET(request: NextRequest) {
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

  const authUrl = await getTikTokAuthUrl(REDIRECT_URI, state);

  if (!authUrl || authUrl.includes("client_key=&")) {
    return NextResponse.json(
      { error: "TikTok Client Key not configured. Set TIKTOK_CLIENT_KEY in the admin panel or as an env var." },
      { status: 500 }
    );
  }

  console.log("[TikTok OAuth] Redirecting to auth URL");
  return NextResponse.redirect(authUrl);
}
