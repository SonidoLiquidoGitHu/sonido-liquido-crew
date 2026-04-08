// ===========================================
// DROPBOX TOKEN API - Returns access token for browser uploads
// ===========================================

import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET - Get Dropbox token for direct browser upload
export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    // Get token from database
    const results = await db
      .select()
      .from(siteSettings)
      .where(
        inArray(siteSettings.key, [
          "dropbox_access_token",
          "dropbox_token_expiry"
        ])
      );

    let accessToken: string | null = null;
    let expiryTime: number | null = null;

    for (const row of results) {
      if (row.key === "dropbox_access_token") {
        accessToken = row.value;
      } else if (row.key === "dropbox_token_expiry") {
        expiryTime = row.value ? parseInt(row.value, 10) : null;
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Dropbox not connected" },
        { status: 401 }
      );
    }

    // Check if token is expired (with 5 minute buffer)
    if (expiryTime && Date.now() > expiryTime - 5 * 60 * 1000) {
      // Token might be expired, but we'll let the client try
      // The upload will fail if it's actually expired
      console.warn("[Dropbox Token] Token may be expired, client should handle refresh");
    }

    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        expiresAt: expiryTime,
      },
    });
  } catch (error) {
    console.error("[Dropbox Token] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get token" },
      { status: 500 }
    );
  }
}
