// Test Spotify API connectivity
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

async function testSpotify() {
  console.log("Testing Spotify API...");
  console.log(`Client ID: ${clientId?.substring(0, 10)}...`);
  console.log(`Client Secret: ${clientSecret?.substring(0, 10)}...`);

  // Get token
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const tokenData = await tokenResponse.json();
  console.log("Token obtained:", tokenData.access_token ? "YES" : "NO");

  if (!tokenData.access_token) {
    console.error("Failed to get access token:", tokenData);
    return;
  }

  // Test different endpoints
  const endpoints = [
    `/artists/4WQmw3fIx9F7iPKL5v8SCN`, // Get artist (should be simpler)
    `/artists/4WQmw3fIx9F7iPKL5v8SCN/albums?limit=5`, // Get albums with small limit
  ];

  for (const endpoint of endpoints) {
    console.log(`\nTesting: ${endpoint}`);

    const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    // Check Retry-After header
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter) {
      console.log(`Retry-After: ${retryAfter} seconds`);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.log(`Error: ${errorBody}`);
    } else {
      const data = await response.json();
      if (data.items) {
        console.log(`Success! Found ${data.items.length} items, total: ${data.total}`);
        console.log(`First item: ${data.items[0]?.name}`);
      } else if (data.name) {
        console.log(`Success! Artist: ${data.name}`);
        console.log(`Followers: ${data.followers?.total}`);
        console.log(`Genres: ${data.genres?.join(", ") || "none"}`);
      }
    }

    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testSpotify().catch(console.error);
