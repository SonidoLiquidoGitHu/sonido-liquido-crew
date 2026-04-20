import { NextResponse } from "next/server";

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
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const token = await getAccessToken();
    const raw = await Promise.all(SPOTIFY_IDS.map((id) => fetchArtist(token, id)));

    const artists = raw
      .filter((a): a is Record<string, unknown> => a !== null)
      .map((a) => ({
        id: a.id as string,
        name: a.name as string,
        image: (a.images as { url: string }[])?.[0]?.url ?? "",
        genres: a.genres as string[],
        followers: (a.followers as { total: number })?.total ?? 0,
        spotifyUrl: (a.external_urls as { spotify: string })?.spotify ?? "",
      }));

    return NextResponse.json(artists);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
