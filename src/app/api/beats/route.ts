import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const beats = await db.beat.findMany({
      include: {
        artist: { select: { id: true, name: true, slug: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(beats);
  } catch (error) {
    console.error("Failed to fetch beats:", error);
    return NextResponse.json([], { status: 500 });
  }
}
