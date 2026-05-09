import { NextRequest, NextResponse } from "next/server";

// Spotify OAuth configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";
const PRODUCTION_BASE_URL = "https://sonidoliquido.com";
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI
  || (process.env.NEXT_PUBLIC_BASE_URL
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/spotify/callback`
    : `${PRODUCTION_BASE_URL}/api/auth/spotify/callback`);

// Scopes needed to create playlists and follow artists
const SCOPES = [
  "playlist-modify-public",
  "playlist-modify-private",
  "user-read-private",
  "user-follow-modify", // Needed to follow artists
  "ugc-image-upload", // Needed to upload playlist cover
].join(" ");

// GET - Redirect to Spotify authorization
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playlistId = searchParams.get("playlistId");
  const returnUrl = searchParams.get("returnUrl") || "/playlists";
  const customName = searchParams.get("customName") || "";
  const followArtists = searchParams.get("followArtists") === "true";

  // Generate a random state for CSRF protection
  const state = Buffer.from(
    JSON.stringify({
      playlistId,
      returnUrl,
      customName,
      followArtists,
      timestamp: Date.now(),
    })
  ).toString("base64");

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
    show_dialog: "true", // Always show the auth dialog
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
