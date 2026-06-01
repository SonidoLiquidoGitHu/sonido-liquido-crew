import { createClient } from '@libsql/client';

const db = createClient({
  url: 'file:/home/z/my-project/db/custom.db',
});

async function main() {
  // Check table schema
  console.log('=== TABLE SCHEMA ===');
  const schema = await db.execute("PRAGMA table_info(subscribers)");
  for (const col of schema.rows) {
    console.log(`  ${col.name} (${col.type}) - nullable: ${col.notnull === 0}, default: ${col.dflt_value}`);
  }

  // Check all distinct sources
  console.log('\n=== DISTINCT SOURCES ===');
  const sources = await db.execute("SELECT source, COUNT(*) as count FROM subscribers GROUP BY source ORDER BY count DESC");
  for (const row of sources.rows) {
    console.log(`  source="${row.source}": ${row.count}`);
  }

  // Total count
  const total = await db.execute("SELECT COUNT(*) as count FROM subscribers");
  console.log(`\nTotal subscribers: ${total.rows[0].count}`);

  // Sample rows
  console.log('\n=== SAMPLE ROWS (first 5) ===');
  const sample = await db.execute("SELECT * FROM subscribers LIMIT 5");
  for (const row of sample.rows) {
    console.log(JSON.stringify(row, null, 2));
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
