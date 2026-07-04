import { db } from "@/db/client";
import { releaseArtists } from "@/db/schema";
import { generateUUID } from "@/lib/utils";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// ===========================================
// DIRECT FIX: Add missing artist links for collaboration releases
// ===========================================
// This is a targeted fix that directly inserts known missing links
// without any Spotify API calls. Run once to fix the data.

interface MissingLink {
  releaseSpotifyId: string;
  artistSpotifyId: string;
  artistName: string;
}

// Known missing links (from Spotify: Trap Juicy by Dilema, Zaque, X Santa-Ana)
// Add more as needed
const KNOWN_MISSING_LINKS: MissingLink[] = [
  // Trap Juicy (album spotify ID: 51TxelbJOpnbyXSsJG3p2U)
  {
    releaseSpotifyId: "51TxelbJOpnbyXSsJG3p2U",
    artistSpotifyId: "3eCEorgAoZkvnAQLdy4x38",
    artistName: "Dilema",
  },
  {
    releaseSpotifyId: "51TxelbJOpnbyXSsJG3p2U",
    artistSpotifyId: "4WQmw3fIx9F7iPKL5v8SCN",
    artistName: "Zaque",
  },
];

export async function POST() {
  const results = {
    success: true,
    linksCreated: 0,
    linksSkipped: 0,
    errors: [] as string[],
    fixes: [] as { release: string; artist: string }[],
  };

  try {
    for (const link of KNOWN_MISSING_LINKS) {
      try {
        // Find the release by Spotify ID
        const { releases } = await import("@/db/schema");
        const [release] = await db
          .select()
          .from(releases)
          .where(eq(releases.spotifyId, link.releaseSpotifyId))
          .limit(1);

        if (!release) {
          results.errors.push(
            `Release ${link.releaseSpotifyId} not found in DB`,
          );
          continue;
        }

        // Find the artist by their Spotify external profile
        const { artists, artistExternalProfiles } = await import("@/db/schema");
        const [profile] = await db
          .select()
          .from(artistExternalProfiles)
          .where(
            and(
              eq(artistExternalProfiles.platform, "spotify"),
              eq(artistExternalProfiles.externalId, link.artistSpotifyId),
            ),
          )
          .limit(1);

        if (!profile) {
          results.errors.push(
            `Artist ${link.artistName} (${link.artistSpotifyId}) not found in DB profiles`,
          );
          continue;
        }

        // Check if link already exists
        const [existing] = await db
          .select()
          .from(releaseArtists)
          .where(
            and(
              eq(releaseArtists.releaseId, release.id),
              eq(releaseArtists.artistId, profile.artistId),
            ),
          )
          .limit(1);

        if (existing) {
          results.linksSkipped++;
          continue;
        }

        // Create the link
        await db.insert(releaseArtists).values({
          id: generateUUID(),
          releaseId: release.id,
          artistId: profile.artistId,
          isPrimary: false,
        });

        results.linksCreated++;
        results.fixes.push({ release: release.title, artist: link.artistName });
        console.log(
          `[Direct Fix] Linked "${release.title}" → ${link.artistName}`,
        );
      } catch (error) {
        results.errors.push(
          `Failed to link ${link.artistName}: ${(error as Error).message}`,
        );
      }
    }

    return NextResponse.json({
      ...results,
      message: `Created ${results.linksCreated} missing links, skipped ${results.linksSkipped} existing`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ...results,
        success: false,
        error: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message:
      "POST to apply known missing artist links (no Spotify API calls needed)",
    knownMissingLinks: KNOWN_MISSING_LINKS,
  });
}
