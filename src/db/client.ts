import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import * as relations from "./relations";

// ===========================================
// DYNAMIC CLIENT IMPORT
// ===========================================
// For local dev (file: URLs), we need the Node.js client which supports SQLite files.
// For production (libsql: URLs on Netlify), we need the /web client which is
// edge/serverless compatible. The /web client does NOT support file: URLs.

type Client = import("@libsql/client").Client;
type ClientConfig = Parameters<typeof import("@libsql/client").createClient>[0];

let _createClientFn: ((config: ClientConfig) => Client) | null = null;

/**
 * Initialize the correct client based on the DATABASE_URL scheme.
 * This must be called before getClient().
 */
function initClientFactory(): void {
  if (_createClientFn) return; // Already initialized

  const url = (process.env.DATABASE_URL ||
              process.env.TURSO_DATABASE_URL ||
              process.env.LIBSQL_URL || "").trim();

  const isLocalSQLite = url.startsWith("file:");

  if (isLocalSQLite) {
    // Local dev: use Node.js client (supports file: URLs)
    try {
      const nodeModule = require("@libsql/client");
      _createClientFn = nodeModule.createClient;
      console.log("[DB] Using @libsql/client (Node.js) for local SQLite");
    } catch (err) {
      console.error("[DB] Failed to load @libsql/client:", err);
      throw err;
    }
  } else {
    // Production/remote: use /web client (edge/serverless compatible)
    try {
      const webModule = require("@libsql/client/web");
      _createClientFn = webModule.createClient;
      console.log("[DB] Using @libsql/client/web for remote Turso");
    } catch (err) {
      // Fallback to Node.js client if /web is not available
      console.warn("[DB] @libsql/client/web not available, falling back to @libsql/client:", err);
      try {
        const nodeModule = require("@libsql/client");
        _createClientFn = nodeModule.createClient;
        console.log("[DB] Using @libsql/client (Node.js) as fallback");
      } catch (err2) {
        console.error("[DB] Failed to load any @libsql/client:", err2);
        throw err2;
      }
    }
  }
}

// ===========================================
// DATABASE CONNECTION - LAZY INITIALIZATION
// ===========================================

// Singleton instances
let _client: Client | null = null;
let _db: LibSQLDatabase<typeof schema & typeof relations> | null = null;

/**
 * Check if database is configured
 */
export function isDatabaseConfigured(): boolean {
  const url = (process.env.DATABASE_URL ||
              process.env.TURSO_DATABASE_URL ||
              process.env.LIBSQL_URL || "").trim();
  const token = (process.env.DATABASE_AUTH_TOKEN ||
                process.env.TURSO_AUTH_TOKEN ||
                process.env.LIBSQL_AUTH_TOKEN || "").trim();

  // For local SQLite (file: URLs), no auth token is needed
  const isLocalSQLite = url.startsWith("file:");
  if (isLocalSQLite && url) {
    return true;
  }

  // For remote Turso, both URL and token are required
  const isConfigured = Boolean(url && token);

  if (!isConfigured && (url || token)) {
    console.warn("[DB] Partial configuration detected:", {
      hasUrl: Boolean(url),
      hasToken: Boolean(token),
    });
  }

  return isConfigured;
}

/**
 * Get database URL from environment
 */
function getDatabaseUrl(): string {
  const url = (process.env.DATABASE_URL ||
              process.env.TURSO_DATABASE_URL ||
              process.env.LIBSQL_URL || "").trim();

  if (!url) {
    console.error("[DB] Database URL not configured. Set DATABASE_URL environment variable.");
    throw new Error("Database URL not configured. Set DATABASE_URL environment variable.");
  }
  return url;
}

/**
 * Get auth token for Turso
 */
function getAuthToken(): string | undefined {
  const token = (process.env.DATABASE_AUTH_TOKEN ||
         process.env.TURSO_AUTH_TOKEN ||
         process.env.LIBSQL_AUTH_TOKEN || "").trim();
  return token || undefined;
}

// Track whether auto-migration has run
let _autoMigrationDone = false;

/**
 * Migrate stale CHECK constraints on social_post_queue and social_posts_log.
 *
 * SQLite does not support ALTER TABLE DROP CONSTRAINT, so the only way to
 * change a CHECK constraint is to recreate the table (create new → copy data → drop old → rename).
 *
 * We detect the stale constraint by checking if "curated_track" is present in the
 * SQL used to create the table (stored in sqlite_master).
 */
