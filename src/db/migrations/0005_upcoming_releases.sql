-- Upcoming Releases Table
CREATE TABLE IF NOT EXISTS upcoming_releases (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  artist_name TEXT NOT NULL,
  featured_artists TEXT,
  release_type TEXT NOT NULL DEFAULT 'single',
  description TEXT,
  cover_image_url TEXT,
  banner_image_url TEXT,
  background_color TEXT DEFAULT '#000000',
  release_date INTEGER NOT NULL,
  announce_date INTEGER,
  rpm_presave_url TEXT,
  spotify_presave_url TEXT,
  apple_music_presave_url TEXT,
  deezer_presave_url TEXT,
  tidal_presave_url TEXT,
  amazon_music_presave_url TEXT,
  youtube_music_presave_url TEXT,
  teaser_video_url TEXT,
  audio_preview_url TEXT,
  is_active INTEGER NOT NULL DEFAULT true,
  is_featured INTEGER NOT NULL DEFAULT false,
  show_countdown INTEGER NOT NULL DEFAULT true,
  presave_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  released_release_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Presave Subscribers Table
CREATE TABLE IF NOT EXISTS presave_subscribers (
  id TEXT PRIMARY KEY NOT NULL,
  upcoming_release_id TEXT NOT NULL REFERENCES upcoming_releases(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  subscribed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  notified INTEGER NOT NULL DEFAULT false
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_upcoming_releases_slug ON upcoming_releases(slug);
CREATE INDEX IF NOT EXISTS idx_upcoming_releases_release_date ON upcoming_releases(release_date);
CREATE INDEX IF NOT EXISTS idx_upcoming_releases_active ON upcoming_releases(is_active);
CREATE INDEX IF NOT EXISTS idx_presave_subscribers_release ON presave_subscribers(upcoming_release_id);
CREATE INDEX IF NOT EXISTS idx_presave_subscribers_email ON presave_subscribers(email);
