import { type NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedPlaylists, playlistTracks, curatedTracks, siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SpotifyClient } from "@/lib/clients/spotify";
import { generateUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Track whether we've already tried a forced refresh in this request
let forcedRefreshAttempted = false;

/**
 * Get a valid Spotify user access token from site_settings.
 * If the stored token is expired, refreshes it using the stored refresh token.
 * Returns null if no user token is available.
 */
async function getSpotifyUserAccessToken(): Promise<string | null> {
  try {
    const [refreshTokenRow] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, "spotify_refresh_token"))
      .limit(1);

    if (!refreshTokenRow?.value) return null;

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
      return accessToken;
    }

    // Access token expired — refresh it
    console.log("[Spotify Sync] User access token expired, refreshing...");

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
    });

    if (!refreshResponse.ok) {
      console.error("[Spotify Sync] Token refresh failed:", refreshResponse.status);
      // Clear invalid tokens
      await clearSpotifyTokens();
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

    console.log("[Spotify Sync] User access token refreshed successfully");
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
      console.error("[Spotify Sync] Client credentials token failed:", response.status);
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
 * Make an authenticated request to the Spotify API using the user access token.
 * On 401/403, attempts one forced token refresh and retry.
 * Falls back to client credentials for public data if user auth fails entirely.
 */
async function spotifyRequestWithUserAuth<T>(endpoint: string, userAccessToken: string | null): Promise<T> {
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
    console.error(`[Spotify API] Error ${response.status}: ${errorBody}`);

    // On 401/403, try forced token refresh once
    if ((response.status === 401 || response.status === 403) && !forcedRefreshAttempted) {
      console.log("[Spotify Sync] Got 401/403, attempting forced token refresh...");
      forcedRefreshAttempted = true;

      // Force refresh by clearing the stored access token so getSpotifyUserAccessToken refreshes
      try {
        await db
          .update(siteSettings)
          .set({ value: null, updatedAt: new Date() })
          .where(eq(siteSettings.key, "spotify_access_token"));
        await db
          .update(siteSettings)
          .set({ value: "0", updatedAt: new Date() })
          .where(eq(siteSettings.key, "spotify_access_token_expiry"));
      } catch (e) {
        console.error("[Spotify Sync] Failed to clear stale access token:", e);
      }

      const refreshedToken = await getSpotifyUserAccessToken();
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
        console.error(`[Spotify API] Retry failed ${retryResponse.status}: ${retryErrorBody}`);

        // If retry also fails with 401/403, the refresh token is likely invalid — clear all tokens
        if (retryResponse.status === 401 || retryResponse.status === 403) {
          console.log("[Spotify Sync] Retry also failed, clearing all tokens...");
          await clearSpotifyTokens();
        }
      } else {
        console.log("[Spotify Sync] Token refresh failed, clearing tokens...");
        await clearSpotifyTokens();
      }
    }
  }

  // Fallback: Try client credentials (works for public playlists)
  console.log("[Spotify Sync] User auth failed, trying client credentials fallback...");
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
    console.error(`[Spotify API] Client credentials fallback failed ${ccResponse.status}: ${ccErrorBody}`);
  }

  // All methods failed
  throw new Error(
    "No Spotify user access token available. Please connect your Spotify account first."
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

    // Reset forced refresh flag for this request
    forcedRefreshAttempted = false;

    // Get Spotify user access token (OAuth — preferred for playlist track access)
    // Note: We no longer block on missing token — client credentials fallback will be tried
    const userAccessToken = await getSpotifyUserAccessToken();

    console.log(`[Spotify Sync] Fetching tracks for playlist "${playlist.name}" from Spotify ID: ${spotifyPlaylistId}`);
    console.log(`[Spotify Sync] User auth token: ${userAccessToken ? 'available' : 'not available'}, will use client credentials as fallback if needed`);

    // Fetch playlist metadata using user access token
    const playlistMeta = await spotifyRequestWithUserAuth<{
      id: string;
      name: string;
      description: string;
      images: { url: string }[];
      tracks: { total: number };
      external_urls: { spotify: string };
    }>(`/playlists/${spotifyPlaylistId}?fields=id,name,description,images,tracks.total,external_urls`, userAccessToken);

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

      const response = await spotifyRequestWithUserAuth<{
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
      }>(`/playlists/${spotifyPlaylistId}/tracks?${trackParams.toString()}`, userAccessToken);

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

    if (errorMessage.includes("403")) {
      needsAuth = true;
      errorMessage = "Spotify API returned 403. Tu cuenta de Spotify necesita reconectarse. Intenta hacer clic en 'Conectar Spotify' de nuevo.";
    } else if (errorMessage.includes("No Spotify user access token")) {
      needsAuth = true;
      errorMessage = "Necesitas conectar tu cuenta de Spotify primero. Haz clic en 'Conectar Spotify' para autorizar el acceso a tus playlists.";
    } else if (errorMessage.includes("404")) {
      errorMessage = "Spotify playlist not found. Check the playlist URL/ID.";
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
