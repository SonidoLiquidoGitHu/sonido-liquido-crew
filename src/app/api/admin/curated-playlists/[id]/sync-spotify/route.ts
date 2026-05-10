import { type NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedPlaylists, playlistTracks, curatedTracks, siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SpotifyClient } from "@/lib/clients/spotify";
import { generateUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Get a valid Spotify user access token from site_settings.
 * If the stored token is expired, refreshes it using the stored refresh token.
 * Returns null if no user token is available.
 *
 * IMPORTANT: This is the SINGLE source of truth for token management in the sync flow.
 * It mirrors the logic in /api/admin/spotify/token to avoid inconsistencies.
 */
async function getSpotifyUserAccessToken(forceRefresh = false): Promise<string | null> {
  try {
    const [refreshTokenRow] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "spotify_refresh_token"))
      .limit(1);

    if (!refreshTokenRow?.value) {
      console.log("[Spotify Sync] No refresh token found in DB");
      return null;
    }

    if (!forceRefresh) {
      const [accessTokenRow] = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, "spotify_access_token"))
        .limit(1);

      const [expiryRow] = await db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.key, "spotify_access_token_expiry"))
        .limit(1);

      const accessToken = accessTokenRow?.value;
      const expiry = parseInt(expiryRow?.value || "0", 10);

      // Check if current access token is still valid (with 60s buffer)
      if (accessToken && Date.now() < expiry) {
        console.log("[Spotify Sync] Using cached access token (expires in", Math.floor((expiry - Date.now()) / 1000), "seconds)");
        return accessToken;
      }

      console.log("[Spotify Sync] Access token expired or missing. accessToken exists:", !!accessToken, "expiry:", expiry, "now:", Date.now());
    }

    // Access token expired or force refresh requested — refresh it
    console.log(`[Spotify Sync] ${forceRefresh ? 'Force refreshing' : 'User access token expired, refreshing'}...`);

    const clientId = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6";
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const refreshResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshTokenRow.value,
      }).toString(),
      signal: AbortSignal.timeout(15_000),
    });

    if (!refreshResponse.ok) {
      const errorBody = await refreshResponse.text().catch(() => "");
      console.error("[Spotify Sync] Token refresh failed:", refreshResponse.status, errorBody);
      // Only clear tokens on definitive auth failures (400 = invalid refresh token, 401 = bad client)
      // Don't clear on 403 or 5xx — these could be temporary
      if (refreshResponse.status === 400 || refreshResponse.status === 401) {
        console.log("[Spotify Sync] Definitive auth failure, clearing tokens");
        await clearSpotifyTokens();
      }
      return null;
    }

    const tokenData = await refreshResponse.json();
    const newAccessToken = tokenData.access_token;
    const newExpiresIn = tokenData.expires_in;
    const newRefreshToken = tokenData.refresh_token;
    const newExpiry = String(Date.now() + (newExpiresIn - 60) * 1000);

    // Update stored tokens
    await upsertSetting("spotify_access_token", newAccessToken, "string");
    await upsertSetting("spotify_access_token_expiry", newExpiry, "number");
    if (newRefreshToken) {
      await upsertSetting("spotify_refresh_token", newRefreshToken, "string");
    }

    console.log("[Spotify Sync] User access token refreshed successfully, expires in", newExpiresIn, "seconds");
    return newAccessToken;
  } catch (error) {
    console.error("[Spotify Sync] Failed to get user access token:", error);
    return null;
  }
}

/**
 * Get a Spotify client-credentials access token (no user context, public data only).
 * Used as a fallback when user auth fails for public playlists.
 */
async function getClientCredentialsToken(): Promise<string | null> {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6";
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
      }).toString(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error("[Spotify Sync] Client credentials token failed:", response.status, errorBody);
      return null;
    }

    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.error("[Spotify Sync] Client credentials token error:", error);
    return null;
  }
}

