import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const beat = await db.beat.findUnique({
      where: { id },
      include: { artist: { select: { id: true, name: true } } },
    });
    if (!beat) {
      return NextResponse.json(
        { error: "Beat no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(beat);
  } catch (error) {
    console.error("Error fetching beat:", error);
    return NextResponse.json(
      { error: "Error al obtener beat" },
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
    const beat = await db.beat.update({
      where: { id },
      data: {
        title: body.title,
        slug: body.slug || null,
        artistId: body.artistId,
        bpm: body.bpm || null,
        key: body.key || null,
        coverUrl: body.coverUrl || null,
        audioUrl: body.audioUrl || null,
        previewUrl: body.previewUrl || null,
        price: body.price || null,
        isFree: body.isFree,
        tags: body.tags || null,
        description: body.description || null,
      },
    });
    return NextResponse.json(beat);
  } catch (error) {
    console.error("Error updating beat:", error);
    return NextResponse.json(
      { error: "Error al actualizar beat" },
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
    await db.beat.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting beat:", error);
    return NextResponse.json(
      { error: "Error al eliminar beat" },
      { status: 500 }
    );
  }
}
