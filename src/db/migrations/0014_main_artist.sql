-- Add main artist fields to media_releases
-- mainArtistId: references an existing artist from the roster
-- mainArtistName: custom artist name for artists not in the roster

ALTER TABLE media_releases ADD COLUMN main_artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL;
ALTER TABLE media_releases ADD COLUMN main_artist_name TEXT;
