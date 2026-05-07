-- Add press quotes and featured videos columns to artists table
ALTER TABLE artists ADD COLUMN press_quotes TEXT;
ALTER TABLE artists ADD COLUMN featured_videos TEXT;
