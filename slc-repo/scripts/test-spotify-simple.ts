// Simple Spotify API test
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

async function test() {
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
  const token = tokenData.access_token;
  console.log("Token obtained:", token ? "YES" : "NO");

  // Test different search queries
  const tests = [
    "https://api.spotify.com/v1/search?q=Zaque&type=album",
    "https://api.spotify.com/v1/search?q=Zaque&type=artist",
    "https://api.spotify.com/v1/search?q=Zaque&type=album&limit=1",
    "https://api.spotify.com/v1/artists/4WQmw3fIx9F7iPKL5v8SCN",
  ];

  for (const url of tests) {
    console.log(`\nTesting: ${url.split("?")[0]}?...`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`Status: ${response.status}`);

    if (!response.ok) {
      console.log(`Error: ${await response.text()}`);
    } else {
      const data = await response.json();
      console.log(`Success!`);
      if (data.albums) {
        console.log(`  Albums found: ${data.albums.items?.length || 0}`);
        if (data.albums.items?.[0]) {
          console.log(`  First album: ${data.albums.items[0].name}`);
        }
      }
      if (data.artists) {
        console.log(`  Artists found: ${data.artists.items?.length || 0}`);
      }
      if (data.name) {
        console.log(`  Artist name: ${data.name}`);
      }
    }

    await new Promise(r => setTimeout(r, 500));
  }
}

test().catch(console.error);
