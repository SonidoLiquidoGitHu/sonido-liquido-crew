import { config } from "dotenv";
config();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

console.log("Testing Spotify API...");
console.log("Client ID:", SPOTIFY_CLIENT_ID ? `${SPOTIFY_CLIENT_ID.slice(0,8)}...` : "NOT SET");
console.log("Client Secret:", SPOTIFY_CLIENT_SECRET ? `${SPOTIFY_CLIENT_SECRET.slice(0,4)}...` : "NOT SET");

async function test() {
  // Get access token
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
  
  console.log("\n1. Getting access token...");
  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  
  if (!tokenResponse.ok) {
    console.error("Token request failed:", tokenResponse.status, await tokenResponse.text());
    return;
  }
  
  const tokenData = await tokenResponse.json();
  console.log("✓ Access token obtained");
  
  // Test getting a single artist (Zaque)
  const artistId = "4WQmw3fIx9F7iPKL5v8SCN";
  console.log(`\n2. Testing single artist fetch (${artistId})...`);
  
  const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  
  if (!artistResponse.ok) {
    console.error("Artist request failed:", artistResponse.status, await artistResponse.text());
  } else {
    const artist = await artistResponse.json();
    console.log("✓ Artist:", artist.name, "- Followers:", artist.followers?.total);
  }
  
  // Test getting multiple artists
  const artistIds = [
    "4WQmw3fIx9F7iPKL5v8SCN", // Zaque
    "2jJmTEMkGQfH3BxoG3MQvF", // Brez
    "4fNQqyvcM71IyF2EitEtCj", // Bruno Grasso
  ];
  
  console.log(`\n3. Testing batch artists fetch (${artistIds.length} artists)...`);
  
  const batchResponse = await fetch(`https://api.spotify.com/v1/artists?ids=${artistIds.join(",")}`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  
  if (!batchResponse.ok) {
    console.error("Batch request failed:", batchResponse.status, await batchResponse.text());
  } else {
    const data = await batchResponse.json();
    console.log("✓ Got", data.artists?.length, "artists");
    for (const a of data.artists || []) {
      if (a) console.log("  -", a.name, "- Followers:", a.followers?.total);
    }
  }
  
  // Test getting albums
  console.log(`\n4. Testing artist albums fetch...`);
  const albumsResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=5&market=MX`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  
  if (!albumsResponse.ok) {
    console.error("Albums request failed:", albumsResponse.status, await albumsResponse.text());
  } else {
    const albums = await albumsResponse.json();
    console.log("✓ Got", albums.items?.length, "albums for Zaque");
    for (const a of (albums.items || []).slice(0, 3)) {
      console.log("  -", a.name, `(${a.album_type})`);
    }
  }
  
  console.log("\n✅ Spotify API test complete!");
}

test().catch(console.error);