/**
 * Make an authenticated request to the Spotify API.
 * Strategy:
 * 1. Use the provided user access token (from frontend or DB)
 * 2. On 401, attempt one forced token refresh and retry
 * 3. Fall back to client credentials for public data
 *
 * Uses request-scoped state (ctx) to prevent state leakage between serverless invocations.
 */
async function spotifyRequestWithAuth<T>(
  endpoint: string,
  userAccessToken: string | null,
  ctx: { forcedRefreshAttempted: boolean }
): Promise<T> {
  const url = `https://api.spotify.com/v1${endpoint}`;

  // Attempt 1: Use user access token if available
  if (userAccessToken) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
      return response.json();
    }

    const errorBody = await response.text().catch(() => "");
    console.error(`[Spotify API] User token request failed ${response.status}: ${errorBody.slice(0, 200)}`);

    // On 401, try forced token refresh once (403 is usually a scope issue, not a token issue)
    if (response.status === 401 && !ctx.forcedRefreshAttempted) {
      console.log("[Spotify Sync] Got 401, attempting forced token refresh...");
      ctx.forcedRefreshAttempted = true;

      const refreshedToken = await getSpotifyUserAccessToken(true);
      if (refreshedToken) {
        console.log("[Spotify Sync] Retrying with refreshed token...");
        const retryResponse = await fetch(url, {
          headers: {
            Authorization: `Bearer ${refreshedToken}`,
          },
          signal: AbortSignal.timeout(10_000),
        });

        if (retryResponse.ok) {
          return retryResponse.json();
        }

        const retryErrorBody = await retryResponse.text().catch(() => "");
        console.error(`[Spotify API] Retry with refreshed token failed ${retryResponse.status}: ${retryErrorBody.slice(0, 200)}`);
      }
    }

    // For 403 with user token, this is likely a scope issue — don't fall back to client credentials
    // because client credentials will also fail for private playlists.
    // Instead, throw a clear error.
    if (response.status === 403) {
      throw new Error(
        `Spotify API returned 403 (Forbidden). This usually means your Spotify connection doesn't have the required permissions, or the playlist is private. Try reconnecting your Spotify account.`
      );
    }
  }

  // Fallback: Try client credentials (works for public playlists only)
  console.log("[Spotify Sync] User auth not available, trying client credentials fallback...");
  const ccToken = await getClientCredentialsToken();
  if (ccToken) {
    const ccResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${ccToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (ccResponse.ok) {
      console.log("[Spotify Sync] Client credentials fallback succeeded");
      return ccResponse.json();
    }

    const ccErrorBody = await ccResponse.text().catch(() => "");
    console.error(`[Spotify API] Client credentials fallback failed ${ccResponse.status}: ${ccErrorBody.slice(0, 200)}`);

    // If client credentials returns 403, the playlist is private
    if (ccResponse.status === 403) {
      throw new Error(
        "PRIVATE_PLAYLIST: This playlist is private and requires a connected Spotify account with playlist-read-private scope. Please connect your Spotify account first."
      );
    }
  }

  // All methods failed
  if (!userAccessToken) {
    throw new Error(
      "NO_SPOTIFY_TOKEN: No Spotify user access token available. Please connect your Spotify account first."
    );
  }

  throw new Error(
    `Spotify API request failed for ${endpoint}. All authentication methods exhausted.`
  );
}

