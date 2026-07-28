// ===========================================
// SAMPLING RESOURCES TRACKING ENDPOINT
// ===========================================
// Inserts a row into sampling_resource_analytics for each view/click/access.
// Uses a separate table — does NOT modify sampling_resources, so existing
// queries are unaffected even if the analytics table doesn't exist yet.
//
// POST /api/sampling-resources/track
// Body: { resourceId: string, action: "view" | "click" | "access" }

import { db, isDatabaseConfigured } from "@/db/client";
import { samplingResourceAnalytics } from "@/db/schema";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true }); // Silent fail
    }

    const body = await request.json();
    const { resourceId, action } = body;

    if (!resourceId || !action) {
      return NextResponse.json(
        { success: false, error: "resourceId and action are required" },
        { status: 400 },
      );
    }

    if (!["view", "click", "access"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 },
      );
    }

    // Insert event row — if the table doesn't exist yet, this fails silently
    try {
      await db.insert(samplingResourceAnalytics).values({
        id: crypto.randomUUID(),
        resourceId,
        action,
      });
    } catch {
      // Table might not exist on Render (no auto-migration) — silent fail
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true }); // Never break UX
  }
}
