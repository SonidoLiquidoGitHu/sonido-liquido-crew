/**
 * Import Data Script
 *
 * Reads the exported JSON file and imports all data into the Turso database.
 * Run with: npx tsx scripts/import-data.ts
 */

import * as dotenv from "dotenv";
dotenv.config();

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as fs from "node:fs";
import * as path from "node:path";

// Import schema
import {
  artists,
  artistExternalProfiles,
  artistGalleryAssets,
} from "../src/db/schema/artists";
import { releases, releaseArtists } from "../src/db/schema/releases";
import { videos } from "../src/db/schema/videos";
import { events } from "../src/db/schema/events";
import { galleryPhotos, galleryAlbums } from "../src/db/schema/gallery";
import { upcomingReleases } from "../src/db/schema/upcoming";
import { siteSettings } from "../src/db/schema/settings";
import { campaigns, campaignActions } from "../src/db/schema/campaigns";
import { beats, beatUnlocks } from "../src/db/schema/beats";
import { subscribers } from "../src/db/schema/subscribers";
import { curatedSpotifyChannels, curatedTracks } from "../src/db/schema/curated-channels";
import { artistPressKits, pressKitAudioTracks } from "../src/db/schema/epk";

// Environment setup
const DATABASE_URL = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (!DATABASE_URL || !DATABASE_AUTH_TOKEN) {
  console.error("❌ Missing database credentials. Set DATABASE_URL and DATABASE_AUTH_TOKEN.");
  process.exit(1);
}

// Create database client
const client = createClient({
  url: DATABASE_URL,
  authToken: DATABASE_AUTH_TOKEN,
});

const db = drizzle(client);

// Types for imported data
interface ExportedData {
  exportedAt: string;
  version: string;
  site: string;
  artists: any[];
  releases: any[];
  videos: any[];
  events: any[];
  gallery: any[];
  galleryAlbums: any[];
  upcomingReleases: any[];
  settings: any[];
  campaigns: any[];
  beats: any[];
  subscribers: any[];
  curatedChannels: any[];
  artistPressKits: any[];
}

// Helper to convert date strings to timestamps
function toTimestamp(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  return new Date(dateStr);
}

// Helper to safely parse JSON
function safeParseJson(json: string | null): any {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
}

async function importArtists(data: any[]) {
  console.log(`\n📥 Importing ${data.length} artists...`);

  for (const artist of data) {
    try {
      // Insert artist
      await db.insert(artists).values({
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        realName: artist.realName,
        bio: artist.bio,
        shortBio: artist.shortBio,
        role: artist.role || "mc",
        profileImageUrl: artist.profileImageUrl,
        featuredImageUrl: artist.featuredImageUrl,
        bannerImageUrl: artist.bannerImageUrl,
        tintColor: artist.tintColor,
        location: artist.location,
        country: artist.country,
        bookingEmail: artist.bookingEmail,
        managementEmail: artist.managementEmail,
        pressEmail: artist.pressEmail,
        websiteUrl: artist.websiteUrl,
        yearStarted: artist.yearStarted,
        genres: artist.genres,
        labels: artist.labels,
        monthlyListeners: artist.monthlyListeners,
        followers: artist.followers || 0,
        pressQuotes: artist.pressQuotes,
        featuredVideos: artist.featuredVideos,
        isActive: artist.isActive ?? true,
        isFeatured: artist.isFeatured ?? false,
        sortOrder: artist.sortOrder || 0,
        verificationStatus: artist.verificationStatus || "pending",
        identityConflictFlag: artist.identityConflictFlag ?? false,
        adminNotes: artist.adminNotes,
        createdAt: toTimestamp(artist.createdAt) || new Date(),
        updatedAt: toTimestamp(artist.updatedAt) || new Date(),
      }).onConflictDoNothing();

      // Insert external profiles
      if (artist.externalProfiles && Array.isArray(artist.externalProfiles)) {
        for (const profile of artist.externalProfiles) {
          await db.insert(artistExternalProfiles).values({
            id: profile.id,
            artistId: artist.id,
            platform: profile.platform,
            externalId: profile.externalId,
            externalUrl: profile.externalUrl,
            handle: profile.handle,
            displayName: profile.displayName,
            isVerified: profile.isVerified ?? false,
            isPrimary: profile.isPrimary ?? false,
            followerCount: profile.followerCount,
            lastSynced: toTimestamp(profile.lastSynced),
            createdAt: toTimestamp(profile.createdAt) || new Date(),
            updatedAt: toTimestamp(profile.updatedAt) || new Date(),
          }).onConflictDoNothing();
        }
      }

      // Insert gallery assets
      if (artist.galleryAssets && Array.isArray(artist.galleryAssets)) {
        for (const asset of artist.galleryAssets) {
          await db.insert(artistGalleryAssets).values({
            id: asset.id,
            artistId: artist.id,
            assetUrl: asset.assetUrl,
            thumbnailUrl: asset.thumbnailUrl,
            assetType: asset.assetType || "photo",
            caption: asset.caption,
            credit: asset.credit,
            isPublic: asset.isPublic ?? true,
            sortOrder: asset.sortOrder || 0,
            createdAt: toTimestamp(asset.createdAt) || new Date(),
            updatedAt: toTimestamp(asset.updatedAt) || new Date(),
          }).onConflictDoNothing();
        }
      }

      console.log(`  ✓ ${artist.name}`);
    } catch (error) {
      console.error(`  ✗ Error importing ${artist.name}:`, error);
    }
  }
}

