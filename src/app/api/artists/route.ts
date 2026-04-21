import { NextResponse } from "next/server";
import type { Artist } from "@/lib/types";

const SPOTIFY_IDS = [
  "2jJmTEMkGQfH3BxoG3MQvF",
  "4fNQqyvcM71IyF2EitEtCj",
  "3RAg8fPmZ8RnacJO8MhLP1",
  "2zrv1oduhIYh29vvQZwI5r",
  "3eCEorgAoZkvnAQLdy4x38",
  "5urer15JPbCELf17LVia7w",
  "5TMoczTLclVyzzDY5qf3Yb",
  "6AN9ek9RwrLbSp9rT2lcDG",
  "0QdRhOmiqAcV1dPCoiSIQJ",
  "16YScXC67nAnFDcA2LGdY0",
  "5HrBwfVDf0HXzGDrJ6Znqc",
  "4T4Z7jvUcMV16VsslRRuC5",
  "4UqFXhJVb9zy2SbNx4ycJQ",
  "2Apt0MjZGqXAd1pl4LNQrR",
  "4WQmw3fIx9F7iPKL5v8SCN",
];

async function getAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Spotify auth failed (${res.status}): ${detail}`);
  }

  const { access_token } = await res.json();
  return access_token;
}

async function fetchArtist(
  token: string,
  id: string
): Promise<Artist | null> {
  try {
    const res = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;

    const data = await res.json();

    return {
      id: String(data.id ?? ""),
      name: String(data.name ?? "Unknown"),
      image:
        Array.isArray(data.images) && data.images.length > 0 && data.images[0]?.url
          ? String(data.images[0].url)
          : "",
      followers: typeof data.followers?.total === "number" ? data.followers.total : 0,
      spotifyUrl: data.external_urls?.spotify ? String(data.external_urls.spotify) : "",
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const token = await getAccessToken();
    const results = await Promise.all(SPOTIFY_IDS.map((id) => fetchArtist(token, id)));

    const artists = results.filter((a): a is Artist => a !== null);

    return NextResponse.json(artists);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
