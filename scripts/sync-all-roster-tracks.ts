/**
 * Sync Tracks for All Roster Artists
 *
 * This script:
 * 1. Gets all roster artists from curated_spotify_channels
 * 2. Syncs their tracks from Spotify
 * 3. Reports summary of tracks synced
 */

import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels, curatedTracks } from "@/db/schema/curated-channels";
import { eq, sql } from "drizzle-orm";
import { spotifyClient } from "@/lib/clients/spotify";
import { generateUUID } from "@/lib/utils";

async function syncChannelTracks(channelId: string, channelName: string, spotifyArtistId: string) {
  console.log(`\n📡 Syncing tracks for ${channelName}...`);

  try {
    // Fetch all albums from Spotify
    const albums = await spotifyClient.getAllArtistAlbums(spotifyArtistId);
    console.log(`   Found ${albums.length} albums/singles`);

    let addedTracks = 0;
    let skippedTracks = 0;

    // For each album, get tracks
    for (const album of albums) {
      try {
        // Get full album details with tracks
        const fullAlbum = await spotifyClient.getAlbum(album.id) as any;

        if (!fullAlbum.tracks?.items) continue;

        for (const track of fullAlbum.tracks.items as any[]) {
          // Check if track already exists
          const existing = await db
            .select()
            .from(curatedTracks)
            .where(eq(curatedTracks.spotifyTrackId, track.id))
            .limit(1);

          if (existing.length > 0) {
            skippedTracks++;
            continue;
          }

          // Add the track
          const newTrack = {
            id: generateUUID(),
            spotifyTrackId: track.id as string,
            spotifyTrackUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
            spotifyAlbumId: fullAlbum.id as string,
            name: track.name as string,
            artistName: track.artists?.map((a: any) => a.name).join(", ") || channelName,
            artistIds: JSON.stringify(track.artists?.map((a: any) => a.id) || []),
            albumName: fullAlbum.name as string,
            albumImageUrl: fullAlbum.images?.[0]?.url || null,
            durationMs: track.duration_ms || null,
            previewUrl: track.preview_url || null,
            releaseDate: fullAlbum.release_date || null,
            popularity: track.popularity || null,
            explicit: Boolean(track.explicit),
            curatedChannelId: channelId,
            isAvailableForPlaylist: true,
            isFeatured: false,
          };

          await db.insert(curatedTracks).values(newTrack);
          addedTracks++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`   ⚠️ Error processing album ${album.name}:`, err);
        continue;
      }
    }

    // Update last synced timestamp
    await db
      .update(curatedSpotifyChannels)
      .set({
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(curatedSpotifyChannels.id, channelId));

    console.log(`   ✅ Added ${addedTracks} tracks, skipped ${skippedTracks} existing`);

    return { addedTracks, skippedTracks, albumsProcessed: albums.length };
  } catch (error) {
    console.error(`   ❌ Error syncing ${channelName}:`, error);
    return { addedTracks: 0, skippedTracks: 0, albumsProcessed: 0, error: true };
  }
}

async function main() {
  console.log("🎵 Syncing Tracks for All Roster Artists");
  console.log("=".repeat(60));

  if (!isDatabaseConfigured()) {
    console.log("❌ Database not configured");
    return;
  }

  // Check if Spotify is configured
  if (!spotifyClient.isConfigured()) {
    console.log("❌ Spotify credentials not configured");
    return;
  }

  // Get all roster channels
  const channels = await db
    .select()
    .from(curatedSpotifyChannels)
    .where(eq(curatedSpotifyChannels.category, "roster"));

  console.log(`\n📊 Found ${channels.length} roster artists to sync\n`);

  if (channels.length === 0) {
    console.log("⚠️ No roster channels found. Run setup-curated-playlists-simple.ts first.");
    return;
  }

  // Sync each channel
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalAlbums = 0;
  let successfulChannels = 0;

  for (const channel of channels) {
    const result = await syncChannelTracks(channel.id, channel.name, channel.spotifyArtistId);

    if (!result.error) {
      successfulChannels++;
      totalAdded += result.addedTracks;
      totalSkipped += result.skippedTracks;
      totalAlbums += result.albumsProcessed;
    }

    // Delay between artists to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Final summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ SYNC COMPLETE!\n");
  console.log("📊 Summary:");
  console.log(`   • Artists synced: ${successfulChannels}/${channels.length}`);
  console.log(`   • Albums processed: ${totalAlbums}`);
  console.log(`   • Tracks added: ${totalAdded}`);
  console.log(`   • Tracks skipped (existing): ${totalSkipped}`);
  console.log(`   • Total tracks: ${totalAdded + totalSkipped}`);

  // Get total tracks count
  const totalTracks = await db
    .select({ count: sql<number>`count(*)` })
    .from(curatedTracks);

  console.log(`\n📌 Database now has ${totalTracks[0]?.count || 0} curated tracks`);
  console.log("=".repeat(60));
}

main().catch(console.error);
