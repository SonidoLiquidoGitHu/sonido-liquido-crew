import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ===========================================
// DELETED RELEASES BLOCKLIST
// ===========================================
// When an admin deletes a release that was originally imported from Spotify,
// we record its spotifyId here so the next Spotify sync (which runs every 6h)
// does NOT re-import the same album. Without this, the sync would re-create
// the deleted release on the next run, creating a "delete → reappear" loop.
//
// To un-block a release, delete its row from this table (e.g. via SQL).
// The next sync will then re-import it.
//
// Only releases with a non-null spotifyId get an entry here. Manually-created
// releases (no spotifyId) cannot be re-imported by the sync, so they don't
// need blocklist protection.

export const deletedReleasesBlocklist = sqliteTable(
  "deleted_releases_blocklist",
  {
    id: text("id").primaryKey(),
    spotifyId: text("spotify_id").notNull().unique(),
    title: text("title"),
    artistName: text("artist_name"),
    spotifyUrl: text("spotify_url"),
    deletedAt: integer("deleted_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
);

// ===========================================
// TYPE EXPORTS
// ===========================================

export type DeletedReleaseBlocklist =
  typeof deletedReleasesBlocklist.$inferSelect;
export type NewDeletedReleaseBlocklist =
  typeof deletedReleasesBlocklist.$inferInsert;
