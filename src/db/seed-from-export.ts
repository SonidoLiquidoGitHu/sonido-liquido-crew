import { config } from "dotenv";
config(); // Load .env file

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// ===========================================
// SEED FROM JSON EXPORT
// ===========================================

// Tables we'll seed (imported from schema)
const {
  artists,
  artistExternalProfiles,
  releases,
  releaseArtists,
  videos,
  youtubeChannels,
  events,
  siteSettings,
  subscribers,
  galleryAlbums,
  galleryPhotos,
  beats,
  campaigns,
  upcomingReleases,
  curatedSpotifyChannels,
  curatedTracks,
} = schema;

// Helper: convert ISO date string to Date object (or null)
function toDate(val: string | null | undefined): Date | null {
  if (!val) return null;
  return new Date(val);
}

// Helper: convert ISO date string to Date object (throws if missing)
function toDateRequired(val: string | null | undefined): Date {
  if (!val) throw new Error("Required date is missing");
  return new Date(val);
}

// Helper: safely convert string|null|undefined to string|null for text fields
function toStr(val: string | null | undefined): string | null {
  return val ?? null;
}

// Helper: safely convert number|null|undefined to number|null
function toInt(val: number | null | undefined): number | null {
  return val ?? null;
}

// Helper: safely convert boolean
function toBool(val: boolean | null | undefined): boolean {
  return val ?? false;
}

