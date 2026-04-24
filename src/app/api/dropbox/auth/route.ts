/**
 * Dropbox OAuth — Step 1: Redirect to Dropbox authorization page
 */
import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.DROPBOX_APP_KEY;
  if (!clientId) {
    return NextResponse.json({ error: "DROPBOX_APP_KEY not configured" }, { status: 500 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/dropbox/callback`;
  const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&token_access_type=offline`;

  return NextResponse.redirect(authUrl);
}
