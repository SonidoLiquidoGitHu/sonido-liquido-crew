-- Migration: Playlist Collaboration Features
-- Features: Embed widgets, trusted contributors, playlist collaboration

-- ===========================================
-- PLAYLIST COLLABORATORS
-- Multiple users can add tracks to a playlist
-- ===========================================

CREATE TABLE IF NOT EXISTS playlist_collaborators (
    id TEXT PRIMARY KEY,
    playlist_id TEXT NOT NULL,

    -- Collaborator info
    email TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'contributor', -- 'owner', 'admin', 'contributor'

    -- Invitation
    invite_token TEXT,
    invited_by TEXT,
    invited_at INTEGER,
    accepted_at INTEGER,

    -- Permissions
    can_add_tracks INTEGER DEFAULT 1,
    can_remove_tracks INTEGER DEFAULT 0,
    can_edit_details INTEGER DEFAULT 0,
    can_invite_others INTEGER DEFAULT 0,

    -- Status
    is_active INTEGER DEFAULT 1,

    -- Timestamps
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),

    FOREIGN KEY (playlist_id) REFERENCES user_playlists(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_playlist ON playlist_collaborators(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_email ON playlist_collaborators(email);
CREATE INDEX IF NOT EXISTS idx_playlist_collaborators_invite_token ON playlist_collaborators(invite_token);

-- ===========================================
-- TRUSTED CONTRIBUTORS
-- Auto-approve content from trusted users
-- ===========================================

CREATE TABLE IF NOT EXISTS trusted_contributors (
    id TEXT PRIMARY KEY,

    -- Identifier (email or Instagram handle)
    identifier_type TEXT NOT NULL, -- 'email' | 'instagram'
    identifier_value TEXT NOT NULL,
    display_name TEXT,

    -- Trust settings
    trust_level INTEGER DEFAULT 1, -- 1=basic, 2=verified, 3=vip
    auto_approve_messages INTEGER DEFAULT 1,
    auto_approve_photos INTEGER DEFAULT 1,
    auto_feature INTEGER DEFAULT 0, -- Auto-feature their content

    -- Reason for trust
    notes TEXT,
    added_by TEXT,

    -- Activity tracking
    approved_count INTEGER DEFAULT 0,
    last_submission_at INTEGER,

    -- Status
    is_active INTEGER DEFAULT 1,

    -- Timestamps
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trusted_contributors_identifier
ON trusted_contributors(identifier_type, identifier_value);

-- ===========================================
-- PLAYLIST EMBED STATS
-- Track embed usage for analytics
-- ===========================================

CREATE TABLE IF NOT EXISTS playlist_embed_stats (
    id TEXT PRIMARY KEY,
    playlist_id TEXT NOT NULL,

    -- Embed info
    embed_type TEXT DEFAULT 'iframe', -- 'iframe' | 'widget' | 'card'
    referrer_domain TEXT,
    referrer_url TEXT,

    -- Stats
    view_count INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,

    -- First and last seen
    first_seen_at INTEGER DEFAULT (unixepoch()),
    last_seen_at INTEGER DEFAULT (unixepoch()),

    FOREIGN KEY (playlist_id) REFERENCES user_playlists(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playlist_embed_stats_playlist ON playlist_embed_stats(playlist_id);

-- ===========================================
-- ADD COLLABORATION FIELDS TO PLAYLISTS
-- ===========================================

-- Add collaboration settings to existing playlists table
-- Note: SQLite doesn't support ADD COLUMN IF NOT EXISTS, so we check first

-- These columns may need to be added manually if migration fails:
-- ALTER TABLE user_playlists ADD COLUMN is_collaborative INTEGER DEFAULT 0;
-- ALTER TABLE user_playlists ADD COLUMN allow_public_suggestions INTEGER DEFAULT 0;
-- ALTER TABLE user_playlists ADD COLUMN embed_enabled INTEGER DEFAULT 1;
-- ALTER TABLE user_playlists ADD COLUMN embed_theme TEXT DEFAULT 'dark';

-- ===========================================
-- ADD CONTRIBUTOR INFO TO TRACK ENTRIES
-- ===========================================

-- ALTER TABLE user_playlist_tracks ADD COLUMN added_by_email TEXT;
-- ALTER TABLE user_playlist_tracks ADD COLUMN added_by_name TEXT;
