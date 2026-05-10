// ===========================================
// ADMIN API: IMPORT SPOTIFY PLAYLIST
// POST — Import a playlist from Spotify (creates curated_playlist + playlist_tracks)
// Uses user OAuth token first (required for playlist tracks since Spotify API changes),
// falls back to Client Credentials for public playlists.
// ===========================================

import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedPlaylists, playlistTracks, curatedTracks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";
import { SpotifyClient } from "@/lib/clients/spotify";
import {
  getSpotifyUserAccessToken,
  getClientCredentialsToken,
} from "@/lib/clients/spotify-tokens";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Make an authenticated request to the Spotify API with smart auth fallback.
 * Strategy: user OAuth token → refresh on 401/403 → client credentials fallback.
 * Same pattern as sync-spotify/route.ts.
 */
async function spotifyRequestWithAuth<T>(
  endpoint: string,
  userAccessToken: string | null,
  ctx: { forcedRefreshAttempted: boolean; lastError?: string }
): Promise<T> {
  const url = `https://api.spotify.com/v1${endpoint}`;

  // Attempt 1: Use user access token if available
  if (userAccessToken) {
    console.log(`[Spotify Import API] Requesting ${endpoint} with user token...`);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${userAccessToken}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok) {
      console.log(`[Spotify Import API] Request succeeded with user token`);
      return response.json();
    }

    const errorBody = await response.text().catch(() => "");
    ctx.lastError = `User token: ${response.status} — ${errorBody.slice(0, 300)}`;
    console.error(`[Spotify Import API] User token request failed ${response.status}: ${errorBody.slice(0, 500)}`);

    // On 401 OR 403, try forced token refresh once
    if ((response.status === 401 || response.status === 403) && !ctx.forcedRefreshAttempted) {
      console.log(`[Spotify Import] Got ${response.status}, attempting forced token refresh...`);
      ctx.forcedRefreshAttempted = true;

      const refreshedToken = await getSpotifyUserAccessToken(true);
      if (refreshedToken) {
        console.log("[Spotify Import] Retrying with refreshed token...");
        const retryResponse = await fetch(url, {
          headers: { Authorization: `Bearer ${refreshedToken}` },
          signal: AbortSignal.timeout(10_000),
        });

        if (retryResponse.ok) {
          console.log("[Spotify Import] Retry with refreshed token succeeded!");
          return retryResponse.json();
        }

        const retryErrorBody = await retryResponse.text().catch(() => "");
        ctx.lastError = `Refreshed token: ${retryResponse.status} — ${retryErrorBody.slice(0, 300)}`;
        console.error(`[Spotify Import API] Retry with refreshed token failed ${retryResponse.status}: ${retryErrorBody.slice(0, 500)}`);

        // Second refresh attempt on 401
        if (retryResponse.status === 401) {
          const secondRefreshToken = await getSpotifyUserAccessToken(true);
          if (secondRefreshToken && secondRefreshToken !== refreshedToken) {
            const secondRetry = await fetch(url, {
              headers: { Authorization: `Bearer ${secondRefreshToken}` },
              signal: AbortSignal.timeout(10_000),
            });
            if (secondRetry.ok) {
              return secondRetry.json();
            }
          }
        }
      }
    }

    // Non-retriable errors
    if (response.status === 404) {
      throw new Error("Spotify playlist not found (404). Verifica que la URL sea correcta.");
    }
    if (response.status === 429) {
      throw new Error("Spotify API rate limit reached (429). Intenta de nuevo en unos momentos.");
    }
  }

  // Fallback: Try client credentials (works for public playlist METADATA, but tracks may 403)
  console.log("[Spotify Import] Trying client credentials fallback...");
  const ccToken = await getClientCredentialsToken();
  if (ccToken) {
    const ccResponse = await fetch(url, {
      headers: { Authorization: `Bearer ${ccToken}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (ccResponse.ok) {
      console.log("[Spotify Import] Client credentials fallback succeeded");
      return ccResponse.json();
    }

    const ccErrorBody = await ccResponse.text().catch(() => "");
    console.error(`[Spotify Import API] Client credentials fallback failed ${ccResponse.status}: ${ccErrorBody.slice(0, 500)}`);

    if (ccResponse.status === 403) {
      if (!userAccessToken) {
        throw new Error(
          "NO_SPOTIFY_TOKEN: Esta playlist requiere una cuenta de Spotify conectada. Las credenciales del servidor no pueden acceder a ella. Conecta tu cuenta de Spotify primero (botón 'Conectar Spotify' en la página de playlists)."
        );
      }
      throw new Error(
        `PRIVATE_PLAYLIST: No se pudo acceder a esta playlist. Tu token de Spotify no tiene permisos suficientes o está expirado. Intenta reconectar tu cuenta de Spotify (botón 'Conectar Spotify'). Detalle: ${ccErrorBody.slice(0, 200)}`
      );
    }
  }

  // All methods failed
  if (!userAccessToken) {
    throw new Error(
      "NO_SPOTIFY_TOKEN: No hay token de Spotify disponible. Conecta tu cuenta de Spotify primero (botón 'Conectar Spotify' en la página de playlists)."
    );
  }

  throw new Error(
    `Spotify API request failed for ${endpoint}. Last error: ${ctx.lastError || "unknown"}. Intenta reconectar tu cuenta de Spotify.`
  );
}

// POST — Import a Spotify playlist
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { spotifyUrl, customName, accessToken: frontendAccessToken } = body;

    if (!spotifyUrl || !spotifyUrl.trim()) {
      return NextResponse.json(
        { success: false, error: "Spotify playlist URL is required" },
        { status: 400 }
      );
    }

    // Extract playlist ID from URL
    const playlistId = SpotifyClient.extractId(spotifyUrl.trim());
    if (!playlistId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No se pudo extraer el ID de la playlist de la URL. Usa una URL válida de Spotify (ej. https://open.spotify.com/playlist/...)",
        },
        { status: 400 }
      );
    }

    console.log(`[Spotify Import] Importing playlist ${playlistId}...`);

    // Get user OAuth token for playlist access
    // Priority: 1) Frontend-provided token (avoids Turso lag), 2) Server DB token, 3) null
    let userAccessToken: string | null = frontendAccessToken || null;

    if (userAccessToken) {
      console.log("[Spotify Import] Using Spotify access token from frontend (avoids DB read lag)");
    } else {
      userAccessToken = await getSpotifyUserAccessToken();
      if (userAccessToken) {
        console.log("[Spotify Import] Using Spotify user OAuth token from DB");
      } else {
        console.log("[Spotify Import] No user OAuth token available, will try client credentials");
      }
    }
    const requestCtx = { forcedRefreshAttempted: false };

    // Step 1: Fetch playlist metadata (without full track data)
    // Spotify API 2025+: Use "items.total" instead of "tracks.total" in fields parameter.
    const playlistMeta = await spotifyRequestWithAuth<{
      id: string;
      name: string;
      description: string;
      images: { url: string }[];
      external_urls: { spotify: string };
      owner?: { id: string; display_name: string };
      // Spotify API 2025+: track list is under "items" (not "tracks")
      items?: { total: number };
      tracks?: { total: number };
    }>(
      `/playlists/${playlistId}?fields=id,name,description,images,items.total,tracks.total,external_urls,owner`,
      userAccessToken,
      requestCtx
    );

    const playlistName = playlistMeta.name;
    // Spotify API 2025+: total is under "items" (not "tracks")
    const totalTracks = playlistMeta.items?.total || playlistMeta.tracks?.total || 0;

    console.log(`[Spotify Import] Playlist: "${playlistName}" (${totalTracks} tracks)`);

    // Step 2: Fetch all tracks using the NEW /playlists/{id}/items endpoint
    // IMPORTANT: Spotify deprecated /playlists/{id}/tracks (returns 403).
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
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        market: "MX",
        fields: "items(item(id,name,artists(id,name),album(id,name,images,release_date),duration_ms,preview_url,popularity,explicit,is_local),is_local),total,next",
      });

      console.log(`[Spotify Import] Fetching tracks page: offset=${offset}, limit=${limit}`);

      const response = await spotifyRequestWithAuth<{
        items: Array<{
          is_local: boolean;
          // Spotify API 2025+: track data is under "item" (singular)
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
      }>(`/playlists/${playlistId}/items?${params.toString()}`, userAccessToken, requestCtx);

      if (!response.items?.length) {
        break;
      }

      for (const item of response.items) {
        // Spotify API 2025+: track data is under "item" key (not "track")
        const trackData = item.item || item.track;
        // Skip null tracks (removed/unavailable) and local tracks (no Spotify ID)
        if (!trackData || !trackData.id || item.is_local) continue;

        tracks.push({
          spotifyTrackId: trackData.id,
          trackName: trackData.name,
          artistName: trackData.artists?.map((a) => a.name).join(", ") || "Unknown",
          artistIds: trackData.artists?.map((a) => a.id) || [],
          albumName: trackData.album?.name || "",
          albumImageUrl: trackData.album?.images?.[0]?.url || null,
          durationMs: trackData.duration_ms || null,
          previewUrl: trackData.preview_url || null,
          releaseDate: trackData.album?.release_date || null,
          popularity: trackData.popularity || null,
          explicit: trackData.explicit || false,
          position: tracks.length + 1,
        });
      }

      // Check if there are more pages
      hasMore = response.next !== null && response.items.length === limit;
      offset += limit;

      // Rate limit protection
      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`[Spotify Import] Fetched ${tracks.length} tracks from playlist ${playlistId}`);

    if (tracks.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Esta playlist no tiene tracks accesibles. Puede ser privada o estar vacía. Asegúrate de que la playlist sea pública en Spotify o conecta tu cuenta de Spotify.",
        },
        { status: 400 }
      );
    }

    const finalPlaylistName = customName?.trim() || playlistName;
    const playlistSlug = slugify(finalPlaylistName);

    // Check for slug uniqueness
    const existing = await db
      .select()
      .from(curatedPlaylists)
      .where(eq(curatedPlaylists.slug, playlistSlug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Ya existe una playlist con el slug "${playlistSlug}". Intenta con un nombre personalizado diferente.`,
        },
        { status: 409 }
      );
    }

    // Use Spotify's playlist cover image if available
    const coverImageUrl = playlistMeta.images?.[0]?.url || null;
    const spotifyPlaylistUrl = playlistMeta.external_urls?.spotify || spotifyUrl.trim();

    // Create the curated playlist
    const newPlaylistId = generateUUID();
    const newPlaylist = {
      id: newPlaylistId,
      name: finalPlaylistName,
      slug: playlistSlug,
      description: playlistMeta.description || `Imported from Spotify: ${playlistName}`,
      coverImageUrl,
      coverColor: "#1DB954", // Spotify green as default
      spotifyPlaylistId: playlistId,
      spotifyPlaylistUrl,
      isPublic: true,
      isActive: true,
      priority: 0,
      trackCount: tracks.length,
    };

    await db.insert(curatedPlaylists).values(newPlaylist);

    console.log(
      `[Spotify Import] Created playlist "${playlistName}" (${newPlaylistId}) with ${tracks.length} tracks`
    );

    // Insert playlist_tracks entries
    let tracksAdded = 0;
    let tracksSkipped = 0;
    const trackInsertBatch = [];

    for (const track of tracks) {
      if (!track.spotifyTrackId || !track.trackName) {
        tracksSkipped++;
        continue;
      }

      const trackId = generateUUID();
      trackInsertBatch.push({
        id: trackId,
        playlistId: newPlaylistId,
        playlistName: playlistName,
        spotifyTrackId: track.spotifyTrackId,
        curatedTrackId: null,
        trackName: track.trackName,
        artistName: track.artistName,
        albumImageUrl: track.albumImageUrl,
        position: track.position,
        isActive: true,
        addedBy: "spotify-import",
      });

      tracksAdded++;
    }

    // Insert in batches of 50
    const batchSize = 50;
    for (let i = 0; i < trackInsertBatch.length; i += batchSize) {
      const batch = trackInsertBatch.slice(i, i + batchSize);
      await db.insert(playlistTracks).values(batch);
    }

    // Try to link playlist_tracks to existing curated_tracks (best-effort, non-blocking)
    try {
      let linkedCount = 0;
      for (const track of tracks) {
        if (!track.spotifyTrackId) continue;

        const existingTrack = await db
          .select({ id: curatedTracks.id })
          .from(curatedTracks)
          .where(eq(curatedTracks.spotifyTrackId, track.spotifyTrackId))
          .limit(1);

        if (existingTrack.length > 0) {
          await db
            .update(playlistTracks)
            .set({ curatedTrackId: existingTrack[0].id })
            .where(eq(playlistTracks.spotifyTrackId, track.spotifyTrackId));
          linkedCount++;
        }
      }
      if (linkedCount > 0) {
        console.log(
          `[Spotify Import] Linked ${linkedCount} playlist tracks to existing curated tracks`
        );
      }
    } catch (linkErr) {
      console.warn(
        "[Spotify Import] Could not link playlist tracks to curated tracks:",
        linkErr
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        playlist: newPlaylist,
        tracksAdded,
        tracksSkipped,
      },
      message: `Playlist "${playlistName}" importada exitosamente con ${tracksAdded} tracks desde Spotify.${
        tracksSkipped > 0 ? ` (${tracksSkipped} tracks omitidos por datos incompletos)` : ""
      }`,
    });
  } catch (error) {
    console.error("[Spotify Import] Error:", error);
    const message =
      error instanceof Error ? error.message : "Error importing Spotify playlist";

    // Check for our custom error types
    if (message.includes("NO_SPOTIFY_TOKEN")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Se requiere conectar tu cuenta de Spotify para importar playlists. Haz clic en 'Conectar Spotify' en la página de playlists y vuelve a intentarlo.",
          errorType: "NO_SPOTIFY_TOKEN",
        },
        { status: 401 }
      );
    }

    if (message.includes("PRIVATE_PLAYLIST")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No se pudo acceder a esta playlist de Spotify. Puede ser privada o tu conexión de Spotify expiró. Intenta reconectar tu cuenta con el botón 'Conectar Spotify'.",
          errorType: "PRIVATE_PLAYLIST",
        },
        { status: 403 }
      );
    }

    if (message.includes("401") || message.includes("403")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No se pudo acceder a esta playlist de Spotify. Puede ser privada o tu conexión de Spotify expiró. Intenta reconectar tu cuenta con el botón 'Conectar Spotify'.",
          errorType: "AUTH_FAILED",
        },
        { status: 403 }
      );
    }

    if (message.includes("404")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Playlist no encontrada en Spotify. Verifica que la URL sea correcta.",
          errorType: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Error al importar playlist: ${message}` },
      { status: 500 }
    );
  }
}
