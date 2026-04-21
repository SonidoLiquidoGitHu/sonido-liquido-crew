/**
 * Shared types and utilities for the Colectivo music collective app.
 * All artist-related code must import from this single source of truth.
 */

// ── Artist Type ─────────────────────────────────────────────────────
// Matches the Spotify API data shape used by /api/artists.
// DO NOT add fields like "genres", "slug", "bio", or "socials" here.

export interface Artist {
  id: string;
  name: string;
  image: string;
  followers: number;
  spotifyUrl: string;
  popularity: number;     // 0-100 from Spotify
  releases: number;       // album/single/EP count from Spotify
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

// ── Utilities ───────────────────────────────────────────────────────

/**
 * Format a follower count for display.
 * 1234567 → "1.2M", 12345 → "12.3K", 999 → "999"
 */
export function formatFollowers(n: number): string {
  if (typeof n !== "number" || isNaN(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toString();
}

/**
 * Format a large number for display (releases, videos, etc.)
 */
export function formatCount(n: number): string {
  if (typeof n !== "number" || isNaN(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toString();
}

/**
 * Safely coerce an unknown value to a string.
 */
export function safeString(val: unknown, fallback = ""): string {
  if (typeof val === "string" && val.length > 0) return val;
  return fallback;
}

/**
 * Safely coerce an unknown value to a number.
 */
export function safeNumber(val: unknown, fallback = 0): number {
  if (typeof val === "number" && !isNaN(val)) return val;
  return fallback;
}

/**
 * Normalize a raw API item into a safe Artist object.
 */
export function normalizeArtist(item: Record<string, unknown>): Artist {
  return {
    id: safeString(item.id, crypto.randomUUID?.() ?? String(Math.random())),
    name: safeString(item.name, "Unknown Artist"),
    image: safeString(item.image),
    followers: safeNumber(item.followers),
    spotifyUrl: safeString(item.spotifyUrl),
    popularity: safeNumber(item.popularity),
    releases: safeNumber(item.releases),
  };
}

/**
 * Format track duration from milliseconds to M:SS
 */
export function formatDuration(ms: number): string {
  if (typeof ms !== "number" || isNaN(ms)) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
