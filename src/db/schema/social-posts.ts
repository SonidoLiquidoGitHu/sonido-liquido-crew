import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ===========================================
// SOCIAL POST QUEUE TABLE
// ===========================================
// Items queued for auto-posting to FB/IG.
// No-repeat logic: WHERE status = 'pending' ORDER BY queue_order
// When all items in a cycle are posted, cycle_number increments and
// statuses reset to 'pending' for a new round.

export const socialPostQueue = sqliteTable("social_post_queue", {
  id: text("id").primaryKey(),

  // Content source — which entity this post promotes
  contentType: text("content_type", {
    enum: ["gallery_photo", "spotify_track", "artist_profile", "curated_track", "vertical_video"],
  }).notNull(),

  // Reference to the source entity (gallery_photo_id, release_id, or artist_id)
  sourceId: text("source_id").notNull(),

  // Optional artist reference (for caption enrichment)
  artistId: text("artist_id"),

  // Optional release reference (for track posts)
  releaseId: text("release_id"),

  // Image URL to post (required for IG — API only supports feed image posts)
  imageUrl: text("image_url").notNull(),

  // Pre-generated caption for this item
  caption: text("caption"),

  // Link back to sonidoliquido.com page
  linkUrl: text("link_url"),

  // Scheduling & rotation
  queueOrder: integer("queue_order").notNull().default(0),
  cycleNumber: integer("cycle_number").notNull().default(1),
  status: text("status", {
    enum: ["pending", "posted", "failed", "skipped"],
  })
    .notNull()
    .default("pending"),

  // Platforms this item should be posted to
  platforms: text("platforms").notNull().default('["facebook","instagram"]'), // JSON array

  // Which platforms have been successfully posted
  postedPlatforms: text("posted_platforms").default("[]"), // JSON array

  // Error details if failed
  errorMessage: text("error_message"),

  // Timestamps
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }), // When it's supposed to go out
  postedAt: integer("posted_at", { mode: "timestamp" }), // When it actually went out
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ===========================================
// SOCIAL POSTS LOG TABLE
// ===========================================
// Immutable log of every post made to FB/IG.
// One row per platform per queue item (a single queue item can produce 2 log rows).

export const socialPostsLog = sqliteTable("social_posts_log", {
  id: text("id").primaryKey(),

  // Link back to the queue item
  queueId: text("queue_id").notNull(),

  // Which platform this log entry is for
  platform: text("platform", {
    enum: ["facebook", "instagram", "tiktok", "instagram_reel", "facebook_reel"],
  }).notNull(),

  // The content type that was posted
  contentType: text("content_type", {
    enum: ["gallery_photo", "spotify_track", "artist_profile", "curated_track", "vertical_video"],
  }).notNull(),

  sourceId: text("source_id").notNull(),

  // The actual content posted
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  linkUrl: text("link_url"),

  // Meta API response data
  platformPostId: text("platform_post_id"), // FB post ID or IG media ID
  platformPostUrl: text("platform_post_url"), // Direct link to the post
  metaApiResponse: text("meta_api_response"), // Full API response JSON (for debugging)

  // Status
  status: text("status", {
    enum: ["success", "failed", "rate_limited"],
  }).notNull(),

  errorMessage: text("error_message"),

  // Engagement metrics (updated asynchronously)
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  reach: integer("reach").default(0),
  impressions: integer("impressions").default(0),
  metricsUpdatedAt: integer("metrics_updated_at", { mode: "timestamp" }),

  // Timestamps
  postedAt: integer("posted_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ===========================================
// TYPE EXPORTS
// ===========================================

export type SocialPostQueue = typeof socialPostQueue.$inferSelect;
export type NewSocialPostQueue = typeof socialPostQueue.$inferInsert;
export type SocialPostsLog = typeof socialPostsLog.$inferSelect;
export type NewSocialPostsLog = typeof socialPostsLog.$inferInsert;
