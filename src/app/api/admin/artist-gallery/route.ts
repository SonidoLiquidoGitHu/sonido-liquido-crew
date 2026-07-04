import { db, isDatabaseConfigured } from "@/db/client";
import { artistGalleryAssets } from "@/db/schema";
import { generateUUID } from "@/lib/utils";
import { asc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET - Fetch artist gallery assets
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get("artistId");
    const artistSlug = searchParams.get("artistSlug");

    if (!artistId && !artistSlug) {
      return NextResponse.json(
        { success: false, error: "artistId or artistSlug is required" },
        { status: 400 },
      );
    }

    let targetArtistId = artistId;

    // If slug provided, look up artist ID
    if (!targetArtistId && artistSlug) {
      const { artists } = await import("@/db/schema");
      const [artist] = await db
        .select({ id: artists.id })
        .from(artists)
        .where(eq(artists.slug, artistSlug))
        .limit(1);
      targetArtistId = artist?.id;
    }

    if (!targetArtistId) {
      return NextResponse.json({ success: true, data: [] });
    }

    const assets = await db
      .select()
      .from(artistGalleryAssets)
      .where(eq(artistGalleryAssets.artistId, targetArtistId))
      .orderBy(asc(artistGalleryAssets.sortOrder));

    return NextResponse.json({ success: true, data: assets });
  } catch (error) {
    console.error("[Artist Gallery API] Error fetching:", error);
    return NextResponse.json(
      { success: false, error: "Error fetching gallery assets" },
      { status: 500 },
    );
  }
}

// POST - Add gallery assets to an artist
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 },
      );
    }

    const body = await request.json();
    const { artistId, assets } = body;

    if (!artistId) {
      return NextResponse.json(
        { success: false, error: "artistId is required" },
        { status: 400 },
      );
    }

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one asset is required" },
        { status: 400 },
      );
    }

    // Get current max sort order for this artist
    const existing = await db
      .select()
      .from(artistGalleryAssets)
      .where(eq(artistGalleryAssets.artistId, artistId))
      .orderBy(asc(artistGalleryAssets.sortOrder));

    let nextSortOrder =
      existing.length > 0
        ? Math.max(...existing.map((a) => a.sortOrder)) + 1
        : 0;

    const newAssets = assets.map(
      (asset: {
        assetUrl: string;
        thumbnailUrl?: string;
        assetType?: "photo" | "press_photo" | "album_art" | "logo" | "banner";
        caption?: string;
        credit?: string;
        isPublic?: boolean;
      }) => ({
        id: generateUUID(),
        artistId,
        assetUrl: asset.assetUrl,
        thumbnailUrl: asset.thumbnailUrl || null,
        assetType: asset.assetType || ("photo" as const),
        caption: asset.caption || null,
        credit: asset.credit || null,
        isPublic: asset.isPublic !== false,
        sortOrder: nextSortOrder++,
      }),
    );

    await db.insert(artistGalleryAssets).values(newAssets);

    return NextResponse.json({
      success: true,
      data: newAssets,
      message: `${newAssets.length} asset(s) added to artist gallery`,
    });
  } catch (error) {
    console.error("[Artist Gallery API] Error adding assets:", error);
    return NextResponse.json(
      { success: false, error: "Error adding gallery assets" },
      { status: 500 },
    );
  }
}

// DELETE - Remove a gallery asset
export async function DELETE(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("assetId");

    if (!assetId) {
      return NextResponse.json(
        { success: false, error: "assetId is required" },
        { status: 400 },
      );
    }

    await db
      .delete(artistGalleryAssets)
      .where(eq(artistGalleryAssets.id, assetId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Artist Gallery API] Error deleting asset:", error);
    return NextResponse.json(
      { success: false, error: "Error deleting asset" },
      { status: 500 },
    );
  }
}
