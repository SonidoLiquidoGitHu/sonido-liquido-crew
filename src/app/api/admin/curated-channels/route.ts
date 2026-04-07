import { NextResponse } from "next/server";
import { getClient, initializeDatabase } from "@/lib/db";
import { getArtist, getAccessToken } from "@/lib/spotify";

export const dynamic = "force-dynamic";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

// Check if Spotify credentials are configured
function hasSpotifyCredentials(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

// GET - List all curated channels
export async function GET() {
  try {
    await initializeDatabase();
    const client = await getClient();

    const result = await client.execute(`
      SELECT * FROM curated_spotify_channels
      ORDER BY priority DESC, name ASC
    `);

    const channels = result.rows.map((row) => ({
      id: row.id,
      spotifyArtistId: row.spotify_artist_id,
      spotifyArtistUrl: row.spotify_artist_url,
      name: row.name,
      imageUrl: row.image_url,
      genres: row.genres ? JSON.parse(row.genres as string) : [],
      popularity: row.popularity,
      followers: row.followers,
      category: row.category,
      priority: row.priority,
      description: row.description,
      autoSync: Boolean(row.auto_sync),
      syncNewReleases: Boolean(row.sync_new_releases),
      syncTopTracks: Boolean(row.sync_top_tracks),
      isActive: Boolean(row.is_active),
      lastSyncedAt: row.last_synced_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    // Check credentials status
    const credentialsConfigured = hasSpotifyCredentials();

    return NextResponse.json({
      success: true,
      channels,
      credentialsConfigured,
      message: credentialsConfigured
        ? "Credenciales de Spotify configuradas"
        : "Configura SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET en Netlify",
    });
  } catch (error) {
    console.error("Error fetching curated channels:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error fetching channels" },
      { status: 500 }
    );
  }
}

// POST - Add a new curated channel (by Spotify artist URL or ID)
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { spotifyArtistUrl, category, description, priority } = data;

    // Check credentials first
    if (!hasSpotifyCredentials()) {
      return NextResponse.json(
        {
          success: false,
          error: "Spotify API no configurada",
          message: "Configura SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET en las variables de entorno de Netlify, luego redespliega el sitio.",
          needsCredentials: true,
        },
        { status: 400 }
      );
    }

    // Extract Spotify artist ID from URL
    let spotifyArtistId = spotifyArtistUrl;
    const urlMatch = spotifyArtistUrl.match(/artist\/([a-zA-Z0-9]+)/);
    if (urlMatch) {
      spotifyArtistId = urlMatch[1];
    }

    // Fetch artist info from Spotify
    let artistData;
    try {
      artistData = await getArtist(spotifyArtistId);
    } catch (spotifyError) {
      const errorMessage = spotifyError instanceof Error ? spotifyError.message : "Unknown error";

      // Check if it's a rate limit error
      if (errorMessage.includes("429") || errorMessage.includes("rate")) {
        return NextResponse.json(
          {
            success: false,
            error: "Spotify API rate limited",
            message: "La API de Spotify está limitada temporalmente. Intenta de nuevo en unos minutos.",
            rateLimited: true,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { success: false, error: `Error al obtener artista de Spotify: ${errorMessage}` },
        { status: 400 }
      );
    }

    await initializeDatabase();
    const client = await getClient();

    // Check if already exists
    const existing = await client.execute({
      sql: "SELECT id FROM curated_spotify_channels WHERE spotify_artist_id = ?",
      args: [spotifyArtistId],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: "Este artista ya está agregado" },
        { status: 400 }
      );
    }

    const id = generateId();
    const now = Math.floor(Date.now() / 1000);

    await client.execute({
      sql: `INSERT INTO curated_spotify_channels
            (id, spotify_artist_id, spotify_artist_url, name, image_url, genres, popularity, followers, category, priority, description, auto_sync, sync_new_releases, sync_top_tracks, is_active, last_synced_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, 1, ?, ?, ?)`,
      args: [
        id,
        spotifyArtistId,
        `https://open.spotify.com/artist/${spotifyArtistId}`,
        artistData.name,
        artistData.images?.[0]?.url || null,
        JSON.stringify(artistData.genres || []),
        artistData.popularity || 0,
        artistData.followers?.total || 0,
        category || "roster",
        priority || 0,
        description || null,
        now,
        now,
        now,
      ],
    });

    return NextResponse.json({
      success: true,
      message: `Artista "${artistData.name}" agregado exitosamente`,
      channel: {
        id,
        spotifyArtistId,
        name: artistData.name,
        imageUrl: artistData.images?.[0]?.url,
        genres: artistData.genres,
        popularity: artistData.popularity,
        followers: artistData.followers?.total,
        category: category || "roster",
      },
    });
  } catch (error) {
    console.error("Error adding curated channel:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error adding channel" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a curated channel
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    await initializeDatabase();
    const client = await getClient();

    await client.execute({
      sql: "DELETE FROM curated_spotify_channels WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: "Canal eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error deleting curated channel:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error deleting channel" },
      { status: 500 }
    );
  }
}
