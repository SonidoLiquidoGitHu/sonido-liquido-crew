// Search for missing artist releases using alternative search terms
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

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

// Artists that returned 0 results with alternative search terms
const MISSING_ARTISTS = [
  {
    name: "Brez",
    spotifyId: "2jJmTEMkGQfH3BxoG3MQvF",
    altSearches: ["Brez hip hop", "Brez mexico", "Brez rap"]
  },
  {
    name: "Dilema",
    spotifyId: "3eCEorgAoZkvnAQLdy4x38",
    altSearches: ["Dilema hip hop", "Dilema mexico", "Dilema SLC"]
  },
  {
    name: "Codak",
    spotifyId: "2zrv1oduhIYh29vvQZwI5r",
    altSearches: ["Codak producer", "Codak beats", "Codak mexico"]
  },
  {
    name: "X Santa-Ana",
    spotifyId: "2Apt0MjZGqXAd1pl4LNQrR",
    altSearches: ["X Santa-Ana", "X Santa Ana", "XSanta-Ana"]
  },
  {
    name: "Fancy Freak",
    spotifyId: "5TMoczTLclVyzzDY5qf3Yb",
    altSearches: ["Fancy Freak DJ", "Fancy Freak hip hop", "FancyFreak"]
  },
  {
    name: "Q Master Weed",
    spotifyId: "4T4Z7jvUcMV16VsslRRuC5",
    altSearches: ["Q Master Weed", "QMasterWeed", "Q Master"]
  },
  {
    name: "Reick One",
    spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ",
    altSearches: ["Reick One", "ReickOne", "Reick"]
  },
  {
    name: "Chas 7P",
    spotifyId: "3RAg8fPmZ8RnacJO8MhLP1",
    altSearches: ["Chas 7P", "Chas7P", "Chas 7 Pecados"]
  },
];

async function main() {
  console.log("\n🔍 SEARCHING FOR MISSING ARTIST RELEASES\n");
  console.log("=".repeat(55));

  // Get token
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

  const allFoundReleases: { artist: string; albums: Album[] }[] = [];

  for (const artist of MISSING_ARTISTS) {
    console.log(`\n🎤 ${artist.name} (ID: ${artist.spotifyId})`);
    console.log("-".repeat(45));

    let foundAlbums: Album[] = [];

    // First, try to get artist info directly
    const artistUrl = `https://api.spotify.com/v1/artists/${artist.spotifyId}`;
    const artistResponse = await fetch(artistUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (artistResponse.ok) {
      const artistData = await artistResponse.json();
      console.log(`   Artist found: ${artistData.name}`);
      console.log(`   Followers: ${artistData.followers?.total || 0}`);
      console.log(`   Popularity: ${artistData.popularity || 0}`);
    } else if (artistResponse.status === 429) {
      const retryAfter = artistResponse.headers.get("Retry-After");
      console.log(`   ⏳ Rate limited for artist endpoint (${retryAfter}s)`);
    } else {
      console.log(`   ⚠️ Artist endpoint: ${artistResponse.status}`);
    }

    // Try each alternative search
    for (const searchTerm of [artist.name, ...artist.altSearches]) {
      const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchTerm)}&type=album`;

      const response = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 429) {
        console.log(`   ⏳ Rate limited on "${searchTerm}"`);
        continue;
      }

      if (!response.ok) {
        console.log(`   ❌ Search "${searchTerm}": ${response.status}`);
        continue;
      }

      const data = await response.json();
      const albums = (data.albums?.items || []) as Album[];

      // Filter by spotify artist ID
      const artistAlbums = albums.filter(album =>
        album.artists.some(a => a.id === artist.spotifyId)
      );

      if (artistAlbums.length > 0) {
        console.log(`   ✅ "${searchTerm}": Found ${artistAlbums.length} releases`);
        for (const album of artistAlbums) {
          if (!foundAlbums.some(a => a.id === album.id)) {
            foundAlbums.push(album);
            console.log(`      - ${album.name} (${album.album_type})`);
          }
        }
      } else {
        console.log(`   ⏭️ "${searchTerm}": No matching releases`);
      }

      // Small delay
      await new Promise(r => setTimeout(r, 300));
    }

    if (foundAlbums.length > 0) {
      allFoundReleases.push({ artist: artist.name, albums: foundAlbums });
    }

    await new Promise(r => setTimeout(r, 500));
  }

  // Summary
  console.log("\n" + "=".repeat(55));
  console.log("📊 SUMMARY\n");

  let total = 0;
  for (const { artist, albums } of allFoundReleases) {
    console.log(`   ${artist}: ${albums.length} releases`);
    total += albums.length;
  }

  if (total === 0) {
    console.log("   No additional releases found.");
    console.log("\n   These artists may have:");
    console.log("   - Releases only as featured artists");
    console.log("   - Releases under different names");
    console.log("   - Very few or no releases on Spotify");
  } else {
    console.log(`\n   Total new releases found: ${total}`);
  }

  console.log("=".repeat(55) + "\n");

  // If found releases, save them
  if (total > 0) {
    console.log("💾 Saving to database...\n");

    const { createClient } = await import("@libsql/client");
    const { drizzle } = await import("drizzle-orm/libsql");
    const { eq } = await import("drizzle-orm");
    const { text, integer, sqliteTable } = await import("drizzle-orm/sqlite-core");

    const DATABASE_URL = process.env.DATABASE_URL!;
    const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

    const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN });
    const db = drizzle(client);

    const artists = sqliteTable("artists", {
      id: text("id").primaryKey(),
      name: text("name").notNull(),
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

    for (const { artist: artistName, albums } of allFoundReleases) {
      const [artistRecord] = await db
        .select()
        .from(artists)
        .where(eq(artists.name, artistName))
        .limit(1);

      if (!artistRecord) continue;

      for (const album of albums) {
        const [existing] = await db
          .select()
          .from(releases)
          .where(eq(releases.spotifyId, album.id))
          .limit(1);

        if (existing) {
          skipped++;
          continue;
        }

        let releaseType = "single";
        if (album.album_type === "album") {
          releaseType = album.total_tracks > 6 ? "album" : "ep";
        } else if (album.album_type === "compilation") {
          releaseType = "compilation";
        }

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

    console.log(`\n   Saved: ${created} created, ${skipped} skipped`);
  }
}

main().catch(console.error);
