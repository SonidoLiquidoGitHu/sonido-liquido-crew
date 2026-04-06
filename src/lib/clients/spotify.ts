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
    this.clientId = process.env.SPOTIFY_CLIENT_ID || "";
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "";
  }
  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }
  private async getAccessToken(): Promise<string> {
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
    this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
    return this.accessToken;
  }
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
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
        const waitTime = (retryAfter + 1) * 1000;
        console.log(`[Spotify API] Rate limited, waiting ${retryAfter}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      const errorBody = await response.text().catch(() => "");
      console.error(`[Spotify API] Error ${response.status}: ${errorBody}`);
      console.error(`[Spotify API] URL: ${url}`);
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
    }
    throw new Error(`Spotify API error: Max retries exceeded for ${endpoint}`);
  }
  async getArtist(artistId: string): Promise<SpotifyArtist> {
    return this.request<SpotifyArtist>(`/artists/${artistId}`);
  }
  async getArtists(artistIds: string[]): Promise<SpotifyArtist[]> {
    const validIds = artistIds.filter(id => {
      if (!id || typeof id !== "string") return false;
      const trimmed = id.trim();
      return trimmed.length > 0 && /^[a-zA-Z0-9]+$/.test(trimmed);
    });
    if (validIds.length === 0) {
      console.log("[Spotify API] No valid artist IDs provided");
      return [];
    }
    console.log(`[Spotify API] Fetching ${validIds.length} artists individually...`);
    const results: SpotifyArtist[] = [];
    for (const id of validIds) {
      try {
        const artist = await this.getArtist(id);
        if (artist) {
          results.push(artist);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`[Spotify API] Failed to fetch artist ${id}: ${(error as Error).message}`);
      }
    }
    console.log(`[Spotify API] Successfully fetched ${results.length}/${validIds.length} artists`);
    return results;
  }
  async getArtistAlbums(
    artistId: string,
    options: { includeGroups?: string; limit?: number; offset?: number } = {}
  ): Promise<SpotifyArtistAlbumsResponse> {
    const includeGroups = options.includeGroups || "album,single";
    const limit = Math.min(options.limit || 20, 50);
    const offset = options.offset || 0;
    const params = new URLSearchParams({
      include_groups: includeGroups,
      limit: String(limit),
      offset: String(offset),
      market: "MX"
    });
    const url = `/artists/${artistId}/albums?${params.toString()}`;
    return this.request<SpotifyArtistAlbumsResponse>(url);
  }
  async getAllArtistAlbums(artistId: string): Promise<SpotifyAlbum[]> {
    const albums: SpotifyAlbum[] = [];
    const seenIds = new Set<string>();
    const includeGroups = "album,single";
    let offset = 0;
    const limit = 50;
    while (true) {
      const response = await this.getArtistAlbums(artistId, {
        includeGroups,
        limit,
        offset
      });
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
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return albums;
  }
  async getAlbum(albumId: string): Promise<SpotifyAlbum> {
    return this.request<SpotifyAlbum>(`/albums/${albumId}`);
  }
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
  async getTrack(trackId: string): Promise<SpotifyTrack> {
    return this.request<SpotifyTrack>(`/tracks/${trackId}?market=MX`);
  }
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
  static getEmbedUrl(type: "artist" | "album" | "track" | "playlist", id: string): string {
    return `https://open.spotify.com/embed/${type}/${id}`;
  }
}
export const spotifyClient = new SpotifyClient();
export { SpotifyClient };
