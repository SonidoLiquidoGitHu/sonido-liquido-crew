-- Custom Styles Library
CREATE TABLE IF NOT EXISTS custom_styles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  settings TEXT NOT NULL,
  preview_image_url TEXT,
  category TEXT DEFAULT 'general' CHECK(category IN ('campaign', 'beat', 'media', 'general', 'artist')),
  artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL,
  is_public INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Artist Style Settings
CREATE TABLE IF NOT EXISTS artist_styles (
  id TEXT PRIMARY KEY,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  settings TEXT NOT NULL,
  apply_to_new_content INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(artist_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_styles_category ON custom_styles(category);
CREATE INDEX IF NOT EXISTS idx_custom_styles_artist ON custom_styles(artist_id);
CREATE INDEX IF NOT EXISTS idx_custom_styles_public ON custom_styles(is_public);
CREATE INDEX IF NOT EXISTS idx_artist_styles_artist ON artist_styles(artist_id);

-- Add dark_mode field to style_settings in existing tables
-- Note: This is handled in the JSON field, no schema change needed
