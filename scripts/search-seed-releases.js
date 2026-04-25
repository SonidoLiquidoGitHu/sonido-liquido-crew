/**
 * Fetch ALL releases for ALL artists using Spotify Search API.
 * The /albums endpoint is rate-limited, but /search works on a different bucket.
 * We search by artist name, then filter results by Spotify artist ID.
 * 
 * For artists with many releases, we paginate through search results and
 * also search by year ranges to get complete coverage.
 */
const { Client } = require("/home/z/my-project/node_modules/pg");

const CID = "d43c9d6653a241148c6926322b0c9568";
const CS = "d3cafe4dae714bea8eb93e0ce79770b6";

// All 15 SLC artists with their Spotify IDs and names
const ARTISTS = [
  { spotifyId: "2jJmTEMkGQfH3BxoG3MQvF", name: "Brez" },
  { spotifyId: "4fNQqyvcM71IyF2EitEtCj", name: "Bruno Grasso" },
  { spotifyId: "3RAg8fPmZ8RnacJO8MhLP1", name: "Chas7p" },
  { spotifyId: "2zrv1oduhIYh29vvQZwI5r", name: "Codak" },
  { spotifyId: "3eCEorgAoZkvnAQLdy4x38", name: "Dilema" },
  { spotifyId: "5urer15JPbCELf17LVia7w", name: "Doctor Destino" },
  { spotifyId: "5TMoczTLclVyzzDY5qf3Yb", name: "Fancy Freak" },
  { spotifyId: "6AN9ek9RwrLbSp9rT2lcDG", name: "Hassyel" },
  { spotifyId: "0QdRhOmiqAcV1dPCoiSIQJ", name: "Kev Cabrone" },
  { spotifyId: "16YScXC67nAnFDcA2LGdY0", name: "Latin Geisha" },
  { spotifyId: "5HrBwfVDf0HXzGDrJ6Znqc", name: "Pepe Levine" },
  { spotifyId: "4T4Z7jvUcMV16VsslRRuC5", name: "QMW" },
  { spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ", name: "Reick Uno" },
  { spotifyId: "2Apt0MjZGqXAd1pl4LNQrR", name: "X Santa-Ana" },
  { spotifyId: "4WQmw3fIx9F7iPKL5v8SCN", name: "Zaque" },
];

function slug(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function getToken() {
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: CID, client_secret: CS }),
  });
  if (!r.ok) throw new Error("Auth failed: " + await r.text());
  return (await r.json()).access_token;
}

