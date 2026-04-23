/**
 * Dropbox Upload API — Upload file to Dropbox using stored token
 * POST: { path, data (base64) } → uploads to Dropbox
 */
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const token = await db.dropboxToken.findFirst({ orderBy: { createdAt: "desc" } });
    if (!token) {
      return NextResponse.json({ error: "Dropbox not connected" }, { status: 401 });
    }

    // Check if token expired and try refresh
    if (token.expiresAt && new Date() > token.expiresAt && token.refreshToken) {
      const clientId = process.env.DROPBOX_APP_KEY;
      const clientSecret = process.env.DROPBOX_APP_SECRET;
      if (clientId && clientSecret) {
        const refreshRes = await fetch("https://api.dropboxapi.com/oauth2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: token.refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        });
        if (refreshRes.ok) {
          const refreshed = await refreshRes.json();
          await db.dropboxToken.update({
            where: { id: token.id },
            data: {
              accessToken: refreshed.access_token,
              expiresAt: refreshed.expires_in
                ? new Date(Date.now() + refreshed.expires_in * 1000)
                : null,
            },
          });
          token.accessToken = refreshed.access_token;
        }
      }
    }

    const body = await req.json();
    const { path: dropboxPath, data: base64Data } = body as {
      path: string;
      data: string;
    };

    if (!dropboxPath || !base64Data) {
      return NextResponse.json({ error: "path and data are required" }, { status: 400 });
    }

    const fileBuffer = Buffer.from(base64Data, "base64");

    const uploadRes = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path: dropboxPath,
          mode: "add",
          autorename: true,
          mute: false,
        }),
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("Dropbox upload failed:", errText);
      return NextResponse.json({ error: "Upload failed", details: errText }, { status: uploadRes.status });
    }

    const result = await uploadRes.json();
    return NextResponse.json({ success: true, path: result.path_display, id: result.id });
  } catch (error) {
    console.error("Dropbox upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
