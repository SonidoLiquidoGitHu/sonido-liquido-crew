#!/usr/bin/env bash
# Complete release fetcher - waits for Spotify rate limit to reset, then fetches all missing releases
# Run: bash scripts/fetch-all-releases.sh
# This script will:
# 1. Wait until the Spotify /albums endpoint rate limit resets
# 2. Fetch all missing releases for all 15 artists
# 3. Update the database with real data

set -e

export DATABASE_URL="postgresql://neondb_owner:npg_ukaxCK3os1LG@ep-dawn-tree-an5f4b05-pooler.c-6.us-east-1.aws.neon.tech/neondb?uselibpqcompat=true&sslmode=require&channel_binding=require"
export NODE_OPTIONS="--max-old-space-size=128"

echo "=== SLC Complete Release Fetcher ==="
echo "Current time: $(date -u)"
echo ""
echo "This script will:"
echo "1. Wait for Spotify rate limit to reset (if needed)"
echo "2. Fetch ALL missing releases for all 15 artists"
echo "3. Update the database"
echo ""
echo "Starting in 5 seconds... (Ctrl+C to cancel)"
sleep 5

node -e "
const { Client } = require('/home/z/my-project/node_modules/pg');

const CID = 'd43c9d6653a241148c6926322b0c9568';
const CS = 'd3cafe4dae714bea8eb93e0ce79770b6';

function slug(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g, ''); }

async function getToken() {
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({grant_type:'client_credentials',client_id:CID,client_secret:CS}),
  });
  if (!r.ok) throw new Error('Auth failed');
  return (await r.json()).access_token;
}

async function main() {
  console.log('Connecting to database...');
  const db = new Client({connectionString: process.env.DATABASE_URL});
  await db.connect();

  // Get artists that still need more releases
  const {rows: artists} = await db.query(
    'SELECT a.id, a.\"spotifyId\", a.name, a.\"releaseCount\" as total, COUNT(r.id) as have '+
    'FROM \"Artist\" a LEFT JOIN \"Release\" r ON r.\"artistId\" = a.id '+
    'WHERE a.\"spotifyId\" IS NOT NULL '+
    'GROUP BY a.id, a.name, a.\"releaseCount\" '+
    'HAVING COUNT(r.id) < a.\"releaseCount\" '+
    'ORDER BY (a.\"releaseCount\" - COUNT(r.id)) DESC'
  );

  console.log('Artists needing more releases: ' + artists.length);
  artists.forEach(a => console.log('  ' + a.name + ': ' + Number(a.have) + '/' + Number(a.total) + ' (missing ' + (Number(a.total)-Number(a.have)) + ')'));

  let token = await getToken();
  console.log('\\nSpotify token obtained');

  let totalAdded = 0;

  for (const artist of artists) {
    const need = Number(artist.total) - Number(artist.have);
    console.log('\\n🎵 ' + artist.name + ': need ' + need + ' more releases');
    
    let offset = Number(artist.have);
    let done = false;
    
    while (!done) {
      const url = 'https://api.spotify.com/v1/artists/' + artist.spotifyId + '/albums?include_groups=album,single,ep,compilation&limit=10&offset=' + offset + '&market=MX';
      
      let res;
      for (let retry = 0; retry < 10; retry++) {
        res = await fetch(url, {headers:{Authorization:'Bearer '+token}});
        
        if (res.status === 429) {
          const ra = res.headers.get('Retry-After');
          const wait = (parseInt(ra || 30) + 2) * 1000;
          console.log('  ⏳ Rate limited! Waiting ' + (wait/1000).toFixed(0) + 's (Retry-After: ' + ra + ')...');
          await new Promise(r=>setTimeout(r, wait));
          token = await getToken();
          continue;
        }
        
        if (res.status === 401) {
          console.log('  🔄 Token expired, refreshing...');
          token = await getToken();
          continue;
        }
        
        break;
      }
      
      if (!res || !res.ok) {
        console.log('  ✗ Failed after retries: ' + (res?.status || 'no response'));
        break;
      }
      
      const data = await res.json();
      const albums = data.items || [];
      let added = 0;
      
      for (const al of albums) {
        const cover = al.images?.sort((a,b)=>b.height-a.height)[0]?.url || null;
        let type = 'single';
        if (al.album_type === 'album') type = 'album';
        else if (al.album_type === 'compilation') type = 'compilation';
        if (al.name.toLowerCase().includes(' ep') && al.album_type === 'single') type = 'ep';
        const s = slug(al.name) + '-' + al.id.slice(-6);
        const rd = al.release_date || null;
        const up = rd ? new Date(rd) > new Date() : false;
        const spUrl = al.external_urls?.spotify || null;
        
        try {
          await db.query(
            'INSERT INTO \"Release\" (id, title, slug, type, \"artistId\", \"coverUrl\", \"releaseDate\", \"spotifyUrl\", \"isUpcoming\", \"createdAt\", \"updatedAt\") VALUES (gen_random_uuid(), \$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, NOW(), NOW()) ON CONFLICT (slug) DO UPDATE SET title=\$1, type=\$3, \"coverUrl\"=\$5, \"releaseDate\"=\$6, \"spotifyUrl\"=\$7, \"isUpcoming\"=\$8, \"updatedAt\"=NOW()',
            [al.name, s, type, artist.id, cover, rd, spUrl, up]
          );
          added++;
        } catch(e) { /* skip dupes */ }
      }
      
      totalAdded += added;
      console.log('  offset=' + offset + ': ' + albums.length + ' fetched, ' + added + ' added');
      
      if (!data.next || albums.length < 10) {
        done = true;
        // Update release count
        await db.query('UPDATE \"Artist\" SET \"releaseCount\" = \$1, \"updatedAt\" = NOW() WHERE id = \$2', [data.total || offset + albums.length, artist.id]);
      } else {
        offset += 10;
      }
      
      // 2 second delay between pages
      await new Promise(r=>setTimeout(r, 2000));
    }
    
    console.log('  ✅ ' + artist.name + ' complete');
    // 3 second delay between artists
    await new Promise(r=>setTimeout(r, 3000));
  }

  const {rows:[s]} = await db.query('SELECT COUNT(*) as c FROM \"Release\"');
  console.log('\\n=== COMPLETE: ' + totalAdded + ' new releases, ' + Number(s.c) + ' total in database ===');

  // Print final summary
  const {rows: summary} = await db.query('SELECT a.name, COUNT(r.id) as db_count FROM \"Artist\" a LEFT JOIN \"Release\" r ON r.\"artistId\" = a.id GROUP BY a.name ORDER BY a.name');
  console.log('\\nFinal release counts:');
  summary.forEach(r => console.log('  ' + r.name + ': ' + Number(r.db_count)));

  await db.end();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
"
