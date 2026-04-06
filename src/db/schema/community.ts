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
  displayName: text("display_name").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  country: text("country"),
  city: text("city"),
  message: text("message").notNull(),
  reaction: text("reaction"),
  artistId: text("artist_id"),
  releaseId: text("release_id"),
  eventId: text("event_id"),
  isApproved: integer("is_approved", { mode: "boolean" }).default(false),
  isFeatured: integer("is_featured", { mode: "boolean" }).default(false),
  isHidden: integer("is_hidden", { mode: "boolean" }).default(false),
  moderatedAt: integer("moderated_at", { mode: "timestamp" }),
  moderatedBy: text("moderated_by"),
  backgroundColor: text("background_color"),
  fontStyle: text("font_style"),
  position: integer("position"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export type FanWallMessage = typeof fanWallMessages.$inferSelect;
export type NewFanWallMessage = typeof fanWallMessages.$inferInsert;
// ===========================================
// USER PLAYLISTS
// ===========================================
export const userPlaylists = sqliteTable("user_playlists", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  ownerName: text("owner_name"),
  sessionToken: text("session_token"),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  isPublic: integer("is_public", { mode: "boolean" }).default(true),
  playCount: integer("play_count").default(0),
  likeCount: integer("like_count").default(0),
  shareCount: integer("share_count").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export type UserPlaylist = typeof userPlaylists.$inferSelect;
export type NewUserPlaylist = typeof userPlaylists.$inferInsert;
export const userPlaylistTracks = sqliteTable("user_playlist_tracks", {
  id: text("id").primaryKey(),
  playlistId: text("playlist_id").notNull(),
  trackType: text("track_type").notNull(),
  trackId: text("track_id").notNull(),
  trackTitle: text("track_title").notNull(),
  trackArtist: text("track_artist").notNull(),
  trackCoverUrl: text("track_cover_url"),
  trackDuration: integer("track_duration"),
  spotifyUri: text("spotify_uri"),
  position: integer("position").notNull().default(0),
  addedAt: integer("added_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export type UserPlaylistTrack = typeof userPlaylistTracks.$inferSelect;
export type NewUserPlaylistTrack = typeof userPlaylistTracks.$inferInsert;
// ===========================================
// CONCERT MEMORY GALLERY
// ===========================================
export const concertMemories = sqliteTable("concert_memories", {
  id: text("id").primaryKey(),
  submitterName: text("submitter_name").notNull(),
  submitterEmail: text("submitter_email"),
  submitterInstagram: text("submitter_instagram"),
  eventId: text("event_id"),
  eventName: text("event_name"),
  eventDate: integer("event_date", { mode: "timestamp" }),
  eventVenue: text("event_venue"),
  eventCity: text("event_city"),
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption"),
  takenAt: integer("taken_at", { mode: "timestamp" }),
  cameraInfo: text("camera_info"),
  taggedArtists: text("tagged_artists"),
  isApproved: integer("is_approved", { mode: "boolean" }).default(false),
  isFeatured: integer("is_featured", { mode: "boolean" }).default(false),
  isHidden: integer("is_hidden", { mode: "boolean" }).default(false),
  moderatedAt: integer("moderated_at", { mode: "timestamp" }),
  likeCount: integer("like_count").default(0),
  viewCount: integer("view_count").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export type ConcertMemory = typeof concertMemories.$inferSelect;
export type NewConcertMemory = typeof concertMemories.$inferInsert;
// ===========================================
// COLLABORATION STORIES
// ===========================================
export const collaborationStories = sqliteTable("collaboration_stories", {
  id: text("id").primaryKey(),
  releaseId: text("release_id").notNull(),
  releaseTitle: text("release_title").notNull(),
  title: text("title"),
  story: text("story"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export type CollaborationStory = typeof collaborationStories.$inferSelect;
export type NewCollaborationStory = typeof collaborationStories.$inferInsert;
export const releaseCollaborators = sqliteTable("release_collaborators", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull(),
  releaseId: text("release_id").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  artistId: text("artist_id"),
  spotifyUrl: text("spotify_url"),
  instagramUrl: text("instagram_url"),
  twitterUrl: text("twitter_url"),
  websiteUrl: text("website_url"),
  photoUrl: text("photo_url"),
  contribution: text("contribution"),
  quote: text("quote"),
  position: integer("position").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export type ReleaseCollaborator = typeof releaseCollaborators.$inferSelect;
export type NewReleaseCollaborator = typeof releaseCollaborators.$inferInsert;
export const storyMedia = sqliteTable("story_media", {
  id: text("id").primaryKey(),
  storyId: text("story_id").notNull(),
  mediaType: text("media_type").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption"),
  width: integer("width"),
  height: integer("height"),
  duration: integer("duration"),
  position: integer("position").default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export type StoryMedia = typeof storyMedia.$inferSelect;
export type NewStoryMedia = typeof storyMedia.$inferInsert;
// ===========================================
// SYNCED LYRICS
// ===========================================
export const trackLyrics = sqliteTable("track_lyrics", {
  id: text("id").primaryKey(),
  releaseId: text("release_id"),
  spotifyUri: text("spotify_uri"),
  trackTitle: text("track_title").notNull(),
  trackArtist: text("track_artist").notNull(),
  lyrics: text("lyrics").notNull(),
  language: text("language").default("es"),
  lyricsSource: text("lyrics_source"),
  lyricsContributor: text("lyrics_contributor"),
  hasSyncedLyrics: integer("has_synced_lyrics", { mode: "boolean" }).default(false),
  isVerified: integer("is_verified", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export type TrackLyrics = typeof trackLyrics.$inferSelect;
export type NewTrackLyrics = typeof trackLyrics.$inferInsert;
export const syncedLyricLines = sqliteTable("synced_lyric_lines", {
  id: text("id").primaryKey(),
  lyricsId: text("lyrics_id").notNull(),
  text: text("text").notNull(),
  startTime: integer("start_time").notNull(),
  endTime: integer("end_time"),
  wordTimings: text("word_timings"),
  lineNumber: integer("line_number").notNull(),
  isChorus: integer("is_chorus", { mode: "boolean" }).default(false),
  speaker: text("speaker"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export type SyncedLyricLine = typeof syncedLyricLines.$inferSelect;
export type NewSyncedLyricLine = typeof syncedLyricLines.$inferInsert;
// ===========================================
// PLAYLIST COLLABORATORS
// ===========================================
export const playlistCollaborators = sqliteTable("playlist_collaborators", {
  id: text("id").primaryKey(),
  playlistId: text("playlist_id").notNull(),
  email: text("email").notNull(),
  name: text("name"),
  role: text("role").default("contributor"),
  inviteToken: text("invite_token"),
  invitedBy: text("invited_by"),
  invitedAt: integer("invited_at", { mode: "timestamp" }),
  acceptedAt: integer("accepted_at", { mode: "timestamp" }),
  canAddTracks: integer("can_add_tracks", { mode: "boolean" }).default(true),
  canRemoveTracks: integer("can_remove_tracks", { mode: "boolean" }).default(false),
  canEditDetails: integer("can_edit_details", { mode: "boolean" }).default(false),
  canInviteOthers: integer("can_invite_others", { mode: "boolean" }).default(false),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export type PlaylistCollaborator = typeof playlistCollaborators.$inferSelect;
export type NewPlaylistCollaborator = typeof playlistCollaborators.$inferInsert;
// ===========================================
// TRUSTED CONTRIBUTORS
// ===========================================
export const trustedContributors = sqliteTable("trusted_contributors", {
  id: text("id").primaryKey(),
  identifierType: text("identifier_type").notNull(),
  identifierValue: text("identifier_value").notNull(),
  displayName: text("display_name"),
  trustLevel: integer("trust_level").default(1),
  autoApproveMessages: integer("auto_approve_messages", { mode: "boolean" }).default(true),
  autoApprovePhotos: integer("auto_approve_photos", { mode: "boolean" }).default(true),
  autoFeature: integer("auto_feature", { mode: "boolean" }).default(false),
  notes: text("notes"),
  addedBy: text("added_by"),
  approvedCount: integer("approved_count").default(0),
  lastSubmissionAt: integer("last_submission_at", { mode: "timestamp" }),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export type TrustedContributor = typeof trustedContributors.$inferSelect;
export type NewTrustedContributor = typeof trustedContributors.$inferInsert;
// ===========================================
// PLAYLIST EMBED STATS
// ===========================================
export const playlistEmbedStats = sqliteTable("playlist_embed_stats", {
  id: text("id").primaryKey(),
  playlistId: text("playlist_id").notNull(),
  embedType: text("embed_type").default("iframe"),
  referrerDomain: text("referrer_domain"),
  referrerUrl: text("referrer_url"),
  viewCount: integer("view_count").default(0),
  playCount: integer("play_count").default(0),
  firstSeenAt: integer("first_seen_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
export type PlaylistEmbedStats = typeof playlistEmbedStats.$inferSelect;
export type NewPlaylistEmbedStats = typeof playlistEmbedStats.$inferInsert;