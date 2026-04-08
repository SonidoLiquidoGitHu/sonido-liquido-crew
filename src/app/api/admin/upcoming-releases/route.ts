import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { upcomingReleases } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const releases = await db
      .select()
      .from(upcomingReleases)
      .orderBy(desc(upcomingReleases.releaseDate));

    return NextResponse.json({ success: true, data: releases });
  } catch (error) {
    console.error("[API] Error fetching upcoming releases:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch upcoming releases" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const id = generateUUID();
    const slug = body.slug || slugify(body.title);

    const [release] = await db
      .insert(upcomingReleases)
      .values({
        id,
        title: body.title,
        slug,
        artistName: body.artistName,
        featuredArtists: body.featuredArtists || null,
        releaseType: body.releaseType || "single",
        description: body.description || null,
        coverImageUrl: body.coverImageUrl || null,
        bannerImageUrl: body.bannerImageUrl || null,
        backgroundColor: body.backgroundColor || "#000000",
        releaseDate: body.releaseDate ? new Date(body.releaseDate) : new Date(),
        announceDate: body.announceDate ? new Date(body.announceDate) : null,
        rpmPresaveUrl: body.rpmPresaveUrl || null,
        spotifyPresaveUrl: body.spotifyPresaveUrl || null,
        appleMusicPresaveUrl: body.appleMusicPresaveUrl || null,
        deezerPresaveUrl: body.deezerPresaveUrl || null,
        tidalPresaveUrl: body.tidalPresaveUrl || null,
        amazonMusicPresaveUrl: body.amazonMusicPresaveUrl || null,
        youtubeMusicPresaveUrl: body.youtubeMusicPresaveUrl || null,
        teaserVideoUrl: body.teaserVideoUrl || null,
        verticalVideoUrl: body.verticalVideoUrl || null,
        audioPreviewUrl: body.audioPreviewUrl || null,
        isActive: body.isActive ?? true,
        isFeatured: body.isFeatured ?? false,
        showCountdown: body.showCountdown ?? true,
      })
      .returning();

    console.log(`[API] Created upcoming release: ${release.title}`);
    return NextResponse.json({ success: true, data: release });
  } catch (error) {
    console.error("[API] Error creating upcoming release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create upcoming release" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: "Release ID is required" },
        { status: 400 }
      );
    }

    const [release] = await db
      .update(upcomingReleases)
      .set({
        title: body.title,
        slug: body.slug || slugify(body.title),
        artistName: body.artistName,
        featuredArtists: body.featuredArtists || null,
        releaseType: body.releaseType || "single",
        description: body.description || null,
        coverImageUrl: body.coverImageUrl || null,
        bannerImageUrl: body.bannerImageUrl || null,
        backgroundColor: body.backgroundColor || "#000000",
        releaseDate: body.releaseDate ? new Date(body.releaseDate) : new Date(),
        announceDate: body.announceDate ? new Date(body.announceDate) : null,
        rpmPresaveUrl: body.rpmPresaveUrl || null,
        spotifyPresaveUrl: body.spotifyPresaveUrl || null,
        appleMusicPresaveUrl: body.appleMusicPresaveUrl || null,
        deezerPresaveUrl: body.deezerPresaveUrl || null,
        tidalPresaveUrl: body.tidalPresaveUrl || null,
        amazonMusicPresaveUrl: body.amazonMusicPresaveUrl || null,
        youtubeMusicPresaveUrl: body.youtubeMusicPresaveUrl || null,
        teaserVideoUrl: body.teaserVideoUrl || null,
        verticalVideoUrl: body.verticalVideoUrl || null,
        audioPreviewUrl: body.audioPreviewUrl || null,
        isActive: body.isActive ?? true,
        isFeatured: body.isFeatured ?? false,
        showCountdown: body.showCountdown ?? true,
        updatedAt: new Date(),
      })
      .where(eq(upcomingReleases.id, body.id))
      .returning();

    if (!release) {
      return NextResponse.json(
        { success: false, error: "Release not found" },
        { status: 404 }
      );
    }

    console.log(`[API] Updated upcoming release: ${release.title}`);
    return NextResponse.json({ success: true, data: release });
  } catch (error) {
    console.error("[API] Error updating upcoming release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update upcoming release" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Release ID is required" },
        { status: 400 }
      );
    }

    await db.delete(upcomingReleases).where(eq(upcomingReleases.id, id));
    console.log(`[API] Deleted upcoming release: ${id}`);

    return NextResponse.json({ success: true, message: "Release deleted" });
  } catch (error) {
    console.error("[API] Error deleting upcoming release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete upcoming release" },
      { status: 500 }
    );
  }
}
