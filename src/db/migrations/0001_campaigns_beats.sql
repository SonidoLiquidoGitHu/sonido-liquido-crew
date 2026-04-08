-- ===========================================
-- CAMPAIGNS TABLE (Campañas)
-- ===========================================

CREATE TABLE IF NOT EXISTS `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`campaign_type` text DEFAULT 'presave' NOT NULL,
	`artist_id` text,
	`release_id` text,
	`cover_image_url` text,
	`banner_image_url` text,
	`smart_link_url` text,
	`onerpm_url` text,
	`spotify_presave_url` text,
	`apple_music_presave_url` text,
	`download_gate_enabled` integer DEFAULT false NOT NULL,
	`download_file_url` text,
	`download_file_name` text,
	`require_spotify_follow` integer DEFAULT false NOT NULL,
	`spotify_artist_url` text,
	`require_spotify_presave` integer DEFAULT false NOT NULL,
	`require_email` integer DEFAULT true NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`start_date` integer,
	`end_date` integer,
	`release_date` integer,
	`total_views` integer DEFAULT 0 NOT NULL,
	`total_conversions` integer DEFAULT 0 NOT NULL,
	`total_downloads` integer DEFAULT 0 NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`release_id`) REFERENCES `releases`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `campaigns_slug_unique` ON `campaigns` (`slug`);
--> statement-breakpoint

-- ===========================================
-- CAMPAIGN ACTIONS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS `campaign_actions` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`email` text,
	`spotify_user_id` text,
	`completed_presave` integer DEFAULT false NOT NULL,
	`completed_follow` integer DEFAULT false NOT NULL,
	`completed_download` integer DEFAULT false NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`referrer` text,
	`presaved_at` integer,
	`followed_at` integer,
	`downloaded_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint

-- ===========================================
-- BEATS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS `beats` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`producer_id` text,
	`producer_name` text,
	`bpm` integer,
	`key` text,
	`genre` text,
	`tags` text,
	`duration` integer,
	`preview_audio_url` text,
	`full_audio_url` text,
	`stem_pack_url` text,
	`cover_image_url` text,
	`waveform_image_url` text,
	`is_free` integer DEFAULT true NOT NULL,
	`price` real,
	`currency` text DEFAULT 'USD',
	`gate_enabled` integer DEFAULT true NOT NULL,
	`require_email` integer DEFAULT true NOT NULL,
	`require_spotify_follow` integer DEFAULT false NOT NULL,
	`spotify_artist_url` text,
	`require_spotify_play` integer DEFAULT false NOT NULL,
	`spotify_song_url` text,
	`spotify_song_id` text,
	`require_hyperfollow` integer DEFAULT false NOT NULL,
	`hyperfollow_url` text,
	`require_instagram_share` integer DEFAULT false NOT NULL,
	`instagram_share_text` text,
	`require_facebook_share` integer DEFAULT false NOT NULL,
	`facebook_share_text` text,
	`require_custom_action` integer DEFAULT false NOT NULL,
	`custom_action_label` text,
	`custom_action_url` text,
	`custom_action_instructions` text,
	`is_active` integer DEFAULT true NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`play_count` integer DEFAULT 0 NOT NULL,
	`download_count` integer DEFAULT 0 NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`producer_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `beats_slug_unique` ON `beats` (`slug`);
--> statement-breakpoint

-- ===========================================
-- BEAT DOWNLOADS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS `beat_downloads` (
	`id` text PRIMARY KEY NOT NULL,
	`beat_id` text NOT NULL,
	`email` text,
	`name` text,
	`completed_spotify_follow` integer DEFAULT false NOT NULL,
	`completed_spotify_play` integer DEFAULT false NOT NULL,
	`completed_hyperfollow` integer DEFAULT false NOT NULL,
	`completed_instagram_share` integer DEFAULT false NOT NULL,
	`completed_facebook_share` integer DEFAULT false NOT NULL,
	`completed_custom_action` integer DEFAULT false NOT NULL,
	`downloaded_at` integer,
	`download_count` integer DEFAULT 0 NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`referrer` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`beat_id`) REFERENCES `beats`(`id`) ON UPDATE no action ON DELETE cascade
);
