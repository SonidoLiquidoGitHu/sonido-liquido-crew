// ===========================================
// SCHEMA INDEX - EXPORTS ALL TABLES
// ===========================================

// Users & Authentication
export * from "./users";

// Artists & Profiles
export * from "./artists";

// Releases & Playlists
export * from "./releases";

// Videos
export * from "./videos";

// Events
export * from "./events";

// Products & Orders
export * from "./products";

// Subscribers & Email Marketing
export * from "./subscribers";

// Downloads & File Assets
export * from "./downloads";

// Campaigns (Campañas) - Presaves, Hyperfollows, Smart Links
export * from "./campaigns";

// Beats with Download Gates
export * from "./beats";

// Media Releases & Press Kits
export * from "./media";

// Sync Management
export * from "./sync";

// Analytics
export * from "./analytics";

// Tags
export * from "./tags";

// Site Settings
export * from "./settings";

// Gallery & Photos
export * from "./gallery";

// Upcoming Releases & Presaves
export * from "./upcoming";

// Press Kit
export * from "./press-kit";

// Artist EPK (Electronic Press Kit)
export * from "./epk";

// Notifications, A/B Testing & Email Campaigns
export * from "./notifications";

// Community Features (Fan Wall, Playlists, Concert Memories, Collab Stories, Lyrics)
export * from "./community";

// Custom Styles Library
export * from "./styles";

// Curated Spotify Channels & Playlist Curation
export * from "./curated-channels";

// Social Auto-Posting (Instagram & Facebook)
export * from "./social-posts";

// Social Credentials (API keys stored in DB)
export * from "./social-credentials";

// Vertical Videos (9:16 Reels / Shorts)
export * from "./vertical-videos";

// Dropbox link cache (resolved temp-link cache for video playback)
export * from "./video-cache";

// Deleted Releases Blocklist (prevents Spotify sync from re-importing
// releases that an admin has explicitly deleted)
export * from "./release-blocklist";

// Sampling Resources (curated YouTube channels, videos, playlists)
export * from "./sampling-resources";
