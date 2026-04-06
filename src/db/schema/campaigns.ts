import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { artists } from "./artists";
import { releases } from "./releases";

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  campaignType: text("campaign_type", {
    enum: ["presave", "hyperfollow", "smartlink", "contest", "download"]
  }).notNull().default("presave"),
  artistId: text("artist_id").references(() => artists.id, { onDelete: "set null" }),
  releaseId: text("release_id").references(() => releases.id, { onDelete: "set null" }),
  coverImageUrl: text("cover_image_url"),
  bannerImageUrl: text("banner_image_url"),
  smartLinkUrl: text("smart_link_url"),
  oneRpmUrl: text("onerpm_url"),
  spotifyPresaveUrl: text("spotify_presave_url"),
  appleMusicPresaveUrl: text("apple_music_presave_url"),
  downloadGateEnabled: integer("download_gate_enabled", { mode: "boolean" }).notNull().default(false),
  downloadFileUrl: text("download_file_url"),
  downloadFileName: text("download_file_name"),
  previewAudioUrl: text("preview_audio_url"),
  previewVideoUrl: text("preview_video_url"),
  youtubeVideoId: text("youtube_video_id"),
  videoIsVertical: integer("video_is_vertical", { mode: "boolean" }).default(false),
  requireSpotifyFollow: integer("require_spotify_follow", { mode: "boolean" }).notNull().default(false),
  spotifyArtistUrl: text("spotify_artist_url"),
  requireSpotifyPresave: integer("require_spotify_presave", { mode: "boolean" }).notNull().default(false),
  requireEmail: integer("require_email", { mode: "boolean" }).notNull().default(true),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  startDate: integer("start_date", { mode: "timestamp" }),
  endDate: integer("end_date", { mode: "timestamp" }),
  releaseDate: integer("release_date", { mode: "timestamp" }),
  totalViews: integer("total_views").notNull().default(0),
  totalConversions: integer("total_conversions").notNull().default(0),
  totalDownloads: integer("total_downloads").notNull().default(0),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  styleSettings: text("style_settings", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const campaignActions = sqliteTable("campaign_actions", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id, { onDelete: "cascade" }),
  email: text("email"),
  spotifyUserId: text("spotify_user_id"),
  completedPresave: integer("completed_presave", { mode: "boolean" }).notNull().default(false),
  completedFollow: integer("completed_follow", { mode: "boolean" }).notNull().default(false),
  completedDownload: integer("completed_download", { mode: "boolean" }).notNull().default(false),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  presavedAt: integer("presaved_at", { mode: "timestamp" }),
  followedAt: integer("followed_at", { mode: "timestamp" }),
  downloadedAt: integer("downloaded_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type CampaignAction = typeof campaignActions.$inferSelect;
export type NewCampaignAction = typeof campaignActions.$inferInsert;
