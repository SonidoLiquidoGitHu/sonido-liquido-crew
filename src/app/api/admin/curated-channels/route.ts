import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { spotifyClient, SpotifyClient } from "@/lib/clients/spotify";
import { generateUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";

// GET - List all curated channels
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const activeOnly = searchParams.get("active") !== "false";

    let query = db.select().from(curatedSpotifyChannels);

    const channels = await query
      .orderBy(desc(curatedSpotifyChannels.priority), asc(curatedSpotifyChannels.name));

    // Filter in JS since SQLite doesn't support dynamic where clauses well
    let filtered = channels;
    if (category) {
      filtered = filtered.filter(c => c.category === category);
    }
    if (activeOnly) {
      filtered = filtered.filter(c => c.isActive);
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      count: filtered.length,
    });
  } catch (error) {
    console.error("[Curated Channels API] Error fetching channels:", error);
    return NextResponse.json(
      { success: false, error: "Error fetching channels" },
      { status: 500 }
    );
  }
}

// POST - Add a new curated channel
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { spotifyUrl, category, priority, description, autoSync, syncNewReleases, syncTopTracks } = body;

    if (!spotifyUrl) {
      return NextResponse.json(
        { success: false, error: "Spotify URL is required" },
        { status: 400 }
      );
    }

    // Extract Spotify artist ID from URL
    const spotifyArtistId = SpotifyClient.extractId(spotifyUrl);
    if (!spotifyArtistId) {
      return NextResponse.json(
        { success: false, error: "Invalid Spotify URL. Supported formats: https://open.spotify.com/artist/..., https://open.spotify.com/intl-XX/artist/..., or spotify:artist:..." },
        { status: 400 }
      );
    }

    // Check if already exists
    const existing = await db
      .select()
      .from(curatedSpotifyChannels)
      .where(eq(curatedSpotifyChannels.spotifyArtistId, spotifyArtistId))
      .limit(1);

    if (existing.length > 0) {
      const existingChannel = existing[0];

      // If the channel exists but is inactive, reactivate it instead of erroring
      if (!existingChannel.isActive) {
        const updates: Record<string, unknown> = {
          isActive: true,
          category: category || existingChannel.category,
          priority: priority || existingChannel.priority,
          description: description || existingChannel.description,
          updatedAt: new Date(),
        };

        // Refresh artist info from Spotify
        try {
          const artistInfo = await spotifyClient.getArtist(spotifyArtistId);
          updates.name = artistInfo.name;
          updates.imageUrl = artistInfo.images?.[0]?.url || existingChannel.imageUrl;
          updates.genres = artistInfo.genres ? JSON.stringify(artistInfo.genres) : existingChannel.genres;
          updates.popularity = artistInfo.popularity || existingChannel.popularity;
          updates.followers = artistInfo.followers?.total || existingChannel.followers;
        } catch {
          // Keep existing data if Spotify fetch fails
        }

        await db
          .update(curatedSpotifyChannels)
          .set(updates)
          .where(eq(curatedSpotifyChannels.id, existingChannel.id));

        return NextResponse.json({
          success: true,
          data: { ...existingChannel, ...updates, isActive: true },
          message: `Channel "${existingChannel.name}" reactivated successfully`,
          reactivated: true,
        });
      }

      return NextResponse.json(
        { success: false, error: "This channel is already curated", existing: existingChannel },
        { status: 409 }
      );
    }

    // Fetch artist info from Spotify
    let artistInfo;
    try {
      artistInfo = await spotifyClient.getArtist(spotifyArtistId);
    } catch (err) {
      console.error("[Curated Channels API] Error fetching from Spotify:", err);
      return NextResponse.json(
        { success: false, error: "Could not fetch artist from Spotify" },
        { status: 400 }
      );
    }

    // Create the curated channel
    const id = generateUUID();
    const newChannel = {
      id,
      spotifyArtistId,
      spotifyArtistUrl: `https://open.spotify.com/artist/${spotifyArtistId}`,
      name: artistInfo.name,
      imageUrl: artistInfo.images?.[0]?.url || null,
      genres: artistInfo.genres ? JSON.stringify(artistInfo.genres) : null,
      popularity: artistInfo.popularity || null,
      followers: artistInfo.followers?.total || null,
      category: category || "roster",
      priority: priority || 0,
      description: description || null,
      autoSync: autoSync !== false,
      syncNewReleases: syncNewReleases !== false,
      syncTopTracks: syncTopTracks !== false,
      isActive: true,
    };

    await db.insert(curatedSpotifyChannels).values(newChannel);

    return NextResponse.json({
      success: true,
      data: newChannel,
      message: `Channel "${artistInfo.name}" added successfully`,
    });
  } catch (error) {
    console.error("[Curated Channels API] Error creating channel:", error);
    return NextResponse.json(
      { success: false, error: "Error creating channel" },
      { status: 500 }
    );
  }
}
