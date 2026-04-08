const DROPBOX_ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;
const DROPBOX_REFRESH_TOKEN = process.env.DROPBOX_REFRESH_TOKEN;
const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;

/**
 * Get MIME type from filename
 */
export function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    flac: "audio/flac",
    m4a: "audio/mp4",
    aac: "audio/aac",
    ogg: "audio/ogg",
    // Video
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    // Documents
    pdf: "application/pdf",
    zip: "application/zip",
    rar: "application/x-rar-compressed",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

export interface DropboxUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface DropboxClient {
  accessToken: string | null;
  refreshToken: string | null;
  getSpaceUsage: () => Promise<{ used: number; allocated: number } | undefined>;
  testConnection: () => Promise<{ success: boolean; error?: string }>;
  isConfiguredAsync: () => Promise<boolean>;
  isConfigured: () => boolean;
  getCurrentAccount: () => Promise<any>;
  uploadFile: (path: string, data: ArrayBuffer) => Promise<{ success: boolean; path?: string; error?: string }>;
  getSharedLink: (path: string) => Promise<string | null>;
  listFolder: (path: string) => Promise<any[]>;
  listFolderRecursive: (path: string) => Promise<any[]>;
  getMetadata: (path: string) => Promise<any | null>;
}

// Token cache for managing Dropbox authentication
let tokenCache: { accessToken: string | null; expiresAt: number | null } = {
  accessToken: DROPBOX_ACCESS_TOKEN || null,
  expiresAt: null,
};

export const dropboxClient: DropboxClient = {
  accessToken: DROPBOX_ACCESS_TOKEN || null,
  refreshToken: DROPBOX_REFRESH_TOKEN || null,

  async getSpaceUsage(): Promise<{ used: number; allocated: number } | undefined> {
    const token = await getDropboxToken();
    if (!token) return undefined;
    try {
      const response = await fetch("https://api.dropboxapi.com/2/users/get_space_usage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) return undefined;
      const data = await response.json();
      return {
        used: data.used || 0,
        allocated: data.allocation?.allocated || 0,
      };
    } catch {
      return undefined;
    }
  },

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const result = await testDropboxConnection();
    return { success: result.success, error: result.error };
  },

  async isConfiguredAsync(): Promise<boolean> {
    const token = await getDropboxToken();
    return Boolean(token);
  },

  async getCurrentAccount(): Promise<any> {
    const result = await testDropboxConnection();
    return result.account;
  },

  async uploadFile(path: string, data: ArrayBuffer): Promise<{ success: boolean; path?: string; error?: string }> {
    const token = await getDropboxToken();
    if (!token) {
      return { success: false, error: "Dropbox not configured" };
    }
    try {
      const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify({
            path,
            mode: "add",
            autorename: true,
            mute: false,
          }),
        },
        body: data,
      });
      if (!response.ok) {
        return { success: false, error: `Upload failed: ${response.status}` };
      }
      const result = await response.json();
      return { success: true, path: result.path_display };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  },

  async getSharedLink(path: string): Promise<string | null> {
    const token = await getDropboxToken();
    if (!token) return null;
    try {
      // Try to create a new shared link
      const response = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path,
          settings: { requested_visibility: "public" },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        return data.url?.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "") || null;
      }
      // If link exists, get it
      const existingResponse = await fetch("https://api.dropboxapi.com/2/sharing/list_shared_links", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path, direct_only: true }),
      });
      if (existingResponse.ok) {
        const existingData = await existingResponse.json();
        if (existingData.links?.length > 0) {
          return existingData.links[0].url
            ?.replace("www.dropbox.com", "dl.dropboxusercontent.com")
            .replace("?dl=0", "") || null;
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  async listFolder(path: string): Promise<any[]> {
    const token = await getDropboxToken();
    if (!token) return [];
    try {
      const response = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: path || "" }),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.entries || [];
    } catch {
      return [];
    }
  },

  isConfigured(): boolean {
    return Boolean(DROPBOX_ACCESS_TOKEN || tokenCache.accessToken);
  },

  async listFolderRecursive(path: string): Promise<any[]> {
    const token = await getDropboxToken();
    if (!token) return [];
    try {
      const response = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: path || "", recursive: true }),
      });
      if (!response.ok) return [];
      const data = await response.json();
      let entries = data.entries || [];
      // Handle pagination
      let cursor = data.cursor;
      while (data.has_more) {
        const continueResponse = await fetch("https://api.dropboxapi.com/2/files/list_folder/continue", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cursor }),
        });
        if (!continueResponse.ok) break;
        const continueData = await continueResponse.json();
        entries = entries.concat(continueData.entries || []);
        cursor = continueData.cursor;
        if (!continueData.has_more) break;
      }
      return entries;
    } catch {
      return [];
    }
  },

  async getMetadata(path: string): Promise<any | null> {
    const token = await getDropboxToken();
    if (!token) return null;
    try {
      const response = await fetch("https://api.dropboxapi.com/2/files/get_metadata", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path }),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  },
};

export function isDropboxConfigured(): boolean {
  return !!DROPBOX_ACCESS_TOKEN;
}

/**
 * Test the Dropbox connection
 */