async function importReleases(data: any[]) {
  console.log(`\n📥 Importing ${data.length} releases...`);

  for (const release of data) {
    try {
      // Map to schema columns only
      const releaseDate = toTimestamp(release.releaseDate);
      if (!releaseDate) {
        console.error(`  ⚠ Skipping ${release.title}: missing releaseDate`);
        continue;
      }

      await db.insert(releases).values({
        id: release.id,
        title: release.title,
        slug: release.slug,
        releaseType: release.releaseType || "single",
        coverImageUrl: release.coverImageUrl || release.coverUrl,
        releaseDate: releaseDate,
        description: release.description,
        spotifyUrl: release.spotifyUrl,
        spotifyId: release.spotifyId,
        appleMusicUrl: release.appleMusicUrl,
        youtubeMusicUrl: release.youtubeMusicUrl || release.youtubeUrl,
        isFeatured: release.isFeatured ?? false,
        isUpcoming: release.isUpcoming ?? false,
        createdAt: toTimestamp(release.createdAt) || new Date(),
        updatedAt: toTimestamp(release.updatedAt) || new Date(),
      }).onConflictDoNothing();

      // Import release artists
      if (release.artists && Array.isArray(release.artists)) {
        for (const ra of release.artists) {
          await db.insert(releaseArtists).values({
            id: ra.id,
            releaseId: release.id,
            artistId: ra.artistId,
            isPrimary: ra.isPrimary ?? (ra.role === "primary"),
            createdAt: toTimestamp(ra.createdAt) || new Date(),
          }).onConflictDoNothing();
        }
      }

      // Note: releaseTracks table doesn't exist in current schema - skipping import
      // Track-level data would need to be stored elsewhere or schema would need updates

      console.log(`  ✓ ${release.title}`);
    } catch (error) {
      console.error(`  ✗ Error importing ${release.title}:`, error);
    }
  }
}

