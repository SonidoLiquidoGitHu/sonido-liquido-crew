// Test Spotify API directly
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6";

interface TokenResponse {
  access_token: string;
}

interface AlbumsResponse {
  items: { id: string; name: string }[];
  total: number;
}

async function main() {
  console.log("Testing Spotify API...\n");

  // Get token
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!tokenRes.ok) {
    console.error("Failed to get token:", await tokenRes.text());
    return;
  }

  const tokenData = await tokenRes.json() as TokenResponse;
  console.log("✅ Token obtained successfully\n");

  // Test artist albums with simple params
  const artistId = "4WQmw3fIx9F7iPKL5v8SCN"; // Zaque

  // Test 1: Simple URL without include_groups
  console.log("Test 1: Simple URL (no include_groups)");
  const url1 = `https://api.spotify.com/v1/artists/${artistId}/albums?limit=5&market=MX`;
  const res1 = await fetch(url1, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  console.log(`   Status: ${res1.status}`);
  if (res1.ok) {
    const data1 = await res1.json() as AlbumsResponse;
    console.log(`   Albums found: ${data1.items?.length} of ${data1.total}`);
  } else {
    console.log(`   Error: ${await res1.text()}`);
  }

  // Test 2: With include_groups URL encoded
  console.log("\nTest 2: With include_groups (URL encoded)");
  const params2 = new URLSearchParams({
    include_groups: "album,single",
    limit: "5",
    market: "MX"
  });
  const url2 = `https://api.spotify.com/v1/artists/${artistId}/albums?${params2.toString()}`;
  const res2 = await fetch(url2, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  console.log(`   Status: ${res2.status}`);
  if (res2.ok) {
    const data2 = await res2.json() as AlbumsResponse;
    console.log(`   Albums found: ${data2.items?.length} of ${data2.total}`);
  } else {
    console.log(`   Error: ${await res2.text()}`);
  }

  // Test 3: Direct string (not encoded)
  console.log("\nTest 3: Direct string (not encoded)");
  const url3 = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=5&market=MX`;
  const res3 = await fetch(url3, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  console.log(`   Status: ${res3.status}`);
  if (res3.ok) {
    const data3 = await res3.json() as AlbumsResponse;
    console.log(`   Albums found: ${data3.items?.length} of ${data3.total}`);
  } else {
    console.log(`   Error: ${await res3.text()}`);
  }

  console.log("\n✅ Test complete");
}

main().catch(console.error);
