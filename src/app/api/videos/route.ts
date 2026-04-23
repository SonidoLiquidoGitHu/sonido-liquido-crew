import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get("featured") === "true";

    const where = featured ? { isFeatured: true } : {};

    const videos = await db.video.findMany({
      where,
      include: {
        artist: { select: { id: true, name: true, slug: true, image: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
    });

    return NextResponse.json(videos);
  } catch (error) {
    console.error("Failed to fetch videos:", error);
    return NextResponse.json([], { status: 500 });
  }
}
