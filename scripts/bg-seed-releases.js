/**
 * Background release fetcher — waits for Spotify rate limit to expire, then
 * fetches releases one artist at a time with generous delays.
 * 
 * Run: nohup node scripts/bg-seed-releases.js > /tmp/bg-seed.log 2>&1 &
 * Monitor: tail -f /tmp/bg-seed.log
 */

const CID = "d43c9d6653a241148c6926322b0c9568";
const CS = "d3cafe4dae714bea8eb93e0ce79770b6";
const DB_URL = "postgresql://neondb_owner:npg_ukaxCK3os1LG@ep-dawn-tree-an5f4b05-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// We'll use pg directly since Prisma Client might not be easily importable from plain JS
const { PrismaClient } = require("/home/z/my-project/node_modules/.prisma/client");

async function main() {
  log("=== Background Release Seeder Started ===");
  log(`Waiting 20 minutes for Spotify rate limit to reset...`);
  log(`Start time: ${new Date().toISOString()}`);
  
  // Wait 20 minutes for rate limit to reset
  await sleep(20 * 60 * 1000);
  
  log(`Rate limit wait complete. Starting fetch at ${new Date().toISOString()}`);
  
  // Get Spotify token
  let token = await getToken();
  log("Token obtained");
  
  const db = new PrismaClient();
  
  try {
    const artists = await db.artist.findMany({
      where: { spotifyId: { not: null } },
      orderBy: { order: "asc" },
    });
    log(`Found ${artists.length} artists to sync`);
    
    let totalReleases = 0;
    
    for (let i = 0; i < artists.length; i++) {
      const artist = artists[i];
      if (!artist.spotifyId) continue;
      
      log(`[${i + 1}/${artists.length}] Fetching releases for ${artist.name}...`);
      
      try {
        const albums = await fetchAlbums(artist.spotifyId, token);
        log(`  → ${albums.length} releases found`);
        
        for (const album of albums) {
          const cover = album.images?.sort((a, b) => b.height - a.height)[0]?.url ?? null;
          
          let type = "single";
          if (album.album_type === "album") type = "album";
          else if (album.album_type === "compilation") type = "compilation";
          if (album.name.toLowerCase().includes(" ep") && album.album_type === "single") type = "ep";
          
          const slug = `${slugify(album.name)}-${album.id.slice(-6)}`;
          const releaseDate = album.release_date ? new Date(album.release_date) : null;
          const isUpcoming = releaseDate ? releaseDate > new Date() : false;
          
          await db.release.upsert({
            where: { slug },
            update: { title: album.name, type, coverUrl: cover, releaseDate, spotifyUrl: album.external_urls?.spotify ?? null, isUpcoming },
            create: { title: album.name, slug, type, artistId: artist.id, coverUrl: cover, releaseDate, spotifyUrl: album.external_urls?.spotify ?? null, isUpcoming },
          });
          totalReleases++;
        }
        
        await db.artist.update({ where: { id: artist.id }, data: { releaseCount: albums.length } });
        
      } catch (err) {
        log(`  ✗ Error: ${err.message}`);
        // If rate limited again, wait and retry
        if (err.message.includes("429") || err.message.includes("rate")) {
          log(`  Rate limited, waiting 5 minutes...`);
          await sleep(5 * 60 * 1000);
          token = await getToken();
          i--; // retry this artist
          continue;
        }
      }
      
      // 10 second delay between artists
      await sleep(10000);
    }
    
    log(`\n=== Complete: ${totalReleases} real releases seeded ===`);
  } catch (err) {
    log(`FATAL: ${err.message}`);
  } finally {
    await db.$disconnect();
  }
}

async function fetchAlbums(spotifyId, token) {
  const all = [];
  let offset = 0;
  
  for (let page = 0; page < 3; page++) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const res = await fetch(
        `https://api.spotify.com/v1/artists/${spotifyId}/albums?include_groups=album,single,ep,compilation&limit=50&offset=${offset}&market=MX`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.status === 429) {
        const ra = res.headers.get("Retry-After");
        const wait = ra ? parseInt(ra) * 1000 + 1000 : 10000;
        log(`    ⏳ Rate limited, waiting ${wait/1000}s...`);
        await sleep(wait);
        token = await getToken(); // refresh token
        continue;
      }
      
      if (res.status === 401) {
        token = await getToken();
        continue;
      }
      
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      
      const data = await res.json();
      if (data.items?.length) all.push(...data.items);
      if (!data.next || data.items.length < 50) return all;
      offset += 50;
      break; // success, go to next page
    }
    
    await sleep(2000); // between pages
  }
  
  return all;
}

async function getToken() {
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: CID, client_secret: CS }),
  });
  if (!r.ok) throw new Error(`Auth failed: ${await r.text()}`);
  return (await r.json()).access_token;
}

function slugify(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

main().catch(e => { log(`UNCAUGHT: ${e.message}`); process.exit(1); });
