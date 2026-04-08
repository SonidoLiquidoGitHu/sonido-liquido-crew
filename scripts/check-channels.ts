import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels } from "@/db/schema/curated-channels";

async function main() {
  console.log("Checking curated channels in database...\n");

  if (!isDatabaseConfigured()) {
    console.log("DB not configured");
    return;
  }

  const channels = await db.select().from(curatedSpotifyChannels).limit(5);
  console.log(`Found ${channels.length} channels (showing first 5):\n`);

  for (const ch of channels) {
    console.log(`Name: ${ch.name}`);
    console.log(`  Spotify ID: "${ch.spotifyArtistId}"`);
    console.log(`  Category: ${ch.category}`);
    console.log("");
  }

  // Test API call directly with first channel
  if (channels.length > 0) {
    const artistId = channels[0].spotifyArtistId;
    console.log(`\nTesting API with first channel (${channels[0].name})...`);
    console.log(`Artist ID: "${artistId}"`);
    console.log(`ID length: ${artistId.length}`);

    const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";
    const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6";

    const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const tokenData = await tokenRes.json() as { access_token: string };

    const url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=5&market=MX`;
    console.log(`\nURL: ${url}`);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    console.log(`Status: ${res.status}`);
    if (!res.ok) {
      console.log(`Error: ${await res.text()}`);
    } else {
      const data = await res.json() as { items: any[] };
      console.log(`Albums found: ${data.items?.length}`);
    }
  }
}

main().catch(console.error);
