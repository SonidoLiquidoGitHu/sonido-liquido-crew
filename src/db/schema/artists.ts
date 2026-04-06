import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
// ===========================================
// ARTISTS TABLE
// ===========================================
export const artists = sqliteTable("artists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  realName: text("real_name"),
  bio: text("bio"),
  shortBio: text("short_bio"),
  role: text("role", {
    enum: ["mc", "dj", "producer", "cantante", "divo", "lado_b"]
  }).notNull().default("mc"),
  profileImageUrl: text("profile_image_url"),
  featuredImageUrl: text("featured_image_url"),
  bannerImageUrl: text("banner_image_url"),
  tintColor: text("tint_color"),
  location: text("location"),
  country: text("country"),
  bookingEmail: text("booking_email"),
  managementEmail: text("management_email"),
  pressEmail: text("press_email"),
  websiteUrl: text("website_url"),
  yearStarted: integer("year_started"),
  genres: text("genres"),
  labels: text("labels"),
  monthlyListeners: integer("monthly_listeners"),
  followers: integer("followers"),
  pressQuotes: text("press_quotes"),
  featuredVideos: text("featured_videos"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  verificationStatus: text("verification_status", {
    enum: ["pending", "verified", "rejected"]
  }).notNull().default("pending"),
  identityConflictFlag: integer("identity_conflict_flag", { mode: "boolean" }).notNull().default(false),
  adminNotes: text("admin_notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const artistExternalProfiles = sqliteTable("artist_external_profiles", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  platform: text("platform", {
    enum: ["spotify", "apple_music", "youtube", "youtube_music", "instagram", "tiktok", "twitter", "facebook", "soundcloud", "bandcamp", "deezer", "tidal", "amazon_music", "mixcloud", "beatport", "discogs", "genius", "linktree", "other"]
  }).notNull(),
  externalId: text("external_id"),
  externalUrl: text("external_url").notNull(),
  handle: text("handle"),
  displayName: text("display_name"),
  isVerified: integer("is_verified", { mode: "boolean" }).notNull().default(false),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  followerCount: integer("follower_count"),
  lastSynced: integer("last_synced", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const artistGalleryAssets = sqliteTable("artist_gallery_assets", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  assetUrl: text("asset_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  assetType: text("asset_type", {
    enum: ["photo", "press_photo", "album_art", "logo", "banner"]
  }).notNull().default("photo"),
  caption: text("caption"),
  credit: text("credit"),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const artistRelations = sqliteTable("artist_relations", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  relatedArtistId: text("related_artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  relationType: text("relation_type", {
    enum: ["collaborator", "alias", "member_of", "featured", "producer", "dj_duo"]
  }).notNull().default("collaborator"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;
export type ArtistExternalProfile = typeof artistExternalProfiles.$inferSelect;
export type NewArtistExternalProfile = typeof artistExternalProfiles.$inferInsert;
export type ArtistGalleryAsset = typeof artistGalleryAssets.$inferSelect;
export type NewArtistGalleryAsset = typeof artistGalleryAssets.$inferInsert;
export type ArtistRelation = typeof artistRelations.$inferSelect;
export type NewArtistRelation = typeof artistRelations.$inferInsert;

export const platformLabels: Record<string, string> = {
  spotify: "Spotify", apple_music: "Apple Music", youtube: "YouTube", youtube_music: "YouTube Music",
  instagram: "Instagram", tiktok: "TikTok", twitter: "X (Twitter)", facebook: "Facebook",
  soundcloud: "SoundCloud", bandcamp: "Bandcamp", deezer: "Deezer", tidal: "Tidal",
  amazon_music: "Amazon Music", mixcloud: "Mixcloud", beatport: "Beatport", discogs: "Discogs",
  genius: "Genius", linktree: "Linktree", other: "Otro",
};

export const platformColors: Record<string, string> = {
  spotify: "#1DB954", apple_music: "#FA243C", youtube: "#FF0000", youtube_music: "#FF0000",
  instagram: "#E4405F", tiktok: "#000000", twitter: "#1DA1F2", facebook: "#1877F2",
  soundcloud: "#FF5500", bandcamp: "#629AA9", deezer: "#FEAA2D", tidal: "#000000",
  amazon_music: "#FF9900", mixcloud: "#5000FF", beatport: "#94D500", discogs: "#333333",
  genius: "#FFFF64", linktree: "#43E55E", other: "#888888",
};
