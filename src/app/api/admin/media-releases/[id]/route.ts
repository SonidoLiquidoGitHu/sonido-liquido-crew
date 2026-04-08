import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { mediaReleases } from "@/db/schema";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const [mediaRelease] = await db
      .select()
      .from(mediaReleases)
      .where(eq(mediaReleases.id, id))
      .limit(1);

    if (!mediaRelease) {
      return NextResponse.json(
        { success: false, error: "Media release not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mediaRelease,
    });
  } catch (error) {
    console.error("[API] Error fetching media release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch media release" },
      { status: 500 }
    );
  }
}
