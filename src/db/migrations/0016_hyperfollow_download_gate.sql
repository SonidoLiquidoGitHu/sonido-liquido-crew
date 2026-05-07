-- Migration: Add HyperFollow and Download Gate fields to upcoming_releases
ALTER TABLE upcoming_releases ADD COLUMN distrokid_hyperfollow_url TEXT;
ALTER TABLE upcoming_releases ADD COLUMN download_gate_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE upcoming_releases ADD COLUMN download_gate_files TEXT;
ALTER TABLE upcoming_releases ADD COLUMN require_presave_for_download INTEGER NOT NULL DEFAULT 1;
ALTER TABLE upcoming_releases ADD COLUMN require_hyperfollow_for_download INTEGER NOT NULL DEFAULT 0;
ALTER TABLE upcoming_releases ADD COLUMN require_email_for_download INTEGER NOT NULL DEFAULT 1;

-- Add Spotify playlist embed fields to curated_playlists
ALTER TABLE curated_playlists ADD COLUMN spotify_playlist_id TEXT;
ALTER TABLE curated_playlists ADD COLUMN spotify_playlist_url TEXT;
ALTER TABLE curated_playlists ADD COLUMN track_count INTEGER DEFAULT 0;
ALTER TABLE curated_playlists ADD COLUMN cover_color TEXT;
