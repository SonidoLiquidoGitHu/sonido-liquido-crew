import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check environment variables
  const dbUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || "";
  const dbToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN || "";

  results.env = {
    hasUrl: Boolean(dbUrl),
    urlPrefix: dbUrl ? dbUrl.substring(0, 20) + "..." : "MISSING",
    hasToken: Boolean(dbToken),
    tokenPrefix: dbToken ? dbToken.substring(0, 10) + "..." : "MISSING",
    isLocal: dbUrl.startsWith("file:"),
  };

  // 2. Try loading @libsql/client/web
  try {
    const webModule = require("@libsql/client/web");
    results.webClient = { available: true, hasCreateClient: typeof webModule.createClient === "function" };
  } catch (err: unknown) {
    results.webClient = { available: false, error: (err as Error).message };
  }

  // 3. Try loading @libsql/client (Node.js)
  try {
    const nodeModule = require("@libsql/client");
    results.nodeClient = { available: true, hasCreateClient: typeof nodeModule.createClient === "function" };
  } catch (err: unknown) {
    results.nodeClient = { available: false, error: (err as Error).message };
  }

  // 4. Try creating a client and querying
  try {
    const libsql = dbUrl.startsWith("file:")
      ? require("@libsql/client")
      : require("@libsql/client/web");

    const client = libsql.createClient({
      url: dbUrl,
      authToken: dbToken || undefined,
    });

    const res = await client.execute("SELECT count(*) as count FROM artists");
    results.query = { success: true, artistCount: res.rows[0]?.count };

    // Try a select query
    const res2 = await client.execute("SELECT id, name, slug FROM artists LIMIT 3");
    results.sampleArtists = res2.rows;

    client.close();
  } catch (err: unknown) {
    results.query = { success: false, error: (err as Error).message, stack: (err as Error).stack?.substring(0, 500) };
  }

  // 5. Check isDatabaseConfigured
  try {
    const { isDatabaseConfigured } = await import("@/db/client");
    results.isDatabaseConfigured = isDatabaseConfigured();
  } catch (err: unknown) {
    results.isDatabaseConfigured = { error: (err as Error).message };
  }

  return NextResponse.json(results, { status: 200 });
}
