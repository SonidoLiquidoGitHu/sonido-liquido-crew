import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { artistEpk, epkPressPhotos, epkTracks, epkVideos, artists } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

interface RouteContext {
  params: Promise<{ artistId: string }>;
}

/**
 * GET /api/admin/epk/[artistId]
 * Get EPK data for an artist
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { artistId } = await context.params;

    // Get the artist
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!artist) {
      return NextResponse.json(
        { success: false, error: "Artist not found" },
        { status: 404 }
      );
    }

    // Get or create EPK
    let [epk] = await db
      .select()
      .from(artistEpk)
      .where(eq(artistEpk.artistId, artistId))
      .limit(1);

    if (!epk) {
      // Create default EPK
      const newEpkId = generateUUID();
      await db.insert(artistEpk).values({
        id: newEpkId,
        artistId,
        bioShort: artist.shortBio || "",
        bioLong: artist.bio || "",
        bookingEmail: artist.bookingEmail || "",
        isPublic: true,
      });

      [epk] = await db
        .select()
        .from(artistEpk)
        .where(eq(artistEpk.id, newEpkId))
        .limit(1);
    }

    // Get press photos
    const pressPhotos = await db
      .select()
      .from(epkPressPhotos)
      .where(eq(epkPressPhotos.artistId, artistId))
      .orderBy(epkPressPhotos.sortOrder);

    // Get tracks
    const tracks = await db
      .select()
      .from(epkTracks)
      .where(eq(epkTracks.artistId, artistId))
      .orderBy(epkTracks.sortOrder);

    // Get videos
    const videos = await db
      .select()
      .from(epkVideos)
      .where(eq(epkVideos.artistId, artistId))
      .orderBy(epkVideos.sortOrder);

    return NextResponse.json({
      success: true,
      data: {
        artist,
        epk,
        pressPhotos,
        tracks,
        videos,
      },
    });
  } catch (error) {
    console.error("[EPK GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch EPK data" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/epk/[artistId]
 * Update EPK data for an artist
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { artistId } = await context.params;
    const body = await request.json();

    // Check if artist exists
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!artist) {
      return NextResponse.json(
        { success: false, error: "Artist not found" },
        { status: 404 }
      );
    }

    // Check if EPK exists
    let [existingEpk] = await db
      .select()
      .from(artistEpk)
      .where(eq(artistEpk.artistId, artistId))
      .limit(1);

    const epkData = {
      // Identity
      tagline: body.tagline,
      genreSpecific: body.genreSpecific,
      subgenres: body.subgenres ? JSON.stringify(body.subgenres) : null,
      artistType: body.artistType,

      // Bios
      bioShort: body.bioShort,
      bioLong: body.bioLong,
      bioPress: body.bioPress,
      storyHighlights: body.storyHighlights ? JSON.stringify(body.storyHighlights) : null,

      // Visual Identity
      logoUrl: body.logoUrl,
      logoTransparentUrl: body.logoTransparentUrl,
      logoWhiteUrl: body.logoWhiteUrl,
      logoBlackUrl: body.logoBlackUrl,
      brandColors: body.brandColors ? JSON.stringify(body.brandColors) : null,
      brandFont: body.brandFont,

      // Streaming Stats
      spotifyMonthlyListeners: body.spotifyMonthlyListeners,
      spotifyFollowers: body.spotifyFollowers,
      spotifyTopTrack: body.spotifyTopTrack ? JSON.stringify(body.spotifyTopTrack) : null,
      appleMusicUrl: body.appleMusicUrl,
      youtubeSubscribers: body.youtubeSubscribers,
      youtubeTotalViews: body.youtubeTotalViews,
      instagramFollowers: body.instagramFollowers,
      tiktokFollowers: body.tiktokFollowers,
      totalStreams: body.totalStreams,
      streamingHighlights: body.streamingHighlights ? JSON.stringify(body.streamingHighlights) : null,

      // Press
      pressFeatures: body.pressFeatures ? JSON.stringify(body.pressFeatures) : null,
      blogMentions: body.blogMentions ? JSON.stringify(body.blogMentions) : null,
      interviewUrls: body.interviewUrls ? JSON.stringify(body.interviewUrls) : null,

      // Playlists
      editorialPlaylists: body.editorialPlaylists ? JSON.stringify(body.editorialPlaylists) : null,
      curatedPlaylists: body.curatedPlaylists ? JSON.stringify(body.curatedPlaylists) : null,

      // Shows
      pastShows: body.pastShows ? JSON.stringify(body.pastShows) : null,
      festivalAppearances: body.festivalAppearances ? JSON.stringify(body.festivalAppearances) : null,
      notableVenues: body.notableVenues ? JSON.stringify(body.notableVenues) : null,
      tourHistory: body.tourHistory ? JSON.stringify(body.tourHistory) : null,

      // Collaborations
      collaborations: body.collaborations ? JSON.stringify(body.collaborations) : null,
      producerCredits: body.producerCredits ? JSON.stringify(body.producerCredits) : null,
      remixCredits: body.remixCredits ? JSON.stringify(body.remixCredits) : null,

      // Music
      topTracks: body.topTracks ? JSON.stringify(body.topTracks) : null,
      latestRelease: body.latestRelease ? JSON.stringify(body.latestRelease) : null,
      upcomingRelease: body.upcomingRelease ? JSON.stringify(body.upcomingRelease) : null,

      // Videos
      officialMusicVideos: body.officialMusicVideos ? JSON.stringify(body.officialMusicVideos) : null,
      livePerformanceVideos: body.livePerformanceVideos ? JSON.stringify(body.livePerformanceVideos) : null,
      featuredVideo: body.featuredVideo ? JSON.stringify(body.featuredVideo) : null,
      visualizerVideos: body.visualizerVideos ? JSON.stringify(body.visualizerVideos) : null,
      behindTheScenes: body.behindTheScenes ? JSON.stringify(body.behindTheScenes) : null,

      // Quotes
      pressQuotes: body.pressQuotes ? JSON.stringify(body.pressQuotes) : null,
      artistEndorsements: body.artistEndorsements ? JSON.stringify(body.artistEndorsements) : null,
      industryTestimonials: body.industryTestimonials ? JSON.stringify(body.industryTestimonials) : null,

      // Contact
      bookingEmail: body.bookingEmail,
      bookingPhone: body.bookingPhone,
      managementName: body.managementName,
      managementEmail: body.managementEmail,
      managementPhone: body.managementPhone,
      publicistName: body.publicistName,
      publicistEmail: body.publicistEmail,
      labelName: body.labelName,
      labelContact: body.labelContact,

      // Technical Rider
      performanceFormat: body.performanceFormat,
      setLengthOptions: body.setLengthOptions ? JSON.stringify(body.setLengthOptions) : null,
      technicalRequirements: body.technicalRequirements ? JSON.stringify(body.technicalRequirements) : null,
      backlineNeeds: body.backlineNeeds ? JSON.stringify(body.backlineNeeds) : null,
      stageRequirements: body.stageRequirements,
      hospitalityRider: body.hospitalityRider,
      travelRequirements: body.travelRequirements,

      // Downloads
      pressKitPdfUrl: body.pressKitPdfUrl,
      hiResPhotosZipUrl: body.hiResPhotosZipUrl,
      logoPackZipUrl: body.logoPackZipUrl,
      technicalRiderPdfUrl: body.technicalRiderPdfUrl,
      stageplotUrl: body.stageplotUrl,

      // Settings
      isPublic: body.isPublic ?? true,
      customSlug: body.customSlug,
      theme: body.theme || "dark",
      customCss: body.customCss,
      showContactForm: body.showContactForm ?? true,
      password: body.password,

      updatedAt: new Date(),
    };

    if (existingEpk) {
      // Update existing
      await db
        .update(artistEpk)
        .set(epkData)
        .where(eq(artistEpk.artistId, artistId));
    } else {
      // Create new
      await db.insert(artistEpk).values({
        id: generateUUID(),
        artistId,
        ...epkData,
      });
    }

    // Fetch updated EPK
    const [updatedEpk] = await db
      .select()
      .from(artistEpk)
      .where(eq(artistEpk.artistId, artistId))
      .limit(1);

    // ===== Sync EPK fields back to Artist =====
    // EPK is the source of truth — always overwrite Artist with EPK values
    try {
      const artistUpdates: Record<string, unknown> = { updatedAt: new Date() };

      // bioShort → shortBio
      if (body.bioShort) {
        artistUpdates.shortBio = body.bioShort;
      }
      // bioLong → bio
      if (body.bioLong) {
        artistUpdates.bio = body.bioLong;
      }
      // bookingEmail
      if (body.bookingEmail) {
        artistUpdates.bookingEmail = body.bookingEmail;
      }
      // managementEmail
      if (body.managementEmail) {
        artistUpdates.managementEmail = body.managementEmail;
      }
      // publicistEmail → pressEmail
      if (body.publicistEmail) {
        artistUpdates.pressEmail = body.publicistEmail;
      }
      // genreSpecific → genres
      if (body.genreSpecific) {
        artistUpdates.genres = JSON.stringify(body.genreSpecific.split(",").map((g: string) => g.trim()).filter(Boolean));
      }
      // labelName → labels
      if (body.labelName) {
        artistUpdates.labels = JSON.stringify(body.labelName.split("/").map((l: string) => l.trim()).filter(Boolean));
      }
      // pressQuotes
      if (body.pressQuotes) {
        artistUpdates.pressQuotes = JSON.stringify(body.pressQuotes);
      }
      // officialMusicVideos → featuredVideos
      if (body.officialMusicVideos) {
        artistUpdates.featuredVideos = JSON.stringify(body.officialMusicVideos);
      }

      if (Object.keys(artistUpdates).length > 1) {
        await db
          .update(artists)
          .set(artistUpdates)
          .where(eq(artists.id, artistId));
        console.log(`[EPK PUT] Synced EPK fields back to Artist: ${artistId}`);
      }
    } catch (syncError) {
      console.error("[EPK PUT] Error syncing EPK to Artist (non-critical):", syncError);
    }
    // ===== End sync to Artist =====

    return NextResponse.json({
      success: true,
      data: updatedEpk,
    });
  } catch (error) {
    console.error("[EPK PUT] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update EPK" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/epk/[artistId]
 * Delete EPK and related data
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { artistId } = await context.params;

    // Delete EPK (cascades to photos, tracks, videos)
    await db.delete(artistEpk).where(eq(artistEpk.artistId, artistId));
    await db.delete(epkPressPhotos).where(eq(epkPressPhotos.artistId, artistId));
    await db.delete(epkTracks).where(eq(epkTracks.artistId, artistId));
    await db.delete(epkVideos).where(eq(epkVideos.artistId, artistId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EPK DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete EPK" },
      { status: 500 }
    );
  }
}
