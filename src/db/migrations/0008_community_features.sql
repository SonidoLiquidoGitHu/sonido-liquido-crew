-- ===========================================
-- COMMUNITY FEATURES MIGRATION
-- ===========================================
-- Features: Fan Wall, User Playlists, Concert Memories, Collaboration Stories, Lyrics

-- Fan Wall Messages
CREATE TABLE IF NOT EXISTS fan_wall_messages (
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
);

CREATE INDEX IF NOT EXISTS idx_fan_wall_approved ON fan_wall_messages(is_approved);
CREATE INDEX IF NOT EXISTS idx_fan_wall_featured ON fan_wall_messages(is_featured);
CREATE INDEX IF NOT EXISTS idx_fan_wall_artist ON fan_wall_messages(artist_id);

-- User Playlists
CREATE TABLE IF NOT EXISTS user_playlists (
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
);

CREATE INDEX IF NOT EXISTS idx_playlists_owner ON user_playlists(owner_email);
CREATE INDEX IF NOT EXISTS idx_playlists_slug ON user_playlists(slug);
CREATE INDEX IF NOT EXISTS idx_playlists_public ON user_playlists(is_public);

-- User Playlist Tracks
CREATE TABLE IF NOT EXISTS user_playlist_tracks (
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
);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON user_playlist_tracks(playlist_id);

-- Concert Memories (Fan Photos)
CREATE TABLE IF NOT EXISTS concert_memories (
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
);

CREATE INDEX IF NOT EXISTS idx_memories_event ON concert_memories(event_id);
CREATE INDEX IF NOT EXISTS idx_memories_approved ON concert_memories(is_approved);
CREATE INDEX IF NOT EXISTS idx_memories_featured ON concert_memories(is_featured);

-- Collaboration Stories
CREATE TABLE IF NOT EXISTS collaboration_stories (
  id TEXT PRIMARY KEY,
  release_id TEXT NOT NULL,
  release_title TEXT NOT NULL,
  title TEXT,
  story TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_stories_release ON collaboration_stories(release_id);

-- Release Collaborators
CREATE TABLE IF NOT EXISTS release_collaborators (
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
);

CREATE INDEX IF NOT EXISTS idx_collaborators_story ON release_collaborators(story_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_release ON release_collaborators(release_id);

-- Story Media (Behind the scenes)
CREATE TABLE IF NOT EXISTS story_media (
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
);

CREATE INDEX IF NOT EXISTS idx_story_media_story ON story_media(story_id);

-- Track Lyrics
CREATE TABLE IF NOT EXISTS track_lyrics (
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
);

CREATE INDEX IF NOT EXISTS idx_lyrics_release ON track_lyrics(release_id);
CREATE INDEX IF NOT EXISTS idx_lyrics_spotify ON track_lyrics(spotify_uri);

-- Synced Lyric Lines
CREATE TABLE IF NOT EXISTS synced_lyric_lines (
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
);

CREATE INDEX IF NOT EXISTS idx_lyric_lines_lyrics ON synced_lyric_lines(lyrics_id);
CREATE INDEX IF NOT EXISTS idx_lyric_lines_time ON synced_lyric_lines(start_time);
