import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const upcomingReleases = sqliteTable("upcoming_releases", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  artistName: text("artist_name").notNull(),
  featuredArtists: text("featured_artists"),
  releaseType: text("release_type", {
    enum: ["single", "maxi-single", "ep", "album", "compilation", "mixtape"]
  }).notNull().default("single"),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  bannerImageUrl: text("banner_image_url"),
  backgroundColor: text("background_color").default("#000000"),
  releaseDate: integer("release_date", { mode: "timestamp" }).notNull(),
  announceDate: integer("announce_date", { mode: "timestamp" }),
  rpmPresaveUrl: text("rpm_presave_url"),
  spotifyPresaveUrl: text("spotify_presave_url"),
  appleMusicPresaveUrl: text("apple_music_presave_url"),
  deezerPresaveUrl: text("deezer_presave_url"),
  tidalPresaveUrl: text("tidal_presave_url"),
  amazonMusicPresaveUrl: text("amazon_music_presave_url"),
  youtubeMusicPresaveUrl: text("youtube_music_presave_url"),
  teaserVideoUrl: text("teaser_video_url"),
  verticalVideoUrl: text("vertical_video_url"),
  audioPreviewUrl: text("audio_preview_url"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  showCountdown: integer("show_countdown", { mode: "boolean" }).notNull().default(true),
  presaveCount: integer("presave_count").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  releasedReleaseId: text("released_release_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const presaveSubscribers = sqliteTable("presave_subscribers", {
  id: text("id").primaryKey(),
  upcomingReleaseId: text("upcoming_release_id").notNull().references(() => upcomingReleases.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  subscribedAt: integer("subscribed_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  notified: integer("notified", { mode: "boolean" }).notNull().default(false),
});

export const presaveClicks = sqliteTable("presave_clicks", {
  id: text("id").primaryKey().default(sql`(lower(hex(randomblob(16))))`),
  upcomingReleaseId: text("upcoming_release_id").notNull(),
  platform: text("platform").notNull(),
  source: text("source").notNull().default("website"),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  ipHash: text("ip_hash"),
  clickedAt: text("clicked_at").default(sql`(datetime('now'))`),
});

export type UpcomingRelease = typeof upcomingReleases.$inferSelect;
export type NewUpcomingRelease = typeof upcomingReleases.$inferInsert;
export type PresaveSubscriber = typeof presaveSubscribers.$inferSelect;
export type NewPresaveSubscriber = typeof presaveSubscribers.$inferInsert;
export type PresaveClick = typeof presaveClicks.$inferSelect;
