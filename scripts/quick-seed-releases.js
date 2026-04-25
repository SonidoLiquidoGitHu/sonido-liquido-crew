/**
 * Quick release seeder using pg directly.
 * Spotify 2026 API: max limit=10 per request, need pagination.
 */
const { Client } = require("pg");

const CID = "d43c9d6653a241148c6926322b0c9568";
const CS = "d3cafe4dae714bea8eb93e0ce79770b6";

async function getToken() {
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: CID, client_secret: CS }),
  });
  if (!r.ok) throw new Error(`Auth failed: ${await r.text()}`);
  return (await r.json()).access_token;
}

function slug(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  console.log("=== Quick Release Seeder (limit=10 pagination) ===");
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  console.log("DB connected");

  const { rows: artists } = await db.query('SELECT id, "spotifyId", name FROM "Artist" WHERE "spotifyId" IS NOT NULL ORDER BY "order" ASC');
  console.log(`Found ${artists.length} artists`);

  let token = await getToken();
  console.log("Spotify token OK");
  
  let total = 0;

  for (const artist of artists) {
    console.log(`\n🎵 ${artist.name} (${artist.spotifyId})...`);
    
    let offset = 0;
    let artistTotal = 0;
    let done = false;
    
    while (!done) {
      let success = false;
      for (let retry = 0; retry < 8 && !success; retry++) {
        try {
          const url = `https://api.spotify.com/v1/artists/${artist.spotifyId}/albums?include_groups=album,single,ep,compilation&limit=10&offset=${offset}&market=MX`;
          const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
          
          if (res.status === 429) {
            const ra = res.headers.get("Retry-After");
            const wait = ra ? parseInt(ra) * 1000 + 1000 : Math.min(60000, 5000 * Math.pow(2, retry));
            console.log(`  ⏳ 429, wait ${(wait/1000).toFixed(0)}s...`);
            await new Promise(r => setTimeout(r, wait));
            token = await getToken();
            continue;
          }
          
          if (res.status === 401) { token = await getToken(); continue; }
          if (!res.ok) { 
            console.log(`  ✗ HTTP ${res.status}: ${await res.text()}`); 
            done = true; 
            break; 
          }
          
          const data = await res.json();
          const albums = data.items || [];
          
          for (const al of albums) {
            const cover = al.images?.sort((a, b) => b.height - a.height)[0]?.url || null;
            let type = "single";
            if (al.album_type === "album") type = "album";
            else if (al.album_type === "compilation") type = "compilation";
            if (al.name.toLowerCase().includes(" ep") && al.album_type === "single") type = "ep";
            
            const s = `${slug(al.name)}-${al.id.slice(-6)}`;
            const rd = al.release_date || null;
            const up = rd ? new Date(rd) > new Date() : false;
            const spUrl = al.external_urls?.spotify || null;
            
            await db.query(
              `INSERT INTO "Release" (id, title, slug, type, "artistId", "coverUrl", "releaseDate", "spotifyUrl", "isUpcoming", "createdAt", "updatedAt")
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
               ON CONFLICT (slug) DO UPDATE SET title=$1, type=$3, "coverUrl"=$5, "releaseDate"=$6, "spotifyUrl"=$7, "isUpcoming"=$8, "updatedAt"=NOW()`,
              [al.name, s, type, artist.id, cover, rd, spUrl, up]
            );
            total++;
            artistTotal++;
          }
          
          console.log(`  Page offset=${offset}: ${albums.length} releases (total so far: ${artistTotal}/${data.total || "?"})`);
          
          if (!data.next || albums.length < 10) {
            done = true;
            // Update release count
            await db.query(`UPDATE "Artist" SET "releaseCount" = $1, "updatedAt" = NOW() WHERE id = $2`, [data.total || artistTotal, artist.id]);
          } else {
            offset += 10;
          }
          
          success = true;
          
        } catch (e) {
          console.log(`  Error: ${e.message}, retry ${retry + 1}...`);
          await new Promise(r => setTimeout(r, 3000));
        }
      }
      
      // Rate limit: delay between pages
      if (!done) await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log(`  ✅ ${artist.name}: ${artistTotal} releases`);
    
    // Delay between artists
    await new Promise(r => setTimeout(r, 3000));
  }

  const { rows: summary } = await db.query('SELECT COUNT(*) as count FROM "Release"');
  console.log(`\n=== Done: ${total} releases processed, ${summary[0].count} in DB ===`);
  await db.end();
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
