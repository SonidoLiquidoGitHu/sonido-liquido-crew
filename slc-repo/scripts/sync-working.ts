// Working Sync Script - uses same fetch approach as the working test

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

// Spotify album info from search
interface Album {
  id: string;
  name: string;
  album_type: string;
  release_date: string;
  total_tracks: number;
  images: { url: string }[];
  external_urls: { spotify: string };
  artists: { id: string; name: string }[];
}

// Artist info with spotify ID
const SLC_ARTISTS = [
  { name: "Zaque", spotifyId: "4WQmw3fIx9F7iPKL5v8SCN" },
  { name: "Doctor Destino", spotifyId: "5urer15JPbCELf17LVia7w" },
  { name: "Brez", spotifyId: "2jJmTEMkGQfH3BxoG3MQvF" },
  { name: "Bruno Grasso", spotifyId: "4fNQqyvcM71IyF2EitEtCj" },
  { name: "Dilema", spotifyId: "3eCEorgAoZkvnAQLdy4x38" },
  { name: "Codak", spotifyId: "2zrv1oduhIYh29vvQZwI5r" },
  { name: "Kev Cabrone", spotifyId: "0QdRhOmiqAcV1dPCoiSIQJ" },
  { name: "Hassyel", spotifyId: "6AN9ek9RwrLbSp9rT2lcDG" },
  { name: "X Santa-Ana", spotifyId: "2Apt0MjZGqXAd1pl4LNQrR" },
  { name: "Fancy Freak", spotifyId: "5TMoczTLclVyzzDY5qf3Yb" },
  { name: "Q Master Weed", spotifyId: "4T4Z7jvUcMV16VsslRRuC5" },
  { name: "Reick One", spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ" },
  { name: "Latin Geisha", spotifyId: "16YScXC67nAnFDcA2LGdY0" },
  { name: "Pepe Levine", spotifyId: "5HrBwfVDf0HXzGDrJ6Znqc" },
  { name: "Chas 7P", spotifyId: "3RAg8fPmZ8RnacJO8MhLP1" },
];

async function main() {
  console.log("\n🎵 SPOTIFY RELEASES SYNC\n");
  console.log("=".repeat(50));

  // Get token - same as working test
  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");

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

  if (!token) {
    console.error("❌ Failed to get token");
    return;
  }
  console.log("✅ Token obtained\n");

  // Collect all releases for each artist
  const allReleases: { artist: string; albums: Album[] }[] = [];

  for (const artist of SLC_ARTISTS) {
    console.log(`\n🎤 Searching: ${artist.name}`);

    // Use exact same URL format as working test
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist.name)}&type=album`;

    const response = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`   Status: ${response.status}`);

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After") || "60";
      console.log(`   ⏳ Rate limited, retry after ${retryAfter}s`);
      continue;
    }

    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ Error: ${error.substring(0, 100)}`);
      continue;
    }

    const data = await response.json();
    const albums = (data.albums?.items || []) as Album[];

    // Filter to only albums where this artist is included
    const artistAlbums = albums.filter(album =>
      album.artists.some(a => a.id === artist.spotifyId)
    );

    console.log(`   ✅ Found ${artistAlbums.length} releases`);

    allReleases.push({ artist: artist.name, albums: artistAlbums });

    // Log first few albums
    for (const album of artistAlbums.slice(0, 3)) {
      console.log(`      - ${album.name} (${album.album_type})`);
    }
    if (artistAlbums.length > 3) {
      console.log(`      ... and ${artistAlbums.length - 3} more`);
    }

    // Delay between requests
    await new Promise(r => setTimeout(r, 500));
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 SUMMARY\n");

  let total = 0;
  for (const { artist, albums } of allReleases) {
    console.log(`   ${artist}: ${albums.length} releases`);
    total += albums.length;
  }

  console.log(`\n   Total: ${total} releases found`);
  console.log("=".repeat(50) + "\n");

  // Now save to database
  console.log("💾 Saving to database...\n");

  // Import database
  const { createClient } = await import("@libsql/client");
  const { drizzle } = await import("drizzle-orm/libsql");
  const { eq } = await import("drizzle-orm");
  const { text, integer, sqliteTable } = await import("drizzle-orm/sqlite-core");

  const DATABASE_URL = process.env.DATABASE_URL!;
  const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

  const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN });
  const db = drizzle(client);

  // Schema
  const artists = sqliteTable("artists", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
  });

  const releases = sqliteTable("releases", {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    releaseType: text("release_type"),
    releaseDate: integer("release_date", { mode: "timestamp" }),
    coverImageUrl: text("cover_image_url"),
    spotifyId: text("spotify_id").unique(),
    spotifyUrl: text("spotify_url"),
    description: text("description"),
    isUpcoming: integer("is_upcoming", { mode: "boolean" }),
    isFeatured: integer("is_featured", { mode: "boolean" }),
    createdAt: integer("created_at", { mode: "timestamp" }),
    updatedAt: integer("updated_at", { mode: "timestamp" }),
  });

  const releaseArtists = sqliteTable("release_artists", {
    id: text("id").primaryKey(),
    releaseId: text("release_id").notNull(),
    artistId: text("artist_id").notNull(),
    isPrimary: integer("is_primary", { mode: "boolean" }),
  });

  // Helper functions
  function generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  let created = 0;
  let skipped = 0;

  for (const { artist: artistName, albums } of allReleases) {
    // Find artist in DB
    const [artistRecord] = await db
      .select()
      .from(artists)
      .where(eq(artists.name, artistName))
      .limit(1);

    if (!artistRecord) {
      console.log(`   ⚠️ Artist "${artistName}" not found in DB`);
      continue;
    }

    for (const album of albums) {
      // Check if exists
      const [existing] = await db
        .select()
        .from(releases)
        .where(eq(releases.spotifyId, album.id))
        .limit(1);

      if (existing) {
        skipped++;
        continue;
      }

      // Determine type
      let releaseType = "single";
      if (album.album_type === "album") {
        releaseType = album.total_tracks > 6 ? "album" : "ep";
      } else if (album.album_type === "compilation") {
        releaseType = "compilation";
      }

      // Create slug
      let baseSlug = slugify(album.name);
      let slug = baseSlug;
      let counter = 1;

      while (true) {
        const [existingSlug] = await db
          .select()
          .from(releases)
          .where(eq(releases.slug, slug))
          .limit(1);

        if (!existingSlug) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Insert
      const releaseId = generateUUID();
      const releaseDate = new Date(album.release_date);

      await db.insert(releases).values({
        id: releaseId,
        title: album.name,
        slug,
        releaseType,
        releaseDate,
        coverImageUrl: album.images?.[0]?.url || null,
        spotifyId: album.id,
        spotifyUrl: album.external_urls?.spotify || null,
        description: `${releaseType} de ${artistName}`,
        isUpcoming: releaseDate > new Date(),
        isFeatured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.insert(releaseArtists).values({
        id: generateUUID(),
        releaseId,
        artistId: artistRecord.id,
        isPrimary: true,
      });

      created++;
      console.log(`   ✅ ${album.name}`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`📊 SAVED: ${created} created, ${skipped} skipped`);
  console.log("=".repeat(50) + "\n");
}

main().catch(console.error);
