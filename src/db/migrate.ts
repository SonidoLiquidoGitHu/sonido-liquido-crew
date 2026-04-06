import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./client";
import path from "path";
// ===========================================
// MIGRATION RUNNER
// ===========================================
async function runMigrations() {
  console.log("🔄 Running database migrations...\n");
  try {
    const migrationsFolder = path.join(__dirname, "migrations");
    await migrate(db, { migrationsFolder });
    console.log("✅ Migrations completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}
runMigrations();