import { releasesService } from "@/lib/services";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const release = await releasesService.getBySlug(slug);

    if (!release) {
      return NextResponse.json(
        { success: false, error: "Release not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: release,
    });
  } catch (error) {
    console.error("Error fetching release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch release" },
      { status: 500 },
    );
  }
}
