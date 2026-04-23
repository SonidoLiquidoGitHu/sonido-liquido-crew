import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const isFeatured = searchParams.get("isFeatured");

    const where: Record<string, unknown> = {};
    if (search) {
      where.title = { contains: search };
    }
    if (isFeatured === "true") {
      where.isFeatured = true;
    }

    const videos = await db.video.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { artist: { select: { id: true, name: true } } },
    });

    return NextResponse.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Error al obtener videos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const video = await db.video.create({
      data: {
        title: body.title,
        youtubeId: body.youtubeId || null,
        artistId: body.artistId || null,
        thumbnail: body.thumbnail || null,
        description: body.description || null,
        duration: body.duration || null,
        viewCount: body.viewCount || 0,
        isFeatured: body.isFeatured || false,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
      },
    });
    return NextResponse.json(video, { status: 201 });
  } catch (error) {
    console.error("Error creating video:", error);
    return NextResponse.json(
      { error: "Error al crear video" },
      { status: 500 }
    );
  }
}
