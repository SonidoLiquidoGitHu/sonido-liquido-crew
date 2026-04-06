import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { artists } from "./artists";

export const mediaReleases = sqliteTable("media_releases", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  subtitle: text("subtitle"),
  category: text("category", {
    enum: ["new_release", "single", "album", "ep", "tour", "collaboration", "event", "announcement", "interview", "feature"]
  }).default("announcement"),
  mainArtistId: text("main_artist_id").references(() => artists.id, { onDelete: "set null" }),
  mainArtistName: text("main_artist_name"),
  summary: text("summary"),
  content: text("content"),
  pullQuote: text("pull_quote"),
  pullQuoteAttribution: text("pull_quote_attribution"),
  coverImageUrl: text("cover_image_url"),
  bannerImageUrl: text("banner_image_url"),
  galleryImages: text("gallery_images"),
  logoUrl: text("logo_url"),
  audioPreviewUrl: text("audio_preview_url"),
  audioPreviewTitle: text("audio_preview_title"),
  audioTracks: text("audio_tracks"),
  spotifyEmbedUrl: text("spotify_embed_url"),
  youtubeVideoId: text("youtube_video_id"),
  youtubeVideoTitle: text("youtube_video_title"),
  pressKitUrl: text("press_kit_url"),
  pressKitSize: integer("press_kit_size"),
  highResImagesUrl: text("high_res_images_url"),
  linerNotesUrl: text("liner_notes_url"),
  credits: text("credits"),
  relatedArtistIds: text("related_artist_ids"),
  relatedReleaseId: text("related_release_id"),
  externalLinks: text("external_links"),
  prContactName: text("pr_contact_name"),
  prContactEmail: text("pr_contact_email"),
  prContactPhone: text("pr_contact_phone"),
  managementContact: text("management_contact"),
  bookingContact: text("booking_contact"),
  publishDate: integer("publish_date", { mode: "timestamp" }).notNull(),
  embargoDate: integer("embargo_date", { mode: "timestamp" }),
  releaseDate: integer("release_date", { mode: "timestamp" }),
  eventDate: integer("event_date", { mode: "timestamp" }),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  accessCode: text("access_code"),
  viewCount: integer("view_count").notNull().default(0),
  downloadCount: integer("download_count").notNull().default(0),
  tags: text("tags"),
  styleSettings: text("style_settings", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type MediaRelease = typeof mediaReleases.$inferSelect;
export type NewMediaRelease = typeof mediaReleases.$inferInsert;
