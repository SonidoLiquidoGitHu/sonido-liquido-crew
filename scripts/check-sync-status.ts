/**
 * Check sync status for Reick One, X Santa-Ana, and Zaque
 */

import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels, curatedTracks } from "@/db/schema/curated-channels";
import { eq, sql } from "drizzle-orm";

async function main() {
  console.log("📊 Checking sync status...\n");

  if (!isDatabaseConfigured()) {
    console.log("❌ Database not configured");
    return;
  }

  // Count total tracks
  const totalTracks = await db.select({ count: sql<number>`count(*)` }).from(curatedTracks);
  console.log(`Total tracks in database: ${totalTracks[0]?.count || 0}\n`);

  // Get all channels
  const channels = await db
    .select()
    .from(curatedSpotifyChannels)
    .where(eq(curatedSpotifyChannels.category, "roster"));

  console.log("Roster channels status:");
  console.log("=".repeat(70));

  for (const channel of channels) {
    // Count tracks for this channel
    const channelTracks = await db
      .select({ count: sql<number>`count(*)` })
      .from(curatedTracks)
      .where(eq(curatedTracks.curatedChannelId, channel.id));

    const lastSync = channel.lastSyncedAt
      ? new Date(channel.lastSyncedAt).toLocaleString("es-MX")
      : "Never";

    console.log(`${channel.name.padEnd(20)} | Tracks: ${String(channelTracks[0]?.count || 0).padStart(4)} | Last sync: ${lastSync}`);
  }

  console.log("=".repeat(70));
}

main().catch(console.error);
