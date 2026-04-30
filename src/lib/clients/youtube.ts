import type { YouTubeVideo, YouTubeChannel } from "@/types";
import { parseISODuration } from "@/lib/utils";

// ===========================================
// YOUTUBE DATA API CLIENT
// ===========================================

interface YouTubeSearchResponse {
  items?: {
    id: { videoId?: string; channelId?: string };
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      thumbnails: {
        default?: { url: string };
        medium?: { url: string };
        high?: { url: string };
      };
      channelId: string;
      channelTitle: string;
    };
  }[];
  pageInfo?: { totalResults: number; resultsPerPage: number };
  nextPageToken?: string;
  error?: { message: string; code: number };
}

interface YouTubeVideoListResponse {
  items?: YouTubeVideo[];
  pageInfo?: { totalResults: number; resultsPerPage: number };
  error?: { message: string; code: number };
}

interface YouTubeChannelListResponse {
  items?: YouTubeChannel[];
  pageInfo?: { totalResults: number; resultsPerPage: number };
  error?: { message: string; code: number };
}

class YouTubeClient {
  private apiKey: string;
  private baseUrl = "https://www.googleapis.com/youtube/v3";

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || "";
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Make API request
   */
  private async request<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error("YouTube API key not configured");
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set("key", this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `YouTube API error: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();

    // Check for API error in response body
    if (data.error) {
      throw new Error(`YouTube API error: ${data.error.code} - ${data.error.message}`);
    }

    return data;
  }

  /**
   * Get video details by ID
   */
  async getVideo(videoId: string): Promise<YouTubeVideo | null> {
    const response = await this.request<YouTubeVideoListResponse>("/videos", {
      part: "snippet,contentDetails,statistics",
      id: videoId,
    });

    return response.items?.[0] || null;
  }

  /**
   * Get multiple videos by IDs
   */
  async getVideos(videoIds: string[]): Promise<YouTubeVideo[]> {
    if (videoIds.length === 0) return [];

    // YouTube allows max 50 IDs per request
    const chunks: string[][] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      chunks.push(videoIds.slice(i, i + 50));
    }

    const results: YouTubeVideo[] = [];
    for (const chunk of chunks) {
      const response = await this.request<YouTubeVideoListResponse>("/videos", {
        part: "snippet,contentDetails,statistics",
        id: chunk.join(","),
      });
      if (response.items) {
        results.push(...response.items);
      }
    }

    return results;
  }

  /**
   * Get channel details by ID
   */
  async getChannel(channelId: string): Promise<YouTubeChannel | null> {
    const response = await this.request<YouTubeChannelListResponse>("/channels", {
      part: "snippet,statistics",
      id: channelId,
    });

    return response.items?.[0] || null;
  }

  /**
   * Get channel by username/handle
   */
  async getChannelByHandle(handle: string): Promise<YouTubeChannel | null> {
    if (!handle) {
      return null;
    }

    // Remove @ if present
    const cleanHandle = handle.replace(/^@/, "");

    const response = await this.request<YouTubeChannelListResponse>("/channels", {
      part: "snippet,statistics",
      forHandle: cleanHandle,
    });

    return response.items?.[0] || null;
  }

  /**
   * Search for videos
   */
  async searchVideos(
    query: string,
    options: { maxResults?: number; channelId?: string; pageToken?: string } = {}
  ): Promise<{
    videos: YouTubeSearchResponse["items"];
    nextPageToken?: string;
    totalResults: number;
  }> {
    const params: Record<string, string> = {
      part: "snippet",
      q: query,
      type: "video",
      maxResults: String(options.maxResults || 25),
      order: "date",
    };

    if (options.channelId) {
      params.channelId = options.channelId;
    }

    if (options.pageToken) {
      params.pageToken = options.pageToken;
    }

    const response = await this.request<YouTubeSearchResponse>("/search", params);

    return {
      videos: response.items || [],
      nextPageToken: response.nextPageToken,
      totalResults: response.pageInfo?.totalResults || 0,
    };
  }

  /**
   * Get videos from a channel
   */
  async getChannelVideos(
    channelId: string,
    maxResults = 50
  ): Promise<YouTubeVideo[]> {
    // First, search for videos from the channel
    const searchResponse = await this.searchVideos("", {
      channelId,
      maxResults: Math.min(maxResults, 50),
    });

    const videos = searchResponse.videos || [];
    if (videos.length === 0) {
      return [];
    }

    // Get full video details
    const videoIds = videos
      .map((v) => v?.id?.videoId)
      .filter((id): id is string => Boolean(id));

    if (videoIds.length === 0) {
      return [];
    }

    return this.getVideos(videoIds);
  }

  /**
   * Parse video duration to seconds
   */
  static parseDuration(isoDuration: string): number {
    if (!isoDuration) return 0;
    return parseISODuration(isoDuration);
  }

  /**
   * Extract video ID from URL
   */
  static extractVideoId(url: string): string | null {
    if (!url || typeof url !== "string") {
      return null;
    }

    const patterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
      /youtu\.be\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Extract channel info from URL
   */
  static extractChannelInfo(url: string): { type: "id" | "handle"; value: string } | null {
    if (!url || typeof url !== "string") {
      return null;
    }

    const idMatch = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) return { type: "id", value: idMatch[1] };

    const handleMatch = url.match(/youtube\.com\/@([a-zA-Z0-9_-]+)/);
    if (handleMatch && handleMatch[1]) return { type: "handle", value: handleMatch[1] };

    return null;
  }

  /**
   * Get embed URL for video
   */
  static getEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  /**
   * Get thumbnail URL for video
   */
  static getThumbnailUrl(videoId: string, quality: "default" | "medium" | "high" | "maxres" = "high"): string {
    const qualityMap = {
      default: "default",
      medium: "mqdefault",
      high: "hqdefault",
      maxres: "maxresdefault",
    };
    return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
  }
}

// Export singleton instance
export const youtubeClient = new YouTubeClient();

// Export class for testing
export { YouTubeClient };
