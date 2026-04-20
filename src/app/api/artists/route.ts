import { NextResponse } from "next/server";

const SPOTIFY_IDS = [
  "4Z8W4fKeB5YxbusRsdQVPb",   // Radiohead
  "4uFZsG1vXrPbvSnA1cNRsG",   // Bajofondo
  "1r1uxoy19fzMxunt3ONm3V",   // Mon Laferte
  "4S7lEjH0bKt0pOdZ5m9lDJ",   // Nortec Collective
  "7ltDVBr6mKbRvohxheJ9h1",   // Jorge Drexler
  "3wc4l4TzM6w3qLwOQV0Qke",   // Bomba Estéreo
];

interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: SpotifyImage[];
  genres: string[];
  followers: { total: number };
  external_urls: { spotify: string };
}

interface ArtistOutput {
  id: string;
  name: string;
  image: string;
  genres: string[];
  followers: number;
  spotifyUrl: string;
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing CLIENT_ID or CLIENT_SECRET environment variables");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify token request failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function fetchSpotifyArtist(
  token: string,
  id: string
): Promise<ArtistOutput | null> {
  try {
    const res = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;

    const a: SpotifyArtist = await res.json();

    return {
      id: a.id,
      name: a.name,
      image: a.images?.[0]?.url ?? "",
      genres: a.genres ?? [],
      followers: a.followers?.total ?? 0,
      spotifyUrl: a.external_urls?.spotify ?? "",
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const token = await getAccessToken();

    const results = await Promise.all(
      SPOTIFY_IDS.map((id) => fetchSpotifyArtist(token, id))
    );

    const artists = results.filter((a): a is ArtistOutput => a !== null);

    return NextResponse.json(artists);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
