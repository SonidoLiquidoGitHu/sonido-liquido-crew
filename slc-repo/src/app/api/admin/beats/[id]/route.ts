import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { beats } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { id } = await params;

    const [beat] = await db
      .select()
      .from(beats)
      .where(eq(beats.id, id))
      .limit(1);

    if (!beat) {
      return NextResponse.json(
        { success: false, error: "Beat not found" },
        { status: 404 }
      );
    }

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
