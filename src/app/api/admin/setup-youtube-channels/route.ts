import { NextResponse } from "next/server";
import { db, isDatabaseConfigured, executeRaw } from "@/db/client";

/**
 * POST - Create YouTube channels table if it doesn't exist
 */
export async function POST() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    // Create youtube_channels table
    await executeRaw(`
      CREATE TABLE IF NOT EXISTS youtube_channels (
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL UNIQUE,
        channel_name TEXT NOT NULL,
        channel_url TEXT NOT NULL,
        thumbnail_url TEXT,
        description TEXT,
        subscriber_count INTEGER,
        video_count INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1,
        display_order INTEGER NOT NULL DEFAULT 0,
        artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);

    // Add channel_id column to videos table if it doesn't exist
    try {
      await executeRaw(`ALTER TABLE videos ADD COLUMN channel_id TEXT REFERENCES youtube_channels(id) ON DELETE SET NULL`);
    } catch (e) {
      // Column might already exist, ignore error
    }

    // Add is_active column to videos table if it doesn't exist
    try {
      await executeRaw(`ALTER TABLE videos ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`);
    } catch (e) {
      // Column might already exist, ignore error
    }

    return NextResponse.json({
      success: true,
      message: "YouTube channels table created/updated successfully",
    });
  } catch (error) {
    console.error("[Setup] Error creating youtube_channels table:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Also allow GET for easier setup
  return POST();
}
