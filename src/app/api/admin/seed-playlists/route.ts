import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedPlaylists, playlistTracks, curatedTracks } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Default playlists to seed
const DEFAULT_PLAYLISTS = [
  {
    id: "gran-reserva",
    name: "Gran Reserva",
    slug: "gran-reserva",
    description: "Los mejores tracks del roster",
    coverColor: "#f97316",
    isPublic: true,
    isActive: true,
    priority: 100,
  },
  {
    id: "weekly-picks",
    name: "Picks de la Semana",
    slug: "picks-de-la-semana",
    description: "Selección semanal",
    coverColor: "#22c55e",
    isPublic: true,
    isActive: true,
    priority: 90,
  },
  {
    id: "new-releases",
    name: "Nuevos Lanzamientos",
    slug: "nuevos-lanzamientos",
    description: "Lo más reciente",
    coverColor: "#3b82f6",
    isPublic: true,
    isActive: true,
    priority: 80,
  },
  {
    id: "classics",
    name: "Clásicos",
    slug: "clasicos",
    description: "Tracks clásicos del crew",
    coverColor: "#8b5cf6",
    isPublic: true,
    isActive: true,
    priority: 70,
  },
  {
    id: "collaborations",
    name: "Colaboraciones",
    slug: "colaboraciones",
    description: "Featurings y colaboraciones",
    coverColor: "#eab308",
    isPublic: true,
    isActive: true,
    priority: 60,
  },
];

