-- Migration 0018: Add missing columns to curated_playlists
-- The Drizzle schema defines cover_color, spotify_playlist_id, spotify_playlist_url, track_count
-- but the original migration (0015) only created: id, name, slug, description, cover_image_url,
-- is_public, is_active, priority, created_at, updated_at

ALTER TABLE curated_playlists ADD COLUMN cover_color TEXT;
ALTER TABLE curated_playlists ADD COLUMN spotify_playlist_id TEXT;
ALTER TABLE curated_playlists ADD COLUMN spotify_playlist_url TEXT;
ALTER TABLE curated_playlists ADD COLUMN track_count INTEGER DEFAULT 0;
