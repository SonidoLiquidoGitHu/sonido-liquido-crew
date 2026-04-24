/**
 * Fetch ONLY releases for existing artists in the database.
 * Uses Spotify Client Credentials API with rate limit handling.
 * Outputs progress to stderr for real-time monitoring.
 */
import { PrismaClient } from "@prisma/client";

const CID = process.env.SPOTIFY_CLIENT_ID!;
const CS = process.env.SPOTIFY_CLIENT_SECRET!;

let token: string;

async function auth(): Promise<string> {
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: CID, client_secret: CS }),
  });
  if (!r.ok) throw new Error(`Auth failed: ${await r.text()}`);
  return (await r.json()).access_token;
}

async function sFetch(url: string): Promise<Response> {
  for (let i = 0; i < 8; i++) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 429) {
      const ra = r.headers.get("Retry-After");
      const w = ra ? parseInt(ra) * 1000 + 1000 : Math.min(60000, 4000 * Math.pow(2, i));
      process.stderr.write(`  ⏳ 429, wait ${w/1000}s...\n`);
      await new Promise(r => setTimeout(r, w));
      continue;
    }
    if (r.status === 401) { token = await auth(); continue; }
    return r;
  }
  throw new Error(`Max retries: ${url}`);
}

function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

async function main() {
  process.stderr.write("=== SLC Releases Seed ===\n");
  token = await auth();
  process.stderr.write("Token OK\n");

  const db = new PrismaClient();
  const artists = await db.artist.findMany({ where: { spotifyId: { not: null } }, orderBy: { order: "asc" } });
  process.stderr.write(`${artists.length} artists found\n`);

  let total = 0;
  for (const a of artists) {
    if (!a.spotifyId) continue;
    process.stderr.write(`🎵 ${a.name}... `);

    const albums: any[] = [];
    let off = 0;
    for (let p = 0; p < 3; p++) {
      const r = await sFetch(`https://api.spotify.com/v1/artists/${a.spotifyId}/albums?include_groups=album,single,ep,compilation&limit=50&offset=${off}&market=MX`);
      if (!r.ok) { process.stderr.write(`ERR ${r.status}\n`); break; }
      const d = await r.json();
      if (d.items?.length) albums.push(...d.items);
      if (!d.next || d.items.length < 50) break;
      off += 50;
      await new Promise(r => setTimeout(r, 1500));
    }

    process.stderr.write(`${albums.length} releases\n`);

    for (const al of albums) {
      const cover = al.images?.sort((a:any,b:any) => b.height - a.height)[0]?.url ?? null;
      let t = "single";
      if (al.album_type === "album") t = "album";
      else if (al.album_type === "compilation") t = "compilation";
      if (al.name.toLowerCase().includes(" ep") && al.album_type === "single") t = "ep";

      const s = `${slug(al.name)}-${al.id.slice(-6)}`;
      const rd = al.release_date ? new Date(al.release_date) : null;
      const up = rd ? rd > new Date() : false;

      await db.release.upsert({
        where: { slug: s },
        update: { title: al.name, type: t, coverUrl: cover, releaseDate: rd, spotifyUrl: al.external_urls?.spotify ?? null, isUpcoming: up },
        create: { title: al.name, slug: s, type: t, artistId: a.id, coverUrl: cover, releaseDate: rd, spotifyUrl: al.external_urls?.spotify ?? null, isUpcoming: up },
      });
      total++;
    }

    await db.artist.update({ where: { id: a.id }, data: { releaseCount: albums.length } });
    await new Promise(r => setTimeout(r, 5000));
  }

  process.stderr.write(`\nDone: ${total} releases\n`);
  await db.$disconnect();
}

main().catch(e => { process.stderr.write(`FATAL: ${e}\n`); process.exit(1); });
