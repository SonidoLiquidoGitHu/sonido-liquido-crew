#!/usr/bin/env node
/**
 * Search-based release sync for SLC artists.
 * Uses Spotify's search endpoint (not rate-limited) with year-range queries
 * to find releases that the albums endpoint missed.
 */

const CID = "d43c9d6653a241148c6926322b0c9568";
const CS = "d3cafe4dae714bea8eb93e0ce79770b6";
const DB_URL = "postgresql://neondb_owner:npg_ukaxCK3os1LG@ep-dawn-tree-an5f4b05-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const ARTISTS = [
  { name: "Brez", spotifyId: "2jJmTEMkGQfH3BxoG3MQvF", searchName: "Brez" },
  { name: "Bruno Grasso", spotifyId: "4fNQqyvcM71IyF2EitEtCj", searchName: "Bruno Grasso" },
  { name: "Chas7p", spotifyId: "3RAg8fPmZ8RnacJO8MhLP1", searchName: "Chas7p" },
  { name: "Codak", spotifyId: "2zrv1oduhIYh29vvQZwI5r", searchName: "Codak Sonido Liquido" },
  { name: "Dilema", spotifyId: "3eCEorgAoZkvnAQLdy4x38", searchName: "Dilema Sonido Liquido" },
  { name: "Doctor Destino", spotifyId: "5urer15JPbCELf17LVia7w", searchName: "Doctor Destino" },
  { name: "Fancy Freak", spotifyId: "5TMoczTLclVyzzDY5qf3Yb", searchName: "Fancy Freak Sonido Liquido" },
  { name: "Hassyel", spotifyId: "6AN9ek9RwrLbSp9rT2lcDG", searchName: "Hassyel Sonido Liquido" },
  { name: "Kev Cabrone", spotifyId: "0QdRhOmiqAcV1dPCoiSIQJ", searchName: "Kev Cabrone" },
  { name: "Latin Geisha", spotifyId: "16YScXC67nAnFDcA2LGdY0", searchName: "Latin Geisha" },
  { name: "Pepe Levine", spotifyId: "5HrBwfVDf0HXzGDrJ6Znqc", searchName: "Pepe Levine" },
  { name: "QMW", spotifyId: "4T4Z7jvUcMV16VsslRRuC5", searchName: "QMW Sonido Liquido" },
  { name: "Reick Uno", spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ", searchName: "Reick Uno" },
  { name: "X Santa-Ana", spotifyId: "2Apt0MjZGqXAd1pl4LNQrR", searchName: "X Santa-Ana" },
  { name: "Zaque", spotifyId: "4WQmw3fIx9F7iPKL5v8SCN", searchName: "Zaque" },
];

const YEAR_RANGES = [
  "2000-2008", "2009-2012", "2013-2015", "2016-2017",
  "2018-2019", "2020-2020", "2021-2021", "2022-2022",
  "2023-2023", "2024-2024", "2025-2026"
];

const MARKETS = ["MX", "US"];

let token = null;
let tokenExpiry = 0;

async function getToken() {
  if (token && Date.now() < tokenExpiry) return token;
  const auth = Buffer.from(CID + ":" + CS).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: "Basic " + auth, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  token = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return token;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function searchReleases(artistName, yearRange, market) {
  const t = await getToken();
  const query = encodeURIComponent(`artist:${artistName} year:${yearRange}`);
  const url = `https://api.spotify.com/v1/search?q=${query}&type=album&limit=10&market=${market}`;
  
  const res = await fetch(url, { headers: { Authorization: "Bearer " + t } });
  
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("retry-after") || "5");
    console.log(`  Rate limited, waiting ${retryAfter}s...`);
    await sleep(retryAfter * 1000);
    return searchReleases(artistName, yearRange, market);
  }
  
  if (res.status !== 200) {
    console.log(`  Search error (${res.status}) for ${artistName} ${yearRange} ${market}`);
    return [];
  }
  
  const data = await res.json();
  return data.albums?.items || [];
}

