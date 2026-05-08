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
      // Social Auto-Posting tables
      `CREATE TABLE IF NOT EXISTS social_post_queue (
        id TEXT PRIMARY KEY NOT NULL,
        content_type TEXT NOT NULL CHECK(content_type IN ('gallery_photo','spotify_track','artist_profile')),
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
        platform TEXT NOT NULL CHECK(platform IN ('facebook','instagram')),
        content_type TEXT NOT NULL CHECK(content_type IN ('gallery_photo','spotify_track','artist_profile')),
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
        platform TEXT NOT NULL CHECK(platform IN ('meta','tiktok')),
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        is_from_ui INTEGER DEFAULT 1 NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_social_credentials_platform_key ON social_credentials(platform, key)`,
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
    ];

    // Add missing columns (safe - ignores "duplicate column" errors)
    const addColumns = [
      `ALTER TABLE curated_playlists ADD COLUMN cover_color TEXT`,
      `ALTER TABLE curated_playlists ADD COLUMN spotify_playlist_id TEXT`,
      `ALTER TABLE curated_playlists ADD COLUMN spotify_playlist_url TEXT`,
      `ALTER TABLE curated_playlists ADD COLUMN track_count INTEGER DEFAULT 0`,
      `ALTER TABLE playlist_tracks ADD COLUMN curated_track_id TEXT`,
      `ALTER TABLE playlist_tracks ADD COLUMN added_by TEXT`,
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