async function importVideos(data: any[]) {
  console.log(`\n📥 Importing ${data.length} videos...`);

  for (const video of data) {
    try {
      await db.insert(videos).values({
        id: video.id,
        title: video.title,
        slug: video.slug,
        description: video.description,
        youtubeId: video.youtubeId,
        youtubeUrl: video.youtubeUrl,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        durationSeconds: video.durationSeconds,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        publishedAt: toTimestamp(video.publishedAt),
        videoType: video.videoType || "official_video",
        isVertical: video.isVertical ?? false,
        aspectRatio: video.aspectRatio,
        isFeatured: video.isFeatured ?? false,
        isActive: video.isActive ?? true,
        sortOrder: video.sortOrder || 0,
        artistId: video.artistId,
        artistName: video.artistName,
        releaseId: video.releaseId,
        channelId: video.channelId,
        channelTitle: video.channelTitle,
        tags: video.tags,
        createdAt: toTimestamp(video.createdAt) || new Date(),
        updatedAt: toTimestamp(video.updatedAt) || new Date(),
      }).onConflictDoNothing();

      console.log(`  ✓ ${video.title}`);
    } catch (error) {
      console.error(`  ✗ Error importing ${video.title}:`, error);
    }
  }
}

async function importEvents(data: any[]) {
  console.log(`\n📥 Importing ${data.length} events...`);

  for (const event of data) {
    try {
      await db.insert(events).values({
        id: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        eventDate: toTimestamp(event.eventDate),
        endDate: toTimestamp(event.endDate),
        venueName: event.venueName,
        venueAddress: event.venueAddress,
        city: event.city,
        country: event.country,
        ticketUrl: event.ticketUrl,
        ticketPrice: event.ticketPrice,
        currency: event.currency || "MXN",
        coverImageUrl: event.coverImageUrl,
        flyerUrl: event.flyerUrl,
        eventType: event.eventType || "concert",
        status: event.status || "upcoming",
        isFeatured: event.isFeatured ?? false,
        isActive: event.isActive ?? true,
        sortOrder: event.sortOrder || 0,
        artists: event.artists,
        createdAt: toTimestamp(event.createdAt) || new Date(),
        updatedAt: toTimestamp(event.updatedAt) || new Date(),
      }).onConflictDoNothing();

      console.log(`  ✓ ${event.title}`);
    } catch (error) {
      console.error(`  ✗ Error importing ${event.title}:`, error);
    }
  }
}

async function importGallery(photos: any[], albums: any[]) {
  console.log(`\n📥 Importing ${albums.length} gallery albums...`);

  for (const album of albums) {
    try {
      await db.insert(galleryAlbums).values({
        id: album.id,
        title: album.title,
        slug: album.slug,
        description: album.description,
        coverUrl: album.coverUrl,
        isPublic: album.isPublic ?? true,
        sortOrder: album.sortOrder || 0,
        createdAt: toTimestamp(album.createdAt) || new Date(),
        updatedAt: toTimestamp(album.updatedAt) || new Date(),
      }).onConflictDoNothing();

      console.log(`  ✓ Album: ${album.title}`);
    } catch (error) {
      console.error(`  ✗ Error importing album ${album.title}:`, error);
    }
  }

  console.log(`\n📥 Importing ${photos.length} gallery photos...`);

  for (const photo of photos) {
    try {
      await db.insert(galleryPhotos).values({
        id: photo.id,
        imageUrl: photo.imageUrl,
        thumbnailUrl: photo.thumbnailUrl,
        title: photo.title,
        caption: photo.caption,
        photographer: photo.photographer,
        photographerUrl: photo.photographerUrl,
        takenAt: toTimestamp(photo.takenAt),
        location: photo.location,
        albumId: photo.albumId,
        artistId: photo.artistId,
        eventId: photo.eventId,
        width: photo.width,
        height: photo.height,
        aspectRatio: photo.aspectRatio,
        dominantColor: photo.dominantColor,
        tags: photo.tags,
        isFeatured: photo.isFeatured ?? false,
        isPublic: photo.isPublic ?? true,
        sortOrder: photo.sortOrder || 0,
        createdAt: toTimestamp(photo.createdAt) || new Date(),
        updatedAt: toTimestamp(photo.updatedAt) || new Date(),
      }).onConflictDoNothing();

      console.log(`  ✓ Photo: ${photo.title || photo.id}`);
    } catch (error) {
      console.error(`  ✗ Error importing photo:`, error);
    }
  }
}

