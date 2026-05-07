import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { artists, artistEpk, artistExternalProfiles } from "@/db/schema";
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

    // Get artist by slug
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.slug, slug))
      .limit(1);

    if (!artist) {
      return NextResponse.json(
        { success: false, error: "Artist not found" },
        { status: 404 }
      );
    }

    // Get EPK data
    const [epk] = await db
      .select()
      .from(artistEpk)
      .where(eq(artistEpk.artistId, artist.id))
      .limit(1);

    // Check if EPK is public
    if (epk && !epk.isPublic) {
      return NextResponse.json(
        { success: false, error: "EPK is not public" },
        { status: 403 }
      );
    }

    // Get social profiles
    const profiles = await db
      .select()
      .from(artistExternalProfiles)
      .where(eq(artistExternalProfiles.artistId, artist.id));

    // Build artist EPK data
    const artistEpkData = {
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

    // Build a "standalone" media release data structure for the artist EPK
    // This creates a PDF focused on the artist without a specific release
    const mediaReleaseData = {
      id: artist.id,
      title: `Electronic Press Kit`,
      slug: artist.slug,
      subtitle: artistEpkData.tagline || `${artist.name} - Sonido Liquido Crew`,
      category: "announcement",
      summary: artistEpkData.shortBio || artistEpkData.bio?.slice(0, 200) || null,
      content: artistEpkData.bio || null,
      pullQuote: artistEpkData.pressQuotes?.[0]?.quote || null,
      pullQuoteAttribution: artistEpkData.pressQuotes?.[0]?.source || null,
      coverImageUrl: artist.profileImageUrl,
      bannerImageUrl: artist.bannerImageUrl,
      audioTracks: artistEpkData.topTracks?.map((t, i) => ({
        title: t.title,
        url: t.url,
        duration: "--:--",
        trackNumber: i + 1,
      })) || [],
      spotifyEmbedUrl: null,
      youtubeVideoId: null,
      youtubeVideoTitle: null,
      credits: null,
      tags: [artistEpkData.genreSpecific, ...(artistEpkData.subgenres || [])].filter((t): t is string => Boolean(t)),
      publishDate: new Date().toISOString(),
      releaseDate: null,
      prContactName: null,
      prContactEmail: null,
      prContactPhone: null,
      artistName: artist.name,
      artist: artistEpkData,
    };

    console.log(`[API] Generating standalone EPK PDF for artist: ${artist.name}`);

    // Generate PDF
    const pdfBuffer = await generateMediaReleaseEpkPDF(mediaReleaseData);
    const filename = generateMediaReleaseEpkFilename("EPK", artist.name);

    console.log(`[API] EPK PDF generated: ${filename} (${pdfBuffer.length} bytes)`);

    // Increment EPK download count
    if (epk) {
      try {
        const { sql } = await import("drizzle-orm");
        await db
          .update(artistEpk)
          .set({
            downloadCount: sql`${artistEpk.downloadCount} + 1`,
          })
          .where(eq(artistEpk.artistId, artist.id));
      } catch {
        // Non-critical
      }
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
    console.error("[API] Error generating artist EPK PDF:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate EPK PDF" },
      { status: 500 }
    );
  }
}
