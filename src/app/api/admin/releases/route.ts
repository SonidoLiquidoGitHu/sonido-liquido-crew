import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type");
    const isUpcoming = searchParams.get("isUpcoming");

    const where: Record<string, unknown> = {};
    if (search) {
      where.title = { contains: search };
    }
    if (type) {
      where.type = type;
    }
    if (isUpcoming === "true") {
      where.isUpcoming = true;
    }

    const releases = await db.release.findMany({
      where,
      orderBy: { releaseDate: "desc" },
      include: { artist: { select: { id: true, name: true } } },
    });

    return NextResponse.json(releases);
  } catch (error) {
    console.error("Error fetching releases:", error);
    return NextResponse.json(
      { error: "Error al obtener lanzamientos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const release = await db.release.create({
      data: {
        title: body.title,
        slug: body.slug || null,
        type: body.type || "single",
        artistId: body.artistId,
        coverUrl: body.coverUrl || null,
        releaseDate: body.releaseDate ? new Date(body.releaseDate) : null,
        spotifyUrl: body.spotifyUrl || null,
        description: body.description || null,
        isUpcoming: body.isUpcoming || false,
        presaveUrl: body.presaveUrl || null,
      },
    });
    return NextResponse.json(release, { status: 201 });
  } catch (error) {
    console.error("Error creating release:", error);
    return NextResponse.json(
      { error: "Error al crear lanzamiento" },
      { status: 500 }
    );
  }
}