async function importUpcomingReleases(data: any[]) {
  console.log(`\n📥 Importing ${data.length} upcoming releases...`);

  for (const release of data) {
    try {
      const releaseDate = toTimestamp(release.releaseDate);
      if (!releaseDate) {
        console.error(`  ⚠ Skipping ${release.title}: missing releaseDate`);
        continue;
      }

      await db.insert(upcomingReleases).values({
        id: release.id,
        title: release.title,
        slug: release.slug,
        artistName: release.artistName || "Unknown",
        featuredArtists: release.featuredArtists,
        releaseType: release.releaseType || "single",
        description: release.description,
        coverImageUrl: release.coverImageUrl || release.coverUrl,
        bannerImageUrl: release.bannerImageUrl,
        backgroundColor: release.backgroundColor || "#000000",
        releaseDate: releaseDate,
        announceDate: toTimestamp(release.announceDate),
        rpmPresaveUrl: release.rpmPresaveUrl,
        spotifyPresaveUrl: release.spotifyPresaveUrl,
        appleMusicPresaveUrl: release.appleMusicPresaveUrl,
        deezerPresaveUrl: release.deezerPresaveUrl,
        tidalPresaveUrl: release.tidalPresaveUrl,
        amazonMusicPresaveUrl: release.amazonMusicPresaveUrl,
        youtubeMusicPresaveUrl: release.youtubeMusicPresaveUrl || release.youtubePremiereUrl,
        teaserVideoUrl: release.teaserVideoUrl,
        verticalVideoUrl: release.verticalVideoUrl,
        audioPreviewUrl: release.audioPreviewUrl || release.teaserAudioUrl || release.snippetUrl,
        isActive: release.isActive ?? true,
        isFeatured: release.isFeatured ?? false,
        showCountdown: release.showCountdown ?? true,
        presaveCount: release.presaveCount || 0,
        viewCount: release.viewCount || 0,
        releasedReleaseId: release.releasedReleaseId || release.convertedReleaseId,
        createdAt: toTimestamp(release.createdAt) || new Date(),
        updatedAt: toTimestamp(release.updatedAt) || new Date(),
      }).onConflictDoNothing();

      console.log(`  ✓ ${release.title}`);
    } catch (error) {
      console.error(`  ✗ Error importing ${release.title}:`, error);
    }
  }
}

async function importCampaigns(data: any[]) {
  console.log(`\n📥 Importing ${data.length} campaigns...`);

  for (const campaign of data) {
    try {
      await db.insert(campaigns).values({
        id: campaign.id,
        title: campaign.title,
        slug: campaign.slug,
        campaignType: campaign.campaignType || "presave",
        description: campaign.description,
        coverUrl: campaign.coverUrl,
        artistId: campaign.artistId,
        artistName: campaign.artistName,
        releaseId: campaign.releaseId,
        upcomingReleaseId: campaign.upcomingReleaseId,
        releaseDate: toTimestamp(campaign.releaseDate),
        spotifyUri: campaign.spotifyUri,
        spotifyUrl: campaign.spotifyUrl,
        appleMusicUrl: campaign.appleMusicUrl,
        youtubeUrl: campaign.youtubeUrl,
        deezerUrl: campaign.deezerUrl,
        tidalUrl: campaign.tidalUrl,
        soundcloudUrl: campaign.soundcloudUrl,
        bandcampUrl: campaign.bandcampUrl,
        customLinks: campaign.customLinks,
        thankYouMessage: campaign.thankYouMessage,
        callToAction: campaign.callToAction,
        backgroundStyle: campaign.backgroundStyle,
        themeColor: campaign.themeColor,
        isActive: campaign.isActive ?? true,
        startDate: toTimestamp(campaign.startDate),
        endDate: toTimestamp(campaign.endDate),
        totalClicks: campaign.totalClicks || 0,
        uniqueVisitors: campaign.uniqueVisitors || 0,
        conversions: campaign.conversions || 0,
        createdAt: toTimestamp(campaign.createdAt) || new Date(),
        updatedAt: toTimestamp(campaign.updatedAt) || new Date(),
      }).onConflictDoNothing();

      // Import campaign actions
      if (campaign.actions && Array.isArray(campaign.actions)) {
        for (const action of campaign.actions) {
          await db.insert(campaignActions).values({
            id: action.id,
            campaignId: campaign.id,
            platform: action.platform,
            actionType: action.actionType || "click",
            email: action.email,
            ipAddress: action.ipAddress,
            userAgent: action.userAgent,
            referrer: action.referrer,
            createdAt: toTimestamp(action.createdAt) || new Date(),
          }).onConflictDoNothing();
        }
      }

      console.log(`  ✓ ${campaign.title}`);
    } catch (error) {
      console.error(`  ✗ Error importing ${campaign.title}:`, error);
    }
  }
}

