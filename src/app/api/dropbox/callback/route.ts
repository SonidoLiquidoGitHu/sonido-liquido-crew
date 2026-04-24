/**
 * Dropbox OAuth — Step 2: Handle callback, exchange code for token
 */
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/admin?dropbox=error&msg=${error}`, req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/admin?dropbox=error&msg=no_code", req.url));
  }

  const clientId = process.env.DROPBOX_APP_KEY;
  const clientSecret = process.env.DROPBOX_APP_SECRET;
  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/dropbox/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/admin?dropbox=error&msg=missing_credentials", req.url));
  }

  try {
    const tokenRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("Dropbox token exchange failed:", errBody);
      return NextResponse.redirect(new URL("/admin?dropbox=error&msg=token_exchange_failed", req.url));
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokenData as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

    // Save token to DB
    await db.dropboxToken.deleteMany({});
    await db.dropboxToken.create({
      data: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
      },
    });

    return NextResponse.redirect(new URL("/admin?dropbox=success", req.url));
  } catch (err) {
    console.error("Dropbox callback error:", err);
    return NextResponse.redirect(new URL("/admin?dropbox=error&msg=exception", req.url));
  }
}
