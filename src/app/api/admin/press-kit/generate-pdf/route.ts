import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { pressKit, artists } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generatePressKitPDF, generatePressKitFilename } from "@/lib/pdf/press-kit-generator";
import { artistsRoster } from "@/lib/data/artists-roster";

interface KeyPoint {
  icon: string;
  title: string;
  description: string;
}

interface DownloadItem {
  name: string;
  url: string;
  description: string;
}

interface PressQuote {
  quote: string;
  source: string;
  url?: string;
}

interface SpotifyArtistData {
  name: string;
  monthlyListeners?: number;
  followers?: number;
  popularity?: number;
  genres?: string[];
  imageUrl?: string;
}

function parseJson<T>(value: string | T | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  }
  return value as T;
}

// Fetch Spotify data for an artist using oEmbed (no API key needed)
async function fetchSpotifyOembedData(spotifyUrl: string): Promise<Partial<SpotifyArtistData> | null> {
  try {
    const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`;
    const response = await fetch(oembedUrl);

    if (!response.ok) return null;

    const data = await response.json();
    return {
      name: data.title,
      imageUrl: data.thumbnail_url,
    };
  } catch {
    return null;
  }
}

// Fetch real-time stats from database
async function fetchDatabaseStats() {
  try {
    if (!isDatabaseConfigured()) return null;

    // Get artist count
    const allArtists = await db.select().from(artists).where(eq(artists.isActive, true));

    return {
      artistCount: allArtists.length,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if we should include Spotify data
    const includeSpotify = request.nextUrl.searchParams.get("spotify") === "true";

    // Default press kit data
    const defaultPressKit = {
      heroTitle: "Sonido Líquido Crew",
      heroSubtitle: "El colectivo de Hip Hop más representativo de México",
      heroTagline: "Fundado en 1999 en la Ciudad de México por Zaque.",
      heroCoverImageUrl: undefined,
      heroBannerImageUrl: undefined,
      statsArtists: `${artistsRoster.length}+`,
      statsReleases: "190+",
      statsYears: `${new Date().getFullYear() - 1999}+`,
      aboutTitle: "Sobre Nosotros",
      aboutContent: `Sonido Líquido Crew es un colectivo de Hip Hop mexicano fundado en 1999 en la Ciudad de México. Con más de dos décadas de trayectoria, el crew ha sido fundamental en el desarrollo y profesionalización del Hip Hop en México.

Bajo el liderazgo de Zaque, el colectivo ha reunido a algunos de los artistas más talentosos y comprometidos del género, abarcando MCs, DJs, productores y cantantes que representan la diversidad y riqueza del Hip Hop mexicano.`,
      keyPoints: [
        { icon: "calendar", title: "Fundado en 1999", description: "Más de 25 años de historia en el Hip Hop mexicano" },
        { icon: "disc", title: "190+ Lanzamientos", description: "Catálogo extenso de música original" },
        { icon: "users", title: `${artistsRoster.length}+ Artistas`, description: "Roster activo de talento mexicano" },
      ],
      contactEmail: "prensasonidoliquido@gmail.com",
      contactPhone: "+52 55 2801 1881",
      contactLocation: "Ciudad de México, CDMX",
      spotifyUrl: "https://open.spotify.com/playlist/5qHTKCZIwi3GM3mhPq45Ab",
      instagramUrl: "https://www.instagram.com/sonidoliquido/",
      youtubeUrl: "https://www.youtube.com/@sonidoliquidocrew",
      twitterUrl: undefined,
      facebookUrl: "https://www.facebook.com/sonidoliquidocrew/",
      downloads: [] as DownloadItem[],
      pressQuotes: [] as PressQuote[],
      featuredVideoUrl: undefined,
      featuredVideoTitle: undefined,
      footerCtaTitle: "¿Listo para colaborar?",
      footerCtaButtonText: "Enviar Mensaje",
    };

    // Try to fetch from database, use defaults if not available
    let data = null;
    let dbStats = null;

    if (isDatabaseConfigured()) {
      try {
        const [dbData] = await db.select().from(pressKit).where(eq(pressKit.id, "main"));
        data = dbData;
        dbStats = await fetchDatabaseStats();
      } catch (dbError) {
        console.log("[API] Database table not found, using defaults");
      }
    }

    // Fetch Spotify data for roster artists if requested
    let spotifyArtists: SpotifyArtistData[] = [];
    if (includeSpotify) {
      console.log("[API] Fetching Spotify data for roster artists...");

      const spotifyPromises = artistsRoster.slice(0, 10).map(async (artist) => {
        const oembedData = await fetchSpotifyOembedData(artist.spotifyUrl);
        return {
          name: artist.name,
          imageUrl: oembedData?.imageUrl,
        };
      });

      const results = await Promise.all(spotifyPromises);
      spotifyArtists = results.filter(Boolean) as SpotifyArtistData[];

      console.log(`[API] Fetched data for ${spotifyArtists.length} artists`);
    }

    // Calculate dynamic stats
    const currentYear = new Date().getFullYear();
    const yearsActive = currentYear - 1999;

    // Prepare data for PDF generation - merge DB data with defaults
    const pdfData = {
      heroTitle: data?.heroTitle || defaultPressKit.heroTitle,
      heroSubtitle: data?.heroSubtitle || defaultPressKit.heroSubtitle,
      heroTagline: data?.heroTagline || defaultPressKit.heroTagline,
      heroCoverImageUrl: data?.heroCoverImageUrl || defaultPressKit.heroCoverImageUrl,
      heroBannerImageUrl: data?.heroBannerImageUrl || defaultPressKit.heroBannerImageUrl,
      statsArtists: dbStats?.artistCount ? `${dbStats.artistCount}+` : (data?.statsArtists || defaultPressKit.statsArtists),
      statsReleases: data?.statsReleases || defaultPressKit.statsReleases,
      statsYears: `${yearsActive}+`,
      aboutTitle: data?.aboutTitle || defaultPressKit.aboutTitle,
      aboutContent: data?.aboutContent || defaultPressKit.aboutContent,
      keyPoints: data?.keyPoints ? parseJson<KeyPoint[]>(data.keyPoints, defaultPressKit.keyPoints) : defaultPressKit.keyPoints,
      contactEmail: data?.contactEmail || defaultPressKit.contactEmail,
      contactPhone: data?.contactPhone || defaultPressKit.contactPhone,
      contactLocation: data?.contactLocation || defaultPressKit.contactLocation,
      spotifyUrl: data?.spotifyUrl || defaultPressKit.spotifyUrl,
      instagramUrl: data?.instagramUrl || defaultPressKit.instagramUrl,
      youtubeUrl: data?.youtubeUrl || defaultPressKit.youtubeUrl,
      twitterUrl: data?.twitterUrl || defaultPressKit.twitterUrl,
      facebookUrl: data?.facebookUrl || defaultPressKit.facebookUrl,
      downloads: data?.downloads ? parseJson<DownloadItem[]>(data.downloads, []) : defaultPressKit.downloads,
      pressQuotes: data?.pressQuotes ? parseJson<PressQuote[]>(data.pressQuotes, []) : defaultPressKit.pressQuotes,
      featuredVideoUrl: data?.featuredVideoUrl || defaultPressKit.featuredVideoUrl,
      featuredVideoTitle: data?.featuredVideoTitle || defaultPressKit.featuredVideoTitle,
      footerCtaTitle: data?.footerCtaTitle || defaultPressKit.footerCtaTitle,
      footerCtaButtonText: data?.footerCtaButtonText || defaultPressKit.footerCtaButtonText,
      // Spotify data
      spotifyArtists: includeSpotify ? spotifyArtists : undefined,
      generatedAt: new Date().toISOString(),
      includesLiveData: includeSpotify,
    };

    console.log("[API] Generating press kit PDF...");

    // Generate PDF
    const pdfBuffer = await generatePressKitPDF(pdfData);
    const filename = generatePressKitFilename(pdfData.heroTitle);

    console.log(`[API] Press kit PDF generated: ${filename}`);

    // Return PDF as download
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[API] Error generating press kit PDF:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
