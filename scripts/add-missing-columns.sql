-- Add missing columns to artists table
ALTER TABLE artists ADD COLUMN real_name TEXT;
ALTER TABLE artists ADD COLUMN short_bio TEXT;
ALTER TABLE artists ADD COLUMN banner_image_url TEXT;
ALTER TABLE artists ADD COLUMN location TEXT;
ALTER TABLE artists ADD COLUMN country TEXT;
ALTER TABLE artists ADD COLUMN booking_email TEXT;
ALTER TABLE artists ADD COLUMN management_email TEXT;
ALTER TABLE artists ADD COLUMN press_email TEXT;
ALTER TABLE artists ADD COLUMN website_url TEXT;
ALTER TABLE artists ADD COLUMN year_started INTEGER;
ALTER TABLE artists ADD COLUMN genres TEXT;
ALTER TABLE artists ADD COLUMN labels TEXT;
ALTER TABLE artists ADD COLUMN monthly_listeners INTEGER;
ALTER TABLE artists ADD COLUMN followers INTEGER;

-- Add missing columns to artist_external_profiles table
ALTER TABLE artist_external_profiles ADD COLUMN display_name TEXT;
ALTER TABLE artist_external_profiles ADD COLUMN is_primary INTEGER DEFAULT 0;
ALTER TABLE artist_external_profiles ADD COLUMN follower_count INTEGER;
ALTER TABLE artist_external_profiles ADD COLUMN last_synced INTEGER;

-- Create artist_gallery_assets table if it doesn't exist
CREATE TABLE IF NOT EXISTS artist_gallery_assets (
  id TEXT PRIMARY KEY NOT NULL,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  asset_url TEXT NOT NULL,
  thumbnail_url TEXT,
  asset_type TEXT NOT NULL DEFAULT 'photo',
  caption TEXT,
  credit TEXT,
  is_public INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Create artist_relations table if it doesn't exist
CREATE TABLE IF NOT EXISTS artist_relations (
  id TEXT PRIMARY KEY NOT NULL,
  artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  related_artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'collaborator',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
