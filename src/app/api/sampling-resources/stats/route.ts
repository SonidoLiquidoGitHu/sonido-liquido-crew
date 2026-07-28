// ===========================================
// SAMPLING RESOURCES STATS ENDPOINT
// ===========================================
// Returns aggregate analytics: total views, clicks, access count.
// Queries the separate sampling_resource_analytics table.
// If the table doesn't exist (Render pre-migration), returns zeros.
//
// GET /api/admin/sampling-resources/stats

import { db, isDatabaseConfigured } from "@/db/client";
import { samplingResourceAnalytics } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: { views: 0, clicks: 0, access: 0 } });
    }

    let views = 0;
    let clicks = 0;
    let access = 0;

    try {
      const [viewRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(samplingResourceAnalytics)
        .where(eq(samplingResourceAnalytics.action, "view"));
      views = viewRow?.count || 0;

      const [clickRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(samplingResourceAnalytics)
        .where(eq(samplingResourceAnalytics.action, "click"));
      clicks = clickRow?.count || 0;

      const [accessRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(samplingResourceAnalytics)
        .where(eq(samplingResourceAnalytics.action, "access"));
      access = accessRow?.count || 0;
    } catch {
      // Table doesn't exist yet — return zeros
    }

    const conversion = views > 0 ? Math.round((clicks / views) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: { views, clicks, access, conversion },
    });
  } catch {
    return NextResponse.json({ success: true, data: { views: 0, clicks: 0, access: 0, conversion: 0 } });
  }
}
