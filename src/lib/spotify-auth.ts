/**
 * Spotify OAuth Authorization Code Flow utilities.
 * Handles token exchange, refresh, and encrypted cookie session management.
 *
 * Scopes requested:
 * - playlist-modify-public   → Create & edit public playlists
 * - playlist-modify-private  → Create & edit private playlists
 * - playlist-read-private    → Read private playlists
 * - ugc-image-upload         → Upload custom playlist cover art
 * - user-read-email          → Identify which user logged in
 * - user-read-private        → Read user profile (country, product)
 */

export const SPOTIFY_SCOPES = [
  "playlist-modify-public",
  "playlist-modify-private",
  "playlist-read-private",
  "ugc-image-upload",
  "user-read-email",
  "user-read-private",
] as const;

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until expiry
  scope: string;
  tokenType: string;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
  product: string;
  followers: { total: number };
}

// ── Token Exchange ────────────────────────────────────────────────

export async function exchangeCodeForTokens(code: string): Promise<SpotifyTokens> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Spotify OAuth environment variables");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Spotify token exchange failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
    tokenType: data.token_type,
  };
}

// ── Token Refresh ─────────────────────────────────────────────────

export async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokens> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Spotify OAuth environment variables");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Spotify token refresh failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken, // Spotify may not return a new refresh token
    expiresIn: data.expires_in,
    scope: data.scope,
    tokenType: data.token_type,
  };
}

// ── Get Current User ──────────────────────────────────────────────

export async function getSpotifyUser(accessToken: string): Promise<SpotifyUser> {
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Spotify get user failed (${res.status}): ${detail}`);
  }

  return res.json();
}

// ── Cookie Session Management ─────────────────────────────────────
// Simple encrypted cookie storage using base64 + XOR with a server secret.
// For production, consider using iron-session or encrypted JWTs.

const SESSION_PREFIX = "slc_spotify_";

function getEncryptionKey(): string {
  const key = process.env.SPOTIFY_CLIENT_SECRET;
  if (!key) throw new Error("Missing SPOTIFY_CLIENT_SECRET for cookie encryption");
  return key;
}

function encrypt(value: string): string {
  const key = getEncryptionKey();
  const encrypted = Buffer.from(value, "utf-8")
    .map((byte, i) => byte ^ key.charCodeAt(i % key.length));
  return Buffer.from(encrypted).toString("base64");
}

function decrypt(encoded: string): string {
  try {
    const key = getEncryptionKey();
    const decoded = Buffer.from(encoded, "base64");
    const decrypted = decoded.map((byte, i) => byte ^ key.charCodeAt(i % key.length));
    return Buffer.from(decrypted).toString("utf-8");
  } catch {
    return "";
  }
}

export interface SpotifySession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
  user: {
    id: string;
    displayName: string;
    email: string;
    image: string;
  };
}

export function sessionToCookies(session: SpotifySession): { name: string; value: string; options: Record<string, unknown> }[] {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  };

  return [
    {
      name: `${SESSION_PREFIX}at`,
      value: encrypt(session.accessToken),
      options: cookieOptions,
    },
    {
      name: `${SESSION_PREFIX}rt`,
      value: encrypt(session.refreshToken),
      options: cookieOptions,
    },
    {
      name: `${SESSION_PREFIX}exp`,
      value: String(session.expiresAt),
      options: cookieOptions,
    },
    {
      name: `${SESSION_PREFIX}user`,
      value: encrypt(JSON.stringify(session.user)),
      options: cookieOptions,
    },
  ];
}

export function sessionFromCookies(cookies: Record<string, string | undefined>): SpotifySession | null {
  const at = cookies[`${SESSION_PREFIX}at`];
  const rt = cookies[`${SESSION_PREFIX}rt`];
  const exp = cookies[`${SESSION_PREFIX}exp`];
  const user = cookies[`${SESSION_PREFIX}user`];

  if (!at || !rt || !exp || !user) return null;

  try {
    const accessToken = decrypt(at);
    const refreshToken = decrypt(rt);
    const expiresAt = parseInt(exp, 10);
    const userData = JSON.parse(decrypt(user));

    if (!accessToken || !refreshToken) return null;

    return {
      accessToken,
      refreshToken,
      expiresAt,
      user: userData,
    };
  } catch {
    return null;
  }
}

export function clearSessionCookies(): { name: string; value: string; options: Record<string, unknown> }[] {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  return [
    { name: `${SESSION_PREFIX}at`, value: "", options: cookieOptions },
    { name: `${SESSION_PREFIX}rt`, value: "", options: cookieOptions },
    { name: `${SESSION_PREFIX}exp`, value: "", options: cookieOptions },
    { name: `${SESSION_PREFIX}user`, value: "", options: cookieOptions },
  ];
}