async function migrateStaleCheckConstraints(client: Client): Promise<void> {
  try {
    // Check social_post_queue
    const queueSchema = await client.execute(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='social_post_queue'"
    );
    const queueSql = queueSchema.rows[0]?.sql as string | undefined;
    if (queueSql && !queueSql.includes("curated_track")) {
      console.log("[DB] Migrating social_post_queue: adding curated_track + vertical_video to CHECK constraint...");
      await client.execute("ALTER TABLE social_post_queue RENAME TO social_post_queue_old");
      await client.execute(`
        CREATE TABLE social_post_queue (
          id TEXT PRIMARY KEY NOT NULL,
          content_type TEXT NOT NULL CHECK(content_type IN ('gallery_photo','spotify_track','artist_profile','curated_track','vertical_video')),
          source_id TEXT NOT NULL,
          artist_id TEXT,
          release_id TEXT,
          image_url TEXT NOT NULL,
          caption TEXT,
          link_url TEXT,
          queue_order INTEGER NOT NULL DEFAULT 0,
          cycle_number INTEGER NOT NULL DEFAULT 1,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','posted','failed','skipped')),
          platforms TEXT NOT NULL DEFAULT '["facebook","instagram"]',
          posted_platforms TEXT DEFAULT '[]',
          error_message TEXT,
          scheduled_at INTEGER,
          posted_at INTEGER,
          created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
          updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
        )
      `);
      await client.execute(`
        INSERT INTO social_post_queue
          SELECT * FROM social_post_queue_old
      `);
      await client.execute("DROP TABLE social_post_queue_old");
      console.log("[DB] social_post_queue migrated successfully");
    }

    // Check social_posts_log
    const logSchema = await client.execute(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='social_posts_log'"
    );
    const logSql = logSchema.rows[0]?.sql as string | undefined;
    if (logSql && (!logSql.includes("curated_track") || !logSql.includes("tiktok"))) {
      console.log("[DB] Migrating social_posts_log: adding curated_track, vertical_video, tiktok to CHECK constraints...");
      await client.execute("ALTER TABLE social_posts_log RENAME TO social_posts_log_old");
      await client.execute(`
        CREATE TABLE social_posts_log (
          id TEXT PRIMARY KEY NOT NULL,
          queue_id TEXT NOT NULL,
          platform TEXT NOT NULL CHECK(platform IN ('facebook','instagram','tiktok')),
          content_type TEXT NOT NULL CHECK(content_type IN ('gallery_photo','spotify_track','artist_profile','curated_track','vertical_video')),
          source_id TEXT NOT NULL,
          image_url TEXT NOT NULL,
          caption TEXT,
          link_url TEXT,
          platform_post_id TEXT,
          platform_post_url TEXT,
          meta_api_response TEXT,
          status TEXT NOT NULL CHECK(status IN ('success','failed','rate_limited')),
          error_message TEXT,
          likes INTEGER DEFAULT 0,
          comments INTEGER DEFAULT 0,
          shares INTEGER DEFAULT 0,
          reach INTEGER DEFAULT 0,
          impressions INTEGER DEFAULT 0,
          metrics_updated_at INTEGER,
          posted_at INTEGER NOT NULL,
          created_at INTEGER DEFAULT (unixepoch()) NOT NULL
        )
      `);
      await client.execute(`
        INSERT INTO social_posts_log
          SELECT * FROM social_posts_log_old
      `);
      await client.execute("DROP TABLE social_posts_log_old");
      console.log("[DB] social_posts_log migrated successfully");
    }
    // Check social_credentials
    const credSchema = await client.execute(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='social_credentials'"
    );
    const credSql = credSchema.rows[0]?.sql as string | undefined;
    if (credSql && !credSql.includes("tiktok")) {
      console.log("[DB] Migrating social_credentials: adding tiktok to CHECK constraint...");
      await client.execute("ALTER TABLE social_credentials RENAME TO social_credentials_old");
      await client.execute(`
        CREATE TABLE social_credentials (
          id TEXT PRIMARY KEY NOT NULL,
          platform TEXT NOT NULL CHECK(platform IN ('meta', 'tiktok')),
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          is_from_ui INTEGER DEFAULT 1 NOT NULL,
          created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
          updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
        )
      `);
      await client.execute(`
        INSERT INTO social_credentials
          SELECT * FROM social_credentials_old
      `);
      await client.execute("DROP TABLE social_credentials_old");
      console.log("[DB] social_credentials migrated successfully");
    }

    // Also check social_post_queue for youtube_video + processing status
    if (queueSql && (!queueSql.includes("youtube_video") || !queueSql.includes("processing"))) {
      console.log("[DB] Migrating social_post_queue: adding youtube_video + processing to CHECK constraints...");
      await client.execute("ALTER TABLE social_post_queue RENAME TO social_post_queue_old");
      await client.execute(`
        CREATE TABLE social_post_queue (
          id TEXT PRIMARY KEY NOT NULL,
          content_type TEXT NOT NULL CHECK(content_type IN ('gallery_photo','spotify_track','artist_profile','curated_track','vertical_video','youtube_video')),
          source_id TEXT NOT NULL,
          artist_id TEXT,
          release_id TEXT,
          image_url TEXT NOT NULL,
          caption TEXT,
          link_url TEXT,
          queue_order INTEGER NOT NULL DEFAULT 0,
          cycle_number INTEGER NOT NULL DEFAULT 1,
          status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','posted','failed','skipped')),
          platforms TEXT NOT NULL DEFAULT '["facebook","instagram"]',
          posted_platforms TEXT DEFAULT '[]',
          error_message TEXT,
          scheduled_at INTEGER,
          posted_at INTEGER,
          created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
          updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
        )
      `);
      await client.execute(`
        INSERT INTO social_post_queue
          SELECT * FROM social_post_queue_old
      `);
      await client.execute("DROP TABLE social_post_queue_old");
      console.log("[DB] social_post_queue migrated successfully (youtube_video + processing)");
    }

    // Also check social_posts_log for youtube_video + instagram_reel + facebook_reel + instagram_story
    // CRITICAL (2026-06-20): instagram_story was missing from the previous
    // migration. Without it, every IG Story log insert silently failed
    // with "CHECK constraint failed", which meant:
    //   - today-counts story query returned 0 (cap never triggered)
    //   - dedup set was always empty (same story reposted forever)
    // Adding instagram_story here is the actual root-cause fix.
    if (logSql && (!logSql.includes("youtube_video") || !logSql.includes("instagram_reel") || !logSql.includes("instagram_story"))) {
      console.log("[DB] Migrating social_posts_log: adding youtube_video, instagram_reel, facebook_reel, instagram_story to CHECK constraints...");
      await client.execute("ALTER TABLE social_posts_log RENAME TO social_posts_log_old");
      await client.execute(`
        CREATE TABLE social_posts_log (
          id TEXT PRIMARY KEY NOT NULL,
          queue_id TEXT NOT NULL,
          platform TEXT NOT NULL CHECK(platform IN ('facebook','instagram','tiktok','instagram_reel','facebook_reel','instagram_story')),
          content_type TEXT NOT NULL CHECK(content_type IN ('gallery_photo','spotify_track','artist_profile','curated_track','vertical_video','youtube_video','event')),
          source_id TEXT NOT NULL,
          image_url TEXT NOT NULL,
          caption TEXT,
          link_url TEXT,
          platform_post_id TEXT,
          platform_post_url TEXT,
          meta_api_response TEXT,
          status TEXT NOT NULL CHECK(status IN ('success','failed','rate_limited')),
          error_message TEXT,
          likes INTEGER DEFAULT 0,
          comments INTEGER DEFAULT 0,
          shares INTEGER DEFAULT 0,
          reach INTEGER DEFAULT 0,
          impressions INTEGER DEFAULT 0,
          metrics_updated_at INTEGER,
          posted_at INTEGER NOT NULL,
          created_at INTEGER DEFAULT (unixepoch()) NOT NULL
        )
      `);
      await client.execute(`
        INSERT INTO social_posts_log
          SELECT * FROM social_posts_log_old
      `);
      await client.execute("DROP TABLE social_posts_log_old");
      console.log("[DB] social_posts_log migrated successfully (youtube_video + reels + instagram_story)");
    }
  } catch (err) {
    console.error("[DB] Stale CHECK constraint migration failed (non-fatal):", err);
    // Non-fatal: the app will still work for existing content types,
    // but new types will fail until this migration succeeds.
  }
}

