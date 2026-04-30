import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { artists } from "./artists";

// ===========================================
// MEDIA RELEASES TABLE (Enhanced for Press)
// ===========================================

export const mediaReleases = sqliteTable("media_releases", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  subtitle: text("subtitle"), // e.g., "Nuevo Álbum" or "Single de Verano"

  // Category/Type
  category: text("category", {
    enum: [
      "new_release",
      "single",
      "album",
      "ep",
      "tour",
      "collaboration",
      "event",
      "announcement",
      "interview",
      "feature"
    ]
  }).default("announcement"),

  // Main Artist (can be from roster or custom name)
  mainArtistId: text("main_artist_id").references(() => artists.id, { onDelete: "set null" }),
  mainArtistName: text("main_artist_name"), // Custom artist name if not in roster

  // Content
  summary: text("summary"), // Short description (1-2 sentences)
  content: text("content"), // Full press release content (markdown/HTML)
  pullQuote: text("pull_quote"), // Highlighted quote for media to use
  pullQuoteAttribution: text("pull_quote_attribution"), // Who said the quote

  // Visual Assets
  coverImageUrl: text("cover_image_url"), // Main image
  bannerImageUrl: text("banner_image_url"), // Wide banner for headers
  galleryImages: text("gallery_images"), // JSON array of image URLs for press
  logoUrl: text("logo_url"), // Logo if applicable

  // Audio/Video
  audioPreviewUrl: text("audio_preview_url"), // Preview track URL (Dropbox) - legacy single track
  audioPreviewTitle: text("audio_preview_title"),
  audioTracks: text("audio_tracks"), // JSON array of {title, url, duration, trackNumber} for full releases
  spotifyEmbedUrl: text("spotify_embed_url"), // Spotify embed link
  youtubeVideoId: text("youtube_video_id"), // YouTube video ID
  youtubeVideoTitle: text("youtube_video_title"),

  // Downloads & Assets
  pressKitUrl: text("press_kit_url"), // ZIP with all assets (Dropbox)
  pressKitSize: integer("press_kit_size"), // File size in bytes
  highResImagesUrl: text("high_res_images_url"), // ZIP of high-res images
  linerNotesUrl: text("liner_notes_url"), // PDF of liner notes/credits

  // Credits
  credits: text("credits"), // JSON or markdown with full credits

  // Related Content
  relatedArtistIds: text("related_artist_ids"), // JSON array of artist IDs
  relatedReleaseId: text("related_release_id"), // Link to a release in discography
  externalLinks: text("external_links"), // JSON array of {label, url} objects

  // Contact Info
  prContactName: text("pr_contact_name"),
  prContactEmail: text("pr_contact_email"),
  prContactPhone: text("pr_contact_phone"),
  managementContact: text("management_contact"),
  bookingContact: text("booking_contact"),

  // Dates
  publishDate: integer("publish_date", { mode: "timestamp" }).notNull(),
  embargoDate: integer("embargo_date", { mode: "timestamp" }), // When press can publish
  releaseDate: integer("release_date", { mode: "timestamp" }), // When the actual release drops
  eventDate: integer("event_date", { mode: "timestamp" }), // For events/tours

  // Status & Visibility
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  accessCode: text("access_code"), // Optional code for private press access

  // Analytics
  viewCount: integer("view_count").notNull().default(0),
  downloadCount: integer("download_count").notNull().default(0),

  // Tags for filtering
  tags: text("tags"), // JSON array of tags

  // Visual customization settings (JSON)
  styleSettings: text("style_settings", { mode: "json" }).$type<{
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
    enableGlow?: boolean;
    enableAnimations?: boolean;
    enableParticles?: boolean;
    buttonStyle?: "solid" | "gradient" | "outline" | "glass";
    buttonRounded?: "none" | "sm" | "md" | "lg" | "full";
  }>(),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// PRESS KITS TABLE
// ===========================================

export const pressKits = sqliteTable("press_kits", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").references(() => artists.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  downloadUrl: text("download_url").notNull(),
  fileSize: integer("file_size"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  downloadCount: integer("download_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// TYPE EXPORTS
// ===========================================

export type MediaRelease = typeof mediaReleases.$inferSelect;
export type NewMediaRelease = typeof mediaReleases.$inferInsert;
export type ArtistPressKit = typeof pressKits.$inferSelect;
export type NewArtistPressKit = typeof pressKits.$inferInsert;

// Helper type for category labels
export const mediaReleaseCategoryLabels: Record<string, string> = {
  new_release: "Nuevo Lanzamiento",
  single: "Single",
  album: "Álbum",
  ep: "EP",
  tour: "Gira / Tour",
  collaboration: "Colaboración",
  event: "Evento",
  announcement: "Anuncio",
  interview: "Entrevista",
  feature: "Feature / Artículo",
};
