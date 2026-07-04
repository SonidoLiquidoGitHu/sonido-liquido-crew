import { db, isDatabaseConfigured } from "@/db/client";
import { artists, mediaReleases } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      console.warn(
        "[API] Database not configured - returning empty media releases",
      );
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const featured = searchParams.get("featured") === "true";
    const category = searchParams.get("category");
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10);

    const conditions = [eq(mediaReleases.isPublished, true)];

    if (featured) {
      conditions.push(eq(mediaReleases.isFeatured, true));
    }

    if (category) {
      // biome-ignore lint/suspicious/noExplicitAny: dynamic type
      conditions.push(eq(mediaReleases.category, category as any));
    }

    const releases = await db
      .select()
      .from(mediaReleases)
      .where(and(...conditions))
      .orderBy(desc(mediaReleases.publishDate))
      .limit(limit);

    // Resolve mainArtistId → artist name for each release
    const artistIds = releases
      .map((r) => r.mainArtistId)
      .filter((id): id is string => !!id);

    const artistNames: Record<string, string> = {};
    if (artistIds.length > 0) {
      const uniqueIds = [...new Set(artistIds)];
      // Fetch each artist individually (SQLite doesn't support IN easily with drizzle)
      for (const id of uniqueIds) {
        const [row] = await db
          .select({ id: artists.id, name: artists.name })
          .from(artists)
          .where(eq(artists.id, id))
          .limit(1);
        if (row) {
          artistNames[row.id] = row.name;
        }
      }
    }

    const releasesWithArtist = releases.map((r) => ({
      ...r,
      resolvedArtistName: r.mainArtistId
        ? artistNames[r.mainArtistId] || null
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: releasesWithArtist,
    });
  } catch (error) {
    console.error("[API] Error fetching media releases:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch media releases" },
      { status: 500 },
    );
  }
}
