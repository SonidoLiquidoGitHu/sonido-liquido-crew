-- ===========================================
-- Sampling Resources: DB-backed storage
-- ===========================================
-- Migrated from src/data/sampling-resources.json so CRUD works
-- on Netlify's read-only serverless filesystem.

CREATE TABLE IF NOT EXISTS sampling_resources (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('video', 'channel', 'playlist')),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  video_id TEXT,
  playlist_id TEXT,
  handle TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS sampling_resources_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
