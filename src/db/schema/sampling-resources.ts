import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ===========================================
// SAMPLING RESOURCES TABLE
// ===========================================
// Curated YouTube channels, videos and playlists for sampling.
// Migrated from src/data/sampling-resources.json to support
// CRUD operations in Netlify's read-only serverless environment.

export const samplingResources = sqliteTable("sampling_resources", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["video", "channel", "playlist"] }).notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  tags: text("tags").notNull().default("[]"), // JSON array stored as text
  videoId: text("video_id"),
  playlistId: text("playlist_id"),
  handle: text("handle"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ===========================================
// SAMPLING RESOURCES SETTINGS TABLE
// ===========================================
// Stores the page title, subtitle and internal note
// (the metadata that was previously at the top of the JSON file).

export const samplingResourcesSettings = sqliteTable(
  "sampling_resources_settings",
  {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
);

// ===========================================
// SAMPLING RESOURCES ANALYTICS TABLE
// ===========================================
// Separate table for analytics — does NOT modify the existing
// sampling_resources table, so existing SELECT * queries keep working
// even if this table doesn't exist yet on Render (no auto-migrations).
//
// Each row = one tracking event. We use COUNT queries to aggregate.
// This is simpler and safer than ALTER TABLE + increment counters.

export const samplingResourceAnalytics = sqliteTable(
  "sampling_resource_analytics",
  {
    id: text("id").primaryKey(),
    resourceId: text("resource_id").notNull(),
    action: text("action", { enum: ["view", "click", "access"] }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
);

// ===========================================
// TYPE EXPORTS
// ===========================================

export type SamplingResource = typeof samplingResources.$inferSelect;
export type NewSamplingResource = typeof samplingResources.$inferInsert;
export type SamplingResourcesSetting =
  typeof samplingResourcesSettings.$inferSelect;
export type SamplingResourceAnalytic =
  typeof samplingResourceAnalytics.$inferSelect;
