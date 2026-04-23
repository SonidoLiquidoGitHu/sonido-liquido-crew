import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const release = await db.release.findUnique({
      where: { slug },
      include: {
        artist: { select: { id: true, name: true, slug: true, image: true } },
        upcomingSubscribers: true,
      },
    });

    if (!release) {
      return NextResponse.json({ error: "Lanzamiento no encontrado" }, { status: 404 });
    }

    return NextResponse.json(release);
  } catch (error) {
    console.error("Failed to fetch release:", error);
    return NextResponse.json({ error: "Error al obtener lanzamiento" }, { status: 500 });
  }
}
