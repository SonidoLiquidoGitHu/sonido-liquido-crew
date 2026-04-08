import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { artists, artistExternalProfiles } from "@/db/schema/artists";
import { pressKit } from "@/db/schema/press-kit";
import { releases, releaseArtists } from "@/db/schema/releases";
import { videos } from "@/db/schema/videos";
import { eq, desc, count, sql } from "drizzle-orm";

interface PressQuote {
  quote: string;
  source: string;
  sourceUrl: string;
}

interface FeaturedVideo {
  videoUrl: string;
  title: string;
  platform: string;
  views: number;
  thumbnailUrl: string;
}

interface ArtistPressKitData {
  id: string;
  name: string;
  slug: string;
  role: string;
  bio: string | null;
  shortBio: string | null;
  profileImageUrl: string | null;
  bannerImageUrl: string | null;
  location: string | null;
  yearStarted: number | null;
  bookingEmail: string | null;
  pressEmail: string | null;
  genres: string[];
  pressQuotes: PressQuote[];
  featuredVideos: FeaturedVideo[];
  socialProfiles: {
    platform: string;
    url: string;
    handle: string | null;
  }[];
  stats: {
    totalReleases: number;
    totalVideos: number;
    monthlyListeners: number | null;
  };
}

interface GeneralPressKitData {
  title: string;
  subtitle: string;
  tagline: string;
  coverImageUrl: string | null;
  bannerImageUrl: string | null;
  stats: {
    artists: string;
    releases: string;
    years: string;
  };
  about: {
    title: string;
    content: string | null;
  };
  contact: {
    email: string;
    phone: string;
    location: string;
  };
  socialLinks: {
    spotify: string | null;
    youtube: string | null;
    instagram: string | null;
    twitter: string | null;
    facebook: string | null;
  };
  pressQuotes: PressQuote[];
  downloads: { name: string; url: string; description: string }[];
}

function parseJson<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