/**
 * Migrate old artist column names to the new ones expected by the Drizzle schema.
 *
 * Migration 0002 used different column names:
 *   header_image_url  → banner_image_url
 *   origin            → country
 *   active_since      → year_started
 *   booking_contact   → booking_email
 *   management_contact→ management_email
 *   spotify_monthly_listeners → monthly_listeners
 *   spotify_followers → followers
 *
 * We detect whether the old columns exist by checking sqlite_master,
 * then copy data from old → new (only when the new column is still NULL).
 */
async function migrateArtistColumns(client: Client): Promise<void> {
  try {
    // Check which columns the artists table actually has
    const tableInfo = await client.execute("PRAGMA table_info(artists)");
    const existingColumns = new Set(tableInfo.rows.map(r => r.name as string));

    const migrations: { oldCol: string; newCol: string; type: 'text' | 'integer' }[] = [
      { oldCol: "header_image_url", newCol: "banner_image_url", type: "text" },
      { oldCol: "origin", newCol: "country", type: "text" },
      { oldCol: "active_since", newCol: "year_started", type: "integer" },
      { oldCol: "booking_contact", newCol: "booking_email", type: "text" },
      { oldCol: "management_contact", newCol: "management_email", type: "text" },
      { oldCol: "spotify_monthly_listeners", newCol: "monthly_listeners", type: "integer" },
      { oldCol: "spotify_followers", newCol: "followers", type: "integer" },
    ];

    let migrated = 0;
    for (const { oldCol, newCol } of migrations) {
      // Only migrate if both old and new columns exist, and new column might still be empty
      if (existingColumns.has(oldCol) && existingColumns.has(newCol)) {
        try {
          await client.execute(
            `UPDATE artists SET ${newCol} = ${oldCol} WHERE ${newCol} IS NULL AND ${oldCol} IS NOT NULL`
          );
          migrated++;
        } catch (err) {
          console.warn(`[DB] Artist column migration ${oldCol} → ${newCol} failed:`, err);
        }
      }
    }

    if (migrated > 0) {
      console.log(`[DB] Migrated ${migrated} artist columns from old names to new names`);
    }
  } catch (err) {
    console.error("[DB] Artist column migration failed (non-fatal):", err);
  }
}

