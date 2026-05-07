import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { beats } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const [beat] = await db
      .select()
      .from(beats)
      .where(eq(beats.slug, slug))
      .limit(1);

    if (!beat) {
      return NextResponse.json(
        { success: false, error: "Beat not found" },
        { status: 404 }
      );
    }

    // Increment view count
    await db
      .update(beats)
      .set({
        viewCount: sql`${beats.viewCount} + 1`,
      })
      .where(eq(beats.id, beat.id));

    console.log(`[API] Beat viewed: ${beat.title}`);

    return NextResponse.json({
      success: true,
      data: beat,
    });
  } catch (error) {
    console.error("[API] Error fetching beat:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch beat" },
      { status: 500 }
    );
  }
}
