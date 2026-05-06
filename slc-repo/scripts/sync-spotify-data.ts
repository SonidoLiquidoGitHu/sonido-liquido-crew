import { config } from "dotenv";
config();

import { db } from "../src/db/client";
import { artists, artistExternalProfiles, releases, releaseArtists } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { generateUUID, slugify } from "../src/lib/utils";

// ===========================================
// REAL ARTIST DATA WITH VERIFIED SPOTIFY IDS
// ===========================================

const artistsRealData = [
  {
    name: "Zaque",
    spotifyId: "4WQmw3fIx9F7iPKL5v8SCN",
    spotify: "https://open.spotify.com/artist/4WQmw3fIx9F7iPKL5v8SCN",
    instagram: "https://www.instagram.com/zaqueslc",
    youtube: "https://youtube.com/@zakeuno",
  },
  {
    name: "Doctor Destino",
    spotifyId: "5urer15JPbCELf17LVia7w",
    spotify: "https://open.spotify.com/artist/5urer15JPbCELf17LVia7w",
    instagram: "https://www.instagram.com/estoesdoctordestino",
    youtube: "https://youtube.com/@doctordestinohiphop",
  },
  {
    name: "Brez",
    spotifyId: "2jJmTEMkGQfH3BxoG3MQvF",
    spotify: "https://open.spotify.com/artist/2jJmTEMkGQfH3BxoG3MQvF",
    instagram: "https://www.instagram.com/brez_idc",
    youtube: "https://youtube.com/@brezhiphopmexicoslc25",
  },
  {
    name: "Bruno Grasso",
    spotifyId: "4fNQqyvcM71IyF2EitEtCj",
    spotify: "https://open.spotify.com/artist/4fNQqyvcM71IyF2EitEtCj",
    instagram: "https://www.instagram.com/brunograssosl",
    youtube: "https://youtube.com/@brunograssosl",
  },
  {
    name: "Dilema",
    spotifyId: "3eCEorgAoZkvnAQLdy4x38",
    spotify: "https://open.spotify.com/artist/3eCEorgAoZkvnAQLdy4x38",
    instagram: "https://www.instagram.com/dilema_ladee",
    youtube: "https://youtube.com/@dilema999",
  },
  {
    name: "Codak",
    spotifyId: "2zrv1oduhIYh29vvQZwI5r",
    spotify: "https://open.spotify.com/artist/2zrv1oduhIYh29vvQZwI5r",
    instagram: "https://www.instagram.com/ilikebigbuds_i_canot_lie",
    youtube: "https://youtu.be/1K7VwrXGCr8",
  },
  {
    name: "Kev Cabrone",
    spotifyId: "0QdRhOmiqAcV1dPCoiSIQJ",
    spotify: "https://open.spotify.com/artist/0QdRhOmiqAcV1dPCoiSIQJ",
    instagram: "https://www.instagram.com/kev.cabrone",
    youtube: "https://youtube.com/@kevcabrone",
  },
  {
    name: "Hassyel",
    spotifyId: "6AN9ek9RwrLbSp9rT2lcDG",
    spotify: "https://open.spotify.com/artist/6AN9ek9RwrLbSp9rT2lcDG",
    instagram: "https://www.instagram.com/ilikebigbuds_i_canot_lie",
    youtube: "https://youtube.com/channel/UCZp_YCv7jK3-lEtvSONNs8A",
  },
  {
    name: "X Santa-Ana",
    spotifyId: "2Apt0MjZGqXAd1pl4LNQrR",
    spotify: "https://open.spotify.com/artist/2Apt0MjZGqXAd1pl4LNQrR",
    instagram: "https://www.instagram.com/x_santa_ana",
    youtube: "https://youtube.com/@xsanta-ana",
  },
  {
    name: "Fancy Freak",
    spotifyId: "5TMoczTLclVyzzDY5qf3Yb",
    spotify: "https://open.spotify.com/artist/5TMoczTLclVyzzDY5qf3Yb",
    instagram: "https://www.instagram.com/fancyfreakcorp",
    youtube: "https://youtube.com/@fancyfreakdj",
  },
  {
    name: "Q Master Weed",
    spotifyId: "4T4Z7jvUcMV16VsslRRuC5",
    spotify: "https://open.spotify.com/artist/4T4Z7jvUcMV16VsslRRuC5",
    instagram: "https://www.instagram.com/q.masterw",
    youtube: "https://youtube.com/@qmasterw",
  },
  {
    name: "Chas7p",
    spotifyId: "3RAg8fPmZ8RnacJO8MhLP1",
    spotify: "https://open.spotify.com/artist/3RAg8fPmZ8RnacJO8MhLP1",
    instagram: "https://www.instagram.com/chas7pecados",
    youtube: "https://youtube.com/@chas7p347",
  },
  {
    name: "Reick One",
    spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ",
    spotify: "https://open.spotify.com/artist/4UqFXhJVb9zy2SbNx4ycJQ",
    instagram: "https://www.instagram.com/reickuno",
    youtube: "https://youtube.com/channel/UCMvZBwXGDTnXVV7NbYKWfaA",
  },
  {
    name: "Latin Geisha",
    spotifyId: "16YScXC67nAnFDcA2LGdY0",
    spotify: "https://open.spotify.com/artist/16YScXC67nAnFDcA2LGdY0",
    instagram: "https://www.instagram.com/latingeishamx",
    youtube: "https://youtube.com/@latingeishamx",
  },
  {
    name: "Pepe Levine",
    spotifyId: "5HrBwfVDf0HXzGDrJ6Znqc",
    spotify: "https://open.spotify.com/artist/5HrBwfVDf0HXzGDrJ6Znqc",
    instagram: "https://www.instagram.com/pepelevineonline",
    youtube: "https://youtu.be/rdZTYthV1nI",
  },
];

