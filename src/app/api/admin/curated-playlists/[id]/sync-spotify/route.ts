import { db, isDatabaseConfigured } from "@/db/client";
import { curatedPlaylists, curatedTracks, playlistTracks } from "@/db/schema";
import { SpotifyClient } from "@/lib/clients/spotify";
import {
  getClientCredentialsToken,
  getSpotifyUserAccessToken,
} from "@/lib/clients/spotify-tokens";
import { generateUUID } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Make an authenticated request to the Spotify API with robust retry logic.
 *
 * Strategy:
 * 1. Use the provided user access token (from frontend or DB)
 * 2. On 401, attempt forced token refresh and retry
 * 3. On 403 with user token, the token might be expired (Spotify returns 403 not 401)
 *    → Try forced refresh + retry
 *    → If still 403, try client credentials for public playlists
 *    → If still 403 after everything, it's a genuine scope/permission issue
 * 4. If no user token available, try client credentials for public data
 *
 * CRITICAL FIX: Previous versions called validateAccessToken() before the request,
 * which made an extra /me API call that could fail and cause the valid token to be
 * discarded. We now skip that validation and let the actual API call tell us if
 * the token works. The retry logic handles expired/invalid tokens.
 */
async function spotifyRequestWithAuth<T>(
  endpoint: string,
  userAccessToken: string | null,
  ctx: { forcedRefreshAttempted: boolean; lastError?: string },
): Promise<T> {
  const url = `https://api.spotify.com/v1${endpoint}`;

  // Attempt 1: Use user access token if available
  if (userAccessToken) {
    console.log(`[Spotify API] Requesting ${endpoint} with user token...`);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
      console.log("[Spotify API] Request succeeded with user token");
      return response.json();
    }

    const errorBody = await response.text().catch(() => "");
    ctx.lastError = `User token: ${response.status} — ${errorBody.slice(0, 300)}`;
    console.error(
      `[Spotify API] User token request failed ${response.status}: ${errorBody.slice(0, 500)}`,
    );

    // On 401 OR 403, try forced token refresh once.
    // Spotify frequently returns 403 for expired tokens (not just 401).
    if (
      (response.status === 401 || response.status === 403) &&
      !ctx.forcedRefreshAttempted
    ) {
      console.log(
        `[Spotify Sync] Got ${response.status}, attempting forced token refresh...`,
      );
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
          console.log("[Spotify Sync] Retry with refreshed token succeeded!");
          return retryResponse.json();
        }

        const retryErrorBody = await retryResponse.text().catch(() => "");
        ctx.lastError = `Refreshed token: ${retryResponse.status} — ${retryErrorBody.slice(0, 300)}`;
        console.error(
          `[Spotify API] Retry with refreshed token failed ${retryResponse.status}: ${retryErrorBody.slice(0, 500)}`,
        );

        // If the refreshed token also gets 401, try one more time with a completely fresh token
        if (retryResponse.status === 401) {
          console.log(
            "[Spotify Sync] Refreshed token also got 401, trying a second refresh...",
          );
          const secondRefreshToken = await getSpotifyUserAccessToken(true);
          if (secondRefreshToken && secondRefreshToken !== refreshedToken) {
            const secondRetry = await fetch(url, {
              headers: { Authorization: `Bearer ${secondRefreshToken}` },
              signal: AbortSignal.timeout(10_000),
            });
            if (secondRetry.ok) {
              console.log("[Spotify Sync] Second refresh attempt succeeded!");
              return secondRetry.json();
            }
          }
        }
      } else {
        console.error(
          "[Spotify Sync] Token refresh failed — no refreshed token available",
        );
      }
    }

    // Specific error codes that shouldn't be retried
    if (response.status === 404) {
      throw new Error(
        "Spotify playlist not found (404). Verify the playlist URL/ID is correct.",
      );
    }
    if (response.status === 429) {
      throw new Error(
        "Spotify API rate limit reached (429). Please try again in a few moments.",
      );
    }
  }

  // Fallback: Try client credentials (works for PUBLIC playlists only)
  console.log("[Spotify Sync] Trying client credentials fallback...");
  const ccToken = await getClientCredentialsToken();
  if (ccToken) {
    const ccResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${ccToken}`,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (ccResponse.ok) {
      console.log(
        "[Spotify Sync] Client credentials fallback succeeded (public playlist)",
      );
      return ccResponse.json();
    }

    const ccErrorBody = await ccResponse.text().catch(() => "");
    console.error(
      `[Spotify API] Client credentials fallback failed ${ccResponse.status}: ${ccErrorBody.slice(0, 500)}`,
    );

    // If client credentials returns 403, the playlist is private and needs user auth
    if (ccResponse.status === 403) {
      if (!userAccessToken) {
        throw new Error(
          "NO_SPOTIFY_TOKEN: This playlist requires a connected Spotify account. Client credentials cannot access it. Please connect your Spotify account first.",
        );
      }
      throw new Error(
        `PRIVATE_PLAYLIST: This playlist is private and your Spotify token could not access it (possibly expired scopes). Error detail: ${ccErrorBody.slice(0, 200)}. Try clicking 'Conectar Spotify' to re-authorize with full permissions.`,
      );
    }
  }

  // All methods failed
  if (!userAccessToken) {
    throw new Error(
      "NO_SPOTIFY_TOKEN: No Spotify user access token available. Please connect your Spotify account first.",
    );
  }

  throw new Error(
    `Spotify API request failed for ${endpoint}. Last error: ${ctx.lastError || "unknown"}. All authentication methods exhausted. Try reconnecting your Spotify account.`,
  );
}

// POST - Sync tracks from a Spotify playlist into the local curated playlist
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 },
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
        { status: 404 },
      );
    }

    // Get Spotify playlist ID - from URL, from stored ID, or from request body
    const body = await request.json().catch(() => ({}));
    let spotifyPlaylistId = body.spotifyPlaylistId as string | undefined;

    if (!spotifyPlaylistId && playlist.spotifyPlaylistUrl) {
      spotifyPlaylistId =
        SpotifyClient.extractId(playlist.spotifyPlaylistUrl) || undefined;
    }

    if (!spotifyPlaylistId && playlist.spotifyPlaylistId) {
      spotifyPlaylistId = playlist.spotifyPlaylistId;
    }

    if (!spotifyPlaylistId && body.spotifyPlaylistUrl) {
      spotifyPlaylistId =
        SpotifyClient.extractId(body.spotifyPlaylistUrl) || undefined;
    }

    if (!spotifyPlaylistId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No Spotify playlist ID found. Set a Spotify Playlist URL first.",
        },
        { status: 400 },
      );
    }

    // Request-scoped context to prevent state leakage between serverless invocations
    const requestCtx = { forcedRefreshAttempted: false };

    // Get Spotify user access token — try frontend-provided token first, then fall back to DB
    // CRITICAL: We do NOT call validateAccessToken() here anymore. That function made
    // an extra /me API call that could fail (403) even when the token works for playlists,
    // causing the valid token to be discarded and the sync to fail.
    // Instead, we trust the token and let spotifyRequestWithAuth handle retries if it fails.
    let userAccessToken: string | null = body.accessToken || null;

    if (!userAccessToken) {
      console.log(
        "[Spotify Sync] No access token from frontend, getting from DB...",
      );
      userAccessToken = await getSpotifyUserAccessToken();
      if (userAccessToken) {
        console.log("[Spotify Sync] Got access token from DB");
      } else {
        console.warn("[Spotify Sync] No access token available from DB either");
      }
    } else {
      console.log(
        "[Spotify Sync] Using access token provided by frontend (skipping pre-validation — will validate on actual API call)",
      );
    }

    console.log(
      `[Spotify Sync] Syncing playlist "${playlist.name}" from Spotify ID: ${spotifyPlaylistId}`,
    );
    console.log(
      `[Spotify Sync] User auth token: ${userAccessToken ? "available" : "not available"}`,
    );

    // Fetch playlist metadata using user access token
    // Spotify API 2025+: Use "items.total" instead of "tracks.total" in fields parameter.
    const playlistMeta = await spotifyRequestWithAuth<{
      id: string;
      name: string;
      description: string;
      images: { url: string }[];
      items?: { total: number };
      tracks?: { total: number };
      external_urls: { spotify: string };
    }>(
      `/playlists/${spotifyPlaylistId}?fields=id,name,description,images,items.total,tracks.total,external_urls`,
      userAccessToken,
      requestCtx,
    );

    // Fetch all tracks with pagination using the NEW /playlists/{id}/items endpoint.
    // IMPORTANT: Spotify deprecated /playlists/{id}/tracks (returns 403 since 2025).
    // The new endpoint is /playlists/{id}/items with tracks under "item" key.
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
        fields:
          "items(item(id,name,artists(id,name),album(id,name,images,release_date),duration_ms,preview_url,popularity,explicit,is_local),is_local),total,next",
      });

      const response = await spotifyRequestWithAuth<{
        items: Array<{
          is_local: boolean;
          // Spotify API 2025+: track data is under "item" (singular) key
          item: {
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
            is_local?: boolean;
          } | null;
          // Legacy: some API versions still return "track" key
          track?: {
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
      }>(
        `/playlists/${spotifyPlaylistId}/items?${trackParams.toString()}`,
        userAccessToken,
        requestCtx,
      );

      if (!response.items?.length) {
        break;
      }

      for (const item of response.items) {
        // Spotify API 2025+: track data is under "item" key (not "track")
        const track = item.item || item.track;
        if (!track || !track.id || item.is_local) continue;

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

    console.log(
      `[Spotify Sync] Fetched ${tracks.length} tracks from playlist ${spotifyPlaylistId}`,
    );

    if (!tracks.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The Spotify playlist has no tracks or they could not be fetched.",
        },
        { status: 400 },
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
    playlistUpdates.spotifyPlaylistUrl =
      playlistMeta.external_urls?.spotify ||
      `https://open.spotify.com/playlist/${spotifyPlaylistId}`;

    await db
      .update(curatedPlaylists)
      .set(playlistUpdates)
      .where(eq(curatedPlaylists.id, id));

    // Delete existing tracks for this playlist (full replace)
    await db.delete(playlistTracks).where(eq(playlistTracks.playlistId, id));

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
      // biome-ignore lint/suspicious/noExplicitAny: dynamic type
      } catch (e: any) {
        if (e.message?.includes("UNIQUE constraint")) {
          skipped++;
        } else {
          errors.push(`Track "${track.trackName}": ${e.message}`);
        }
      }
    }

    console.log(
      `[Spotify Sync] Playlist "${playlist.name}": ${added} tracks added, ${skipped} skipped, ${errors.length} errors`,
    );

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
  // biome-ignore lint/suspicious/noExplicitAny: dynamic type
  } catch (error: any) {
    console.error("[Spotify Sync API] Error:", error);

    let errorMessage = error.message || "Error syncing playlist from Spotify";
    let needsAuth = false;

    if (errorMessage.includes("NO_SPOTIFY_TOKEN")) {
      needsAuth = true;
      errorMessage =
        "Necesitas conectar tu cuenta de Spotify primero. Haz clic en 'Conectar Spotify' para autorizar el acceso a tus playlists.";
    } else if (errorMessage.includes("PRIVATE_PLAYLIST")) {
      needsAuth = true;
      errorMessage =
        "Esta playlist es privada y tu token de Spotify no pudo acceder. Intenta reconectar Spotify para actualizar los permisos. Haz clic en 'Conectar Spotify'.";
    } else if (errorMessage.includes("404")) {
      errorMessage =
        "Playlist de Spotify no encontrada. Verifica la URL/ID de la playlist.";
    } else if (errorMessage.includes("429")) {
      errorMessage =
        "Spotify API rate limit reached. Please try again in a few moments.";
    } else if (errorMessage.includes("403") || errorMessage.includes("401")) {
      // Only treat as auth issue if the error specifically mentions 403 or 401
      // from the Spotify API (not from our own 403 response)
      needsAuth = true;
      errorMessage =
        "Spotify denegó el acceso. Tu conexión de Spotify puede haber expirado o los permisos son insuficientes. Haz clic en 'Conectar Spotify' para reconectar con permisos completos.";
    }

    // Include debug info in development
    const debugInfo =
      process.env.NODE_ENV === "development" ? { debug: errorMessage } : {};

    return NextResponse.json(
      { success: false, error: errorMessage, needsAuth, ...debugInfo },
      { status: needsAuth ? 403 : 500 },
    );
  }
}
