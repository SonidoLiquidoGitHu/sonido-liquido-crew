import { createClient } from '@libsql/client';

const db = createClient({
  url: 'file:/home/z/my-project/db/custom.db',
});

async function main() {
  console.log('=== DELETE BOT SUBSCRIBERS FROM DATABASE ===\n');

  // Step 1: Count bot subscribers before deletion
  const countResult = await db.execute(
    "SELECT COUNT(*) as count FROM subscribers WHERE source IN ('newsletter-page', 'newsletter-cta')"
  );
  const count = countResult.rows[0].count;
  console.log(`Step 1 - Bot subscribers found: ${count}`);

  // Show breakdown by source
  const breakdown = await db.execute(
    "SELECT source, COUNT(*) as count FROM subscribers WHERE source IN ('newsletter-page', 'newsletter-cta') GROUP BY source"
  );
  console.log('Breakdown by source:');
  for (const row of breakdown.rows) {
    console.log(`  - source="${row.source}": ${row.count}`);
  }

  // Also check isActive status
  const activeBreakdown = await db.execute(
    "SELECT isActive, COUNT(*) as count FROM subscribers WHERE source IN ('newsletter-page', 'newsletter-cta') GROUP BY isActive"
  );
  console.log('Breakdown by isActive:');
  for (const row of activeBreakdown.rows) {
    console.log(`  - isActive=${row.isActive}: ${row.count}`);
  }

  // Show total subscribers before
  const totalBefore = await db.execute("SELECT COUNT(*) as count FROM subscribers");
  console.log(`\nTotal subscribers before deletion: ${totalBefore.rows[0].count}`);

  // Step 2: Delete bot subscribers
  console.log('\nStep 2 - Deleting bot subscribers...');
  const deleteResult = await db.execute(
    "DELETE FROM subscribers WHERE source IN ('newsletter-page', 'newsletter-cta')"
  );
  console.log(`Rows deleted: ${deleteResult.rowsAffected}`);

  // Step 3: Verify deletion
  console.log('\nStep 3 - Verifying deletion...');
  const verifyResult = await db.execute(
    "SELECT COUNT(*) as count FROM subscribers WHERE source IN ('newsletter-page', 'newsletter-cta')"
  );
  const remaining = verifyResult.rows[0].count;
  console.log(`Bot subscribers remaining: ${remaining}`);

  // Show total subscribers after
  const totalAfter = await db.execute("SELECT COUNT(*) as count FROM subscribers");
  console.log(`Total subscribers after deletion: ${totalAfter.rows[0].count}`);

  console.log('\n=== SUMMARY ===');
  console.log(`Bot subscribers found: ${count}`);
  console.log(`Bot subscribers deleted: ${deleteResult.rowsAffected}`);
  console.log(`Bot subscribers remaining: ${remaining}`);
  console.log(`Total subscribers: ${totalBefore.rows[0].count} → ${totalAfter.rows[0].count}`);

  if (remaining === 0 && Number(deleteResult.rowsAffected) === Number(count)) {
    console.log('\n✅ Deletion successful - all bot subscribers removed!');
  } else {
    console.log('\n⚠️ Unexpected result - please review!');
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
