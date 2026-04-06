import { createClient, type Client } from "@libsql/client/web";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import * as relations from "./relations";
// ===========================================
// DATABASE CONNECTION - LAZY INITIALIZATION
// ===========================================
// Singleton instances
let _client: Client | null = null;
let _db: LibSQLDatabase<typeof schema & typeof relations> | null = null;
/**
 * Check if database is configured
 */
export function isDatabaseConfigured(): boolean {
  const url = (process.env.DATABASE_URL ||
              process.env.TURSO_DATABASE_URL ||
              process.env.LIBSQL_URL || "").trim();
  const token = (process.env.DATABASE_AUTH_TOKEN ||
                process.env.TURSO_AUTH_TOKEN ||
                process.env.LIBSQL_AUTH_TOKEN || "").trim();
  // Both URL and token are required for Turso
  const isConfigured = Boolean(url && token);
  if (!isConfigured && (url || token)) {
    console.warn("[DB] Partial configuration detected:", {
      hasUrl: Boolean(url),
      hasToken: Boolean(token),
    });
  }
  return isConfigured;
}
/**
 * Get database URL from environment
 */
function getDatabaseUrl(): string {
  const url = (process.env.DATABASE_URL ||
              process.env.TURSO_DATABASE_URL ||
              process.env.LIBSQL_URL || "").trim();
  if (!url) {
    console.error("[DB] Database URL not configured. Set DATABASE_URL environment variable.");
    throw new Error("Database URL not configured. Set DATABASE_URL environment variable.");
  }
  return url;
}
/**
 * Get auth token for Turso
 */
function getAuthToken(): string | undefined {
  const token = (process.env.DATABASE_AUTH_TOKEN ||
         process.env.TURSO_AUTH_TOKEN ||
         process.env.LIBSQL_AUTH_TOKEN || "").trim();
  return token || undefined;
}
/**
 * Get or create database client (lazy initialization)
 */
function getClient(): Client {
  if (!_client) {
    console.log("[DB] Initializing database client...");
    try {
      _client = createClient({
        url: getDatabaseUrl(),
        authToken: getAuthToken(),
      });
      console.log("[DB] Database client initialized successfully");
    } catch (error) {
      console.error("[DB] Failed to create database client:", error);
      throw error;
    }
  }
  return _client;
}
/**
 * Get Drizzle ORM instance (lazy initialization)
 */
function getDb(): LibSQLDatabase<typeof schema & typeof relations> {
  if (!_db) {
    const client = getClient();
    _db = drizzle(client, { schema: { ...schema, ...relations } });
  }
  return _db;
}
// ===========================================
// DRIZZLE INSTANCE (LAZY PROXY)
// ===========================================
// Helper to create chainable stub methods that always return empty results
function createChainableStub(): any {
  const chainable: any = {
    from: () => chainable,
    where: () => chainable,
    orderBy: () => chainable,
    limit: () => chainable,
    offset: () => chainable,
    values: () => chainable,
    set: () => chainable,
    returning: () => Promise.resolve([]),
    then: (resolve: (value: any[]) => any) => resolve([]),
  };
  return chainable;
}
// Create a proxy that lazily initializes the database on first access
// This prevents build-time failures when DATABASE_URL is not available
export const db = new Proxy({} as LibSQLDatabase<typeof schema & typeof relations>, {
  get(target, prop) {
    // If DB is not configured (build time OR runtime), return safe defaults
    if (!isDatabaseConfigured()) {
      console.warn(`[DB] Database not configured - returning stub for ${String(prop)}`);
      // Return a no-op function for common methods to prevent crashes
      if (prop === "select" || prop === "insert" || prop === "update" || prop === "delete") {
        return () => createChainableStub();
      }
      if (prop === "query") {
        return new Proxy({}, {
          get: () => ({
            findMany: () => Promise.resolve([]),
            findFirst: () => Promise.resolve(null)
          })
        });
      }
      // For any other property, return undefined
      return undefined;
    }
    const realDb = getDb();
    const value = realDb[prop as keyof typeof realDb];
    if (typeof value === "function") {
      return value.bind(realDb);
    }
    return value;
  }
});
// ===========================================
// DATABASE UTILITIES
// ===========================================
/**
 * Close the database connection
 */
export function closeDatabase(): void {
  // HTTP client doesn't need closing
  _client = null;
  _db = null;
}
/**
 * Execute raw SQL
 */
export async function executeRaw(sql: string): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.warn("[DB] Cannot execute raw SQL - database not configured");
    return;
  }
  const client = getClient();
  await client.execute(sql);
}
/**
 * Check database connection
 */
export async function checkConnection(): Promise<boolean> {
  if (!isDatabaseConfigured()) {
    console.log("[DB] Database not configured");
    return false;
  }
  try {
    const client = getClient();
    await client.execute("SELECT 1");
    console.log("[DB] Database connection healthy");
    return true;
  } catch (error) {
    console.error("[DB] Database connection failed:", error);
    return false;
  }
}
// ===========================================
// EXPORTS
// ===========================================
export { schema };
export type Database = typeof db;
