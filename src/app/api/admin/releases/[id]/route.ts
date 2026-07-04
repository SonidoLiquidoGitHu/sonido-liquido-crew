import { db } from "@/db/client";
import {
  deletedReleasesBlocklist,
  releaseArtists,
  releases,
} from "@/db/schema";
import { generateUUID, slugify } from "@/lib/utils";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Revalidate every public page that renders releases.
 * Called after any mutation (create / update / delete) so the homepage,
 * discography, the release's own page, upcoming releases, and each
 * artist's profile/discography pages all pick up the change immediately.
 *
 * Without this, pages stay stale until their ISR timer expires (5 min on
 * the homepage) or until the next deploy — which is why deleted releases
 * kept showing up on the public site.
 */
function revalidateReleasePaths(
  slug?: string | null,
  artistSlugs: string[] = [],
) {
  try {
    // Homepage — uses ISR with revalidate=300, needs explicit purge
    revalidatePath("/", "layout");

    // Discography listing (force-dynamic but Netlify CDN may cache the HTML)
    revalidatePath("/discografia");

    // All release detail pages (catch dynamic route)
    revalidatePath("/lanzamientos", "layout");
    if (slug) {
      revalidatePath(`/lanzamientos/${slug}`);
    }

    // Upcoming releases page (releases often convert from upcoming)
    revalidatePath("/proximos");
    revalidatePath("/proximos", "layout");

    // Artist pages — both the profile and per-artist discography
    revalidatePath("/artistas");
    for (const artistSlug of artistSlugs) {
      if (artistSlug) {
        revalidatePath(`/artistas/${artistSlug}`);
        revalidatePath(`/artistas/${artistSlug}/discografia`);
      }
    }
  } catch (err) {
    // revalidatePath can throw in edge runtimes or during build — never let
    // a cache-invalidation failure break the actual mutation.
    console.warn("[releases API] revalidatePath failed (non-fatal):", err);
  }
}

/**
 * Auto-fetch cover image from Spotify when a spotifyUrl or spotifyId is provided
 * but no coverImageUrl. Uses Spotify oEmbed API (no auth required).
 */
