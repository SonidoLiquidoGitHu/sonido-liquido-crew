#!/usr/bin/env node
/**
 * Production Release Sync Script for SLC
 * 
 * Fetches ALL releases for all 15 SLC artists from Spotify.
 * Uses the /artists/{id}/albums endpoint with pagination.
 * 
 * Run this after rate limits expire.
 * Can also be triggered via: POST /api/admin/spotify/sync-releases
 * 
 * Usage: node scripts/sync-all-releases.js
 */

const CID = "d43c9d6653a241148c6926322b0c9568";
const CS = "d3cafe4dae714bea8eb93e0ce79770b6";
const DB_URL = "postgresql://neondb_owner:npg_ukaxCK3os1LG@ep-dawn-tree-an5f4b05-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const ARTISTS = [
  { name: "Brez", spotifyId: "2jJmTEMkGQfH3BxoG3MQvF" },
  { name: "Bruno Grasso", spotifyId: "4fNQqyvcM71IyF2EitEtCj" },
  { name: "Chas7p", spotifyId: "3RAg8fPmZ8RnacJO8MhLP1" },
  { name: "Codak", spotifyId: "2zrv1oduhIYh29vvQZwI5r" },
  { name: "Dilema", spotifyId: "3eCEorgAoZkvnAQLdy4x38" },
  { name: "Doctor Destino", spotifyId: "5urer15JPbCELf17LVia7w" },
  { name: "Fancy Freak", spotifyId: "5TMoczTLclVyzzDY5qf3Yb" },
  { name: "Hassyel", spotifyId: "6AN9ek9RwrLbSp9rT2lcDG" },
  { name: "Kev Cabrone", spotifyId: "0QdRhOmiqAcV1dPCoiSIQJ" },
  { name: "Latin Geisha", spotifyId: "16YScXC67nAnFDcA2LGdY0" },
  { name: "Pepe Levine", spotifyId: "5HrBwfVDf0HXzGDrJ6Znqc" },
  { name: "QMW", spotifyId: "4T4Z7jvUcMV16VsslRRuC5" },
  { name: "Reick Uno", spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ" },
  { name: "X Santa-Ana", spotifyId: "2Apt0MjZGqXAd1pl4LNQrR" },
  { name: "Zaque", spotifyId: "4WQmw3fIx9F7iPKL5v8SCN" },
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

async function fetchAllArtistAlbums(spotifyId) {
  const t = await getToken();
  const allAlbums = [];
  let offset = 0;
  const limit = 10; // Spotify 2026 max
  const includeGroups = "album,single,compilation,appears_on";
  
  while (true) {
    const url = `https://api.spotify.com/v1/artists/${spotifyId}/albums?include_groups=${includeGroups}&limit=${limit}&offset=${offset}&market=MX`;
    const res = await fetch(url, { headers: { Authorization: "Bearer " + t } });
    
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "10");
      console.log(`    Rate limited, waiting ${retryAfter}s...`);
      await sleep((retryAfter + 1) * 1000);
      continue; // Retry same request
    }
    
    if (res.status !== 200) {
      console.log(`    Error ${res.status} at offset ${offset}`);
      break;
    }
    
    const data = await res.json();
    allAlbums.push(...data.items);
    
    if (data.items.length < limit || offset + limit >= data.total) break;
    offset += limit;
    await sleep(500); // Polite delay
  }
  
  return allAlbums;
}

async function main() {
  console.log("SLC Full Release Sync");
  console.log("=====================\n");
  
  process.env.DATABASE_URL = DB_URL;
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
  
  let totalInserted = 0;
  
  for (const artist of ARTISTS) {
    console.log(`${artist.name}:`);
    const dbArtist = artistMap.get(artist.spotifyId);
    if (!dbArtist) { console.log("  NOT IN DB, skipping"); continue; }
    
    let albums;
    try {
      albums = await fetchAllArtistAlbums(artist.spotifyId);
    } catch (err) {
      console.log(`  Error fetching: ${err.message}`);
      continue;
    }
    
    console.log(`  Found ${albums.length} releases on Spotify`);
    
    let newCount = 0;
    for (const album of albums) {
      const spotifyUrl = album.external_urls?.spotify;
      if (!spotifyUrl || existingUrls.has(spotifyUrl)) continue;
      
      try {
        const slug = album.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") 
          + "-" + Math.random().toString(36).slice(2, 8);
        
        await prisma.release.create({
          data: {
            title: album.name,
            slug,
            type: album.album_type === "album" ? "album" : album.album_type === "compilation" ? "compilation" : "single",
            artistId: dbArtist.id,
            coverUrl: album.images?.[0]?.url || null,
            releaseDate: album.release_date ? new Date(album.release_date) : null,
            spotifyUrl,
          }
        });
        newCount++;
        totalInserted++;
        existingUrls.add(spotifyUrl);
      } catch (err) {
        console.log(`  ERR: ${album.name}: ${err.message.slice(0, 60)}`);
      }
    }
    console.log(`  Inserted ${newCount} new`);
  }
  
  console.log(`\n=== Done! Inserted ${totalInserted} new releases ===`);
  
  const total = await prisma.release.count();
  console.log(`Total releases in DB: ${total}`);
  
  await prisma.$disconnect();
}

main().catch(err => { console.error(err.message); process.exit(1); });
