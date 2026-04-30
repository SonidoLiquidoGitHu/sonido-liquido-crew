/**
 * ===========================================
 * DROPBOX API CLIENT WITH OAUTH SUPPORT
 * ===========================================
 *
 * Token priority (CHANGED - database first!):
 * 1. Database tokens (saved via admin panel)
 * 2. Environment variable DROPBOX_ACCESS_TOKEN (fallback only when no DB token)
 *
 * For OAuth to work, you need:
 * - DROPBOX_APP_KEY and DROPBOX_APP_SECRET in environment
 * - DATABASE_URL and DATABASE_AUTH_TOKEN for token storage
 *
 * For manual token (fallback when no database):
 * - Set DROPBOX_ACCESS_TOKEN directly in environment
 */

interface DropboxFile {
  id: string;
  name: string;
  path_lower: string;
  path_display: string;
  size: number;
  is_downloadable: boolean;
  client_modified: string;
  server_modified: string;
}

interface DropboxFolder {
  id: string;
  name: string;
  path_lower: string;
  path_display: string;
}

interface DropboxListFolderResponse {
  entries: (DropboxFile | DropboxFolder)[];
  cursor: string;
  has_more: boolean;
}

interface DropboxSharedLink {
  url: string;
  name: string;
  path_lower: string;
}

interface DropboxTokens {
  accessToken: string | null;
  refreshToken: string | null;
  expiryTime: number | null;
}

// Cache for the database tokens
let _cachedTokens: DropboxTokens = {
  accessToken: null,
  refreshToken: null,
  expiryTime: null,
};
let _tokenCacheExpiry = 0;
const TOKEN_CACHE_DURATION = 30 * 1000; // 30 seconds (reduced from 1 minute for faster updates)

// App credentials from environment - trim to remove any accidental whitespace
const DROPBOX_APP_KEY = (process.env.DROPBOX_APP_KEY || "").trim();
const DROPBOX_APP_SECRET = (process.env.DROPBOX_APP_SECRET || "").trim();
// Direct access token fallback (when database is not available)
const DROPBOX_ACCESS_TOKEN_ENV = (process.env.DROPBOX_ACCESS_TOKEN || "").trim();

/**
 * Check if we have a direct environment token (no database needed)
 */
function hasEnvToken(): boolean {
  return Boolean(DROPBOX_ACCESS_TOKEN_ENV);
}

/**
 * Get Dropbox tokens from database settings
 * NOTE: This does NOT use the environment token - that's a separate fallback
 */
async function getTokensFromDatabase(): Promise<DropboxTokens> {
  // Return cached tokens if still valid
  if (_cachedTokens.accessToken && Date.now() < _tokenCacheExpiry) {
    console.log("[Dropbox] Using cached tokens (expires in", Math.round((_tokenCacheExpiry - Date.now()) / 1000), "s)");
    return _cachedTokens;
  }

  try {
    const { db, isDatabaseConfigured } = await import("@/db/client");
    const { siteSettings } = await import("@/db/schema");
    const { inArray } = await import("drizzle-orm");

    if (!isDatabaseConfigured()) {
      console.warn("[Dropbox] Database not configured");
      return { accessToken: null, refreshToken: null, expiryTime: null };
    }

    console.log("[Dropbox] Fetching tokens from database...");

    const results = await db
      .select()
      .from(siteSettings)
      .where(
        inArray(siteSettings.key, [
          "dropbox_access_token",
          "dropbox_refresh_token",
          "dropbox_token_expiry"
        ])
      );

    const tokens: DropboxTokens = {
      accessToken: null,
      refreshToken: null,
      expiryTime: null,
    };

    for (const row of results) {
      if (row.key === "dropbox_access_token") {
        tokens.accessToken = row.value;
      } else if (row.key === "dropbox_refresh_token") {
        tokens.refreshToken = row.value;
      } else if (row.key === "dropbox_token_expiry") {
        tokens.expiryTime = row.value ? parseInt(row.value, 10) : null;
      }
    }

    // Update cache
    _cachedTokens = tokens;
    _tokenCacheExpiry = Date.now() + TOKEN_CACHE_DURATION;

    console.log("[Dropbox] Tokens loaded from database:", {
      hasAccessToken: !!tokens.accessToken,
      tokenPreview: tokens.accessToken ? `${tokens.accessToken.slice(0, 10)}...` : null,
      hasRefreshToken: !!tokens.refreshToken,
      expiryTime: tokens.expiryTime,
    });

    return tokens;
  } catch (error) {
    console.error("[Dropbox] Failed to load tokens from database:", error);
    return { accessToken: null, refreshToken: null, expiryTime: null };
  }
}