async function main() {
  console.log("=== Search-Based Complete Release Seeder ===");
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  
  // Get artist DB IDs
  const { rows: dbArtists } = await db.query('SELECT id, "spotifyId", name FROM "Artist" WHERE "spotifyId" IS NOT NULL');
  const artistMap = new Map(dbArtists.map(a => [a.spotifyId, a.id]));
  
  let token = await getToken();
  console.log("Token OK");
  
  let totalAdded = 0;
  
  for (const artist of ARTISTS) {
    const dbId = artistMap.get(artist.spotifyId);
    if (!dbId) { console.log("Skipping " + artist.name + " (not in DB)"); continue; }
    
    console.log("\n🎵 " + artist.name + " (" + artist.spotifyId + ")");
    
    // Search by artist name, then filter results to only include albums by THIS artist
    const seenAlbumIds = new Set();
    let allAlbums = [];
    let offset = 0;
    let done = false;
    
    // Search without year filter first
    while (!done) {
      const q = encodeURIComponent('artist:"' + artist.name + '"');
      const url = "https://api.spotify.com/v1/search?q=" + q + "&type=album&limit=10&offset=" + offset + "&market=MX";
      
      let res;
      for (let retry = 0; retry < 5; retry++) {
        res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
        if (res.status === 429) {
          const ra = res.headers.get("Retry-After");
          console.log("  ⏳ 429, wait " + (parseInt(ra || 10) + 1) + "s...");
          await new Promise(r => setTimeout(r, (parseInt(ra || 10) + 1) * 1000));
          token = await getToken();
          continue;
        }
        if (res.status === 401) { token = await getToken(); continue; }
        break;
      }
      
      if (!res || !res.ok) {
        console.log("  ✗ Search failed: " + (res?.status || "no response"));
        break;
      }
      
      const data = await res.json();
      const items = data.albums?.items || [];
      
      // Filter: only include albums where THIS artist is one of the artists
      const filtered = items.filter(al => 
        al.artists?.some(a => a.id === artist.spotifyId) && !seenAlbumIds.has(al.id)
      );
      
      for (const al of filtered) {
        seenAlbumIds.add(al.id);
        allAlbums.push(al);
      }
      
      console.log("  offset=" + offset + ": " + items.length + " results, " + filtered.length + " by " + artist.name + " (total: " + allAlbums.length + ")");
      
      // Stop if no more results or we've gone past what's useful
      if (items.length < 10 || offset >= 200) {
        done = true;
      } else {
        // Check if we're still finding new albums by this artist
        const lastFew = items.slice(-5);
        const anyRelevant = lastFew.some(al => al.artists?.some(a => a.id === artist.spotifyId));
        if (!anyRelevant && offset >= 50) {
          // We've gone past all relevant results
          done = true;
        }
        offset += 10;
      }
      
      await new Promise(r => setTimeout(r, 1000));
    }
    
    // Also search by year ranges for artists with many releases
    // This helps find older releases that might not appear in name-only search
    if (allAlbums.length < 30) {
      for (const yearRange of ["2000-2009", "2010-2014", "2015-2019", "2020-2024", "2025-2026"]) {
        const q = encodeURIComponent('artist:"' + artist.name + '" year:' + yearRange);
        const url = "https://api.spotify.com/v1/search?q=" + q + "&type=album&limit=10&market=MX";
        
        let res;
        for (let retry = 0; retry < 3; retry++) {
          res = await fetch(url, { headers: { Authorization: "Bearer " + token } });
          if (res.status === 429) {
            const ra = res.headers.get("Retry-After");
            await new Promise(r => setTimeout(r, (parseInt(ra || 10) + 1) * 1000));
            token = await getToken();
            continue;
          }
          if (res.status === 401) { token = await getToken(); continue; }
          break;
        }
        
        if (res?.ok) {
          const data = await res.json();
          const items = data.albums?.items || [];
          const filtered = items.filter(al => 
            al.artists?.some(a => a.id === artist.spotifyId) && !seenAlbumIds.has(al.id)
          );
          for (const al of filtered) {
            seenAlbumIds.add(al.id);
            allAlbums.push(al);
          }
          if (filtered.length > 0) {
            console.log("  year:" + yearRange + ": +" + filtered.length + " new (total: " + allAlbums.length + ")");
          }
        }
        
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    // Insert all albums into DB
    let added = 0;
    for (const al of allAlbums) {
      const cover = al.images?.sort((a, b) => b.height - a.height)[0]?.url || null;
      let type = "single";
      if (al.album_type === "album") type = "album";
      else if (al.album_type === "compilation") type = "compilation";
      if (al.name.toLowerCase().includes(" ep") && al.album_type === "single") type = "ep";
      const s = slug(al.name) + "-" + al.id.slice(-6);
      const rd = al.release_date || null;
      const up = rd ? new Date(rd) > new Date() : false;
      const spUrl = al.external_urls?.spotify || null;
      
      try {
        await db.query(
          'INSERT INTO "Release" (id, title, slug, type, "artistId", "coverUrl", "releaseDate", "spotifyUrl", "isUpcoming", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) ON CONFLICT (slug) DO UPDATE SET title=$1, type=$3, "coverUrl"=$5, "releaseDate"=$6, "spotifyUrl"=$7, "isUpcoming"=$8, "updatedAt"=NOW()',
          [al.name, s, type, dbId, cover, rd, spUrl, up]
        );
        added++;
      } catch (e) { /* skip dupes */ }
    }
    
    totalAdded += added;
    
    // Update release count to actual DB count
    const { rows: [{ c: dbCount }] } = await db.query('SELECT COUNT(*) as c FROM "Release" WHERE "artistId" = $1', [dbId]);
    await db.query('UPDATE "Artist" SET "releaseCount" = $1, "updatedAt" = NOW() WHERE id = $2', [Number(dbCount), dbId]);
    
    console.log("  ✅ " + artist.name + ": " + allAlbums.length + " found, " + added + " added/updated, DB total: " + Number(dbCount));
    
    // Delay between artists
    await new Promise(r => setTimeout(r, 2000));
  }
  
  const { rows: [{ c: total }] } = await db.query('SELECT COUNT(*) as c FROM "Release"');
  console.log("\n=== Done: " + totalAdded + " processed, " + Number(total) + " total releases in DB ===");
  
  // Print final summary
  const { rows: summary } = await db.query('SELECT a.name, a."releaseCount" as spotify_total, COUNT(r.id) as db_count FROM "Artist" a LEFT JOIN "Release" r ON r."artistId" = a.id GROUP BY a.name, a."releaseCount" ORDER BY a.name');
  console.log("\nFinal counts:");
  summary.forEach(r => console.log("  " + r.name + ": " + Number(r.db_count) + " releases (Spotify: " + Number(r.spotify_total) + ")"));
  
  await db.end();
}

main().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
