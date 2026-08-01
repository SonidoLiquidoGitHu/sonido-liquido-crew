"use client";

import { PressToolkit } from "@/components/press/PressToolkit";
import { CountdownTimer } from "@/components/public/CountdownTimer";
import { Button } from "@/components/ui/button";
import {
  CompactAudioPlayer,
  CompactTracklist,
} from "@/components/ui/compact-audio-player";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Copy,
  Disc,
  Download,
  ExternalLink,
  Eye,
  FileDown,
  FileText,
  Globe,
  Hash,
  Image as ImageIcon,
  Loader2,
  Mail,
  Music,
  Newspaper,
  Package,
  Phone,
  Quote,
  Share2,
  Users,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

interface AudioTrack {
  title: string;
  artist?: string;
  url: string;
  duration: string;
  trackNumber: number;
}

interface AttachedPressKit {
  id: string;
  title: string;
  downloadUrl: string;
  artistName: string | null;
  fileSize: number | null;
}

interface MediaRelease {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  category: string;
  mainArtistId: string | null;
  mainArtistName: string | null;
  resolvedArtistName: string | null;
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
  attachedPressKitIds?: string | null;
  attachedPressKits?: AttachedPressKit[];
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
function CopyButton({
  text,
  label,
  className,
}: { text: string; label: string; className?: string }) {
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

export default function MediaReleasePage({
  params,
}: { params: Promise<{ slug: string }> }) {
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

    async function fetchReleaseData() {
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
    }
    fetchReleaseData();
  }, [slug]);

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
      const previewParam = isPreview ? "?preview=true" : "";
      const res = await fetch(
        `/api/media-releases/${slug}/epk-pdf${previewParam}`,
      );
      if (!res.ok) {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Error al generar PDF" }));
        throw new Error(errorData.error || "Error al generar PDF");
      }
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "epk.pdf";
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
        <h1 className="text-2xl font-oswald uppercase mb-2">
          Comunicado No Encontrado
        </h1>
        <p className="text-slc-muted mb-6">
          {error || "Este comunicado no existe"}
        </p>
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
  const galleryImages = release.galleryImages
    ? JSON.parse(release.galleryImages)
    : [];
  const externalLinks = release.externalLinks
    ? JSON.parse(release.externalLinks)
    : [];
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
      return acc + Number.parseInt(parts[0]) * 60 + Number.parseInt(parts[1]);
    }
    return acc;
  }, 0);

  const formatTotalDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Check if embargo is active
  const isEmbargoed =
    release.embargoDate && new Date(release.embargoDate) > new Date();

  return (
    <div className="min-h-screen bg-slc-black">
      {/* Print Header - Only visible when printing */}
      <div className="print-only print-header hidden">
        <p className="text-sm text-slc-muted mb-2">COMUNICADO DE PRENSA</p>
        <h1 className="text-2xl font-bold">{release.title}</h1>
        {release.subtitle && (
          <p className="text-lg text-primary">{release.subtitle}</p>
        )}
        <p className="text-sm mt-2">
          {new Date(release.publishDate).toLocaleDateString("es-MX", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
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
              {new Date(release.embargoDate as string).toLocaleDateString("es-MX", {
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

          {/* Banner Image — full width at top, if available */}
          {release.bannerImageUrl && (
            <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden bg-slc-card mb-6">
              <Image
                src={release.bannerImageUrl}
                alt={release.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 800px"
              />
            </div>
          )}

          {/* Title & Meta */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Cover — clickable to download full-res */}
            {release.coverImageUrl && (
              <a
                href={release.coverImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-32 h-32 lg:w-40 lg:h-40 flex-shrink-0 rounded-lg overflow-hidden bg-slc-card group relative block"
                title="Click para descargar imagen HD"
              >
                <Image
                  src={release.coverImageUrl}
                  alt={release.title}
                  width={160}
                  height={160}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <Download className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </a>
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
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {release.resolvedArtistName ||
                    release.mainArtistName ||
                    "Sonido Líquido Crew"}
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

      {/* Countdown Timer */}
      {release.releaseDate && new Date(release.releaseDate) > new Date() && (
        <div className="border-b border-slc-border bg-gradient-to-b from-primary/5 to-transparent">
          <div className="container mx-auto px-4 py-8 text-center">
            <p className="text-sm text-slc-muted uppercase tracking-wider mb-4">
              Faltan para el lanzamiento
            </p>
            <div className="flex justify-center">
              <CountdownTimer targetDate={release.releaseDate} />
            </div>
          </div>
        </div>
      )}

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
                  showDownload={false}
                  showCopyLink={false}
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
                  showDownload={false}
                  showCopyLink={false}
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
                    src={`https://open.spotify.com/embed/track/${release.spotifyEmbedUrl.split("/").pop()?.split("?")[0]}`}
                    width="100%"
                    height="152"
                    allowFullScreen
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="rounded-lg"
                    title="Reproductor de Spotify"
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
                    title="Video de YouTube"
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
                  <CopyButton
                    text={release.content.replace(/[*#_]/g, "")}
                    label="Copiar texto"
                  />
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
                  <span className="text-xs text-slc-muted">
                    Click para ver/descargar
                  </span>
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
                      <Image
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
            {/* EPK PDF Download */}
            <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl p-5">
              <h3 className="font-oswald text-sm uppercase mb-3 text-primary flex items-center gap-2">
                <FileDown className="w-4 h-4" />
                EPK en PDF
              </h3>
              <p className="text-xs text-slc-muted mb-4">
                Electronic Press Kit con info del lanzamiento, biografia del
                artista, estadisticas de streaming, citas de prensa y contactos.
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
                    Descargar EPK PDF
                  </>
                )}
              </Button>
            </div>

            {/* Press Toolkit - All the new features */}
            <PressToolkit
              release={release as Parameters<typeof PressToolkit>[0]["release"]}
              pageUrl={
                typeof window !== "undefined"
                  ? window.location.href
                  : `https://sonidoliquido.com/prensa/comunicados/${release.slug}`
              }
              artistName={
                release.resolvedArtistName ||
                release.mainArtistName ||
                "Sonido Líquido Crew"
              }
            />

            {/* Attached Press Kits from Roster Artists */}
            {release.attachedPressKits &&
              release.attachedPressKits.length > 0 && (
                <div className="bg-slc-card border border-slc-border rounded-xl p-5">
                  <h3 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    Press Kits de Artistas
                  </h3>
                  <p className="text-xs text-slc-muted mb-3">
                    {release.attachedPressKits.length} press kit
                    {release.attachedPressKits.length !== 1 ? "s" : ""}{" "}
                    disponible
                    {release.attachedPressKits.length !== 1 ? "s" : ""} para
                    descarga
                  </p>
                  {(() => {
                    // Group by artist
                    const grouped: Record<
                      string,
                      { artistName: string; kits: AttachedPressKit[] }
                    > = {};
                    const ungrouped: AttachedPressKit[] = [];
                    for (const kit of release.attachedPressKits as AttachedPressKit[]) {
                      if (kit.artistName) {
                        if (!grouped[kit.artistName]) {
                          grouped[kit.artistName] = {
                            artistName: kit.artistName,
                            kits: [],
                          };
                        }
                        grouped[kit.artistName].kits.push(kit);
                      } else {
                        ungrouped.push(kit);
                      }
                    }
                    return (
                      <div className="space-y-3">
                        {Object.entries(grouped).map(([artistKey, group]) => (
                          <div key={artistKey}>
                            <div className="flex items-center gap-2 text-xs text-slc-muted uppercase tracking-wider mb-1.5">
                              <Users className="w-3 h-3" />
                              <span className="font-medium">
                                {group.artistName}
                              </span>
                            </div>
                            <div className="space-y-1.5 ml-5">
                              {group.kits.map((kit) => (
                                <a
                                  key={kit.id}
                                  href={kit.downloadUrl}
                                  download
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm bg-slc-dark hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-colors group"
                                >
                                  <FileDown className="w-4 h-4 text-primary flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <span className="truncate block group-hover:text-primary transition-colors">
                                      {kit.title}
                                    </span>
                                  </div>
                                  {kit.fileSize && (
                                    <span className="text-xs text-slc-muted flex-shrink-0">
                                      {(kit.fileSize / 1024 / 1024).toFixed(1)}{" "}
                                      MB
                                    </span>
                                  )}
                                  <Download className="w-3.5 h-3.5 text-slc-muted group-hover:text-primary flex-shrink-0 transition-colors" />
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}
                        {ungrouped.length > 0 && (
                          <div>
                            {Object.keys(grouped).length > 0 && (
                              <div className="flex items-center gap-2 text-xs text-slc-muted uppercase tracking-wider mb-1.5">
                                <Package className="w-3 h-3" />
                                <span className="font-medium">General</span>
                              </div>
                            )}
                            <div
                              className={
                                Object.keys(grouped).length > 0
                                  ? "space-y-1.5 ml-5"
                                  : "space-y-1.5"
                              }
                            >
                              {ungrouped.map((kit) => (
                                <a
                                  key={kit.id}
                                  href={kit.downloadUrl}
                                  download
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm bg-slc-dark hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-colors group"
                                >
                                  <FileDown className="w-4 h-4 text-primary flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <span className="truncate block group-hover:text-primary transition-colors">
                                      {kit.title}
                                    </span>
                                  </div>
                                  {kit.fileSize && (
                                    <span className="text-xs text-slc-muted flex-shrink-0">
                                      {(kit.fileSize / 1024 / 1024).toFixed(1)}{" "}
                                      MB
                                    </span>
                                  )}
                                  <Download className="w-3.5 h-3.5 text-slc-muted group-hover:text-primary flex-shrink-0 transition-colors" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

            {/* Downloads */}
            {(release.coverImageUrl ||
              release.bannerImageUrl ||
              release.pressKitUrl ||
              release.highResImagesUrl ||
              release.linerNotesUrl) && (
              <div className="bg-slc-card border border-slc-border rounded-xl p-5">
                <h3 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
                  <Download className="w-4 h-4 text-primary" />
                  Archivos
                </h3>
                <div className="space-y-2">
                  {release.coverImageUrl && (
                    <a
                      href={release.coverImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg text-sm bg-slc-dark hover:bg-primary/10 transition-colors group"
                    >
                      <ImageIcon className="w-4 h-4 text-primary" />
                      <span className="flex-1">Portada (HD)</span>
                      <Download className="w-3 h-3 text-slc-muted group-hover:text-primary" />
                    </a>
                  )}
                  {release.bannerImageUrl && (
                    <a
                      href={release.bannerImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg text-sm bg-slc-dark hover:bg-primary/10 transition-colors group"
                    >
                      <ImageIcon className="w-4 h-4 text-primary" />
                      <span className="flex-1">Banner (HD)</span>
                      <Download className="w-3 h-3 text-slc-muted group-hover:text-primary" />
                    </a>
                  )}
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
            {(release.releaseDate ||
              release.eventDate ||
              release.embargoDate) && (
              <div className="bg-slc-card border border-slc-border rounded-xl p-5">
                <h3 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Fechas Clave
                </h3>
                <div className="space-y-3 text-sm">
                  {release.embargoDate && (
                    <div className={isEmbargoed ? "text-red-400" : ""}>
                      <p className="text-xs text-slc-muted uppercase">
                        Embargo
                      </p>
                      <p className="font-medium">
                        {new Date(release.embargoDate).toLocaleDateString(
                          "es-MX",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  )}
                  {release.releaseDate && (
                    <div>
                      <p className="text-xs text-slc-muted uppercase">
                        Lanzamiento
                      </p>
                      <p className="font-medium">
                        {new Date(release.releaseDate).toLocaleDateString(
                          "es-MX",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  )}
                  {release.eventDate && (
                    <div>
                      <p className="text-xs text-slc-muted uppercase">Evento</p>
                      <p className="font-medium">
                        {new Date(release.eventDate).toLocaleDateString(
                          "es-MX",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
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
                  {externalLinks.map(
                    (link: { label: string; url: string }, index: number) => (
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
                    ),
                  )}
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
