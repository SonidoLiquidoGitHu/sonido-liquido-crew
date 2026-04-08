/**
 * Add main artist columns to media_releases table
 */

import { db, isDatabaseConfigured } from "@/db/client";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Adding main artist columns to media_releases...\n");

  if (!isDatabaseConfigured()) {
    console.log("Database not configured");
    return;
  }

  // Add main_artist_id column
  try {
    await db.run(sql`ALTER TABLE media_releases ADD COLUMN main_artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL`);
    console.log("✅ Added main_artist_id column");
  } catch (e: any) {
    if (e.message?.includes("duplicate column")) {
      console.log("✓ main_artist_id column already exists");
    } else {
      console.log("⚠️ Error adding main_artist_id:", e.message);
    }
  }

  // Add main_artist_name column
  try {
    await db.run(sql`ALTER TABLE media_releases ADD COLUMN main_artist_name TEXT`);
    console.log("✅ Added main_artist_name column");
  } catch (e: any) {
    if (e.message?.includes("duplicate column")) {
      console.log("✓ main_artist_name column already exists");
    } else {
      console.log("⚠️ Error adding main_artist_name:", e.message);
    }
  }

  console.log("\n✅ Migration complete!");
}

migrate().catch(console.error);
