// ===========================================
// SAMPLING RESOURCES TRACKING ENDPOINT
// ===========================================
// Increments view/click/access counters for a sampling resource.
//
// POST /api/sampling-resources/track
// Body: { resourceId: string, action: "view" | "click" | "access" }
//
// Returns: { success: true }
// Errors: 400 (missing params), 404 (resource not found), 500 (DB error)

import { db, isDatabaseConfigured } from "@/db/client";
import { samplingResources } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true }); // Silent fail — don't break UX
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
        { success: false, error: "Invalid action. Must be 'view', 'click', or 'access'" },
        { status: 400 },
      );
    }

    // Increment the appropriate counter using a single UPDATE with conditional SET
    // This avoids 3 separate code paths and is atomic.
    const columnToIncrement =
      action === "view"
        ? samplingResources.viewCount
        : action === "click"
          ? samplingResources.clickCount
          : samplingResources.accessCount;

    await db
      .update(samplingResources)
      .set({
        [columnToIncrement.name]: sql`${columnToIncrement} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(samplingResources.id, resourceId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[sampling-resources track] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track" },
      { status: 500 },
    );
  }
}
