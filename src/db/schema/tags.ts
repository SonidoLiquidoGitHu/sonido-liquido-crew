import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
// ===========================================
// TAGS TABLE
// ===========================================
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  category: text("category", {
    enum: ["genre", "mood", "topic", "era", "custom"]
  }).notNull().default("custom"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// CONTENT TAGS TABLE (Junction)
// ===========================================
export const contentTags = sqliteTable("content_tags", {
  id: text("id").primaryKey(),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  contentType: text("content_type", {
    enum: ["artist", "release", "video", "event", "beat"]
  }).notNull(),
  contentId: text("content_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// TYPE EXPORTS
// ===========================================
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type ContentTag = typeof contentTags.$inferSelect;
export type NewContentTag = typeof contentTags.$inferInsert;
