import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { pressKit } from "@/db/schema";
import { eq } from "drizzle-orm";

// Default Press Kit content
const defaultPressKit = {
  id: "main",
  heroTitle: "Sonido Líquido Crew",
  heroSubtitle: "El colectivo de Hip Hop más representativo de México",
  heroTagline: "Fundado en 1999 en la Ciudad de México por Zaque.",
  heroCoverImageUrl: null,
  heroBannerImageUrl: null,
  statsArtists: "20+",
  statsReleases: "160+",
  statsYears: "25+",
  aboutTitle: "Sobre Nosotros",
  aboutContent: `**Sonido Líquido Crew** es un colectivo de Hip Hop mexicano fundado en 1999 en la Ciudad de México. Con más de dos décadas de trayectoria, el crew ha sido fundamental en el desarrollo y profesionalización del Hip Hop en México.

Bajo el liderazgo de **Zaque**, el colectivo ha reunido a algunos de los artistas más talentosos y comprometidos del género, abarcando MCs, DJs, productores y cantantes que representan la diversidad y riqueza del Hip Hop mexicano.

A lo largo de su historia, Sonido Líquido ha producido más de 160 lanzamientos entre álbumes, EPs y singles, además de colaboraciones con artistas nacionales e internacionales.`,
  keyPoints: JSON.stringify([
    { icon: "calendar", title: "Fundado en 1999", description: "Más de 25 años de historia en el Hip Hop mexicano" },
    { icon: "disc", title: "160+ Lanzamientos", description: "Catálogo extenso de música original" },
    { icon: "users", title: "20+ Artistas", description: "Roster activo de talento mexicano" },
  ]),
  contactEmail: "prensasonidoliquido@gmail.com",
  contactPhone: "+52 55 2801 1881",
  contactLocation: "Ciudad de México, CDMX",
  spotifyUrl: "https://open.spotify.com/playlist/5qHTKCZIwi3GM3mhPq45Ab",
  instagramUrl: "https://www.instagram.com/sonidoliquido/",
  youtubeUrl: "https://www.youtube.com/@sonidoliquidocrew",
  twitterUrl: null,
  facebookUrl: null,
  downloads: null,
  mediaGallery: null,
  pressQuotes: null,
  featuredVideoUrl: null,
  featuredVideoTitle: null,
  footerCtaTitle: "¿Listo para colaborar?",
  footerCtaButtonText: "Enviar Mensaje",
  metaTitle: "Press Kit | Sonido Líquido Crew",
  metaDescription: "Kit de prensa oficial de Sonido Líquido Crew. Información, biografías, fotos y recursos para medios.",
};

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: defaultPressKit });
    }

    const [data] = await db.select().from(pressKit).where(eq(pressKit.id, "main"));

    if (!data) {
      // Return default if no record exists
      return NextResponse.json({ success: true, data: defaultPressKit });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[API] Error fetching press kit:", error);
    // Return default on error
    return NextResponse.json({ success: true, data: defaultPressKit });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();

    // Check if record exists
    const [existing] = await db.select().from(pressKit).where(eq(pressKit.id, "main"));

    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(pressKit)
        .set({
          heroTitle: body.heroTitle,
          heroSubtitle: body.heroSubtitle,
          heroTagline: body.heroTagline,
          heroCoverImageUrl: body.heroCoverImageUrl || null,
          heroBannerImageUrl: body.heroBannerImageUrl || null,
          statsArtists: body.statsArtists,
          statsReleases: body.statsReleases,
          statsYears: body.statsYears,
          aboutTitle: body.aboutTitle,
          aboutContent: body.aboutContent,
          keyPoints: typeof body.keyPoints === "string" ? body.keyPoints : JSON.stringify(body.keyPoints),
          contactEmail: body.contactEmail,
          contactPhone: body.contactPhone,
          contactLocation: body.contactLocation,
          spotifyUrl: body.spotifyUrl || null,
          instagramUrl: body.instagramUrl || null,
          youtubeUrl: body.youtubeUrl || null,
          twitterUrl: body.twitterUrl || null,
          facebookUrl: body.facebookUrl || null,
          downloads: typeof body.downloads === "string" ? body.downloads : JSON.stringify(body.downloads),
          mediaGallery: typeof body.mediaGallery === "string" ? body.mediaGallery : JSON.stringify(body.mediaGallery),
          pressQuotes: typeof body.pressQuotes === "string" ? body.pressQuotes : JSON.stringify(body.pressQuotes),
          featuredVideoUrl: body.featuredVideoUrl || null,
          featuredVideoTitle: body.featuredVideoTitle || null,
          footerCtaTitle: body.footerCtaTitle,
          footerCtaButtonText: body.footerCtaButtonText,
          metaTitle: body.metaTitle,
          metaDescription: body.metaDescription,
          updatedAt: new Date(),
        })
        .where(eq(pressKit.id, "main"))
        .returning();

      console.log("[API] Updated press kit");
      return NextResponse.json({ success: true, data: updated });
    } else {
      // Insert new record
      const [created] = await db
        .insert(pressKit)
        .values({
          id: "main",
          heroTitle: body.heroTitle,
          heroSubtitle: body.heroSubtitle,
          heroTagline: body.heroTagline,
          heroCoverImageUrl: body.heroCoverImageUrl || null,
          heroBannerImageUrl: body.heroBannerImageUrl || null,
          statsArtists: body.statsArtists,
          statsReleases: body.statsReleases,
          statsYears: body.statsYears,
          aboutTitle: body.aboutTitle,
          aboutContent: body.aboutContent,
          keyPoints: typeof body.keyPoints === "string" ? body.keyPoints : JSON.stringify(body.keyPoints),
          contactEmail: body.contactEmail,
          contactPhone: body.contactPhone,
          contactLocation: body.contactLocation,
          spotifyUrl: body.spotifyUrl || null,
          instagramUrl: body.instagramUrl || null,
          youtubeUrl: body.youtubeUrl || null,
          twitterUrl: body.twitterUrl || null,
          facebookUrl: body.facebookUrl || null,
          downloads: typeof body.downloads === "string" ? body.downloads : JSON.stringify(body.downloads),
          mediaGallery: typeof body.mediaGallery === "string" ? body.mediaGallery : JSON.stringify(body.mediaGallery),
          pressQuotes: typeof body.pressQuotes === "string" ? body.pressQuotes : JSON.stringify(body.pressQuotes),
          featuredVideoUrl: body.featuredVideoUrl || null,
          featuredVideoTitle: body.featuredVideoTitle || null,
          footerCtaTitle: body.footerCtaTitle,
          footerCtaButtonText: body.footerCtaButtonText,
          metaTitle: body.metaTitle,
          metaDescription: body.metaDescription,
        })
        .returning();

      console.log("[API] Created press kit");
      return NextResponse.json({ success: true, data: created });
    }
  } catch (error) {
    console.error("[API] Error updating press kit:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update press kit" },
      { status: 500 }
    );
  }
}
