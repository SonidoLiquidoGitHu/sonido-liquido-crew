import type { SpotifyArtist, SpotifyAlbum, SpotifyTrack } from "@/types";

// ===========================================
// SPOTIFY API CLIENT
// ===========================================

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
      signal: AbortSignal.timeout(10_000), // 10s timeout for auth
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
   * Make authenticated API request with retry logic and timeout
   */
  private async request<T>(endpoint: string, retries = 2, timeoutMs = 8_000): Promise<T> {
    const token = await this.getAccessToken();
    const url = `https://api.spotify.com/v1${endpoint}`;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (response.ok) {
          return response.json();
        }

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
          const waitTime = Math.min((retryAfter + 1) * 1000, 10_000); // Cap at 10s
          console.log(`[Spotify API] Rate limited, waiting ${retryAfter}s before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // For other errors, fail immediately (don't retry 4xx except 429)
        const errorBody = await response.text().catch(() => "");
        console.error(`[Spotify API] Error ${response.status}: ${errorBody}`);
        console.error(`[Spotify API] URL: ${url}`);
        // Include error body in message for 400 errors (helps debug bad requests)
        const detail = errorBody ? ` - ${errorBody.slice(0, 200)}` : "";
        throw new Error(`Spotify API error: ${response.status} ${response.statusText}${detail}`);
      } catch (fetchError) {
        // Handle timeout errors
        if (fetchError instanceof DOMException && fetchError.name === "TimeoutError") {
          console.warn(`[Spotify API] Request timeout for ${endpoint} (attempt ${attempt + 1}/${retries})`);
          if (attempt < retries - 1) continue;
          throw new Error(`Spotify API timeout: ${endpoint} failed after ${retries} attempts`);
        }
        // Re-throw other errors
        throw fetchError;
      }
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
   * Get artist's top tracks (up to 10)
   * Primary: /artists/{id}/top-tracks endpoint
   * Fallback: fetch recent albums + extract tracks (Spotify restricted top-tracks for client credentials)
   */
  async getArtistTopTracks(artistId: string): Promise<SpotifyTrack[]> {
    // Try the dedicated top-tracks endpoint first
    try {
      const response = await this.request<{ tracks: SpotifyTrack[] }>(
        `/artists/${artistId}/top-tracks?market=MX`
      );
      return response.tracks || [];
    } catch (error) {
      const errMsg = (error as Error).message || "";
      // If 403 (Spotify restricted this endpoint for client credentials), use fallback
      if (errMsg.includes("403")) {
        console.log("[Spotify API] Top-tracks endpoint returned 403, using album-based fallback...");
        return this.getArtistTopTracksFallback(artistId);
      }
      throw error;
    }
  }

  /**
   * Fallback: Get artist's top tracks from their recent albums
   * Used when /artists/{id}/top-tracks returns 403 (restricted for client credentials)
   * Strategy: fetch the artist's most recent singles/albums and extract tracks
   * If albums also 403, falls back to search-based track lookup
   */
  private async getArtistTopTracksFallback(artistId: string): Promise<SpotifyTrack[]> {
    try {
      // Get artist's recent releases (singles first, then albums)
      const albumsResponse = await this.getArtistAlbums(artistId, {
        includeGroups: "single,album",
        limit: 5, // Just get the 5 most recent releases
      });

      if (!albumsResponse.items?.length) {
        console.log("[Spotify API] Fallback: No albums found for artist, trying search...");
        return this.searchTopTracksFallback(artistId);
      }

      // Fetch each album individually (batch endpoint is 403'd)
      const tracks: SpotifyTrack[] = [];
      for (const album of albumsResponse.items) {
        try {
          const fullAlbum = await this.getAlbum(album.id);
          const albumTracks = (fullAlbum as any).tracks?.items || [];
          
          for (const t of albumTracks) {
            // Only include tracks where this artist is listed
            const isByArtist = (t as any).artists?.some((a: any) => a.id === artistId);
            if (isByArtist) {
              // Enrich the track with album data (since album tracks don't include it)
              const enriched: any = {
                ...t,
                album: {
                  id: fullAlbum.id,
                  name: fullAlbum.name,
                  images: fullAlbum.images,
                  release_date: (fullAlbum as any).release_date,
                  album_type: (fullAlbum as any).album_type,
                },
              };
              tracks.push(enriched as SpotifyTrack);
            }
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

          // Stop once we have enough tracks
          if (tracks.length >= 10) break;
        } catch (albumErr) {
          console.warn(`[Spotify API] Fallback: Could not fetch album ${album.id}:`, (albumErr as Error).message);
        }
      }

      console.log(`[Spotify API] Fallback: Found ${tracks.length} tracks from recent albums`);
      return tracks.slice(0, 10);
    } catch (fallbackErr) {
      const errMsg = (fallbackErr as Error).message || "";
      // If albums endpoint also 403'd, try search-based fallback before giving up
      if (errMsg.includes("403") || errMsg.includes("400")) {
        console.log("[Spotify API] Album-based fallback also 403'd, trying search-based fallback...");
        return this.searchTopTracksFallback(artistId);
      }
      console.error("[Spotify API] Album-based fallback failed:", fallbackErr);
      return [];
    }
  }

  /**
   * Last-resort fallback: Search for the artist's top tracks using the search API.
   * Used when both /top-tracks and /albums endpoints return 403.
   * The search API is more permissive and rarely 403s.
   */
  private async searchTopTracksFallback(artistId: string): Promise<SpotifyTrack[]> {
    try {
      // First get the artist name so we can search for their tracks
      const artist = await this.getArtist(artistId);
      const artistName = artist.name;

      if (!artistName) {
        console.log("[Spotify API] Search fallback: Could not get artist name");
        return [];
      }

      const searchResult = await this.search(
        `artist:"${artistName}"`,
        ["track"],
        10
      );

      const tracks = (searchResult.tracks?.items || []).filter(
        (t: any) => t.artists?.some((a: any) => a.id === artistId)
      );

      console.log(`[Spotify API] Search fallback: Found ${tracks.length} tracks for ${artistName}`);
      return tracks.slice(0, 10);
    } catch (searchErr) {
      console.error("[Spotify API] Search-based fallback also failed:", (searchErr as Error).message);
      return [];
    }
  }

  /**
   * Get artist's albums
   */
  async getArtistAlbums(
    artistId: string,
    options: { includeGroups?: string; limit?: number; offset?: number } = {}
  ): Promise<SpotifyArtistAlbumsResponse> {
    const includeGroups = options.includeGroups || "album,single";
    const limit = Math.min(options.limit || 10, 10); // Spotify reduced max limit to 10 for client credentials
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
   * Falls back to search-based approach if the albums endpoint returns 400/403
   */
  async getAllArtistAlbums(artistId: string): Promise<SpotifyAlbum[]> {
    const albums: SpotifyAlbum[] = [];
    const seenIds = new Set<string>();

    // Fetch main types: album and single (most reliable)
    const includeGroups = "album,single";
    let offset = 0;
    const limit = 10; // Spotify reduced max limit to 10 for client credentials

    try {
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
    } catch (error) {
      const errMsg = (error as Error).message || "";
      // If 403/400, try fallback via search API
      if (errMsg.includes("403") || errMsg.includes("400")) {
        console.log(`[Spotify API] Albums endpoint failed (${errMsg.slice(0, 80)}), using search-based fallback...`);
        return this.getAllArtistAlbumsFallback(artistId);
      }
      throw error;
    }
  }

  /**
   * Fallback: Get artist albums using search API
   * Used when /artists/{id}/albums returns 400/403 (restricted for client credentials)
   * Strategy: search for the artist name + "album" / "single" to find their releases
   */
  private async getAllArtistAlbumsFallback(artistId: string): Promise<SpotifyAlbum[]> {
    try {
      // First get the artist name
      const artist = await this.getArtist(artistId);
      const artistName = artist.name;

      if (!artistName) {
        console.log("[Spotify API] Fallback: Could not get artist name");
        return [];
      }

      const albums: SpotifyAlbum[] = [];
      const seenIds = new Set<string>();

      // Search for albums by this artist (Spotify search "album" type returns both albums and singles)
      try {
        const searchResult = await this.search(
          `artist:"${artistName}"`,
          ["album"],
          10
        );

        const items = searchResult.albums?.items;
        if (items) {
          for (const album of items) {
            // Only include albums where this artist is credited
            const isByArtist = (album as any).artists?.some((a: any) => a.id === artistId);
            if (isByArtist && !seenIds.has(album.id)) {
              seenIds.add(album.id);
              albums.push(album);
            }
          }
        }
      } catch (searchErr) {
        console.warn(`[Spotify API] Fallback: Album search failed:`, (searchErr as Error).message);
      }

      // Sort by release date (newest first)
      albums.sort((a, b) => {
        const dateA = (a as any).release_date || "";
        const dateB = (b as any).release_date || "";
        return dateB.localeCompare(dateA);
      });

      console.log(`[Spotify API] Fallback: Found ${albums.length} albums via search for ${artistName}`);
      return albums;
    } catch (fallbackErr) {
      console.error("[Spotify API] Album search fallback failed:", fallbackErr);
      return [];
    }
  }

  /**
   * Get album by ID
   */
  async getAlbum(albumId: string): Promise<SpotifyAlbum> {
    return this.request<SpotifyAlbum>(`/albums/${albumId}`);
  }

  /**
   * Get multiple albums by IDs
   * Primary: batch endpoint /albums?ids=...
   * Fallback: fetch one by one if batch returns 400/403
   */
  async getAlbums(albumIds: string[]): Promise<SpotifyAlbum[]> {
    if (albumIds.length === 0) return [];

    // Spotify's batch endpoint max is 20 IDs
    const chunks: string[][] = [];
    for (let i = 0; i < albumIds.length; i += 20) {
      chunks.push(albumIds.slice(i, i + 20));
    }

    const results: SpotifyAlbum[] = [];
    let useFallback = false;

    for (const chunk of chunks) {
      if (useFallback) {
        // Fetch one by one
        for (const albumId of chunk) {
          try {
            const album = await this.getAlbum(albumId);
            results.push(album);
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (err) {
            console.warn(`[Spotify API] Failed to fetch album ${albumId}:`, (err as Error).message);
          }
        }
      } else {
        try {
          const response = await this.request<{ albums: SpotifyAlbum[] }>(
            `/albums?ids=${chunk.join(",")}&market=MX`
          );
          results.push(...response.albums);
        } catch (error) {
          const errMsg = (error as Error).message || "";
          if (errMsg.includes("400") || errMsg.includes("403")) {
            console.log(`[Spotify API] Batch albums endpoint failed (${errMsg}), falling back to one-by-one...`);
            useFallback = true;
            // Retry this chunk one by one
            for (const albumId of chunk) {
              try {
                const album = await this.getAlbum(albumId);
                results.push(album);
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (err) {
                console.warn(`[Spotify API] Failed to fetch album ${albumId}:`, (err as Error).message);
              }
            }
          } else {
            throw error;
          }
        }
      }
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
    limit = 10
  ): Promise<SpotifySearchResponse> {
    const cappedLimit = Math.min(limit, 10); // Spotify reduced max limit to 10 for client credentials
    const params = new URLSearchParams({
      q: query,
      type: types.join(","),
      limit: String(cappedLimit),
      market: "MX",
    });

    return this.request<SpotifySearchResponse>(`/search?${params.toString()}`);
  }

  /**
   * Get playlist by ID (metadata only)
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
   * Get all tracks from a Spotify playlist (handles pagination)
   * Returns simplified track info suitable for importing into the local system
   */
  async getPlaylistTracks(playlistId: string): Promise<{
    id: string;
    name: string;
    description: string;
    images: { url: string }[];
    external_urls: { spotify: string };
    tracks: Array<{
      spotifyTrackId: string;
      trackName: string;
      artistName: string;
      artistIds: string[];
      albumName: string;
      albumImageUrl: string | null;
      durationMs: number | null;
      previewUrl: string | null;
      releaseDate: string | null;
      popularity: number | null;
      explicit: boolean;
      position: number;
    }>;
  }> {
    // First get the playlist metadata
    const playlistMeta = await this.getPlaylist(playlistId);

    const tracks: Array<{
      spotifyTrackId: string;
      trackName: string;
      artistName: string;
      artistIds: string[];
      albumName: string;
      albumImageUrl: string | null;
      durationMs: number | null;
      previewUrl: string | null;
      releaseDate: string | null;
      popularity: number | null;
      explicit: boolean;
      position: number;
    }> = [];

    // Fetch tracks with pagination (100 per page)
    const limit = 100;
    let offset = 0;
    let hasMore = true;
    let globalPosition = 1; // Global position counter across all pages

    while (hasMore) {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        market: "MX",
        fields: "items(track(id,name,artists(id,name),album(id,name,images,release_date),duration_ms,preview_url,popularity,explicit)),total,next",
      });

      const response = await this.request<{
        items: Array<{
          track: {
            id: string;
            name: string;
            artists: Array<{ id: string; name: string }>;
            album: {
              id: string;
              name: string;
              images: Array<{ url: string }>;
              release_date: string;
            };
            duration_ms: number;
            preview_url: string | null;
            popularity: number;
            explicit: boolean;
          } | null;
        }>;
        total: number;
        next: string | null;
      }>(`/playlists/${playlistId}/tracks?${params.toString()}`);

      if (!response.items?.length) {
        break;
      }

      for (const item of response.items) {
        const track = item.track;
        // Skip null tracks (removed/unavailable) and local tracks (no Spotify ID)
        if (!track || !track.id) continue;

        tracks.push({
          spotifyTrackId: track.id,
          trackName: track.name,
          artistName: track.artists?.map((a) => a.name).join(", ") || "Unknown",
          artistIds: track.artists?.map((a) => a.id) || [],
          albumName: track.album?.name || "",
          albumImageUrl: track.album?.images?.[0]?.url || null,
          durationMs: track.duration_ms || null,
          previewUrl: track.preview_url || null,
          releaseDate: track.album?.release_date || null,
          popularity: track.popularity || null,
          explicit: track.explicit || false,
          position: globalPosition++,
        });
      }

      // Check if there are more pages
      hasMore = response.next !== null && response.items.length === limit;
      offset += limit;

      // Small delay to avoid rate limiting
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(
      `[Spotify API] Fetched ${tracks.length} tracks from playlist ${playlistId}`
    );

    return {
      id: playlistMeta.id,
      name: playlistMeta.name,
      description: playlistMeta.description,
      images: playlistMeta.images,
      external_urls: playlistMeta.external_urls,
      tracks,
    };
  }

  /**
   * Extract Spotify ID from URL
   */
  static extractId(url: string): string | null {
    // Supported URL formats:
    //   https://open.spotify.com/artist/XXXXX
    //   https://open.spotify.com/intl-es/artist/XXXXX  (locale prefix)
    //   https://open.spotify.com/embed/artist/XXXXX
    //   spotify:artist:XXXXX  (Spotify URI)
    const types = ['artist', 'album', 'track', 'playlist'];

    // Try Spotify URI format first: spotify:artist:XXXXX
    for (const type of types) {
      const uriMatch = url.match(new RegExp(`spotify:${type}:([a-zA-Z0-9]+)`));
      if (uriMatch) return uriMatch[1];
    }

    // Try URL format with optional locale/embed prefix:
    //   spotify.com/[intl-XX/]artist/XXXXX
    //   spotify.com/embed/artist/XXXXX
    for (const type of types) {
      const urlMatch = url.match(
        new RegExp(`spotify\\.com/(?:embed/)?(?:intl-[a-z]{2}/)?${type}/([a-zA-Z0-9]+)`)
      );
      if (urlMatch) return urlMatch[1];
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
