import { upcomingReleasesService } from "@/lib/services";
import { type NextRequest, NextResponse } from "next/server";

// GET - Fetch upcoming releases
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artistName = searchParams.get("artistName");
    const featured = searchParams.get("featured");
    const slug = searchParams.get("slug");
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);

    // Get single release by slug
    if (slug) {
      const release = await upcomingReleasesService.getBySlug(slug);
      if (!release) {
        return NextResponse.json(
          { success: false, error: "Release not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, data: release });
    }

    // Get by artist name
    if (artistName) {
      const releases = await upcomingReleasesService.getByArtistName(
        artistName,
        limit,
      );
      return NextResponse.json({ success: true, data: releases });
    }

    // Get featured releases
    if (featured === "true") {
      const releases = await upcomingReleasesService.getFeatured(limit);
      return NextResponse.json({ success: true, data: releases });
    }

    // Get all active upcoming releases
    const releases = await upcomingReleasesService.getActive(limit);
    return NextResponse.json({ success: true, data: releases });
  } catch (error) {
    console.error("[Upcoming Releases API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error fetching releases" },
      { status: 500 },
    );
  }
}
