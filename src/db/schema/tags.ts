import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
// ===========================================
// TAGS TABLE
// ===========================================
export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// TAG ASSIGNMENTS TABLE
// ===========================================
export const tagAssignments = sqliteTable("tag_assignments", {
  id: text("id").primaryKey(),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  entityType: text("entity_type", {
    enum: ["artist", "release", "video", "product", "event", "photo"]
  }).notNull(),
  entityId: text("entity_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// TYPE EXPORTS
// ===========================================
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type TagAssignment = typeof tagAssignments.$inferSelect;
export type NewTagAssignment = typeof tagAssignments.$inferInsert;