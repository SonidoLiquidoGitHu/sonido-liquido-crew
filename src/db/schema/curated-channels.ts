import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
// ===========================================
// CURATED SPOTIFY CHANNELS TABLE
// Stores Spotify artist profiles that are approved for playlist curation
// ===========================================
export const curatedSpotifyChannels = sqliteTable("curated_spotify_channels", {
  id: text("id").primaryKey(),
  // Spotify Info
  spotifyArtistId: text("spotify_artist_id").notNull().unique(),
  spotifyArtistUrl: text("spotify_artist_url").notNull(),
  // Display Info (cached from Spotify)
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  genres: text("genres"), // JSON array
  popularity: integer("popularity"),
  followers: integer("followers"),
  // Curation Settings
  category: text("category", {
    enum: ["roster", "affiliate", "collaborator", "label", "featured", "other"]
  }).notNull().default("roster"),
  priority: integer("priority").notNull().default(0), // Higher = more important
  description: text("description"), // Admin notes about this channel
  // Sync Settings
  autoSync: integer("auto_sync", { mode: "boolean" }).notNull().default(true),
  syncNewReleases: integer("sync_new_releases", { mode: "boolean" }).notNull().default(true),
  syncTopTracks: integer("sync_top_tracks", { mode: "boolean" }).notNull().default(true),
  // Status
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  // Timestamps
  lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// CURATED TRACKS TABLE
// Stores tracks from curated channels that can be added to playlists
// ===========================================
export const curatedTracks = sqliteTable("curated_tracks", {
  id: text("id").primaryKey(),
  // Spotify Info
  spotifyTrackId: text("spotify_track_id").notNull().unique(),
  spotifyTrackUrl: text("spotify_track_url").notNull(),
  spotifyAlbumId: text("spotify_album_id"),
  // Track Info (cached from Spotify)
  name: text("name").notNull(),
  artistName: text("artist_name").notNull(),
  artistIds: text("artist_ids"), // JSON array of Spotify artist IDs
  albumName: text("album_name"),
  albumImageUrl: text("album_image_url"),
  durationMs: integer("duration_ms"),
  previewUrl: text("preview_url"),
  releaseDate: text("release_date"),
  popularity: integer("popularity"),
  explicit: integer("explicit", { mode: "boolean" }).notNull().default(false),
  // Reference to curated channel
  curatedChannelId: text("curated_channel_id").references(() => curatedSpotifyChannels.id, { onDelete: "cascade" }),
  // Playlist Status
  isAvailableForPlaylist: integer("is_available_for_playlist", { mode: "boolean" }).notNull().default(true),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  adminNotes: text("admin_notes"),
  // Timestamps
  addedAt: integer("added_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// PLAYLIST TRACKS TABLE
// Tracks added to playlists (for custom playlist curation)
// ===========================================
export const playlistTracks = sqliteTable("playlist_tracks", {
  id: text("id").primaryKey(),
  // Playlist reference (e.g., "gran-reserva", "weekly-picks")
  playlistId: text("playlist_id").notNull(),
  playlistName: text("playlist_name"),
  // Track reference
  spotifyTrackId: text("spotify_track_id").notNull(),
  curatedTrackId: text("curated_track_id").references(() => curatedTracks.id),
  // Track Info (cached)
  trackName: text("track_name").notNull(),
  artistName: text("artist_name").notNull(),
  albumImageUrl: text("album_image_url"),
  // Position
  position: integer("position").notNull().default(0),
  // Status
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  addedBy: text("added_by"), // Admin user ID
  // Timestamps
  addedAt: integer("added_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});
// ===========================================
// TYPE EXPORTS
// ===========================================
export type CuratedSpotifyChannel = typeof curatedSpotifyChannels.$inferSelect;
export type NewCuratedSpotifyChannel = typeof curatedSpotifyChannels.$inferInsert;
export type CuratedTrack = typeof curatedTracks.$inferSelect;
export type NewCuratedTrack = typeof curatedTracks.$inferInsert;
export type PlaylistTrack = typeof playlistTracks.$inferSelect;
export type NewPlaylistTrack = typeof playlistTracks.$inferInsert;
// Category labels for UI
export const channelCategoryLabels: Record<string, string> = {
  roster: "Artista del Roster",
  affiliate: "Artista Afiliado",
  collaborator: "Colaborador",
  label: "Sello Discográfico",
  featured: "Artista Destacado",
  other: "Otro",
};
export const channelCategoryColors: Record<string, string> = {
  roster: "#f97316", // Orange
  affiliate: "#22c55e", // Green
  collaborator: "#3b82f6", // Blue
  label: "#8b5cf6", // Purple
  featured: "#eab308", // Yellow
  other: "#6b7280", // Gray
};
