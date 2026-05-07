-- Add style_settings column to campaigns
ALTER TABLE campaigns ADD COLUMN style_settings TEXT;

-- Add style_settings column to beats
ALTER TABLE beats ADD COLUMN style_settings TEXT;

-- Add style_settings column to media_releases
ALTER TABLE media_releases ADD COLUMN style_settings TEXT;
