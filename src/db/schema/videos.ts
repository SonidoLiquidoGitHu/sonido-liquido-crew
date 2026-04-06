import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { artists } from "./artists";
import { releases } from "./releases";
// ===========================================
// YOUTUBE CHANNELS TABLE
// ===========================================
export const youtubeChannels = sqliteTable("youtube_channels", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull().unique(),
  channelName: text("channel_name").notNull(),
  channelUrl: text("channel_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  description: text("description"),
  subscriberCount: integer("subscriber_count"),
  videoCount: integer("video_count"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  artistId: text("artist_id").references(() => artists.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// VIDEOS TABLE
// ===========================================
export const videos = sqliteTable("videos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  youtubeId: text("youtube_id").notNull().unique(),
  youtubeUrl: text("youtube_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"),
  viewCount: integer("view_count"),
  publishedAt: integer("published_at", { mode: "timestamp" }),
  artistId: text("artist_id").references(() => artists.id, { onDelete: "set null" }),
  releaseId: text("release_id").references(() => releases.id, { onDelete: "set null" }),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// TYPE EXPORTS
export type Video = typeof videos.$inferSelect;
export type NewVideo = typeof videos.$inferInsert;
export type YoutubeChannel = typeof youtubeChannels.$inferSelect;
export type NewYoutubeChannel = typeof youtubeChannels.$inferInsert;
