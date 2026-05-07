import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { pressKits, artists } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Fetch all active press kits with artist names
    const kitsWithArtists = await db
      .select({
        id: pressKits.id,
        title: pressKits.title,
        description: pressKits.description,
        downloadUrl: pressKits.downloadUrl,
        fileSize: pressKits.fileSize,
        artistId: pressKits.artistId,
        artistName: artists.name,
        createdAt: pressKits.createdAt,
      })
      .from(pressKits)
      .leftJoin(artists, eq(pressKits.artistId, artists.id))
      .where(eq(pressKits.isActive, true))
      .orderBy(desc(pressKits.createdAt));

    return NextResponse.json({
      success: true,
      data: kitsWithArtists,
    });
  } catch (error) {
    console.error("[API] Error fetching press kits list:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch press kits" },
      { status: 500 }
    );
  }
}
