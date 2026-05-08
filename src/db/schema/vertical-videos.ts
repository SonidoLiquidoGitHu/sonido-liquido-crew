import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";
import { artists } from "./artists";
import { tags } from "./tags";

// ===========================================
// VERTICAL VIDEOS TABLE (9:16 Reels / Shorts)
// ===========================================

export const verticalVideos = sqliteTable("vertical_videos", {
  id: text("id").primaryKey(),
  title: text("title"),
  description: text("description"),

  // Video source - can be a direct URL (Dropbox), YouTube Shorts, Instagram Reel, TikTok
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),

  // Video metadata
  duration: integer("duration"), // in seconds
  width: integer("width"),
  height: integer("height"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),

  // Source platform info
  platform: text("platform"), // "youtube", "instagram", "tiktok", "dropbox", "direct"
  platformId: text("platform_id"), // e.g. YouTube video ID, TikTok video ID
  platformUrl: text("platform_url"), // original URL on the platform
  embedUrl: text("embed_url"), // embeddable URL if available

  // Associations
  artistId: text("artist_id").references(() => artists.id, { onDelete: "set null" }),

  // Display settings
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),

  // Share tracking
  shareCount: integer("share_count").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// VERTICAL VIDEO TAGS JUNCTION TABLE
// ===========================================

export const verticalVideoTags = sqliteTable("vertical_video_tags", {
  id: text("id").primaryKey(),
  videoId: text("video_id").notNull().references(() => verticalVideos.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// RELATIONS
// ===========================================

export const verticalVideosRelations = relations(verticalVideos, ({ one, many }) => ({
  artist: one(artists, {
    fields: [verticalVideos.artistId],
    references: [artists.id],
  }),
  videoTags: many(verticalVideoTags),
}));

export const verticalVideoTagsRelations = relations(verticalVideoTags, ({ one }) => ({
  video: one(verticalVideos, {
    fields: [verticalVideoTags.videoId],
    references: [verticalVideos.id],
  }),
  tag: one(tags, {
    fields: [verticalVideoTags.tagId],
    references: [tags.id],
  }),
}));

// ===========================================
// TYPE EXPORTS
// ===========================================

export type VerticalVideo = typeof verticalVideos.$inferSelect;
export type NewVerticalVideo = typeof verticalVideos.$inferInsert;
export type VerticalVideoTag = typeof verticalVideoTags.$inferSelect;
