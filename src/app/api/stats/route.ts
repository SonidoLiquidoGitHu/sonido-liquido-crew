import { isDatabaseConfigured } from "@/db/client";
import {
  artistsRepository,
  releasesRepository,
  videosRepository,
} from "@/lib/repositories";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  // Calculate years of history (founded in 1999)
  const foundedYear = 1999;
  const currentYear = new Date().getFullYear();
  const yearsOfHistory = currentYear - foundedYear;

  // If database is not configured, return minimal values
  if (!isDatabaseConfigured()) {
    console.warn("[Stats API] Database not configured - returning zero values");
    return NextResponse.json({
      success: true,
      data: {
        artists: 0,
        releases: 0,
        videos: 0,
        yearsOfHistory,
        foundedYear,
      },
    });
  }

  try {
    // Fetch all counts in parallel
    const [artistsCount, releasesCount, videosCount] = await Promise.all([
      artistsRepository.count(true).catch(() => 0),
      releasesRepository.count().catch(() => 0),
      videosRepository.count().catch(() => 0),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        artists: artistsCount,
        releases: releasesCount,
        videos: videosCount,
        yearsOfHistory,
        foundedYear,
      },
    });
  } catch (error) {
    console.error("[Stats API] Error fetching stats:", error);

    // Return zero values on error — no hardcoded fallbacks
    return NextResponse.json({
      success: true,
      data: {
        artists: 0,
        releases: 0,
        videos: 0,
        yearsOfHistory,
        foundedYear,
      },
    });
  }
}
