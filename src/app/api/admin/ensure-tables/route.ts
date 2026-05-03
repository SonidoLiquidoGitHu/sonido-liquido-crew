import { NextResponse } from "next/server";
import { executeRaw, isDatabaseConfigured, checkConnection } from "@/db/client";
import { db } from "@/db/client";
import { artists, artistExternalProfiles } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

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

  // === CURATED PLAYLISTS ===
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

  // === PLAYLIST TRACKS ===
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

  // === CURATED SPOTIFY CHANNELS ===
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

  // === CURATED TRACKS ===
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
];

// SQL statements to add missing columns to existing tables
const ADD_COLUMNS_SQL = [
  // Missing columns in curated_playlists (migration 0015 only created basic columns)
  `ALTER TABLE curated_playlists ADD COLUMN cover_color TEXT`,
  `ALTER TABLE curated_playlists ADD COLUMN spotify_playlist_id TEXT`,
  `ALTER TABLE curated_playlists ADD COLUMN spotify_playlist_url TEXT`,
  `ALTER TABLE curated_playlists ADD COLUMN track_count INTEGER DEFAULT 0`,

  // Missing columns in playlist_tracks (some installs may lack these)
  `ALTER TABLE playlist_tracks ADD COLUMN curated_track_id TEXT`,
  `ALTER TABLE playlist_tracks ADD COLUMN added_by TEXT`,
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
  `CREATE INDEX IF NOT EXISTS idx_curated_playlists_slug ON curated_playlists(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_curated_playlists_public ON curated_playlists(is_public)`,
  `CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id)`,
  `CREATE INDEX IF NOT EXISTS idx_playlist_tracks_active ON playlist_tracks(is_active)`,
  `CREATE INDEX IF NOT EXISTS idx_curated_tracks_channel ON curated_tracks(curated_channel_id)`,
  `CREATE INDEX IF NOT EXISTS idx_curated_spotify_channels_active ON curated_spotify_channels(is_active)`,
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

    // Add missing columns to existing tables (safe - ignores "duplicate column" errors)
    for (const sql of ADD_COLUMNS_SQL) {
      const colMatch = sql.match(/ALTER TABLE (\w+) ADD COLUMN (\w+)/);
      const tableName = colMatch ? colMatch[1] : "unknown";
      const colName = colMatch ? colMatch[2] : "unknown";

      try {
        await executeRaw(sql);
        results.push({ table: `${tableName}.${colName}`, status: "added" });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("duplicate column name")) {
          results.push({ table: `${tableName}.${colName}`, status: "exists" });
        } else {
          results.push({ table: `${tableName}.${colName}`, status: "error", error: msg });
        }
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

    // === SEED ARTIST EXTERNAL PROFILES ===
    try {
      // Check how many artists already have profiles using drizzle
      const [profileCountRow] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${artistExternalProfiles.artistId})` })
        .from(artistExternalProfiles);
      const profileCount = profileCountRow?.count ?? 0;

      // Get total active artists
      const [artistCountRow] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(artists)
        .where(eq(artists.isActive, true));
      const artistCount = artistCountRow?.count ?? 0;

      // If some artists don't have profiles, seed them
      if (profileCount < artistCount) {
        // Read social URLs from JSON file
        const socialUrlsPath = join(process.cwd(), "data", "artist-social-urls.json");
        let socialData: Record<string, {
          name?: string;
          spotify?: string;
          spotifyId?: string;
          instagram?: string | null;
        }> = {};
        try {
          const fileContents = readFileSync(socialUrlsPath, "utf-8");
          socialData = JSON.parse(fileContents).artists || {};
        } catch {
          results.push({ table: "artist_profiles_seed", status: "skipped", error: "Could not read artist-social-urls.json" });
        }

        // YouTube channel data from components (RosterSocials.tsx / ArtistChannels.tsx)
        const youtubeData: Record<string, { channelUrl: string; channelHandle: string }> = {
          "brez": { channelUrl: "https://youtube.com/@brezhiphopmexicoslc25", channelHandle: "@brezhiphopmexicoslc25" },
          "bruno-grasso": { channelUrl: "https://youtube.com/@brunograssosl", channelHandle: "@brunograssosl" },
          "chas-7p": { channelUrl: "https://youtube.com/@chas7p347", channelHandle: "@chas7p347" },
          "codak": { channelUrl: "https://youtube.com/@codak", channelHandle: "@codak" },
          "dilema": { channelUrl: "https://youtube.com/@dilema999", channelHandle: "@dilema999" },
          "doctor-destino": { channelUrl: "https://youtube.com/@doctordestinohiphop", channelHandle: "@doctordestinohiphop" },
          "fancy-freak": { channelUrl: "https://youtube.com/@fancyfreakdj", channelHandle: "@fancyfreakdj" },
          "hassyel": { channelUrl: "https://youtube.com/channel/UCZp_YCv7jK3-lEtvSONNs8A", channelHandle: "Hassyel" },
          "kev-cabrone": { channelUrl: "https://youtube.com/@kevcabrone", channelHandle: "@kevcabrone" },
          "latin-geisha": { channelUrl: "https://youtube.com/@latingeishamx", channelHandle: "@latingeishamx" },
          "pepe-levine": { channelUrl: "https://youtube.com/@pepelevineonline", channelHandle: "@pepelevineonline" },
          "q-master-weed": { channelUrl: "https://youtube.com/@qmasterw", channelHandle: "@qmasterw" },
          "reick-one": { channelUrl: "https://youtube.com/channel/UCMvZBwXGDTnXVV7NbYKWfaA", channelHandle: "Reick Uno" },
          "x-santa-ana": { channelUrl: "https://youtube.com/@xsanta-ana", channelHandle: "@xsanta-ana" },
          "zaque": { channelUrl: "https://youtube.com/@zakeuno", channelHandle: "@zakeuno" },
        };

        // Mixcloud data from RosterSocials.tsx
        const mixcloudData: Record<string, { url: string; handle: string }> = {
          "doctor-destino": { url: "https://www.mixcloud.com/doctinho/", handle: "doctinho" },
          "fancy-freak": { url: "https://www.mixcloud.com/fancyfreak1/", handle: "fancyfreak1" },
          "q-master-weed": { url: "https://www.mixcloud.com/q-masterw/", handle: "q-masterw" },
          "reick-one": { url: "https://www.mixcloud.com/reickuno/", handle: "reickuno" },
        };

        // Get all active artists
        const artistsRows = await db
          .select({ id: artists.id, slug: artists.slug, name: artists.name })
          .from(artists)
          .where(eq(artists.isActive, true));

        let seededCount = 0;
        for (const artist of artistsRows) {
          const slug = artist.slug;
          const socialInfo = socialData[slug];
          const ytInfo = youtubeData[slug];
          const mcInfo = mixcloudData[slug];

          // Spotify profile
          if (socialInfo?.spotify && socialInfo?.spotifyId) {
            try {
              await executeRaw(
                `INSERT OR IGNORE INTO artist_external_profiles (id, artist_id, platform, external_id, external_url, handle, is_verified, is_primary, created_at, updated_at) ` +
                `VALUES ('sp-${slug}', '${artist.id}', 'spotify', '${socialInfo.spotifyId}', '${socialInfo.spotify}', '${socialInfo.spotifyId}', 1, 1, unixepoch(), unixepoch())`
              );
              seededCount++;
            } catch { /* ignore duplicate */ }
          }

          // Instagram profile
          if (socialInfo?.instagram) {
            const igHandle = socialInfo.instagram.replace("https://www.instagram.com/", "").replace("/", "");
            try {
              await executeRaw(
                `INSERT OR IGNORE INTO artist_external_profiles (id, artist_id, platform, external_url, handle, is_verified, is_primary, created_at, updated_at) ` +
                `VALUES ('ig-${slug}', '${artist.id}', 'instagram', '${socialInfo.instagram}', '${igHandle}', 0, 1, unixepoch(), unixepoch())`
              );
              seededCount++;
            } catch { /* ignore duplicate */ }
          }

          // YouTube profile
          if (ytInfo) {
            try {
              await executeRaw(
                `INSERT OR IGNORE INTO artist_external_profiles (id, artist_id, platform, external_url, handle, is_verified, is_primary, created_at, updated_at) ` +
                `VALUES ('yt-${slug}', '${artist.id}', 'youtube', '${ytInfo.channelUrl}', '${ytInfo.channelHandle}', 0, 1, unixepoch(), unixepoch())`
              );
              seededCount++;
            } catch { /* ignore duplicate */ }
          }

          // Mixcloud profile
          if (mcInfo) {
            try {
              await executeRaw(
                `INSERT OR IGNORE INTO artist_external_profiles (id, artist_id, platform, external_url, handle, is_verified, is_primary, created_at, updated_at) ` +
                `VALUES ('mc-${slug}', '${artist.id}', 'mixcloud', '${mcInfo.url}', '${mcInfo.handle}', 0, 1, unixepoch(), unixepoch())`
              );
              seededCount++;
            } catch { /* ignore duplicate */ }
          }
        }

        results.push({ table: "artist_profiles_seed", status: "seeded", error: `${seededCount} profiles inserted for ${artistsRows.length} artists` });
      } else {
        results.push({ table: "artist_profiles_seed", status: "exists", error: `All ${artistCount} artists already have profiles` });
      }
    } catch (seedError) {
      const msg = seedError instanceof Error ? seedError.message : String(seedError);
      results.push({ table: "artist_profiles_seed", status: "error", error: msg });
    }

    // === SEED CREW SOCIAL LINKS IN SITE_SETTINGS ===
    try {
      const crewSocialSettings = [
        { key: "spotify_playlist_url", value: "https://open.spotify.com/playlist/2y0Z7WdObJY1IvCLCXwUez", type: "string" },
        { key: "youtube_channel_url", value: "https://www.youtube.com/@sonidoliquidocrew", type: "string" },
        { key: "instagram_url", value: "https://www.instagram.com/sonidoliquido/", type: "string" },
        { key: "facebook_url", value: "https://www.facebook.com/sonidoliquidocrew/", type: "string" },
      ];

      let seededSettings = 0;
      for (const setting of crewSocialSettings) {
        try {
          await executeRaw(
            `INSERT OR IGNORE INTO site_settings (id, key, value, type, created_at, updated_at) ` +
            `VALUES ('crew-${setting.key}', '${setting.key}', '${setting.value}', '${setting.type}', unixepoch(), unixepoch())`
          );
          seededSettings++;
        } catch { /* ignore duplicate */ }
      }

      results.push({ table: "crew_social_settings", status: "seeded", error: `${seededSettings} crew social settings ensured` });
    } catch (settingsError) {
      const msg = settingsError instanceof Error ? settingsError.message : String(settingsError);
      results.push({ table: "crew_social_settings", status: "error", error: msg });
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
