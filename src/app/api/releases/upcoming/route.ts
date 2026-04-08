import { NextRequest, NextResponse } from "next/server";
import { releasesService } from "@/lib/services";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "5");

    const releases = await releasesService.getUpcoming(limit);
    const nextRelease = releases[0] || null;

    return NextResponse.json({
      success: true,
      data: {
        releases,
        nextRelease,
        countdown: nextRelease ? {
          releaseDate: nextRelease.releaseDate,
          title: nextRelease.title,
        } : null,
      },
    });
  } catch (error) {
    console.error("Error fetching upcoming releases:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch upcoming releases" },
      { status: 500 }
    );
  }
}