/**
 * Migrate old gallery_photos/gallery_albums column names to the new ones expected by Drizzle schema.
 *
 * Migration 0003 used different column names:
 *   is_public     → is_published  (gallery_photos)
 *   artist_ids    → artist_id     (gallery_photos, text array → single ID)
 *   is_public     → is_published  (gallery_albums)
 *
 * We detect whether the old columns exist by checking PRAGMA table_info,
 * then copy data from old → new (only when the new column is still NULL/default).
 */
async function migrateGalleryColumns(client: Client): Promise<void> {
  try {
    // === gallery_photos ===
    const photosInfo = await client.execute("PRAGMA table_info(gallery_photos)");
    const photoColumns = new Set(photosInfo.rows.map(r => r.name as string));

    // is_public → is_published
    if (photoColumns.has("is_public") && photoColumns.has("is_published")) {
      try {
        await client.execute(
          `UPDATE gallery_photos SET is_published = is_public WHERE is_published IS NULL OR is_published = 1`
        );
        // Actually set is_published = is_public for all rows (is_public may be 0)
        await client.execute(
          `UPDATE gallery_photos SET is_published = is_public`
        );
        console.log("[DB] gallery_photos: migrated is_public → is_published");
      } catch (err) {
        console.warn("[DB] gallery_photos is_public migration failed:", err);
      }
    }

    // artist_ids (JSON text array) → artist_id (single text)
    if (photoColumns.has("artist_ids") && photoColumns.has("artist_id")) {
      try {
        // Parse the JSON array and take the first element
        await client.execute(
          `UPDATE gallery_photos SET artist_id = CASE
            WHEN artist_ids IS NOT NULL AND artist_ids != '[]' AND artist_ids != ''
            THEN json_extract(artist_ids, '$[0]')
            ELSE NULL
          END
          WHERE artist_id IS NULL AND artist_ids IS NOT NULL`
        );
        // Fallback for non-JSON format (just a plain ID string)
        await client.execute(
          `UPDATE gallery_photos SET artist_id = artist_ids
          WHERE artist_id IS NULL AND artist_ids IS NOT NULL AND artist_ids NOT LIKE '[%'`
        );
        console.log("[DB] gallery_photos: migrated artist_ids → artist_id");
      } catch (err) {
        console.warn("[DB] gallery_photos artist_ids migration failed:", err);
      }
    }

    // === gallery_albums ===
    const albumsInfo = await client.execute("PRAGMA table_info(gallery_albums)");
    const albumColumns = new Set(albumsInfo.rows.map(r => r.name as string));

    // is_public → is_published
    if (albumColumns.has("is_public") && albumColumns.has("is_published")) {
      try {
        await client.execute(
          `UPDATE gallery_albums SET is_published = is_public`
        );
        console.log("[DB] gallery_albums: migrated is_public → is_published");
      } catch (err) {
        console.warn("[DB] gallery_albums is_public migration failed:", err);
      }
    }
  } catch (err) {
    console.error("[DB] Gallery column migration failed (non-fatal):", err);
  }
}

