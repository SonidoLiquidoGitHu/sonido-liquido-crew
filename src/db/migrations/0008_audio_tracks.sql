-- Add audio_tracks field to media_releases for storing multiple tracks
ALTER TABLE media_releases ADD COLUMN audio_tracks TEXT;

-- audio_tracks will store a JSON array like:
-- [
--   {"title": "Track 1", "url": "https://...", "duration": "3:45"},
--   {"title": "Track 2", "url": "https://...", "duration": "4:20"}
-- ]
