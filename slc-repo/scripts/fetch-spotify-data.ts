/**
 * Script to fetch real release data from Spotify for all Sonido Líquido Crew artists
 * Run with: bun run scripts/fetch-spotify-data.ts
 */

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "d43c9d6653a241148c6926322b0c9568";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "d3cafe4dae714bea8eb93e0ce79770b6";

// All Sonido Líquido Crew artists with their Spotify IDs
const ARTISTS = [
  { name: "Zaque", spotifyId: "4WQmw3fIx9F7iPKL5v8SCN", role: "mc", tintColor: "cyan", isFeatured: true, sortOrder: 1 },
  { name: "Doctor Destino", spotifyId: "5urer15JPbCELf17LVia7w", role: "mc", tintColor: "green", isFeatured: true, sortOrder: 2 },
  { name: "Brez", spotifyId: "2jJmTEMkGQfH3BxoG3MQvF", role: "mc", tintColor: "pink", isFeatured: true, sortOrder: 3 },
  { name: "Bruno Grasso", spotifyId: "4fNQqyvcM71IyF2EitEtCj", role: "mc", tintColor: "purple", isFeatured: false, sortOrder: 4 },
  { name: "Dilema", spotifyId: "3eCEorgAoZkvnAQLdy4x38", role: "mc", tintColor: "orange", isFeatured: false, sortOrder: 5 },
  { name: "Codak", spotifyId: "2zrv1oduhIYh29vvQZwI5r", role: "mc", tintColor: "yellow", isFeatured: false, sortOrder: 6 },
  { name: "Kev Cabrone", spotifyId: "0QdRhOmiqAcV1dPCoiSIQJ", role: "mc", tintColor: "cyan", isFeatured: false, sortOrder: 7 },
  { name: "Hassyel", spotifyId: "6AN9ek9RwrLbSp9rT2lcDG", role: "mc", tintColor: "green", isFeatured: false, sortOrder: 8 },
  { name: "X Santa-Ana", spotifyId: "2Apt0MjZGqXAd1pl4LNQrR", role: "lado_b", tintColor: "pink", isFeatured: true, sortOrder: 9 },
  { name: "Fancy Freak", spotifyId: "5TMoczTLclVyzzDY5qf3Yb", role: "dj", tintColor: "purple", isFeatured: false, sortOrder: 10 },
  { name: "Q Master Weed", spotifyId: "4T4Z7jvUcMV16VsslRRuC5", role: "dj", tintColor: "orange", isFeatured: false, sortOrder: 11 },
  { name: "Chas7p", spotifyId: "3RAg8fPmZ8RnacJO8MhLP1", role: "dj", tintColor: "yellow", isFeatured: false, sortOrder: 12 },
  { name: "Reick One", spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ", role: "dj", tintColor: "cyan", isFeatured: false, sortOrder: 13 },
  { name: "Latin Geisha", spotifyId: "16YScXC67nAnFDcA2LGdY0", role: "cantante", tintColor: "pink", isFeatured: false, sortOrder: 14 },
  { name: "Pepe Levine", spotifyId: "5HrBwfVDf0HXzGDrJ6Znqc", role: "divo", tintColor: "purple", isFeatured: false, sortOrder: 15 },
];

interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; height: number; width: number }[];
  followers: { total: number };
  genres: string[];
  popularity: number;
  external_urls: { spotify: string };
}

interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: "album" | "single" | "compilation";
  release_date: string;
  release_date_precision: "year" | "month" | "day";
  total_tracks: number;
  images: { url: string; height: number; width: number }[];
  external_urls: { spotify: string };
  artists: { id: string; name: string }[];
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      // Rate limited - wait and retry
      const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
      console.log(`   ⏳ Rate limited, waiting ${retryAfter} seconds...`);
      await sleep(retryAfter * 1000);
      continue;
    }

    return response;
  }

  throw new Error("Max retries exceeded");
}

async function getSpotifyToken(): Promise<string> {
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Failed to get Spotify token: ${response.statusText}`);
  }

  const data: SpotifyToken = await response.json();
  return data.access_token;
}

async function getArtistInfo(token: string, artistId: string): Promise<SpotifyArtist | null> {
  try {
    const response = await fetchWithRetry(
      `https://api.spotify.com/v1/artists/${artistId}`,
      { headers: { "Authorization": `Bearer ${token}` } }
    );

    if (!response.ok) {
      console.error(`   ⚠ Failed to fetch artist ${artistId}: ${response.status}`);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error(`   ⚠ Error fetching artist ${artistId}:`, error);
    return null;
  }
}

