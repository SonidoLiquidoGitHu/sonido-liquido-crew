/**
 * Dropbox Token Management API
 * GET  — Retrieve stored Dropbox token
 * POST — Save/refresh Dropbox token
 */
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const token = await db.dropboxToken.findFirst({ orderBy: { createdAt: "desc" } });
    if (!token) {
      return NextResponse.json({ connected: false });
    }
    const isExpired = token.expiresAt ? new Date() > token.expiresAt : false;
    return NextResponse.json({
      connected: !isExpired,
      expiresAt: token.expiresAt,
    });
  } catch (error) {
    console.error("Failed to fetch Dropbox token:", error);
    return NextResponse.json({ connected: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken, refreshToken, expiresIn } = body as {
      accessToken: string;
      refreshToken?: string;
      expiresIn?: number;
    };

    if (!accessToken) {
      return NextResponse.json({ error: "accessToken is required" }, { status: 400 });
    }

    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

    // Delete old tokens and create new one
    await db.dropboxToken.deleteMany({});
    const token = await db.dropboxToken.create({
      data: { accessToken, refreshToken, expiresAt },
    });

    return NextResponse.json({ success: true, expiresAt: token.expiresAt });
  } catch (error) {
    console.error("Failed to save Dropbox token:", error);
    return NextResponse.json({ error: "Failed to save token" }, { status: 500 });
  }
}