async function seedFromExport() {
  console.log("📦 Seeding database from JSON export...\n");

  // ---- Initialize DB client ----
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }
  console.log(`📁 Database URL: ${dbUrl}`);

  const client = createClient({
    url: dbUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  const db = drizzle(client, { schema });

  // ---- Load JSON export ----
  const exportPath =
    process.env.EXPORT_PATH ||
    "/home/z/my-project/upload/sonido-liquido-export-2026-04-03.json";
  console.log(`📄 Loading export: ${exportPath}`);

  if (!fs.existsSync(exportPath)) {
    console.error(`❌ Export file not found: ${exportPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(exportPath, "utf-8");
  const data = JSON.parse(rawData);
  console.log(
    `✅ Export loaded (version: ${data.version}, exported: ${data.exportedAt})\n`,
  );

  const counts: Record<string, number> = {};
  const errors: string[] = [];

  // =============================================
  // 1. SITE SETTINGS
  // =============================================
  console.log("⚙️  Seeding site settings...");
  try {
    const settingsValues = (data.settings || []).map((s: any) => ({
      id: s.id,
      key: s.key,
      value: toStr(s.value),
      type: s.type || "string",
      description: toStr(s.description),
      createdAt: toDateRequired(s.createdAt),
      updatedAt: toDateRequired(s.updatedAt),
    }));
    if (settingsValues.length > 0) {
      await db.insert(siteSettings).values(settingsValues);
    }
    counts.settings = settingsValues.length;
    console.log(`   ✓ ${settingsValues.length} settings`);
  } catch (e: any) {
    errors.push(`settings: ${e.message}`);
    console.error(`   ❌ ${e.message}`);
  }

  // =============================================
  // 2. ARTISTS (must come before related tables)
  // =============================================
  console.log("🎤 Seeding artists...");
  try {
    const artistValues = (data.artists || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      realName: toStr(a.realName),
      bio: toStr(a.bio),
      shortBio: toStr(a.shortBio),
      role: a.role || "mc",
      profileImageUrl: toStr(a.profileImageUrl),
      featuredImageUrl: toStr(a.featuredImageUrl),
      bannerImageUrl: toStr(a.bannerImageUrl),
      tintColor: toStr(a.tintColor),
      location: toStr(a.location),
      country: toStr(a.country),
      bookingEmail: toStr(a.bookingEmail),
      managementEmail: toStr(a.managementEmail),
      pressEmail: toStr(a.pressEmail),
      websiteUrl: toStr(a.websiteUrl),
      yearStarted: toInt(a.yearStarted),
      genres: toStr(a.genres),
      labels: toStr(a.labels),
      monthlyListeners: toInt(a.monthlyListeners),
      followers: a.followers ?? 0,
      pressQuotes: toStr(a.pressQuotes),
      featuredVideos: toStr(a.featuredVideos),
      isActive: toBool(a.isActive),
      isFeatured: toBool(a.isFeatured),
      sortOrder: a.sortOrder ?? 0,
      verificationStatus: a.verificationStatus || "pending",
      identityConflictFlag: toBool(a.identityConflictFlag),
      adminNotes: toStr(a.adminNotes),
      createdAt: toDateRequired(a.createdAt),
      updatedAt: toDateRequired(a.updatedAt),
    }));
    if (artistValues.length > 0) {
      await db.insert(artists).values(artistValues);
    }
    counts.artists = artistValues.length;
    console.log(`   ✓ ${artistValues.length} artists`);

    // 2b. Artist External Profiles (nested in artists)
    console.log("🔗 Seeding artist external profiles...");
    const profileValues: any[] = [];
    for (const artist of data.artists || []) {
      for (const p of artist.externalProfiles || []) {
        profileValues.push({
          id: p.id,
          artistId: p.artistId,
          platform: p.platform,
          externalId: toStr(p.externalId),
          externalUrl: p.externalUrl,
          handle: toStr(p.handle),
          displayName: toStr(p.displayName),
          isVerified: toBool(p.isVerified),
          isPrimary: p.isPrimary ?? false,
          followerCount: toInt(p.followerCount),
          lastSynced: toDate(p.lastSynced),
          createdAt: toDateRequired(p.createdAt),
          updatedAt: toDateRequired(p.updatedAt),
        });
      }
    }
    if (profileValues.length > 0) {
      await db.insert(artistExternalProfiles).values(profileValues);
    }
    counts.artistExternalProfiles = profileValues.length;
    console.log(`   ✓ ${profileValues.length} external profiles`);
  } catch (e: any) {
    errors.push(`artists: ${e.message}`);
    console.error(`   ❌ ${e.message}`);
  }

  // =============================================
  // 3. RELEASES + RELEASE ARTISTS
  // =============================================
  console.log("💿 Seeding releases...");
  try {
    const releaseValues = (data.releases || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      releaseType: r.releaseType || "single",
      releaseDate: toDateRequired(r.releaseDate),
      coverImageUrl: toStr(r.coverImageUrl),
      spotifyId: toStr(r.spotifyId),
      spotifyUrl: toStr(r.spotifyUrl),
      appleMusicUrl: toStr(r.appleMusicUrl),
      youtubeMusicUrl: toStr(r.youtubeMusicUrl),
      description: toStr(r.description),
      isUpcoming: toBool(r.isUpcoming),
      isFeatured: toBool(r.isFeatured),
      createdAt: toDateRequired(r.createdAt),
      updatedAt: toDateRequired(r.updatedAt),
    }));
    if (releaseValues.length > 0) {
      await db.insert(releases).values(releaseValues);
    }
    counts.releases = releaseValues.length;
    console.log(`   ✓ ${releaseValues.length} releases`);

    // 3b. Release Artists (nested in releases)
    console.log("🎵 Seeding release artists...");
    const releaseArtistValues: any[] = [];
    for (const release of data.releases || []) {
      for (const ra of release.artists || []) {
        releaseArtistValues.push({
          id: ra.id,
          releaseId: ra.releaseId,
          artistId: ra.artistId,
          isPrimary: toBool(ra.isPrimary),
          createdAt: toDateRequired(ra.createdAt),
        });
      }
    }
    if (releaseArtistValues.length > 0) {
      await db.insert(releaseArtists).values(releaseArtistValues);
    }
    counts.releaseArtists = releaseArtistValues.length;
    console.log(`   ✓ ${releaseArtistValues.length} release artists`);
  } catch (e: any) {
    errors.push(`releases: ${e.message}`);
    console.error(`   ❌ ${e.message}`);
  }

  // =============================================
  // 4. VIDEOS
  // =============================================
  console.log("🎬 Seeding videos...");
  try {
    const videoValues = (data.videos || []).map((v: any) => ({
      id: v.id,
      title: v.title,
      description: toStr(v.description),
      youtubeId: v.youtubeId,
      youtubeUrl: v.youtubeUrl,
      thumbnailUrl: toStr(v.thumbnailUrl),
      duration: toInt(v.duration),
      viewCount: toInt(v.viewCount),
      publishedAt: toDate(v.publishedAt),
      artistId: toStr(v.artistId),
      releaseId: toStr(v.releaseId),
      isFeatured: toBool(v.isFeatured),
      displayOrder: v.displayOrder ?? 0,
      createdAt: toDateRequired(v.createdAt),
      updatedAt: toDateRequired(v.updatedAt),
    }));
    if (videoValues.length > 0) {
      // Insert in batches of 50 to avoid potential issues
      const batchSize = 50;
      for (let i = 0; i < videoValues.length; i += batchSize) {
        const batch = videoValues.slice(i, i + batchSize);
        await db.insert(videos).values(batch);
      }
    }
    counts.videos = videoValues.length;
    console.log(`   ✓ ${videoValues.length} videos`);
  } catch (e: any) {
    errors.push(`videos: ${e.message}`);
    console.error(`   ❌ ${e.message}`);
  }

  // =============================================
  // 5. YOUTUBE CHANNELS
  // =============================================
  console.log("📺 Seeding YouTube channels...");
  try {
    const channelValues = (data.youtubeChannels || []).map((c: any) => ({
      id: c.id,
      channelId: c.channelId,
      channelName: c.channelName,
      channelUrl: c.channelUrl,
      thumbnailUrl: toStr(c.thumbnailUrl),
      description: toStr(c.description),
      subscriberCount: toInt(c.subscriberCount),
      videoCount: toInt(c.videoCount),
      isActive: toBool(c.isActive),
      displayOrder: c.displayOrder ?? 0,
      artistId: toStr(c.artistId),
      createdAt: toDateRequired(c.createdAt),
      updatedAt: toDateRequired(c.updatedAt),
    }));
    if (channelValues.length > 0) {
      await db.insert(youtubeChannels).values(channelValues);
    }
    counts.youtubeChannels = channelValues.length;
    console.log(`   ✓ ${channelValues.length} YouTube channels`);
  } catch (e: any) {
    errors.push(`youtubeChannels: ${e.message}`);
    console.error(`   ❌ ${e.message}`);
  }

  // =============================================
  // 6. EVENTS
  // =============================================
  console.log("📅 Seeding events...");
  try {
    const eventValues = (data.events || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      description: toStr(e.description),
      venue: e.venue,
      city: e.city,
      country: e.country || "México",
      eventDate: toDateRequired(e.eventDate),
      eventTime: toStr(e.eventTime),
      ticketUrl: toStr(e.ticketUrl),
      imageUrl: toStr(e.imageUrl),
      isFeatured: toBool(e.isFeatured),
      isCancelled: toBool(e.isCancelled),
      createdAt: toDateRequired(e.createdAt),
      updatedAt: toDateRequired(e.updatedAt),
    }));
    if (eventValues.length > 0) {
      await db.insert(events).values(eventValues);
    }
    counts.events = eventValues.length;
    console.log(`   ✓ ${eventValues.length} events`);
  } catch (e: any) {
    errors.push(`events: ${e.message}`);
    console.error(`   ❌ ${e.message}`);
  }

  // =============================================
  // 7. SUBSCRIBERS
  // =============================================
  console.log("📧 Seeding subscribers...");
  try {
    const subValues = (data.subscribers || []).map((s: any) => ({
      id: crypto.randomUUID(),
      email: s.email,
      name: toStr(s.name),
      isActive: toBool(s.isActive),
      mailchimpId: toStr(s.mailchimpId),
      source: toStr(s.source),
      subscribedAt: s.subscribedAt
        ? toDateRequired(s.subscribedAt)
        : new Date(),
      createdAt: s.createdAt ? toDateRequired(s.createdAt) : new Date(),
      updatedAt: s.updatedAt ? toDateRequired(s.updatedAt) : new Date(),
    }));
    if (subValues.length > 0) {
      await db.insert(subscribers).values(subValues);
    }
    counts.subscribers = subValues.length;
    console.log(`   ✓ ${subValues.length} subscribers`);
  } catch (e: any) {
    errors.push(`subscribers: ${e.message}`);
    console.error(`   ❌ ${e.message}`);
  }

  // =============================================
  // 8. GALLERY (albums + photos)
  // =============================================
  console.log("📸 Seeding gallery...");
  try {
    // Collect unique albums from gallery items
    const albumMap = new Map<string, any>();
    for (const g of data.gallery || []) {
      if (g.albumId && !albumMap.has(g.albumId)) {
        albumMap.set(g.albumId, {
          id: g.albumId,
          title: g.albumTitle || `Album ${g.albumId}`,
          slug: g.albumSlug || `album-${g.albumId}`,
          description: toStr(g.albumDescription),
          isPublished: true,
          sortOrder: 0,
          createdAt: g.createdAt ? toDateRequired(g.createdAt) : new Date(),
          updatedAt: g.updatedAt ? toDateRequired(g.updatedAt) : new Date(),
        });
      }
    }

    const albumValues = Array.from(albumMap.values());
    if (albumValues.length > 0) {
      await db.insert(galleryAlbums).values(albumValues);
    }

    const photoValues = (data.gallery || []).map((g: any) => ({
      id: g.id,
      title: toStr(g.title),
      description: toStr(g.description),
      imageUrl: g.imageUrl,
      thumbnailUrl: toStr(g.thumbnailUrl),
      width: toInt(g.width),
      height: toInt(g.height),
      fileSize: toInt(g.fileSize),
      mimeType: toStr(g.mimeType),
      albumId: toStr(g.albumId),
      artistId: toStr(g.artistId),
      photographer: toStr(g.photographer),
      location: toStr(g.location),
      takenAt: toDate(g.takenAt),
      isFeatured: toBool(g.isFeatured),
      isPublished: toBool(g.isPublished),
      sortOrder: g.sortOrder ?? 0,
      altText: toStr(g.altText),
      createdAt: toDateRequired(g.createdAt),
      updatedAt: toDateRequired(g.updatedAt),
    }));
    if (photoValues.length > 0) {
      await db.insert(galleryPhotos).values(photoValues);
    }
    counts.galleryAlbums = albumValues.length;
    counts.galleryPhotos = photoValues.length;
    console.log(
      `   ✓ ${albumValues.length} albums, ${photoValues.length} photos`,
    );
  } catch (e: any) {
    errors.push(`gallery: ${e.message}`);
    console.error(`   ❌ ${e.message}`);
  }

  // =============================================
  // 9. BEATS
  // =============================================
  console.log("🥁 Seeding beats...");
  try {
    const beatValues = (data.beats || []).map((b: any) => ({
      id: b.id,
      title: b.title,
      slug: b.slug,
      description: toStr(b.description),
      producerId: toStr(b.producerId),
      producerName: toStr(b.producerName),
      bpm: toInt(b.bpm),
      key: toStr(b.key),
      genre: toStr(b.genre),
      tags: b.tags || null,
      duration: toInt(b.duration),
      previewAudioUrl: toStr(b.previewAudioUrl),
      fullAudioUrl: toStr(b.fullAudioUrl),
      stemPackUrl: toStr(b.stemPackUrl),
      coverImageUrl: toStr(b.coverImageUrl),
      waveformImageUrl: toStr(b.waveformImageUrl),
      previewVideoUrl: toStr(b.previewVideoUrl),
      youtubeVideoId: toStr(b.youtubeVideoId),
      videoIsVertical: toBool(b.videoIsVertical),
      isFree: toBool(b.isFree),
      price: b.price ?? null,
      currency: toStr(b.currency),
      gateEnabled: toBool(b.gateEnabled),
      requireEmail: toBool(b.requireEmail),
      requireSpotifyFollow: toBool(b.requireSpotifyFollow),
      spotifyArtistUrl: toStr(b.spotifyArtistUrl),
      requireSpotifyPlay: toBool(b.requireSpotifyPlay),
      spotifySongUrl: toStr(b.spotifySongUrl),
      spotifySongId: toStr(b.spotifySongId),
      requireHyperfollow: toBool(b.requireHyperfollow),
      hyperfollowUrl: toStr(b.hyperfollowUrl),
      requireInstagramShare: toBool(b.requireInstagramShare),
      instagramShareText: toStr(b.instagramShareText),
      requireFacebookShare: toBool(b.requireFacebookShare),
      facebookShareText: toStr(b.facebookShareText),
      requireCustomAction: toBool(b.requireCustomAction),
      customActionLabel: toStr(b.customActionLabel),
      customActionUrl: toStr(b.customActionUrl),
      customActionInstructions: toStr(b.customActionInstructions),
      isActive: toBool(b.isActive),
      isFeatured: toBool(b.isFeatured),
      playCount: b.playCount ?? 0,
      downloadCount: b.downloadCount ?? 0,
      viewCount: b.viewCount ?? 0,
      metadata: b.metadata || null,
      styleSettings: b.styleSettings || null,
      createdAt: toDateRequired(b.createdAt),
      updatedAt: toDateRequired(b.updatedAt),
    }));
    if (beatValues.length > 0) {
      await db.insert(beats).values(beatValues);
    }
    counts.beats = beatValues.length;
    console.log(`   ✓ ${beatValues.length} beats`);
  } catch (e: any) {
    errors.push(`beats: ${e.message}`);
    console.error(`   ❌ ${e.message}`);
  }

  // =============================================
  // 10. CAMPAIGNS
  // =============================================
  console.log("📢 Seeding campaigns...");
  try {
    const campaignValues = (data.campaigns || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: toStr(c.description),
      campaignType: c.campaignType || "presave",
      artistId: toStr(c.artistId),
      releaseId: toStr(c.releaseId),
      coverImageUrl: toStr(c.coverImageUrl),
      bannerImageUrl: toStr(c.bannerImageUrl),
      smartLinkUrl: toStr(c.smartLinkUrl),
      oneRpmUrl: toStr(c.oneRpmUrl),
      spotifyPresaveUrl: toStr(c.spotifyPresaveUrl),
      appleMusicPresaveUrl: toStr(c.appleMusicPresaveUrl),
      downloadGateEnabled: toBool(c.downloadGateEnabled),
      downloadFileUrl: toStr(c.downloadFileUrl),
      downloadFileName: toStr(c.downloadFileName),
      previewAudioUrl: toStr(c.previewAudioUrl),
      previewVideoUrl: toStr(c.previewVideoUrl),
      youtubeVideoId: toStr(c.youtubeVideoId),
      videoIsVertical: toBool(c.videoIsVertical),
      requireSpotifyFollow: toBool(c.requireSpotifyFollow),
      spotifyArtistUrl: toStr(c.spotifyArtistUrl),
      requireSpotifyPresave: toBool(c.requireSpotifyPresave),
      requireEmail: toBool(c.requireEmail),
      isActive: toBool(c.isActive),
      isFeatured: toBool(c.isFeatured),
      startDate: toDate(c.startDate),
      endDate: toDate(c.endDate),
      releaseDate: toDate(c.releaseDate),
      totalViews: c.totalViews ?? 0,
      totalConversions: c.totalConversions ?? 0,
      totalDownloads: c.totalDownloads ?? 0,
      metadata: c.metadata || null,
      styleSettings: c.styleSettings || null,
      createdAt: toDateRequired(c.createdAt),
      updatedAt: toDateRequired(c.updatedAt),
    }));
    if (campaignValues.length > 0) {
      await db.insert(campaigns).values(campaignValues);
    }
    counts.campaigns = campaignValues.length;
    console.log(`   ✓ ${campaignValues.length} campaigns`);
  } catch (e: any) {
    errors.push(`campaigns: ${e.message}`);
    console.error(`   ❌ ${e.message}`);
  }

  // =============================================
  // 11. UPCOMING RELEASES
  // =============================================
  console.log("🔜 Seeding upcoming releases...");
  try {
    const upcomingValues = (data.upcomingReleases || []).map((u: any) => ({
      id: u.id,
      title: u.title,
      slug: u.slug,
      artistName: u.artistName,
      featuredArtists: toStr(u.featuredArtists),
      releaseType: u.releaseType || "single",
      description: toStr(u.description),
      coverImageUrl: toStr(u.coverImageUrl),
      bannerImageUrl: toStr(u.bannerImageUrl),
      backgroundColor: toStr(u.backgroundColor),
      releaseDate: toDateRequired(u.releaseDate),
      announceDate: toDate(u.announceDate),
      rpmPresaveUrl: toStr(u.rpmPresaveUrl),
      spotifyPresaveUrl: toStr(u.spotifyPresaveUrl),
      appleMusicPresaveUrl: toStr(u.appleMusicPresaveUrl),
      deezerPresaveUrl: toStr(u.deezerPresaveUrl),
      tidalPresaveUrl: toStr(u.tidalPresaveUrl),
      amazonMusicPresaveUrl: toStr(u.amazonMusicPresaveUrl),
      youtubeMusicPresaveUrl: toStr(u.youtubeMusicPresaveUrl),
      teaserVideoUrl: toStr(u.teaserVideoUrl),
      verticalVideoUrl: toStr(u.verticalVideoUrl),
      audioPreviewUrl: toStr(u.audioPreviewUrl),
      isActive: toBool(u.isActive),
      isFeatured: toBool(u.isFeatured),
      showCountdown: toBool(u.showCountdown),
      presaveCount: u.presaveCount ?? 0,
      viewCount: u.viewCount ?? 0,
      releasedReleaseId: toStr(u.releasedReleaseId),
      createdAt: toDateRequired(u.createdAt),
      updatedAt: toDateRequired(u.updatedAt),
    }));
    if (upcomingValues.length > 0) {
      await db.insert(upcomingReleases).values(upcomingValues);
    }
    counts.upcomingReleases = upcomingValues.length;
    console.log(`   ✓ ${upcomingValues.length} upcoming releases`);
  } catch (e: any) {
    errors.push(`upcomingReleases: ${e.message}`);
    console.error(`   ❌ ${e.message}`);
  }

  // =============================================
  // 12. CURATED SPOTIFY CHANNELS
  // =============================================
  console.log("🎵 Seeding curated channels...");
  try {
    const channelValues = (data.curatedChannels || []).map((c: any) => ({
      id: c.id,
      spotifyArtistId: c.spotifyArtistId,
      spotifyArtistUrl: c.spotifyArtistUrl,
      name: c.name,
      imageUrl: toStr(c.imageUrl),
      genres: toStr(c.genres),
      popularity: toInt(c.popularity),
      followers: toInt(c.followers),
      category: c.category || "roster",
      priority: c.priority ?? 0,
      description: toStr(c.description),
      autoSync: toBool(c.autoSync),
      syncNewReleases: toBool(c.syncNewReleases),
      syncTopTracks: toBool(c.syncTopTracks),
      isActive: toBool(c.isActive),
      lastSyncedAt: toDate(c.lastSyncedAt),
      createdAt: toDateRequired(c.createdAt),
      updatedAt: toDateRequired(c.updatedAt),
    }));
    if (channelValues.length > 0) {
      await db.insert(curatedSpotifyChannels).values(channelValues);
    }
    counts.curatedSpotifyChannels = channelValues.length;
    console.log(`   ✓ ${channelValues.length} curated channels`);
  } catch (e: any) {
    errors.push(`curatedChannels: ${e.message}`);
    console.error(`   ❌ ${e.message}`);
  }

  // =============================================
  // 13. CURATED TRACKS (batch insert)
  // =============================================
  console.log("🎶 Seeding curated tracks...");
  try {
    const trackValues = (data.curatedTracks || []).map((t: any) => ({
      id: t.id,
      spotifyTrackId: t.spotifyTrackId,
      spotifyTrackUrl: t.spotifyTrackUrl,
      spotifyAlbumId: toStr(t.spotifyAlbumId),
      name: t.name,
      artistName: t.artistName,
      artistIds: toStr(t.artistIds),
      albumName: toStr(t.albumName),
      albumImageUrl: toStr(t.albumImageUrl),
      durationMs: toInt(t.durationMs),
      previewUrl: toStr(t.previewUrl),
      releaseDate: toStr(t.releaseDate),
      popularity: toInt(t.popularity),
      explicit: toBool(t.explicit),
      curatedChannelId: toStr(t.curatedChannelId),
      isAvailableForPlaylist: toBool(t.isAvailableForPlaylist),
      isFeatured: toBool(t.isFeatured),
      adminNotes: toStr(t.adminNotes),
      addedAt: toDateRequired(t.addedAt),
      updatedAt: toDateRequired(t.updatedAt),
    }));
    if (trackValues.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < trackValues.length; i += batchSize) {
        const batch = trackValues.slice(i, i + batchSize);
        await db.insert(curatedTracks).values(batch);
      }
    }
    counts.curatedTracks = trackValues.length;
    console.log(`   ✓ ${trackValues.length} curated tracks`);
  } catch (e: any) {
    errors.push(`curatedTracks: ${e.message}`);
    console.error(`   ❌ ${e.message}`);
  }

  // =============================================
  // SUMMARY
  // =============================================
  console.log(`\n${"=".repeat(50)}`);
  console.log("📊 SEED SUMMARY");
  console.log("=".repeat(50));
  for (const [table, count] of Object.entries(counts)) {
    console.log(`   • ${table}: ${count} records`);
  }

  if (errors.length > 0) {
    console.log("\n⚠️  ERRORS ENCOUNTERED:");
    for (const err of errors) {
      console.log(`   • ${err}`);
    }
  }

  console.log("\n✅ Seed from export complete!");

  client.close();
}

seedFromExport().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
