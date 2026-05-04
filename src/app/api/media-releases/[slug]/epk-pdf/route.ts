import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { mediaReleases, artists, artistEpk, artistExternalProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  generateMediaReleaseEpkPDF,
  generateMediaReleaseEpkFilename,
} from "@/lib/pdf/media-release-epk-generator";

function parseJson<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    // Check for access code or preview mode
    const accessCode = request.nextUrl.searchParams.get("code");
    const isPreview = request.nextUrl.searchParams.get("preview") === "true";

    // Fetch media release
    const [release] = await db
      .select()
      .from(mediaReleases)
      .where(eq(mediaReleases.slug, slug))
      .limit(1);

    if (!release) {
      return NextResponse.json(
        { success: false, error: "Media release not found" },
        { status: 404 }
      );
    }

    // Check access
    if (release.accessCode && release.accessCode !== accessCode && !isPreview) {
      return NextResponse.json(
        { success: false, error: "Access code required" },
        { status: 403 }
      );
    }

    if (!release.isPublished && !accessCode && !isPreview) {
      return NextResponse.json(
        { success: false, error: "Media release not published" },
        { status: 403 }
      );
    }

    // Resolve artist name
    let artistName: string | null = null;
    let artistEpkData: Awaited<ReturnType<typeof buildArtistEpkData>> = null;

    if (release.mainArtistId) {
      const [artistRow] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, release.mainArtistId))
        .limit(1);

      if (artistRow) {
        artistName = artistRow.name;
        artistEpkData = await buildArtistEpkData(artistRow.id);
      }
    }

    // Parse audio tracks
    let audioTracks: { title: string; url?: string; duration: string; trackNumber: number }[] = [];
    try {
      if (release.audioTracks) {
        audioTracks = JSON.parse(release.audioTracks);
      }
    } catch {
      audioTracks = [];
    }

    // Parse tags
    let tags: string[] = [];
    try {
      if (release.tags) {
        tags = JSON.parse(release.tags);
      }
    } catch {
      tags = [];
    }

    // Build media release data for PDF
    const mediaReleaseData = {
      id: release.id,
      title: release.title,
      slug: release.slug,
      subtitle: release.subtitle,
      category: release.category || "announcement",
      summary: release.summary,
      content: release.content,
      pullQuote: release.pullQuote,
      pullQuoteAttribution: release.pullQuoteAttribution,
      coverImageUrl: release.coverImageUrl,
      bannerImageUrl: release.bannerImageUrl,
      audioTracks,
      spotifyEmbedUrl: release.spotifyEmbedUrl,
      youtubeVideoId: release.youtubeVideoId,
      youtubeVideoTitle: release.youtubeVideoTitle,
      credits: release.credits,
      tags,
      publishDate: release.publishDate.toISOString(),
      releaseDate: release.releaseDate?.toISOString() || null,
      prContactName: release.prContactName,
      prContactEmail: release.prContactEmail,
      prContactPhone: release.prContactPhone,
      artistName,
      artist: artistEpkData,
    };

    console.log(`[API] Generating EPK PDF for media release: ${release.title}`);

    // Generate PDF
    const pdfBuffer = await generateMediaReleaseEpkPDF(mediaReleaseData);
    const filename = generateMediaReleaseEpkFilename(release.title, artistName);

    console.log(`[API] EPK PDF generated: ${filename} (${pdfBuffer.length} bytes)`);

    // Increment download count
    try {
      const { sql } = await import("drizzle-orm");
      await db
        .update(mediaReleases)
        .set({
          downloadCount: sql`${mediaReleases.downloadCount} + 1`,
        })
        .where(eq(mediaReleases.id, release.id));
    } catch {
      // Non-critical
    }

    // Return PDF
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "public, max-age=300, s-maxage=300",
      },
    });
  } catch (error) {
    console.error("[API] Error generating EPK PDF:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate EPK PDF" },
      { status: 500 }
    );
  }
}

/**
 * Build artist EPK data from database for inclusion in the PDF
 */
async function buildArtistEpkData(artistId: string) {
  try {
    // Get EPK record
    const [epk] = await db
      .select()
      .from(artistEpk)
      .where(eq(artistEpk.artistId, artistId))
      .limit(1);

    // Get artist
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.id, artistId))
      .limit(1);

    if (!artist) return null;

    // Get social profiles
    const profiles = await db
      .select()
      .from(artistExternalProfiles)
      .where(eq(artistExternalProfiles.artistId, artistId));

    return {
      name: artist.name,
      slug: artist.slug,
      role: artist.role,
      profileImageUrl: artist.profileImageUrl,
      bannerImageUrl: artist.bannerImageUrl,
      location: artist.location,
      bio: epk?.bioLong || epk?.bioShort || artist.bio,
      shortBio: epk?.bioShort || artist.shortBio,
      tagline: epk?.tagline,
      genreSpecific: epk?.genreSpecific,
      subgenres: parseJson<string[]>(epk?.subgenres, []),
      artistType: epk?.artistType,

      spotifyMonthlyListeners: epk?.spotifyMonthlyListeners || artist.monthlyListeners,
      spotifyFollowers: epk?.spotifyFollowers,
      youtubeSubscribers: epk?.youtubeSubscribers,
      instagramFollowers: epk?.instagramFollowers,
      totalStreams: epk?.totalStreams,

      pressQuotes: parseJson<{ quote: string; source: string; sourceUrl?: string }[]>(epk?.pressQuotes, []),
      pressFeatures: parseJson<{ outlet: string; title: string; url?: string; date?: string }[]>(epk?.pressFeatures, []),
      topTracks: parseJson<{ title: string; url?: string; platform: string }[]>(epk?.topTracks, []),
      collaborations: parseJson<{ artistName: string; trackName: string; year: number; type: string }[]>(epk?.collaborations, []),
      pastShows: parseJson<{ venue: string; city: string; date: string; type: string }[]>(epk?.pastShows, []),
      festivalAppearances: parseJson<string[]>(epk?.festivalAppearances, []),
      notableVenues: parseJson<string[]>(epk?.notableVenues, []),

      bookingEmail: epk?.bookingEmail || artist.bookingEmail,
      managementEmail: epk?.managementEmail,
      managementName: epk?.managementName,
      publicistEmail: epk?.publicistEmail,
      publicistName: epk?.publicistName,

      socialProfiles: profiles.map((p: typeof profiles[0]) => ({
        platform: p.platform,
        url: p.externalUrl,
        handle: p.handle,
      })),
    };
  } catch (error) {
    console.error("[API] Error building artist EPK data:", error);
    return null;
  }
}
