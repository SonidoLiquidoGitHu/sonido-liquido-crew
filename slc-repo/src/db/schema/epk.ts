import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { artists } from "./artists";

// ===========================================
// ARTIST EPK (Electronic Press Kit) TABLE
// Comprehensive press kit data for each artist
// ===========================================

export const artistEpk = sqliteTable("artist_epk", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").notNull().unique().references(() => artists.id, { onDelete: "cascade" }),

  // ============ IDENTITY & POSITIONING ============
  tagline: text("tagline"), // One-line hook (e.g., "Mexico City-based melodic trap artist...")
  genreSpecific: text("genre_specific"), // Specific genre description (not just "urban")
  subgenres: text("subgenres"), // JSON array of subgenres
  artistType: text("artist_type"), // Solo artist, Group, DJ, Producer, etc.

  // ============ BIOS ============
  bioShort: text("bio_short"), // 50-80 words
  bioLong: text("bio_long"), // 150-300 words
  bioPress: text("bio_press"), // Full press bio for media use
  storyHighlights: text("story_highlights"), // JSON array of key career moments

  // ============ VISUAL IDENTITY ============
  logoUrl: text("logo_url"), // Main logo
  logoTransparentUrl: text("logo_transparent_url"), // Transparent PNG
  logoWhiteUrl: text("logo_white_url"), // White version
  logoBlackUrl: text("logo_black_url"), // Black version
  brandColors: text("brand_colors"), // JSON array of hex colors
  brandFont: text("brand_font"), // Primary brand font

  // ============ SOCIAL PROOF - STREAMING ============
  spotifyMonthlyListeners: integer("spotify_monthly_listeners"),
  spotifyFollowers: integer("spotify_followers"),
  spotifyTopTrack: text("spotify_top_track"), // JSON: {name, streams, url}
  appleMusicUrl: text("apple_music_url"),
  youtubeSubscribers: integer("youtube_subscribers"),
  youtubeTotalViews: integer("youtube_total_views"),
  instagramFollowers: integer("instagram_followers"),
  tiktokFollowers: integer("tiktok_followers"),
  totalStreams: integer("total_streams"),
  streamingHighlights: text("streaming_highlights"), // JSON array of notable streaming achievements

  // ============ SOCIAL PROOF - PRESS ============
  pressFeatures: text("press_features"), // JSON array: [{outlet, title, url, date, excerpt}]
  blogMentions: text("blog_mentions"), // JSON array
  interviewUrls: text("interview_urls"), // JSON array

  // ============ SOCIAL PROOF - PLAYLISTS ============
  editorialPlaylists: text("editorial_playlists"), // JSON array: [{name, platform, followers, url}]
  curatedPlaylists: text("curated_playlists"), // JSON array

  // ============ SOCIAL PROOF - SHOWS ============
  pastShows: text("past_shows"), // JSON array: [{venue, city, date, attendance, type}]
  festivalAppearances: text("festival_appearances"), // JSON array
  notableVenues: text("notable_venues"), // JSON array of venue names
  tourHistory: text("tour_history"), // JSON array of tours

  // ============ SOCIAL PROOF - COLLABORATIONS ============
  collaborations: text("collaborations"), // JSON array: [{artistName, trackName, year, type}]
  producerCredits: text("producer_credits"), // JSON array
  remixCredits: text("remix_credits"), // JSON array

  // ============ MUSIC SHOWCASE ============
  topTracks: text("top_tracks"), // JSON array: [{title, url, platform, embedCode}] - 2-5 best tracks
  latestRelease: text("latest_release"), // JSON: {title, date, coverUrl, links}
  upcomingRelease: text("upcoming_release"), // JSON

  // ============ VIDEO CONTENT ============
  officialMusicVideos: text("official_music_videos"), // JSON array
  livePerformanceVideos: text("live_performance_videos"), // JSON array
  featuredVideo: text("featured_video"), // JSON: Primary video to showcase
  visualizerVideos: text("visualizer_videos"), // JSON array
  behindTheScenes: text("behind_the_scenes"), // JSON array

  // ============ PRESS QUOTES & TESTIMONIALS ============
  pressQuotes: text("press_quotes"), // JSON array: [{quote, source, sourceUrl, date}]
  artistEndorsements: text("artist_endorsements"), // JSON array: [{artistName, quote, context}]
  industryTestimonials: text("industry_testimonials"), // JSON array

  // ============ CONTACT INFO ============
  bookingEmail: text("booking_email"),
  bookingPhone: text("booking_phone"),
  managementName: text("management_name"),
  managementEmail: text("management_email"),
  managementPhone: text("management_phone"),
  publicistName: text("publicist_name"),
  publicistEmail: text("publicist_email"),
  labelName: text("label_name"),
  labelContact: text("label_contact"),

  // ============ TECHNICAL RIDER ============
  performanceFormat: text("performance_format"), // Live band, DJ, DJ + vocals, etc.
  setLengthOptions: text("set_length_options"), // JSON array: [30, 45, 60, 90] minutes
  technicalRequirements: text("technical_requirements"), // JSON: {microphones, monitors, dj_setup, etc.}
  backlineNeeds: text("backline_needs"), // JSON array
  stageRequirements: text("stage_requirements"), // Text description
  hospitalityRider: text("hospitality_rider"), // Text or JSON
  travelRequirements: text("travel_requirements"), // Text

  // ============ DOWNLOADABLE ASSETS ============
  pressKitPdfUrl: text("press_kit_pdf_url"),
  hiResPhotosZipUrl: text("hi_res_photos_zip_url"),
  logoPackZipUrl: text("logo_pack_zip_url"),
  technicalRiderPdfUrl: text("technical_rider_pdf_url"),
  stageplotUrl: text("stageplot_url"),

  // ============ EPK SETTINGS ============
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  customSlug: text("custom_slug"), // Custom URL for EPK
  theme: text("theme").default("dark"), // dark, light, custom
  customCss: text("custom_css"), // Custom styling
  showContactForm: integer("show_contact_form", { mode: "boolean" }).notNull().default(true),
  password: text("password"), // Optional password protection

  // ============ ANALYTICS ============
  viewCount: integer("view_count").notNull().default(0),
  downloadCount: integer("download_count").notNull().default(0),
  lastViewedAt: integer("last_viewed_at", { mode: "timestamp" }),

  // ============ TIMESTAMPS ============
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// EPK PRESS PHOTOS TABLE
// Dedicated table for high-quality press photos
// ===========================================

export const epkPressPhotos = sqliteTable("epk_press_photos", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),

  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  hiResUrl: text("hi_res_url"), // 300 DPI version

  photoType: text("photo_type", {
    enum: ["portrait", "performance", "styled", "candid", "album_artwork", "promo"]
  }).notNull().default("portrait"),

  title: text("title"),
  description: text("description"),
  photographer: text("photographer"),
  photographerUrl: text("photographer_url"),
  year: integer("year"),

  width: integer("width"),
  height: integer("height"),
  fileSize: integer("file_size"),

  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false), // Main press photo
  sortOrder: integer("sort_order").notNull().default(0),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// EPK TRACKS TABLE
