import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const artist = await db.artist.findUnique({
      where: { id },
      include: {
        _count: { select: { releases: true, beats: true, videos: true } },
      },
    });
    if (!artist) {
      return NextResponse.json(
        { error: "Artista no encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(artist);
  } catch (error) {
    console.error("Error fetching artist:", error);
    return NextResponse.json(
      { error: "Error al obtener artista" },
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
    const artist = await db.artist.update({
      where: { id },
      data: {
        name: body.name,
        spotifyId: body.spotifyId || null,
        slug: body.slug || null,
        image: body.image || null,
        bio: body.bio || null,
        followers: body.followers,
        popularity: body.popularity,
        releaseCount: body.releaseCount,
        spotifyUrl: body.spotifyUrl || null,
        instagram: body.instagram || null,
        youtubeChannelId: body.youtubeChannelId || null,
        youtubeHandle: body.youtubeHandle || null,
        isFeatured: body.isFeatured,
        order: body.order,
      },
    });
    return NextResponse.json(artist);
  } catch (error) {
    console.error("Error updating artist:", error);
    return NextResponse.json(
      { error: "Error al actualizar artista" },
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
    await db.artist.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting artist:", error);
    return NextResponse.json(
      { error: "Error al eliminar artista" },
      { status: 500 }
    );
  }
}
