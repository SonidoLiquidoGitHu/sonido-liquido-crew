-- Migration 0022: Add analytics columns to sampling_resources
--
-- view_count: incremented when the resource card is viewed on the public page
-- click_count: incremented when a user clicks the external link
-- access_count: incremented when a user submits email to access the page

ALTER TABLE sampling_resources ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sampling_resources ADD COLUMN click_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sampling_resources ADD COLUMN access_count INTEGER NOT NULL DEFAULT 0;
