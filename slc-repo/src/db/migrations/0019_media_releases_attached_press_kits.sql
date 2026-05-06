-- Add attachedPressKitIds column to mediaReleases table
-- Stores a JSON array of press kit IDs from roster artists
ALTER TABLE media_releases ADD COLUMN attached_press_kit_ids TEXT;