/**
 * Refresh the access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
    console.error("[Dropbox] Cannot refresh token: missing app credentials");
    return null;
  }

  console.log("[Dropbox] Refreshing access token...");

  try {
    const response = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: DROPBOX_APP_KEY,
        client_secret: DROPBOX_APP_SECRET,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[Dropbox] Token refresh failed:", response.status, errorBody);
      return null;
    }

    const data = await response.json();
    const newAccessToken = data.access_token;
    const expiresIn = data.expires_in || 14400; // Default 4 hours

    // Save new token to database
    const { db, isDatabaseConfigured } = await import("@/db/client");
    const { siteSettings } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    if (isDatabaseConfigured()) {
      const expiryTime = Date.now() + (expiresIn * 1000);

      // Update access token
      await db
        .update(siteSettings)
        .set({ value: newAccessToken, updatedAt: new Date() })
        .where(eq(siteSettings.key, "dropbox_access_token"));

      // Update expiry time
      await db
        .update(siteSettings)
        .set({ value: expiryTime.toString(), updatedAt: new Date() })
        .where(eq(siteSettings.key, "dropbox_token_expiry"));

      // Update cache
      _cachedTokens.accessToken = newAccessToken;
      _cachedTokens.expiryTime = expiryTime;

      console.log("[Dropbox] Token refreshed successfully, expires in:", expiresIn, "seconds");
    }

    return newAccessToken;
  } catch (error) {
    console.error("[Dropbox] Token refresh error:", error);
    return null;
  }
}

/**
 * Clear the token cache (call after updating tokens)
 */
export function clearDropboxTokenCache(): void {
  _cachedTokens = { accessToken: null, refreshToken: null, expiryTime: null };
  _tokenCacheExpiry = 0;
  console.log("[Dropbox] Token cache cleared");
}

/**
 * Force refresh tokens from database (bypasses cache)
 */
export async function refreshDropboxToken(): Promise<string | null> {
  clearDropboxTokenCache();
  const tokens = await getTokensFromDatabase();
  return tokens.accessToken;
}

/**
 * Save Dropbox token to database (for manual token entry)
 */
export async function saveDropboxToken(token: string): Promise<boolean> {
  console.log("[Dropbox] saveDropboxToken called, token length:", token.length);
  console.log("[Dropbox] Token preview:", token.slice(0, 15) + "...");

  try {
    const { db, isDatabaseConfigured } = await import("@/db/client");
    const { siteSettings } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const { generateUUID } = await import("@/lib/utils");

    console.log("[Dropbox] Imports successful, checking database...");

    if (!isDatabaseConfigured()) {
      console.error("[Dropbox] Cannot save token - database not configured");
      return false;
    }

    console.log("[Dropbox] Database is configured, querying existing token...");

    // Check if setting exists
    let existingId: string | null = null;
    try {
      const existing = await db
        .select({ id: siteSettings.id })
        .from(siteSettings)
        .where(eq(siteSettings.key, "dropbox_access_token"))
        .limit(1);

      if (existing && existing.length > 0) {
        existingId = existing[0].id;
      }
      console.log("[Dropbox] Existing token check:", existingId ? "found" : "not found");
    } catch (selectError) {
      console.log("[Dropbox] Select error (table may not exist):", (selectError as Error).message);
      existingId = null;
    }

    if (existingId) {
      console.log("[Dropbox] Updating existing token...");
      await db
        .update(siteSettings)
        .set({ value: token, updatedAt: new Date() })
        .where(eq(siteSettings.key, "dropbox_access_token"));
      console.log("[Dropbox] Token updated successfully");
    } else {
      console.log("[Dropbox] Inserting new token...");
      const newId = generateUUID();
      await db.insert(siteSettings).values({
        id: newId,
        key: "dropbox_access_token",
        value: token,
        type: "string",
        description: "Dropbox API access token",
      });
      console.log("[Dropbox] Token inserted with id:", newId);
    }

    // IMPORTANT: Clear cache so next request fetches from database
    clearDropboxTokenCache();

    // Also update the cache with the new token immediately
    _cachedTokens.accessToken = token;
    _cachedTokens.refreshToken = null; // Manual tokens don't have refresh tokens
    _cachedTokens.expiryTime = null; // Manual tokens don't have expiry tracked this way
    _tokenCacheExpiry = Date.now() + TOKEN_CACHE_DURATION;

    console.log("[Dropbox] Token saved to database successfully");
    console.log("[Dropbox] Cache updated with new token");
    return true;
  } catch (error) {
    console.error("[Dropbox] Failed to save token:", error);
    console.error("[Dropbox] Error details:", (error as Error).message);
    console.error("[Dropbox] Error stack:", (error as Error).stack);
    return false;
  }
}

