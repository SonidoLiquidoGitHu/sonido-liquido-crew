import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const upcoming = searchParams.get("upcoming") === "true";

    const where = upcoming ? { isUpcoming: true } : {};

    const releases = await db.release.findMany({
      where,
      include: {
        artist: { select: { id: true, name: true, slug: true, image: true } },
      },
      orderBy: { releaseDate: "desc" },
    });

    return NextResponse.json(releases);
  } catch (error) {
    console.error("Failed to fetch releases:", error);
    return NextResponse.json([], { status: 500 });
  }
}
