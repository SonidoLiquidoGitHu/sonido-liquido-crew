import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { mediaReleases } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";

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

    // Check for access code or preview mode
    const accessCode = request.nextUrl.searchParams.get("code");
    const isPreview = request.nextUrl.searchParams.get("preview") === "true";

    const [release] = await db
      .select()
      .from(mediaReleases)
      .where(eq(mediaReleases.slug, slug))
      .limit(1);

    if (!release) {
      return NextResponse.json(
        { success: false, error: "Media release not found" },
        { status: 404 }
      );
    }

    // Check if access code is required (not in preview mode)
    if (release.accessCode && release.accessCode !== accessCode && !isPreview) {
      return NextResponse.json(
        { success: false, error: "Access code required" },
        { status: 403 }
      );
    }

    // Check if published (allow preview mode to bypass)
    if (!release.isPublished && !accessCode && !isPreview) {
      return NextResponse.json(
        { success: false, error: "Media release not published" },
        { status: 403 }
      );
    }

    // Increment view count
    await db
      .update(mediaReleases)
      .set({
        viewCount: sql`${mediaReleases.viewCount} + 1`,
      })
      .where(eq(mediaReleases.id, release.id));

    console.log(`[API] Media release viewed: ${release.title}`);

    return NextResponse.json({
      success: true,
      data: release,
    });
  } catch (error) {
    console.error("[API] Error fetching media release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch media release" },
      { status: 500 }
    );
  }
}
