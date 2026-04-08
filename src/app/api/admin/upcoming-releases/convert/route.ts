import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { releases, releaseArtists, upcomingReleases, artists } from "@/db/schema";
import { eq, like, or, and } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";

/**
 * POST /api/admin/upcoming-releases/convert
 * Convert an upcoming release to a regular release
 *
 * Body: { upcomingReleaseId: string, spotifyUrl?: string, appleMusicUrl?: string }
 */
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { upcomingReleaseId, spotifyUrl, appleMusicUrl, youtubeMusicUrl } = body;

    if (!upcomingReleaseId) {
      return NextResponse.json(
        { success: false, error: "upcomingReleaseId is required" },
        { status: 400 }
      );
    }

    // Fetch the upcoming release
    const [upcomingRelease] = await db
      .select()
      .from(upcomingReleases)
      .where(eq(upcomingReleases.id, upcomingReleaseId))
      .limit(1);

    if (!upcomingRelease) {
      return NextResponse.json(
        { success: false, error: "Upcoming release not found" },
        { status: 404 }
      );
    }

    // Check if already converted
    if (upcomingRelease.releasedReleaseId) {
      return NextResponse.json(
        { success: false, error: "This release has already been converted", releaseId: upcomingRelease.releasedReleaseId },
        { status: 400 }
      );
    }

    // Check if a release with the same slug already exists
    const existingRelease = await db
      .select()
      .from(releases)
      .where(eq(releases.slug, upcomingRelease.slug))
      .limit(1);

    if (existingRelease.length > 0) {
      // Link to existing release
      await db
        .update(upcomingReleases)
        .set({
          releasedReleaseId: existingRelease[0].id,
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(upcomingReleases.id, upcomingReleaseId));

      return NextResponse.json({
        success: true,
        message: "Linked to existing release",
        releaseId: existingRelease[0].id,
        isNew: false,
      });
    }

    // Create new release
    const releaseId = generateUUID();

    // Map release type
    const releaseType = upcomingRelease.releaseType === "mixtape"
      ? "mixtape"
      : upcomingRelease.releaseType;

    await db.insert(releases).values({
      id: releaseId,
      title: upcomingRelease.title,
      slug: upcomingRelease.slug,
      releaseType: releaseType as "album" | "ep" | "single" | "maxi-single" | "compilation" | "mixtape",
      releaseDate: upcomingRelease.releaseDate,
      coverImageUrl: upcomingRelease.coverImageUrl,
      description: upcomingRelease.description,
      spotifyUrl: spotifyUrl || null,
      appleMusicUrl: appleMusicUrl || null,
      youtubeMusicUrl: youtubeMusicUrl || null,
      isUpcoming: false,
      isFeatured: upcomingRelease.isFeatured,
    });

    // Try to find and link artist
    const artistName = upcomingRelease.artistName;
    const matchedArtist = await db
      .select()
      .from(artists)
      .where(
        or(
          eq(artists.name, artistName),
          like(artists.name, `%${artistName}%`)
        )
      )
      .limit(1);

    if (matchedArtist.length > 0) {
      await db.insert(releaseArtists).values({
        id: generateUUID(),
        releaseId: releaseId,
        artistId: matchedArtist[0].id,
        isPrimary: true,
      });
    }

    // Handle featured artists
    if (upcomingRelease.featuredArtists) {
      try {
        const featuredArtistNames = JSON.parse(upcomingRelease.featuredArtists);
        for (const featName of featuredArtistNames) {
          const featArtist = await db
            .select()
            .from(artists)
            .where(
              or(
                eq(artists.name, featName),
                like(artists.name, `%${featName}%`)
              )
            )
            .limit(1);

          if (featArtist.length > 0) {
            // Check if already linked
            const existingLink = await db
              .select()
              .from(releaseArtists)
              .where(
                and(
                  eq(releaseArtists.releaseId, releaseId),
                  eq(releaseArtists.artistId, featArtist[0].id)
                )
              )
              .limit(1);

            if (existingLink.length === 0) {
              await db.insert(releaseArtists).values({
                id: generateUUID(),
                releaseId: releaseId,
                artistId: featArtist[0].id,
                isPrimary: false,
              });
            }
          }
        }
      } catch (e) {
        console.warn("Failed to parse featured artists:", e);
      }
    }

    // Update the upcoming release to link to the new release
    await db
      .update(upcomingReleases)
      .set({
        releasedReleaseId: releaseId,
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(upcomingReleases.id, upcomingReleaseId));

    return NextResponse.json({
      success: true,
      message: "Release created successfully",
      releaseId: releaseId,
      isNew: true,
    });
  } catch (error) {
    console.error("[Convert Upcoming Release] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to convert release" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/upcoming-releases/convert
 * Get all upcoming releases that are past their release date and not yet converted
 */
export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const now = new Date();

    // Find upcoming releases that are past release date and not converted
    const pendingConversions = await db
      .select()
      .from(upcomingReleases)
      .where(eq(upcomingReleases.isActive, true));

    const readyToConvert = pendingConversions.filter(
      (r) => r.releaseDate <= now && !r.releasedReleaseId
    );

    return NextResponse.json({
      success: true,
      data: readyToConvert,
      count: readyToConvert.length,
    });
  } catch (error) {
    console.error("[Get Pending Conversions] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pending conversions" },
      { status: 500 }
    );
  }
}