// POST - Seed playlists and auto-populate with tracks from curated_tracks
export async function POST() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const results = {
      playlistsCreated: 0,
      playlistsExisting: 0,
      tracksAdded: 0,
      tracksSkipped: 0,
      errors: [] as string[],
    };

    // Step 1: Ensure curated_playlists table exists
    try {
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS "curated_playlists" (
          "id" text PRIMARY KEY NOT NULL,
          "name" text NOT NULL,
          "slug" text NOT NULL UNIQUE,
          "description" text,
          "cover_image_url" text,
          "cover_color" text,
          "is_public" integer DEFAULT 1 NOT NULL,
          "is_active" integer DEFAULT 1 NOT NULL,
          "priority" integer DEFAULT 0 NOT NULL,
          "created_at" integer DEFAULT (unixepoch()) NOT NULL,
          "updated_at" integer DEFAULT (unixepoch()) NOT NULL
        )
      `);
    } catch (e: any) {
      // Table may already exist, that's fine
      if (!e.message?.includes("already exists")) {
        results.errors.push(`Create table: ${e.message}`);
      }
    }

    // Step 2: Seed default playlists
    for (const playlist of DEFAULT_PLAYLISTS) {
      try {
        const existing = await db
          .select()
          .from(curatedPlaylists)
          .where(eq(curatedPlaylists.id, playlist.id))
          .limit(1);

        if (existing.length > 0) {
          results.playlistsExisting++;
          continue;
        }

        await db.insert(curatedPlaylists).values({
          id: playlist.id,
          name: playlist.name,
          slug: playlist.slug,
          description: playlist.description,
          coverColor: playlist.coverColor,
          isPublic: playlist.isPublic,
          isActive: playlist.isActive,
          priority: playlist.priority,
        });
        results.playlistsCreated++;
      } catch (e: any) {
        if (e.message?.includes("UNIQUE constraint")) {
          results.playlistsExisting++;
        } else {
          results.errors.push(`Playlist ${playlist.name}: ${e.message}`);
        }
      }
    }

    // Step 3: Auto-populate playlists from curated_tracks
    // Get all available curated tracks
    const allCuratedTracks = await db
      .select()
      .from(curatedTracks)
      .where(eq(curatedTracks.isAvailableForPlaylist, true));

    if (allCuratedTracks.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Playlists seeded but no curated tracks found. Sync tracks from Spotify first via /admin/curated-channels",
        results,
      });
    }

    // Get existing playlist tracks to avoid duplicates
    const existingPlaylistTracks = await db.select().from(playlistTracks);
    const existingKeys = new Set(
      existingPlaylistTracks.map((t) => `${t.playlistId}:${t.spotifyTrackId}`)
    );

    // Distribute tracks across playlists:
    // - gran-reserva: featured tracks (is_featured = true) + high popularity
    // - weekly-picks: most recent tracks
    // - new-releases: tracks from recent releases (by releaseDate)
    // - classics: oldest tracks
    // - collaborations: tracks with multiple artist_ids (features)

    const featuredTracks = allCuratedTracks.filter((t) => t.isFeatured);
    const tracksByPopularity = [...allCuratedTracks].sort(
      (a, b) => (b.popularity || 0) - (a.popularity || 0)
    );
    const tracksByDate = [...allCuratedTracks].sort(
      (a, b) => (b.releaseDate || "").localeCompare(a.releaseDate || "")
    );
    const tracksByOldest = [...allCuratedTracks].sort(
      (a, b) => (a.releaseDate || "").localeCompare(b.releaseDate || "")
    );

    // Tracks with multiple artists (collaborations)
    const collabTracks = allCuratedTracks.filter((t) => {
      try {
        const ids = t.artistIds ? JSON.parse(t.artistIds) : [];
        return Array.isArray(ids) && ids.length > 1;
      } catch {
        return false;
      }
    });

    // Build the assignments
    const assignments: Array<{ playlistId: string; tracks: typeof allCuratedTracks }> = [
      {
        playlistId: "gran-reserva",
        tracks: featuredTracks.length > 0
          ? featuredTracks
          : tracksByPopularity.slice(0, 30),
      },
      {
        playlistId: "weekly-picks",
        tracks: tracksByDate.slice(0, 20),
      },
      {
        playlistId: "new-releases",
        tracks: tracksByDate.slice(0, 40),
      },
      {
        playlistId: "classics",
        tracks: tracksByOldest.slice(0, 30),
      },
      {
        playlistId: "collaborations",
        tracks: collabTracks.length > 0
          ? collabTracks
          : tracksByPopularity.slice(0, 20),
      },
    ];

    // Add tracks to playlists
    for (const assignment of assignments) {
      let position = 1;

      // Get current max position for this playlist
      const currentTracks = existingPlaylistTracks.filter(
        (t) => t.playlistId === assignment.playlistId
      );
      position = currentTracks.length + 1;

      for (const track of assignment.tracks) {
        const key = `${assignment.playlistId}:${track.spotifyTrackId}`;
        if (existingKeys.has(key)) {
          results.tracksSkipped++;
          continue;
        }

        try {
          await db.insert(playlistTracks).values({
            id: generateUUID(),
            playlistId: assignment.playlistId,
            playlistName: DEFAULT_PLAYLISTS.find((p) => p.id === assignment.playlistId)?.name || null,
            spotifyTrackId: track.spotifyTrackId,
            curatedTrackId: track.id,
            trackName: track.name,
            artistName: track.artistName,
            albumImageUrl: track.albumImageUrl,
            position: position++,
            isActive: true,
          });
          existingKeys.add(key);
          results.tracksAdded++;
        } catch (e: any) {
          if (e.message?.includes("UNIQUE constraint")) {
            results.tracksSkipped++;
          } else {
            results.errors.push(`Track ${track.name}: ${e.message}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Playlists seeded: ${results.playlistsCreated} created, ${results.playlistsExisting} existing. ${results.tracksAdded} tracks added, ${results.tracksSkipped} skipped.`,
      results,
    });
  } catch (error: any) {
    console.error("[Seed Playlists API] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error seeding playlists" },
      { status: 500 }
    );
  }
}

// GET - Check seed status
export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        seeded: false,
        reason: "Database not configured",
      });
    }

    // Check if curated_playlists table has data
    let playlists: any[] = [];
    try {
      playlists = await db.select().from(curatedPlaylists);
    } catch {
      // Table doesn't exist yet
    }

    // Check playlist_tracks count
    let trackCount = 0;
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(playlistTracks);
      trackCount = result[0]?.count || 0;
    } catch {
      // Table doesn't exist yet
    }

    // Check curated_tracks count
    let curatedTrackCount = 0;
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(curatedTracks);
      curatedTrackCount = result[0]?.count || 0;
    } catch {
      // Table doesn't exist yet
    }

    return NextResponse.json({
      success: true,
      seeded: playlists.length > 0 && trackCount > 0,
      playlistsInDb: playlists.length,
      playlistTrackCount: trackCount,
      curatedTrackCount,
      needsSeeding: curatedTrackCount > 0 && trackCount === 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
