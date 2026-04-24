import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const beat = await db.beat.findUnique({
      where: { slug },
      include: {
        artist: { select: { id: true, name: true, slug: true, image: true } },
      },
    });

    if (!beat) {
      return NextResponse.json({ error: "Beat no encontrado" }, { status: 404 });
    }

    return NextResponse.json(beat);
  } catch (error) {
    console.error("Failed to fetch beat:", error);
    return NextResponse.json({ error: "Error al obtener beat" }, { status: 500 });
  }
}