export async function testDropboxConnection(customToken?: string): Promise<{
  success: boolean;
  error?: string;
  account?: any;
  accountName?: string;
  email?: string;
}> {
  const token = customToken || tokenCache.accessToken || DROPBOX_ACCESS_TOKEN;
  if (!token) {
    return { success: false, error: "Dropbox not configured" };
  }
  try {
    const response = await fetch("https://api.dropboxapi.com/2/users/get_current_account", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      return { success: false, error: `Connection failed: ${response.status}` };
    }
    const account = await response.json();
    return {
      success: true,
      account,
      accountName: account.name?.display_name || account.name?.given_name || "Unknown",
      email: account.email || undefined,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Save Dropbox token to cache
 */
export async function saveDropboxToken(accessToken: string, expiresIn?: number): Promise<boolean> {
  try {
    tokenCache.accessToken = accessToken;
    tokenCache.expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : null;
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear Dropbox token cache
 */
export function clearDropboxTokenCache(): void {
  tokenCache.accessToken = DROPBOX_ACCESS_TOKEN || null;
  tokenCache.expiresAt = null;
}

/**
 * Refresh Dropbox access token
 */
export async function refreshDropboxToken(): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  const refreshToken = DROPBOX_REFRESH_TOKEN;
  const appKey = DROPBOX_APP_KEY;
  const appSecret = DROPBOX_APP_SECRET;
  if (!refreshToken || !appKey || !appSecret) {
    return { success: false, error: "Missing refresh token or app credentials" };
  }
  try {
    const response = await fetch("https://api.dropbox.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: appKey,
        client_secret: appSecret,
      }),
    });
    if (!response.ok) {
      return { success: false, error: `Token refresh failed: ${response.status}` };
    }
    const data = await response.json();
    await saveDropboxToken(data.access_token, data.expires_in);
    return { success: true, accessToken: data.access_token };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Get current Dropbox access token (refreshing if needed)
 */
export async function getDropboxToken(): Promise<string | null> {
  // If token is cached and not expired, use it
  if (tokenCache.accessToken && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }
  // Try to refresh the token
  if (DROPBOX_REFRESH_TOKEN) {
    const result = await refreshDropboxToken();
    if (result.success && result.accessToken) {
      return result.accessToken;
    }
  }
  // Fall back to static token
  return DROPBOX_ACCESS_TOKEN || null;
}

/**
 * Check if OAuth is configured for Dropbox
 */
export function isOAuthConfigured(): boolean {
  return Boolean(DROPBOX_APP_KEY && DROPBOX_APP_SECRET);
}

/**
 * Get OAuth status
 */
export function getOAuthStatus(): {
  configured: boolean;
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  hasAppCredentials: boolean;
  isFullyConfigured: boolean;
} {
  const isConfigured = Boolean(DROPBOX_ACCESS_TOKEN || (DROPBOX_REFRESH_TOKEN && DROPBOX_APP_KEY && DROPBOX_APP_SECRET));
  return {
    configured: isConfigured,
    hasAccessToken: Boolean(DROPBOX_ACCESS_TOKEN),
    hasRefreshToken: Boolean(DROPBOX_REFRESH_TOKEN),
    hasAppCredentials: Boolean(DROPBOX_APP_KEY && DROPBOX_APP_SECRET),
    isFullyConfigured: isConfigured,
  };
}

export async function uploadToDropbox(
  fileData: ArrayBuffer,
  fileName: string,
  folder: string = "/sonido-liquido"
): Promise<DropboxUploadResult> {
  if (!DROPBOX_ACCESS_TOKEN) {
    return { success: false, error: "Dropbox not configured" };
  }
  const path = `${folder}/${Date.now()}-${fileName}`;
  try {
    // Upload file to Dropbox
    const uploadResponse = await fetch(
      "https://content.dropboxapi.com/2/files/upload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify({
            path,
            mode: "add",
            autorename: true,
            mute: false,
          }),
        },
        body: fileData,
      }
    );
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Dropbox upload error:", errorText);
      return { success: false, error: `Upload failed: ${uploadResponse.status}` };
    }
    const uploadData = await uploadResponse.json();
    // Create shared link
    const shareResponse = await fetch(
      "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          path: uploadData.path_display,
          settings: {
            requested_visibility: "public",
          },
        }),
      }
    );
    let shareUrl: string;
    if (shareResponse.ok) {
      const shareData = await shareResponse.json();
      // Convert share link to direct download link
      shareUrl = shareData.url.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "");
    } else {
      // If link already exists, get existing link
      const existingLinkResponse = await fetch(
        "https://api.dropboxapi.com/2/sharing/list_shared_links",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${DROPBOX_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: uploadData.path_display,
            direct_only: true,
          }),
        }
      );
      if (existingLinkResponse.ok) {
        const existingData = await existingLinkResponse.json();
        if (existingData.links && existingData.links.length > 0) {
          shareUrl = existingData.links[0].url
            .replace("www.dropbox.com", "dl.dropboxusercontent.com")
            .replace("?dl=0", "");
        } else {
          return { success: false, error: "Could not create share link" };
        }
      } else {
        return { success: false, error: "Could not create share link" };
      }
    }
    return { success: true, url: shareUrl };
  } catch (error) {
    console.error("Dropbox upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
