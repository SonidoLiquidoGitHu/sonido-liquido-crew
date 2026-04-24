import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const artists = await db.artist.findMany({
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { releases: true } },
      },
    });

    const result = artists.map((a) => ({
      id: a.slug ?? a.id,
      name: a.name,
      image: a.image ?? "",
      followers: a.followers,
      spotifyUrl: a.spotifyUrl ?? "",
      popularity: a.popularity,
      releases: a.releaseCount || a._count.releases,
      genres: a.genres ? a.genres.split(",").map((g) => g.trim()) : [],
      instagram: a.instagram,
      youtubeChannelId: a.youtubeChannelId,
      youtubeHandle: a.youtubeHandle,
    }));

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
