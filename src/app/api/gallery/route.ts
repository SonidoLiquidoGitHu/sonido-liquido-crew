import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const gallery = await db.galleryItem.findMany({
      include: {
        artist: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(gallery);
  } catch (error) {
    console.error("Failed to fetch gallery:", error);
    return NextResponse.json([], { status: 500 });
  }
}