// GET /api/press-kit - Get full press kit or individual artist
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const artistSlug = searchParams.get("artist");
    const format = searchParams.get("format") || "json"; // json, markdown, txt

    // Get general press kit data
    const [generalKit] = await db.select().from(pressKit).limit(1);

    // Get all artists with their profiles
    const allArtists = await db
      .select()
      .from(artists)
      .where(eq(artists.isActive, true))
      .orderBy(artists.sortOrder, artists.name);

    // Get profiles for all artists
    const allProfiles = await db.select().from(artistExternalProfiles);

    // Build artist press kit data
    const buildArtistPressKit = async (artist: typeof allArtists[0]): Promise<ArtistPressKitData> => {
      const profiles = allProfiles.filter(p => p.artistId === artist.id);

      // Get release count using the releaseArtists junction table
      const [releaseCount] = await db
        .select({ count: count() })
        .from(releaseArtists)
        .where(eq(releaseArtists.artistId, artist.id));

      // Get video count
      const [videoCount] = await db
        .select({ count: count() })
        .from(videos)
        .where(eq(videos.artistId, artist.id));

      return {
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        role: artist.role,
        bio: artist.bio,
        shortBio: artist.shortBio,
        profileImageUrl: artist.profileImageUrl,
        bannerImageUrl: artist.bannerImageUrl,
        location: artist.location,
        yearStarted: artist.yearStarted,
        bookingEmail: artist.bookingEmail,
        pressEmail: artist.pressEmail,
        genres: parseJson(artist.genres, []),
        pressQuotes: parseJson(artist.pressQuotes, []),
        featuredVideos: parseJson(artist.featuredVideos, []),
        socialProfiles: profiles.map(p => ({
          platform: p.platform,
          url: p.externalUrl,
          handle: p.handle,
        })),
        stats: {
          totalReleases: releaseCount?.count || 0,
          totalVideos: videoCount?.count || 0,
          monthlyListeners: artist.monthlyListeners,
        },
      };
    };

    // If specific artist requested
    if (artistSlug) {
      const artist = allArtists.find(a => a.slug === artistSlug);
      if (!artist) {
        return NextResponse.json(
          { success: false, error: "Artist not found" },
          { status: 404 }
        );
      }

      const artistData = await buildArtistPressKit(artist);

      if (format === "markdown") {
        const markdown = generateArtistMarkdown(artistData, generalKit);
        return new NextResponse(markdown, {
          headers: {
            "Content-Type": "text/markdown",
            "Content-Disposition": `attachment; filename="${artistSlug}-press-kit.md"`,
          },
        });
      }

      if (format === "txt") {
        const text = generateArtistText(artistData, generalKit);
        return new NextResponse(text, {
          headers: {
            "Content-Type": "text/plain",
            "Content-Disposition": `attachment; filename="${artistSlug}-press-kit.txt"`,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          artist: artistData,
          general: buildGeneralData(generalKit),
        },
      });
    }

    // Return full press kit with all artists
    const artistsData = await Promise.all(allArtists.map(buildArtistPressKit));

    const generalData = buildGeneralData(generalKit);

    if (format === "markdown") {
      const markdown = generateFullMarkdown(generalData, artistsData);
      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="sonido-liquido-press-kit.md"`,
        },
      });
    }

    if (format === "txt") {
      const text = generateFullText(generalData, artistsData);
      return new NextResponse(text, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="sonido-liquido-press-kit.txt"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        general: generalData,
        artists: artistsData,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching press kit:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch press kit" },
      { status: 500 }
    );
  }
}

function buildGeneralData(kit: typeof pressKit.$inferSelect | undefined): GeneralPressKitData {
  return {
    title: kit?.heroTitle || "Sonido Líquido Crew",
    subtitle: kit?.heroSubtitle || "El colectivo de Hip Hop más representativo de México",
    tagline: kit?.heroTagline || "Fundado en 1999 en la Ciudad de México por Zaque.",
    coverImageUrl: kit?.heroCoverImageUrl || null,
    bannerImageUrl: kit?.heroBannerImageUrl || null,
    stats: {
      artists: kit?.statsArtists || "20+",
      releases: kit?.statsReleases || "160+",
      years: kit?.statsYears || "25+",
    },
    about: {
      title: kit?.aboutTitle || "Sobre Nosotros",
      content: kit?.aboutContent || null,
    },
    contact: {
      email: kit?.contactEmail || "prensasonidoliquido@gmail.com",
      phone: kit?.contactPhone || "+52 55 2801 1881",
      location: kit?.contactLocation || "Ciudad de México, CDMX",
    },
    socialLinks: {
      spotify: kit?.spotifyUrl || null,
      youtube: kit?.youtubeUrl || null,
      instagram: kit?.instagramUrl || null,
      twitter: kit?.twitterUrl || null,
      facebook: kit?.facebookUrl || null,
    },
    pressQuotes: parseJson(kit?.pressQuotes, []),
    downloads: parseJson(kit?.downloads, []),
  };
}

function generateArtistMarkdown(artist: ArtistPressKitData, kit: typeof pressKit.$inferSelect | undefined): string {
  let md = `# ${artist.name} - Press Kit\n\n`;
  md += `**Sonido Líquido Crew**\n\n`;
  md += `---\n\n`;

  // Role
  const roleLabels: Record<string, string> = {
    mc: "MC / Rapero",
    dj: "DJ",
    producer: "Productor",
    cantante: "Cantante",
  };
  md += `## Rol: ${roleLabels[artist.role] || artist.role}\n\n`;

  // Bio
  if (artist.bio) {
    md += `## Biografía\n\n${artist.bio}\n\n`;
  }

  // Stats
  md += `## Estadísticas\n\n`;
  md += `- **Lanzamientos:** ${artist.stats.totalReleases}\n`;
  md += `- **Videos:** ${artist.stats.totalVideos}\n`;
  if (artist.stats.monthlyListeners) {
    md += `- **Oyentes Mensuales (Spotify):** ${artist.stats.monthlyListeners.toLocaleString()}\n`;
  }
  md += `\n`;

  // Social Profiles
  if (artist.socialProfiles.length > 0) {
    md += `## Redes Sociales\n\n`;
    for (const profile of artist.socialProfiles) {
      const platformLabels: Record<string, string> = {
        spotify: "Spotify",
        instagram: "Instagram",
        youtube: "YouTube",
        twitter: "X (Twitter)",
        facebook: "Facebook",
        tiktok: "TikTok",
      };
      md += `- **${platformLabels[profile.platform] || profile.platform}:** ${profile.url}`;
      if (profile.handle) md += ` (${profile.handle})`;
      md += `\n`;
    }
    md += `\n`;
  }

  // Press Quotes
  if (artist.pressQuotes.length > 0) {
    md += `## Citas de Prensa\n\n`;
    for (const quote of artist.pressQuotes) {
      md += `> "${quote.quote}"\n>\n> — ${quote.source}`;
      if (quote.sourceUrl) md += ` ([Ver fuente](${quote.sourceUrl}))`;
      md += `\n\n`;
    }
  }

  // Featured Videos
  if (artist.featuredVideos.length > 0) {
    md += `## Videos Destacados\n\n`;
    for (const video of artist.featuredVideos) {
      md += `- **${video.title}**`;
      if (video.views) md += ` - ${video.views.toLocaleString()} vistas`;
      md += `\n  ${video.videoUrl}\n`;
    }
    md += `\n`;
  }

  // Contact
  md += `## Contacto\n\n`;
  if (artist.bookingEmail) md += `- **Booking:** ${artist.bookingEmail}\n`;
  if (artist.pressEmail) md += `- **Prensa:** ${artist.pressEmail}\n`;
  md += `- **Prensa General:** ${kit?.contactEmail || "prensasonidoliquido@gmail.com"}\n`;
  md += `\n`;

  md += `---\n\n`;
  md += `*Generado el ${new Date().toLocaleDateString("es-MX", { dateStyle: "full" })}*\n`;

  return md;
}

function generateArtistText(artist: ArtistPressKitData, kit: typeof pressKit.$inferSelect | undefined): string {
  // Plain text version
  let txt = `${artist.name.toUpperCase()} - PRESS KIT\n`;
  txt += `Sonido Líquido Crew\n`;
  txt += `${"=".repeat(50)}\n\n`;

  const roleLabels: Record<string, string> = {
    mc: "MC / Rapero",
    dj: "DJ",
    producer: "Productor",
    cantante: "Cantante",
  };
  txt += `ROL: ${roleLabels[artist.role] || artist.role}\n\n`;

  if (artist.bio) {
    txt += `BIOGRAFÍA\n${"-".repeat(20)}\n${artist.bio}\n\n`;
  }

  txt += `ESTADÍSTICAS\n${"-".repeat(20)}\n`;
  txt += `Lanzamientos: ${artist.stats.totalReleases}\n`;
  txt += `Videos: ${artist.stats.totalVideos}\n`;
  if (artist.stats.monthlyListeners) {
    txt += `Oyentes Mensuales (Spotify): ${artist.stats.monthlyListeners.toLocaleString()}\n`;
  }
  txt += `\n`;

  if (artist.socialProfiles.length > 0) {
    txt += `REDES SOCIALES\n${"-".repeat(20)}\n`;
    for (const profile of artist.socialProfiles) {
      txt += `${profile.platform.toUpperCase()}: ${profile.url}\n`;
    }
    txt += `\n`;
  }

  if (artist.pressQuotes.length > 0) {
    txt += `CITAS DE PRENSA\n${"-".repeat(20)}\n`;
    for (const quote of artist.pressQuotes) {
      txt += `"${quote.quote}"\n- ${quote.source}\n\n`;
    }
  }

  txt += `CONTACTO\n${"-".repeat(20)}\n`;
  txt += `Email: ${kit?.contactEmail || "prensasonidoliquido@gmail.com"}\n`;
  txt += `Teléfono: ${kit?.contactPhone || "+52 55 2801 1881"}\n\n`;

  txt += `${"=".repeat(50)}\n`;
  txt += `Generado el ${new Date().toLocaleDateString("es-MX", { dateStyle: "full" })}\n`;

  return txt;
}

function generateFullMarkdown(general: GeneralPressKitData, artistsData: ArtistPressKitData[]): string {
  let md = `# ${general.title} - Press Kit\n\n`;
  md += `**${general.subtitle}**\n\n`;
  md += `*${general.tagline}*\n\n`;
  md += `---\n\n`;

  // Stats
  md += `## En Números\n\n`;
  md += `| Artistas | Lanzamientos | Años de Historia |\n`;
  md += `|----------|--------------|------------------|\n`;
  md += `| ${general.stats.artists} | ${general.stats.releases} | ${general.stats.years} |\n\n`;

  // About
  if (general.about.content) {
    md += `## ${general.about.title}\n\n${general.about.content}\n\n`;
  }

  // Press Quotes
  if (general.pressQuotes.length > 0) {
    md += `## Lo Que Dicen de Nosotros\n\n`;
    for (const quote of general.pressQuotes) {
      md += `> "${quote.quote}"\n>\n> — ${quote.source}`;
      if (quote.sourceUrl) md += ` ([Ver fuente](${quote.sourceUrl}))`;
      md += `\n\n`;
    }
  }

  // Roster
  md += `## Roster de Artistas (${artistsData.length})\n\n`;

  const roleLabels: Record<string, string> = {
    mc: "MC",
    dj: "DJ",
    producer: "Productor",
    cantante: "Cantante",
  };

  for (const artist of artistsData) {
    md += `### ${artist.name}\n\n`;
    md += `**Rol:** ${roleLabels[artist.role] || artist.role}\n\n`;

    if (artist.shortBio || artist.bio) {
      md += `${artist.shortBio || artist.bio}\n\n`;
    }

    // Profiles
    const profiles = artist.socialProfiles;
    if (profiles.length > 0) {
      md += `**Enlaces:** `;
      md += profiles.map(p => `[${p.platform}](${p.url})`).join(" | ");
      md += `\n\n`;
    }

    // Quotes
    if (artist.pressQuotes.length > 0) {
      for (const quote of artist.pressQuotes) {
        md += `> "${quote.quote}" — ${quote.source}\n\n`;
      }
    }

    md += `---\n\n`;
  }

  // Contact
  md += `## Contacto de Prensa\n\n`;
  md += `- **Email:** ${general.contact.email}\n`;
  md += `- **Teléfono:** ${general.contact.phone}\n`;
  md += `- **Ubicación:** ${general.contact.location}\n\n`;

  // Social Links
  md += `## Redes Sociales Oficiales\n\n`;
  if (general.socialLinks.spotify) md += `- [Spotify](${general.socialLinks.spotify})\n`;
  if (general.socialLinks.youtube) md += `- [YouTube](${general.socialLinks.youtube})\n`;
  if (general.socialLinks.instagram) md += `- [Instagram](${general.socialLinks.instagram})\n`;
  md += `\n`;

  md += `---\n\n`;
  md += `*Generado el ${new Date().toLocaleDateString("es-MX", { dateStyle: "full" })}*\n`;

  return md;
}

function generateFullText(general: GeneralPressKitData, artistsData: ArtistPressKitData[]): string {
  let txt = `${general.title.toUpperCase()}\n`;
  txt += `${"=".repeat(60)}\n\n`;
  txt += `${general.subtitle}\n`;
  txt += `${general.tagline}\n\n`;
  txt += `${"=".repeat(60)}\n\n`;

  txt += `ESTADÍSTICAS\n`;
  txt += `Artistas: ${general.stats.artists}\n`;
  txt += `Lanzamientos: ${general.stats.releases}\n`;
  txt += `Años: ${general.stats.years}\n\n`;

  txt += `${"=".repeat(60)}\n`;
  txt += `ROSTER DE ARTISTAS (${artistsData.length})\n`;
  txt += `${"=".repeat(60)}\n\n`;

  const roleLabels: Record<string, string> = {
    mc: "MC",
    dj: "DJ",
    producer: "Productor",
    cantante: "Cantante",
  };

  for (const artist of artistsData) {
    txt += `${artist.name.toUpperCase()}\n`;
    txt += `${"-".repeat(40)}\n`;
    txt += `Rol: ${roleLabels[artist.role] || artist.role}\n`;

    if (artist.shortBio || artist.bio) {
      txt += `\n${artist.shortBio || artist.bio}\n`;
    }

    for (const profile of artist.socialProfiles) {
      txt += `${profile.platform}: ${profile.url}\n`;
    }

    txt += `\n`;
  }

  txt += `${"=".repeat(60)}\n`;
  txt += `CONTACTO DE PRENSA\n`;
  txt += `${"=".repeat(60)}\n`;
  txt += `Email: ${general.contact.email}\n`;
  txt += `Teléfono: ${general.contact.phone}\n`;
  txt += `Ubicación: ${general.contact.location}\n\n`;

  txt += `Generado el ${new Date().toLocaleDateString("es-MX", { dateStyle: "full" })}\n`;

  return txt;
}
