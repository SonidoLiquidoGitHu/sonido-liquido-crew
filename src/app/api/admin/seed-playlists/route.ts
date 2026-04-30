import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { curatedPlaylists, playlistTracks, curatedTracks, releases } from "@/db/schema";
import { eq, sql, desc, asc } from "drizzle-orm";
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

// POST - Seed playlists and auto-populate with tracks
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
      source: "none" as string,
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
      if (!e.message?.includes("already exists")) {
        results.errors.push(`Create table: ${e.message}`);
      }
    }

    // Step 1b: Add missing columns if they don't exist (migration fix for older schema)
    const alterStatements = [
      `ALTER TABLE "curated_playlists" ADD COLUMN "cover_color" text`,
      `ALTER TABLE "curated_playlists" ADD COLUMN "is_public" integer DEFAULT 1 NOT NULL`,
      `ALTER TABLE "curated_playlists" ADD COLUMN "cover_image_url" text`,
    ];
    for (const stmt of alterStatements) {
      try {
        await db.run(sql.raw(stmt));
      } catch {
        // Column already exists, that's fine
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

    // Step 3: Get existing playlist tracks to avoid duplicates
    const existingPlaylistTracks = await db.select().from(playlistTracks);
    const existingKeys = new Set(
      existingPlaylistTracks.map((t) => `${t.playlistId}:${t.spotifyTrackId}`)
    );

    // If already have tracks, skip seeding
    if (existingPlaylistTracks.length > 0) {
      return NextResponse.json({
        success: true,
        message: `Playlists already have ${existingPlaylistTracks.length} tracks. Skipping auto-seed.`,
        results: { ...results, tracksSkipped: existingPlaylistTracks.length },
      });
    }

    // Step 4: Try to populate from curated_tracks first, then fall back to releases
    let curatedTracksCount = 0;
    try {
      const ctResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(curatedTracks);
      curatedTracksCount = ctResult[0]?.count || 0;
    } catch {
      // Table may not exist
    }

    if (curatedTracksCount > 0) {
      results.source = "curated_tracks";
      await seedFromCuratedTracks(results, existingKeys);
    } else {
      // Fall back to releases table
      results.source = "releases";
      await seedFromReleases(results, existingKeys);
    }

    return NextResponse.json({
      success: true,
      message: `Playlists seeded: ${results.playlistsCreated} created, ${results.playlistsExisting} existing. ${results.tracksAdded} tracks added from ${results.source}.`,
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

async function seedFromCuratedTracks(
  results: { tracksAdded: number; tracksSkipped: number; errors: string[] },
  existingKeys: Set<string>
) {
  const allCuratedTracks = await db
    .select()
    .from(curatedTracks)
    .where(eq(curatedTracks.isAvailableForPlaylist, true));

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

  const collabTracks = allCuratedTracks.filter((t) => {
    try {
      const ids = t.artistIds ? JSON.parse(t.artistIds) : [];
      return Array.isArray(ids) && ids.length > 1;
    } catch {
      return false;
    }
  });

  const assignments = [
    { playlistId: "gran-reserva", tracks: featuredTracks.length > 0 ? featuredTracks : tracksByPopularity.slice(0, 30) },
    { playlistId: "weekly-picks", tracks: tracksByDate.slice(0, 20) },
    { playlistId: "new-releases", tracks: tracksByDate.slice(0, 40) },
    { playlistId: "classics", tracks: tracksByOldest.slice(0, 30) },
    { playlistId: "collaborations", tracks: collabTracks.length > 0 ? collabTracks : tracksByPopularity.slice(0, 20) },
  ];

  for (const assignment of assignments) {
    let position = 1;
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
}

async function seedFromReleases(
  results: { tracksAdded: number; tracksSkipped: number; errors: string[] },
  existingKeys: Set<string>
) {
  // Get all releases that have a Spotify ID
  const allReleases = await db
    .select()
    .from(releases)
    .orderBy(desc(releases.releaseDate));

  // Filter to releases with Spotify IDs
  const releasesWithSpotify = allReleases.filter((r) => r.spotifyId);

  if (releasesWithSpotify.length === 0) {
    results.errors.push("No releases with Spotify IDs found");
    return;
  }

  // Sort releases for different playlists
  const featuredReleases = releasesWithSpotify.filter((r) => r.isFeatured);
  const recentReleases = [...releasesWithSpotify].sort(
    (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
  );
  const oldestReleases = [...releasesWithSpotify].sort(
    (a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
  );

  // Build assignments using releases (as albums in the playlist)
  const assignments = [
    {
      playlistId: "gran-reserva",
      items: featuredReleases.length > 0 ? featuredReleases : recentReleases.slice(0, 25),
    },
    {
      playlistId: "weekly-picks",
      items: recentReleases.slice(0, 15),
    },
    {
      playlistId: "new-releases",
      items: recentReleases.slice(0, 30),
    },
    {
      playlistId: "classics",
      items: oldestReleases.slice(0, 25),
    },
    {
      playlistId: "collaborations",
      items: recentReleases.slice(0, 20), // Will be refined later with collab detection
    },
  ];

  for (const assignment of assignments) {
    let position = 1;
    for (const release of assignment.items) {
      // Use the album Spotify ID — when saving to Spotify, these become album URIs
      const key = `${assignment.playlistId}:${release.spotifyId}`;
      if (existingKeys.has(key)) {
        results.tracksSkipped++;
        continue;
      }

      // Extract artist name from description (format: "Album by ArtistName" or "Single by ArtistName")
      let artistName = "Sonido Líquido Crew";
      if (release.description) {
        const byMatch = release.description.match(/by\s+(.+)$/i);
        if (byMatch) {
          artistName = byMatch[1].trim();
        }
      }

      try {
        await db.insert(playlistTracks).values({
          id: generateUUID(),
          playlistId: assignment.playlistId,
          playlistName: DEFAULT_PLAYLISTS.find((p) => p.id === assignment.playlistId)?.name || null,
          spotifyTrackId: release.spotifyId!, // Album ID, used for Spotify URI construction
          curatedTrackId: null,
          trackName: release.title,
          artistName,
          albumImageUrl: release.coverImageUrl,
          position: position++,
          isActive: true,
        });
        existingKeys.add(key);
        results.tracksAdded++;
      } catch (e: any) {
        if (e.message?.includes("UNIQUE constraint")) {
          results.tracksSkipped++;
        } else {
          results.errors.push(`Release ${release.title}: ${e.message}`);
        }
      }
    }
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

    let playlists: any[] = [];
    try {
      playlists = await db.select().from(curatedPlaylists);
    } catch {
      // Table doesn't exist yet
    }

    let trackCount = 0;
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(playlistTracks);
      trackCount = result[0]?.count || 0;
    } catch {
      // Table doesn't exist yet
    }

    let curatedTrackCount = 0;
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(curatedTracks);
      curatedTrackCount = result[0]?.count || 0;
    } catch {
      // Table doesn't exist yet
    }

    let releaseCount = 0;
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(releases);
      releaseCount = result[0]?.count || 0;
    } catch {
      // Table doesn't exist yet
    }

    return NextResponse.json({
      success: true,
      seeded: playlists.length > 0 && trackCount > 0,
      playlistsInDb: playlists.length,
      playlistTrackCount: trackCount,
      curatedTrackCount,
      releaseCount,
      needsSeeding: (curatedTrackCount > 0 || releaseCount > 0) && trackCount === 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
