// Sonido Líquido Crew - Real Spotify Artist IDs
export const ROSTER_ARTIST_IDS = [
  "2jJmTEMkGQfH3BxoG3MQvF", // Brez
  "4fNQqyvcM71IyF2EitEtCj", // Bruno Grasso
  "3RAg8fPmZ8RnacJO8MhLP1", // Chas 7P
  "2zrv1oduhIYh29vvQZwI5r", // Codak
  "3eCEorgAoZkvnAQLdy4x38", // Dilema
  "5urer15JPbCELf17LVia7w", // Doctor Destino
  "5TMoczTLclVyzzDY5qf3Yb", // Fancy Freak
  "6AN9ek9RwrLbSp9rT2lcDG", // Hassyel
  "0QdRhOmiqAcV1dPCoiSIQJ", // Kev Cabrone
  "16YScXC67nAnFDcA2LGdY0", // Latin Geisha
  "5HrBwfVDf0HXzGDrJ6Znqc", // Pepe Levine
  "4T4Z7jvUcMV16VsslRRuC5", // Q Master Weed
  "4UqFXhJVb9zy2SbNx4ycJQ", // Reick One
  "2Apt0MjZGqXAd1pl4LNQrR", // X Santa-Ana
  "4WQmw3fIx9F7iPKL5v8SCN", // Zaque
];

// Artist metadata with social links
export const ARTIST_SOCIAL_LINKS: Record<string, { instagram?: string; youtube?: string }> = {
  "2jJmTEMkGQfH3BxoG3MQvF": { // Brez
    instagram: "https://www.instagram.com/brez_idc",
    youtube: "https://youtube.com/@brezhiphopmexicoslc25",
  },
  "4fNQqyvcM71IyF2EitEtCj": { // Bruno Grasso
    instagram: "https://www.instagram.com/brunograssosl",
    youtube: "https://youtube.com/@brunograssosl",
  },
  "3RAg8fPmZ8RnacJO8MhLP1": { // Chas 7P
    instagram: "https://www.instagram.com/chas7pecados",
    youtube: "https://youtube.com/@chas7p347",
  },
  "2zrv1oduhIYh29vvQZwI5r": { // Codak
    instagram: "https://www.instagram.com/ilikebigbuds_i_canot_lie",
    youtube: "https://youtube.com/@codak",
  },
  "3eCEorgAoZkvnAQLdy4x38": { // Dilema
    instagram: "https://www.instagram.com/dilema_ladee",
    youtube: "https://youtube.com/@dilema999",
  },
  "5urer15JPbCELf17LVia7w": { // Doctor Destino
    instagram: "https://www.instagram.com/estoesdoctordestino",
    youtube: "https://youtube.com/@doctordestinohiphop",
  },
  "5TMoczTLclVyzzDY5qf3Yb": { // Fancy Freak
    instagram: "https://www.instagram.com/fancyfreakcorp",
    youtube: "https://youtube.com/@fancyfreakdj",
  },
  "6AN9ek9RwrLbSp9rT2lcDG": { // Hassyel
    instagram: "https://www.instagram.com/ilikebigbuds_i_canot_lie",
    youtube: "https://youtube.com/channel/UCZp_YCv7jK3-lEtvSONNs8A",
  },
  "0QdRhOmiqAcV1dPCoiSIQJ": { // Kev Cabrone
    instagram: "https://www.instagram.com/kev.cabrone",
    youtube: "https://youtube.com/@kevcabrone",
  },
  "16YScXC67nAnFDcA2LGdY0": { // Latin Geisha
    instagram: "https://www.instagram.com/latingeishamx",
    youtube: "https://youtube.com/@latingeishamx",
  },
  "5HrBwfVDf0HXzGDrJ6Znqc": { // Pepe Levine
    instagram: "https://www.instagram.com/pepelevineonline",
    youtube: "https://youtube.com/@pepelevineonline",
  },
  "4T4Z7jvUcMV16VsslRRuC5": { // Q Master Weed
    instagram: "https://www.instagram.com/q.masterw",
    youtube: "https://youtube.com/@qmasterw",
  },
  "4UqFXhJVb9zy2SbNx4ycJQ": { // Reick One
    instagram: "https://www.instagram.com/reickuno",
    youtube: "https://youtube.com/channel/UCMvZBwXGDTnXVV7NbYKWfaA",
  },
  "2Apt0MjZGqXAd1pl4LNQrR": { // X Santa-Ana
    instagram: "https://www.instagram.com/x_santa_ana",
    youtube: "https://youtube.com/@xsanta-ana",
  },
  "4WQmw3fIx9F7iPKL5v8SCN": { // Zaque
    instagram: "https://www.instagram.com/zaqueslc",
    youtube: "https://youtube.com/@zakeuno",
  },
};

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string; height: number; width: number }[];
  followers: { total: number };
  popularity: number;
  external_urls: { spotify: string };
}

interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  images: { url: string; height: number; width: number }[];
  external_urls: { spotify: string };
  total_tracks: number;
  artists: { id: string; name: string }[];
}

interface SpotifyAlbumsResponse {
  items: SpotifyAlbum[];
  next: string | null;
  total: number;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials not configured");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Failed to get Spotify access token: ${response.statusText}`);
  }

  const data: SpotifyTokenResponse = await response.json();

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response> {
  const token = await getAccessToken();

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, { ...options, headers });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "1", 10);
        const delay = Math.min(retryAfter * 1000, 30000) * Math.pow(2, attempt);
        console.log(`Rate limited. Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Request failed. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

export async function getArtist(id: string): Promise<SpotifyArtist> {
  const response = await fetchWithRetry(`https://api.spotify.com/v1/artists/${id}`);
  return response.json();
}

export async function getArtists(ids: string[]): Promise<SpotifyArtist[]> {
  // Spotify allows max 50 artists per request
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 50) {
    chunks.push(ids.slice(i, i + 50));
  }

  const allArtists: SpotifyArtist[] = [];

  for (const chunk of chunks) {
    const response = await fetchWithRetry(
      `https://api.spotify.com/v1/artists?ids=${chunk.join(",")}`
    );
    const data = await response.json();
    allArtists.push(...data.artists);
  }

  return allArtists;
}

export async function getArtistAlbums(
  id: string,
  includeGroups = "album,single,ep"
): Promise<SpotifyAlbum[]> {
  const albums: SpotifyAlbum[] = [];
  let url: string | null = `https://api.spotify.com/v1/artists/${id}/albums?include_groups=${includeGroups}&limit=50`;

  while (url) {
    const response = await fetchWithRetry(url);
    const data: SpotifyAlbumsResponse = await response.json();
    albums.push(...data.items);
    url = data.next;
  }

  return albums;
}

export type { SpotifyArtist, SpotifyAlbum };
