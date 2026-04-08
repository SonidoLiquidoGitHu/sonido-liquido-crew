"use client";

import { useState, useEffect, use } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  User,
  Music,
  Instagram,
  Youtube,
  Mail,
  Download,
  ExternalLink,
  ChevronLeft,
  Play,
  Quote,
  Copy,
  Check,
  Calendar,
  Disc3,
  Video,
  Eye,
  FileText,
  Share2,
} from "lucide-react";

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

interface SocialProfile {
  platform: string;
  url: string;
  handle: string | null;
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
  socialProfiles: SocialProfile[];
  stats: {
    totalReleases: number;
    totalVideos: number;
    monthlyListeners: number | null;
  };
}

interface GeneralPressKitData {
  contact: {
    email: string;
    phone: string;
    location: string;
  };
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function ArtistPressKitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [artist, setArtist] = useState<ArtistPressKitData | null>(null);
  const [general, setGeneral] = useState<GeneralPressKitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<FeaturedVideo | null>(null);

  useEffect(() => {
    fetchArtistPressKit();
  }, [slug]);

  const fetchArtistPressKit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/press-kit?artist=${slug}`);
      const data = await res.json();
      if (data.success && data.data) {
        setArtist(data.data.artist);
        setGeneral(data.data.general);
      }
    } catch (error) {
      console.error("Error fetching artist press kit:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const downloadPressKit = async (format: "markdown" | "txt") => {
    window.open(`/api/press-kit?artist=${slug}&format=${format}`, "_blank");
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      mc: "MC / Rapero",
      dj: "DJ",
      producer: "Productor",
      cantante: "Cantante",
    };
    return labels[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      mc: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      dj: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      producer: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      cantante: "bg-pink-500/20 text-pink-400 border-pink-500/30",
    };
    return colors[role] || "bg-slc-card text-slc-muted border-slc-border";
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "spotify":
        return <Music className="w-5 h-5" />;
      case "instagram":
        return <Instagram className="w-5 h-5" />;
      case "youtube":
        return <Youtube className="w-5 h-5" />;
      default:
        return <ExternalLink className="w-5 h-5" />;
    }
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      spotify: "bg-spotify/10 text-spotify hover:bg-spotify/20",
      instagram: "bg-pink-500/10 text-pink-500 hover:bg-pink-500/20",
      youtube: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
    };
    return colors[platform] || "bg-slc-card text-slc-muted hover:bg-slc-card/80";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slc-black flex items-center justify-center">
        <div className="animate-pulse text-slc-muted">Cargando press kit...</div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-slc-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-oswald text-3xl mb-4">Artista no encontrado</h1>
          <Button asChild>
            <Link href="/prensa">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Volver al Press Kit
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slc-black">
      {/* Hero Section */}
      <section className="relative py-16 lg:py-24 overflow-hidden">
        {/* Background */}
        {artist.bannerImageUrl && (
          <div className="absolute inset-0 opacity-20">
            <SafeImage
              src={artist.bannerImageUrl}
              alt=""
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slc-black/50 via-slc-black/80 to-slc-black" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

        <div className="container mx-auto px-4 relative z-10">
          {/* Back Link */}
          <Link
            href="/prensa"
            className="inline-flex items-center gap-2 text-slc-muted hover:text-white transition-colors mb-8"
          >
            <ChevronLeft className="w-4 h-4" />
            Volver al Press Kit General
          </Link>

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
            {/* Profile Image */}
            <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-2xl overflow-hidden bg-slc-card shadow-2xl border-4 border-primary/20 flex-shrink-0 mx-auto lg:mx-0">
              {artist.profileImageUrl ? (
                <SafeImage
                  src={artist.profileImageUrl}
                  alt={artist.name}
                  width={256}
                  height={256}
                  className="w-full h-full object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slc-card to-slc-border">
                  <User className="w-24 h-24 text-slc-muted" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm uppercase tracking-wider text-primary">
                  Press Kit
                </span>
              </div>

              <h1 className="font-oswald text-4xl md:text-5xl lg:text-6xl uppercase mb-4">
                {artist.name}
              </h1>

              <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium border ${getRoleBadgeColor(artist.role)} mb-6`}>
                {getRoleLabel(artist.role)}
              </span>

              {artist.shortBio && (
                <p className="text-lg text-slc-muted mb-6 max-w-2xl">
                  {artist.shortBio}
                </p>
              )}

              {/* Quick Stats */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 mb-8">
                <div className="text-center">
                  <div className="font-oswald text-3xl text-primary">{artist.stats.totalReleases}</div>
                  <div className="text-xs text-slc-muted uppercase tracking-wider">Lanzamientos</div>
                </div>
                <div className="text-center">
                  <div className="font-oswald text-3xl text-primary">{artist.stats.totalVideos}</div>
                  <div className="text-xs text-slc-muted uppercase tracking-wider">Videos</div>
                </div>
                {artist.stats.monthlyListeners && (
                  <div className="text-center">
                    <div className="font-oswald text-3xl text-primary">
                      {(artist.stats.monthlyListeners / 1000).toFixed(0)}K
                    </div>
                    <div className="text-xs text-slc-muted uppercase tracking-wider">Oyentes/Mes</div>
                  </div>
                )}
                {artist.yearStarted && (
                  <div className="text-center">
                    <div className="font-oswald text-3xl text-primary">{artist.yearStarted}</div>
                    <div className="text-xs text-slc-muted uppercase tracking-wider">Inicio</div>
                  </div>
                )}
              </div>

              {/* Social Links */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-8">
                {artist.socialProfiles.map((profile) => (
                  <a
                    key={profile.platform}
                    href={profile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${getPlatformColor(profile.platform)}`}
                  >
                    {getPlatformIcon(profile.platform)}
                    <span className="capitalize">{profile.platform}</span>
                    {profile.handle && (
                      <span className="text-xs opacity-70">{profile.handle}</span>
                    )}
                  </a>
                ))}
              </div>

              {/* Download Buttons */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                <Button asChild className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90">
                  <Link href={`/epk/${slug}`}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver EPK Completo
                  </Link>
                </Button>
                <Button onClick={() => downloadPressKit("markdown")} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Descargar (Markdown)
                </Button>
                <Button onClick={() => downloadPressKit("txt")} variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Descargar (TXT)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(shareUrl, "share")}
                >
                  {copiedField === "share" ? (
                    <Check className="w-4 h-4 mr-2 text-green-500" />
                  ) : (
                    <Share2 className="w-4 h-4 mr-2" />
                  )}
                  Compartir
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Biography Section */}
      {artist.bio && (
        <section className="py-12 bg-slc-dark/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-2xl uppercase mb-6 flex items-center gap-3">
                <User className="w-6 h-6 text-primary" />
                Biografía
              </h2>
              <div className="prose prose-invert prose-lg max-w-none">
                {artist.bio.split("\n\n").map((paragraph, i) => (
                  <p key={i} className="text-slc-muted mb-4">{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Press Quotes Section */}
      {artist.pressQuotes.length > 0 && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-2xl uppercase mb-8 flex items-center gap-3">
                <Quote className="w-6 h-6 text-primary" />
                Citas de Prensa ({artist.pressQuotes.length})
              </h2>

              <div className="grid gap-6">
                {artist.pressQuotes.map((quote, index) => (
                  <blockquote
                    key={index}
                    className="relative bg-slc-card border border-slc-border rounded-xl p-6 md:p-8 hover:border-primary/30 transition-colors"
                  >
                    <Quote className="absolute top-6 left-6 w-8 h-8 text-primary/20" />
                    <p className="text-lg md:text-xl text-white/90 italic pl-10 mb-4">
                      "{quote.quote}"
                    </p>
                    <footer className="pl-10 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-primary font-medium">— {quote.source}</span>
                      {quote.sourceUrl && (
                        <a
                          href={quote.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-slc-muted hover:text-primary transition-colors"
                        >
                          Ver fuente
                          <ExternalLink className="w-3 h-3" />
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

      {/* Featured Videos Section */}
      {artist.featuredVideos.length > 0 && (
        <section className="py-12 bg-slc-dark/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="font-oswald text-2xl uppercase mb-8 flex items-center gap-3">
                <Video className="w-6 h-6 text-primary" />
                Videos Destacados ({artist.featuredVideos.length})
              </h2>

              {/* Video Player */}
              {selectedVideo && (
                <div className="mb-8">
                  <div className="aspect-video rounded-xl overflow-hidden bg-slc-card shadow-2xl mb-4">
                    {extractYouTubeId(selectedVideo.videoUrl) ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${extractYouTubeId(selectedVideo.videoUrl)}`}
                        title={selectedVideo.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <a
                          href={selectedVideo.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Ver video externo
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-lg">{selectedVideo.title}</h3>
                      {selectedVideo.views > 0 && (
                        <p className="text-sm text-slc-muted flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {selectedVideo.views.toLocaleString()} vistas
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedVideo(null)}
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              )}

              {/* Video Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {artist.featuredVideos.map((video, index) => {
                  const videoId = extractYouTubeId(video.videoUrl);
                  const thumbnailUrl = video.thumbnailUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedVideo(video)}
                      className={`group bg-slc-card border rounded-lg overflow-hidden text-left hover:border-primary/50 transition-all ${
                        selectedVideo === video ? "border-primary" : "border-slc-border"
                      }`}
                    >
                      <div className="aspect-video relative bg-slc-border">
                        {thumbnailUrl ? (
                          <SafeImage
                            src={thumbnailUrl}
                            alt={video.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Youtube className="w-12 h-12 text-slc-muted" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-12 h-12 text-white" />
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {video.title}
                        </h4>
                        {video.views > 0 && (
                          <p className="text-xs text-slc-muted mt-1">
                            {video.views.toLocaleString()} vistas
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-oswald text-2xl uppercase mb-8 flex items-center gap-3">
              <Mail className="w-6 h-6 text-primary" />
              Contacto
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Artist-specific emails */}
              {artist.bookingEmail && (
                <a
                  href={`mailto:${artist.bookingEmail}`}
                  className="bg-slc-card border border-slc-border rounded-xl p-5 hover:border-primary/50 transition-colors group"
                >
                  <div className="text-xs text-slc-muted uppercase tracking-wider mb-2">Booking</div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary group-hover:underline">{artist.bookingEmail}</span>
                    <Mail className="w-4 h-4 text-slc-muted" />
                  </div>
                </a>
              )}

              {artist.pressEmail && (
                <a
                  href={`mailto:${artist.pressEmail}`}
                  className="bg-slc-card border border-slc-border rounded-xl p-5 hover:border-primary/50 transition-colors group"
                >
                  <div className="text-xs text-slc-muted uppercase tracking-wider mb-2">Prensa</div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary group-hover:underline">{artist.pressEmail}</span>
                    <Mail className="w-4 h-4 text-slc-muted" />
                  </div>
                </a>
              )}

              {/* General press contact */}
              {general && (
                <a
                  href={`mailto:${general.contact.email}`}
                  className="bg-slc-card border border-slc-border rounded-xl p-5 hover:border-primary/50 transition-colors group"
                >
                  <div className="text-xs text-slc-muted uppercase tracking-wider mb-2">Sonido Líquido (General)</div>
                  <div className="flex items-center justify-between">
                    <span className="text-primary group-hover:underline">{general.contact.email}</span>
                    <Mail className="w-4 h-4 text-slc-muted" />
                  </div>
                </a>
              )}
            </div>

            {/* Social profiles with copy buttons */}
            <div className="mt-8 bg-slc-card border border-slc-border rounded-xl p-6">
              <h3 className="font-medium mb-4">Enlaces para Incluir en Artículos</h3>
              <div className="space-y-3">
                {artist.socialProfiles.map((profile) => (
                  <div
                    key={profile.platform}
                    className="flex items-center justify-between p-3 bg-slc-dark rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(profile.platform)}
                      <div>
                        <span className="capitalize font-medium">{profile.platform}</span>
                        {profile.handle && (
                          <span className="text-slc-muted ml-2 text-sm">{profile.handle}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={profile.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline truncate max-w-[200px]"
                      >
                        {profile.url}
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => copyToClipboard(profile.url, profile.platform)}
                      >
                        {copiedField === profile.platform ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Back to Press Kit CTA */}
      <section className="py-12 bg-gradient-to-t from-primary/10 to-transparent">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slc-muted mb-4">
            Ver información completa de todo el colectivo
          </p>
          <Button asChild size="lg">
            <Link href="/prensa">
              <ChevronLeft className="w-5 h-5 mr-2" />
              Press Kit General - Sonido Líquido Crew
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
