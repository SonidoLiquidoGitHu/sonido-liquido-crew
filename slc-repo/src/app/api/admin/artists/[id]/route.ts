import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { artists, artistExternalProfiles, artistGalleryAssets, artistRelations } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch single artist with all related data
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, id))
      .limit(1);

    if (!artist) {
      return NextResponse.json(
        { success: false, error: "Artist not found" },
        { status: 404 }
      );
    }

    // Fetch related data
    const [externalProfiles, galleryAssets, relations] = await Promise.all([
      db.select().from(artistExternalProfiles).where(eq(artistExternalProfiles.artistId, id)),
      db.select().from(artistGalleryAssets).where(eq(artistGalleryAssets.artistId, id)),
      db.select().from(artistRelations).where(eq(artistRelations.artistId, id)),
    ]);

    // Get the related artist details for each relation
    const relatedArtistIds = relations.map(r => r.relatedArtistId);
    let relatedArtists: typeof artist[] = [];
    if (relatedArtistIds.length > 0) {
      relatedArtists = await db
        .select()
        .from(artists)
        .where(or(...relatedArtistIds.map(aid => eq(artists.id, aid))));
    }

    // Combine relations with artist details
    const relationsWithDetails = relations.map(r => ({
      ...r,
      relatedArtist: relatedArtists.find(a => a.id === r.relatedArtistId),
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...artist,
        externalProfiles,
        galleryAssets,
        artistRelations: relationsWithDetails,
      },
    });
  } catch (error) {
    console.error("[API] Error fetching artist:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch artist" },
      { status: 500 }
    );
  }
}

// PUT - Update artist
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    // Update artist main fields
    const [updatedArtist] = await db
      .update(artists)
      .set({
        name: body.name,
        slug: body.slug || slugify(body.name),
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
        pressQuotes: body.pressQuotes ? JSON.stringify(body.pressQuotes) : null,
        featuredVideos: body.featuredVideos ? JSON.stringify(body.featuredVideos) : null,
        isActive: body.isActive ?? true,
        isFeatured: body.isFeatured ?? false,
        sortOrder: body.sortOrder || 0,
        verificationStatus: body.verificationStatus || "pending",
        identityConflictFlag: body.identityConflictFlag ?? false,
        adminNotes: body.adminNotes || null,
        updatedAt: new Date(),
      })
      .where(eq(artists.id, id))
      .returning();

    if (!updatedArtist) {
      return NextResponse.json(
        { success: false, error: "Artist not found" },
        { status: 404 }
      );
    }

    // Update external profiles if provided
    if (body.externalProfiles) {
      // Delete existing profiles
      await db.delete(artistExternalProfiles).where(eq(artistExternalProfiles.artistId, id));

      // Insert new profiles
      for (const profile of body.externalProfiles) {
        if (profile.externalUrl) {
          await db.insert(artistExternalProfiles).values({
            id: generateUUID(),
            artistId: id,
            platform: profile.platform,
            externalUrl: profile.externalUrl,
            externalId: profile.externalId || null,
            handle: profile.handle || null,
            isVerified: profile.isVerified || false,
          });
        }
      }
    }

    // Update gallery assets if provided
    if (body.galleryAssets) {
      // Delete existing assets
      await db.delete(artistGalleryAssets).where(eq(artistGalleryAssets.artistId, id));

      // Insert new assets
      for (let i = 0; i < body.galleryAssets.length; i++) {
        const asset = body.galleryAssets[i];
        if (asset.assetUrl) {
          await db.insert(artistGalleryAssets).values({
            id: asset.id || generateUUID(),
            artistId: id,
            assetUrl: asset.assetUrl,
            thumbnailUrl: asset.thumbnailUrl || null,
            assetType: asset.assetType || "photo",
            caption: asset.caption || null,
            credit: asset.credit || null,
            isPublic: asset.isPublic ?? true,
            sortOrder: i,
          });
        }
      }
    }

    // Update artist relations if provided
    if (body.artistRelations) {
      // Delete existing relations (only where this artist is the primary)
      await db.delete(artistRelations).where(eq(artistRelations.artistId, id));

      // Insert new relations
      for (const relation of body.artistRelations) {
        if (relation.relatedArtistId && relation.relatedArtistId !== id) {
          await db.insert(artistRelations).values({
            id: generateUUID(),
            artistId: id,
            relatedArtistId: relation.relatedArtistId,
            relationType: relation.relationType || "collaborator",
          });
        }
      }
    }

    console.log(`[API] Updated artist: ${updatedArtist.name}`);

    return NextResponse.json({
      success: true,
      data: updatedArtist,
    });
  } catch (error) {
    console.error("[API] Error updating artist:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update artist" },
      { status: 500 }
    );
  }
}

// POST - Create new artist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const id = generateUUID();
    const slug = body.slug || slugify(body.name);

    const [newArtist] = await db
      .insert(artists)
      .values({
        id,
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
        pressQuotes: body.pressQuotes ? JSON.stringify(body.pressQuotes) : null,
        featuredVideos: body.featuredVideos ? JSON.stringify(body.featuredVideos) : null,
        isActive: body.isActive ?? true,
        isFeatured: body.isFeatured ?? false,
        sortOrder: body.sortOrder || 0,
        verificationStatus: body.verificationStatus || "pending",
        identityConflictFlag: false,
        adminNotes: body.adminNotes || null,
      })
      .returning();

    // Add external profiles if provided
    if (body.externalProfiles) {
      for (const profile of body.externalProfiles) {
        if (profile.externalUrl) {
          await db.insert(artistExternalProfiles).values({
            id: generateUUID(),
            artistId: id,
            platform: profile.platform,
            externalUrl: profile.externalUrl,
            externalId: profile.externalId || null,
            handle: profile.handle || null,
            isVerified: false,
          });
        }
      }
    }

    // Add gallery assets if provided
    if (body.galleryAssets) {
      for (let i = 0; i < body.galleryAssets.length; i++) {
        const asset = body.galleryAssets[i];
        if (asset.assetUrl) {
          await db.insert(artistGalleryAssets).values({
            id: asset.id || generateUUID(),
            artistId: id,
            assetUrl: asset.assetUrl,
            thumbnailUrl: asset.thumbnailUrl || null,
            assetType: asset.assetType || "photo",
            caption: asset.caption || null,
            credit: asset.credit || null,
            isPublic: asset.isPublic ?? true,
            sortOrder: i,
          });
        }
      }
    }

    // Add artist relations if provided
    if (body.artistRelations) {
      for (const relation of body.artistRelations) {
        if (relation.relatedArtistId && relation.relatedArtistId !== id) {
          await db.insert(artistRelations).values({
            id: generateUUID(),
            artistId: id,
            relatedArtistId: relation.relatedArtistId,
            relationType: relation.relationType || "collaborator",
          });
        }
      }
    }

    console.log(`[API] Created artist: ${newArtist.name}`);

    return NextResponse.json({
      success: true,
      data: newArtist,
    });
  } catch (error) {
    console.error("[API] Error creating artist:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create artist" },
      { status: 500 }
    );
  }
}

// DELETE - Delete artist
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    await db.delete(artists).where(eq(artists.id, id));

    console.log(`[API] Deleted artist: ${id}`);

    return NextResponse.json({
      success: true,
      message: "Artist deleted",
    });
  } catch (error) {
    console.error("[API] Error deleting artist:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete artist" },
      { status: 500 }
    );
  }
}
