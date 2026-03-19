import { NextResponse } from "next/server";
import { getClient, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

export async function GET(request: Request) {
  try {
    await initializeDatabase();
    const client = await getClient();
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    // Only get upcoming releases (release_date >= today) unless all=true
    const today = new Date().toISOString().split("T")[0];

    const sql = all
      ? "SELECT * FROM upcoming_releases ORDER BY release_date ASC, sort_order ASC"
      : "SELECT * FROM upcoming_releases WHERE is_active = 1 AND release_date >= ? ORDER BY release_date ASC, sort_order ASC";

    const result = all
      ? await client.execute(sql)
      : await client.execute({ sql, args: [today] });

    const releases = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      artistName: row.artist_name,
      releaseType: row.release_type,
      releaseDate: row.release_date,
      coverImageUrl: row.cover_image_url,
      description: row.description,
      status: row.status,
      isFeatured: Boolean(row.is_featured),
      isActive: Boolean(row.is_active),
      presaveUrl: row.presave_url,
      presavePlatform: row.presave_platform,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      releases,
      count: releases.length,
    });
  } catch (error) {
    console.error("Error fetching upcoming releases:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch upcoming releases" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    await initializeDatabase();
    const client = await getClient();

    const id = generateId();
    const now = new Date().toISOString();

    await client.execute({
      sql: `
        INSERT INTO upcoming_releases (
          id, title, artist_name, release_type, release_date,
          cover_image_url, description, status, is_featured, is_active,
          presave_url, presave_platform, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        data.title,
        data.artistName,
        data.releaseType || "single",
        data.releaseDate,
        data.coverImageUrl || null,
        data.description || null,
        data.status || "listo",
        data.isFeatured ? 1 : 0,
        data.isActive !== false ? 1 : 0,
        data.presaveUrl || null,
        data.presavePlatform || "onerpm",
        data.sortOrder || 0,
        now,
        now,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Upcoming release created successfully",
      id,
    });
  } catch (error) {
    console.error("Error creating upcoming release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create upcoming release" },
      { status: 500 }
    );
  }
}
