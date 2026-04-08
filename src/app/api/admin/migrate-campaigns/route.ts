import { NextResponse } from "next/server";
import { createClient } from "@libsql/client/web";

function getRawClient() {
  const url = (process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || "").trim();
  const token = (process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN || "").trim();
  if (!url || !token) return null;
  return createClient({ url, authToken: token });
}

export async function GET() {
  const results: { column: string; status: string }[] = [];

  try {
    const client = getRawClient();
    if (!client) {
      return NextResponse.json({ success: false, error: "No database client" });
    }

    // Get current columns
    const schemaResult = await client.execute("PRAGMA table_info(campaigns)");
    const existingColumns = new Set(schemaResult.rows.map((row: any) => row.name));

    // Columns to add if missing
    const columnsToAdd = [
      { name: "youtube_video_id", type: "TEXT" },
      { name: "video_is_vertical", type: "INTEGER DEFAULT 0" },
      { name: "preview_video_url", type: "TEXT" },
    ];

    for (const col of columnsToAdd) {
      if (existingColumns.has(col.name)) {
        results.push({ column: col.name, status: "✅ Ya existe" });
      } else {
        try {
          await client.execute(`ALTER TABLE campaigns ADD COLUMN ${col.name} ${col.type}`);
          results.push({ column: col.name, status: "✅ Agregada" });
        } catch (error: any) {
          results.push({ column: col.name, status: `❌ Error: ${error.message}` });
        }
      }
    }

    // Verify final schema
    const finalSchema = await client.execute("PRAGMA table_info(campaigns)");
    const finalColumns = finalSchema.rows.map((row: any) => row.name);

    return NextResponse.json({
      success: true,
      message: "Migración completada",
      results,
      totalColumns: finalColumns.length,
      columns: finalColumns,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      results,
    });
  }
}
