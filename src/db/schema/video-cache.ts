import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ===========================================
// DROPBOX LINK CACHE TABLE
// ===========================================
// Caches the resolved Dropbox temporary direct link (dl.dropboxusercontent.com)
// for each Dropbox shared URL. Without this cache, every /api/video-proxy
// request makes 2 sequential Dropbox API calls (get_shared_link_metadata +
// get_temporary_link) before returning a 302 — adding 1-5s of latency to
// every video playback, plus breaking on Netlify cold starts.
//
// Dropbox temp links are valid for ~4 hours. We cache for 3 hours (TTL
// stored in expires_at) to stay safely below the Dropbox expiry.
//
// Schema:
//   dropbox_url  — the normalized Dropbox shared URL (with ?raw=1 or ?dl=0)
//                  used as the PRIMARY KEY because the proxy only knows the
//                  URL, not the video ID.
//   temp_link    — the resolved dl.dropboxusercontent.com URL
//   expires_at   — unix seconds when this cache entry is stale
//   created_at   — unix seconds when this entry was first cached

export const dropboxLinkCache = sqliteTable("dropbox_link_cache", {
  dropboxUrl: text("dropbox_url").primaryKey(),
  tempLink: text("temp_link").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type DropboxLinkCache = typeof dropboxLinkCache.$inferSelect;
export type NewDropboxLinkCache = typeof dropboxLinkCache.$inferInsert;
