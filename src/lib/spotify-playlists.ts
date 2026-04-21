/**
 * Spotify Playlist API helper.
 * All playlist operations require a valid user access token (Authorization Code Flow).
 */

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  public: boolean;
  collaborative: boolean;
  snapshot_id: string;
  tracks: { total: number; href: string };
  images: { url: string; height: number; width: number }[];
  external_urls: { spotify: string };
  owner: { id: string; display_name: string };
}

export interface SpotifyPlaylistTrack {
  added_at: string;
  track: {
    id: string;
    name: string;
    uri: string;
    duration_ms: number;
    artists: { id: string; name: string; external_urls: { spotify: string } }[];
    album: {
      id: string;
      name: string;
      images: { url: string; height: number; width: number }[];
      external_urls: { spotify: string };
    };
    external_urls: { spotify: string };
    preview_url: string | null;
  } | null;
}

export interface SpotifySearchResult {
  tracks: {
    items: {
      id: string;
      name: string;
      uri: string;
      duration_ms: number;
      artists: { id: string; name: string }[];
      album: {
        id: string;
        name: string;
        images: { url: string }[];
      };
      preview_url: string | null;
    }[];
  };
}

// ── Get User's Playlists ──────────────────────────────────────────

export async function getUserPlaylists(accessToken: string, userId: string): Promise<SpotifyPlaylist[]> {
  const res = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists?limit=50`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : [];
}

// ── Get Playlist Details ──────────────────────────────────────────

export async function getPlaylist(accessToken: string, playlistId: string): Promise<SpotifyPlaylist | null> {
  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}?fields=id,name,description,public,collaborative,snapshot_id,tracks.total,images,external_urls,owner`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;
  return res.json();
}

// ── Get Playlist Tracks ───────────────────────────────────────────

export async function getPlaylistTracks(accessToken: string, playlistId: string): Promise<SpotifyPlaylistTrack[]> {
  const allTracks: SpotifyPlaylistTrack[] = [];
  let url: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100&fields=items(added_at,track(id,name,uri,duration_ms,artists(id,name,external_urls),album(id,name,images,external_urls),external_urls,preview_url)),next`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) break;
    const data = await res.json();
    if (Array.isArray(data.items)) {
      allTracks.push(...data.items.filter((t: SpotifyPlaylistTrack) => t.track !== null));
    }
    url = data.next;
  }

  return allTracks;
}

// ── Create Playlist ───────────────────────────────────────────────

export async function createPlaylist(
  accessToken: string,
  userId: string,
  options: {
    name: string;
    description?: string;
    public?: boolean;
    collaborative?: boolean;
  }
): Promise<SpotifyPlaylist> {
  const res = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: options.name,
      description: options.description ?? "",
      public: options.public ?? true,
      collaborative: options.collaborative ?? false,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Create playlist failed (${res.status}): ${detail}`);
  }

  return res.json();
}

// ── Update Playlist Details ───────────────────────────────────────

export async function updatePlaylistDetails(
  accessToken: string,
  playlistId: string,
  options: {
    name?: string;
    description?: string;
    public?: boolean;
  }
): Promise<boolean> {
  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });

  return res.ok;
}

// ── Add Tracks to Playlist ────────────────────────────────────────

export async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[],
  position?: number
): Promise<{ snapshot_id: string } | null> {
  if (trackUris.length === 0) return null;

  // Spotify allows max 100 tracks per request
  const batches: string[][] = [];
  for (let i = 0; i < trackUris.length; i += 100) {
    batches.push(trackUris.slice(i, i + 100));
  }

  let lastResult: { snapshot_id: string } | null = null;
  for (const batch of batches) {
    const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: batch,
        position: position ?? 0,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Add tracks failed (${res.status}): ${detail}`);
    }

    lastResult = await res.json();
  }

  return lastResult;
}

// ── Remove Tracks from Playlist ───────────────────────────────────

export async function removeTracksFromPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[],
  snapshotId?: string
): Promise<{ snapshot_id: string } | null> {
  if (trackUris.length === 0) return null;

  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tracks: trackUris.map((uri) => ({ uri })),
      snapshot_id: snapshotId,
    }),
  });

  if (!res.ok) return null;
  return res.json();
}

// ── Replace All Playlist Tracks ───────────────────────────────────

export async function replacePlaylistTracks(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
): Promise<boolean> {
  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uris: trackUris }),
  });

  return res.ok;
}

// ── Upload Playlist Cover Image ───────────────────────────────────

export async function uploadPlaylistCover(
  accessToken: string,
  playlistId: string,
  imageBase64: string
): Promise<boolean> {
  // Strip data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/images`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "image/jpeg",
    },
    body: base64Data,
  });

  return res.ok;
}

// ── Search for Tracks ─────────────────────────────────────────────

export async function searchTracks(
  accessToken: string,
  query: string,
  limit = 20
): Promise<SpotifySearchResult["tracks"]["items"]> {
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: String(limit),
    market: "US",
  });

  const res = await fetch(`https://api.spotify.com/v1/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return [];
  const data: SpotifySearchResult = await res.json();
  return data.tracks?.items ?? [];
}

// ── Get Artist Top Tracks ─────────────────────────────────────────

export async function getArtistTopTracks(
  accessToken: string,
  artistId: string
): Promise<{ id: string; name: string; uri: string; duration_ms: number; artists: { name: string }[]; album: { name: string; images: { url: string }[] } }[]> {
  const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.tracks) ? data.tracks : [];
}
