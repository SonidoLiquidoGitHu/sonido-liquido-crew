import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { playlistTracks, curatedTracks, curatedSpotifyChannels } from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { artistsRoster } from "@/lib/data/artists-roster";

// Spotify OAuth configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6";

// Dynamic redirect URI based on environment
function getRedirectUri(request: NextRequest): string {
  // Check explicit environment variable first
  if (process.env.SPOTIFY_REDIRECT_URI) {
    return process.env.SPOTIFY_REDIRECT_URI;
  }
  // Use the request origin to build the redirect URI
  const url = new URL(request.url);
  return `${url.origin}/api/auth/spotify/callback`;
}

// Playlist default descriptions
const PLAYLIST_DESCRIPTIONS: Record<string, string> = {
  "gran-reserva": "Los mejores tracks del roster de Sonido Líquido Crew. Curada por sonidoliquido.com",
  "weekly-picks": "Selección semanal de Sonido Líquido Crew. Curada por sonidoliquido.com",
  "new-releases": "Lo más reciente de Sonido Líquido Crew. Curada por sonidoliquido.com",
  "classics": "Tracks clásicos del crew. Curada por sonidoliquido.com",
  "collaborations": "Featurings y colaboraciones de Sonido Líquido Crew. Curada por sonidoliquido.com",
};

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface SpotifyUser {
  id: string;
  display_name: string;
}

interface SpotifyPlaylist {
  id: string;
  external_urls: { spotify: string };
}

// GET - Handle OAuth callback
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Parse state
  let stateData: {
    playlistId?: string;
    returnUrl?: string;
    customName?: string;
    followArtists?: boolean;
  } = {};
  try {
    if (state) {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    }
  } catch (e) {
    console.error("Error parsing state:", e);
  }

  const returnUrl = stateData.returnUrl || "/playlists";
  const playlistId = stateData.playlistId;
  const customName = stateData.customName;
  const followArtists = stateData.followArtists ?? false;

  // Handle errors
  if (error) {
    console.error("Spotify OAuth error:", error);
    return NextResponse.redirect(
      new URL(`${returnUrl}?error=spotify_denied`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`${returnUrl}?error=no_code`, request.url)
    );
  }

  try {
    // Exchange code for access token
    const redirectUri = getRedirectUri(request);

    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return NextResponse.redirect(
        new URL(`${returnUrl}?error=token_failed`, request.url)
      );
    }

    const tokens: SpotifyTokenResponse = await tokenResponse.json();

    // Get user profile
    const userResponse = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(
        new URL(`${returnUrl}?error=user_fetch_failed`, request.url)
      );
    }

    const user: SpotifyUser = await userResponse.json();

    // Variables for result
    let artistsFollowed = 0;

    // If we have a playlist to save
    if (playlistId && isDatabaseConfigured()) {
      const playlistDescription = PLAYLIST_DESCRIPTIONS[playlistId] || "Curada por sonidoliquido.com";

      // Get tracks from our database
      const tracks = await db
        .select()
        .from(playlistTracks)
        .where(eq(playlistTracks.playlistId, playlistId))
        .orderBy(asc(playlistTracks.position));

      if (tracks.length === 0) {
        return NextResponse.redirect(
          new URL(`${returnUrl}?error=empty_playlist`, request.url)
        );
      }

      // Get unique artist Spotify IDs for following
      const artistSpotifyIds: string[] = [];
      if (followArtists) {
        // Method 1: Get artist IDs from curated tracks in the playlist
        const trackIds = tracks.map(t => t.curatedTrackId).filter(Boolean) as string[];

        if (trackIds.length > 0) {
          // Get curated tracks to find their channels
          const curatedTrackResults = await db
            .select({
              channelId: curatedTracks.curatedChannelId,
            })
            .from(curatedTracks)
            .where(inArray(curatedTracks.id, trackIds));

          const channelIds = [...new Set(curatedTrackResults.map(t => t.channelId).filter(Boolean))] as string[];

          if (channelIds.length > 0) {
            // Get Spotify artist IDs from channels
            const channels = await db
              .select({
                spotifyArtistId: curatedSpotifyChannels.spotifyArtistId,
              })
              .from(curatedSpotifyChannels)
              .where(inArray(curatedSpotifyChannels.id, channelIds));

            artistSpotifyIds.push(...channels.map(c => c.spotifyArtistId));
          }
        }

        // Method 2: Get ALL roster artist Spotify IDs directly from the roster data
        // This ensures all roster artists are followed even if tracks aren't synced yet
        const rosterIds = artistsRoster.map(artist => artist.spotifyId).filter(Boolean);
        artistSpotifyIds.push(...rosterIds);

        console.log(`[Spotify Callback] Following ${new Set(artistSpotifyIds).size} unique artists`);
      }

      // Create playlist on Spotify
      const playlistName = customName || `Sonido Líquido - ${playlistId}`;

      const createPlaylistResponse = await fetch(
        `https://api.spotify.com/v1/users/${user.id}/playlists`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: playlistName,
            description: playlistDescription,
            public: true,
          }),
        }
      );

      if (!createPlaylistResponse.ok) {
        const errorText = await createPlaylistResponse.text();
        console.error("Create playlist failed:", errorText);
        return NextResponse.redirect(
          new URL(`${returnUrl}?error=playlist_create_failed`, request.url)
        );
      }

      const newPlaylist: SpotifyPlaylist = await createPlaylistResponse.json();

      // Add tracks to the playlist (Spotify accepts max 100 at a time)
      const trackUris = tracks.map((t) => `spotify:track:${t.spotifyTrackId}`);

      for (let i = 0; i < trackUris.length; i += 100) {
        const chunk = trackUris.slice(i, i + 100);
        const addTracksResponse = await fetch(
          `https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ uris: chunk }),
          }
        );

        if (!addTracksResponse.ok) {
          console.error("Add tracks failed:", await addTracksResponse.text());
        }
      }

      // Follow artists if requested
      if (followArtists && artistSpotifyIds.length > 0) {
        // Remove duplicates
        const uniqueArtistIds = [...new Set(artistSpotifyIds)];

        // Spotify API accepts max 50 artists at a time for follow
        for (let i = 0; i < uniqueArtistIds.length; i += 50) {
          const chunk = uniqueArtistIds.slice(i, i + 50);

          const followResponse = await fetch(
            `https://api.spotify.com/v1/me/following?type=artist`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ ids: chunk }),
            }
          );

          if (followResponse.ok) {
            artistsFollowed += chunk.length;
          } else {
            console.error("Follow artists failed:", await followResponse.text());
          }
        }
      }

      // Redirect to success page with Spotify URL
      const successUrl = new URL(returnUrl, request.url);
      successUrl.searchParams.set("success", "true");
      successUrl.searchParams.set("spotify_url", newPlaylist.external_urls.spotify);
      successUrl.searchParams.set("track_count", tracks.length.toString());
      if (artistsFollowed > 0) {
        successUrl.searchParams.set("artists_followed", artistsFollowed.toString());
      }

      return NextResponse.redirect(successUrl);
    }

    // No playlist specified, just redirect back
    return NextResponse.redirect(new URL(returnUrl, request.url));
  } catch (error) {
    console.error("Spotify callback error:", error);
    return NextResponse.redirect(
      new URL(`${returnUrl}?error=unknown`, request.url)
    );
  }
}
