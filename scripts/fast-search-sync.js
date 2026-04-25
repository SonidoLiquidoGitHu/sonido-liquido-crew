#!/usr/bin/env node
/**
 * Fast search-based release sync for SLC artists.
 * Uses Spotify search endpoint with year-range queries.
 */

const CID = "d43c9d6653a241148c6926322b0c9568";
const CS = "d3cafe4dae714bea8eb93e0ce79770b6";

const ARTISTS = [
  { name: "Zaque", spotifyId: "4WQmw3fIx9F7iPKL5v8SCN", searchName: "Zaque" },
  { name: "Doctor Destino", spotifyId: "5urer15JPbCELf17LVia7w", searchName: "Doctor Destino" },
  { name: "Brez", spotifyId: "2jJmTEMkGQfH3BxoG3MQvF", searchName: "Brez" },
  { name: "Dilema", spotifyId: "3eCEorgAoZkvnAQLdy4x38", searchName: "Dilema Sonido Liquido" },
  { name: "Bruno Grasso", spotifyId: "4fNQqyvcM71IyF2EitEtCj", searchName: "Bruno Grasso" },
  { name: "Latin Geisha", spotifyId: "16YScXC67nAnFDcA2LGdY0", searchName: "Latin Geisha" },
  { name: "Pepe Levine", spotifyId: "5HrBwfVDf0HXzGDrJ6Znqc", searchName: "Pepe Levine" },
  { name: "Chas7p", spotifyId: "3RAg8fPmZ8RnacJO8MhLP1", searchName: "Chas7p" },
  { name: "Codak", spotifyId: "2zrv1oduhIYh29vvQZwI5r", searchName: "Codak Sonido Liquido" },
  { name: "Fancy Freak", spotifyId: "5TMoczTLclVyzzDY5qf3Yb", searchName: "Fancy Freak Sonido Liquido" },
  { name: "Hassyel", spotifyId: "6AN9ek9RwrLbSp9rT2lcDG", searchName: "Hassyel Sonido Liquido" },
  { name: "Kev Cabrone", spotifyId: "0QdRhOmiqAcV1dPCoiSIQJ", searchName: "Kev Cabrone" },
  { name: "QMW", spotifyId: "4T4Z7jvUcMV16VsslRRuC5", searchName: "QMW Sonido Liquido" },
  { name: "Reick Uno", spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ", searchName: "Reick Uno" },
  { name: "X Santa-Ana", spotifyId: "2Apt0MjZGqXAd1pl4LNQrR", searchName: "X Santa-Ana" },
];

// Use shorter year ranges for prolific artists, longer for others
const YEAR_RANGES = [
  "2000-2012", "2013-2016", "2017-2019", "2020-2021", "2022-2023", "2024-2026"
];

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
  if (data.error) throw new Error("Token error: " + data.error);
  token = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return token;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function searchReleases(artistName, yearRange, market = "MX") {
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
  
  if (res.status !== 200) return [];
  const data = await res.json();
  return data.albums?.items || [];
}

async function main() {
  console.log("SLC Search-Based Release Sync (Fast)");
  console.log("====================================\n");
  
  process.env.DATABASE_URL = "postgresql://neondb_owner:npg_ukaxCK3os1LG@ep-dawn-tree-an5f4b05-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
  
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  
  // Get existing releases
  const existing = await prisma.release.findMany({ 
    where: { spotifyUrl: { not: null } },
    select: { spotifyUrl: true } 
  });
  const existingUrls = new Set(existing.map(r => r.spotifyUrl));
  console.log(`Currently ${existingUrls.size} releases in DB\n`);
  
  // Get artists
  const dbArtists = await prisma.artist.findMany();
  const artistMap = new Map(dbArtists.map(r => [r.spotifyId, r]));
  
  let totalNew = 0;
  
  for (const artist of ARTISTS) {
    process.stdout.write(`${artist.name}: `);
    const dbArtist = artistMap.get(artist.spotifyId);
    if (!dbArtist) { console.log("NOT IN DB"); continue; }
    
    const artistReleases = new Map();
    
    for (const yr of YEAR_RANGES) {
      const albums = await searchReleases(artist.searchName, yr);
      for (const album of albums) {
        const belongsToArtist = album.artists.some(a => a.id === artist.spotifyId);
        if (!belongsToArtist) continue;
        const spotifyUrl = album.external_urls?.spotify;
        if (!spotifyUrl || artistReleases.has(spotifyUrl)) continue;
        artistReleases.set(spotifyUrl, {
          name: album.name,
          releaseDate: album.release_date,
          type: album.album_type,
          coverUrl: album.images?.[0]?.url || null,
          spotifyUrl,
        });
      }
      await sleep(150);
    }
    
    const newReleases = [...artistReleases.values()].filter(r => !existingUrls.has(r.spotifyUrl));
    console.log(`${artistReleases.size} found, ${newReleases.length} new`);
    
    for (const r of newReleases) {
      try {
        const slug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") 
          + "-" + Math.random().toString(36).slice(2, 8);
        await prisma.release.create({
          data: {
            title: r.name,
            slug,
            type: r.type === "album" ? "album" : r.type === "compilation" ? "compilation" : "single",
            artistId: dbArtist.id,
            coverUrl: r.coverUrl,
            releaseDate: r.releaseDate ? new Date(r.releaseDate) : null,
            spotifyUrl: r.spotifyUrl,
          }
        });
        totalNew++;
        existingUrls.add(r.spotifyUrl);
      } catch (err) {
        console.log(`  ERR: ${r.name}: ${err.message.slice(0, 80)}`);
      }
    }
  }
  
  console.log(`\nInserted ${totalNew} new releases.`);
  
  const total = await prisma.release.count();
  console.log(`Total releases in DB: ${total}`);
  
  await prisma.$disconnect();
}

main().catch(err => { console.error(err.message); process.exit(1); });
