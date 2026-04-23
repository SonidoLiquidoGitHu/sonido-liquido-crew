import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const video = await db.video.findUnique({
      where: { id },
      include: { artist: { select: { id: true, name: true } } },
    });
    if (!video) {
      return NextResponse.json(
        { error: "Video no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(video);
  } catch (error) {
    console.error("Error fetching video:", error);
    return NextResponse.json(
      { error: "Error al obtener video" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const video = await db.video.update({
      where: { id },
      data: {
        title: body.title,
        youtubeId: body.youtubeId || null,
        artistId: body.artistId || null,
        thumbnail: body.thumbnail || null,
        description: body.description || null,
        duration: body.duration || null,
        viewCount: body.viewCount,
        isFeatured: body.isFeatured,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
      },
    });
    return NextResponse.json(video);
  } catch (error) {
    console.error("Error updating video:", error);
    return NextResponse.json(
      { error: "Error al actualizar video" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.video.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting video:", error);
    return NextResponse.json(
      { error: "Error al eliminar video" },
      { status: 500 }
    );
  }
}
