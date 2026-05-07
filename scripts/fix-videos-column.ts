import { db, isDatabaseConfigured } from "../src/db/client";
import { sql } from "drizzle-orm";

async function fixVideosColumn() {
  if (!isDatabaseConfigured()) {
    console.error("Database not configured");
    process.exit(1);
  }

  try {
    // Check if column exists
    const result = await db.all(sql`PRAGMA table_info(videos)`);
    const columns = result as { name: string }[];
    const hasDisplayOrder = columns.some(col => col.name === 'display_order');
    
    if (!hasDisplayOrder) {
      await db.run(sql`ALTER TABLE videos ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0`);
      console.log("✓ Added display_order column to videos table");
    } else {
      console.log("✓ display_order column already exists");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

fixVideosColumn();
