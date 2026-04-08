import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { artists } from "./artists";
import { releases } from "./releases";

// ===========================================
// CAMPAIGNS TABLE (Campañas)
// ===========================================

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),

  // Campaign type
  campaignType: text("campaign_type", {
    enum: ["presave", "hyperfollow", "smartlink", "contest", "download"]
  }).notNull().default("presave"),

  // Related content
  artistId: text("artist_id").references(() => artists.id, { onDelete: "set null" }),
  releaseId: text("release_id").references(() => releases.id, { onDelete: "set null" }),

  // Visual assets
  coverImageUrl: text("cover_image_url"),
  bannerImageUrl: text("banner_image_url"),

  // Smart links (OneRPM, etc.)
  smartLinkUrl: text("smart_link_url"), // Main smart link URL
  oneRpmUrl: text("onerpm_url"), // OneRPM specific URL
  spotifyPresaveUrl: text("spotify_presave_url"),
  appleMusicPresaveUrl: text("apple_music_presave_url"),

  // Download gate settings
  downloadGateEnabled: integer("download_gate_enabled", { mode: "boolean" }).notNull().default(false),
  downloadFileUrl: text("download_file_url"), // File to download after completing actions
  downloadFileName: text("download_file_name"),
  previewAudioUrl: text("preview_audio_url"), // Audio preview for unlock landing page
  previewVideoUrl: text("preview_video_url"), // Video preview for unlock landing page
  youtubeVideoId: text("youtube_video_id"), // YouTube video ID for embed
  videoIsVertical: integer("video_is_vertical", { mode: "boolean" }).default(false), // For TikTok/Reels style videos

  // Required actions
  requireSpotifyFollow: integer("require_spotify_follow", { mode: "boolean" }).notNull().default(false),
  spotifyArtistUrl: text("spotify_artist_url"),
  requireSpotifyPresave: integer("require_spotify_presave", { mode: "boolean" }).notNull().default(false),
  requireEmail: integer("require_email", { mode: "boolean" }).notNull().default(true),

  // Campaign status
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),

  // Scheduling
  startDate: integer("start_date", { mode: "timestamp" }),
  endDate: integer("end_date", { mode: "timestamp" }),
  releaseDate: integer("release_date", { mode: "timestamp" }), // For presave campaigns

  // Analytics
  totalViews: integer("total_views").notNull().default(0),
  totalConversions: integer("total_conversions").notNull().default(0),
  totalDownloads: integer("total_downloads").notNull().default(0),

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
// CAMPAIGN ACTIONS TABLE
// ===========================================

export const campaignActions = sqliteTable("campaign_actions", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),

  // User info
  email: text("email"),
  spotifyUserId: text("spotify_user_id"),

  // Actions completed
  completedPresave: integer("completed_presave", { mode: "boolean" }).notNull().default(false),
  completedFollow: integer("completed_follow", { mode: "boolean" }).notNull().default(false),
  completedDownload: integer("completed_download", { mode: "boolean" }).notNull().default(false),

  // Tracking
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),

  // Timestamps
  presavedAt: integer("presaved_at", { mode: "timestamp" }),
  followedAt: integer("followed_at", { mode: "timestamp" }),
  downloadedAt: integer("downloaded_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// TYPE EXPORTS
// ===========================================

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type CampaignAction = typeof campaignActions.$inferSelect;
export type NewCampaignAction = typeof campaignActions.$inferInsert;
