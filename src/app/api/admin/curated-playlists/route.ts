import { db, isDatabaseConfigured } from "@/db/client";
import { curatedPlaylists, playlistTracks } from "@/db/schema";
import { generateUUID, slugify } from "@/lib/utils";
import { asc, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET - List all curated playlists with full details and track counts
export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 },
      );
    }

    const playlists = await db
      .select()
      .from(curatedPlaylists)
      .orderBy(desc(curatedPlaylists.priority), asc(curatedPlaylists.name));

    // Get track counts for each playlist
    const allTracks = await db.select().from(playlistTracks);

    const playlistsWithCounts = playlists.map((playlist) => {
      const trackCount = allTracks.filter(
        (t) => t.playlistId === playlist.id && t.isActive,
      ).length;
      return {
        ...playlist,
        trackCount,
      };
    });

    return NextResponse.json({
      success: true,
      data: playlistsWithCounts,
    });
  } catch (error) {
    console.error("[Curated Playlists API] Error listing playlists:", error);
    return NextResponse.json(
      { success: false, error: "Error fetching playlists" },
      { status: 500 },
    );
  }
}

// POST - Create a new curated playlist
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const {
      name,
      slug: providedSlug,
      description,
      coverImageUrl,
      coverColor,
      spotifyPlaylistId,
      spotifyPlaylistUrl,
      isPublic,
      isActive,
      priority,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Playlist name is required" },
        { status: 400 },
      );
    }

    const slug = providedSlug || slugify(name);

    // Check for slug uniqueness
    const existing = await db
      .select()
      .from(curatedPlaylists)
      .where(eq(curatedPlaylists.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: "A playlist with this slug already exists" },
        { status: 409 },
      );
    }

    const newPlaylist = {
      id: generateUUID(),
      name: name.trim(),
      slug,
      description: description || null,
      coverImageUrl: coverImageUrl || null,
      coverColor: coverColor || null,
      spotifyPlaylistId: spotifyPlaylistId || null,
      spotifyPlaylistUrl: spotifyPlaylistUrl || null,
      isPublic: isPublic !== undefined ? isPublic : true,
      isActive: isActive !== undefined ? isActive : true,
      priority: priority || 0,
      trackCount: 0,
    };

    await db.insert(curatedPlaylists).values(newPlaylist);

    return NextResponse.json({
      success: true,
      data: newPlaylist,
      message: `Playlist "${name}" created successfully`,
    });
  } catch (error) {
    console.error("[Curated Playlists API] Error creating playlist:", error);
    return NextResponse.json(
      { success: false, error: "Error creating playlist" },
      { status: 500 },
    );
  }
}
