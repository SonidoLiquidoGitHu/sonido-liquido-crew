import { NextResponse } from "next/server";
import { getClient, initializeDatabase } from "@/lib/db";
import { getArtist } from "@/lib/spotify";

export const dynamic = "force-dynamic";

// Check if Spotify credentials are configured
function hasSpotifyCredentials(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

// POST - Sync all curated channels with Spotify
export async function POST(request: Request) {
  try {
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

    await initializeDatabase();
    const client = await getClient();

    // Get all active channels
    const channelsResult = await client.execute(`
      SELECT id, spotify_artist_id, name FROM curated_spotify_channels
      WHERE is_active = 1 AND auto_sync = 1
    `);

    const channels = channelsResult.rows;
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const channel of channels) {
      try {
        const artistData = await getArtist(channel.spotify_artist_id as string);

        const now = Math.floor(Date.now() / 1000);

        await client.execute({
          sql: `UPDATE curated_spotify_channels SET
                name = ?,
                image_url = ?,
                genres = ?,
                popularity = ?,
                followers = ?,
                last_synced_at = ?,
                updated_at = ?
                WHERE id = ?`,
          args: [
            artistData.name,
            artistData.images?.[0]?.url || null,
            JSON.stringify(artistData.genres || []),
            artistData.popularity || 0,
            artistData.followers?.total || 0,
            now,
            now,
            channel.id,
          ],
        });

        synced++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errors.push(`${channel.name}: ${errorMsg}`);

        // If rate limited, stop the sync
        if (errorMsg.includes("429") || errorMsg.includes("rate")) {
          return NextResponse.json(
            {
              success: false,
              error: "Spotify API rate limited",
              message: "La API de Spotify está limitada. Intenta de nuevo más tarde.",
              synced,
              failed,
              rateLimited: true,
            },
            { status: 429 }
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sincronización completada: ${synced} canales actualizados, ${failed} errores`,
      synced,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error syncing curated channels:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Error syncing channels" },
      { status: 500 }
    );
  }
}