async function fetchCoverFromSpotify(
  spotifyUrl: string | null,
  spotifyId: string | null,
): Promise<string | null> {
  const embedUrl =
    spotifyUrl ||
    (spotifyId ? `https://open.spotify.com/album/${spotifyId}` : null);
  if (!embedUrl) return null;

  try {
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(embedUrl)}`;
    const response = await fetch(oembedUrl, {
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.thumbnail_url) {
        console.log(
          "[Admin] Auto-fetched cover from Spotify oEmbed:",
          embedUrl,
        );
        return data.thumbnail_url;
      }
    }
  } catch (error) {
    console.warn("[Admin] Failed to fetch cover from Spotify oEmbed:", error);
  }

  return null;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get a single release by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const release = await db.query.releases.findFirst({
      where: (r, { eq }) => eq(r.id, id),
      with: {
        releaseArtists: {
          with: {
            artist: true,
          },
        },
      },
    });

    if (!release) {
      return NextResponse.json(
        { success: false, error: "Release not found" },
        { status: 404 },
      );
    }

    // Get primary artist ID
    const primaryArtist = release.releaseArtists?.find((ra) => ra.isPrimary);
    const artistId =
      primaryArtist?.artistId || release.releaseArtists?.[0]?.artistId || null;

    return NextResponse.json({
      success: true,
      data: {
        ...release,
        artistId,
      },
    });
  } catch (error) {
    console.error("Failed to fetch release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch release" },
      { status: 500 },
    );
  }
}

// PUT - Update a release
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      title,
      artistId,
      releaseType,
      releaseDate,
      spotifyUrl,
      spotifyId,
      coverImageUrl,
      description,
      appleMusicUrl,
      youtubeMusicUrl,
      isFeatured,
    } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 },
      );
    }

    // Check if release exists
    const existing = await db.query.releases.findFirst({
      where: (r, { eq }) => eq(r.id, id),
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Release not found" },
        { status: 404 },
      );
    }

    // Generate new slug only if title changed
    let slug = existing.slug;
    if (title !== existing.title) {
      slug = slugify(title);
      // Check if new slug conflicts with another release
      const slugConflict = await db.query.releases.findFirst({
        where: (r, { and, eq, ne }) => and(eq(r.slug, slug), ne(r.id, id)),
      });
      if (slugConflict) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    // Auto-fetch cover from Spotify if not provided but Spotify URL/ID is available
    let finalCoverImageUrl = coverImageUrl || null;
    if (!finalCoverImageUrl && (spotifyUrl || spotifyId)) {
      finalCoverImageUrl = await fetchCoverFromSpotify(
        spotifyUrl || null,
        spotifyId || null,
      );
    }

    // Update release
    await db
      .update(releases)
      .set({
        title,
        slug,
        releaseType: releaseType || existing.releaseType,
        releaseDate: releaseDate ? new Date(releaseDate) : existing.releaseDate,
        spotifyId: spotifyId || null,
        spotifyUrl: spotifyUrl || null,
        coverImageUrl: finalCoverImageUrl,
        description: description || null,
        appleMusicUrl: appleMusicUrl || null,
        youtubeMusicUrl: youtubeMusicUrl || null,
        isFeatured: isFeatured ?? existing.isFeatured,
        isUpcoming: releaseDate
          ? new Date(releaseDate) > new Date()
          : existing.isUpcoming,
        updatedAt: new Date(),
      })
      .where(eq(releases.id, id));

    // Update artist association if artistId changed
    if (artistId) {
      // Delete existing artist associations
      await db.delete(releaseArtists).where(eq(releaseArtists.releaseId, id));

      // Create new association
      const { generateUUID } = await import("@/lib/utils");
      await db.insert(releaseArtists).values({
        id: generateUUID(),
        releaseId: id,
        artistId,
        isPrimary: true,
      });
    }

    // Fetch the (possibly updated) artist associations so we can revalidate
    // each artist's profile and discography pages too.
    const updatedArtistLinks = await db.query.releaseArtists.findMany({
      where: (ra, { eq }) => eq(ra.releaseId, id),
      with: { artist: true },
    });
    const updatedArtistSlugs = (updatedArtistLinks ?? [])
      .map((ra) => ra.artist?.slug)
      .filter((s): s is string => Boolean(s));

    revalidateReleasePaths(slug, updatedArtistSlugs);

    return NextResponse.json({
      success: true,
      data: { id, slug },
    });
  } catch (error) {
    console.error("Failed to update release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update release" },
      { status: 500 },
    );
  }
}

// DELETE - Delete a release
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Fetch the release (slug) and its artist associations BEFORE deleting
    // so we know which public pages to revalidate. After the delete, those
    // rows are gone and we'd lose the slugs.
    const existing = await db.query.releases.findFirst({
      where: (r, { eq }) => eq(r.id, id),
      with: {
        releaseArtists: {
          with: { artist: true },
        },
      },
    });

    const slugToDelete = existing?.slug ?? null;
    const artistSlugsToDelete = (existing?.releaseArtists ?? [])
      .map((ra) => ra.artist?.slug)
      .filter((s): s is string => Boolean(s));

    // If this release was imported from Spotify, record its spotifyId in
    // the blocklist so the next Spotify sync (every 6h) does NOT re-import
    // the same album. Without this, the sync would re-create the deleted
    // release on the next run, creating a "delete → reappear" loop.
    if (existing?.spotifyId) {
      const artistNameForLog =
        (existing.releaseArtists ?? [])
          .map((ra) => ra.artist?.name)
          .filter(Boolean)
          .join(", ") || null;

      try {
        await db
          .insert(deletedReleasesBlocklist)
          .values({
            id: generateUUID(),
            spotifyId: existing.spotifyId,
            title: existing.title,
            artistName: artistNameForLog,
            spotifyUrl: existing.spotifyUrl || null,
            deletedAt: new Date(),
          })
          .onConflictDoNothing(); // if already blocked, no-op
        console.log(
          `[Admin] Added spotifyId ${existing.spotifyId} to blocklist ` +
            `(release "${existing.title}" will not be re-imported by sync)`,
        );
      } catch (blocklistError) {
        // Non-fatal — we still want the delete itself to succeed.
        // The table may not exist yet on older deploys (created by ensure-tables).
        console.warn(
          "[Admin] Could not add to blocklist (non-fatal):",
          blocklistError,
        );
      }
    }

    // Delete release artists first (foreign key constraint)
    await db.delete(releaseArtists).where(eq(releaseArtists.releaseId, id));

    // Delete release
    await db.delete(releases).where(eq(releases.id, id));

    // Invalidate all pages that may have been rendering this release.
    // Without this, the homepage (ISR 5min) and discography page would
    // continue serving the deleted release until the cache expires.
    revalidateReleasePaths(slugToDelete, artistSlugsToDelete);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete release" },
      { status: 500 },
    );
  }
}
