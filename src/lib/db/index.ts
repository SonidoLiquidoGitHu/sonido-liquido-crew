import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;

export async function getClient(): Promise<Client> {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    // If no URL or it's a local file path, use in-memory SQLite for demo
    const isLocalFile = url?.startsWith("file:");
    const isProduction = process.env.NODE_ENV === "production";

    if (!url || (isLocalFile && isProduction)) {
      // Use in-memory SQLite for serverless environments or when no Turso configured
      console.log("Using in-memory SQLite database (demo mode)");
      client = createClient({
        url: ":memory:",
      });
    } else {
      client = createClient({
        url,
        authToken,
      });
    }
  }

  return client;
}

// Helper to safely add a column if it doesn't exist
async function addColumnIfNotExists(
  db: Client,
  table: string,
  column: string,
  definition: string
): Promise<void> {
  try {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`Added column ${column} to ${table}`);
  } catch (e: unknown) {
    // Column already exists, ignore
  }
}

export async function initializeDatabase(): Promise<void> {
  const db = await getClient();

  // Create artists table with all required columns
  await db.execute(`
    CREATE TABLE IF NOT EXISTS artists (
      id TEXT PRIMARY KEY,
      spotify_id TEXT UNIQUE,
      name TEXT NOT NULL,
      display_name TEXT,
      slug TEXT,
      role TEXT,
      bio TEXT,
      image_url TEXT,
      profile_image_url TEXT,
      genres TEXT,
      followers INTEGER DEFAULT 0,
      popularity INTEGER DEFAULT 0,
      spotify_url TEXT,
      youtube_url TEXT,
      instagram_url TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create releases table with all required columns for media releases
  await db.execute(`
    CREATE TABLE IF NOT EXISTS releases (
      id TEXT PRIMARY KEY,
      spotify_id TEXT UNIQUE,
      artist_id TEXT,
      artist_name TEXT,
      featured_artists TEXT,
      slug TEXT,
      title TEXT NOT NULL,
      title_en TEXT,
      release_type TEXT DEFAULT 'album',
      release_date TEXT,
      image_url TEXT,
      cover_image_url TEXT,
      spotify_url TEXT,
      total_tracks INTEGER DEFAULT 0,
      is_featured INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      is_public INTEGER DEFAULT 1,
      description_es TEXT,
      description_en TEXT,
      press_release_es TEXT,
      press_release_en TEXT,
      credits_es TEXT,
      credits_en TEXT,
      quotes TEXT,
      press_photos TEXT,
      youtube_video_id TEXT,
      soundcloud_url TEXT,
      audio_preview_url TEXT,
      presave_onerpm TEXT,
      presave_distrokid TEXT,
      presave_bandcamp TEXT,
      presave_direct TEXT,
      social_preview_title TEXT,
      social_preview_description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artist_id) REFERENCES artists(id)
    )
  `);

  // Create release_tracks table for multi-track support
  await db.execute(`
    CREATE TABLE IF NOT EXISTS release_tracks (
      id TEXT PRIMARY KEY,
      release_id TEXT NOT NULL,
      track_number INTEGER DEFAULT 1,
      title TEXT NOT NULL,
      artist_name TEXT,
      duration TEXT,
      audio_url TEXT,
      is_featured INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
    )
  `);

  // Create beats table for beat catalog
  await db.execute(`
    CREATE TABLE IF NOT EXISTS beats (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      producer_name TEXT NOT NULL,
      slug TEXT,
      release_date TEXT,
      bpm INTEGER,
      key_signature TEXT,
      tags TEXT,
      cover_image_url TEXT,
      audio_file_url TEXT,
      audio_preview_url TEXT,
      hypeddit_url TEXT,
      spotify_track_id TEXT,
      youtube_video_id TEXT,
      onerpm_url TEXT,
      distrokid_url TEXT,
      bandcamp_url TEXT,
      download_gate_enabled INTEGER DEFAULT 0,
      download_count INTEGER DEFAULT 0,
      is_available INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create download_gate_actions table for beat download requirements
  await db.execute(`
    CREATE TABLE IF NOT EXISTS download_gate_actions (
      id TEXT PRIMARY KEY,
      beat_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      label TEXT NOT NULL,
      url TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (beat_id) REFERENCES beats(id) ON DELETE CASCADE
    )
  `);

  // Create videos table with all required columns
  await db.execute(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      youtube_id TEXT UNIQUE,
      artist_id TEXT,
      artist_name TEXT,
      title TEXT NOT NULL,
      description TEXT,
      thumbnail_url TEXT,
      youtube_url TEXT,
      view_count INTEGER DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0,
      published_at TEXT,
      is_featured INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artist_id) REFERENCES artists(id)
    )
  `);

  // Create events table with all required columns
  await db.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      venue TEXT,
      city TEXT,
      country TEXT,
      event_date TEXT,
      event_time TEXT,
      ticket_url TEXT,
      image_url TEXT,
      is_featured INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      status TEXT DEFAULT 'upcoming',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create sync_logs table for tracking sync operations
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY,
      sync_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      items_synced INTEGER DEFAULT 0,
      artists_synced INTEGER DEFAULT 0,
      releases_synced INTEGER DEFAULT 0,
      error_message TEXT,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    )
  `);

  // Create newsletter_subscribers table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      subscribed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    )
  `);

  // Create newsletter_settings table for reward file
  await db.execute(`
    CREATE TABLE IF NOT EXISTS newsletter_settings (
      id TEXT PRIMARY KEY,
      reward_file_url TEXT,
      reward_file_name TEXT,
      reward_title TEXT DEFAULT 'Exclusive Content',
      reward_description TEXT DEFAULT 'Download our exclusive content as a thank you for subscribing!',
      popup_title TEXT DEFAULT 'Join Our Newsletter',
      popup_description TEXT DEFAULT 'Get exclusive updates, new releases, and special content delivered to your inbox.',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create upcoming_releases table for "Próximos Lanzamientos" section
  await db.execute(`
    CREATE TABLE IF NOT EXISTS upcoming_releases (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist_name TEXT NOT NULL,
      release_type TEXT DEFAULT 'single',
      release_date TEXT NOT NULL,
      cover_image_url TEXT,
      description TEXT,
      status TEXT DEFAULT 'listo',
      is_featured INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      presave_url TEXT,
      presave_platform TEXT DEFAULT 'onerpm',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add any missing columns to existing tables
  await runMigrations(db);

  console.log("Database tables initialized successfully");
}

async function runMigrations(db: Client): Promise<void> {
  // Artists table migrations
  await addColumnIfNotExists(db, "artists", "display_name", "TEXT");
  await addColumnIfNotExists(db, "artists", "slug", "TEXT");
  await addColumnIfNotExists(db, "artists", "role", "TEXT");
  await addColumnIfNotExists(db, "artists", "profile_image_url", "TEXT");
  await addColumnIfNotExists(db, "artists", "youtube_url", "TEXT");
  await addColumnIfNotExists(db, "artists", "instagram_url", "TEXT");
  await addColumnIfNotExists(db, "artists", "sort_order", "INTEGER DEFAULT 0");

  // Releases table migrations - bilingual and media fields
  await addColumnIfNotExists(db, "releases", "artist_name", "TEXT");
  await addColumnIfNotExists(db, "releases", "featured_artists", "TEXT");
  await addColumnIfNotExists(db, "releases", "slug", "TEXT");
  await addColumnIfNotExists(db, "releases", "title_en", "TEXT");
  await addColumnIfNotExists(db, "releases", "cover_image_url", "TEXT");
  await addColumnIfNotExists(db, "releases", "is_published", "INTEGER DEFAULT 1");
  await addColumnIfNotExists(db, "releases", "is_active", "INTEGER DEFAULT 1");
  await addColumnIfNotExists(db, "releases", "is_public", "INTEGER DEFAULT 1");
  await addColumnIfNotExists(db, "releases", "description_es", "TEXT");
  await addColumnIfNotExists(db, "releases", "description_en", "TEXT");
  await addColumnIfNotExists(db, "releases", "press_release_es", "TEXT");
  await addColumnIfNotExists(db, "releases", "press_release_en", "TEXT");
  await addColumnIfNotExists(db, "releases", "credits_es", "TEXT");
  await addColumnIfNotExists(db, "releases", "credits_en", "TEXT");
  await addColumnIfNotExists(db, "releases", "quotes", "TEXT");
  await addColumnIfNotExists(db, "releases", "press_photos", "TEXT");
  await addColumnIfNotExists(db, "releases", "youtube_video_id", "TEXT");
  await addColumnIfNotExists(db, "releases", "soundcloud_url", "TEXT");
  await addColumnIfNotExists(db, "releases", "audio_preview_url", "TEXT");
  await addColumnIfNotExists(db, "releases", "presave_onerpm", "TEXT");
  await addColumnIfNotExists(db, "releases", "presave_distrokid", "TEXT");
  await addColumnIfNotExists(db, "releases", "presave_bandcamp", "TEXT");
  await addColumnIfNotExists(db, "releases", "presave_direct", "TEXT");
  await addColumnIfNotExists(db, "releases", "social_preview_title", "TEXT");
  await addColumnIfNotExists(db, "releases", "social_preview_description", "TEXT");

  // Videos table migrations
  await addColumnIfNotExists(db, "videos", "artist_name", "TEXT");
  await addColumnIfNotExists(db, "videos", "duration_seconds", "INTEGER DEFAULT 0");
  await addColumnIfNotExists(db, "videos", "is_published", "INTEGER DEFAULT 1");

  // Events table migrations
  await addColumnIfNotExists(db, "events", "is_published", "INTEGER DEFAULT 1");

  // Sync logs table migrations
  await addColumnIfNotExists(db, "sync_logs", "artists_synced", "INTEGER DEFAULT 0");
  await addColumnIfNotExists(db, "sync_logs", "releases_synced", "INTEGER DEFAULT 0");
}

// Alias exports for backward compatibility
export const getDb = getClient;
export const db = { getClient };

export type { Client };
