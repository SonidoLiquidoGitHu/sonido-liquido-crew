-- Add preview audio/video URLs to campaigns
ALTER TABLE campaigns ADD COLUMN preview_audio_url TEXT;
ALTER TABLE campaigns ADD COLUMN preview_video_url TEXT;
ALTER TABLE campaigns ADD COLUMN youtube_video_id TEXT;
ALTER TABLE campaigns ADD COLUMN video_is_vertical INTEGER DEFAULT 0;

-- Add video URLs to beats
ALTER TABLE beats ADD COLUMN preview_video_url TEXT;
ALTER TABLE beats ADD COLUMN youtube_video_id TEXT;
ALTER TABLE beats ADD COLUMN video_is_vertical INTEGER DEFAULT 0;

-- Video Analytics tables
CREATE TABLE IF NOT EXISTS video_analytics (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK(content_type IN ('campaign', 'beat')),
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('play', 'progress', 'complete', 'pause', 'seek')),
  current_time INTEGER NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 0,
  percent_watched INTEGER NOT NULL DEFAULT 0,
  max_percent_watched INTEGER NOT NULL DEFAULT 0,
  total_watch_time INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS video_analytics_aggregates (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK(content_type IN ('campaign', 'beat')),
  date TEXT NOT NULL,
  total_plays INTEGER NOT NULL DEFAULT 0,
  unique_viewers INTEGER NOT NULL DEFAULT 0,
  total_watch_time_seconds INTEGER NOT NULL DEFAULT 0,
  avg_watch_percent REAL NOT NULL DEFAULT 0,
  completion_count INTEGER NOT NULL DEFAULT 0,
  dropped_25 INTEGER NOT NULL DEFAULT 0,
  dropped_50 INTEGER NOT NULL DEFAULT 0,
  dropped_75 INTEGER NOT NULL DEFAULT 0,
  dropped_100 INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_video_analytics_content ON video_analytics(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_video_analytics_session ON video_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_video_aggregates_content ON video_analytics_aggregates(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_video_aggregates_date ON video_analytics_aggregates(date);
