import { db } from "./client";
import { artists, releases, videos, siteSettings } from "./schema";
import { count } from "drizzle-orm";
async function testConnection() {
  console.log("🔌 Testing database connection...\n");
  try {
    // Count records in each table
    const [artistCount] = await db.select({ count: count() }).from(artists);
    const [releaseCount] = await db.select({ count: count() }).from(releases);
    const [videoCount] = await db.select({ count: count() }).from(videos);
    const [settingCount] = await db.select({ count: count() }).from(siteSettings);
    console.log("✅ Database connection successful!\n");
    console.log("📊 Record counts:");
    console.log(`   • Artists: ${artistCount.count}`);
    console.log(`   • Releases: ${releaseCount.count}`);
    console.log(`   • Videos: ${videoCount.count}`);
    console.log(`   • Settings: ${settingCount.count}`);
    // Fetch and display artists
    console.log("\n🎤 Artists in database:");
    const allArtists = await db.select({
      name: artists.name,
      role: artists.role,
      isFeatured: artists.isFeatured,
    }).from(artists).orderBy(artists.sortOrder);
    for (const artist of allArtists) {
      const featured = artist.isFeatured ? "⭐" : "  ";
      console.log(`   ${featured} ${artist.name} (${artist.role})`);
    }
    console.log("\n✅ All tests passed!");
  } catch (error) {
    console.error("❌ Database test failed:", error);
    process.exit(1);
  }
}
testConnection();