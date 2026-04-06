import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { artists } from "./artists";
// ===========================================
// RELEASES TABLE
// ===========================================
export const releases = sqliteTable("releases", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  releaseType: text("release_type", {
    enum: ["album", "ep", "single", "maxi-single", "compilation", "mixtape"]
  }).notNull().default("single"),
  releaseDate: integer("release_date", { mode: "timestamp" }).notNull(),
  coverImageUrl: text("cover_image_url"),
  spotifyId: text("spotify_id"),
  spotifyUrl: text("spotify_url"),
  appleMusicUrl: text("apple_music_url"),
  youtubeMusicUrl: text("youtube_music_url"),
  description: text("description"),
  isUpcoming: integer("is_upcoming", { mode: "boolean" }).notNull().default(false),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// RELEASE ARTISTS TABLE (Junction)
// ===========================================
export const releaseArtists = sqliteTable("release_artists", {
  id: text("id").primaryKey(),
  releaseId: text("release_id").notNull().references(() => releases.id, { onDelete: "cascade" }),
  artistId: text("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// PLAYLISTS TABLE
// ===========================================
export const playlists = sqliteTable("playlists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  spotifyId: text("spotify_id").notNull().unique(),
  spotifyUrl: text("spotify_url").notNull(),
  coverImageUrl: text("cover_image_url"),
  trackCount: integer("track_count").notNull().default(0),
  isOfficial: integer("is_official", { mode: "boolean" }).notNull().default(false),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// TYPE EXPORTS
export type Release = typeof releases.$inferSelect;
export type NewRelease = typeof releases.$inferInsert;
export type ReleaseArtist = typeof releaseArtists.$inferSelect;
export type NewReleaseArtist = typeof releaseArtists.$inferInsert;
export type Playlist = typeof playlists.$inferSelect;
export type NewPlaylist = typeof playlists.$inferInsert;
