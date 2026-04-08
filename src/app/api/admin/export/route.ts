import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import {
  artists,
  artistExternalProfiles,
  releases,
  releaseArtists,
  videos,
  events,
  subscribers,
  siteSettings,
  galleryPhotos,
  beats,
  campaigns,
  upcomingReleases,
  curatedSpotifyChannels,
  curatedTracks,
  playlistTracks,
  youtubeChannels,
} from "@/db/schema";

export const dynamic = "force-dynamic";

// GET - Export all site data as JSON
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeMedia = searchParams.get("includeMedia") === "true";
    const sections = searchParams.get("sections")?.split(",") || ["all"];

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const exportData: Record<string, any> = {
      exportedAt: new Date().toISOString(),
      version: "1.0",
      site: "Sonido Líquido Crew",
    };

    // Export artists
    if (sections.includes("all") || sections.includes("artists")) {
      const allArtists = await db.select().from(artists);
      const allProfiles = await db.select().from(artistExternalProfiles);

      exportData.artists = allArtists.map((artist) => ({
        ...artist,
        externalProfiles: allProfiles.filter((p) => p.artistId === artist.id),
      }));
    }

    // Export releases
    if (sections.includes("all") || sections.includes("releases")) {
      const allReleases = await db.select().from(releases);
      const allReleaseArtists = await db.select().from(releaseArtists);

      exportData.releases = allReleases.map((release) => ({
        ...release,
        artists: allReleaseArtists.filter((ra) => ra.releaseId === release.id),
      }));
    }

    // Export videos
    if (sections.includes("all") || sections.includes("videos")) {
      exportData.videos = await db.select().from(videos);
    }

    // Export YouTube channels
    if (sections.includes("all") || sections.includes("youtube")) {
      exportData.youtubeChannels = await db.select().from(youtubeChannels);
    }

    // Export events
    if (sections.includes("all") || sections.includes("events")) {
      exportData.events = await db.select().from(events);
    }

    // Export subscribers (emails only, no sensitive data)
    if (sections.includes("all") || sections.includes("subscribers")) {
      const allSubscribers = await db.select().from(subscribers);
      exportData.subscribers = allSubscribers.map((s) => ({
        email: s.email,
        name: s.name,
        isActive: s.isActive,
        source: s.source,
        subscribedAt: s.subscribedAt,
      }));
    }

    // Export gallery
    if (sections.includes("all") || sections.includes("gallery")) {
      exportData.gallery = await db.select().from(galleryPhotos);
    }

    // Export beats
    if (sections.includes("all") || sections.includes("beats")) {
      exportData.beats = await db.select().from(beats);
    }

    // Export campaigns
    if (sections.includes("all") || sections.includes("campaigns")) {
      exportData.campaigns = await db.select().from(campaigns);
    }

    // Export upcoming releases
    if (sections.includes("all") || sections.includes("upcoming")) {
      exportData.upcomingReleases = await db.select().from(upcomingReleases);
    }

    // Export curated playlists
    if (sections.includes("all") || sections.includes("playlists")) {
      exportData.curatedChannels = await db.select().from(curatedSpotifyChannels);
      exportData.curatedTracks = await db.select().from(curatedTracks);
      exportData.playlistTracks = await db.select().from(playlistTracks);
    }

    // Export site settings
    if (sections.includes("all") || sections.includes("settings")) {
      exportData.settings = await db.select().from(siteSettings);
    }

    // Add summary
    exportData.summary = {
      artistCount: exportData.artists?.length || 0,
      releaseCount: exportData.releases?.length || 0,
      videoCount: exportData.videos?.length || 0,
      eventCount: exportData.events?.length || 0,
      subscriberCount: exportData.subscribers?.length || 0,
      beatCount: exportData.beats?.length || 0,
      campaignCount: exportData.campaigns?.length || 0,
    };

    return NextResponse.json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    console.error("[Export API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error exporting data" },
      { status: 500 }
    );
  }
}
