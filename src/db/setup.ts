import { config } from "dotenv";
config(); // Load .env file
import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";
// ===========================================
// DATABASE SETUP - Creates all tables
// ===========================================
const getDatabaseUrl = (): string => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL not set in environment");
    process.exit(1);
  }
  return url;
};
const setupDatabase = async () => {
  console.log("🔧 Setting up database...\n");
  const dbUrl = getDatabaseUrl();
  console.log(`📁 Database URL: ${dbUrl}`);
  // For local file databases, ensure directory exists
  if (dbUrl.startsWith("file:")) {
    const dbPath = dbUrl.replace(/^file:/, "");
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  const client = createClient({
    url: dbUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
  // Get all migration files in order
  const migrationsDir = path.join(__dirname, "migrations");
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql"))
    .sort(); // Sort to ensure correct order (0000, 0001, 0002, etc.)
  console.log(`\n📝 Found ${migrationFiles.length} migration files:`);
  migrationFiles.forEach(f => console.log(`   • ${f}`));
  let totalSuccess = 0;
  let totalErrors = 0;
  for (const migrationFile of migrationFiles) {
    console.log(`\n🔄 Running migration: ${migrationFile}`);
    const migrationPath = path.join(migrationsDir, migrationFile);
    const migrationSql = fs.readFileSync(migrationPath, "utf-8");
    // Split by statement breakpoints and execute each
    const statements = migrationSql.split("--> statement-breakpoint");
    let successCount = 0;
    let errorCount = 0;
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed) continue;
      try {
        await client.execute(trimmed);
        successCount++;
      } catch (error) {
        const errorMessage = (error as Error).message;
        // Ignore "table already exists" and "column already exists" errors
        if (errorMessage.includes("already exists")) {
          console.log(`   ⚠️  Already exists, skipping...`);
        } else if (errorMessage.includes("duplicate column name")) {
          console.log(`   ⚠️  Column already exists, skipping...`);
        } else {
          console.error(`   ❌ Error: ${errorMessage}`);
          errorCount++;
        }
      }
    }
    console.log(`   ✅ ${successCount} statements executed`);
    if (errorCount > 0) {
      console.log(`   ⚠️  ${errorCount} statements had errors`);
    }
    totalSuccess += successCount;
    totalErrors += errorCount;
  }
  console.log(`\n✅ Database setup complete!`);
  console.log(`   • ${totalSuccess} total statements executed successfully`);
  if (totalErrors > 0) {
    console.log(`   • ${totalErrors} total statements had errors`);
  }
  // List tables
  const tablesResult = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  console.log(`\n📊 Tables in database: ${tablesResult.rows.length}`);
  for (const row of tablesResult.rows) {
    console.log(`   • ${row.name}`);
  }
  // Verify critical tables exist
  const criticalTables = ['artists', 'releases', 'site_settings', 'campaigns', 'beats', 'media_releases'];
  console.log(`\n🔍 Verifying critical tables...`);
  const existingTables = tablesResult.rows.map(r => r.name as string);
  for (const table of criticalTables) {
    if (existingTables.includes(table)) {
      console.log(`   ✅ ${table}`);
    } else {
      console.log(`   ❌ ${table} - MISSING!`);
    }
  }
  client.close();
};
setupDatabase();