-- Migration 0022: Add retry tracking columns to social_post_queue
--
-- Supports the post failure retry feature:
-- - retry_count: how many times this item has been attempted (0 = never tried)
-- - next_retry_at: when to retry next (null = no retry scheduled)
--
-- When a post fails:
--   1. Increment retry_count
--   2. If retry_count < 3: set status back to 'pending', set next_retry_at
--      to now + exponential backoff (5min, 15min, 60min)
--   3. If retry_count >= 3: set status to 'failed' (gives up)
-- getNextPendingItem skips items where next_retry_at > now

ALTER TABLE social_post_queue ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE social_post_queue ADD COLUMN next_retry_at INTEGER;
