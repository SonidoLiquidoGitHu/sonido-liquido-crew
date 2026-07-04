import { db, isDatabaseConfigured } from "@/db/client";
import {
  artistEpk,
  artists,
  epkPressPhotos,
  epkTracks,
  epkVideos,
} from "@/db/schema";
import { generateUUID } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

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
        { status: 503 },
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
        { status: 404 },
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
      { status: 500 },
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
        { status: 503 },
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
        { status: 404 },
      );
    }

    // Check if EPK exists
    const [existingEpk] = await db
      .select()
      .from(artistEpk)
      .where(eq(artistEpk.artistId, artistId))
      .limit(1);

    // Build EPK update object with only explicitly provided fields
    // This prevents accidental data loss from partial updates
    const epkData: Record<string, unknown> = { updatedAt: new Date() };

    // Identity
    if ("tagline" in body) epkData.tagline = body.tagline;
    if ("genreSpecific" in body) epkData.genreSpecific = body.genreSpecific;
    if ("subgenres" in body)
      epkData.subgenres = body.subgenres
        ? JSON.stringify(body.subgenres)
        : null;
    if ("artistType" in body) epkData.artistType = body.artistType;

    // Bios
    if ("bioShort" in body) epkData.bioShort = body.bioShort;
    if ("bioLong" in body) epkData.bioLong = body.bioLong;
    if ("bioPress" in body) epkData.bioPress = body.bioPress;
    if ("storyHighlights" in body)
      epkData.storyHighlights = body.storyHighlights
        ? JSON.stringify(body.storyHighlights)
        : null;

    // Visual Identity
    if ("logoUrl" in body) epkData.logoUrl = body.logoUrl;
    if ("logoTransparentUrl" in body)
      epkData.logoTransparentUrl = body.logoTransparentUrl;
    if ("logoWhiteUrl" in body) epkData.logoWhiteUrl = body.logoWhiteUrl;
    if ("logoBlackUrl" in body) epkData.logoBlackUrl = body.logoBlackUrl;
    if ("brandColors" in body)
      epkData.brandColors = body.brandColors
        ? JSON.stringify(body.brandColors)
        : null;
    if ("brandFont" in body) epkData.brandFont = body.brandFont;

    // Streaming Stats
    if ("spotifyMonthlyListeners" in body)
      epkData.spotifyMonthlyListeners = body.spotifyMonthlyListeners;
    if ("spotifyFollowers" in body)
      epkData.spotifyFollowers = body.spotifyFollowers;
    if ("spotifyTopTrack" in body)
      epkData.spotifyTopTrack = body.spotifyTopTrack
        ? JSON.stringify(body.spotifyTopTrack)
        : null;
    if ("appleMusicUrl" in body) epkData.appleMusicUrl = body.appleMusicUrl;
    if ("youtubeSubscribers" in body)
      epkData.youtubeSubscribers = body.youtubeSubscribers;
    if ("youtubeTotalViews" in body)
      epkData.youtubeTotalViews = body.youtubeTotalViews;
    if ("instagramFollowers" in body)
      epkData.instagramFollowers = body.instagramFollowers;
    if ("tiktokFollowers" in body)
      epkData.tiktokFollowers = body.tiktokFollowers;
    if ("totalStreams" in body) epkData.totalStreams = body.totalStreams;
    if ("streamingHighlights" in body)
      epkData.streamingHighlights = body.streamingHighlights
        ? JSON.stringify(body.streamingHighlights)
        : null;

    // Press
    if ("pressFeatures" in body)
      epkData.pressFeatures = body.pressFeatures
        ? JSON.stringify(body.pressFeatures)
        : null;
    if ("blogMentions" in body)
      epkData.blogMentions = body.blogMentions
        ? JSON.stringify(body.blogMentions)
        : null;
    if ("interviewUrls" in body)
      epkData.interviewUrls = body.interviewUrls
        ? JSON.stringify(body.interviewUrls)
        : null;

    // Playlists
    if ("editorialPlaylists" in body)
      epkData.editorialPlaylists = body.editorialPlaylists
        ? JSON.stringify(body.editorialPlaylists)
        : null;
    if ("curatedPlaylists" in body)
      epkData.curatedPlaylists = body.curatedPlaylists
        ? JSON.stringify(body.curatedPlaylists)
        : null;

    // Shows
    if ("pastShows" in body)
      epkData.pastShows = body.pastShows
        ? JSON.stringify(body.pastShows)
        : null;
    if ("festivalAppearances" in body)
      epkData.festivalAppearances = body.festivalAppearances
        ? JSON.stringify(body.festivalAppearances)
        : null;
    if ("notableVenues" in body)
      epkData.notableVenues = body.notableVenues
        ? JSON.stringify(body.notableVenues)
        : null;
    if ("tourHistory" in body)
      epkData.tourHistory = body.tourHistory
        ? JSON.stringify(body.tourHistory)
        : null;

    // Collaborations
    if ("collaborations" in body)
      epkData.collaborations = body.collaborations
        ? JSON.stringify(body.collaborations)
        : null;
    if ("producerCredits" in body)
      epkData.producerCredits = body.producerCredits
        ? JSON.stringify(body.producerCredits)
        : null;
    if ("remixCredits" in body)
      epkData.remixCredits = body.remixCredits
        ? JSON.stringify(body.remixCredits)
        : null;

    // Music
    if ("topTracks" in body)
      epkData.topTracks = body.topTracks
        ? JSON.stringify(body.topTracks)
        : null;
    if ("latestRelease" in body)
      epkData.latestRelease = body.latestRelease
        ? JSON.stringify(body.latestRelease)
        : null;
    if ("upcomingRelease" in body)
      epkData.upcomingRelease = body.upcomingRelease
        ? JSON.stringify(body.upcomingRelease)
        : null;

    // Videos
    if ("officialMusicVideos" in body)
      epkData.officialMusicVideos = body.officialMusicVideos
        ? JSON.stringify(body.officialMusicVideos)
        : null;
    if ("livePerformanceVideos" in body)
      epkData.livePerformanceVideos = body.livePerformanceVideos
        ? JSON.stringify(body.livePerformanceVideos)
        : null;
    if ("featuredVideo" in body)
      epkData.featuredVideo = body.featuredVideo
        ? JSON.stringify(body.featuredVideo)
        : null;
    if ("visualizerVideos" in body)
      epkData.visualizerVideos = body.visualizerVideos
        ? JSON.stringify(body.visualizerVideos)
        : null;
    if ("behindTheScenes" in body)
      epkData.behindTheScenes = body.behindTheScenes
        ? JSON.stringify(body.behindTheScenes)
        : null;

    // Quotes
    if ("pressQuotes" in body)
      epkData.pressQuotes = body.pressQuotes
        ? JSON.stringify(body.pressQuotes)
        : null;
    if ("artistEndorsements" in body)
      epkData.artistEndorsements = body.artistEndorsements
        ? JSON.stringify(body.artistEndorsements)
        : null;
    if ("industryTestimonials" in body)
      epkData.industryTestimonials = body.industryTestimonials
        ? JSON.stringify(body.industryTestimonials)
        : null;

    // Contact
    if ("bookingEmail" in body) epkData.bookingEmail = body.bookingEmail;
    if ("bookingPhone" in body) epkData.bookingPhone = body.bookingPhone;
    if ("managementName" in body) epkData.managementName = body.managementName;
    if ("managementEmail" in body)
      epkData.managementEmail = body.managementEmail;
    if ("managementPhone" in body)
      epkData.managementPhone = body.managementPhone;
    if ("publicistName" in body) epkData.publicistName = body.publicistName;
    if ("publicistEmail" in body) epkData.publicistEmail = body.publicistEmail;
    if ("labelName" in body) epkData.labelName = body.labelName;
    if ("labelContact" in body) epkData.labelContact = body.labelContact;

    // Technical Rider
    if ("performanceFormat" in body)
      epkData.performanceFormat = body.performanceFormat;
    if ("setLengthOptions" in body)
      epkData.setLengthOptions = body.setLengthOptions
        ? JSON.stringify(body.setLengthOptions)
        : null;
    if ("technicalRequirements" in body)
      epkData.technicalRequirements = body.technicalRequirements
        ? JSON.stringify(body.technicalRequirements)
        : null;
    if ("backlineNeeds" in body)
      epkData.backlineNeeds = body.backlineNeeds
        ? JSON.stringify(body.backlineNeeds)
        : null;
    if ("stageRequirements" in body)
      epkData.stageRequirements = body.stageRequirements;
    if ("hospitalityRider" in body)
      epkData.hospitalityRider = body.hospitalityRider;
    if ("travelRequirements" in body)
      epkData.travelRequirements = body.travelRequirements;

    // Downloads
    if ("pressKitPdfUrl" in body) epkData.pressKitPdfUrl = body.pressKitPdfUrl;
    if ("hiResPhotosZipUrl" in body)
      epkData.hiResPhotosZipUrl = body.hiResPhotosZipUrl;
    if ("logoPackZipUrl" in body) epkData.logoPackZipUrl = body.logoPackZipUrl;
    if ("technicalRiderPdfUrl" in body)
      epkData.technicalRiderPdfUrl = body.technicalRiderPdfUrl;
    if ("stageplotUrl" in body) epkData.stageplotUrl = body.stageplotUrl;

    // Settings
    if ("isPublic" in body) epkData.isPublic = body.isPublic ?? true;
    if ("customSlug" in body) epkData.customSlug = body.customSlug;
    if ("theme" in body) epkData.theme = body.theme || "dark";
    if ("customCss" in body) epkData.customCss = body.customCss;
    if ("showContactForm" in body)
      epkData.showContactForm = body.showContactForm ?? true;
    if ("password" in body) epkData.password = body.password;

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
        artistUpdates.genres = JSON.stringify(
          body.genreSpecific
            .split(",")
            .map((g: string) => g.trim())
            .filter(Boolean),
        );
      }
      // labelName → labels
      if (body.labelName) {
        artistUpdates.labels = JSON.stringify(
          body.labelName
            .split("/")
            .map((l: string) => l.trim())
            .filter(Boolean),
        );
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
      console.error(
        "[EPK PUT] Error syncing EPK to Artist (non-critical):",
        syncError,
      );
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
      { status: 500 },
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
        { status: 503 },
      );
    }

    const { artistId } = await context.params;

    // Delete EPK (cascades to photos, tracks, videos)
    await db.delete(artistEpk).where(eq(artistEpk.artistId, artistId));
    await db
      .delete(epkPressPhotos)
      .where(eq(epkPressPhotos.artistId, artistId));
    await db.delete(epkTracks).where(eq(epkTracks.artistId, artistId));
    await db.delete(epkVideos).where(eq(epkVideos.artistId, artistId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[EPK DELETE] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete EPK" },
      { status: 500 },
    );
  }
}