// ===========================================
// SPOTIFY API FUNCTIONS
// ===========================================

let cachedToken: string | null = null;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials not configured");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Failed to get Spotify token: ${response.statusText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  return cachedToken!;
}

async function getSpotifyArtist(artistId: string) {
  const token = await getSpotifyToken();
  const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    console.error(`Failed to fetch artist ${artistId}: ${response.statusText}`);
    return null;
  }

  return response.json();
}

async function getSpotifyArtistAlbums(artistId: string, retries = 3): Promise<any[]> {
  const token = await getSpotifyToken();
  // Use URL encoding for the comma
  const url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album%2Csingle&limit=20`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 429) {
    // Rate limited - wait and retry
    const retryAfter = parseInt(response.headers.get("Retry-After") || "5", 10);
    console.log(`   ⏳ Rate limited, waiting ${retryAfter}s...`);
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    if (retries > 0) {
      return getSpotifyArtistAlbums(artistId, retries - 1);
    }
    return [];
  }

  if (!response.ok) {
    console.error(`   ❌ Failed to fetch albums: ${response.status}`);
    return [];
  }

  const data = await response.json();
  return data.items || [];
}

// ===========================================
// SYNC FUNCTION
// ===========================================

async function syncSpotifyData() {
  console.log("🎵 Starting Spotify data sync...\n");

  // Verify token works
  try {
    await getSpotifyToken();
    console.log("✓ Got Spotify access token\n");
  } catch (error) {
    console.error("❌ Failed to get Spotify token:", error);
    process.exit(1);
  }

  // Process each artist
  for (const artistData of artistsRealData) {
    console.log(`\n📀 Processing: ${artistData.name}`);

    // Find artist in database
    const [dbArtist] = await db
      .select()
      .from(artists)
      .where(eq(artists.name, artistData.name))
      .limit(1);

    if (!dbArtist) {
      console.log(`   ⚠️  Artist not found in database, skipping...`);
      continue;
    }

    // Fetch real Spotify data
    const spotifyArtist = await getSpotifyArtist(artistData.spotifyId);

    if (spotifyArtist) {
      // Update artist image
      const imageUrl = spotifyArtist.images?.[0]?.url || null;

      if (imageUrl) {
        await db
          .update(artists)
          .set({
            profileImageUrl: imageUrl,
            updatedAt: new Date(),
          })
          .where(eq(artists.id, dbArtist.id));
        console.log(`   ✓ Updated profile image`);
      }

      // Update/create external profiles
      // Delete existing profiles
      await db
        .delete(artistExternalProfiles)
        .where(eq(artistExternalProfiles.artistId, dbArtist.id));

      // Add Spotify profile
      await db.insert(artistExternalProfiles).values({
        id: generateUUID(),
        artistId: dbArtist.id,
        platform: "spotify",
        externalId: artistData.spotifyId,
        externalUrl: artistData.spotify,
        isVerified: true,
      });

      // Add Instagram profile
      if (artistData.instagram) {
        await db.insert(artistExternalProfiles).values({
          id: generateUUID(),
          artistId: dbArtist.id,
          platform: "instagram",
          externalUrl: artistData.instagram,
          handle: artistData.instagram.split("/").pop()?.split("?")[0] || null,
          isVerified: true,
        });
      }

      // Add YouTube profile
      if (artistData.youtube) {
        await db.insert(artistExternalProfiles).values({
          id: generateUUID(),
          artistId: dbArtist.id,
          platform: "youtube",
          externalUrl: artistData.youtube,
          handle: artistData.youtube.includes("@")
            ? artistData.youtube.split("@").pop()?.split("?")[0]
            : null,
          isVerified: true,
        });
      }

      console.log(`   ✓ Updated external profiles`);

      // Fetch and save albums
      const albums = await getSpotifyArtistAlbums(artistData.spotifyId);
      let albumCount = 0;

      for (const album of albums) {
        // Check if release already exists
        const [existingRelease] = await db
          .select()
          .from(releases)
          .where(eq(releases.spotifyId, album.id))
          .limit(1);

        if (existingRelease) {
          continue;
        }

        // Determine release type
        let releaseType: "album" | "single" | "ep" | "compilation" = "album";
        if (album.album_type === "single") releaseType = "single";
        else if (album.total_tracks <= 6) releaseType = "ep";

        // Create release
        const releaseId = generateUUID();
        const baseSlug = slugify(album.name);

        // Check if slug exists
        const [existingSlug] = await db
          .select()
          .from(releases)
          .where(eq(releases.slug, baseSlug))
          .limit(1);

        const finalSlug = existingSlug ? `${baseSlug}-${album.id.slice(0, 6)}` : baseSlug;

        try {
          await db.insert(releases).values({
            id: releaseId,
            title: album.name,
            slug: finalSlug,
            releaseType,
            releaseDate: new Date(album.release_date),
            spotifyId: album.id,
            spotifyUrl: album.external_urls.spotify,
            coverImageUrl: album.images?.[0]?.url || null,
            isUpcoming: new Date(album.release_date) > new Date(),
            isFeatured: false,
          });

          // Link to artist
          await db.insert(releaseArtists).values({
            id: generateUUID(),
            releaseId,
            artistId: dbArtist.id,
            isPrimary: true,
          });

          albumCount++;
        } catch (err) {
          // Skip duplicates
        }
      }

      if (albumCount > 0) {
        console.log(`   ✓ Added ${albumCount} releases`);
      }
    }

    // Longer delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Count totals
  const allReleases = await db.select().from(releases);

  console.log("\n✅ Sync completed!");
  console.log(`   • ${artistsRealData.length} artists processed`);
  console.log(`   • Total releases in database: ${allReleases.length}`);
}

// Run sync
syncSpotifyData().catch(console.error);
