import { db, isDatabaseConfigured } from "@/db/client";
import { beats } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      console.warn("[API] Database not configured - returning empty beats");
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const onlyActive = searchParams.get("active") !== "false";
    const featured = searchParams.get("featured") === "true";

    const allBeats = onlyActive
      ? await db
          .select()
          .from(beats)
          .where(eq(beats.isActive, true))
          .orderBy(desc(beats.createdAt))
      : await db.select().from(beats).orderBy(desc(beats.createdAt));

    // Filter featured if needed
    const filteredBeats = featured
      ? allBeats.filter((beat) => beat.isFeatured)
      : allBeats;

    return NextResponse.json({
      success: true,
      data: filteredBeats,
    });
  } catch (error) {
    console.error("[API] Error fetching beats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch beats" },
      { status: 500 },
    );
  }
}
