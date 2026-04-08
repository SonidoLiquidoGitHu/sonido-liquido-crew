import { NextResponse } from "next/server";
import { getClient, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ beatId: string }> }
) {
  try {
    const { beatId } = await params;

    await initializeDatabase();
    const client = await getClient();

    // Try to find by ID first, then by slug
    let result = await client.execute({
      sql: "SELECT * FROM beats WHERE id = ?",
      args: [beatId],
    });

    // If not found by ID, try by slug
    if (result.rows.length === 0) {
      result = await client.execute({
        sql: "SELECT * FROM beats WHERE slug = ?",
        args: [beatId],
      });
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Beat not found" },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    // ... existing code ... <Get download gate actions and return beat data>
