import { db, isDatabaseConfigured } from "@/db/client";
import { artistExternalProfiles, artists } from "@/db/schema";
import { spotifyClient } from "@/lib/clients/spotify";
import { generateUUID } from "@/lib/utils";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST - Sync Spotify data for all artists or a specific one
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 },
      );
    }

    if (!spotifyClient.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Spotify API not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.",
        },
        { status: 500 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { artistId, artistSlug } = body;

    // Fetch artists to sync
    let artistsToSync;
    if (artistId) {
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);
      artistsToSync = artist ? [artist] : [];
    } else if (artistSlug) {
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.slug, artistSlug))
        .limit(1);
      artistsToSync = artist ? [artist] : [];
    } else {
      artistsToSync = await db
        .select()
        .from(artists)
        .where(eq(artists.isActive, true));
    }

    const results: {
      artist: string;
      status: "synced" | "not_found" | "error";
      monthlyListeners?: number;
      followers?: number;
      spotifyId?: string;
      error?: string;
    }[] = [];

    for (const artist of artistsToSync) {
      try {
        // Search for artist on Spotify
        const searchResult = await spotifyClient.search(
          `artist:${artist.name} Sonido Liquido`,
          ["artist"],
          5,
        );

        const spotifyArtist = searchResult.artists?.items?.[0];

        if (!spotifyArtist) {
          // Try without label name
          const retryResult = await spotifyClient.search(
            artist.name,
            ["artist"],
            5,
          );
          const retryArtist = retryResult.artists?.items?.[0];
          if (!retryArtist) {
            results.push({ artist: artist.name, status: "not_found" });
            continue;
          }
          await syncArtistData(artist.id, retryArtist);
          results.push({
            artist: artist.name,
            status: "synced",
            followers: retryArtist.followers?.total,
            spotifyId: retryArtist.id,
          });
          continue;
        }

        await syncArtistData(artist.id, spotifyArtist);
        results.push({
          artist: artist.name,
          status: "synced",
          followers: spotifyArtist.followers?.total,
          spotifyId: spotifyArtist.id,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push({ artist: artist.name, status: "error", error: msg });
      }
    }

    const synced = results.filter((r) => r.status === "synced").length;
    const notFound = results.filter((r) => r.status === "not_found").length;
    const errors = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} artist(s), ${notFound} not found, ${errors} errors`,
      results,
      summary: { synced, notFound, errors, total: results.length },
    });
  } catch (error) {
    console.error("[Spotify Sync] Error:", error);
    return NextResponse.json(
      { success: false, error: "Spotify sync failed" },
      { status: 500 },
    );
  }
}

// Helper to sync artist data
async function syncArtistData(
  artistId: string,
  spotifyArtist: {
    id: string;
    name: string;
    followers?: { total: number };
    external_urls?: { spotify: string };
  },
) {
  // Update artist stats
  await db
    .update(artists)
    .set({
      followers: spotifyArtist.followers?.total || null,
      monthlyListeners: spotifyArtist.followers?.total || null,
      updatedAt: new Date(),
    })
    .where(eq(artists.id, artistId));

  // Update or create Spotify external profile
  const [existingProfile] = await db
    .select()
    .from(artistExternalProfiles)
    .where(
      and(
        eq(artistExternalProfiles.artistId, artistId),
        eq(artistExternalProfiles.platform, "spotify"),
      ),
    )
    .limit(1);

  if (existingProfile) {
    await db
      .update(artistExternalProfiles)
      .set({
        externalId: spotifyArtist.id,
        externalUrl:
          spotifyArtist.external_urls?.spotify || existingProfile.externalUrl,
        handle: spotifyArtist.id,
        displayName: spotifyArtist.name,
        followerCount: spotifyArtist.followers?.total || null,
        lastSynced: new Date(),
      })
      .where(eq(artistExternalProfiles.id, existingProfile.id));
  } else {
    await db.insert(artistExternalProfiles).values({
      id: generateUUID(),
      artistId,
      platform: "spotify",
      externalId: spotifyArtist.id,
      externalUrl:
        spotifyArtist.external_urls?.spotify ||
        `https://open.spotify.com/artist/${spotifyArtist.id}`,
      handle: spotifyArtist.id,
      displayName: spotifyArtist.name,
      isPrimary: true,
      followerCount: spotifyArtist.followers?.total || null,
      lastSynced: new Date(),
    });
  }
}

// GET - Check Spotify API connectivity
export async function GET() {
  try {
    if (!spotifyClient.isConfigured()) {
      return NextResponse.json({
        success: false,
        connected: false,
        message:
          "Spotify API not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.",
      });
    }

    // Try a simple search to verify connectivity
    await spotifyClient.search("test", ["artist"], 1);

    return NextResponse.json({
      success: true,
      connected: true,
      message: "Spotify API is connected",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
