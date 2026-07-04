import { db, isDatabaseConfigured } from "@/db/client";
import { releases } from "@/db/schema";
import { releasesService } from "@/lib/services";
import { releaseFilterSchema } from "@/lib/validations";
import { desc, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get("search");
    const limit = Number.parseInt(searchParams.get("limit") || "20");

    // If search query is provided, do a search
    if (searchQuery?.trim()) {
      if (!isDatabaseConfigured()) {
        return NextResponse.json({
          success: true,
          data: [],
        });
      }

      const searchTerm = `%${searchQuery.trim().toLowerCase()}%`;

      // Search releases by title
      const results = await db
        .select({
          id: releases.id,
          title: releases.title,
          slug: releases.slug,
          releaseType: releases.releaseType,
          coverImageUrl: releases.coverImageUrl,
          spotifyUrl: releases.spotifyUrl,
          releaseDate: releases.releaseDate,
        })
        .from(releases)
        .where(sql`LOWER(${releases.title}) LIKE ${searchTerm}`)
        .orderBy(desc(releases.releaseDate))
        .limit(limit);

      return NextResponse.json({
        success: true,
        data: results,
      });
    }

    // Regular filter-based query
    const params = releaseFilterSchema.safeParse({
      type: searchParams.get("type") || undefined,
      artistId: searchParams.get("artistId") || undefined,
      year: searchParams.get("year")
        ? Number.parseInt(searchParams.get("year")!)
        : undefined,
      isUpcoming: searchParams.get("isUpcoming") === "true" ? true : undefined,
      isFeatured: searchParams.get("isFeatured") === "true" ? true : undefined,
      page: searchParams.get("page") || 1,
      pageSize: searchParams.get("pageSize") || 20,
    });

    const options = params.success
      ? {
          type: params.data.type,
          artistId: params.data.artistId,
          year: params.data.year,
          isUpcoming: params.data.isUpcoming,
          isFeatured: params.data.isFeatured,
          limit: params.data.pageSize,
          offset: (params.data.page - 1) * params.data.pageSize,
        }
      : {};

    const releasesData = await releasesService.getAll(options);
    const total = await releasesService.getCount();

    return NextResponse.json({
      success: true,
      data: {
        items: releasesData,
        total,
        page: params.success ? params.data.page : 1,
        pageSize: params.success ? params.data.pageSize : 20,
      },
    });
  } catch (error) {
    console.error("Error fetching releases:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch releases" },
      { status: 500 },
    );
  }
}
