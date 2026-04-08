import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { upcomingReleases } from '../src/db/schema/upcoming';
import * as dotenv from 'dotenv';
dotenv.config();

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});
const db = drizzle(client);

async function check() {
  const releases = await db.select().from(upcomingReleases);
  console.log('Upcoming releases in Turso:', releases.length);
  releases.forEach(r => console.log('  -', r.title, '|', r.releaseDate, '| active:', r.isActive));
}
check().catch(console.error);
