import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { mediaReleases } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      console.warn("[API] Database not configured - returning empty media releases");
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const featured = searchParams.get("featured") === "true";
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    let conditions = [eq(mediaReleases.isPublished, true)];

    if (featured) {
      conditions.push(eq(mediaReleases.isFeatured, true));
    }

    if (category) {
      conditions.push(eq(mediaReleases.category, category as any));
    }

    const releases = await db
      .select()
      .from(mediaReleases)
      .where(and(...conditions))
      .orderBy(desc(mediaReleases.publishDate))
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: releases,
    });
  } catch (error) {
    console.error("[API] Error fetching media releases:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch media releases" },
      { status: 500 }
    );
  }
}