/**
 * Run auto-migration to ensure critical tables exist.
 * This runs once when the database client is first initialized.
 * Uses CREATE TABLE IF NOT EXISTS so it's safe to run repeatedly.
 */
async function runAutoMigration(client: Client): Promise<void> {
  if (_autoMigrationDone) return;
  _autoMigrationDone = true;

  try {
    console.log("[DB] Running auto-migration to ensure critical tables...");

    const criticalTables = [
      // Site Settings table (used by Spotify OAuth, Dropbox, and other integrations)
      `CREATE TABLE IF NOT EXISTS site_settings (
        id TEXT PRIMARY KEY NOT NULL,
        key TEXT NOT NULL UNIQUE,
        value TEXT,
        type TEXT NOT NULL DEFAULT 'string',
        description TEXT,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
      )`,
      // Users table (admin authentication)
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT,
        role TEXT NOT NULL DEFAULT 'viewer',
        is_active INTEGER DEFAULT 1 NOT NULL,
        last_login_at INTEGER,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
      )`,
      // Sessions table (admin authentication)
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL
      )`,
      // Social Auto-Posting tables
      `CREATE TABLE IF NOT EXISTS social_post_queue (
        id TEXT PRIMARY KEY NOT NULL,
        content_type TEXT NOT NULL CHECK(content_type IN ('gallery_photo','spotify_track','artist_profile','curated_track','vertical_video')),
        source_id TEXT NOT NULL,
        artist_id TEXT,
        release_id TEXT,
        image_url TEXT NOT NULL,
        caption TEXT,
        link_url TEXT,
        queue_order INTEGER NOT NULL DEFAULT 0,
        cycle_number INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','posted','failed','skipped')),
        platforms TEXT NOT NULL DEFAULT '["facebook","instagram"]',
        posted_platforms TEXT DEFAULT '[]',
        error_message TEXT,
        scheduled_at INTEGER,
        posted_at INTEGER,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS social_posts_log (
        id TEXT PRIMARY KEY NOT NULL,
        queue_id TEXT NOT NULL,
        platform TEXT NOT NULL CHECK(platform IN ('facebook','instagram','tiktok','instagram_reel','facebook_reel','instagram_story')),
        content_type TEXT NOT NULL CHECK(content_type IN ('gallery_photo','spotify_track','artist_profile','curated_track','vertical_video','youtube_video','event')),
        source_id TEXT NOT NULL,
        image_url TEXT NOT NULL,
        caption TEXT,
        link_url TEXT,
        platform_post_id TEXT,
        platform_post_url TEXT,
        meta_api_response TEXT,
        status TEXT NOT NULL CHECK(status IN ('success','failed','rate_limited')),
        error_message TEXT,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        reach INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        metrics_updated_at INTEGER,
        posted_at INTEGER NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL
      )`,
      // Dropbox link cache — resolved temp links for video playback.
      // See src/db/schema/video-cache.ts for rationale.
      `CREATE TABLE IF NOT EXISTS dropbox_link_cache (
        dropbox_url TEXT PRIMARY KEY NOT NULL,
        temp_link TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_dropbox_link_cache_expires ON dropbox_link_cache(expires_at)`,
      `CREATE TABLE IF NOT EXISTS curated_playlists (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        cover_image_url TEXT,
        cover_color TEXT,
        is_public INTEGER DEFAULT 1 NOT NULL,
        is_active INTEGER DEFAULT 1 NOT NULL,
        priority INTEGER DEFAULT 0 NOT NULL,
        spotify_playlist_id TEXT,
        spotify_playlist_url TEXT,
        track_count INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS playlist_tracks (
        id TEXT PRIMARY KEY,
        playlist_id TEXT NOT NULL,
        playlist_name TEXT,
        spotify_track_id TEXT NOT NULL,
        curated_track_id TEXT,
        track_name TEXT NOT NULL,
        artist_name TEXT NOT NULL,
        album_image_url TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER DEFAULT 1 NOT NULL,
        added_by TEXT,
        added_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS curated_spotify_channels (
        id TEXT PRIMARY KEY,
        spotify_artist_id TEXT NOT NULL UNIQUE,
        spotify_artist_url TEXT NOT NULL,
        name TEXT NOT NULL,
        image_url TEXT,
        genres TEXT,
        popularity INTEGER,
        followers INTEGER,
        category TEXT NOT NULL DEFAULT 'roster',
        priority INTEGER NOT NULL DEFAULT 0,
        description TEXT,
        auto_sync INTEGER DEFAULT 1 NOT NULL,
        sync_new_releases INTEGER DEFAULT 1 NOT NULL,
        sync_top_tracks INTEGER DEFAULT 1 NOT NULL,
        is_active INTEGER DEFAULT 1 NOT NULL,
        last_synced_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS curated_tracks (
        id TEXT PRIMARY KEY,
        spotify_track_id TEXT NOT NULL UNIQUE,
        spotify_track_url TEXT NOT NULL,
        spotify_album_id TEXT,
        name TEXT NOT NULL,
        artist_name TEXT NOT NULL,
        artist_ids TEXT,
        album_name TEXT,
        album_image_url TEXT,
        duration_ms INTEGER,
        preview_url TEXT,
        release_date TEXT,
        popularity INTEGER,
        explicit INTEGER DEFAULT 0 NOT NULL,
        curated_channel_id TEXT,
        is_available_for_playlist INTEGER DEFAULT 1 NOT NULL,
        is_featured INTEGER DEFAULT 0 NOT NULL,
        admin_notes TEXT,
        added_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`,
      `CREATE TABLE IF NOT EXISTS social_credentials (
        id TEXT PRIMARY KEY NOT NULL,
        platform TEXT NOT NULL CHECK(platform IN ('meta', 'tiktok')),
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        is_from_ui INTEGER DEFAULT 1 NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_social_credentials_platform_key ON social_credentials(platform, key)`,
      // Vertical Video Events (Albums/Groupings)
      `CREATE TABLE IF NOT EXISTS vertical_video_events (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        cover_image_url TEXT,
        artist_id TEXT,
        event_date INTEGER,
        location TEXT,
        is_published INTEGER DEFAULT 1 NOT NULL,
        display_order INTEGER DEFAULT 0 NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
      )`,
      // Vertical Videos (9:16 Reels / Shorts)
      `CREATE TABLE IF NOT EXISTS vertical_videos (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT,
        description TEXT,
        video_url TEXT NOT NULL,
        thumbnail_url TEXT,
        duration INTEGER,
        width INTEGER,
        height INTEGER,
        file_size INTEGER,
        mime_type TEXT,
        platform TEXT,
        platform_id TEXT,
        platform_url TEXT,
        embed_url TEXT,
        artist_id TEXT,
        event_id TEXT,
        is_featured INTEGER DEFAULT 0 NOT NULL,
        is_published INTEGER DEFAULT 1 NOT NULL,
        display_order INTEGER DEFAULT 0 NOT NULL,
        share_count INTEGER DEFAULT 0 NOT NULL,
        view_count INTEGER DEFAULT 0 NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS vertical_video_tags (
        id TEXT PRIMARY KEY,
        video_id TEXT NOT NULL REFERENCES vertical_videos(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_vertical_videos_published ON vertical_videos(is_published, display_order)`,
      `CREATE INDEX IF NOT EXISTS idx_vertical_videos_featured ON vertical_videos(is_featured)`,
      `CREATE INDEX IF NOT EXISTS idx_vertical_videos_artist ON vertical_videos(artist_id)`,
      `CREATE INDEX IF NOT EXISTS idx_vertical_video_tags_video ON vertical_video_tags(video_id)`,
      // Analytics table (visitor tracking)
      `CREATE TABLE IF NOT EXISTS analytics (
        id TEXT PRIMARY KEY NOT NULL,
        event_type TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        metadata TEXT,
        session_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        referrer TEXT,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type)`,
      `CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON analytics(session_id)`,
      `CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_analytics_entity_id ON analytics(entity_id)`,
      // Subscribers table (newsletter subscribers with source tracking)
      `CREATE TABLE IF NOT EXISTS subscribers (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        is_active INTEGER DEFAULT 1 NOT NULL,
        mailchimp_id TEXT,
        source TEXT,
        subscribed_at INTEGER DEFAULT (unixepoch()) NOT NULL,
        unsubscribed_at INTEGER,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
      )`,
      // Segments table (newsletter audience segments)
      `CREATE TABLE IF NOT EXISTS segments (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        mailchimp_id TEXT,
        member_count INTEGER DEFAULT 0 NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
      )`,
      // Email Campaigns table
      `CREATE TABLE IF NOT EXISTS email_campaigns (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        subject TEXT NOT NULL,
        preview_text TEXT,
        content TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        mailchimp_campaign_id TEXT,
        segment_id TEXT REFERENCES segments(id) ON DELETE SET NULL,
        scheduled_at INTEGER,
        sent_at INTEGER,
        open_rate INTEGER,
        click_rate INTEGER,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email)`,
      `CREATE INDEX IF NOT EXISTS idx_subscribers_source ON subscribers(source)`,
    ];

    // Add missing columns (safe - ignores "duplicate column" errors)
    const addColumns = [
      `ALTER TABLE curated_playlists ADD COLUMN cover_color TEXT`,
      `ALTER TABLE curated_playlists ADD COLUMN spotify_playlist_id TEXT`,
      `ALTER TABLE curated_playlists ADD COLUMN spotify_playlist_url TEXT`,
      `ALTER TABLE curated_playlists ADD COLUMN track_count INTEGER DEFAULT 0`,
      `ALTER TABLE playlist_tracks ADD COLUMN curated_track_id TEXT`,
      `ALTER TABLE playlist_tracks ADD COLUMN added_by TEXT`,

      // === ARTISTS TABLE - columns expected by Drizzle schema but missing from old migrations ===
      // Migration 0002 used different column names (header_image_url, origin, active_since, etc.)
      // These are the correct column names that match the Drizzle schema
      `ALTER TABLE artists ADD COLUMN real_name TEXT`,
      `ALTER TABLE artists ADD COLUMN banner_image_url TEXT`,
      `ALTER TABLE artists ADD COLUMN country TEXT`,
      `ALTER TABLE artists ADD COLUMN year_started INTEGER`,
      `ALTER TABLE artists ADD COLUMN booking_email TEXT`,
      `ALTER TABLE artists ADD COLUMN management_email TEXT`,
      `ALTER TABLE artists ADD COLUMN website_url TEXT`,
      `ALTER TABLE artists ADD COLUMN monthly_listeners INTEGER`,
      `ALTER TABLE artists ADD COLUMN followers INTEGER`,
      `ALTER TABLE artists ADD COLUMN location TEXT`,
      `ALTER TABLE artists ADD COLUMN labels TEXT`,

      // === GALLERY PHOTOS - columns expected by Drizzle schema but missing from migration 0003 ===
      // Migration 0003 used: is_public (not is_published), artist_ids (not artist_id), etc.
      `ALTER TABLE gallery_photos ADD COLUMN is_published INTEGER DEFAULT 1 NOT NULL`,
      `ALTER TABLE gallery_photos ADD COLUMN artist_id TEXT`,
      `ALTER TABLE gallery_photos ADD COLUMN description TEXT`,
      `ALTER TABLE gallery_photos ADD COLUMN is_featured INTEGER DEFAULT 0 NOT NULL`,
      `ALTER TABLE gallery_photos ADD COLUMN mime_type TEXT`,
      `ALTER TABLE gallery_photos ADD COLUMN file_size INTEGER`,
      `ALTER TABLE gallery_photos ADD COLUMN alt_text TEXT`,
      `ALTER TABLE gallery_photos ADD COLUMN album_id TEXT`,

      // === GALLERY ALBUMS - columns expected by Drizzle schema ===
      `ALTER TABLE gallery_albums ADD COLUMN is_published INTEGER DEFAULT 1 NOT NULL`,
      `ALTER TABLE gallery_albums ADD COLUMN cover_photo_id TEXT`,
      `ALTER TABLE gallery_albums ADD COLUMN sort_order INTEGER DEFAULT 0 NOT NULL`,

      // === VIDEOS TABLE - missing display_order column ===
      `ALTER TABLE videos ADD COLUMN display_order INTEGER DEFAULT 0 NOT NULL`,

      // === VERTICAL VIDEOS - event_id column for event grouping ===
      `ALTER TABLE vertical_videos ADD COLUMN event_id TEXT`,

      // === SUBSCRIBERS - source column for tracking subscription origin ===
      `ALTER TABLE subscribers ADD COLUMN source TEXT`,
      `ALTER TABLE subscribers ADD COLUMN mailchimp_id TEXT`,
    ];

    for (const sql of criticalTables) {
      await client.execute(sql);
    }

    for (const sql of addColumns) {
      try {
        await client.execute(sql);
      } catch (err: any) {
        // "duplicate column name" means it already exists — that's fine
        if (!String(err?.message || "").includes("duplicate column name")) {
          console.warn("[DB] Auto-migration column warning:", err);
        }
      }
    }

    // ===========================================
    // MIGRATE ARTIST OLD COLUMNS → NEW COLUMNS
    // ===========================================
    // Migration 0002 used different column names. Copy data from old columns
    // to the new ones (if the old columns still exist and have data).
    await migrateArtistColumns(client);

    // ===========================================
    // MIGRATE GALLERY PHOTOS OLD COLUMNS → NEW COLUMNS
    // ===========================================
    // Migration 0003 used: is_public, artist_ids
    // Drizzle schema expects: is_published, artist_id
    await migrateGalleryColumns(client);

    // ===========================================
    // MIGRATE STALE CHECK CONSTRAINTS
    // ===========================================
    // SQLite doesn't support ALTER TABLE DROP CONSTRAINT, so we must
    // recreate tables that have outdated CHECK constraints.
    // The original social_post_queue and social_posts_log tables only
    // allowed 3 content types; now we need 5 (+ curated_track, vertical_video).
    // social_posts_log also needs tiktok in the platform CHECK.

    await migrateStaleCheckConstraints(client);

    console.log("[DB] Auto-migration completed successfully");
  } catch (error) {
    console.error("[DB] Auto-migration failed (non-fatal):", error);
    // Don't throw — the app should still work even if migration partially fails
  }
}

