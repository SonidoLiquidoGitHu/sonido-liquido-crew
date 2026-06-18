import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { releases, releaseArtists, artists } from "@/db/schema";
import { generateUUID, slugify } from "@/lib/utils";
import { eq } from "drizzle-orm";

/**
 * Revalidate every public page that renders releases.
 * Mirrors the helper in /api/admin/releases/[id]/route.ts — kept local
 * because Next.js API routes don't share modules across route files
 * cleanly without an extra import alias.
 *
 * Without this, newly created releases won't appear on the public site
 * until the homepage ISR (5 min) or the discography cache expires.
 */
function revalidateReleasePaths(slug?: string | null, artistSlugs: string[] = []) {
  try {
    revalidatePath("/", "layout");
    revalidatePath("/discografia");
    revalidatePath("/lanzamientos", "layout");
    if (slug) {
      revalidatePath(`/lanzamientos/${slug}`);
    }
    revalidatePath("/proximos");
    revalidatePath("/proximos", "layout");
    revalidatePath("/artistas");
    for (const artistSlug of artistSlugs) {
      if (artistSlug) {
        revalidatePath(`/artistas/${artistSlug}`);
        revalidatePath(`/artistas/${artistSlug}/discografia`);
      }
    }
  } catch (err) {
    console.warn("[releases API] revalidatePath failed (non-fatal):", err);
  }
}

/**
 * Auto-fetch cover image from Spotify when a spotifyUrl or spotifyId is provided
 * but no coverImageUrl. Uses Spotify oEmbed API (no auth required).
 */
async function fetchCoverFromSpotify(spotifyUrl: string | null, spotifyId: string | null): Promise<string | null> {
  // Prefer using the Spotify URL directly for oEmbed
  const embedUrl = spotifyUrl || (spotifyId ? `https://open.spotify.com/album/${spotifyId}` : null);
  if (!embedUrl) return null;

  try {
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(embedUrl)}`;
    const response = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const data = await response.json();
      if (data.thumbnail_url) {
        console.log("[Admin] Auto-fetched cover from Spotify oEmbed:", embedUrl);
        return data.thumbnail_url;
      }
    }
  } catch (error) {
    console.warn("[Admin] Failed to fetch cover from Spotify oEmbed:", error);
  }

  return null;
}

export async function GET() {
  try {
    const allReleases = await db.query.releases.findMany({
      orderBy: (r, { desc }) => [desc(r.releaseDate)],
      with: {
        releaseArtists: {
          with: {
            artist: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: allReleases });
  } catch (error) {
    console.error("Failed to fetch releases:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch releases" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    if (!title || !artistId || !releaseDate) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = slugify(title);

    // Check if slug already exists
    const existing = await db.query.releases.findFirst({
      where: (r, { eq }) => eq(r.slug, slug),
    });

    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    // Auto-fetch cover from Spotify if not provided
    let finalCoverImageUrl = coverImageUrl || null;
    if (!finalCoverImageUrl && (spotifyUrl || spotifyId)) {
      finalCoverImageUrl = await fetchCoverFromSpotify(spotifyUrl || null, spotifyId || null);
    }

    // Create release
    const releaseId = generateUUID();

    await db.insert(releases).values({
      id: releaseId,
      title,
      slug: finalSlug,
      releaseType: releaseType || "album",
      releaseDate: new Date(releaseDate),
      spotifyId: spotifyId || null,
      spotifyUrl: spotifyUrl || null,
      coverImageUrl: finalCoverImageUrl,
      description: description || null,
      appleMusicUrl: appleMusicUrl || null,
      youtubeMusicUrl: youtubeMusicUrl || null,
      isFeatured: isFeatured || false,
      isUpcoming: new Date(releaseDate) > new Date(),
    });

    // Link to artist
    await db.insert(releaseArtists).values({
      id: generateUUID(),
      releaseId,
      artistId,
      isPrimary: true,
    });

    // Look up the artist's slug so we can revalidate their pages too.
    let artistSlug: string | null = null;
    try {
      const [artistRow] = await db
        .select({ slug: artists.slug })
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);
      artistSlug = artistRow?.slug ?? null;
    } catch {
      // Non-fatal — the revalidate for the main listing still runs below.
    }

    revalidateReleasePaths(finalSlug, artistSlug ? [artistSlug] : []);

    return NextResponse.json({
      success: true,
      data: { id: releaseId, slug: finalSlug },
    });
  } catch (error) {
    console.error("Failed to create release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create release" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing release ID" },
        { status: 400 }
      );
    }

    // Fetch slug + artist slugs BEFORE deleting so we can revalidate the
    // right public pages afterward.
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

    // Delete release artists first (foreign key constraint)
    await db.delete(releaseArtists).where(eq(releaseArtists.releaseId, id));

    // Delete release
    await db.delete(releases).where(eq(releases.id, id));

    revalidateReleasePaths(slugToDelete, artistSlugsToDelete);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete release" },
      { status: 500 }
    );
  }
}
