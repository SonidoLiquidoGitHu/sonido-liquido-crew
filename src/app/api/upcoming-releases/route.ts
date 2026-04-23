import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const releases = await db.release.findMany({
      where: { isUpcoming: true },
      include: {
        artist: { select: { id: true, name: true, slug: true, image: true } },
        upcomingSubscribers: true,
      },
      orderBy: { releaseDate: "asc" },
    });

    return NextResponse.json(releases);
  } catch (error) {
    console.error("Failed to fetch upcoming releases:", error);
    return NextResponse.json([], { status: 500 });
  }
}
