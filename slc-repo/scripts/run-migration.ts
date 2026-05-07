import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config();

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

async function runMigration() {
  console.log("Running migrations...");
  
  const commands = [
    // Add missing columns to artists table (ignore if exists)
    "ALTER TABLE artists ADD COLUMN real_name TEXT",
    "ALTER TABLE artists ADD COLUMN short_bio TEXT",
    "ALTER TABLE artists ADD COLUMN banner_image_url TEXT",
    "ALTER TABLE artists ADD COLUMN location TEXT",
    "ALTER TABLE artists ADD COLUMN country TEXT",
    "ALTER TABLE artists ADD COLUMN booking_email TEXT",
    "ALTER TABLE artists ADD COLUMN management_email TEXT",
    "ALTER TABLE artists ADD COLUMN press_email TEXT",
    "ALTER TABLE artists ADD COLUMN website_url TEXT",
    "ALTER TABLE artists ADD COLUMN year_started INTEGER",
    "ALTER TABLE artists ADD COLUMN genres TEXT",
    "ALTER TABLE artists ADD COLUMN labels TEXT",
    "ALTER TABLE artists ADD COLUMN monthly_listeners INTEGER",
    "ALTER TABLE artists ADD COLUMN followers INTEGER",
    // Add missing columns to artist_external_profiles table
    "ALTER TABLE artist_external_profiles ADD COLUMN display_name TEXT",
    "ALTER TABLE artist_external_profiles ADD COLUMN is_primary INTEGER DEFAULT 0",
    "ALTER TABLE artist_external_profiles ADD COLUMN follower_count INTEGER",
    "ALTER TABLE artist_external_profiles ADD COLUMN last_synced INTEGER",
  ];
  
  for (const cmd of commands) {
    try {
      await client.execute(cmd);
      console.log(`✓ ${cmd.substring(0, 60)}...`);
    } catch (error: any) {
      if (error.message.includes("duplicate column name")) {
        console.log(`- Column already exists: ${cmd.substring(0, 50)}...`);
      } else {
        console.error(`✗ Failed: ${cmd.substring(0, 50)}...`);
        console.error(`  Error: ${error.message}`);
      }
    }
  }
  
  // Create tables if they don't exist
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS artist_gallery_assets (
        id TEXT PRIMARY KEY NOT NULL,
        artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
        asset_url TEXT NOT NULL,
        thumbnail_url TEXT,
        asset_type TEXT NOT NULL DEFAULT 'photo',
        caption TEXT,
        credit TEXT,
        is_public INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log("✓ artist_gallery_assets table ready");
  } catch (error: any) {
    console.log(`- artist_gallery_assets: ${error.message}`);
  }
  
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS artist_relations (
        id TEXT PRIMARY KEY NOT NULL,
        artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
        related_artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
        relation_type TEXT NOT NULL DEFAULT 'collaborator',
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
    console.log("✓ artist_relations table ready");
  } catch (error: any) {
    console.log(`- artist_relations: ${error.message}`);
  }
  
  console.log("\nMigration complete!");
}

runMigration().catch(console.error);
