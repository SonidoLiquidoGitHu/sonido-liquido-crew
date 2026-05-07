// ===========================================
// COMMUNITY FEATURES SCHEMA
// ===========================================
// Features: Fan Wall, User Playlists, Concert Memories, Collaboration Stories

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ===========================================
// FAN WALL / GUESTBOOK
// ===========================================
// Moderated fan messages displayed on the site

export const fanWallMessages = sqliteTable("fan_wall_messages", {
  id: text("id").primaryKey(),

  // Author info
  displayName: text("display_name").notNull(),
  email: text("email"), // Optional, for verification
  avatarUrl: text("avatar_url"),
  country: text("country"),
  city: text("city"),

  // Message content
  message: text("message").notNull(),
  reaction: text("reaction"), // emoji reaction like 🔥, ❤️, 🎵

  // References
  artistId: text("artist_id"), // If message is for specific artist
  releaseId: text("release_id"), // If message is for specific release
  eventId: text("event_id"), // If message is for specific event

  // Moderation
  isApproved: integer("is_approved", { mode: "boolean" }).default(false),
  isFeatured: integer("is_featured", { mode: "boolean" }).default(false),
  isHidden: integer("is_hidden", { mode: "boolean" }).default(false),
  moderatedAt: integer("moderated_at", { mode: "timestamp" }),
  moderatedBy: text("moderated_by"),

  // Display
  backgroundColor: text("background_color"),
  fontStyle: text("font_style"), // normal, handwritten, bold
  position: integer("position"), // For visual wall layout

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type FanWallMessage = typeof fanWallMessages.$inferSelect;
export type NewFanWallMessage = typeof fanWallMessages.$inferInsert;

// ===========================================
// USER PLAYLISTS
// ===========================================
// Visitor-created playlists from the catalog

export const userPlaylists = sqliteTable("user_playlists", {
  id: text("id").primaryKey(),

  // Owner info (simple auth - just email/name)
  ownerEmail: text("owner_email").notNull(),
  ownerName: text("owner_name"),
  sessionToken: text("session_token"), // For editing without full auth

  // Playlist info
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  isPublic: integer("is_public", { mode: "boolean" }).default(true),

  // Stats
  playCount: integer("play_count").default(0),
  likeCount: integer("like_count").default(0),
  shareCount: integer("share_count").default(0),

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type UserPlaylist = typeof userPlaylists.$inferSelect;
export type NewUserPlaylist = typeof userPlaylists.$inferInsert;

// Playlist tracks
export const userPlaylistTracks = sqliteTable("user_playlist_tracks", {
  id: text("id").primaryKey(),

  playlistId: text("playlist_id").notNull(),

  // Track reference - can be internal or Spotify
  trackType: text("track_type").notNull(), // "internal" | "spotify" | "beat"
  trackId: text("track_id").notNull(), // Internal release ID or Spotify URI

  // Denormalized track info for quick display
  trackTitle: text("track_title").notNull(),
  trackArtist: text("track_artist").notNull(),
  trackCoverUrl: text("track_cover_url"),
  trackDuration: integer("track_duration"), // seconds
  spotifyUri: text("spotify_uri"),

  // Order
  position: integer("position").notNull().default(0),

  // Timestamps
  addedAt: integer("added_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type UserPlaylistTrack = typeof userPlaylistTracks.$inferSelect;
export type NewUserPlaylistTrack = typeof userPlaylistTracks.$inferInsert;

// ===========================================
// CONCERT MEMORY GALLERY
// ===========================================
// Fan-submitted photos from events

export const concertMemories = sqliteTable("concert_memories", {
  id: text("id").primaryKey(),

  // Submitter info
  submitterName: text("submitter_name").notNull(),
  submitterEmail: text("submitter_email"),
  submitterInstagram: text("submitter_instagram"),

  // Event reference
  eventId: text("event_id"), // Link to events table
  eventName: text("event_name"), // Denormalized for when event doesn't exist
  eventDate: integer("event_date", { mode: "timestamp" }),
  eventVenue: text("event_venue"),
  eventCity: text("event_city"),

  // Photo
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption"),

  // Photo metadata
  takenAt: integer("taken_at", { mode: "timestamp" }),
  cameraInfo: text("camera_info"),

  // Tagged artists/people
  taggedArtists: text("tagged_artists"), // JSON array of artist IDs

  // Moderation
  isApproved: integer("is_approved", { mode: "boolean" }).default(false),
  isFeatured: integer("is_featured", { mode: "boolean" }).default(false),
  isHidden: integer("is_hidden", { mode: "boolean" }).default(false),
  moderatedAt: integer("moderated_at", { mode: "timestamp" }),

  // Stats
  likeCount: integer("like_count").default(0),
  viewCount: integer("view_count").default(0),

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type ConcertMemory = typeof concertMemories.$inferSelect;
export type NewConcertMemory = typeof concertMemories.$inferInsert;

// ===========================================
// COLLABORATION STORIES (MAKING OF)
// ===========================================
// Behind-the-scenes content for releases

export const collaborationStories = sqliteTable("collaboration_stories", {
  id: text("id").primaryKey(),

  // Release reference
  releaseId: text("release_id").notNull(), // Link to media_releases
  releaseTitle: text("release_title").notNull(),

  // Story content
  title: text("title"),
  story: text("story"), // Rich text / markdown

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type CollaborationStory = typeof collaborationStories.$inferSelect;
export type NewCollaborationStory = typeof collaborationStories.$inferInsert;

// Collaborators on a release
export const releaseCollaborators = sqliteTable("release_collaborators", {
  id: text("id").primaryKey(),

  storyId: text("story_id").notNull(),
  releaseId: text("release_id").notNull(),

  // Collaborator info
  name: text("name").notNull(),
  role: text("role").notNull(), // "producer", "songwriter", "engineer", "mixer", "master", "featured", "vocals", etc.
  artistId: text("artist_id"), // If they're in our roster

  // External links
  spotifyUrl: text("spotify_url"),
  instagramUrl: text("instagram_url"),
  twitterUrl: text("twitter_url"),
  websiteUrl: text("website_url"),
  photoUrl: text("photo_url"),

  // Additional info
  contribution: text("contribution"), // Description of what they did
  quote: text("quote"), // Quote about working on the release

  // Order
  position: integer("position").default(0),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type ReleaseCollaborator = typeof releaseCollaborators.$inferSelect;
export type NewReleaseCollaborator = typeof releaseCollaborators.$inferInsert;

// Behind-the-scenes media (studio photos, videos)
export const storyMedia = sqliteTable("story_media", {
  id: text("id").primaryKey(),

  storyId: text("story_id").notNull(),

  // Media info
  mediaType: text("media_type").notNull(), // "image" | "video" | "audio"
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption"),

  // For images
  width: integer("width"),
  height: integer("height"),

  // For video/audio
  duration: integer("duration"), // seconds

  // Order
  position: integer("position").default(0),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type StoryMedia = typeof storyMedia.$inferSelect;
export type NewStoryMedia = typeof storyMedia.$inferInsert;

// ===========================================
// SYNCED LYRICS (KARAOKE)
// ===========================================
// Time-synced lyrics for karaoke mode

export const trackLyrics = sqliteTable("track_lyrics", {
  id: text("id").primaryKey(),

  // Track reference
  releaseId: text("release_id"), // Link to media_releases
  spotifyUri: text("spotify_uri"),
  trackTitle: text("track_title").notNull(),
  trackArtist: text("track_artist").notNull(),

  // Full lyrics (plain text)
  lyrics: text("lyrics").notNull(),

  // Language
  language: text("language").default("es"),

  // Source/credits
  lyricsSource: text("lyrics_source"), // "genius", "manual", etc.
  lyricsContributor: text("lyrics_contributor"),

  // Status
  hasSyncedLyrics: integer("has_synced_lyrics", { mode: "boolean" }).default(false),
  isVerified: integer("is_verified", { mode: "boolean" }).default(false),

  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type TrackLyrics = typeof trackLyrics.$inferSelect;
export type NewTrackLyrics = typeof trackLyrics.$inferInsert;

// Individual synced lines
export const syncedLyricLines = sqliteTable("synced_lyric_lines", {
  id: text("id").primaryKey(),

  lyricsId: text("lyrics_id").notNull(),

  // Line content
  text: text("text").notNull(),

  // Timing (milliseconds)
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time"),

  // Word-by-word timing (JSON array of {word, start, end})
  wordTimings: text("word_timings"), // JSON

  // Line metadata
  lineNumber: integer("line_number").notNull(),
  isChorus: integer("is_chorus", { mode: "boolean" }).default(false),
  speaker: text("speaker"), // For multiple voices

  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type SyncedLyricLine = typeof syncedLyricLines.$inferSelect;
export type NewSyncedLyricLine = typeof syncedLyricLines.$inferInsert;

// ===========================================
// PLAYLIST COLLABORATORS
// ===========================================
// Multiple users can add tracks to a playlist

export const playlistCollaborators = sqliteTable("playlist_collaborators", {
  id: text("id").primaryKey(),
  playlistId: text("playlist_id").notNull(),

  // Collaborator info
  email: text("email").notNull(),
  name: text("name"),
  role: text("role").default("contributor"), // "owner" | "admin" | "contributor"

  // Invitation
  inviteToken: text("invite_token"),
  invitedBy: text("invited_by"),
  invitedAt: integer("invited_at", { mode: "timestamp" }),
  acceptedAt: integer("accepted_at", { mode: "timestamp" }),

  // Permissions
  canAddTracks: integer("can_add_tracks", { mode: "boolean" }).default(true),
  canRemoveTracks: integer("can_remove_tracks", { mode: "boolean" }).default(false),
  canEditDetails: integer("can_edit_details", { mode: "boolean" }).default(false),
  canInviteOthers: integer("can_invite_others", { mode: "boolean" }).default(false),

  // Status
  isActive: integer("is_active", { mode: "boolean" }).default(true),

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type PlaylistCollaborator = typeof playlistCollaborators.$inferSelect;
export type NewPlaylistCollaborator = typeof playlistCollaborators.$inferInsert;

// ===========================================
// TRUSTED CONTRIBUTORS
// ===========================================
// Auto-approve content from trusted users

export const trustedContributors = sqliteTable("trusted_contributors", {
  id: text("id").primaryKey(),

  // Identifier (email or Instagram handle)
  identifierType: text("identifier_type").notNull(), // "email" | "instagram"
  identifierValue: text("identifier_value").notNull(),
  displayName: text("display_name"),

  // Trust settings
  trustLevel: integer("trust_level").default(1), // 1=basic, 2=verified, 3=vip
  autoApproveMessages: integer("auto_approve_messages", { mode: "boolean" }).default(true),
  autoApprovePhotos: integer("auto_approve_photos", { mode: "boolean" }).default(true),
  autoFeature: integer("auto_feature", { mode: "boolean" }).default(false),

  // Reason for trust
  notes: text("notes"),
  addedBy: text("added_by"),

  // Activity tracking
  approvedCount: integer("approved_count").default(0),
  lastSubmissionAt: integer("last_submission_at", { mode: "timestamp" }),

  // Status
  isActive: integer("is_active", { mode: "boolean" }).default(true),

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type TrustedContributor = typeof trustedContributors.$inferSelect;
export type NewTrustedContributor = typeof trustedContributors.$inferInsert;

// ===========================================
// PLAYLIST EMBED STATS
// ===========================================
// Track embed usage for analytics

export const playlistEmbedStats = sqliteTable("playlist_embed_stats", {
  id: text("id").primaryKey(),
  playlistId: text("playlist_id").notNull(),

  // Embed info
  embedType: text("embed_type").default("iframe"), // "iframe" | "widget" | "card"
  referrerDomain: text("referrer_domain"),
  referrerUrl: text("referrer_url"),

  // Stats
  viewCount: integer("view_count").default(0),
  playCount: integer("play_count").default(0),

  // First and last seen
  firstSeenAt: integer("first_seen_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type PlaylistEmbedStats = typeof playlistEmbedStats.$inferSelect;
export type NewPlaylistEmbedStats = typeof playlistEmbedStats.$inferInsert;
