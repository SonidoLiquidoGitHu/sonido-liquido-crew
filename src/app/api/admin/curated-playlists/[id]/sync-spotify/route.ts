import { type NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedPlaylists, playlistTracks, curatedTracks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SpotifyClient } from "@/lib/clients/spotify";
import {
  getSpotifyUserAccessToken,
  getClientCredentialsToken,
  validateAccessToken,
} from "@/lib/clients/spotify-tokens";
import { generateUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Make an authenticated request to the Spotify API with robust retry logic.
 *
 * Strategy:
 * 1. Use the provided user access token (from frontend or DB)
 * 2. On 401 OR 403, attempt one forced token refresh and retry
 *    (Spotify sometimes returns 403 instead of 401 for expired tokens)
 * 3. Fall back to client credentials for public data
 *
 * IMPORTANT: Previous versions only retried on 401, not 403. But Spotify
 * frequently returns 403 for tokens that have expired or been revoked,
 * especially when using Authorization Code flow. We now retry BOTH.
 */
async function spotifyRequestWithAuth<T>(
  endpoint: string,
  userAccessToken: string | null,
  ctx: { forcedRefreshAttempted: boolean; lastError?: string }
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
    ctx.lastError = `User token: ${response.status} — ${errorBody.slice(0, 300)}`;
    console.error(`[Spotify API] User token request failed ${response.status}: ${errorBody.slice(0, 300)}`);

    // On 401 OR 403, try forced token refresh once.
    // Spotify returns 403 for expired tokens in many cases (not just 401).
    if ((response.status === 401 || response.status === 403) && !ctx.forcedRefreshAttempted) {
      console.log(`[Spotify Sync] Got ${response.status}, attempting forced token refresh...`);
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
        ctx.lastError = `Refreshed token: ${retryResponse.status} — ${retryErrorBody.slice(0, 300)}`;
        console.error(`[Spotify API] Retry with refreshed token failed ${retryResponse.status}: ${retryErrorBody.slice(0, 300)}`);

        // If the refreshed token also gets 403, this is likely a genuine scope/permission issue
        if (retryResponse.status === 403) {
          // Before giving up, try client credentials — it might be a public playlist
          console.log("[Spotify Sync] Refreshed token also got 403, trying client credentials fallback...");
          const ccToken = await getClientCredentialsToken();
          if (ccToken) {
            const ccResponse = await fetch(url, {
              headers: { Authorization: `Bearer ${ccToken}` },
              signal: AbortSignal.timeout(10_000),
            });
            if (ccResponse.ok) {
              console.log("[Spotify Sync] Client credentials fallback succeeded after 403");
              return ccResponse.json();
            }
            const ccError = await ccResponse.text().catch(() => "");
            console.error(`[Spotify API] Client credentials fallback also failed ${ccResponse.status}: ${ccError.slice(0, 200)}`);
          }

          throw new Error(
            `Spotify API returned 403 even after token refresh. This likely means the playlist requires specific scopes. Error: ${retryErrorBody.slice(0, 200)}`
          );
        }
      } else {
        console.error("[Spotify Sync] Token refresh failed — no refreshed token available");
      }
    }

    // If we got a non-retryable error (not 401/403) with user token,
    // still try client credentials as a fallback for public playlists
    if (response.status === 404) {
      throw new Error("Spotify playlist not found (404). Verify the playlist URL/ID is correct.");
    }
    if (response.status === 429) {
      throw new Error("Spotify API rate limit reached (429). Please try again in a few moments.");
    }
  }

  // Fallback: Try client credentials (works for public playlists only)
  console.log("[Spotify Sync] User auth not available or failed, trying client credentials fallback...");
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
    `Spotify API request failed for ${endpoint}. Last error: ${ctx.lastError || 'unknown'}. All authentication methods exhausted.`
  );
}

// POST - Sync tracks from a Spotify playlist into the local curated playlist
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
    let userAccessToken: string | null = body.accessToken || null;

    if (!userAccessToken) {
      console.log("[Spotify Sync] No access token from frontend, getting from DB...");
      userAccessToken = await getSpotifyUserAccessToken();
    } else {
      console.log("[Spotify Sync] Using access token provided by frontend");

      // Quick-validate the frontend-provided token — if it's obviously expired or invalid,
      // get a fresh one immediately rather than waiting for Spotify to reject it
      const validation = await validateAccessToken(userAccessToken);
      if (!validation.valid) {
        console.warn(`[Spotify Sync] Frontend-provided token is invalid: ${validation.error}. Getting fresh token from DB...`);
        userAccessToken = await getSpotifyUserAccessToken();
        if (userAccessToken) {
          console.log("[Spotify Sync] Got fresh token from DB after frontend token validation failed");
        }
      } else {
        console.log(`[Spotify Sync] Frontend token validated — user: ${validation.userId}, scopes: ${validation.scopes?.join(', ')}`);
      }
    }

    console.log(`[Spotify Sync] Syncing playlist "${playlist.name}" from Spotify ID: ${spotifyPlaylistId}`);
    console.log(`[Spotify Sync] User auth token: ${userAccessToken ? 'available' : 'not available'}`);

    // Fetch playlist metadata using user access token
    const playlistMeta = await spotifyRequestWithAuth<{
      id: string;
      name: string;
      description: string;
      images: { url: string }[];
      tracks: { total: number };
      external_urls: { spotify: string };
    }>(`/playlists/${spotifyPlaylistId}?fields=id,name,description,images,tracks.total,external_urls`, userAccessToken, requestCtx);

    // Fetch all tracks with pagination
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