async function importBeats(data: any[]) {
  console.log(`\n📥 Importing ${data.length} beats...`);

  for (const beat of data) {
    try {
      await db.insert(beats).values({
        id: beat.id,
        title: beat.title,
        slug: beat.slug,
        producerId: beat.producerId,
        producerName: beat.producerName,
        description: beat.description,
        coverUrl: beat.coverUrl,
        previewUrl: beat.previewUrl,
        downloadUrl: beat.downloadUrl,
        bpm: beat.bpm,
        key: beat.key,
        genre: beat.genre,
        tags: beat.tags,
        duration: beat.duration,
        unlockType: beat.unlockType || "email",
        spotifyFollowArtistId: beat.spotifyFollowArtistId,
        requiredPlaylistId: beat.requiredPlaylistId,
        isActive: beat.isActive ?? true,
        isFeatured: beat.isFeatured ?? false,
        sortOrder: beat.sortOrder || 0,
        downloadCount: beat.downloadCount || 0,
        playCount: beat.playCount || 0,
        createdAt: toTimestamp(beat.createdAt) || new Date(),
        updatedAt: toTimestamp(beat.updatedAt) || new Date(),
      }).onConflictDoNothing();

      // Import beat unlocks
      if (beat.unlocks && Array.isArray(beat.unlocks)) {
        for (const unlock of beat.unlocks) {
          await db.insert(beatUnlocks).values({
            id: unlock.id,
            beatId: beat.id,
            email: unlock.email,
            ipAddress: unlock.ipAddress,
            userAgent: unlock.userAgent,
            verified: unlock.verified ?? false,
            downloadedAt: toTimestamp(unlock.downloadedAt),
            createdAt: toTimestamp(unlock.createdAt) || new Date(),
          }).onConflictDoNothing();
        }
      }

      console.log(`  ✓ ${beat.title}`);
    } catch (error) {
      console.error(`  ✗ Error importing ${beat.title}:`, error);
    }
  }
}

async function importSubscribers(data: any[]) {
  console.log(`\n📥 Importing ${data.length} subscribers...`);

  for (const sub of data) {
    try {
      await db.insert(subscribers).values({
        id: sub.id,
        email: sub.email,
        name: sub.name,
        status: sub.status || "active",
        source: sub.source || "website",
        tags: sub.tags,
        preferences: sub.preferences,
        ipAddress: sub.ipAddress,
        userAgent: sub.userAgent,
        confirmedAt: toTimestamp(sub.confirmedAt),
        unsubscribedAt: toTimestamp(sub.unsubscribedAt),
        createdAt: toTimestamp(sub.createdAt) || new Date(),
        updatedAt: toTimestamp(sub.updatedAt) || new Date(),
      }).onConflictDoNothing();
    } catch (error) {
      // Skip duplicate emails silently
    }
  }
  console.log(`  ✓ Imported subscribers`);
}

