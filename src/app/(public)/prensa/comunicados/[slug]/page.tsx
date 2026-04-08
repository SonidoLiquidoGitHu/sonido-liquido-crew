"use client";

import { useState, useEffect, use } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CompactTracklist, CompactAudioPlayer } from "@/components/ui/compact-audio-player";
import { PressToolkit } from "@/components/press/PressToolkit";
import {
  Newspaper,
  Calendar,
  ArrowLeft,
  ArrowRight,
  Clock,
  Disc,
  Users,
  Eye,
  Download,
  Mail,
  Phone,
  ExternalLink,
  Share2,
  Quote,
  Loader2,
  Music,
  Video,
  Package,
  Image as ImageIcon,
  FileDown,
  Copy,
  Check,
  AlertTriangle,
  Hash,
  FileText,
  Globe,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface AudioTrack {
  title: string;
  artist?: string;
  url: string;
  duration: string;
  trackNumber: number;
}

interface MediaRelease {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  category: string;
  summary: string | null;
  content: string | null;
  pullQuote: string | null;
  pullQuoteAttribution: string | null;
  coverImageUrl: string | null;
  bannerImageUrl: string | null;
  galleryImages: string | null;
  logoUrl: string | null;
  audioPreviewUrl: string | null;
  audioPreviewTitle: string | null;
  audioTracks: string | null;
  spotifyEmbedUrl: string | null;
  youtubeVideoId: string | null;
  youtubeVideoTitle: string | null;
  pressKitUrl: string | null;
  highResImagesUrl: string | null;
  linerNotesUrl: string | null;
  credits: string | null;
  externalLinks: string | null;
  prContactName: string | null;
  prContactEmail: string | null;
  prContactPhone: string | null;
  managementContact: string | null;
  bookingContact: string | null;
  publishDate: string;
  embargoDate?: string | null;
  releaseDate: string | null;
  eventDate: string | null;
  isFeatured: boolean;
  viewCount: number;
  tags: string | null;
}

const categoryLabels: Record<string, string> = {
  new_release: "Nuevo Lanzamiento",
  single: "Single",
  album: "Álbum",
  ep: "EP",
  tour: "Gira / Tour",
  collaboration: "Colaboración",
  event: "Evento",
  announcement: "Anuncio",
  interview: "Entrevista",
  feature: "Feature / Artículo",
};

// Copy button component
function CopyButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
        copied
          ? "bg-green-500/10 text-green-500"
          : "bg-slc-card text-slc-muted hover:text-white hover:bg-slc-dark"
      } ${className}`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copiado" : label}
    </button>
  );
}

export default function MediaReleasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [release, setRelease] = useState<MediaRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const preview = urlParams.get("preview") === "true";
    setIsPreview(preview);
    fetchRelease(preview);
  }, [slug]);

  const fetchRelease = async (preview = false) => {
    try {
      const url = preview
        ? `/api/media-releases/${slug}?preview=true`
        : `/api/media-releases/${slug}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setRelease(data.data);
      } else {
        setError(data.error || "Media release not found");
      }
    } catch (err) {
      setError("Failed to load media release");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: release?.title,
          text: release?.summary || "",
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copiado al portapapeles");
    }
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const res = await fetch("/api/admin/press-kit/generate-pdf");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al generar PDF");
      }
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "press-kit.pdf";
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !release) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Newspaper className="w-16 h-16 text-slc-muted mb-4" />
        <h1 className="text-2xl font-oswald uppercase mb-2">Comunicado No Encontrado</h1>
        <p className="text-slc-muted mb-6">{error || "Este comunicado no existe"}</p>
        <Button asChild>
          <Link href="/prensa/comunicados">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Ver todos los comunicados
          </Link>
        </Button>
      </div>
    );
  }

  // Parse JSON fields
  const galleryImages = release.galleryImages ? JSON.parse(release.galleryImages) : [];
  const externalLinks = release.externalLinks ? JSON.parse(release.externalLinks) : [];
  const tags = release.tags ? JSON.parse(release.tags) : [];
  let audioTracks: AudioTrack[] = [];
  try {
    if (release.audioTracks) {
      audioTracks = JSON.parse(release.audioTracks);
    }
  } catch {
    audioTracks = [];
  }

  // Calculate track stats
  const totalDuration = audioTracks.reduce((acc, track) => {
    const parts = track.duration?.split(":") || [];
    if (parts.length === 2) {
      return acc + parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return acc;
  }, 0);

  const formatTotalDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Check if embargo is active
  const isEmbargoed = release.embargoDate && new Date(release.embargoDate) > new Date();

  return (
    <div className="min-h-screen bg-slc-black">
      {/* Print Header - Only visible when printing */}
      <div className="print-only print-header hidden">
        <p className="text-sm text-slc-muted mb-2">COMUNICADO DE PRENSA</p>
        <h1 className="text-2xl font-bold">{release.title}</h1>
        {release.subtitle && <p className="text-lg text-primary">{release.subtitle}</p>}
        <p className="text-sm mt-2">
          {new Date(release.publishDate).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
          {" • "}Sonido Líquido Crew
        </p>
      </div>

      {/* Preview Banner */}
      {isPreview && (
        <div className="bg-orange-500 text-white text-center py-2 px-4 sticky top-0 z-50">
          <span className="font-medium">
            Vista previa - Este comunicado aún no está publicado
          </span>
        </div>
      )}

      {/* Embargo Banner */}
      {isEmbargoed && (
        <div className="bg-red-600 text-white text-center py-3 px-4 sticky top-0 z-50">
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              EMBARGO ACTIVO - No publicar antes del{" "}
              {new Date(release.embargoDate!).toLocaleDateString("es-MX", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="border-b border-slc-border bg-slc-dark/50">
        <div className="container mx-auto px-4 py-6">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button asChild variant="ghost" size="sm">
              <Link href="/prensa/comunicados">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Comunicados
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <CopyButton text={window.location.href} label="Copiar URL" />
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-slc-card text-slc-muted hover:text-white hover:bg-slc-dark transition-colors"
              >
                <Share2 className="w-3 h-3" />
                Compartir
              </button>
            </div>
          </div>

          {/* Title & Meta */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Cover */}
            {release.coverImageUrl && (
              <div className="w-32 h-32 lg:w-40 lg:h-40 flex-shrink-0 rounded-lg overflow-hidden bg-slc-card">
                <SafeImage
                  src={release.coverImageUrl}
                  alt={release.title}
                  width={160}
                  height={160}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary uppercase">
                  {categoryLabels[release.category] || release.category}
                </span>
                {release.isFeatured && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-500">
                    Destacado
                  </span>
                )}
              </div>

              <h1 className="font-oswald text-3xl lg:text-4xl uppercase mb-2">
                {release.title}
              </h1>

              {release.subtitle && (
                <p className="text-lg text-primary mb-3">{release.subtitle}</p>
              )}

              {/* Quick Facts */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slc-muted">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(release.publishDate).toLocaleDateString("es-MX", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {audioTracks.length > 0 && (
                  <>
                    <span className="flex items-center gap-1">
                      <Disc className="w-4 h-4" />
                      {audioTracks.length} tracks
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTotalDuration(totalDuration)}
                    </span>
                  </>
                )}
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {release.viewCount} vistas
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Summary with Copy */}
            {release.summary && (
              <div className="bg-slc-card border border-slc-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Resumen para Medios
                  </h2>
                  <CopyButton text={release.summary} label="Copiar" />
                </div>
                <p className="text-lg text-gray-200 leading-relaxed">
                  {release.summary}
                </p>
              </div>
            )}

            {/* Pull Quote */}
            {release.pullQuote && (
              <div className="bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <Quote className="w-6 h-6 text-primary flex-shrink-0" />
                  <CopyButton
                    text={`"${release.pullQuote}" — ${release.pullQuoteAttribution || "Sonido Líquido Crew"}`}
                    label="Copiar cita"
                  />
                </div>
                <blockquote className="text-xl italic text-white mb-2">
                  "{release.pullQuote}"
                </blockquote>
                {release.pullQuoteAttribution && (
                  <cite className="text-slc-muted not-italic text-sm">
                    — {release.pullQuoteAttribution}
                  </cite>
                )}
              </div>
            )}

            {/* Audio Tracks - Compact Player */}
            {audioTracks.length > 0 && (
              <div className="bg-slc-card border border-slc-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-oswald text-lg uppercase flex items-center gap-2">
                    <Music className="w-5 h-5 text-primary" />
                    Tracklist
                  </h2>
                </div>
                <CompactTracklist
                  tracks={audioTracks}
                  showDownloadAll={false}
                />
              </div>
            )}

            {/* Single Audio Preview (legacy) */}
            {release.audioPreviewUrl && audioTracks.length === 0 && (
              <div className="bg-slc-card border border-slc-border rounded-xl p-5">
                <h2 className="font-oswald text-lg uppercase flex items-center gap-2 mb-4">
                  <Music className="w-5 h-5 text-primary" />
                  Audio Preview
                </h2>
                <CompactAudioPlayer
                  src={release.audioPreviewUrl}
                  title={release.audioPreviewTitle || "Audio Preview"}
                />
              </div>
            )}

            {/* Spotify Embed */}
            {release.spotifyEmbedUrl && (
              <div className="bg-slc-card border border-slc-border rounded-xl p-5">
                <h2 className="font-oswald text-lg uppercase flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-[#1DB954]" />
                  Spotify
                </h2>
                <div className="rounded-lg overflow-hidden">
                  <iframe
                    src={`https://open.spotify.com/embed/track/${release.spotifyEmbedUrl.split('/').pop()?.split('?')[0]}`}
                    width="100%"
                    height="152"
                    allowFullScreen
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* YouTube Video */}
            {release.youtubeVideoId && (
              <div className="bg-slc-card border border-slc-border rounded-xl p-5">
                <h2 className="font-oswald text-lg uppercase flex items-center gap-2 mb-4">
                  <Video className="w-5 h-5 text-red-500" />
                  Video
                </h2>
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={`https://www.youtube.com/embed/${release.youtubeVideoId}`}
                    width="100%"
                    height="100%"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Full Press Release Content */}
            {release.content && (
              <div className="bg-slc-card border border-slc-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="font-oswald text-lg uppercase flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Comunicado Completo
                  </h2>
                  <CopyButton text={release.content.replace(/[*#_]/g, "")} label="Copiar texto" />
                </div>
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{release.content}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Gallery */}
            {galleryImages.length > 0 && (
              <div className="bg-slc-card border border-slc-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-oswald text-lg uppercase flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-primary" />
                    Imágenes ({galleryImages.length})
                  </h2>
                  <span className="text-xs text-slc-muted">Click para ver/descargar</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {galleryImages.map((url: string, index: number) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square rounded-lg overflow-hidden bg-slc-dark group"
                    >
                      <SafeImage
                        src={url}
                        alt={`Gallery ${index + 1}`}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Credits */}
            {release.credits && (
              <div className="bg-slc-card border border-slc-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="font-oswald text-lg uppercase">Créditos</h2>
                  <CopyButton text={release.credits} label="Copiar" />
                </div>
                <pre className="text-sm text-slc-muted whitespace-pre-wrap font-sans">
                  {release.credits}
                </pre>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4 no-print">
            {/* Press Kit Download */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
              <h3 className="font-oswald text-sm uppercase mb-3 text-primary">
                Press Kit PDF
              </h3>
              <p className="text-xs text-slc-muted mb-4">
                Kit de prensa completo con biografías y fotos HD.
              </p>
              <Button
                onClick={handleGeneratePdf}
                disabled={generatingPdf}
                className="w-full"
                size="sm"
              >
                {generatingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4 mr-2" />
                    Descargar PDF
                  </>
                )}
              </Button>
            </div>

            {/* Press Toolkit - All the new features */}
            <PressToolkit
              release={release as Parameters<typeof PressToolkit>[0]["release"]}
              pageUrl={typeof window !== "undefined" ? window.location.href : `https://sonidoliquido.com/prensa/comunicados/${release.slug}`}
            />

            {/* Downloads */}
            {(release.pressKitUrl || release.highResImagesUrl || release.linerNotesUrl) && (
              <div className="bg-slc-card border border-slc-border rounded-xl p-5">
                <h3 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
                  <Download className="w-4 h-4 text-primary" />
                  Archivos
                </h3>
                <div className="space-y-2">
                  {release.pressKitUrl && (
                    <a
                      href={release.pressKitUrl}
                      download
                      className="flex items-center gap-2 p-2 rounded-lg text-sm bg-slc-dark hover:bg-slc-dark/80 transition-colors"
                    >
                      <Package className="w-4 h-4 text-slc-muted" />
                      <span className="flex-1">Press Kit ZIP</span>
                      <Download className="w-3 h-3 text-slc-muted" />
                    </a>
                  )}
                  {release.highResImagesUrl && (
                    <a
                      href={release.highResImagesUrl}
                      download
                      className="flex items-center gap-2 p-2 rounded-lg text-sm bg-slc-dark hover:bg-slc-dark/80 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4 text-slc-muted" />
                      <span className="flex-1">Imágenes HD</span>
                      <Download className="w-3 h-3 text-slc-muted" />
                    </a>
                  )}
                  {release.linerNotesUrl && (
                    <a
                      href={release.linerNotesUrl}
                      download
                      className="flex items-center gap-2 p-2 rounded-lg text-sm bg-slc-dark hover:bg-slc-dark/80 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-slc-muted" />
                      <span className="flex-1">Liner Notes</span>
                      <Download className="w-3 h-3 text-slc-muted" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Key Dates */}
            {(release.releaseDate || release.eventDate || release.embargoDate) && (
              <div className="bg-slc-card border border-slc-border rounded-xl p-5">
                <h3 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Fechas Clave
                </h3>
                <div className="space-y-3 text-sm">
                  {release.embargoDate && (
                    <div className={isEmbargoed ? "text-red-400" : ""}>
                      <p className="text-xs text-slc-muted uppercase">Embargo</p>
                      <p className="font-medium">
                        {new Date(release.embargoDate).toLocaleDateString("es-MX", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                  {release.releaseDate && (
                    <div>
                      <p className="text-xs text-slc-muted uppercase">Lanzamiento</p>
                      <p className="font-medium">
                        {new Date(release.releaseDate).toLocaleDateString("es-MX", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                  {release.eventDate && (
                    <div>
                      <p className="text-xs text-slc-muted uppercase">Evento</p>
                      <p className="font-medium">
                        {new Date(release.eventDate).toLocaleDateString("es-MX", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* External Links */}
            {externalLinks.length > 0 && (
              <div className="bg-slc-card border border-slc-border rounded-xl p-5">
                <h3 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-primary" />
                  Enlaces
                </h3>
                <div className="space-y-2">
                  {externalLinks.map((link: { label: string; url: string }, index: number) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-slc-muted hover:text-primary transition-colors"
                    >
                      <ArrowRight className="w-3 h-3" />
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Press Contact */}
            {(release.prContactEmail || release.prContactPhone) && (
              <div className="bg-slc-card border border-slc-border rounded-xl p-5">
                <h3 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Contacto de Prensa
                </h3>
                <div className="space-y-2 text-sm">
                  {release.prContactName && (
                    <p className="font-medium">{release.prContactName}</p>
                  )}
                  {release.prContactEmail && (
                    <a
                      href={`mailto:${release.prContactEmail}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Mail className="w-3 h-3" />
                      {release.prContactEmail}
                    </a>
                  )}
                  {release.prContactPhone && (
                    <a
                      href={`tel:${release.prContactPhone}`}
                      className="flex items-center gap-2 text-slc-muted hover:text-white"
                    >
                      <Phone className="w-3 h-3" />
                      {release.prContactPhone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="bg-slc-card border border-slc-border rounded-xl p-5">
                <h3 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-slc-dark rounded text-xs text-slc-muted"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-slc-border">
                  <CopyButton
                    text={tags.map((t: string) => `#${t}`).join(" ")}
                    label="Copiar hashtags"
                    className="w-full justify-center"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
