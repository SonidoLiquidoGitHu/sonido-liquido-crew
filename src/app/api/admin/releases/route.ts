import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { releases, releaseArtists } from "@/db/schema";
import { generateUUID, slugify } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allReleases = await db.query.releases.findMany({
      orderBy: (r, { desc }) => [desc(r.releaseDate)],
      with: {
        releaseArtists: {
          with: {
            artist: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: allReleases });
  } catch (error) {
    console.error("Failed to fetch releases:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch releases" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    if (!title || !artistId || !releaseDate) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = slugify(title);

    // Check if slug already exists
    const existing = await db.query.releases.findFirst({
      where: (r, { eq }) => eq(r.slug, slug),
    });

    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    // Create release
    const releaseId = generateUUID();

    await db.insert(releases).values({
      id: releaseId,
      title,
      slug: finalSlug,
      releaseType: releaseType || "album",
      releaseDate: new Date(releaseDate),
      spotifyId: spotifyId || null,
      spotifyUrl: spotifyUrl || null,
      coverImageUrl: coverImageUrl || null,
      description: description || null,
      appleMusicUrl: appleMusicUrl || null,
      youtubeMusicUrl: youtubeMusicUrl || null,
      isFeatured: isFeatured || false,
      isUpcoming: new Date(releaseDate) > new Date(),
    });

    // Link to artist
    await db.insert(releaseArtists).values({
      id: generateUUID(),
      releaseId,
      artistId,
      isPrimary: true,
    });

    return NextResponse.json({
      success: true,
      data: { id: releaseId, slug: finalSlug },
    });
  } catch (error) {
    console.error("Failed to create release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create release" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing release ID" },
        { status: 400 }
      );
    }

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
