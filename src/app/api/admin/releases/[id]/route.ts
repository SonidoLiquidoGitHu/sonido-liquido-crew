import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const release = await db.release.findUnique({
      where: { id },
      include: { artist: { select: { id: true, name: true } } },
    });
    if (!release) {
      return NextResponse.json(
        { error: "Lanzamiento no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(release);
  } catch (error) {
    console.error("Error fetching release:", error);
    return NextResponse.json(
      { error: "Error al obtener lanzamiento" },
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
    const release = await db.release.update({
      where: { id },
      data: {
        title: body.title,
        slug: body.slug || null,
        type: body.type,
        artistId: body.artistId,
        coverUrl: body.coverUrl || null,
        releaseDate: body.releaseDate ? new Date(body.releaseDate) : null,
        spotifyUrl: body.spotifyUrl || null,
        description: body.description || null,
        isUpcoming: body.isUpcoming,
        presaveUrl: body.presaveUrl || null,
      },
    });
    return NextResponse.json(release);
  } catch (error) {
    console.error("Error updating release:", error);
    return NextResponse.json(
      { error: "Error al actualizar lanzamiento" },
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
    await db.release.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting release:", error);
    return NextResponse.json(
      { error: "Error al eliminar lanzamiento" },
      { status: 500 }
    );
  }
}
