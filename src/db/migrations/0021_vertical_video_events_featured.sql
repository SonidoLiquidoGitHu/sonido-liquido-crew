-- Migration 0021: Add is_featured column to vertical_video_events
--
-- Allows events (groupings of vertical videos) to be featured on the
-- homepage, mirroring how individual vertical videos can be featured
-- via the is_featured column on vertical_videos.
--
-- Default: 0 (not featured) — existing events remain non-featured.
-- Admins can toggle "Destacar" on an event card to feature it.

ALTER TABLE vertical_video_events ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0;
