import { NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { releases, releaseArtists, upcomingReleases } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Normalize a title for comparison: "y" == "&", strip accents, lowercase
function normalize(t: string) {
  return t
    .toLowerCase()
    .replace(/&/g, "y")
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// POST /api/admin/deduplicate-releases
// Finds and removes duplicate releases whose titles differ only by minor
// variations (e.g. "y" vs "&"). Keeps the Spotify-synced version and
// migrates artist links before deleting the duplicate.
export async function POST() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
  }

  const results: { kept: string; removed: string }[] = [];
  const errors: string[] = [];

  try {
    const allReleases = await db
      .select({
        id: releases.id,
        title: releases.title,
        slug: releases.slug,
        spotifyId: releases.spotifyId,
      })
      .from(releases);

    // Group by normalized title
    const byNormTitle = new Map<string, typeof allReleases>();
    for (const r of allReleases) {
      const key = normalize(r.title);
      if (!byNormTitle.has(key)) byNormTitle.set(key, []);
      byNormTitle.get(key)!.push(r);
    }

    for (const [, group] of byNormTitle) {
      if (group.length < 2) continue;

      // Prefer the Spotify-synced version (has spotifyId)
      const keep = group.find(r => r.spotifyId) || group[0];
      const toRemove = group.filter(r => r.id !== keep.id);

      for (const dup of toRemove) {
        try {
          // Move artist links from duplicate to keeper
          const dupLinks = await db
            .select()
            .from(releaseArtists)
            .where(eq(releaseArtists.releaseId, dup.id));

          for (const link of dupLinks) {
            const [existingLink] = await db
              .select()
              .from(releaseArtists)
              .where(and(
                eq(releaseArtists.releaseId, keep.id),
                eq(releaseArtists.artistId, link.artistId)
              ))
              .limit(1);

            if (!existingLink) {
              await db
                .update(releaseArtists)
                .set({ releaseId: keep.id })
                .where(eq(releaseArtists.id, link.id));
            } else {
              await db
                .delete(releaseArtists)
                .where(eq(releaseArtists.id, link.id));
            }
          }

          // Update any upcoming_releases pointing to the duplicate
          try {
            await db
              .update(upcomingReleases)
              .set({ releasedReleaseId: keep.id })
              .where(eq(upcomingReleases.releasedReleaseId, dup.id));
          } catch { /* non-critical */ }

          // Delete the duplicate release
          await db.delete(releaseArtists).where(eq(releaseArtists.releaseId, dup.id));
          await db.delete(releases).where(eq(releases.id, dup.id));

          results.push({ kept: keep.title, removed: dup.title });
          console.log(`[Dedup] Removed "${dup.title}" (keeping "${keep.title}")`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`Failed to dedup "${dup.title}": ${msg}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      duplicatesFound: results.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[Dedup] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
