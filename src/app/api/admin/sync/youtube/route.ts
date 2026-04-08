import { NextRequest, NextResponse } from "next/server";
import { syncYouTube } from "@/lib/sync";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const result = await syncYouTube({
      channelIds: body.channelIds,
      maxVideosPerChannel: body.maxVideosPerChannel || 20,
      force: body.force === true,
    });

    return NextResponse.json({
      success: result.success,
      data: {
        videosProcessed: result.videosProcessed,
        videosFailed: result.videosFailed,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error("Error running YouTube sync:", error);
    return NextResponse.json(
      { success: false, error: "Failed to run YouTube sync" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { getSyncHealth } = await import("@/lib/sync");
    const health = await getSyncHealth();

    return NextResponse.json({
      success: true,
      data: health.youtube,
    });
  } catch (error) {
    console.error("Error fetching YouTube sync status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sync status" },
      { status: 500 }
    );
  }
}
