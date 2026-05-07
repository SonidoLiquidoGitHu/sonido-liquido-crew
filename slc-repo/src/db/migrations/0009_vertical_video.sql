-- Add vertical_video_url field to upcoming_releases for Reels/TikTok/Stories videos
ALTER TABLE upcoming_releases ADD COLUMN vertical_video_url TEXT;
