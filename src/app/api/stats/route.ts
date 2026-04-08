import { NextResponse } from "next/server";
import { artistsRepository, releasesRepository, videosRepository } from "@/lib/repositories";
import { isDatabaseConfigured } from "@/db/client";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache for 1 hour

// Fallback values based on real Sonido Líquido Crew data
const FALLBACK_STATS = {
  artists: 15,
  releases: 195,
  videos: 800,
  yearsOfHistory: 27,
  foundedYear: 1999,
};

export async function GET() {
  // Calculate years of history (founded in 1999)
  const foundedYear = 1999;
  const currentYear = new Date().getFullYear();
  const yearsOfHistory = currentYear - foundedYear;

  // If database is not configured, return fallback values immediately
  if (!isDatabaseConfigured()) {
    console.warn("[Stats API] Database not configured - returning fallback values");
    return NextResponse.json({
      success: true,
      data: {
        ...FALLBACK_STATS,
        yearsOfHistory,
        foundedYear,
      },
    });
  }

  try {
    // Fetch all counts in parallel
    const [artistsCount, releasesCount, videosCount] = await Promise.all([
      artistsRepository.count(true), // Only active artists
      releasesRepository.count(),
      videosRepository.count(),
    ]);

    // Use fallback values if counts are 0 (database may be empty or not synced)
    const finalArtists = artistsCount > 0 ? artistsCount : FALLBACK_STATS.artists;
    const finalReleases = releasesCount > 0 ? releasesCount : FALLBACK_STATS.releases;
    const finalVideos = videosCount > 0 ? videosCount : FALLBACK_STATS.videos;

    return NextResponse.json({
      success: true,
      data: {
        artists: finalArtists,
        releases: finalReleases,
        videos: finalVideos,
        yearsOfHistory,
        foundedYear,
      },
    });
  } catch (error) {
    console.error("[Stats API] Error fetching stats:", error);

    // Return fallback values on error
    return NextResponse.json({
      success: true,
      data: {
        ...FALLBACK_STATS,
        yearsOfHistory,
        foundedYear,
      },
    });
  }
}
