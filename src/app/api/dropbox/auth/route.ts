import { NextRequest, NextResponse } from "next/server";

// Dropbox OAuth credentials - trim to remove any accidental whitespace
const DROPBOX_APP_KEY = (process.env.DROPBOX_APP_KEY || "").trim();
const DROPBOX_APP_SECRET = (process.env.DROPBOX_APP_SECRET || "").trim();

/**
 * GET - Start OAuth flow by redirecting to Dropbox
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const adminSyncUrl = `${origin}/admin/sync`;

  // Check if OAuth credentials are configured
  if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
    console.error("[Dropbox OAuth] Missing credentials");
    console.error("[Dropbox OAuth] DROPBOX_APP_KEY:", DROPBOX_APP_KEY ? "set" : "missing");
    console.error("[Dropbox OAuth] DROPBOX_APP_SECRET:", DROPBOX_APP_SECRET ? "set" : "missing");

    // Redirect to sync page with error instead of returning JSON
    return NextResponse.redirect(
      `${adminSyncUrl}?dropbox_error=${encodeURIComponent("Credenciales de Dropbox no configuradas. Contacta al administrador para configurar DROPBOX_APP_KEY y DROPBOX_APP_SECRET en Netlify.")}`
    );
  }

  // Use exact URI from Dropbox app settings - must match exactly
  // This URI must be registered in the Dropbox App Console
  const redirectUri = "https://sonidoliquido.com/api/dropbox/callback";

  console.log("[Dropbox OAuth] Starting OAuth flow");
  console.log("[Dropbox OAuth] Redirect URI:", redirectUri);
  console.log("[Dropbox OAuth] App Key:", DROPBOX_APP_KEY ? DROPBOX_APP_KEY.substring(0, 4) + "..." : "NOT SET");

  // Generate state for CSRF protection
  const state = Math.random().toString(36).substring(2, 15);

  // Build Dropbox OAuth URL
  const params = new URLSearchParams({
    client_id: DROPBOX_APP_KEY,
    response_type: "code",
    redirect_uri: redirectUri,
    state: state,
    token_access_type: "offline", // Request refresh token for long-lived access
  });

  const authUrl = `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;

  // Store state in a cookie for verification
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("dropbox_oauth_state", state, {
    httpOnly: true,
    secure: true, // Always use secure in production (Netlify)
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
