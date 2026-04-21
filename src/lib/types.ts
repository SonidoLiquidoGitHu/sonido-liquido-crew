/**
 * Shared types and utilities for the Colectivo music collective app.
 * All artist-related code must import from this single source of truth.
 */

// ── Artist Type ─────────────────────────────────────────────────────
// This matches the exact shape returned by /api/artists (Spotify-powered).
// DO NOT add fields like "genres", "slug", "bio", or "socials" here.
// The API normalizes Spotify data to this flat shape.

export interface Artist {
  id: string;
  name: string;
  image: string;
  followers: number;
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
 * Safely coerce an unknown value to a string.
 * Returns fallback if value is not a non-empty string.
 */
export function safeString(val: unknown, fallback = ""): string {
  if (typeof val === "string" && val.length > 0) return val;
  return fallback;
}

/**
 * Safely coerce an unknown value to a number.
 * Returns fallback if value is not a valid number.
 */
export function safeNumber(val: unknown, fallback = 0): number {
  if (typeof val === "number" && !isNaN(val)) return val;
  return fallback;
}

/**
 * Normalize a raw API item into a safe Artist object.
 * Guarantees every field is the correct type with sensible defaults.
 */
export function normalizeArtist(item: Record<string, unknown>): Artist {
  return {
    id: safeString(item.id, crypto.randomUUID?.() ?? String(Math.random())),
    name: safeString(item.name, "Unknown Artist"),
    image: safeString(item.image),
    followers: safeNumber(item.followers),
    spotifyUrl: safeString(item.spotifyUrl),
  };
}