// POST - Sync tracks from a Spotify playlist into the local curated playlist
// Replaces all existing tracks with the ones from Spotify
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const { id } = await params;

    // Find the local playlist
    const [playlist] = await db
      .select()
      .from(curatedPlaylists)
      .where(eq(curatedPlaylists.id, id))
      .limit(1);

    if (!playlist) {
      return NextResponse.json(
        { success: false, error: "Playlist not found" },
        { status: 404 }
      );
    }

    // Get Spotify playlist ID - from URL, from stored ID, or from request body
    const body = await request.json().catch(() => ({}));
    let spotifyPlaylistId = body.spotifyPlaylistId as string | undefined;

    if (!spotifyPlaylistId && playlist.spotifyPlaylistUrl) {
      spotifyPlaylistId = SpotifyClient.extractId(playlist.spotifyPlaylistUrl) || undefined;
    }

    if (!spotifyPlaylistId && playlist.spotifyPlaylistId) {
      spotifyPlaylistId = playlist.spotifyPlaylistId;
    }

    if (!spotifyPlaylistId && body.spotifyPlaylistUrl) {
      spotifyPlaylistId = SpotifyClient.extractId(body.spotifyPlaylistUrl) || undefined;
    }

    if (!spotifyPlaylistId) {
      return NextResponse.json(
        { success: false, error: "No Spotify playlist ID found. Set a Spotify Playlist URL first." },
        { status: 400 }
      );
    }

    // Request-scoped context to prevent state leakage between serverless invocations
    const requestCtx = { forcedRefreshAttempted: false };

    // Get Spotify user access token — try frontend-provided token first, then fall back to DB
    // The frontend passes the token from /api/admin/spotify/token to avoid DB read issues
    let userAccessToken: string | null = body.accessToken || null;

    if (!userAccessToken) {
      // No token from frontend — get one from DB (refreshes if needed)
      console.log("[Spotify Sync] No access token from frontend, reading from DB...");
      userAccessToken = await getSpotifyUserAccessToken();
    } else {
      console.log("[Spotify Sync] Using access token provided by frontend");
    }

    console.log(`[Spotify Sync] Fetching tracks for playlist "${playlist.name}" from Spotify ID: ${spotifyPlaylistId}`);
    console.log(`[Spotify Sync] User auth token: ${userAccessToken ? 'available' : 'not available'}, will use client credentials as fallback if needed`);

    // Fetch playlist metadata using user access token
    const playlistMeta = await spotifyRequestWithAuth<{
      id: string;
      name: string;
      description: string;
      images: { url: string }[];
      tracks: { total: number };
      external_urls: { spotify: string };
    }>(`/playlists/${spotifyPlaylistId}?fields=id,name,description,images,tracks.total,external_urls`, userAccessToken, requestCtx);

    // Fetch all tracks with pagination using user access token
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

    const limit = 100;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const trackParams = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        market: "MX",
        fields: "items(track(id,name,artists(id,name),album(id,name,images,release_date),duration_ms,preview_url,popularity,explicit)),total,next",
      });

      const response = await spotifyRequestWithAuth<{
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
      }>(`/playlists/${spotifyPlaylistId}/tracks?${trackParams.toString()}`, userAccessToken, requestCtx);

      if (!response.items?.length) {
        break;
      }

      for (const item of response.items) {
        const track = item.track;
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
          position: offset + tracks.length + 1,
        });
      }

      hasMore = response.next !== null && response.items.length === limit;
      offset += limit;

      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`[Spotify Sync] Fetched ${tracks.length} tracks from playlist ${spotifyPlaylistId}`);

    if (!tracks.length) {
      return NextResponse.json(
        { success: false, error: "The Spotify playlist has no tracks or they could not be fetched." },
        { status: 400 }
      );
    }

    // Update playlist metadata from Spotify
    const playlistUpdates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (!playlist.description && playlistMeta.description) {
      playlistUpdates.description = playlistMeta.description;
    }
    if (!playlist.coverImageUrl && playlistMeta.images?.[0]?.url) {
      playlistUpdates.coverImageUrl = playlistMeta.images[0].url;
    }
    playlistUpdates.spotifyPlaylistId = spotifyPlaylistId;
    playlistUpdates.spotifyPlaylistUrl = playlistMeta.external_urls?.spotify || `https://open.spotify.com/playlist/${spotifyPlaylistId}`;

    await db
      .update(curatedPlaylists)
      .set(playlistUpdates)
      .where(eq(curatedPlaylists.id, id));

    // Delete existing tracks for this playlist (full replace)
    await db
      .delete(playlistTracks)
      .where(eq(playlistTracks.playlistId, id));

    // Insert new tracks from Spotify
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const track of tracks) {
      try {
        let curatedTrackId: string | null = null;
        try {
          const [matchingTrack] = await db
            .select({ id: curatedTracks.id })
            .from(curatedTracks)
            .where(eq(curatedTracks.spotifyTrackId, track.spotifyTrackId))
            .limit(1);
          curatedTrackId = matchingTrack?.id || null;
        } catch {
          // curated_tracks table may not have this track
        }

        await db.insert(playlistTracks).values({
          id: generateUUID(),
          playlistId: id,
          playlistName: playlist.name,
          spotifyTrackId: track.spotifyTrackId,
          curatedTrackId,
          trackName: track.trackName,
          artistName: track.artistName,
          albumImageUrl: track.albumImageUrl,
          position: track.position,
          isActive: true,
        });
        added++;
      } catch (e: any) {
        if (e.message?.includes("UNIQUE constraint")) {
          skipped++;
        } else {
          errors.push(`Track "${track.trackName}": ${e.message}`);
        }
      }
    }

    console.log(`[Spotify Sync] Playlist "${playlist.name}": ${added} tracks added, ${skipped} skipped, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      message: `Synced ${added} tracks from Spotify playlist "${playlistMeta.name}"`,
      results: {
        playlistName: playlistMeta.name,
        tracksAdded: added,
        tracksSkipped: skipped,
        errors: errors.slice(0, 5),
        totalSpotifyTracks: tracks.length,
        metadataUpdated: Object.keys(playlistUpdates).length > 1,
      },
    });
  } catch (error: any) {
    console.error("[Spotify Sync API] Error:", error);

    let errorMessage = error.message || "Error syncing playlist from Spotify";
    let needsAuth = false;

    if (errorMessage.includes("NO_SPOTIFY_TOKEN")) {
      needsAuth = true;
      errorMessage = "Necesitas conectar tu cuenta de Spotify primero. Haz clic en 'Conectar Spotify' para autorizar el acceso a tus playlists.";
    } else if (errorMessage.includes("PRIVATE_PLAYLIST")) {
      needsAuth = true;
      errorMessage = "Esta playlist es privada. Necesitas conectar tu cuenta de Spotify con permisos de lectura para playlists privadas. Haz clic en 'Conectar Spotify'.";
    } else if (errorMessage.includes("403")) {
      needsAuth = true;
      errorMessage = "Spotify denegó el acceso. Tu conexión de Spotify puede haber expirado. Haz clic en 'Conectar Spotify' para reconectar.";
    } else if (errorMessage.includes("404")) {
      errorMessage = "Playlist de Spotify no encontrada. Verifica la URL/ID de la playlist.";
    } else if (errorMessage.includes("429")) {
      errorMessage = "Spotify API rate limit reached. Please try again in a few moments.";
    }

    return NextResponse.json(
      { success: false, error: errorMessage, needsAuth },
      { status: needsAuth ? 403 : 500 }
    );
  }
}

async function upsertSetting(key: string, value: string, type: string) {
  try {
    const [existing] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, key))
      .limit(1);

    if (existing) {
      await db
        .update(siteSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(siteSettings.key, key));
    } else {
      await db.insert(siteSettings).values({
        id: crypto.randomUUID(),
        key,
        value,
        type: type as "string" | "number" | "boolean" | "json",
      });
    }
  } catch (error) {
    console.error(`[Spotify Sync] Failed to save setting ${key}:`, error);
  }
}

async function clearSpotifyTokens() {
  try {
    const keys = ["spotify_access_token", "spotify_access_token_expiry", "spotify_refresh_token"];
    for (const key of keys) {
      await db
        .update(siteSettings)
        .set({ value: null, updatedAt: new Date() })
        .where(eq(siteSettings.key, key));
    }
  } catch (error) {
    console.error("[Spotify Sync] Failed to clear tokens:", error);
  }
}
