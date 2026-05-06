import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedTracks, curatedSpotifyChannels } from "@/db/schema";
import { eq, desc, and, like, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET - List all curated tracks with filters
// Supports pagination via ?limit=N&offset=N (default: all tracks)
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const featured = searchParams.get("featured");
    const available = searchParams.get("available");
    const searchQuery = searchParams.get("search");
    const limitParam = searchParams.get("limit");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get total count first (before any limit)
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(curatedTracks);

    const totalInDb = countResult?.count ?? 0;

    // Build query — no default limit, fetch all tracks
    // (Admin panel needs to see all tracks; pagination can be added later if needed)
    const limit = limitParam ? parseInt(limitParam) : 9999;

    // Get all tracks with channel info
    const tracks = await db
      .select({
        track: curatedTracks,
        channel: {
          id: curatedSpotifyChannels.id,
          name: curatedSpotifyChannels.name,
          imageUrl: curatedSpotifyChannels.imageUrl,
          category: curatedSpotifyChannels.category,
        },
      })
      .from(curatedTracks)
      .leftJoin(curatedSpotifyChannels, eq(curatedTracks.curatedChannelId, curatedSpotifyChannels.id))
      .orderBy(desc(curatedTracks.addedAt))
      .limit(limit)
      .offset(offset);

    // Filter in JS for flexibility
    let filtered = tracks;

    if (channelId) {
      filtered = filtered.filter(t => t.track.curatedChannelId === channelId);
    }

    if (featured === "true") {
      filtered = filtered.filter(t => t.track.isFeatured);
    }

    if (available === "true") {
      filtered = filtered.filter(t => t.track.isAvailableForPlaylist);
    } else if (available === "false") {
      filtered = filtered.filter(t => !t.track.isAvailableForPlaylist);
    }

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.track.name.toLowerCase().includes(searchLower) ||
        t.track.artistName.toLowerCase().includes(searchLower) ||
        (t.track.albumName?.toLowerCase().includes(searchLower) ?? false)
      );
    }

    // Format response
    const formattedTracks = filtered.map(({ track, channel }) => ({
      ...track,
      channel: channel || null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedTracks,
      count: formattedTracks.length,
      total: totalInDb,
    });
  } catch (error) {
    console.error("[Curated Tracks API] Error fetching tracks:", error);
    return NextResponse.json(
      { success: false, error: "Error fetching tracks" },
      { status: 500 }
    );
  }
}