/**
 * Get or create database client (lazy initialization)
 */
function getClient(): Client {
  if (!_client) {
    console.log("[DB] Initializing database client...");
    try {
      initClientFactory();
      _client = _createClientFn!({
        url: getDatabaseUrl(),
        authToken: getAuthToken(),
      });
      console.log("[DB] Database client initialized successfully");

      // Run auto-migration asynchronously (don't block client creation)
      runAutoMigration(_client).catch(() => {});
    } catch (error) {
      console.error("[DB] Failed to create database client:", error);
      throw error;
    }
  }
  return _client;
}

/**
 * Get Drizzle ORM instance (lazy initialization)
 */
function getDb(): LibSQLDatabase<typeof schema & typeof relations> {
  if (!_db) {
    const client = getClient();
    _db = drizzle(client, { schema: { ...schema, ...relations } });
  }
  return _db;
}

// ===========================================
// DRIZZLE INSTANCE (LAZY PROXY)
// ===========================================

// Helper to create chainable stub methods that always return empty results
function createChainableStub(): any {
  const chainable: any = {
    from: () => chainable,
    where: () => chainable,
    orderBy: () => chainable,
    limit: () => chainable,
    offset: () => chainable,
    values: () => chainable,
    set: () => chainable,
    returning: () => Promise.resolve([]),
    then: (resolve: (value: any[]) => any) => resolve([]),
  };
  return chainable;
}

