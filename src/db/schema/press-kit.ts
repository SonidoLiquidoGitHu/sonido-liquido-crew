import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ===========================================
// PRESS KIT TABLE
// Stores editable press kit content
// ===========================================

export const pressKit = sqliteTable("press_kit", {
  id: text("id").primaryKey().default("main"),

  // Hero Section
  heroTitle: text("hero_title").default("Sonido Líquido Crew"),
  heroSubtitle: text("hero_subtitle").default("El colectivo de Hip Hop más representativo de México"),
  heroTagline: text("hero_tagline").default("Fundado en 1999 en la Ciudad de México por Zaque."),
  heroCoverImageUrl: text("hero_cover_image_url"),
  heroBannerImageUrl: text("hero_banner_image_url"),

  // Stats
  statsArtists: text("stats_artists").default("20+"),
  statsReleases: text("stats_releases").default("160+"),
  statsYears: text("stats_years").default("25+"),

  // About Section
  aboutTitle: text("about_title").default("Sobre Nosotros"),
  aboutContent: text("about_content"), // Rich text / Markdown

  // Key Points (JSON array)
  keyPoints: text("key_points"), // JSON: [{icon, title, description}]

  // Contact Info
  contactEmail: text("contact_email").default("prensasonidoliquido@gmail.com"),
  contactPhone: text("contact_phone").default("+52 55 2801 1881"),
  contactLocation: text("contact_location").default("Ciudad de México, CDMX"),

  // Social Links
  spotifyUrl: text("spotify_url").default("https://open.spotify.com/playlist/5qHTKCZIwi3GM3mhPq45Ab"),
  instagramUrl: text("instagram_url").default("https://www.instagram.com/sonidoliquido/"),
  youtubeUrl: text("youtube_url").default("https://www.youtube.com/@sonidoliquidocrew"),
  twitterUrl: text("twitter_url"),
  facebookUrl: text("facebook_url"),

  // Downloads (JSON array)
  downloads: text("downloads"), // JSON: [{name, url, description}]

  // Additional Media (JSON array)
  mediaGallery: text("media_gallery"), // JSON: [{imageUrl, caption}]

  // Press Quotes (JSON array)
  pressQuotes: text("press_quotes"), // JSON: [{quote, source, url}]

  // Featured Video
  featuredVideoUrl: text("featured_video_url"),
  featuredVideoTitle: text("featured_video_title"),

  // Footer CTA
  footerCtaTitle: text("footer_cta_title").default("¿Listo para colaborar?"),
  footerCtaButtonText: text("footer_cta_button_text").default("Enviar Mensaje"),

  // SEO
  metaTitle: text("meta_title").default("Press Kit | Sonido Líquido Crew"),
  metaDescription: text("meta_description").default("Kit de prensa oficial de Sonido Líquido Crew. Información, biografías, fotos y recursos para medios."),

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ===========================================
// TYPE EXPORTS
// ===========================================

export type PressKit = typeof pressKit.$inferSelect;
export type NewPressKit = typeof pressKit.$inferInsert;
