import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { upcomingReleases } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const [release] = await db
      .select()
      .from(upcomingReleases)
      .where(eq(upcomingReleases.id, id));

    if (!release) {
      return NextResponse.json(
        { success: false, error: "Release not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: release });
  } catch (error) {
    console.error("[API] Error fetching upcoming release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch upcoming release" },
      { status: 500 }
    );
  }
}
