import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedSpotifyChannels, curatedTracks } from "@/db/schema";
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
          updates.imageUrl = artistInfo.images?.[0]?.url ?? existingChannel.imageUrl;
          updates.genres = artistInfo.genres?.length ? JSON.stringify(artistInfo.genres) : existingChannel.genres;
          updates.popularity = artistInfo.popularity ?? existingChannel.popularity;
          updates.followers = artistInfo.followers?.total ?? existingChannel.followers;
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
      imageUrl: artistInfo.images?.[0]?.url ?? null,
      genres: artistInfo.genres?.length ? JSON.stringify(artistInfo.genres) : null,
      popularity: artistInfo.popularity ?? null,
      followers: artistInfo.followers?.total ?? null,
      category: category || "roster",
      priority: priority || 0,
      description: description || null,
      autoSync: autoSync !== false,
      syncNewReleases: syncNewReleases !== false,
      syncTopTracks: syncTopTracks !== false,
      isActive: true,
    };

    await db.insert(curatedSpotifyChannels).values(newChannel);

    // Auto-fetch top tracks from Spotify (quick - only 1 API call)
    let topTracksAdded = 0;
    try {
      const topTracks = await spotifyClient.getArtistTopTracks(spotifyArtistId);

      if (topTracks && Array.isArray(topTracks)) {
        for (const track of topTracks) {
          if (!track?.id) continue;

          try {
            // Skip if track already exists (shouldn't happen for new channel, but safe check)
            const existingTrack = await db
              .select()
              .from(curatedTracks)
              .where(eq(curatedTracks.spotifyTrackId, track.id))
              .limit(1);

            if (existingTrack.length > 0) continue;

            const newTrack = {
              id: generateUUID(),
              spotifyTrackId: track.id,
              spotifyTrackUrl: (track as any).external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
              spotifyAlbumId: (track as any).album?.id || null,
              name: track.name || 'Unknown',
              artistName: (track as any).artists?.map((a: any) => a.name).join(", ") || artistInfo.name,
              artistIds: JSON.stringify((track as any).artists?.map((a: any) => a.id) || []),
              albumName: (track as any).album?.name || null,
              albumImageUrl: (track as any).album?.images?.[0]?.url || null,
              durationMs: track.duration_ms ?? null,
              previewUrl: track.preview_url || null,
              releaseDate: (track as any).album?.release_date || null,
              popularity: (track as any).popularity ?? null,
              explicit: Boolean((track as any).explicit),
              curatedChannelId: id,
              isAvailableForPlaylist: true,
              isFeatured: true, // Top tracks are featured by default
            };

            await db.insert(curatedTracks).values(newTrack);
            topTracksAdded++;
          } catch (trackErr) {
            console.warn(`[Curated Channels API] Error inserting track ${track?.id}:`, trackErr);
          }
        }
      }

      console.log(`[Curated Channels API] Auto-fetched ${topTracksAdded} top tracks for ${artistInfo.name}`);
    } catch (err) {
      console.warn(`[Curated Channels API] Could not fetch top tracks for ${artistInfo.name}:`, err);
      // Non-blocking — channel is still created
    }

    return NextResponse.json({
      success: true,
      data: { ...newChannel, topTracksAdded },
      message: `Channel "${artistInfo.name}" added with ${topTracksAdded} top tracks`,
    });
  } catch (error) {
    console.error("[Curated Channels API] Error creating channel:", error);
    return NextResponse.json(
      { success: false, error: "Error creating channel" },
      { status: 500 }
    );
  }
}