// Create a proxy that lazily initializes the database on first access
// This prevents build-time failures when DATABASE_URL is not available
export const db = new Proxy({} as LibSQLDatabase<typeof schema & typeof relations>, {
  get(target, prop) {
    // If DB is not configured (build time OR runtime), return safe defaults
    if (!isDatabaseConfigured()) {
      console.warn(`[DB] Database not configured - returning stub for ${String(prop)}`);

      // Return a no-op function for common methods to prevent crashes
      if (prop === "select" || prop === "insert" || prop === "update" || prop === "delete") {
        return () => createChainableStub();
      }
      if (prop === "query") {
        return new Proxy({}, {
          get: () => ({
            findMany: () => Promise.resolve([]),
            findFirst: () => Promise.resolve(null)
          })
        });
      }
      // For any other property, return undefined
      return undefined;
    }

    const realDb = getDb();
    const value = realDb[prop as keyof typeof realDb];
    if (typeof value === "function") {
      return value.bind(realDb);
    }
    return value;
  }
});

// ===========================================
// DATABASE UTILITIES
// ===========================================

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  // HTTP client doesn't need closing
  _client = null;
  _db = null;
}

/**
 * Execute raw SQL
 */
export async function executeRaw(sql: string): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.warn("[DB] Cannot execute raw SQL - database not configured");
    return;
  }
  const client = getClient();
  await client.execute(sql);
}

/**
 * Check database connection
 */
export async function checkConnection(): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    console.log("[DB] Database not configured");
    return false;
  }

  try {
    const client = getClient();
    await client.execute("SELECT 1");
    console.log("[DB] Database connection healthy");
    return true;
  } catch (error) {
    console.error("[DB] Database connection failed:", error);
    return false;
  }
}

// ===========================================
// EXPORTS
// ===========================================

export { schema };
export type Database = typeof db;