async function importCuratedChannels(data: any[]) {
  console.log(`\n📥 Importing ${data.length} curated channels...`);

  for (const channel of data) {
    try {
      // Map old field names to new schema
      const spotifyId = channel.spotifyArtistId || channel.artistId || channel.id;
      const spotifyUrl = channel.spotifyArtistUrl || channel.spotifyUrl || `https://open.spotify.com/artist/${spotifyId}`;

      await db.insert(curatedSpotifyChannels).values({
        id: channel.id,
        spotifyArtistId: spotifyId,
        spotifyArtistUrl: spotifyUrl,
        name: channel.name || channel.artistName || "Unknown",
        imageUrl: channel.imageUrl || channel.coverUrl,
        genres: typeof channel.genres === "string" ? channel.genres : (channel.genre ? JSON.stringify([channel.genre]) : null),
        popularity: channel.popularity,
        followers: channel.followers,
        category: channel.category || "roster",
        priority: channel.priority || channel.sortOrder || 0,
        description: channel.description,
        isActive: channel.isActive ?? true,
        lastSyncedAt: toTimestamp(channel.lastSyncedAt),
        createdAt: toTimestamp(channel.createdAt) || new Date(),
        updatedAt: toTimestamp(channel.updatedAt) || new Date(),
      }).onConflictDoNothing();

      // Import channel tracks
      if (channel.tracks && Array.isArray(channel.tracks)) {
        for (const track of channel.tracks) {
          await db.insert(curatedTracks).values({
            id: track.id,
            curatedChannelId: channel.id,
            spotifyTrackId: track.spotifyTrackId,
            spotifyTrackUrl: track.spotifyUrl || `https://open.spotify.com/track/${track.spotifyTrackId}`,
            name: track.title || track.name,
            artistName: track.artists || track.artistName || "Unknown",
            albumName: track.albumName,
            albumImageUrl: track.albumCoverUrl || track.albumImageUrl,
            durationMs: track.durationMs,
            previewUrl: track.previewUrl,
            isAvailableForPlaylist: track.isActive ?? true,
            isFeatured: false,
            addedAt: toTimestamp(track.createdAt) || new Date(),
            updatedAt: toTimestamp(track.updatedAt) || new Date(),
          }).onConflictDoNothing();
        }
      }

      console.log(`  ✓ ${channel.name}`);
    } catch (error) {
      console.error(`  ✗ Error importing ${channel.name}:`, error);
    }
  }
}

async function importArtistPressKits(data: any[]) {
  console.log(`\n📥 Importing ${data.length} artist press kits...`);

  for (const kit of data) {
    try {
      await db.insert(artistPressKits).values({
        id: kit.id,
        artistId: kit.artistId,
        headline: kit.headline,
        shortBio: kit.shortBio,
        fullBio: kit.fullBio,
        achievements: kit.achievements,
        pressQuotes: kit.pressQuotes,
        contactEmail: kit.contactEmail,
        bookingEmail: kit.bookingEmail,
        managementEmail: kit.managementEmail,
        pressEmail: kit.pressEmail,
        websiteUrl: kit.websiteUrl,
        techRider: kit.techRider,
        hospitalityRider: kit.hospitalityRider,
        customSections: kit.customSections,
        accentColor: kit.accentColor,
        fontStyle: kit.fontStyle,
        layoutStyle: kit.layoutStyle,
        isPublic: kit.isPublic ?? true,
        isActive: kit.isActive ?? true,
        viewCount: kit.viewCount || 0,
        downloadCount: kit.downloadCount || 0,
        lastViewedAt: toTimestamp(kit.lastViewedAt),
        createdAt: toTimestamp(kit.createdAt) || new Date(),
        updatedAt: toTimestamp(kit.updatedAt) || new Date(),
      }).onConflictDoNothing();

      // Import audio tracks
      if (kit.audioTracks && Array.isArray(kit.audioTracks)) {
        for (const track of kit.audioTracks) {
          await db.insert(pressKitAudioTracks).values({
            id: track.id,
            pressKitId: kit.id,
            title: track.title,
            audioUrl: track.audioUrl,
            duration: track.duration,
            releaseYear: track.releaseYear,
            sortOrder: track.sortOrder || 0,
            isActive: track.isActive ?? true,
            createdAt: toTimestamp(track.createdAt) || new Date(),
          }).onConflictDoNothing();
        }
      }

      console.log(`  ✓ Press kit for artist ${kit.artistId}`);
    } catch (error) {
      console.error(`  ✗ Error importing press kit:`, error);
    }
  }
}

