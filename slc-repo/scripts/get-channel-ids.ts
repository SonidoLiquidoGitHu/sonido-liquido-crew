/**
 * Get channel IDs for the three target artists
 */
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels } from "@/db/schema/curated-channels";
import { eq } from "drizzle-orm";

async function main() {
  if (isDatabaseConfigured() === false) {
    console.log("DB not configured");
    return;
  }

  const targetIds = [
    { name: "Reick One", spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ" },
    { name: "X Santa-Ana", spotifyId: "2Apt0MjZGqXAd1pl4LNQrR" },
    { name: "Zaque", spotifyId: "4WQmw3fIx9F7iPKL5v8SCN" }
  ];

  for (const artist of targetIds) {
    const [channel] = await db
      .select()
      .from(curatedSpotifyChannels)
      .where(eq(curatedSpotifyChannels.spotifyArtistId, artist.spotifyId))
      .limit(1);

    if (channel) {
      console.log(`${artist.name}: ${channel.id}`);
    } else {
      console.log(`${artist.name}: NOT FOUND`);
    }
  }
}

main().catch(console.error);
