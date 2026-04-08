import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { artists } from "./artists";

// ===========================================
// BEATS TABLE
// ===========================================

export const beats = sqliteTable("beats", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),

  // Producer/Artist info
  producerId: text("producer_id").references(() => artists.id, { onDelete: "set null" }),
  producerName: text("producer_name"), // Fallback if no linked artist

  // Audio info
  bpm: integer("bpm"),
  key: text("key"), // e.g., "C minor", "G major"
  genre: text("genre"),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  duration: integer("duration"), // in seconds

  // Files
  previewAudioUrl: text("preview_audio_url"), // Short preview
  fullAudioUrl: text("full_audio_url"), // Full beat (behind gate)
  stemPackUrl: text("stem_pack_url"), // Stems package (premium)
  coverImageUrl: text("cover_image_url"),
  waveformImageUrl: text("waveform_image_url"),

  // Video content (exclusive video gate)
  previewVideoUrl: text("preview_video_url"), // Exclusive video
  youtubeVideoId: text("youtube_video_id"), // YouTube video ID for embed
  videoIsVertical: integer("video_is_vertical", { mode: "boolean" }).default(false), // For TikTok/Reels style

  // Pricing (optional for free beats)
  isFree: integer("is_free", { mode: "boolean" }).notNull().default(true),
  price: real("price"),
  currency: text("currency").default("USD"),

  // Download gate configuration
  gateEnabled: integer("gate_enabled", { mode: "boolean" }).notNull().default(true),

  // Required actions for download
  requireEmail: integer("require_email", { mode: "boolean" }).notNull().default(true),
  requireSpotifyFollow: integer("require_spotify_follow", { mode: "boolean" }).notNull().default(false),
  spotifyArtistUrl: text("spotify_artist_url"), // Artist to follow

  requireSpotifyPlay: integer("require_spotify_play", { mode: "boolean" }).notNull().default(false),
  spotifySongUrl: text("spotify_song_url"), // Song to play
  spotifySongId: text("spotify_song_id"),

  requireHyperfollow: integer("require_hyperfollow", { mode: "boolean" }).notNull().default(false),
  hyperfollowUrl: text("hyperfollow_url"), // OneRPM smart link

  requireInstagramShare: integer("require_instagram_share", { mode: "boolean" }).notNull().default(false),
  instagramShareText: text("instagram_share_text"),

  requireFacebookShare: integer("require_facebook_share", { mode: "boolean" }).notNull().default(false),
  facebookShareText: text("facebook_share_text"),

  // Custom action (flexible)
  requireCustomAction: integer("require_custom_action", { mode: "boolean" }).notNull().default(false),
  customActionLabel: text("custom_action_label"),
  customActionUrl: text("custom_action_url"),
  customActionInstructions: text("custom_action_instructions"),

  // Status
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),

  // Analytics
  playCount: integer("play_count").notNull().default(0),
  downloadCount: integer("download_count").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),

  // Metadata
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),

  // Visual customization settings (JSON)
  styleSettings: text("style_settings", { mode: "json" }).$type<{
    colorPreset?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    textColor?: string;
    titleFont?: string;
    bodyFont?: string;
    titleStyle?: string;
    backgroundStyle?: string;
    backgroundImageUrl?: string;
    backgroundOverlayOpacity?: number;
    enableGlow?: boolean;
    enableAnimations?: boolean;
    enableParticles?: boolean;
    buttonStyle?: "solid" | "gradient" | "outline" | "glass";
    buttonRounded?: "none" | "sm" | "md" | "lg" | "full";
  }>(),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// BEAT DOWNLOADS TABLE
// ===========================================

export const beatDownloads = sqliteTable("beat_downloads", {
  id: text("id").primaryKey(),
  beatId: text("beat_id").notNull().references(() => beats.id, { onDelete: "cascade" }),

  // User info
  email: text("email"),
  name: text("name"),

  // Actions completed
  completedSpotifyFollow: integer("completed_spotify_follow", { mode: "boolean" }).notNull().default(false),
  completedSpotifyPlay: integer("completed_spotify_play", { mode: "boolean" }).notNull().default(false),
  completedHyperfollow: integer("completed_hyperfollow", { mode: "boolean" }).notNull().default(false),
  completedInstagramShare: integer("completed_instagram_share", { mode: "boolean" }).notNull().default(false),
  completedFacebookShare: integer("completed_facebook_share", { mode: "boolean" }).notNull().default(false),
  completedCustomAction: integer("completed_custom_action", { mode: "boolean" }).notNull().default(false),

  // Download info
  downloadedAt: integer("downloaded_at", { mode: "timestamp" }),
  downloadCount: integer("download_count").notNull().default(0),

  // Tracking
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// TYPE EXPORTS
// ===========================================

export type Beat = typeof beats.$inferSelect;
export type NewBeat = typeof beats.$inferInsert;
export type BeatDownload = typeof beatDownloads.$inferSelect;
export type NewBeatDownload = typeof beatDownloads.$inferInsert;
