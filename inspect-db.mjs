import { createClient } from '@libsql/client';

const db = createClient({
  url: 'file:/home/z/my-project/db/custom.db',
});

async function main() {
  // List all tables
  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('=== TABLES ===');
  for (const row of tables.rows) {
    console.log(`  ${row.name}`);
  }

  // Check subscribers table schema
  console.log('\n=== SUBSCRIBERS SCHEMA ===');
  const schema = await db.execute("PRAGMA table_info(subscribers)");
  for (const col of schema.rows) {
    console.log(`  ${col.name} (${col.type})`);
  }

  // Count all subscribers
  const total = await db.execute("SELECT COUNT(*) as count FROM subscribers");
  console.log(`\nTotal subscribers: ${total.rows[0].count}`);

  // List all sources
  console.log('\n=== ALL SOURCES ===');
  const sources = await db.execute("SELECT source, COUNT(*) as count FROM subscribers GROUP BY source ORDER BY count DESC");
  for (const row of sources.rows) {
    console.log(`  source="${row.source}": ${row.count}`);
  }

  // Show all subscriber data
  console.log('\n=== ALL SUBSCRIBERS ===');
  const all = await db.execute("SELECT id, email, name, is_active, source, subscribed_at FROM subscribers");
  for (const row of all.rows) {
    console.log(`  id=${row.id}, email=${row.email}, name=${row.name}, is_active=${row.is_active}, source=${row.source}`);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
