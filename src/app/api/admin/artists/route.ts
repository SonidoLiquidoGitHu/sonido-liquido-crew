import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const isFeatured = searchParams.get("isFeatured");

    const where: Record<string, unknown> = {};
    if (search) {
      where.name = { contains: search };
    }
    if (isFeatured === "true") {
      where.isFeatured = true;
    }

    const artists = await db.artist.findMany({
      where,
      orderBy: { order: "asc" },
      include: {
        _count: { select: { releases: true, beats: true } },
      },
    });

    return NextResponse.json(artists);
  } catch (error) {
    console.error("Error fetching artists:", error);
    return NextResponse.json(
      { error: "Error al obtener artistas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const artist = await db.artist.create({
      data: {
        name: body.name,
        spotifyId: body.spotifyId || null,
        slug: body.slug || null,
        image: body.image || null,
        bio: body.bio || null,
        followers: body.followers || 0,
        popularity: body.popularity || 0,
        releaseCount: body.releaseCount || 0,
        spotifyUrl: body.spotifyUrl || null,
        instagram: body.instagram || null,
        youtubeChannelId: body.youtubeChannelId || null,
        youtubeHandle: body.youtubeHandle || null,
        isFeatured: body.isFeatured || false,
        order: body.order || 0,
      },
    });
    return NextResponse.json(artist, { status: 201 });
  } catch (error) {
    console.error("Error creating artist:", error);
    return NextResponse.json(
      { error: "Error al crear artista" },
      { status: 500 }
    );
  }
}
