import { NextRequest, NextResponse } from "next/server";
import { artistsService } from "@/lib/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const artist = await artistsService.getBySlug(slug);

    if (!artist) {
      return NextResponse.json(
        { success: false, error: "Artist not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: artist,
    });
  } catch (error) {
    console.error("Error fetching artist:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch artist" },
      { status: 500 }
    );
  }
}
