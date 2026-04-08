import { NextResponse } from "next/server";
import { getClient, initializeDatabase } from "@/lib/db";
import { getArtists, getArtistAlbums, ROSTER_ARTIST_IDS, ARTIST_SOCIAL_LINKS } from "@/lib/spotify";
export const dynamic = "force-dynamic";
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
}
export async function POST() {
  const syncId = generateId();
  const startedAt = new Date().toISOString();
  try {
    // Check Spotify credentials first
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      return NextResponse.json({
        success: false,
        error: "Credenciales de Spotify no configuradas",
        message: "Configura SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET en las variables de entorno de Netlify",
        needsCredentials: true,
      }, { status: 400 });
    }
    await initializeDatabase();
    const client = await getClient();
    await client.execute({
      sql: `INSERT INTO sync_logs (id, sync_type, status, started_at) VALUES (?, ?, ?, ?)`,
      args: [syncId, "spotify_full", "in_progress", startedAt],
    });
    let artistsSynced = 0;
    let releasesSynced = 0;
    console.log("Fetching artists from Spotify...");
    let spotifyArtists;
    try {
      spotifyArtists = await getArtists(ROSTER_ARTIST_IDS);
    } catch (spotifyError) {
      console.error("Spotify API error:", spotifyError);
      const errorMessage = spotifyError instanceof Error ? spotifyError.message : "Error desconocido";
      // Check for rate limiting
      if (errorMessage.includes("429") || errorMessage.includes("rate")) {
        return NextResponse.json({
          success: false,
          error: "API de Spotify limitada temporalmente",
          message: "La API de Spotify está limitada. Intenta de nuevo en unos minutos.",
          rateLimited: true,
        }, { status: 429 });
      }
      return NextResponse.json({
        success: false,
        error: "Error al conectar con Spotify",
        message: errorMessage,
      }, { status: 500 });
    }
    for (let i = 0; i < spotifyArtists.length; i++) {
      const artist = spotifyArtists[i];
      if (!artist) continue;
      const artistId = generateId();
      const genres = artist.genres?.join(", ") || null;
      const imageUrl = artist.images?.[0]?.url || null;
      const slug = slugify(artist.name);
      const socialLinks = ARTIST_SOCIAL_LINKS[artist.id] || {};
      // NOTE: Removed sort_order column - doesn't exist in production database
      await client.execute({
        sql: `
          INSERT INTO artists (id, spotify_id, name, display_name, slug, image_url, profile_image_url, genres, followers, popularity, spotify_url, youtube_url, instagram_url, is_active, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
          ON CONFLICT(spotify_id) DO UPDATE SET
            name = excluded.name,
            display_name = excluded.display_name,
            slug = excluded.slug,
            image_url = excluded.image_url,
            profile_image_url = excluded.profile_image_url,
            genres = excluded.genres,
            followers = excluded.followers,
            popularity = excluded.popularity,
            spotify_url = excluded.spotify_url,
            youtube_url = excluded.youtube_url,
            instagram_url = excluded.instagram_url,
            updated_at = excluded.updated_at
        `,
        args: [
          artistId,
          artist.id,
          artist.name,
          artist.name,
          slug,
          imageUrl,
          imageUrl,
          genres,
          artist.followers?.total || 0,
          artist.popularity || 0,
          artist.external_urls?.spotify || null,
          socialLinks.youtube || null,
          socialLinks.instagram || null,
          new Date().toISOString(),
        ],
      });
      artistsSynced++;
      try {
        const albums = await getArtistAlbums(artist.id);
        const recentAlbums = albums.slice(0, 10);
        for (const album of recentAlbums) {
          const releaseId = generateId();
          const albumImageUrl = album.images?.[0]?.url || null;
          const releaseSlug = slugify(album.name);
          const artistResult = await client.execute({
            sql: `SELECT id FROM artists WHERE spotify_id = ?`,
            args: [artist.id],
          });
          const internalArtistId = artistResult.rows[0]?.id as string;
          await client.execute({
            sql: `
              INSERT INTO releases (id, spotify_id, artist_id, artist_name, slug, title, release_type, release_date, image_url, cover_image_url, spotify_url, total_tracks, is_published, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
              ON CONFLICT(spotify_id) DO UPDATE SET
                artist_name = excluded.artist_name,
                slug = excluded.slug,
                title = excluded.title,
                release_type = excluded.release_type,
                release_date = excluded.release_date,
                image_url = excluded.image_url,
                cover_image_url = excluded.cover_image_url,
                spotify_url = excluded.spotify_url,
                total_tracks = excluded.total_tracks,
                updated_at = excluded.updated_at
            `,
            args: [
              releaseId,
              album.id,
              internalArtistId,
              artist.name,
              releaseSlug,
              album.name,
              album.album_type || "album",
              album.release_date || null,
              albumImageUrl,
              albumImageUrl,
              album.external_urls?.spotify || null,
              album.total_tracks || 0,
              new Date().toISOString(),
            ],
          });
          releasesSynced++;
        }
      } catch (albumError) {
        console.error(`Error fetching albums for ${artist.name}:`, albumError);
      }
    }
    const itemsSynced = artistsSynced + releasesSynced;
    // Use simpler UPDATE that doesn't rely on columns that might not exist
    try {
      await client.execute({
        sql: `UPDATE sync_logs SET status = ?, items_synced = ?, completed_at = ? WHERE id = ?`,
        args: ["completed", itemsSynced, new Date().toISOString(), syncId],
      });
    } catch (updateError) {
      console.error("Failed to update sync_logs:", updateError);
    }
    return NextResponse.json({
      success: true,
      message: "Sync completed successfully",
      syncId,
      itemsSynced,
      artistsUpdated: artistsSynced,
      releasesAdded: releasesSynced,
    });
  } catch (error) {
    console.error("Sync error:", error);
    try {
      const client = await getClient();
      await client.execute({
        sql: `UPDATE sync_logs SET status = ?, error_message = ?, completed_at = ? WHERE id = ?`,
        args: [
          "failed",
          error instanceof Error ? error.message : "Unknown error",
          new Date().toISOString(),
          syncId,
        ],
      });
    } catch (logError) {
      console.error("Failed to update sync log:", logError);
    }
    return NextResponse.json(
      {
        success: false,
        error: "Sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
export async function GET() {
  try {
    await initializeDatabase();
    const client = await getClient();
    const artistsCount = await client.execute(`SELECT COUNT(*) as count FROM artists WHERE is_active = 1`);
    const releasesCount = await client.execute(`SELECT COUNT(*) as count FROM releases WHERE is_published = 1`);
    const videosCount = await client.execute(`SELECT COUNT(*) as count FROM videos WHERE is_published = 1`);
    const eventsCount = await client.execute(`SELECT COUNT(*) as count FROM events WHERE is_published = 1`);
    const lastSyncResult = await client.execute(`
      SELECT * FROM sync_logs
      ORDER BY started_at DESC
      LIMIT 1
    `);
    const recentLogsResult = await client.execute(`
      SELECT * FROM sync_logs
      ORDER BY started_at DESC
      LIMIT 10
    `);
    const lastSync = lastSyncResult.rows[0] || null;
    const recentLogs = recentLogsResult.rows;
    return NextResponse.json({
      success: true,
      artists: Number(artistsCount.rows[0]?.count || 0),
      releases: Number(releasesCount.rows[0]?.count || 0),
      videos: Number(videosCount.rows[0]?.count || 0),
      events: Number(eventsCount.rows[0]?.count || 0),
      lastSynced: lastSync?.completed_at || lastSync?.started_at || null,
      lastSync: lastSync
        ? {
            id: lastSync.id,
            syncType: lastSync.sync_type,
            status: lastSync.status,
            itemsSynced: lastSync.items_synced,
            artistsSynced: lastSync.artists_synced || 0,
            releasesSynced: lastSync.releases_synced || 0,
            errorMessage: lastSync.error_message,
            startedAt: lastSync.started_at,
            completedAt: lastSync.completed_at,
          }
        : null,
      recentLogs: recentLogs.map((log) => ({
        id: log.id,
        syncType: log.sync_type,
        status: log.status,
        itemsSynced: log.items_synced,
        artistsSynced: log.artists_synced || 0,
        releasesSynced: log.releases_synced || 0,
        errorMessage: log.error_message,
        startedAt: log.started_at,
        completedAt: log.completed_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching sync status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch sync status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}