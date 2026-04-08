"use client";

import { useState, useEffect } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePageViewTracking, Analytics } from "@/hooks/use-analytics";
import {
  User,
  Music,
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Download,
  ExternalLink,
  ChevronDown,
  Play,
  Calendar,
  Disc3,
  Users,
  Quote,
  Twitter,
  Facebook,
  FileText,
  ArrowRight,
  FileDown,
  Loader2,
  Sparkles,
} from "lucide-react";
import { artistsRoster, type ArtistRosterData } from "@/lib/data/artists-roster";

interface ArtistWithImage extends ArtistRosterData {
  imageUrl?: string;
}

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
  url: string;
}

interface PressKitData {
  heroTitle: string;
  heroSubtitle: string;
  heroTagline: string;
  heroCoverImageUrl: string | null;
  heroBannerImageUrl: string | null;
  statsArtists: string;
  statsReleases: string;
  statsYears: string;
  aboutTitle: string;
  aboutContent: string | null;
  keyPoints: KeyPoint[];
  contactEmail: string;
  contactPhone: string;
  contactLocation: string;
  spotifyUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  twitterUrl: string | null;
  facebookUrl: string | null;
  downloads: DownloadItem[];
  pressQuotes: PressQuote[];
  featuredVideoUrl: string | null;
  featuredVideoTitle: string | null;
  footerCtaTitle: string;
  footerCtaButtonText: string;
}

const defaultPressKit: PressKitData = {
  heroTitle: "Sonido Líquido Crew",
  heroSubtitle: "El colectivo de Hip Hop más representativo de México",
  heroTagline: "Fundado en 1999 en la Ciudad de México.",
  heroCoverImageUrl: null,
  heroBannerImageUrl: null,
  statsArtists: "20+",
  statsReleases: "160+",
  statsYears: "25+",
  aboutTitle: "Sobre Nosotros",
  aboutContent: null,
  keyPoints: [
    { icon: "calendar", title: "Fundado en 1999", description: "Más de 25 años de historia en el Hip Hop mexicano" },
    { icon: "disc", title: "160+ Lanzamientos", description: "Catálogo extenso de música original" },
    { icon: "users", title: "20+ Artistas", description: "Roster activo de talento mexicano" },
  ],
  contactEmail: "prensasonidoliquido@gmail.com",
  contactPhone: "+52 55 2801 1881",
  contactLocation: "Ciudad de México, CDMX",
  spotifyUrl: "https://open.spotify.com/playlist/5qHTKCZIwi3GM3mhPq45Ab",
  instagramUrl: "https://www.instagram.com/sonidoliquido/",
  youtubeUrl: "https://www.youtube.com/@sonidoliquidocrew",
  twitterUrl: null,
  facebookUrl: null,
  downloads: [],
  pressQuotes: [],
  featuredVideoUrl: null,
  featuredVideoTitle: null,
  footerCtaTitle: "¿Listo para colaborar?",
  footerCtaButtonText: "Enviar Mensaje",
};

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

function getKeyPointIcon(icon: string) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    calendar: Calendar,
    disc: Disc3,
    users: Users,
  };
  return icons[icon] || Calendar;
}

function extractYouTubeId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return url;
}

