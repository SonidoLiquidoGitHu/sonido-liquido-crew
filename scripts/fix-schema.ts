// Fix Schema Script - Add missing columns and tables
import { createClient } from "@libsql/client";

const DATABASE_URL = process.env.DATABASE_URL!;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

async function fixSchema() {
  console.log("\n🔧 FIXING DATABASE SCHEMA\n");
  console.log("=".repeat(50));

  const client = createClient({
    url: DATABASE_URL,
    authToken: DATABASE_AUTH_TOKEN,
  });

  console.log("✅ Database connected\n");

  // List of alterations to try (some may already exist)
  const alterations = [
    // Add short_bio to artists if missing
    "ALTER TABLE artists ADD COLUMN short_bio TEXT",
    "ALTER TABLE artists ADD COLUMN header_image_url TEXT",
    "ALTER TABLE artists ADD COLUMN press_contact_email TEXT",
    "ALTER TABLE artists ADD COLUMN press_contact_name TEXT",
    "ALTER TABLE artists ADD COLUMN manager_name TEXT",
    "ALTER TABLE artists ADD COLUMN manager_email TEXT",
    "ALTER TABLE artists ADD COLUMN booking_email TEXT",
    "ALTER TABLE artists ADD COLUMN hometown TEXT",
    "ALTER TABLE artists ADD COLUMN founded_year INTEGER",
    "ALTER TABLE artists ADD COLUMN achievements TEXT",
  ];

  // Tables to create if they don't exist
  const createTables = [
    `CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      campaign_type TEXT NOT NULL DEFAULT 'smartlink',
      cover_image_url TEXT,
      banner_image_url TEXT,
      smart_link_url TEXT,
      one_rpm_url TEXT,
      spotify_presave_url TEXT,
      apple_presave_url TEXT,
      download_gate_enabled INTEGER DEFAULT 0,
      require_spotify_follow INTEGER DEFAULT 0,
      spotify_artist_url TEXT,
      require_spotify_presave INTEGER DEFAULT 0,
      require_email INTEGER DEFAULT 1,
      view_count INTEGER DEFAULT 0,
      conversion_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      start_date INTEGER,
      end_date INTEGER,
      artist_id TEXT,
      release_id TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )`,

    `CREATE TABLE IF NOT EXISTS beats (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      producer_name TEXT,
      bpm INTEGER,
      key TEXT,
      genre TEXT,
      tags TEXT,
      duration INTEGER,
      preview_audio_url TEXT,
      full_audio_url TEXT,
      stems_url TEXT,
      cover_image_url TEXT,
      is_free INTEGER DEFAULT 0,
      price REAL,
      currency TEXT DEFAULT 'USD',
      gate_enabled INTEGER DEFAULT 0,
      require_email INTEGER DEFAULT 0,
      require_spotify_follow INTEGER DEFAULT 0,
      spotify_artist_url TEXT,
      require_instagram_follow INTEGER DEFAULT 0,
      instagram_handle TEXT,
      download_count INTEGER DEFAULT 0,
      play_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )`,

    `CREATE TABLE IF NOT EXISTS media_releases (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      subtitle TEXT,
      category TEXT DEFAULT 'announcement',
      summary TEXT,
      content TEXT,
      pull_quote TEXT,
      pull_quote_attribution TEXT,
      cover_image_url TEXT,
      banner_image_url TEXT,
      spotify_embed_url TEXT,
      youtube_video_id TEXT,
      pr_contact_name TEXT,
      pr_contact_email TEXT,
      pr_contact_phone TEXT,
      publish_date INTEGER,
      is_published INTEGER DEFAULT 0,
      is_featured INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      tags TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )`,

    `CREATE TABLE IF NOT EXISTS gallery_photos (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      image_url TEXT NOT NULL,
      thumbnail_url TEXT,
      photographer TEXT,
      location TEXT,
      taken_at INTEGER,
      alt_text TEXT,
      is_featured INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )`,

    `CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      category TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    )`,

    `CREATE TABLE IF NOT EXISTS photo_tags (
      id TEXT PRIMARY KEY,
      photo_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      UNIQUE(photo_id, tag_id)
    )`,
  ];

  // Execute table creations
  console.log("📦 Creating missing tables...\n");
  for (const sql of createTables) {
    try {
      await client.execute(sql);
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      console.log(`   ✅ Table "${tableName}" ready`);
    } catch (error) {
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      console.log(`   ⚠️  Table "${tableName}": ${(error as Error).message.substring(0, 50)}`);
    }
  }

  // Execute column alterations
  console.log("\n📝 Adding missing columns...\n");
  for (const sql of alterations) {
    try {
      await client.execute(sql);
      const colMatch = sql.match(/ADD COLUMN (\w+)/);
      console.log(`   ✅ Column "${colMatch?.[1]}" added`);
    } catch (error) {
      const colMatch = sql.match(/ADD COLUMN (\w+)/);
      const errMsg = (error as Error).message;
      if (errMsg.includes("duplicate column")) {
        console.log(`   ⏭️  Column "${colMatch?.[1]}" already exists`);
      } else {
        console.log(`   ⚠️  Column "${colMatch?.[1]}": ${errMsg.substring(0, 50)}`);
      }
    }
  }

  // Verify tables exist
  console.log("\n📋 Verifying tables...\n");
  const tablesResult = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );

  console.log("   Existing tables:");
  for (const row of tablesResult.rows) {
    console.log(`   - ${row.name}`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ Schema fix complete!\n");
}

fixSchema().catch(console.error);
