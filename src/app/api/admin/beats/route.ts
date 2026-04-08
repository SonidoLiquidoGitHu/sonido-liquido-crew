import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { beats, fileAssets } from "@/db/schema";
import { eq, desc, and, or, like } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";

// Track file asset for a URL if it's from Dropbox
async function trackDropboxFile(url: string | null, beatId: string, fieldName: string) {
  if (!url || !url.includes("dropbox")) return;

  try {
    const existing = await db
      .select()
      .from(fileAssets)
      .where(eq(fileAssets.publicUrl, url))
      .limit(1);

    if (existing.length === 0) {
      const filename = url.split("/").pop() || "unknown";
      const ext = filename.split(".").pop()?.toLowerCase() || "";
      const mimeTypes: Record<string, string> = {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        flac: "audio/flac",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        zip: "application/zip",
      };

      await db.insert(fileAssets).values({
        id: generateUUID(),
        filename,
        originalFilename: filename,
        mimeType: mimeTypes[ext] || "application/octet-stream",
        fileSize: 0,
        storageProvider: "dropbox",
        storagePath: url,
        publicUrl: url,
        isPublic: true,
        metadata: {
          entityType: "beat",
          entityId: beatId,
          fieldName,
          trackedAt: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error(`[Beats API] Failed to track file: ${error}`);
  }
}

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      console.warn("[API] Database not configured - returning empty beats");
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const allBeats = await db
      .select()
      .from(beats)
      .orderBy(desc(beats.createdAt));

    return NextResponse.json({
      success: true,
      data: allBeats,
    });
  } catch (error) {
    console.error("[API] Error fetching beats:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch beats" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      console.error("[API] Database not configured for beat creation");
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    console.log("[API] Creating beat:", body.title);

    if (!body.title) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    const id = generateUUID();
    const slug = body.slug || slugify(body.title);

    // Validate styleSettings is proper JSON if provided
    let styleSettings = null;
    if (body.styleSettings && typeof body.styleSettings === "object" && Object.keys(body.styleSettings).length > 0) {
      styleSettings = body.styleSettings;
    }

    const [beat] = await db
      .insert(beats)
      .values({
        id,
        title: body.title,
        slug,
        description: body.description || null,
        producerId: body.producerId || null,
        producerName: body.producerName || null,
        bpm: body.bpm || null,
        key: body.key || null,
        genre: body.genre || null,
        tags: body.tags || null,
        duration: body.duration || null,
        previewAudioUrl: body.previewAudioUrl || null,
        fullAudioUrl: body.fullAudioUrl || null,
        stemPackUrl: body.stemPackUrl || null,
        coverImageUrl: body.coverImageUrl || null,
        waveformImageUrl: body.waveformImageUrl || null,
        isFree: body.isFree !== false,
        price: body.price || null,
        currency: body.currency || "USD",
        gateEnabled: body.gateEnabled !== false,
        requireEmail: body.requireEmail !== false,
        requireSpotifyFollow: body.requireSpotifyFollow || false,
        spotifyArtistUrl: body.spotifyArtistUrl || null,
        requireSpotifyPlay: body.requireSpotifyPlay || false,
        spotifySongUrl: body.spotifySongUrl || null,
        spotifySongId: body.spotifySongId || null,
        requireHyperfollow: body.requireHyperfollow || false,
        hyperfollowUrl: body.hyperfollowUrl || null,
        requireInstagramShare: body.requireInstagramShare || false,
        instagramShareText: body.instagramShareText || null,
        requireFacebookShare: body.requireFacebookShare || false,
        facebookShareText: body.facebookShareText || null,
        requireCustomAction: body.requireCustomAction || false,
        customActionLabel: body.customActionLabel || null,
        customActionUrl: body.customActionUrl || null,
        customActionInstructions: body.customActionInstructions || null,
        isActive: body.isActive !== false,
        isFeatured: body.isFeatured || false,
        styleSettings,
      })
      .returning();

    console.log(`[API] Created beat: ${beat.title} (${beat.id})`);

    // Track Dropbox files for persistence (non-blocking)
    Promise.all([
      trackDropboxFile(beat.coverImageUrl, beat.id, "coverImageUrl"),
      trackDropboxFile(beat.previewAudioUrl, beat.id, "previewAudioUrl"),
      trackDropboxFile(beat.fullAudioUrl, beat.id, "fullAudioUrl"),
      trackDropboxFile(beat.stemPackUrl, beat.id, "stemPackUrl"),
      trackDropboxFile(beat.waveformImageUrl, beat.id, "waveformImageUrl"),
    ]).catch(err => console.warn("[API] Failed to track some files:", err));

    return NextResponse.json({
      success: true,
      data: beat,
    });
  } catch (error: any) {
    console.error("[API] Error creating beat:", error);
    console.error("[API] Error details:", {
      message: error?.message,
      code: error?.code,
    });

    // Check for specific database errors
    if (error?.message?.includes("no such table")) {
      return NextResponse.json(
        { success: false, error: "Database table not found - run migrations" },
        { status: 503 }
      );
    }

    if (error?.message?.includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        { success: false, error: "A beat with this slug already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Failed to create beat: ${error?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}

// PUT - Update a beat
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
        { success: false, error: "Beat ID is required" },
        { status: 400 }
      );
    }

    const [beat] = await db
      .update(beats)
      .set({
        title: body.title,
        slug: body.slug || slugify(body.title),
        description: body.description || null,
        producerId: body.producerId || null,
        producerName: body.producerName || null,
        bpm: body.bpm || null,
        key: body.key || null,
        genre: body.genre || null,
        tags: body.tags || null,
        duration: body.duration || null,
        previewAudioUrl: body.previewAudioUrl || null,
        fullAudioUrl: body.fullAudioUrl || null,
        stemPackUrl: body.stemPackUrl || null,
        coverImageUrl: body.coverImageUrl || null,
        waveformImageUrl: body.waveformImageUrl || null,
        isFree: body.isFree !== false,
        price: body.price || null,
        currency: body.currency || "USD",
        gateEnabled: body.gateEnabled !== false,
        requireEmail: body.requireEmail !== false,
        requireSpotifyFollow: body.requireSpotifyFollow || false,
        spotifyArtistUrl: body.spotifyArtistUrl || null,
        requireSpotifyPlay: body.requireSpotifyPlay || false,
        spotifySongUrl: body.spotifySongUrl || null,
        spotifySongId: body.spotifySongId || null,
        requireHyperfollow: body.requireHyperfollow || false,
        hyperfollowUrl: body.hyperfollowUrl || null,
        requireInstagramShare: body.requireInstagramShare || false,
        instagramShareText: body.instagramShareText || null,
        requireFacebookShare: body.requireFacebookShare || false,
        facebookShareText: body.facebookShareText || null,
        requireCustomAction: body.requireCustomAction || false,
        customActionLabel: body.customActionLabel || null,
        customActionUrl: body.customActionUrl || null,
        customActionInstructions: body.customActionInstructions || null,
        isActive: body.isActive !== false,
        isFeatured: body.isFeatured || false,
        styleSettings: body.styleSettings || null,
        updatedAt: new Date(),
      })
      .where(eq(beats.id, body.id))
      .returning();

    if (!beat) {
      return NextResponse.json(
        { success: false, error: "Beat not found" },
        { status: 404 }
      );
    }

    console.log(`[API] Updated beat: ${beat.title}`);

    // Track Dropbox files for persistence
    await Promise.all([
      trackDropboxFile(beat.coverImageUrl, beat.id, "coverImageUrl"),
      trackDropboxFile(beat.previewAudioUrl, beat.id, "previewAudioUrl"),
      trackDropboxFile(beat.fullAudioUrl, beat.id, "fullAudioUrl"),
      trackDropboxFile(beat.stemPackUrl, beat.id, "stemPackUrl"),
      trackDropboxFile(beat.waveformImageUrl, beat.id, "waveformImageUrl"),
    ]);

    return NextResponse.json({
      success: true,
      data: beat,
    });
  } catch (error) {
    console.error("[API] Error updating beat:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update beat" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a beat
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
        { success: false, error: "Beat ID is required" },
        { status: 400 }
      );
    }

    await db.delete(beats).where(eq(beats.id, id));

    console.log(`[API] Deleted beat: ${id}`);

    return NextResponse.json({
      success: true,
      message: "Beat deleted successfully",
    });
  } catch (error) {
    console.error("[API] Error deleting beat:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete beat" },
      { status: 500 }
    );
  }
}
