import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels, curatedTracks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { spotifyClient } from "@/lib/clients/spotify";

export const dynamic = "force-dynamic";

// GET - Get a single curated channel with its tracks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const [channel] = await db
      .select()
      .from(curatedSpotifyChannels)
      .where(eq(curatedSpotifyChannels.id, id))
      .limit(1);

    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 }
      );
    }

    // Get tracks for this channel
    const tracks = await db
      .select()
      .from(curatedTracks)
      .where(eq(curatedTracks.curatedChannelId, id));

    return NextResponse.json({
      success: true,
      data: {
        ...channel,
        genres: channel.genres ? JSON.parse(channel.genres) : [],
        tracks,
        trackCount: tracks.length,
      },
    });
  } catch (error) {
    console.error("[Curated Channels API] Error fetching channel:", error);
    return NextResponse.json(
      { success: false, error: "Error fetching channel" },
      { status: 500 }
    );
  }
}

// PUT - Update a curated channel
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const { category, priority, description, autoSync, syncNewReleases, syncTopTracks, isActive } = body;

    // Check if exists
    const [existing] = await db
      .select()
      .from(curatedSpotifyChannels)
      .where(eq(curatedSpotifyChannels.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 }
      );
    }

    // Update
    const updates: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (category !== undefined) updates.category = category;
    if (priority !== undefined) updates.priority = priority;
    if (description !== undefined) updates.description = description;
    if (autoSync !== undefined) updates.autoSync = autoSync;
    if (syncNewReleases !== undefined) updates.syncNewReleases = syncNewReleases;
    if (syncTopTracks !== undefined) updates.syncTopTracks = syncTopTracks;
    if (isActive !== undefined) updates.isActive = isActive;

    await db
      .update(curatedSpotifyChannels)
      .set(updates)
      .where(eq(curatedSpotifyChannels.id, id));

    return NextResponse.json({
      success: true,
      message: "Channel updated successfully",
    });
  } catch (error) {
    console.error("[Curated Channels API] Error updating channel:", error);
    return NextResponse.json(
      { success: false, error: "Error updating channel" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a curated channel
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    // Check if exists
    const [existing] = await db
      .select()
      .from(curatedSpotifyChannels)
      .where(eq(curatedSpotifyChannels.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 }
      );
    }

    // Delete (cascades to curated_tracks)
    await db
      .delete(curatedSpotifyChannels)
      .where(eq(curatedSpotifyChannels.id, id));

    return NextResponse.json({
      success: true,
      message: `Channel "${existing.name}" removed successfully`,
    });
  } catch (error) {
    console.error("[Curated Channels API] Error deleting channel:", error);
    return NextResponse.json(
      { success: false, error: "Error deleting channel" },
      { status: 500 }
    );
  }
}
