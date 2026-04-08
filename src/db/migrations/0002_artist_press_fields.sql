-- ===========================================
-- ADD PRESS FIELDS TO ARTISTS TABLE
-- ===========================================

-- Short bio for press
ALTER TABLE `artists` ADD COLUMN `short_bio` text;

-- Header/banner image
ALTER TABLE `artists` ADD COLUMN `header_image_url` text;

-- Origin information
ALTER TABLE `artists` ADD COLUMN `origin` text;

-- Year they started
ALTER TABLE `artists` ADD COLUMN `active_since` integer;

-- Genres (JSON array)
ALTER TABLE `artists` ADD COLUMN `genres` text;

-- Spotify stats
ALTER TABLE `artists` ADD COLUMN `spotify_monthly_listeners` integer;
ALTER TABLE `artists` ADD COLUMN `spotify_followers` integer;
ALTER TABLE `artists` ADD COLUMN `spotify_popularity` integer;

-- Press contacts
ALTER TABLE `artists` ADD COLUMN `press_email` text;
ALTER TABLE `artists` ADD COLUMN `management_contact` text;
ALTER TABLE `artists` ADD COLUMN `booking_contact` text;

-- Last sync timestamp
ALTER TABLE `artists` ADD COLUMN `last_spotify_sync` integer;
