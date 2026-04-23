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

    const events = await db.event.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        artists: {
          include: { artist: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Error al obtener eventos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = await db.event.create({
      data: {
        title: body.title,
        slug: body.slug || null,
        description: body.description || null,
        date: new Date(body.date),
        endDate: body.endDate ? new Date(body.endDate) : null,
        venue: body.venue || null,
        city: body.city || null,
        country: body.country || null,
        imageUrl: body.imageUrl || null,
        ticketUrl: body.ticketUrl || null,
        isFeatured: body.isFeatured || false,
        artists: body.artistIds?.length
          ? {
              create: body.artistIds.map((artistId: string) => ({
                artistId,
              })),
            }
          : undefined,
      },
    });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Error al crear evento" },
      { status: 500 }
    );
  }
}
