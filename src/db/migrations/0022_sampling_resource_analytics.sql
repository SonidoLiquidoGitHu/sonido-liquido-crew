-- Migration 0022: Create sampling_resource_analytics table
--
-- NEW TABLE (not ALTER TABLE) — safe for Render which doesn't auto-run
-- migrations. Even if this table doesn't exist, existing queries on
-- sampling_resources are unaffected because we're not modifying that table.
--
-- Each row = one tracking event (view, click, or access).
-- Aggregated via COUNT queries when stats are needed.

CREATE TABLE IF NOT EXISTS sampling_resource_analytics (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('view', 'click', 'access')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_sampling_analytics_resource ON sampling_resource_analytics(resource_id);
CREATE INDEX IF NOT EXISTS idx_sampling_analytics_action ON sampling_resource_analytics(action);