async function getArtistAlbums(token: string, artistId: string): Promise<SpotifyAlbum[]> {
  const albums: SpotifyAlbum[] = [];

  try {
    const response = await fetchWithRetry(
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single,compilation&limit=50&market=MX`,
      { headers: { "Authorization": `Bearer ${token}` } }
    );

    if (!response.ok) {
      console.error(`   ⚠ Failed to fetch albums: ${response.status}`);
      return albums;
    }

    const data = await response.json();
    albums.push(...data.items);
  } catch (error) {
    console.error(`   ⚠ Error fetching albums:`, error);
  }

  return albums;
}

function mapAlbumType(type: string): string {
  switch (type) {
    case "album": return "album";
    case "single": return "single";
    case "compilation": return "compilation";
    default: return "album";
  }
}

async function main() {
  console.log("🎵 Fetching Spotify data for Sonido Líquido Crew artists...\n");

  const token = await getSpotifyToken();
  console.log("✓ Authenticated with Spotify\n");

  const artistsData: any[] = [];
  const releasesData: any[] = [];
  const seenReleases = new Set<string>(); // To avoid duplicates

  for (const artist of ARTISTS) {
    console.log(`📀 Fetching data for ${artist.name}...`);

    // Wait between artists to avoid rate limiting
    await sleep(1000);

    // Get artist info
    const artistInfo = await getArtistInfo(token, artist.spotifyId);
    if (!artistInfo) {
      continue;
    }

    const profileImage = artistInfo.images[0]?.url || null;

    artistsData.push({
      name: artist.name,
      role: artist.role,
      bio: `Artista de Sonido Líquido Crew. ${artistInfo.followers.total.toLocaleString()} seguidores en Spotify.`,
      profileImageUrl: profileImage,
      tintColor: artist.tintColor,
      isFeatured: artist.isFeatured,
      sortOrder: artist.sortOrder,
      spotifyId: artist.spotifyId,
      spotifyUrl: artistInfo.external_urls.spotify,
      popularity: artistInfo.popularity,
      followers: artistInfo.followers.total,
    });

    // Wait before fetching albums
    await sleep(500);

    // Get albums
    const albums = await getArtistAlbums(token, artist.spotifyId);
    console.log(`   ✓ Found ${albums.length} releases`);

    for (const album of albums) {
      // Create unique key to avoid duplicates
      const releaseKey = `${album.name.toLowerCase()}-${album.release_date}`;
      if (seenReleases.has(releaseKey)) continue;
      seenReleases.add(releaseKey);

      const coverImage = album.images[0]?.url || null;

      releasesData.push({
        title: album.name,
        releaseType: mapAlbumType(album.album_type),
        releaseDate: album.release_date,
        spotifyId: album.id,
        spotifyUrl: album.external_urls.spotify,
        coverImageUrl: coverImage,
        primaryArtist: artist.name,
        totalTracks: album.total_tracks,
      });
    }
  }

  // Sort releases by date (newest first)
  releasesData.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());

  console.log("\n📊 Summary:");
  console.log(`   • ${artistsData.length} artists`);
  console.log(`   • ${releasesData.length} unique releases`);

  // Output the data as TypeScript
  console.log("\n\n// ==========================================");
  console.log("// ARTISTS DATA (Copy to seed.ts)");
  console.log("// ==========================================\n");

  console.log("const artistsData = [");
  for (const artist of artistsData) {
    console.log(`  {
    name: "${artist.name}",
    role: "${artist.role}" as const,
    bio: "${artist.bio}",
    profileImageUrl: ${artist.profileImageUrl ? `"${artist.profileImageUrl}"` : "null"},
    tintColor: "${artist.tintColor}",
    isFeatured: ${artist.isFeatured},
    sortOrder: ${artist.sortOrder},
    spotify: "${artist.spotifyUrl}",
    spotifyId: "${artist.spotifyId}",
    followers: ${artist.followers},
  },`);
  }
  console.log("];");

  console.log("\n\n// ==========================================");
  console.log("// RELEASES DATA (Copy to seed.ts)");
  console.log("// ==========================================\n");

  console.log("const releasesData = [");
  // Output first 50 releases for seed
  for (const release of releasesData.slice(0, 50)) {
    console.log(`  {
    title: ${JSON.stringify(release.title)},
    releaseType: "${release.releaseType}" as const,
    releaseDate: new Date("${release.releaseDate}"),
    spotifyId: "${release.spotifyId}",
    spotifyUrl: "${release.spotifyUrl}",
    coverImageUrl: ${release.coverImageUrl ? `"${release.coverImageUrl}"` : "null"},
    primaryArtist: "${release.primaryArtist}",
  },`);
  }
  console.log("];");

  console.log("\n✅ Done! Copy the data above to your seed.ts file.");
}

main().catch(console.error);
