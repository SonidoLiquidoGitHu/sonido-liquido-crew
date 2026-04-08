// Count releases in database
import { createClient } from "@libsql/client";

const DATABASE_URL = process.env.DATABASE_URL!;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

async function main() {
  const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN });

  console.log("\n📊 RELEASES COUNT\n");
  console.log("=".repeat(50));

  // Count total releases
  const countResult = await client.execute("SELECT COUNT(*) as count FROM releases");
  console.log(`\n   Total releases: ${countResult.rows[0].count}\n`);

  // Get releases with artist names
  const releasesResult = await client.execute(`
    SELECT r.title, r.release_type, r.release_date, r.spotify_url, a.name as artist_name
    FROM releases r
    LEFT JOIN release_artists ra ON r.id = ra.release_id
    LEFT JOIN artists a ON ra.artist_id = a.id
    ORDER BY r.release_date DESC
    LIMIT 25
  `);

  console.log("   Recent releases:");
  for (const row of releasesResult.rows) {
    const date = row.release_date ? new Date(Number(row.release_date) * 1000).toISOString().split('T')[0] : 'N/A';
    console.log(`   - ${row.title} (${row.release_type}) by ${row.artist_name || 'Unknown'} [${date}]`);
  }

  // Group by artist
  const byArtistResult = await client.execute(`
    SELECT a.name, COUNT(*) as count
    FROM releases r
    LEFT JOIN release_artists ra ON r.id = ra.release_id
    LEFT JOIN artists a ON ra.artist_id = a.id
    GROUP BY a.name
    ORDER BY count DESC
  `);

  console.log("\n   By artist:");
  for (const row of byArtistResult.rows) {
    console.log(`   - ${row.name || 'Unknown'}: ${row.count}`);
  }

  console.log("\n" + "=".repeat(50) + "\n");
}

main().catch(console.error);
