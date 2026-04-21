/**
 * Shared types and utilities for the Sonido Líquido Crew app.
 * All artist-related code must import from this single source of truth.
 */

// ── Artist Type ─────────────────────────────────────────────────────
// Merges Spotify API data with static config data (Instagram, YouTube).

export interface Artist {
  id: string;             // Spotify artist ID
  name: string;
  image: string;          // Spotify artist image URL
  followers: number;
  spotifyUrl: string;
  popularity: number;     // 0-100 from Spotify
  releases: number;       // album/single/EP count from Spotify
  instagram: string | null;   // Instagram profile URL (from config)
  youtubeChannelId: string | null; // YouTube channel ID (from config)
  youtubeHandle: string | null;    // YouTube @handle (from config)
}

// ── Track Type (for artist detail page) ──────────────────────────────

export interface Track {
  id: string;
  name: string;
  album: string;
  albumImage: string;
  durationMs: number;
  spotifyUrl: string;
  previewUrl: string | null;
}

// ── Release Type (for homepage latest releases) ─────────────────────

export interface Release {
  id: string;
  name: string;
  artistName: string;
  image: string;
  releaseDate: string;
  type: "album" | "single" | "compilation";
  spotifyUrl: string;
}

// ── YouTube Video Type ──────────────────────────────────────────────

export interface YouTubeVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
}

// ── Utilities ───────────────────────────────────────────────────────

export function formatFollowers(n: number): string {
  if (typeof n !== "number" || isNaN(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toString();
}

export function formatCount(n: number): string {
  if (typeof n !== "number" || isNaN(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toString();
}

export function safeString(val: unknown, fallback = ""): string {
  if (typeof val === "string" && val.length > 0) return val;
  return fallback;
}

export function safeNumber(val: unknown, fallback = 0): number {
  if (typeof val === "number" && !isNaN(val)) return val;
  return fallback;
}

export function normalizeArtist(item: Record<string, unknown>): Artist {
  return {
    id: safeString(item.id, crypto.randomUUID?.() ?? String(Math.random())),
    name: safeString(item.name, "Unknown Artist"),
    image: safeString(item.image),
    followers: safeNumber(item.followers),
    spotifyUrl: safeString(item.spotifyUrl),
    popularity: safeNumber(item.popularity),
    releases: safeNumber(item.releases),
    instagram: typeof item.instagram === "string" ? item.instagram : null,
    youtubeChannelId: typeof item.youtubeChannelId === "string" ? item.youtubeChannelId : null,
    youtubeHandle: typeof item.youtubeHandle === "string" ? item.youtubeHandle : null,
  };
}

// ── Playlist Types (for Spotify playlist curation) ────────────────

export interface Playlist {
  id: string;
  name: string;
  description: string;
  public: boolean;
  snapshotId: string;
  tracks: { total: number };
  images: { url: string; height: number; width: number }[];
  spotifyUrl: string;
  owner: { id: string; displayName: string };
}

export interface PlaylistTrack {
  addedAt: string;
  id: string;
  name: string;
  uri: string;
  durationMs: number;
  artists: { id: string; name: string; spotifyUrl: string }[];
  album: { id: string; name: string; images: { url: string }[]; spotifyUrl: string };
  spotifyUrl: string;
  previewUrl: string | null;
}

export interface SearchResultTrack {
  id: string;
  name: string;
  uri: string;
  durationMs: number;
  artists: { id: string; name: string }[];
  album: { id: string; name: string; images: { url: string }[] };
  previewUrl: string | null;
}

export function formatDuration(ms: number): string {
  if (typeof ms !== "number" || isNaN(ms)) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
