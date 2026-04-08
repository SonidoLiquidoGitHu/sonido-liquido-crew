-- ===========================================
-- MEDIA RELEASES FULL SCHEMA MIGRATION
-- Adds all required fields for complete press releases
-- ===========================================

-- Add subtitle field
ALTER TABLE `media_releases` ADD COLUMN `subtitle` text;

-- Add category field
ALTER TABLE `media_releases` ADD COLUMN `category` text DEFAULT 'announcement';

-- Add pull quote fields
ALTER TABLE `media_releases` ADD COLUMN `pull_quote` text;
ALTER TABLE `media_releases` ADD COLUMN `pull_quote_attribution` text;

-- Add visual assets
ALTER TABLE `media_releases` ADD COLUMN `banner_image_url` text;
ALTER TABLE `media_releases` ADD COLUMN `gallery_images` text;
ALTER TABLE `media_releases` ADD COLUMN `logo_url` text;

-- Add audio/video fields
ALTER TABLE `media_releases` ADD COLUMN `audio_preview_url` text;
ALTER TABLE `media_releases` ADD COLUMN `audio_preview_title` text;
ALTER TABLE `media_releases` ADD COLUMN `spotify_embed_url` text;
ALTER TABLE `media_releases` ADD COLUMN `youtube_video_id` text;
ALTER TABLE `media_releases` ADD COLUMN `youtube_video_title` text;

-- Add download/asset fields
ALTER TABLE `media_releases` ADD COLUMN `press_kit_url` text;
ALTER TABLE `media_releases` ADD COLUMN `press_kit_size` integer;
ALTER TABLE `media_releases` ADD COLUMN `high_res_images_url` text;
ALTER TABLE `media_releases` ADD COLUMN `liner_notes_url` text;
ALTER TABLE `media_releases` ADD COLUMN `credits` text;

-- Add related content fields
ALTER TABLE `media_releases` ADD COLUMN `related_artist_ids` text;
ALTER TABLE `media_releases` ADD COLUMN `related_release_id` text;
ALTER TABLE `media_releases` ADD COLUMN `external_links` text;

-- Add contact info fields
ALTER TABLE `media_releases` ADD COLUMN `pr_contact_name` text;
ALTER TABLE `media_releases` ADD COLUMN `pr_contact_email` text;
ALTER TABLE `media_releases` ADD COLUMN `pr_contact_phone` text;
ALTER TABLE `media_releases` ADD COLUMN `management_contact` text;
ALTER TABLE `media_releases` ADD COLUMN `booking_contact` text;

-- Add date fields
ALTER TABLE `media_releases` ADD COLUMN `embargo_date` integer;
ALTER TABLE `media_releases` ADD COLUMN `release_date` integer;
ALTER TABLE `media_releases` ADD COLUMN `event_date` integer;

-- Add status fields
ALTER TABLE `media_releases` ADD COLUMN `is_featured` integer DEFAULT false;
ALTER TABLE `media_releases` ADD COLUMN `is_archived` integer DEFAULT false;
ALTER TABLE `media_releases` ADD COLUMN `access_code` text;

-- Add analytics fields
ALTER TABLE `media_releases` ADD COLUMN `view_count` integer DEFAULT 0;
ALTER TABLE `media_releases` ADD COLUMN `download_count` integer DEFAULT 0;

-- Add tags field
ALTER TABLE `media_releases` ADD COLUMN `tags` text;

--> statement-breakpoint

-- ===========================================
-- GALLERY/PHOTOS TABLE FOR PUBLIC GALLERY
-- ===========================================

CREATE TABLE IF NOT EXISTS `gallery_photos` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text,
  `description` text,
  `image_url` text NOT NULL,
  `thumbnail_url` text,
  `photographer` text,
  `location` text,
  `event_name` text,
  `taken_at` integer,
  `album_id` text,
  `artist_ids` text,
  `tags` text,
  `width` integer,
  `height` integer,
  `is_featured` integer DEFAULT false NOT NULL,
  `is_public` integer DEFAULT true NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `view_count` integer DEFAULT 0 NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `gallery_albums` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `slug` text NOT NULL,
  `description` text,
  `cover_image_url` text,
  `event_date` integer,
  `location` text,
  `is_public` integer DEFAULT true NOT NULL,
  `photo_count` integer DEFAULT 0 NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS `gallery_albums_slug_unique` ON `gallery_albums` (`slug`);
