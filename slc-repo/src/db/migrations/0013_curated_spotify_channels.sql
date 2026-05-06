-- Migration: Curated Spotify Channels
-- Description: Tables for managing curated Spotify channels and playlist curation

-- =============================================
-- CURATED SPOTIFY CHANNELS
-- Stores Spotify artist profiles approved for playlist curation
-- =============================================

CREATE TABLE IF NOT EXISTS curated_spotify_channels (
  id TEXT PRIMARY KEY,

  -- Spotify Info
  spotify_artist_id TEXT NOT NULL UNIQUE,
  spotify_artist_url TEXT NOT NULL,

  -- Display Info (cached from Spotify)
  name TEXT NOT NULL,
  image_url TEXT,
  genres TEXT, -- JSON array
  popularity INTEGER,
  followers INTEGER,

  -- Curation Settings
  category TEXT NOT NULL DEFAULT 'roster' CHECK(category IN ('roster', 'affiliate', 'collaborator', 'label', 'featured', 'other')),
  priority INTEGER NOT NULL DEFAULT 0,
  description TEXT,

  -- Sync Settings
  auto_sync INTEGER NOT NULL DEFAULT 1,
  sync_new_releases INTEGER NOT NULL DEFAULT 1,
  sync_top_tracks INTEGER NOT NULL DEFAULT 1,

  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,

  -- Timestamps
  last_synced_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- =============================================
-- CURATED TRACKS
-- Stores tracks from curated channels for playlist curation
-- =============================================

CREATE TABLE IF NOT EXISTS curated_tracks (
  id TEXT PRIMARY KEY,

  -- Spotify Info
  spotify_track_id TEXT NOT NULL UNIQUE,
  spotify_track_url TEXT NOT NULL,
  spotify_album_id TEXT,

  -- Track Info (cached from Spotify)
  name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  artist_ids TEXT, -- JSON array of Spotify artist IDs
  album_name TEXT,
  album_image_url TEXT,
  duration_ms INTEGER,
  preview_url TEXT,
  release_date TEXT,
  popularity INTEGER,
  explicit INTEGER NOT NULL DEFAULT 0,

  -- Reference to curated channel
  curated_channel_id TEXT REFERENCES curated_spotify_channels(id) ON DELETE CASCADE,

  -- Playlist Status
  is_available_for_playlist INTEGER NOT NULL DEFAULT 1,
  is_featured INTEGER NOT NULL DEFAULT 0,
  admin_notes TEXT,

  -- Timestamps
  added_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- =============================================
-- PLAYLIST TRACKS
-- Tracks added to curated playlists
-- =============================================

CREATE TABLE IF NOT EXISTS playlist_tracks (
  id TEXT PRIMARY KEY,

  -- Playlist reference
  playlist_id TEXT NOT NULL,
  playlist_name TEXT,

  -- Track reference
  spotify_track_id TEXT NOT NULL,
  curated_track_id TEXT REFERENCES curated_tracks(id),

  -- Track Info (cached)
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_image_url TEXT,

  -- Position
  position INTEGER NOT NULL DEFAULT 0,

  -- Status
  is_active INTEGER NOT NULL DEFAULT 1,
  added_by TEXT,

  -- Timestamps
  added_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_curated_channels_active ON curated_spotify_channels(is_active);
CREATE INDEX IF NOT EXISTS idx_curated_channels_category ON curated_spotify_channels(category);
CREATE INDEX IF NOT EXISTS idx_curated_channels_priority ON curated_spotify_channels(priority DESC);

CREATE INDEX IF NOT EXISTS idx_curated_tracks_channel ON curated_tracks(curated_channel_id);
CREATE INDEX IF NOT EXISTS idx_curated_tracks_available ON curated_tracks(is_available_for_playlist);
CREATE INDEX IF NOT EXISTS idx_curated_tracks_featured ON curated_tracks(is_featured);
CREATE INDEX IF NOT EXISTS idx_curated_tracks_release_date ON curated_tracks(release_date DESC);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON playlist_tracks(playlist_id, position);
