import { NextResponse } from "next/server";
import { dashboardService } from "@/lib/services";
import { getSyncHealth } from "@/lib/sync";

export async function GET() {
  try {
    const [summary, syncHealth] = await Promise.all([
      dashboardService.getSummary(),
      getSyncHealth(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...summary,
        syncHealth,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard summary" },
      { status: 500 }
    );
  }
}
