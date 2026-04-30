import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedTracks, curatedSpotifyChannels } from "@/db/schema";
import { eq, desc, and, like, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET - List all curated tracks with filters
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const featured = searchParams.get("featured");
    const available = searchParams.get("available");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

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

    if (search) {
      const searchLower = search.toLowerCase();
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
      total: tracks.length,
    });
  } catch (error) {
    console.error("[Curated Tracks API] Error fetching tracks:", error);
    return NextResponse.json(
      { success: false, error: "Error fetching tracks" },
      { status: 500 }
    );
  }
}
