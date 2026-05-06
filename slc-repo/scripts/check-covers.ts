import { db } from "../src/db/client.js";
import { campaigns, beats, mediaReleases } from "../src/db/schema/index.js";

async function check() {
  const c = await db.select({ id: campaigns.id, title: campaigns.title, cover: campaigns.coverImageUrl }).from(campaigns);
  const b = await db.select({ id: beats.id, title: beats.title, cover: beats.coverImageUrl }).from(beats);
  const m = await db.select({ id: mediaReleases.id, title: mediaReleases.title, cover: mediaReleases.coverImageUrl }).from(mediaReleases);
  
  console.log('CAMPAIGNS:');
  c.forEach(x => console.log(`  ${x.title} -> ${x.cover?.substring(0, 100) || 'NO COVER'}`));
  
  console.log('\nBEATS:');
  b.forEach(x => console.log(`  ${x.title} -> ${x.cover?.substring(0, 100) || 'NO COVER'}`));
  
  console.log('\nMEDIA RELEASES:');
  m.forEach(x => console.log(`  ${x.title} -> ${x.cover?.substring(0, 100) || 'NO COVER'}`));
}

check().catch(console.error);
