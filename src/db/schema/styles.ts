import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { artists } from "./artists";

// ===========================================
// CUSTOM STYLES TABLE (Style Library)
// ===========================================

export const customStyles = sqliteTable("custom_styles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),

  // Style settings (JSON)
  settings: text("settings", { mode: "json" }).notNull().$type<{
    colorPreset?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    textColor?: string;
    titleFont?: string;
    bodyFont?: string;
    titleStyle?: string;
    backgroundStyle?: string;
    backgroundImageUrl?: string;
    backgroundOverlayOpacity?: number;
    backgroundBlur?: number;
    enableGlow?: boolean;
    enableAnimations?: boolean;
    enableParticles?: boolean;
    animationPreset?: string;
    buttonStyle?: "solid" | "gradient" | "outline" | "glass";
    buttonRounded?: "none" | "sm" | "md" | "lg" | "full";
    darkMode?: boolean;
  }>(),

  // Preview image (auto-generated or custom)
  previewImageUrl: text("preview_image_url"),

  // Categorization
  category: text("category", {
    enum: ["campaign", "beat", "media", "general", "artist"]
  }).default("general"),

  // Link to artist for inheritance
  artistId: text("artist_id").references(() => artists.id, { onDelete: "set null" }),

  // Sharing
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),

  // Usage tracking
  usageCount: integer("usage_count").notNull().default(0),

  // Metadata
  createdBy: text("created_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// ARTIST STYLE SETTINGS TABLE
// Stores default style for each artist
// ===========================================

export const artistStyles = sqliteTable("artist_styles", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),

  // Default style settings for this artist
  settings: text("settings", { mode: "json" }).notNull().$type<{
    colorPreset?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    textColor?: string;
    titleFont?: string;
    bodyFont?: string;
    titleStyle?: string;
    backgroundStyle?: string;
    backgroundImageUrl?: string;
    backgroundOverlayOpacity?: number;
    backgroundBlur?: number;
    enableGlow?: boolean;
    enableAnimations?: boolean;
    enableParticles?: boolean;
    animationPreset?: string;
    buttonStyle?: "solid" | "gradient" | "outline" | "glass";
    buttonRounded?: "none" | "sm" | "md" | "lg" | "full";
    darkMode?: boolean;
  }>(),

  // Use this style by default for new content
  applyToNewContent: integer("apply_to_new_content", { mode: "boolean" }).notNull().default(true),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// TYPE EXPORTS
// ===========================================

export type CustomStyle = typeof customStyles.$inferSelect;
export type NewCustomStyle = typeof customStyles.$inferInsert;
export type ArtistStyle = typeof artistStyles.$inferSelect;
export type NewArtistStyle = typeof artistStyles.$inferInsert;
