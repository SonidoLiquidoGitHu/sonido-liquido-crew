import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { artists, artistExternalProfiles } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/artists - Get all artists for admin selectors
 */
export async function GET(request: NextRequest) {
  console.log("[Admin Artists API] Starting...");

  try {
    console.log("[Admin Artists API] DB configured:", isDatabaseConfigured());

    if (!isDatabaseConfigured()) {
      console.error("[Admin Artists API] Database not configured");
      return NextResponse.json({
        success: false,
        error: "Database not configured",
        data: [],
      });
    }

    console.log("[Admin Artists API] Fetching all artists...");

    const allArtists = await db
      .select()
      .from(artists)
      .orderBy(asc(artists.sortOrder), asc(artists.name));

    console.log(`[Admin Artists API] Found ${allArtists.length} artists`);

    return NextResponse.json({
      success: true,
      data: allArtists,
    });
  } catch (error) {
    const errorMessage = (error as Error).message || "Unknown error";
    console.error("[Admin Artists API] Error:", errorMessage);

    return NextResponse.json({
      success: false,
      error: errorMessage,
      data: [],
    });
  }
}

/**
 * POST /api/admin/artists - Create a new artist
 */
export async function POST(request: NextRequest) {
  console.log("[Admin Artists API] Creating new artist...");

  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    // Generate slug
    let slug = body.slug || slugify(body.name);

    // Check if slug is unique
    const [existingSlug] = await db
      .select()
      .from(artists)
      .where(eq(artists.slug, slug))
      .limit(1);

    if (existingSlug) {
      slug = `${slug}-${generateUUID().slice(0, 4)}`;
    }

    // Create artist
    const artistId = generateUUID();
    const [newArtist] = await db
      .insert(artists)
      .values({
        id: artistId,
        name: body.name,
        slug,
        realName: body.realName || null,
        bio: body.bio || null,
        shortBio: body.shortBio || null,
        role: body.role || "mc",
        profileImageUrl: body.profileImageUrl || null,
        featuredImageUrl: body.featuredImageUrl || null,
        bannerImageUrl: body.bannerImageUrl || null,
        tintColor: body.tintColor || null,
        location: body.location || null,
        country: body.country || null,
        bookingEmail: body.bookingEmail || null,
        managementEmail: body.managementEmail || null,
        pressEmail: body.pressEmail || null,
        websiteUrl: body.websiteUrl || null,
        yearStarted: body.yearStarted ? parseInt(body.yearStarted) : null,
        genres: body.genres ? JSON.stringify(body.genres) : null,
        labels: body.labels ? JSON.stringify(body.labels) : null,
        isActive: body.isActive ?? true,
        isFeatured: body.isFeatured ?? false,
        sortOrder: body.sortOrder ?? 0,
        verificationStatus: body.verificationStatus || "pending",
        adminNotes: body.adminNotes || null,
      })
      .returning();

    // Handle external profiles if provided
    if (body.externalProfiles && Array.isArray(body.externalProfiles)) {
      for (const profile of body.externalProfiles) {
        if (profile.externalUrl) {
          await db.insert(artistExternalProfiles).values({
            id: generateUUID(),
            artistId,
            platform: profile.platform,
            externalId: profile.externalId || null,
            externalUrl: profile.externalUrl,
            handle: profile.handle || null,
            displayName: profile.displayName || null,
            isVerified: profile.isVerified || false,
            isPrimary: profile.isPrimary || false,
          });
        }
      }
    }

    console.log(`[Admin Artists API] Created artist: ${newArtist.name} (${newArtist.id})`);

    return NextResponse.json({
      success: true,
      data: newArtist,
      message: "Artist created successfully",
    });
  } catch (error) {
    const errorMessage = (error as Error).message || "Unknown error";
    console.error("[Admin Artists API] POST Error:", errorMessage);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
