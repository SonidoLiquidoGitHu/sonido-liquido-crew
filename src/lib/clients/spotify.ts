import type { SpotifyArtist, SpotifyAlbum, SpotifyTrack } from "@/types";

// ===========================================
// SPOTIFY API CLIENT
// ===========================================

// Custom error for rate limiting
export class SpotifyRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "SpotifyRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifySearchResponse {
  artists?: { items: SpotifyArtist[] };
  albums?: { items: SpotifyAlbum[] };
  tracks?: { items: SpotifyTrack[] };
}

interface SpotifyArtistAlbumsResponse {
  items: SpotifyAlbum[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
}

class SpotifyClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6";
  }

  /**
   * Check if credentials are configured
   */
  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  /**
   * Get access token using client credentials flow
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.isConfigured()) {
      throw new Error("Spotify credentials not configured");
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      throw new Error(`Failed to get Spotify access token: ${response.statusText}`);
    }

    const data: SpotifyTokenResponse = await response.json();

    this.accessToken = data.access_token;
    // Set expiry 5 minutes before actual expiry for safety
    this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

    return this.accessToken;
  }

  /**
   * Make authenticated API request with retry logic
   */
  private async request<T>(endpoint: string, retries = 3): Promise<T> {
    const token = await this.getAccessToken();
    const url = `https://api.spotify.com/v1${endpoint}`;

    for (let attempt = 0; attempt < retries; attempt++) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        return response.json();
      }

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);

        // If rate limit is too long (> 60 seconds), don't wait - throw error
        if (retryAfter > 60) {
          const hours = Math.floor(retryAfter / 3600);
          const minutes = Math.floor((retryAfter % 3600) / 60);
          console.error(`[Spotify API] Rate limited for ${retryAfter}s - too long to wait`);
          throw new SpotifyRateLimitError(
            `Spotify API está limitada. Debes esperar ${hours > 0 ? `${hours}h ` : ""}${minutes}min o usar credenciales propias.`,
            retryAfter
          );
        }

        const waitTime = (retryAfter + 1) * 1000;
        console.log(`[Spotify API] Rate limited, waiting ${retryAfter}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // For other errors, fail immediately
      const errorBody = await response.text().catch(() => "");
      console.error(`[Spotify API] Error ${response.status}: ${errorBody}`);
      console.error(`[Spotify API] URL: ${url}`);
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }

    throw new Error(`Spotify API error: Max retries exceeded for ${endpoint}`);
  }

  /**
   * Get artist by ID
   */
  async getArtist(artistId: string): Promise<SpotifyArtist> {
    return this.request<SpotifyArtist>(`/artists/${artistId}`);
  }

  /**
   * Get multiple artists by IDs
   * Note: Uses individual requests because batch endpoint requires special permissions
   */
  async getArtists(artistIds: string[]): Promise<SpotifyArtist[]> {
    // Filter out null, undefined, empty strings, and invalid IDs
    const validIds = artistIds.filter(id => {
      if (!id || typeof id !== "string") return false;
      const trimmed = id.trim();
      // Spotify IDs are base62 encoded, typically 22 characters
      return trimmed.length > 0 && /^[a-zA-Z0-9]+$/.test(trimmed);
    });

    if (validIds.length === 0) {
      console.log("[Spotify API] No valid artist IDs provided");
      return [];
    }

    console.log(`[Spotify API] Fetching ${validIds.length} artists individually...`);

    // Fetch each artist individually (batch endpoint returns 403)
    const results: SpotifyArtist[] = [];
    for (const id of validIds) {
      try {
        const artist = await this.getArtist(id);
        if (artist) {
          results.push(artist);
        }
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[Spotify API] Failed to fetch artist ${id}: ${(error as Error).message}`);
        // Continue with other artists
      }
    }

    console.log(`[Spotify API] Successfully fetched ${results.length}/${validIds.length} artists`);
    return results;
  }

  /**
   * Get artist's albums
   */
  async getArtistAlbums(
    artistId: string,
    options: { includeGroups?: string; limit?: number; offset?: number } = {}
  ): Promise<SpotifyArtistAlbumsResponse> {
    const includeGroups = options.includeGroups || "album,single";
    const limit = Math.min(options.limit || 20, 50); // Max is 50, default to 20
    const offset = options.offset || 0;

    // Use URLSearchParams for proper encoding
    const params = new URLSearchParams({
      include_groups: includeGroups,
      limit: String(limit),
      offset: String(offset),
      market: "MX"
    });

    const url = `/artists/${artistId}/albums?${params.toString()}`;

    return this.request<SpotifyArtistAlbumsResponse>(url);
  }

  /**
   * Get all albums for an artist (handles pagination)
   * Fetches albums and singles (the most reliable types)
   */
  async getAllArtistAlbums(artistId: string): Promise<SpotifyAlbum[]> {
    const albums: SpotifyAlbum[] = [];
    const seenIds = new Set<string>();

    // Fetch main types: album and single (most reliable)
    const includeGroups = "album,single";
    let offset = 0;
    const limit = 50; // Use max limit for efficiency

    while (true) {
      const response = await this.getArtistAlbums(artistId, {
        includeGroups,
        limit,
        offset
      });

      // Filter out duplicates
      for (const album of response.items) {
        if (!seenIds.has(album.id)) {
          seenIds.add(album.id);
          albums.push(album);
        }
      }

      if (!response.next || response.items.length < limit) {
        break;
      }
      offset += limit;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return albums;
  }

  /**
   * Get album by ID
   */
  async getAlbum(albumId: string): Promise<SpotifyAlbum> {
    return this.request<SpotifyAlbum>(`/albums/${albumId}`);
  }

  /**
   * Get multiple albums by IDs
   */
  async getAlbums(albumIds: string[]): Promise<SpotifyAlbum[]> {
    if (albumIds.length === 0) return [];

    const chunks: string[][] = [];
    for (let i = 0; i < albumIds.length; i += 20) {
      chunks.push(albumIds.slice(i, i + 20));
    }

    const results: SpotifyAlbum[] = [];
    for (const chunk of chunks) {
      const response = await this.request<{ albums: SpotifyAlbum[] }>(
        `/albums?ids=${chunk.join(",")}&market=MX`
      );
      results.push(...response.albums);
    }

    return results;
  }

  /**
   * Get track by ID
   */
  async getTrack(trackId: string): Promise<SpotifyTrack> {
    return this.request<SpotifyTrack>(`/tracks/${trackId}?market=MX`);
  }

  /**
   * Search for artists, albums, or tracks
   */
  async search(
    query: string,
    types: ("artist" | "album" | "track")[] = ["artist"],
    limit = 20
  ): Promise<SpotifySearchResponse> {
    const params = new URLSearchParams({
      q: query,
      type: types.join(","),
      limit: String(limit),
      market: "MX",
    });

    return this.request<SpotifySearchResponse>(`/search?${params.toString()}`);
  }

  /**
   * Get playlist by ID
   */
  async getPlaylist(playlistId: string): Promise<{
    id: string;
    name: string;
    description: string;
    images: { url: string }[];
    tracks: { total: number };
    external_urls: { spotify: string };
  }> {
    return this.request(`/playlists/${playlistId}?fields=id,name,description,images,tracks.total,external_urls`);
  }

  /**
   * Extract Spotify ID from URL
   */
  static extractId(url: string): string | null {
    const patterns = [
      /spotify\.com\/artist\/([a-zA-Z0-9]+)/,
      /spotify\.com\/album\/([a-zA-Z0-9]+)/,
      /spotify\.com\/track\/([a-zA-Z0-9]+)/,
      /spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Get embed URL for Spotify content
   */
  static getEmbedUrl(type: "artist" | "album" | "track" | "playlist", id: string): string {
    return `https://open.spotify.com/embed/${type}/${id}`;
  }
}

// Export singleton instance
export const spotifyClient = new SpotifyClient();

// Export class for testing
export { SpotifyClient };
