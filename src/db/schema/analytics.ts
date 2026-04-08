import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ===========================================
// ANALYTICS TABLE
// ===========================================

export const analytics = sqliteTable("analytics", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(), // page_view, click, download, etc.
  entityType: text("entity_type"), // artist, release, video, beat, campaign
  entityId: text("entity_id"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),

  // User info
  sessionId: text("session_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// VIDEO ANALYTICS TABLE
// ===========================================

export const videoAnalytics = sqliteTable("video_analytics", {
  id: text("id").primaryKey(),

  // Content reference
  contentId: text("content_id").notNull(),
  contentType: text("content_type", {
    enum: ["campaign", "beat"]
  }).notNull(),

  // Session tracking
  sessionId: text("session_id").notNull(),

  // Video metrics
  eventType: text("event_type", {
    enum: ["play", "progress", "complete", "pause", "seek"]
  }).notNull(),

  currentTime: integer("current_time").notNull().default(0), // in seconds
  duration: integer("duration").notNull().default(0), // in seconds
  percentWatched: integer("percent_watched").notNull().default(0), // 0-100
  maxPercentWatched: integer("max_percent_watched").notNull().default(0), // highest % reached
  totalWatchTime: integer("total_watch_time").notNull().default(0), // cumulative seconds

  // User info
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// VIDEO ANALYTICS AGGREGATES (for faster queries)
// ===========================================

export const videoAnalyticsAggregates = sqliteTable("video_analytics_aggregates", {
  id: text("id").primaryKey(),

  contentId: text("content_id").notNull(),
  contentType: text("content_type", {
    enum: ["campaign", "beat"]
  }).notNull(),

  // Daily aggregates
  date: text("date").notNull(), // YYYY-MM-DD

  // Metrics
  totalPlays: integer("total_plays").notNull().default(0),
  uniqueViewers: integer("unique_viewers").notNull().default(0),
  totalWatchTimeSeconds: integer("total_watch_time_seconds").notNull().default(0),
  avgWatchPercent: real("avg_watch_percent").notNull().default(0),
  completionCount: integer("completion_count").notNull().default(0), // % >= 90

  // Engagement breakdown
  dropped25: integer("dropped_25").notNull().default(0), // viewers who left before 25%
  dropped50: integer("dropped_50").notNull().default(0), // viewers who left between 25-50%
  dropped75: integer("dropped_75").notNull().default(0), // viewers who left between 50-75%
  dropped100: integer("dropped_100").notNull().default(0), // viewers who left between 75-100%
  completed: integer("completed").notNull().default(0), // viewers who watched >= 90%

  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// TYPE EXPORTS
// ===========================================

export type Analytics = typeof analytics.$inferSelect;
export type NewAnalytics = typeof analytics.$inferInsert;
export type VideoAnalytics = typeof videoAnalytics.$inferSelect;
export type NewVideoAnalytics = typeof videoAnalytics.$inferInsert;
export type VideoAnalyticsAggregate = typeof videoAnalyticsAggregates.$inferSelect;
export type NewVideoAnalyticsAggregate = typeof videoAnalyticsAggregates.$inferInsert;
