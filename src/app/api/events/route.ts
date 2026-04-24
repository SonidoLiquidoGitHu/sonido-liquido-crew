import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const events = await db.event.findMany({
      where: {
        date: { gte: new Date() },
      },
      include: {
        artists: {
          include: {
            artist: { select: { id: true, name: true, slug: true, image: true } },
          },
        },
      },
      orderBy: { date: "asc" },
      take: 20,
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return NextResponse.json([], { status: 500 });
  }
}
