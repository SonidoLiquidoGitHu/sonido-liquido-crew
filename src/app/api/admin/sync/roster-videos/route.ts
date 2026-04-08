import { NextRequest, NextResponse } from "next/server";
import { syncRosterVideos, getRosterVideosSyncStatus } from "@/lib/sync";

/**
 * POST - Sync 4 random videos from roster members' YouTube channels
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const result = await syncRosterVideos({
      videosPerMonth: body.videosPerMonth || 4,
      maxVideosPerChannel: body.maxVideosPerChannel || 10,
      force: body.force === true,
    });

    return NextResponse.json({
      success: result.success,
      data: {
        videosSynced: result.videosSynced,
        videosSkipped: result.videosSkipped,
        newVideosAvailable: result.newVideosAvailable,
        channelsProcessed: result.channelsProcessed,
        channelsFailed: result.channelsFailed,
        alreadySyncedThisMonth: result.alreadySyncedThisMonth,
        lastSyncDate: result.lastSyncDate,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error("Error running roster videos sync:", error);
    return NextResponse.json(
      { success: false, error: "Failed to run roster videos sync" },
      { status: 500 }
    );
  }
}

/**
 * GET - Get roster videos sync status
 */
export async function GET() {
  try {
    const status = await getRosterVideosSyncStatus();

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Error fetching roster videos sync status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch sync status" },
      { status: 500 }
    );
  }
}