async function importSettings(data: any[]) {
  console.log(`\n📥 Importing ${data.length} settings...`);

  for (const setting of data) {
    try {
      await db.insert(siteSettings).values({
        id: setting.id,
        key: setting.key,
        value: setting.value,
        type: setting.type || "string",
        category: setting.category || "general",
        description: setting.description,
        isPublic: setting.isPublic ?? false,
        createdAt: toTimestamp(setting.createdAt) || new Date(),
        updatedAt: toTimestamp(setting.updatedAt) || new Date(),
      }).onConflictDoNothing();
    } catch (error) {
      // Skip silently
    }
  }
  console.log(`  ✓ Imported settings`);
}

async function main() {
  console.log("🚀 Starting data import...\n");

  // Find export file
  const exportFiles = fs.readdirSync(".").filter(f => f.startsWith("sonido-liquido-export") && f.endsWith(".json"));

  if (exportFiles.length === 0) {
    console.error("❌ No export file found. Looking for: sonido-liquido-export-*.json");
    process.exit(1);
  }

  // Use the most recent export
  const exportFile = exportFiles.sort().reverse()[0];
  console.log(`📂 Using export file: ${exportFile}`);

  // Read and parse the file
  const fileContent = fs.readFileSync(exportFile, "utf-8");
  const data: ExportedData = JSON.parse(fileContent);

  console.log(`\n📊 Export Info:`);
  console.log(`   Site: ${data.site}`);
  console.log(`   Exported: ${data.exportedAt}`);
  console.log(`   Version: ${data.version}`);

  // Import in order (respecting foreign key constraints)
  try {
    // 1. Artists first (many tables reference them)
    if (data.artists?.length) {
      await importArtists(data.artists);
    }

    // 2. Releases (references artists)
    if (data.releases?.length) {
      await importReleases(data.releases);
    }

    // 3. Videos
    if (data.videos?.length) {
      await importVideos(data.videos);
    }

    // 4. Events
    if (data.events?.length) {
      await importEvents(data.events);
    }

    // 5. Gallery (photos and albums)
    await importGallery(data.gallery || [], data.galleryAlbums || []);

    // 6. Upcoming releases
    if (data.upcomingReleases?.length) {
      await importUpcomingReleases(data.upcomingReleases);
    }

    // 7. Campaigns
    if (data.campaigns?.length) {
      await importCampaigns(data.campaigns);
    }

    // 8. Beats
    if (data.beats?.length) {
      await importBeats(data.beats);
    }

    // 9. Subscribers
    if (data.subscribers?.length) {
      await importSubscribers(data.subscribers);
    }

    // 10. Curated channels
    if (data.curatedChannels?.length) {
      await importCuratedChannels(data.curatedChannels);
    }

    // 11. Artist press kits
    if (data.artistPressKits?.length) {
      await importArtistPressKits(data.artistPressKits);
    }

    // 12. Settings
    if (data.settings?.length) {
      await importSettings(data.settings);
    }

    console.log("\n✅ Import completed successfully!");

  } catch (error) {
    console.error("\n❌ Import failed:", error);
    process.exit(1);
  }
}

main();
