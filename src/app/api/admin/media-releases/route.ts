import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { mediaReleases, fileAssets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";

// Track file asset for a URL if it's from Dropbox
async function trackDropboxFile(url: string | null, releaseId: string, fieldName: string) {
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
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
        zip: "application/zip",
        pdf: "application/pdf",
        mp3: "audio/mpeg",
        wav: "audio/wav",
        flac: "audio/flac",
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
          entityType: "media_release",
          entityId: releaseId,
          fieldName,
          trackedAt: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error(`[Media Releases API] Failed to track file: ${error}`);
  }
}

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      console.warn("[API] Database not configured - returning empty media releases");
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const allMediaReleases = await db
      .select()
      .from(mediaReleases)
      .orderBy(desc(mediaReleases.publishDate));

    return NextResponse.json({
      success: true,
      data: allMediaReleases,
    });
  } catch (error) {
    console.error("[API] Error fetching media releases:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch media releases" },
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

    // Validate required fields
    if (!body.title || body.title.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    const id = generateUUID();
    let slug = body.slug?.trim() || slugify(body.title);

    // Check if slug exists and make it unique
    const existingSlugs = await db
      .select({ slug: mediaReleases.slug })
      .from(mediaReleases)
      .where(eq(mediaReleases.slug, slug));

    if (existingSlugs.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    // Parse dates safely
    const parseDate = (dateStr: string | null | undefined): Date | null => {
      if (!dateStr || dateStr === "") return null;
      try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      } catch {
        return null;
      }
    };

    const publishDate = parseDate(body.publishDate) || new Date();

    console.log("[API] Creating media release:", { title: body.title, slug, publishDate });

    const [mediaRelease] = await db
      .insert(mediaReleases)
      .values({
        id,
        title: body.title.trim(),
        slug,
        subtitle: body.subtitle?.trim() || null,
        category: body.category || "announcement",

        // Main Artist
        mainArtistId: body.mainArtistId || null,
        mainArtistName: body.mainArtistName || null,

        // Content
        summary: body.summary?.trim() || null,
        content: body.content || null,
        pullQuote: body.pullQuote?.trim() || null,
        pullQuoteAttribution: body.pullQuoteAttribution?.trim() || null,

        // Visual Assets
        coverImageUrl: body.coverImageUrl || null,
        bannerImageUrl: body.bannerImageUrl || null,
        galleryImages: body.galleryImages || null,
        logoUrl: body.logoUrl || null,

        // Audio/Video
        audioPreviewUrl: body.audioPreviewUrl || null,
        audioPreviewTitle: body.audioPreviewTitle || null,
        audioTracks: body.audioTracks || null,
        spotifyEmbedUrl: body.spotifyEmbedUrl || null,
        youtubeVideoId: body.youtubeVideoId || null,
        youtubeVideoTitle: body.youtubeVideoTitle || null,

        // Downloads
        pressKitUrl: body.pressKitUrl || null,
        highResImagesUrl: body.highResImagesUrl || null,
        linerNotesUrl: body.linerNotesUrl || null,
        credits: body.credits?.trim() || null,

        // Related
        relatedArtistIds: body.relatedArtistIds || null,
        externalLinks: body.externalLinks || null,

        // Contacts
        prContactName: body.prContactName?.trim() || null,
        prContactEmail: body.prContactEmail?.trim() || null,
        prContactPhone: body.prContactPhone?.trim() || null,
        managementContact: body.managementContact?.trim() || null,
        bookingContact: body.bookingContact?.trim() || null,

        // Dates
        publishDate,
        embargoDate: parseDate(body.embargoDate),
        releaseDate: parseDate(body.releaseDate),
        eventDate: parseDate(body.eventDate),

        // Status
        isPublished: body.isPublished === true,
        isFeatured: body.isFeatured === true,
        accessCode: body.accessCode?.trim() || null,

        // Tags
        tags: body.tags || null,

        // Style Settings
        styleSettings: body.styleSettings || null,
      })
      .returning();

    console.log(`[API] Created media release: ${mediaRelease.title}`);

    // Track Dropbox files for persistence
    await Promise.all([
      trackDropboxFile(mediaRelease.coverImageUrl, mediaRelease.id, "coverImageUrl"),
      trackDropboxFile(mediaRelease.bannerImageUrl, mediaRelease.id, "bannerImageUrl"),
      trackDropboxFile(mediaRelease.logoUrl, mediaRelease.id, "logoUrl"),
      trackDropboxFile(mediaRelease.audioPreviewUrl, mediaRelease.id, "audioPreviewUrl"),
      trackDropboxFile(mediaRelease.pressKitUrl, mediaRelease.id, "pressKitUrl"),
      trackDropboxFile(mediaRelease.highResImagesUrl, mediaRelease.id, "highResImagesUrl"),
      trackDropboxFile(mediaRelease.linerNotesUrl, mediaRelease.id, "linerNotesUrl"),
    ]);

    return NextResponse.json({
      success: true,
      data: mediaRelease,
    });
  } catch (error: any) {
    console.error("[API] Error creating media release:", error);
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
        { success: false, error: "A media release with this slug already exists" },
        { status: 409 }
      );
    }

    const errorMessage = error?.message || "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to create media release: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PUT - Update a media release
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
        { success: false, error: "Media release ID is required" },
        { status: 400 }
      );
    }

    const [mediaRelease] = await db
      .update(mediaReleases)
      .set({
        title: body.title,
        slug: body.slug || slugify(body.title),
        subtitle: body.subtitle || null,
        category: body.category || "announcement",
        mainArtistId: body.mainArtistId || null,
        mainArtistName: body.mainArtistName || null,
        summary: body.summary || null,
        content: body.content || null,
        pullQuote: body.pullQuote || null,
        pullQuoteAttribution: body.pullQuoteAttribution || null,
        coverImageUrl: body.coverImageUrl || null,
        bannerImageUrl: body.bannerImageUrl || null,
        galleryImages: body.galleryImages || null,
        logoUrl: body.logoUrl || null,
        audioPreviewUrl: body.audioPreviewUrl || null,
        audioPreviewTitle: body.audioPreviewTitle || null,
        audioTracks: body.audioTracks || null,
        spotifyEmbedUrl: body.spotifyEmbedUrl || null,
        youtubeVideoId: body.youtubeVideoId || null,
        youtubeVideoTitle: body.youtubeVideoTitle || null,
        pressKitUrl: body.pressKitUrl || null,
        highResImagesUrl: body.highResImagesUrl || null,
        linerNotesUrl: body.linerNotesUrl || null,
        credits: body.credits || null,
        relatedArtistIds: body.relatedArtistIds || null,
        externalLinks: body.externalLinks || null,
        prContactName: body.prContactName || null,
        prContactEmail: body.prContactEmail || null,
        prContactPhone: body.prContactPhone || null,
        managementContact: body.managementContact || null,
        bookingContact: body.bookingContact || null,
        publishDate: body.publishDate ? new Date(body.publishDate) : new Date(),
        embargoDate: body.embargoDate ? new Date(body.embargoDate) : null,
        releaseDate: body.releaseDate ? new Date(body.releaseDate) : null,
        eventDate: body.eventDate ? new Date(body.eventDate) : null,
        isPublished: body.isPublished || false,
        isFeatured: body.isFeatured || false,
        accessCode: body.accessCode || null,
        tags: body.tags || null,
        styleSettings: body.styleSettings || null,
        updatedAt: new Date(),
      })
      .where(eq(mediaReleases.id, body.id))
      .returning();

    if (!mediaRelease) {
      return NextResponse.json(
        { success: false, error: "Media release not found" },
        { status: 404 }
      );
    }

    console.log(`[API] Updated media release: ${mediaRelease.title}`);

    // Track Dropbox files for persistence
    await Promise.all([
      trackDropboxFile(mediaRelease.coverImageUrl, mediaRelease.id, "coverImageUrl"),
      trackDropboxFile(mediaRelease.bannerImageUrl, mediaRelease.id, "bannerImageUrl"),
      trackDropboxFile(mediaRelease.logoUrl, mediaRelease.id, "logoUrl"),
      trackDropboxFile(mediaRelease.audioPreviewUrl, mediaRelease.id, "audioPreviewUrl"),
      trackDropboxFile(mediaRelease.pressKitUrl, mediaRelease.id, "pressKitUrl"),
      trackDropboxFile(mediaRelease.highResImagesUrl, mediaRelease.id, "highResImagesUrl"),
      trackDropboxFile(mediaRelease.linerNotesUrl, mediaRelease.id, "linerNotesUrl"),
    ]);

    return NextResponse.json({
      success: true,
      data: mediaRelease,
    });
  } catch (error) {
    console.error("[API] Error updating media release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update media release" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a media release
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
        { success: false, error: "Media release ID is required" },
        { status: 400 }
      );
    }

    await db.delete(mediaReleases).where(eq(mediaReleases.id, id));

    console.log(`[API] Deleted media release: ${id}`);

    return NextResponse.json({
      success: true,
      message: "Media release deleted successfully",
    });
  } catch (error) {
    console.error("[API] Error deleting media release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete media release" },
      { status: 500 }
    );
  }
}
