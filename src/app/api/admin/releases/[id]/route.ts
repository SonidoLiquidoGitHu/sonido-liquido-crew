import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { releases, releaseArtists } from "@/db/schema";
import { eq } from "drizzle-orm";
import { slugify } from "@/lib/utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get a single release by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const release = await db.query.releases.findFirst({
      where: (r, { eq }) => eq(r.id, id),
      with: {
        releaseArtists: {
          with: {
            artist: true,
          },
        },
      },
    });

    if (!release) {
      return NextResponse.json(
        { success: false, error: "Release not found" },
        { status: 404 }
      );
    }

    // Get primary artist ID
    const primaryArtist = release.releaseArtists?.find(ra => ra.isPrimary);
    const artistId = primaryArtist?.artistId || release.releaseArtists?.[0]?.artistId || null;

    return NextResponse.json({
      success: true,
      data: {
        ...release,
        artistId,
      },
    });
  } catch (error) {
    console.error("Failed to fetch release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch release" },
      { status: 500 }
    );
  }
}

// PUT - Update a release
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      title,
      artistId,
      releaseType,
      releaseDate,
      spotifyUrl,
      spotifyId,
      coverImageUrl,
      description,
      appleMusicUrl,
      youtubeMusicUrl,
      isFeatured,
    } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    // Check if release exists
    const existing = await db.query.releases.findFirst({
      where: (r, { eq }) => eq(r.id, id),
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Release not found" },
        { status: 404 }
      );
    }

    // Generate new slug only if title changed
    let slug = existing.slug;
    if (title !== existing.title) {
      slug = slugify(title);
      // Check if new slug conflicts with another release
      const slugConflict = await db.query.releases.findFirst({
        where: (r, { and, eq, ne }) => and(eq(r.slug, slug), ne(r.id, id)),
      });
      if (slugConflict) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    // Update release
    await db
      .update(releases)
      .set({
        title,
        slug,
        releaseType: releaseType || existing.releaseType,
        releaseDate: releaseDate ? new Date(releaseDate) : existing.releaseDate,
        spotifyId: spotifyId || null,
        spotifyUrl: spotifyUrl || null,
        coverImageUrl: coverImageUrl || null,
        description: description || null,
        appleMusicUrl: appleMusicUrl || null,
        youtubeMusicUrl: youtubeMusicUrl || null,
        isFeatured: isFeatured ?? existing.isFeatured,
        isUpcoming: releaseDate ? new Date(releaseDate) > new Date() : existing.isUpcoming,
        updatedAt: new Date(),
      })
      .where(eq(releases.id, id));

    // Update artist association if artistId changed
    if (artistId) {
      // Delete existing artist associations
      await db.delete(releaseArtists).where(eq(releaseArtists.releaseId, id));

      // Create new association
      const { generateUUID } = await import("@/lib/utils");
      await db.insert(releaseArtists).values({
        id: generateUUID(),
        releaseId: id,
        artistId,
        isPrimary: true,
      });
    }

    return NextResponse.json({
      success: true,
      data: { id, slug },
    });
  } catch (error) {
    console.error("Failed to update release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update release" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a release
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Delete release artists first (foreign key constraint)
    await db.delete(releaseArtists).where(eq(releaseArtists.releaseId, id));

    // Delete release
    await db.delete(releases).where(eq(releases.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete release" },
      { status: 500 }
    );
  }
}