// Curated tracks for the EPK
// ===========================================

export const epkTracks = sqliteTable("epk_tracks", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  releaseDate: integer("release_date", { mode: "timestamp" }),
  coverArtUrl: text("cover_art_url"),

  spotifyUrl: text("spotify_url"),
  spotifyEmbedCode: text("spotify_embed_code"),
  appleMusicUrl: text("apple_music_url"),
  youtubeMusicUrl: text("youtube_music_url"),
  soundcloudUrl: text("soundcloud_url"),
  soundcloudEmbedCode: text("soundcloud_embed_code"),

  streamCount: integer("stream_count"),
  description: text("description"),

  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// EPK VIDEOS TABLE
// Videos for the EPK
// ===========================================

export const epkVideos = sqliteTable("epk_videos", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  videoType: text("video_type", {
    enum: ["music_video", "live_performance", "interview", "behind_the_scenes", "visualizer", "lyric_video"]
  }).notNull().default("music_video"),

  platform: text("platform", {
    enum: ["youtube", "vimeo", "facebook", "instagram", "tiktok", "other"]
  }).notNull().default("youtube"),

  videoUrl: text("video_url").notNull(),
  embedCode: text("embed_code"),
  thumbnailUrl: text("thumbnail_url"),

  viewCount: integer("view_count"),
  duration: integer("duration"), // seconds
  publishDate: integer("publish_date", { mode: "timestamp" }),

  description: text("description"),
  venue: text("venue"), // For live performances

  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false), // Main showcase video
  sortOrder: integer("sort_order").notNull().default(0),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// EPK VIEWS LOG TABLE
// Track who views the EPK
// ===========================================

export const epkViews = sqliteTable("epk_views", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),

  viewerIp: text("viewer_ip"),
  viewerUserAgent: text("viewer_user_agent"),
  referrer: text("referrer"),

  viewedAt: integer("viewed_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// TYPE EXPORTS
// ===========================================

export type ArtistEpk = typeof artistEpk.$inferSelect;
export type NewArtistEpk = typeof artistEpk.$inferInsert;
export type EpkPressPhoto = typeof epkPressPhotos.$inferSelect;
export type NewEpkPressPhoto = typeof epkPressPhotos.$inferInsert;
export type EpkTrack = typeof epkTracks.$inferSelect;
export type NewEpkTrack = typeof epkTracks.$inferInsert;
export type EpkVideo = typeof epkVideos.$inferSelect;
export type NewEpkVideo = typeof epkVideos.$inferInsert;
export type EpkView = typeof epkViews.$inferSelect;

// ===========================================
// EPK SECTION LABELS (for UI)
// ===========================================

export const epkSectionLabels = {
  identity: "Identidad & Posicionamiento",
  bios: "Biografías",
  visuals: "Identidad Visual",
  streaming: "Estadísticas de Streaming",
  press: "Prensa & Medios",
  playlists: "Playlists",
  shows: "Shows & Festivales",
  collaborations: "Colaboraciones",
  music: "Música Destacada",
  videos: "Video",
  quotes: "Citas & Testimonios",
  contact: "Contacto",
  technical: "Rider Técnico",
  downloads: "Descargas",
  settings: "Configuración",
};

export const photoTypeLabels = {
  portrait: "Retrato",
  performance: "Performance",
  styled: "Editorial/Estilizado",
  candid: "Candid/Espontáneo",
  album_artwork: "Artwork de Álbum",
  promo: "Promocional",
};

export const videoTypeLabels = {
  music_video: "Video Musical",
  live_performance: "Performance en Vivo",
  interview: "Entrevista",
  behind_the_scenes: "Detrás de Cámaras",
  visualizer: "Visualizer",
  lyric_video: "Lyric Video",
};