export default function PressPage() {
  const [pressKit, setPressKit] = useState<PressKitData>(defaultPressKit);
  const [artists, setArtists] = useState<ArtistWithImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Track page view
  usePageViewTracking({ section: "prensa" });

  // Generate Press Kit PDF with live Spotify data
  const handleGeneratePdf = async (withSpotify = false) => {
    setGeneratingPdf(true);
    // Track download event
    Analytics.pressKitDownload(withSpotify ? "pdf-spotify" : "pdf");

    try {
      const endpoint = withSpotify
        ? "/api/admin/press-kit/generate-pdf?spotify=true"
        : "/api/admin/press-kit/generate-pdf";

      const res = await fetch(endpoint);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al generar PDF");
      }

      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "sonido-liquido-press-kit.pdf";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert(err instanceof Error ? err.message : "Error al generar PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  useEffect(() => {
    fetchPressKit();
    fetchArtistImages();
  }, []);

  const fetchPressKit = async () => {
    try {
      const res = await fetch("/api/admin/press-kit");
      const data = await res.json();
      if (data.success && data.data) {
        const d = data.data;
        setPressKit({
          heroTitle: d.heroTitle || defaultPressKit.heroTitle,
          heroSubtitle: d.heroSubtitle || defaultPressKit.heroSubtitle,
          heroTagline: d.heroTagline || defaultPressKit.heroTagline,
          heroCoverImageUrl: d.heroCoverImageUrl || null,
          heroBannerImageUrl: d.heroBannerImageUrl || null,
          statsArtists: d.statsArtists || defaultPressKit.statsArtists,
          statsReleases: d.statsReleases || defaultPressKit.statsReleases,
          statsYears: d.statsYears || defaultPressKit.statsYears,
          aboutTitle: d.aboutTitle || defaultPressKit.aboutTitle,
          aboutContent: d.aboutContent || null,
          keyPoints: parseJson(d.keyPoints, defaultPressKit.keyPoints),
          contactEmail: d.contactEmail || defaultPressKit.contactEmail,
          contactPhone: d.contactPhone || defaultPressKit.contactPhone,
          contactLocation: d.contactLocation || defaultPressKit.contactLocation,
          spotifyUrl: d.spotifyUrl || null,
          instagramUrl: d.instagramUrl || null,
          youtubeUrl: d.youtubeUrl || null,
          twitterUrl: d.twitterUrl || null,
          facebookUrl: d.facebookUrl || null,
          downloads: parseJson(d.downloads, []),
          pressQuotes: parseJson(d.pressQuotes, []),
          featuredVideoUrl: d.featuredVideoUrl || null,
          featuredVideoTitle: d.featuredVideoTitle || null,
          footerCtaTitle: d.footerCtaTitle || defaultPressKit.footerCtaTitle,
          footerCtaButtonText: d.footerCtaButtonText || defaultPressKit.footerCtaButtonText,
        });
      }
    } catch (error) {
      console.error("Error fetching press kit:", error);
    }
  };

  const fetchArtistImages = async () => {
    setLoading(true);
    const artistsWithImages: ArtistWithImage[] = [];

    for (const artist of artistsRoster) {
      try {
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(artist.spotifyUrl)}`;
        const response = await fetch(oembedUrl);

        if (response.ok) {
          const data = await response.json();
          artistsWithImages.push({
            ...artist,
            imageUrl: data.thumbnail_url || undefined,
          });
        } else {
          artistsWithImages.push(artist);
        }
      } catch (error) {
        artistsWithImages.push(artist);
      }
    }

    setArtists(artistsWithImages);
    setLoading(false);
  };

  const getRoleLabel = (role?: string) => {
    const labels: Record<string, string> = {
      mc: "MC / Rapero",
      dj: "DJ",
      producer: "Productor",
      cantante: "Cantante",
    };
    return labels[role || ""] || "Artista";
  };

  const getRoleBadgeColor = (role?: string) => {
    const colors: Record<string, string> = {
      mc: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      dj: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      producer: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      cantante: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    };
    return colors[role || ""] || "bg-slc-card text-slc-muted border-slc-border";
  };

  const filteredArtists = selectedRole === "all"
    ? artists
    : artists.filter(a => a.role === selectedRole);

  const roles = [
    { value: "all", label: "Todos" },
    { value: "mc", label: "MCs" },
    { value: "dj", label: "DJs" },
    { value: "producer", label: "Productores" },
    { value: "cantante", label: "Cantantes" },
  ];

  // Parse about content for simple markdown
  const formatAboutContent = (content: string | null) => {
    if (!content) return [];
    return content.split("\n\n").map((paragraph, i) => {
      // Simple bold text replacement
      const formatted = paragraph.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white">$1</strong>');
      return <p key={i} className="mb-4" dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div className="min-h-screen bg-slc-black">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-500/10 via-transparent to-transparent" />

        {/* Banner Image */}
        {pressKit.heroBannerImageUrl && (
          <div className="absolute inset-0 opacity-20">
            <SafeImage
              src={pressKit.heroBannerImageUrl}
              alt=""
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slc-black/50 via-slc-black/80 to-slc-black" />
          </div>
        )}

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Cover Image */}
            {pressKit.heroCoverImageUrl && (
              <div className="mb-8">
                <div className="relative w-40 h-40 md:w-48 md:h-48 mx-auto rounded-2xl overflow-hidden shadow-2xl border-4 border-primary/20">
                  <SafeImage
                    src={pressKit.heroCoverImageUrl}
                    alt={pressKit.heroTitle}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            )}

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm uppercase tracking-wider text-primary">
                Press Kit Oficial
              </span>
            </div>

            <h1 className="font-oswald text-5xl md:text-7xl lg:text-8xl uppercase mb-6">
              <span className="text-white">{pressKit.heroTitle.split(" ").slice(0, -1).join(" ")}</span>
              <br />
              <span className="text-primary">{pressKit.heroTitle.split(" ").slice(-1)}</span>
            </h1>

            <p className="text-xl md:text-2xl text-slc-muted mb-4 max-w-2xl mx-auto">
              {pressKit.heroSubtitle}
            </p>

            <p className="text-lg text-slc-muted/80 mb-8">
              {pressKit.heroTagline}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 mb-12">
              <div className="text-center">
                <div className="font-oswald text-4xl md:text-5xl text-primary">{pressKit.statsArtists}</div>
                <div className="text-sm text-slc-muted uppercase tracking-wider">Artistas</div>
              </div>
              <div className="text-center">
                <div className="font-oswald text-4xl md:text-5xl text-primary">{pressKit.statsReleases}</div>
                <div className="text-sm text-slc-muted uppercase tracking-wider">Lanzamientos</div>
              </div>
              <div className="text-center">
                <div className="font-oswald text-4xl md:text-5xl text-primary">{pressKit.statsYears}</div>
                <div className="text-sm text-slc-muted uppercase tracking-wider">Años</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                <a href={`mailto:${pressKit.contactEmail}`}>
                  <Mail className="w-5 h-5 mr-2" />
                  Contactar Prensa
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleGeneratePdf(true)}
                disabled={generatingPdf}
                className="border-primary/50 hover:bg-primary/10"
              >
                {generatingPdf ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FileDown className="w-5 h-5 mr-2" />
                    Press Kit PDF
                    <Sparkles className="w-4 h-4 ml-1 text-primary" />
                  </>
                )}
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#roster">
                  <Users className="w-5 h-5 mr-2" />
                  Ver Roster
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-slc-muted" />
        </div>
      </section>

      {/* Press Quotes Section */}
      {pressKit.pressQuotes.length > 0 && (
        <section className="py-16 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-3xl md:text-4xl uppercase mb-12 text-center">
                <span className="text-primary">Lo que dicen</span> de nosotros
              </h2>

              <div className="grid gap-6">
                {pressKit.pressQuotes.map((quote, index) => (
                  <blockquote
                    key={index}
                    className="relative bg-slc-card border border-slc-border rounded-xl p-6 md:p-8"
                  >
                    <Quote className="absolute top-6 left-6 w-8 h-8 text-primary/20" />
                    <p className="text-lg md:text-xl text-white/90 italic pl-10 mb-4">
                      "{quote.quote}"
                    </p>
                    <footer className="pl-10 flex items-center gap-2">
                      <span className="text-primary font-medium">— {quote.source}</span>
                      {quote.url && (
                        <a
                          href={quote.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slc-muted hover:text-primary transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* About Section */}
      <section className="py-16 bg-slc-dark/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-oswald text-3xl md:text-4xl uppercase mb-8 text-center">
              {pressKit.aboutTitle.split(" ").map((word, i, arr) => (
                <span key={i}>
                  {i === arr.length - 1 ? (
                    <span className="text-primary">{word}</span>
                  ) : (
                    word + " "
                  )}
                </span>
              ))}
            </h2>

            <div className="prose prose-invert prose-lg max-w-none text-slc-muted">
              {pressKit.aboutContent ? (
                formatAboutContent(pressKit.aboutContent)
              ) : (
                <>
                  <p>
                    <strong className="text-white">Sonido Líquido Crew</strong> es un colectivo de Hip Hop mexicano
                    fundado en 1999 en la Ciudad de México. Con más de dos décadas de trayectoria, el crew ha sido
                    fundamental en el desarrollo y profesionalización del Hip Hop en México.
                  </p>
                  <p>
                    Bajo el liderazgo de <strong className="text-primary">Zaque</strong>, el colectivo ha reunido a
                    algunos de los artistas más talentosos y comprometidos del género, abarcando MCs, DJs, productores
                    y cantantes que representan la diversidad y riqueza del Hip Hop mexicano.
                  </p>
                </>
              )}
            </div>

            {/* Key Points */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              {pressKit.keyPoints.map((point, index) => {
                const Icon = getKeyPointIcon(point.icon);
                return (
                  <div key={index} className="bg-slc-card border border-slc-border rounded-xl p-6 text-center">
                    <Icon className="w-10 h-10 text-primary mx-auto mb-4" />
                    <h3 className="font-oswald text-xl uppercase mb-2">{point.title}</h3>
                    <p className="text-sm text-slc-muted">{point.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Video Section */}
      {pressKit.featuredVideoUrl && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-3xl md:text-4xl uppercase mb-8 text-center">
                Video <span className="text-primary">Destacado</span>
              </h2>

              {pressKit.featuredVideoTitle && (
                <p className="text-center text-slc-muted mb-6">{pressKit.featuredVideoTitle}</p>
              )}

              <div className="aspect-video rounded-2xl overflow-hidden bg-slc-card shadow-2xl">
                <iframe
                  src={`https://www.youtube.com/embed/${extractYouTubeId(pressKit.featuredVideoUrl)}`}
                  title={pressKit.featuredVideoTitle || "Video destacado"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Roster Section */}
      <section id="roster" className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-oswald text-3xl md:text-4xl uppercase mb-4">
              Roster de <span className="text-primary">Artistas</span>
            </h2>
            <p className="text-slc-muted max-w-2xl mx-auto">
              Conoce a los artistas que forman parte de Sonido Líquido Crew
            </p>
          </div>

          {/* Role Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedRole === role.value
                    ? "bg-primary text-white"
                    : "bg-slc-card text-slc-muted hover:bg-slc-card/80"
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>

          {/* Artists Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-slc-card border border-slc-border rounded-xl overflow-hidden animate-pulse">
                  <div className="aspect-square bg-slc-border" />
                  <div className="p-4">
                    <div className="h-6 bg-slc-border rounded mb-2" />
                    <div className="h-4 bg-slc-border rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredArtists.map((artist) => (
                <div
                  key={artist.slug}
                  className="group bg-slc-card border border-slc-border rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300"
                >
                  {/* Image */}
                  <div className="aspect-square relative bg-slc-border overflow-hidden">
                    {artist.imageUrl ? (
                      <SafeImage
                        src={artist.imageUrl}
                        alt={artist.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slc-card to-slc-border">
                        <User className="w-20 h-20 text-slc-muted" />
                      </div>
                    )}

                    {/* Overlay with links */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-3">
                        <a
                          href={artist.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full bg-spotify flex items-center justify-center hover:scale-110 transition-transform"
                        >
                          <Music className="w-5 h-5 text-white" />
                        </a>
                        {artist.instagramUrl && (
                          <a
                            href={artist.instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500 flex items-center justify-center hover:scale-110 transition-transform"
                          >
                            <Instagram className="w-5 h-5 text-white" />
                          </a>
                        )}
                        {artist.youtubeUrl && (
                          <a
                            href={artist.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center hover:scale-110 transition-transform"
                          >
                            <Youtube className="w-5 h-5 text-white" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Role Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(artist.role)}`}>
                        {getRoleLabel(artist.role)}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-oswald text-xl uppercase mb-1">{artist.name}</h3>
                    {artist.instagramHandle && (
                      <p className="text-sm text-slc-muted">{artist.instagramHandle}</p>
                    )}
                    {artist.bio && (
                      <p className="text-sm text-slc-muted mt-2 line-clamp-2">{artist.bio}</p>
                    )}
                    {/* Press Kit & EPK Links */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Link
                        href={`/prensa/artistas/${artist.slug}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        Press Kit
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                      <Link
                        href={`/epk/${artist.slug}`}
                        className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-primary/10 border border-primary/30 rounded-full text-primary hover:bg-primary/20 transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        EPK Completo
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 bg-slc-dark/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-oswald text-3xl md:text-4xl uppercase mb-4">
                Contacto de <span className="text-primary">Prensa</span>
              </h2>
              <p className="text-slc-muted">
                Para entrevistas, colaboraciones y solicitudes de prensa
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {/* Email */}
              <a
                href={`mailto:${pressKit.contactEmail}`}
                className="bg-slc-card border border-slc-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors group"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <Mail className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-medium mb-1">Email</h3>
                <p className="text-sm text-primary">{pressKit.contactEmail}</p>
              </a>

              {/* Phone */}
              <a
                href={`tel:${pressKit.contactPhone.replace(/\s/g, "")}`}
                className="bg-slc-card border border-slc-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors group"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <Phone className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-medium mb-1">Teléfono</h3>
                <p className="text-sm text-primary">{pressKit.contactPhone}</p>
              </a>

              {/* Location */}
              <div className="bg-slc-card border border-slc-border rounded-xl p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-medium mb-1">Ubicación</h3>
                <p className="text-sm text-slc-muted">{pressKit.contactLocation}</p>
              </div>
            </div>

            {/* Social Links */}
            <div className="text-center">
              <h3 className="text-sm uppercase tracking-wider text-slc-muted mb-4">Redes Sociales</h3>
              <div className="flex justify-center gap-4">
                {pressKit.spotifyUrl && (
                  <a
                    href={pressKit.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-spotify/10 hover:bg-spotify/20 flex items-center justify-center transition-colors"
                  >
                    <Music className="w-6 h-6 text-spotify" />
                  </a>
                )}
                {pressKit.youtubeUrl && (
                  <a
                    href={pressKit.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                  >
                    <Youtube className="w-6 h-6 text-red-500" />
                  </a>
                )}
                {pressKit.instagramUrl && (
                  <a
                    href={pressKit.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-pink-500/10 hover:bg-pink-500/20 flex items-center justify-center transition-colors"
                  >
                    <Instagram className="w-6 h-6 text-pink-500" />
                  </a>
                )}
                {pressKit.twitterUrl && (
                  <a
                    href={pressKit.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-blue-500/10 hover:bg-blue-500/20 flex items-center justify-center transition-colors"
                  >
                    <Twitter className="w-6 h-6 text-blue-500" />
                  </a>
                )}
                {pressKit.facebookUrl && (
                  <a
                    href={pressKit.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-blue-600/10 hover:bg-blue-600/20 flex items-center justify-center transition-colors"
                  >
                    <Facebook className="w-6 h-6 text-blue-600" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-oswald text-3xl md:text-4xl uppercase mb-4">
              Recursos de <span className="text-primary">Prensa</span>
            </h2>
            <p className="text-slc-muted mb-8">
              Descarga logos, fotos y material promocional
            </p>

            {pressKit.downloads.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                {pressKit.downloads.map((item, index) => (
                  <a
                    key={index}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-slc-card border border-slc-border rounded-xl hover:border-primary/50 transition-colors group"
                  >
                    <Download className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                      <p className="font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-slc-muted">{item.description}</p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <Button variant="outline" size="lg" disabled>
                  <Download className="w-5 h-5 mr-2" />
                  Press Kit (Próximamente)
                </Button>
                <Button variant="outline" size="lg" disabled>
                  <Download className="w-5 h-5 mr-2" />
                  Logos (Próximamente)
                </Button>
                <Button variant="outline" size="lg" disabled>
                  <Download className="w-5 h-5 mr-2" />
                  Fotos HD (Próximamente)
                </Button>
              </div>
            )}

            <p className="text-sm text-slc-muted">
              Para solicitar material de prensa específico, contacta a{" "}
              <a href={`mailto:${pressKit.contactEmail}`} className="text-primary hover:underline">
                {pressKit.contactEmail}
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 bg-gradient-to-t from-primary/10 to-transparent">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-oswald text-2xl md:text-3xl uppercase mb-6">
            {pressKit.footerCtaTitle}
          </h2>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
            <a href={`mailto:${pressKit.contactEmail}`}>
              <Mail className="w-5 h-5 mr-2" />
              {pressKit.footerCtaButtonText}
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}
