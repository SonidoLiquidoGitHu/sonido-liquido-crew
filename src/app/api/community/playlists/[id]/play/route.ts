import { db, isDatabaseConfigured } from "@/db/client";
import { userPlaylists } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// POST - Increment play count
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true });
    }

    await db
      .update(userPlaylists)
      .set({
        playCount: sql`COALESCE(${userPlaylists.playCount}, 0) + 1`,
      })
      .where(eq(userPlaylists.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Playlist Play] Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