/**
 * Test Dropbox connection with a token
 */
export async function testDropboxConnection(token: string): Promise<{
  success: boolean;
  accountName?: string;
  email?: string;
  error?: string;
}> {
  try {
    // Clean the token
    const cleanToken = token.trim();

    if (!cleanToken) {
      return { success: false, error: "Token is empty" };
    }

    console.log("[Dropbox] Testing connection with token (length:", cleanToken.length, ", preview:", cleanToken.slice(0, 15) + "...)");

    const response = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        "Content-Type": "application/json",
      },
      body: "null",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error_summary: response.statusText }));
      console.error("[Dropbox] Connection test failed:", response.status, errorData);

      // Provide helpful error message
      let errorMessage = errorData.error_summary || `HTTP ${response.status}`;
      if (errorMessage.includes("invalid_access_token") || response.status === 401) {
        errorMessage = "Token inválido o expirado. Genera un nuevo token en Dropbox App Console.";
      }

      return { success: false, error: errorMessage };
    }

    const data = await response.json();
    console.log("[Dropbox] Connection test SUCCESS - Account:", data.name?.display_name || data.email);
    return {
      success: true,
      accountName: data.name?.display_name || data.name?.familiar_name,
      email: data.email,
    };
  } catch (error) {
    console.error("[Dropbox] Connection test error:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Check if OAuth is properly configured
 */
export function isOAuthConfigured(): boolean {
  return Boolean(DROPBOX_APP_KEY && DROPBOX_APP_SECRET);
}

/**
 * Get OAuth configuration status
 */
export function getOAuthStatus(): { configured: boolean; appKey?: string } {
  return {
    configured: isOAuthConfigured(),
    appKey: DROPBOX_APP_KEY ? DROPBOX_APP_KEY.substring(0, 4) + "..." : undefined,
  };
}

class DropboxClient {
  private baseUrl = "https://api.dropboxapi.com/2";
  private contentUrl = "https://content.dropboxapi.com/2";

  /**
   * Access token retrieval is handled by the public getAccessToken method below
   */

  /**
   * Check if Dropbox is configured (has tokens)
   */
  isConfigured(): boolean {
    return Boolean(_cachedTokens.accessToken || DROPBOX_ACCESS_TOKEN_ENV);
  }

  /**
   * Check if configured (async version that checks database)
   */
  async isConfiguredAsync(): Promise<boolean> {
    // First try database (priority)
    try {
      const tokens = await getTokensFromDatabase();
      if (tokens.accessToken) {
        console.log("[Dropbox] isConfiguredAsync: Found DATABASE token");
        return true;
      }
    } catch (error) {
      console.error("[Dropbox] Error checking database tokens:", error);
    }

    // Fallback to environment variable
    if (hasEnvToken()) {
      console.log("[Dropbox] isConfiguredAsync: Using ENV token as fallback");
      return true;
    }

    return false;
  }

  /**
   * Get access token for browser-side uploads
   * This exposes the token for direct browser uploads
   */
  async getAccessToken(): Promise<string> {
    // FIRST: Try database token (highest priority)
    const tokens = await getTokensFromDatabase();

    if (tokens.accessToken) {
      // Check if token is expired or about to expire (5 min buffer)
      const isExpired = tokens.expiryTime && Date.now() > (tokens.expiryTime - 5 * 60 * 1000);

      if (!isExpired) {
        return tokens.accessToken;
      }

      // Token expired, try to refresh if we have a refresh token
      if (tokens.refreshToken) {
        const newToken = await refreshAccessToken(tokens.refreshToken);
        if (newToken) {
          return newToken;
        }
      }

      // Even if expiry check failed, try using it anyway
      return tokens.accessToken;
    }

    // SECOND: Fallback to environment variable
    if (hasEnvToken()) {
      return DROPBOX_ACCESS_TOKEN_ENV;
    }

    throw new Error("No Dropbox access token available");
  }

  /**
   * Make authenticated API request with automatic retry
   */
  private async request<T>(
    endpoint: string,
    body?: Record<string, unknown>,
    useContentUrl = false
  ): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${useContentUrl ? this.contentUrl : this.baseUrl}${endpoint}`;

    // Dropbox API requires a body even for endpoints that don't need data
    // Send null for empty requests, or the actual body
    const bodyString = body && Object.keys(body).length > 0
      ? JSON.stringify(body)
      : "null";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: bodyString,
    });

    if (response.status === 401) {
      // Token expired - try to refresh
      const tokens = await getTokensFromDatabase();
      if (tokens.refreshToken) {
        const newToken = await refreshAccessToken(tokens.refreshToken);
        if (newToken) {
          // Retry with new token
          const retryResponse = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${newToken}`,
              "Content-Type": "application/json",
            },
            body: bodyString,
          });

          if (retryResponse.ok) {
            return retryResponse.json();
          }
        }
      }
      throw new Error("Sesión de Dropbox expirada. Por favor reconecta tu cuenta.");
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Dropbox API error: ${response.status} - ${error.error_summary || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * List files and folders in a path
   */
  async listFolder(path: string): Promise<(DropboxFile | DropboxFolder)[]> {
    const entries: (DropboxFile | DropboxFolder)[] = [];

    let response = await this.request<DropboxListFolderResponse>("/files/list_folder", {
      path: path === "/" ? "" : path,
      recursive: false,
      include_deleted: false,
      include_has_explicit_shared_members: false,
      include_mounted_folders: true,
    });

    entries.push(...response.entries);

    while (response.has_more) {
      response = await this.request<DropboxListFolderResponse>("/files/list_folder/continue", {
        cursor: response.cursor,
      });
      entries.push(...response.entries);
    }

    return entries;
  }

  /**
   * List all files recursively in a path
   */
  async listFolderRecursive(path: string): Promise<DropboxFile[]> {
    const files: DropboxFile[] = [];

    let response = await this.request<DropboxListFolderResponse>("/files/list_folder", {
      path: path === "/" ? "" : path,
      recursive: true,
      include_deleted: false,
    });

    for (const entry of response.entries) {
      if (".tag" in entry && (entry as { ".tag": string })[".tag"] === "file") {
        files.push(entry as DropboxFile);
      }
    }

    while (response.has_more) {
      response = await this.request<DropboxListFolderResponse>("/files/list_folder/continue", {
        cursor: response.cursor,
      });
      for (const entry of response.entries) {
        if (".tag" in entry && (entry as { ".tag": string })[".tag"] === "file") {
          files.push(entry as DropboxFile);
        }
      }
    }

    return files;
  }

  /**
   * Get file metadata
   */
  async getMetadata(path: string): Promise<DropboxFile> {
    return this.request<DropboxFile>("/files/get_metadata", {
      path,
      include_media_info: true,
    });
  }

  /**
   * Create or get existing shared link for a file
   */
  async getSharedLink(path: string): Promise<string> {
    try {
      console.log("[Dropbox] Creating shared link for:", path);
      const response = await this.request<DropboxSharedLink>("/sharing/create_shared_link_with_settings", {
        path,
        settings: {
          access: "viewer",
          audience: "public",
          requested_visibility: "public",
        },
      });
      console.log("[Dropbox] Shared link created:", response.url);
      return this.convertToDirectLink(response.url);
    } catch (error) {
      const errorMessage = (error as Error).message || "";
      console.log("[Dropbox] Error creating shared link:", errorMessage);

      // Check if link already exists - handle multiple error formats
      if (errorMessage.includes("shared_link_already_exists") ||
          errorMessage.includes("already exists") ||
          errorMessage.includes("409")) {
        try {
          console.log("[Dropbox] Link exists, fetching existing link...");
          const links = await this.request<{ links: DropboxSharedLink[] }>("/sharing/list_shared_links", {
            path,
            direct_only: true,
          });
          if (links.links && links.links.length > 0) {
            console.log("[Dropbox] Found existing link:", links.links[0].url);
            return this.convertToDirectLink(links.links[0].url);
          }
        } catch (listError) {
          console.error("[Dropbox] Error fetching existing links:", listError);
        }
      }

      // Re-throw the original error
      throw error;
    }
  }

  private convertToDirectLink(url: string): string {
    return url
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace("?dl=0", "")
      .replace("&dl=0", "");
  }

  /**
   * Download file content
   */
  async downloadFile(path: string): Promise<ArrayBuffer> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.contentUrl}/files/download`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Dropbox-API-Arg": JSON.stringify({ path }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    return response.arrayBuffer();
  }

  /**
   * Upload file
   */
  async uploadFile(path: string, content: ArrayBuffer | Blob): Promise<DropboxFile> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.contentUrl}/files/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path,
          mode: "overwrite",
          autorename: false,
          mute: false,
        }),
      },
      body: content,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Token de Dropbox expirado. Reconecta tu cuenta en Sincronización → Dropbox.");
      }
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Delete file or folder
   */
  async delete(path: string): Promise<void> {
    await this.request("/files/delete_v2", { path });
  }

  /**
   * Create folder
   */
  async createFolder(path: string): Promise<DropboxFolder> {
    return this.request<DropboxFolder>("/files/create_folder_v2", {
      path,
      autorename: false,
    });
  }

  /**
   * Get storage usage
   */
  async getSpaceUsage(): Promise<{ used: number; allocated: number }> {
    const token = await this.getAccessToken();

    // This endpoint requires POST with null body
    const response = await fetch(`${this.baseUrl}/users/get_space_usage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "null",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Dropbox API error: ${response.status} - ${errorData.error_summary || response.statusText}`
      );
    }

    const data = await response.json();
    return {
      used: data.used || 0,
      allocated: data.allocation?.allocated || 0,
    };
  }

  /**
   * Get current account info
   */
  async getCurrentAccount(): Promise<{ name: string; email: string }> {
    const token = await this.getAccessToken();

    // This endpoint requires POST with null body, not empty object
    const response = await fetch(`${this.baseUrl}/users/get_current_account`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "null",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Dropbox API error: ${response.status} - ${errorData.error_summary || response.statusText}`
      );
    }

    const data = await response.json();
    return {
      name: data.name?.display_name || data.name?.familiar_name || "Unknown",
      email: data.email || "",
    };
  }

  /**
   * Get MIME type from filename
   */
  static getMimeType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      mp3: "audio/mpeg",
      wav: "audio/wav",
      flac: "audio/flac",
      m4a: "audio/mp4",
      ogg: "audio/ogg",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      pdf: "application/pdf",
      zip: "application/zip",
      rar: "application/x-rar-compressed",
    };
    return mimeTypes[ext || ""] || "application/octet-stream";
  }
}

// Export singleton instance
export const dropboxClient = new DropboxClient();

// Export class for testing
export { DropboxClient };
