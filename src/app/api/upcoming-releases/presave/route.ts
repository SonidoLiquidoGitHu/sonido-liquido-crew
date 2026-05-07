import { NextRequest, NextResponse } from "next/server";
import { upcomingReleasesService } from "@/lib/services";

// POST - Track presave click
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { releaseId } = body;

    if (!releaseId) {
      return NextResponse.json(
        { success: false, error: "Release ID required" },
        { status: 400 }
      );
    }

    await upcomingReleasesService.incrementPresaveCount(releaseId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Presave API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error tracking presave" },
      { status: 500 }
    );
  }
}
