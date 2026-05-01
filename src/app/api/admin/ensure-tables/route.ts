import { NextResponse } from "next/server";
import { executeRaw, isDatabaseConfigured, checkConnection } from "@/db/client";

export const dynamic = "force-dynamic";

// SQL statements to ensure all required tables exist
const ENSURE_TABLES_SQL = [
  // === COMMUNITY FEATURES ===
  `CREATE TABLE IF NOT EXISTS fan_wall_messages (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT,
    avatar_url TEXT,
    country TEXT,
    city TEXT,
    message TEXT NOT NULL,
    reaction TEXT,
    artist_id TEXT,
    release_id TEXT,
    event_id TEXT,
    is_approved INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    is_hidden INTEGER DEFAULT 0,
    moderated_at INTEGER,
    moderated_by TEXT,
    background_color TEXT,
    font_style TEXT,
    position INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  )`,

  `CREATE TABLE IF NOT EXISTS user_playlists (
    id TEXT PRIMARY KEY,
    owner_email TEXT NOT NULL,
    owner_name TEXT,
    session_token TEXT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    cover_image_url TEXT,
    is_public INTEGER DEFAULT 1,
    play_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  )`,

  `CREATE TABLE IF NOT EXISTS user_playlist_tracks (
    id TEXT PRIMARY KEY,
    playlist_id TEXT NOT NULL,
    track_type TEXT NOT NULL,
    track_id TEXT NOT NULL,
    track_title TEXT NOT NULL,
    track_artist TEXT NOT NULL,
    track_cover_url TEXT,
    track_duration INTEGER,
    spotify_uri TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    added_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  )`,

  `CREATE TABLE IF NOT EXISTS playlist_collaborators (
    id TEXT PRIMARY KEY,
    playlist_id TEXT NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'contributor',
    invite_token TEXT,
    invited_by TEXT,
    invited_at INTEGER,
    accepted_at INTEGER,
    can_add_tracks INTEGER DEFAULT 1,
    can_remove_tracks INTEGER DEFAULT 0,
    can_edit_details INTEGER DEFAULT 0,
    can_invite_others INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  )`,

  `CREATE TABLE IF NOT EXISTS concert_memories (
    id TEXT PRIMARY KEY,
    submitter_name TEXT NOT NULL,
    submitter_email TEXT,
    submitter_instagram TEXT,
    event_id TEXT,
    event_name TEXT,
    event_date INTEGER,
    event_venue TEXT,
    event_city TEXT,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    taken_at INTEGER,
    camera_info TEXT,
    tagged_artists TEXT,
    is_approved INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    is_hidden INTEGER DEFAULT 0,
    moderated_at INTEGER,
    like_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  )`,

  `CREATE TABLE IF NOT EXISTS collaboration_stories (
    id TEXT PRIMARY KEY,
    release_id TEXT NOT NULL,
    release_title TEXT NOT NULL,
    title TEXT,
    story TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  )`,

  `CREATE TABLE IF NOT EXISTS release_collaborators (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    release_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    artist_id TEXT,
    spotify_url TEXT,
    instagram_url TEXT,
    twitter_url TEXT,
    website_url TEXT,
    photo_url TEXT,
    contribution TEXT,
    quote TEXT,
    position INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  )`,

  `CREATE TABLE IF NOT EXISTS story_media (
    id TEXT PRIMARY KEY,
    story_id TEXT NOT NULL,
    media_type TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    width INTEGER,
    height INTEGER,
    duration INTEGER,
    position INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  )`,

  `CREATE TABLE IF NOT EXISTS track_lyrics (
    id TEXT PRIMARY KEY,
    release_id TEXT,
    spotify_uri TEXT,
    track_title TEXT NOT NULL,
    track_artist TEXT NOT NULL,
    lyrics TEXT NOT NULL,
    language TEXT DEFAULT 'es',
    lyrics_source TEXT,
    lyrics_contributor TEXT,
    has_synced_lyrics INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  )`,

  `CREATE TABLE IF NOT EXISTS synced_lyric_lines (
    id TEXT PRIMARY KEY,
    lyrics_id TEXT NOT NULL,
    text TEXT NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    word_timings TEXT,
    line_number INTEGER NOT NULL,
    is_chorus INTEGER DEFAULT 0,
    speaker TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  )`,

  `CREATE TABLE IF NOT EXISTS trusted_contributors (
    id TEXT PRIMARY KEY,
    identifier_type TEXT NOT NULL,
    identifier_value TEXT NOT NULL,
    display_name TEXT,
    trust_level INTEGER DEFAULT 1,
    auto_approve_messages INTEGER DEFAULT 1,
    auto_approve_photos INTEGER DEFAULT 1,
    auto_feature INTEGER DEFAULT 0,
    notes TEXT,
    added_by TEXT,
    approved_count INTEGER DEFAULT 0,
    last_submission_at INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  )`,

  `CREATE TABLE IF NOT EXISTS playlist_embed_stats (
    id TEXT PRIMARY KEY,
    playlist_id TEXT NOT NULL,
    embed_type TEXT DEFAULT 'iframe',
    referrer_domain TEXT,
    referrer_url TEXT,
    view_count INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    first_seen_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    last_seen_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  )`,

  // === GALLERY ===
  `CREATE TABLE IF NOT EXISTS gallery_albums (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    cover_photo_id TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE TABLE IF NOT EXISTS gallery_photos (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    mime_type TEXT,
    album_id TEXT,
    artist_id TEXT,
    photographer TEXT,
    location TEXT,
    taken_at INTEGER,
    is_featured INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    alt_text TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  `CREATE TABLE IF NOT EXISTS photo_tags (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  // === ARTIST GALLERY ASSETS ===
  `CREATE TABLE IF NOT EXISTS artist_gallery_assets (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL,
    asset_url TEXT NOT NULL,
    thumbnail_url TEXT,
    asset_type TEXT NOT NULL DEFAULT 'photo',
    caption TEXT,
    credit TEXT,
    is_public INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  // === ARTIST EXTERNAL PROFILES ===
  `CREATE TABLE IF NOT EXISTS artist_external_profiles (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    external_id TEXT,
    external_url TEXT NOT NULL,
    handle TEXT,
    display_name TEXT,
    is_verified INTEGER NOT NULL DEFAULT 0,
    is_primary INTEGER NOT NULL DEFAULT 0,
    follower_count INTEGER,
    last_synced INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,

  // === ARTIST RELATIONS ===
  `CREATE TABLE IF NOT EXISTS artist_relations (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL,
    related_artist_id TEXT NOT NULL,
    relation_type TEXT NOT NULL DEFAULT 'collaborator',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
];

const ENSURE_INDEXES_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_fan_wall_approved ON fan_wall_messages(is_approved)`,
  `CREATE INDEX IF NOT EXISTS idx_fan_wall_featured ON fan_wall_messages(is_featured)`,
  `CREATE INDEX IF NOT EXISTS idx_fan_wall_artist ON fan_wall_messages(artist_id)`,
  `CREATE INDEX IF NOT EXISTS idx_playlists_owner ON user_playlists(owner_email)`,
  `CREATE INDEX IF NOT EXISTS idx_playlists_slug ON user_playlists(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_playlists_public ON user_playlists(is_public)`,
  `CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON user_playlist_tracks(playlist_id)`,
  `CREATE INDEX IF NOT EXISTS idx_collaborators_playlist ON playlist_collaborators(playlist_id)`,
  `CREATE INDEX IF NOT EXISTS idx_collaborators_email ON playlist_collaborators(email)`,
  `CREATE INDEX IF NOT EXISTS idx_memories_event ON concert_memories(event_id)`,
  `CREATE INDEX IF NOT EXISTS idx_memories_approved ON concert_memories(is_approved)`,
  `CREATE INDEX IF NOT EXISTS idx_gallery_photos_artist ON gallery_photos(artist_id)`,
  `CREATE INDEX IF NOT EXISTS idx_gallery_photos_album ON gallery_photos(album_id)`,
  `CREATE INDEX IF NOT EXISTS idx_gallery_photos_published ON gallery_photos(is_published)`,
  `CREATE INDEX IF NOT EXISTS idx_artist_gallery_assets_artist ON artist_gallery_assets(artist_id)`,
  `CREATE INDEX IF NOT EXISTS idx_artist_external_profiles_artist ON artist_external_profiles(artist_id)`,
];

// Data fixes
const DATA_FIXES_SQL = [
  `UPDATE artists SET slug = 'brez', name = 'Brez' WHERE slug = 'bresz'`,
];

export async function POST() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const connected = await checkConnection();
    if (!connected) {
      return NextResponse.json(
        { success: false, error: "Database connection failed" },
        { status: 503 }
      );
    }

    const results: { table: string; status: string; error?: string }[] = [];

    // Create tables
    for (const sql of ENSURE_TABLES_SQL) {
      const tableNameMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
      const tableName = tableNameMatch ? tableNameMatch[1] : "unknown";

      try {
        await executeRaw(sql);
        results.push({ table: tableName, status: "ok" });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push({ table: tableName, status: "error", error: msg });
      }
    }

    // Create indexes
    for (const sql of ENSURE_INDEXES_SQL) {
      try {
        await executeRaw(sql);
      } catch (error) {
        console.warn("[Ensure Tables] Index creation warning:", error);
      }
    }

    // Apply data fixes
    for (const sql of DATA_FIXES_SQL) {
      try {
        await executeRaw(sql);
        results.push({ table: "data_fix", status: "applied", error: sql.substring(0, 80) });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push({ table: "data_fix", status: "error", error: msg });
      }
    }

    const hasErrors = results.some((r) => r.status === "error");

    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors
        ? "Some tables had errors during creation"
        : "All tables ensured successfully",
      results,
    });
  } catch (error) {
    console.error("[Ensure Tables] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to ensure tables" },
      { status: 500 }
    );
  }
}

// GET - Quick health check of database
export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: false,
        configured: false,
        message: "Database not configured - set DATABASE_URL and DATABASE_AUTH_TOKEN",
      });
    }

    const connected = await checkConnection();

    return NextResponse.json({
      success: true,
      configured: true,
      connected,
      message: connected
        ? "Database is configured and connected"
        : "Database is configured but connection failed",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      configured: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