async function main() {
  console.log("SLC Search-Based Release Sync");
  console.log("=============================\n");
  
  const { Client } = require("pg");
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  
  // Get existing release spotifyUrls to avoid duplicates
  const existing = await client.query('SELECT "spotifyUrl" FROM "Release" WHERE "spotifyUrl" IS NOT NULL');
  const existingUrls = new Set(existing.rows.map(r => r.spotifyUrl));
  console.log(`Currently ${existingUrls.size} releases in DB with Spotify URLs\n`);
  
  // Get artist DB IDs
  const artistsRes = await client.query('SELECT id, name, "spotifyId" FROM "Artist"');
  const artistMap = new Map(artistsRes.rows.map(r => [r.spotifyId, r]));
  
  const allNewReleases = new Map();
  
  for (const artist of ARTISTS) {
    console.log(`\n${artist.name} (${artist.spotifyId})`);
    const dbArtist = artistMap.get(artist.spotifyId);
    if (!dbArtist) {
      console.log("  Not found in DB, skipping");
      continue;
    }
    
    const artistReleases = new Map();
    
    for (const yr of YEAR_RANGES) {
      for (const market of MARKETS) {
        const albums = await searchReleases(artist.searchName, yr, market);
        
        for (const album of albums) {
          const belongsToArtist = album.artists.some(a => a.id === artist.spotifyId);
          if (!belongsToArtist) continue;
          
          const spotifyUrl = album.external_urls?.spotify || null;
          if (!spotifyUrl) continue;
          
          if (!artistReleases.has(spotifyUrl)) {
            artistReleases.set(spotifyUrl, {
              name: album.name,
              releaseDate: album.release_date,
              type: album.album_type,
              coverUrl: album.images?.[0]?.url || null,
              spotifyUrl: spotifyUrl,
            });
          }
        }
        
        await sleep(200);
      }
    }
    
    const newReleases = [...artistReleases.values()].filter(r => !existingUrls.has(r.spotifyUrl));
    console.log(`  Found ${artistReleases.size} total, ${newReleases.length} new`);
    
    newReleases.forEach(r => console.log(`    + ${r.name} (${r.releaseDate}) [${r.type}]`));
    
    for (const r of newReleases) {
      allNewReleases.set(r.spotifyUrl, { ...r, artistId: dbArtist.id, artistName: artist.name });
    }
  }
  
  // Insert new releases
  console.log(`\n\nInserting ${allNewReleases.size} new releases...`);
  
  let inserted = 0;
  for (const [, release] of allNewReleases) {
    try {
      const releaseType = release.type === "album" ? "album" : 
                          release.type === "single" ? "single" : 
                          release.type === "compilation" ? "compilation" : "single";
      
      // Generate a slug
      const slug = release.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        + "-" + Date.now().toString(36);
      
      await client.query(`
        INSERT INTO "Release" (id, title, slug, type, "artistId", "coverUrl", "releaseDate", "spotifyUrl", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [
        release.name,
        slug,
        releaseType,
        release.artistId,
        release.coverUrl,
        release.releaseDate ? release.releaseDate : null,
        release.spotifyUrl,
      ]);
      inserted++;
    } catch (err) {
      console.log(`  Error inserting "${release.name}": ${err.message}`);
    }
  }
  
  console.log(`\nDone! Inserted ${inserted} new releases.`);
  
  // Print final counts
  const byArtist = await client.query(`
    SELECT a.name, COUNT(r.id) as cnt 
    FROM "Artist" a LEFT JOIN "Release" r ON r."artistId" = a.id 
    GROUP BY a.name ORDER BY cnt DESC
  `);
  console.log(`\nFinal totals:`);
  byArtist.rows.forEach(r => console.log(`  ${r.name}: ${r.cnt}`));
  const total = await client.query('SELECT COUNT(*) as cnt FROM "Release"');
  console.log(`  TOTAL: ${total.rows[0].cnt}`);
  
  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
