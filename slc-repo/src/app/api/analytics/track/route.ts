import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { analytics } from "@/db/schema";
import { generateUUID } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, page, event, entityType, entityId, metadata } = body;

    // Get user info from headers
    const userAgent = request.headers.get("user-agent") || "unknown";
    const referer = request.headers.get("referer") || null;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

    // Simple session ID from a combination of IP and user agent
    const sessionId = Buffer.from(`${ip}-${userAgent.slice(0, 50)}`).toString("base64").slice(0, 32);

    const eventType = type === "pageview" ? "page_view" : (event || type);

    console.log(`[Analytics] ${eventType}: ${page || entityId || ""}`, {
      sessionId: sessionId.slice(0, 8),
      referer: referer?.slice(0, 50),
    });

    // If database is configured, store the event
    if (isDatabaseConfigured()) {
      try {
        await db.insert(analytics).values({
          id: generateUUID(),
          eventType,
          entityType: entityType || (type === "pageview" ? "page" : null),
          entityId: entityId || page || null,
          metadata: metadata || null,
          sessionId,
          ipAddress: ip,
          userAgent: userAgent.slice(0, 500),
          referrer: referer,
        });
      } catch (dbError) {
        // Tables might not exist, log but don't fail
        console.log("[Analytics] DB not ready, skipping storage");
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Analytics] Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// GET - Fetch analytics summary (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");
    const days = parseInt(searchParams.get("days") || "30", 10);

    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: {
          totalViews: 0,
          uniqueSessions: 0,
          topPages: [],
          recentEvents: [],
        },
      });
    }

    // For now, return empty stats - implement full analytics later
    return NextResponse.json({
      success: true,
      data: {
        totalViews: 0,
        uniqueSessions: 0,
        topPages: [],
        recentEvents: [],
        message: "Analytics tables pending migration",
      },
    });
  } catch (error) {
    console.error("[Analytics] Error fetching:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
