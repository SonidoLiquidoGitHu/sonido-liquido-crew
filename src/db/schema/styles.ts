import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { artists } from "./artists";

export const customStyles = sqliteTable("custom_styles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  settings: text("settings", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
  previewImageUrl: text("preview_image_url"),
  category: text("category", {
    enum: ["campaign", "beat", "media", "general", "artist"]
  }).default("general"),
  artistId: text("artist_id").references(() => artists.id, { onDelete: "set null" }),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  usageCount: integer("usage_count").notNull().default(0),
  createdBy: text("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const artistStyles = sqliteTable("artist_styles", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  settings: text("settings", { mode: "json" }).notNull().$type<Record<string, unknown>>(),
  applyToNewContent: integer("apply_to_new_content", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type CustomStyle = typeof customStyles.$inferSelect;
export type NewCustomStyle = typeof customStyles.$inferInsert;
export type ArtistStyle = typeof artistStyles.$inferSelect;
export type NewArtistStyle = typeof artistStyles.$inferInsert;
