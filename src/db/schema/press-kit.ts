import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const pressKit = sqliteTable("press_kit", {
  id: text("id").primaryKey().default("main"),
  heroTitle: text("hero_title").default("Sonido Liquido Crew"),
  heroSubtitle: text("hero_subtitle").default("El colectivo de Hip Hop mas representativo de Mexico"),
  heroTagline: text("hero_tagline").default("Fundado en 1999 en la Ciudad de Mexico por Zaque."),
  heroCoverImageUrl: text("hero_cover_image_url"),
  heroBannerImageUrl: text("hero_banner_image_url"),
  statsArtists: text("stats_artists").default("20+"),
  statsReleases: text("stats_releases").default("160+"),
  statsYears: text("stats_years").default("25+"),
  aboutTitle: text("about_title").default("Sobre Nosotros"),
  aboutContent: text("about_content"),
  keyPoints: text("key_points"),
  contactEmail: text("contact_email").default("prensasonidoliquido@gmail.com"),
  contactPhone: text("contact_phone").default("+52 55 2801 1881"),
  contactLocation: text("contact_location").default("Ciudad de Mexico, CDMX"),
  spotifyUrl: text("spotify_url").default("https://open.spotify.com/playlist/5qHTKCZIwi3GM3mhPq45Ab"),
  instagramUrl: text("instagram_url").default("https://www.instagram.com/sonidoliquido/"),
  youtubeUrl: text("youtube_url").default("https://www.youtube.com/@sonidoliquidocrew"),
  twitterUrl: text("twitter_url"),
  facebookUrl: text("facebook_url"),
  downloads: text("downloads"),
  mediaGallery: text("media_gallery"),
  pressQuotes: text("press_quotes"),
  featuredVideoUrl: text("featured_video_url"),
  featuredVideoTitle: text("featured_video_title"),
  footerCtaTitle: text("footer_cta_title").default("Listo para colaborar?"),
  footerCtaButtonText: text("footer_cta_button_text").default("Enviar Mensaje"),
  metaTitle: text("meta_title").default("Press Kit | Sonido Liquido Crew"),
  metaDescription: text("meta_description").default("Kit de prensa oficial de Sonido Liquido Crew."),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export type PressKit = typeof pressKit.$inferSelect;
export type NewPressKit = typeof pressKit.$inferInsert;
