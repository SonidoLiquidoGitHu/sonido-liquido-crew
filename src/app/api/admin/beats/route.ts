import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const isFree = searchParams.get("isFree");

    const where: Record<string, unknown> = {};
    if (search) {
      where.title = { contains: search };
    }
    if (isFree === "true") {
      where.isFree = true;
    }

    const beats = await db.beat.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { artist: { select: { id: true, name: true } } },
    });

    return NextResponse.json(beats);
  } catch (error) {
    console.error("Error fetching beats:", error);
    return NextResponse.json(
      { error: "Error al obtener beats" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const beat = await db.beat.create({
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
        isFree: body.isFree || false,
        tags: body.tags || null,
        description: body.description || null,
      },
    });
    return NextResponse.json(beat, { status: 201 });
  } catch (error) {
    console.error("Error creating beat:", error);
    return NextResponse.json(
      { error: "Error al crear beat" },
      { status: 500 }
    );
  }
}
