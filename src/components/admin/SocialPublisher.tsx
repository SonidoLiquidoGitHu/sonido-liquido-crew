"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Instagram,
  Youtube,
  Twitter,
  Facebook,
  Download,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Share2,
  Smartphone,
  Monitor,
  Image as ImageIcon,
  Video,
  FileText,
  Sparkles,
  Calendar,
  Link as LinkIcon,
  Music,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// TikTok icon
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

// Spotify icon
function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}

interface Platform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  videoSpecs: {
    formats: string[];
    maxDuration: number; // seconds
    maxSize: number; // MB
    dimensions: { width: number; height: number; orientation: string }[];
  };
  imageSpecs: {
    formats: string[];
    maxSize: number; // MB
    dimensions: { width: number; height: number; ratio: string }[];
  };
  captionLimit: number;
  hashtagsLimit: number;
  features: string[];
  uploadUrl?: string;
}

const PLATFORMS: Platform[] = [
  {
    id: "instagram-reels",
    name: "Instagram Reels",
    icon: <Instagram className="w-5 h-5" />,
    color: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400",
    videoSpecs: {
      formats: ["MP4", "MOV"],
      maxDuration: 90,
      maxSize: 4000,
      dimensions: [
        { width: 1080, height: 1920, orientation: "9:16 (Vertical)" },
      ],
    },
    imageSpecs: {
      formats: ["JPG", "PNG"],
      maxSize: 30,
      dimensions: [
        { width: 1080, height: 1920, ratio: "9:16" },
        { width: 1080, height: 1080, ratio: "1:1" },
      ],
    },
    captionLimit: 2200,
    hashtagsLimit: 30,
    features: ["Música de fondo", "Filtros AR", "Stickers", "Texto animado"],
    uploadUrl: "https://www.instagram.com/",
  },
  {
    id: "instagram-stories",
    name: "Instagram Stories",
    icon: <Instagram className="w-5 h-5" />,
    color: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400",
    videoSpecs: {
      formats: ["MP4", "MOV"],
      maxDuration: 60,
      maxSize: 4000,
      dimensions: [
        { width: 1080, height: 1920, orientation: "9:16 (Vertical)" },
      ],
    },
    imageSpecs: {
      formats: ["JPG", "PNG"],
      maxSize: 30,
      dimensions: [{ width: 1080, height: 1920, ratio: "9:16" }],
    },
    captionLimit: 0,
    hashtagsLimit: 10,
    features: ["Link sticker (10K+ seguidores)", "Música", "Encuestas", "Countdown sticker"],
    uploadUrl: "https://www.instagram.com/",
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: <TikTokIcon className="w-5 h-5" />,
    color: "bg-black",
    videoSpecs: {
      formats: ["MP4", "MOV", "WebM"],
      maxDuration: 180,
      maxSize: 287,
      dimensions: [
        { width: 1080, height: 1920, orientation: "9:16 (Vertical)" },
      ],
    },
    imageSpecs: {
      formats: ["JPG", "PNG"],
      maxSize: 20,
      dimensions: [{ width: 1080, height: 1920, ratio: "9:16" }],
    },
    captionLimit: 2200,
    hashtagsLimit: 100,
    features: ["Sonidos virales", "Duets", "Stitch", "Efectos"],
    uploadUrl: "https://www.tiktok.com/upload",
  },
  {
    id: "youtube-shorts",
    name: "YouTube Shorts",
    icon: <Youtube className="w-5 h-5" />,
    color: "bg-red-600",
    videoSpecs: {
      formats: ["MP4", "MOV", "WebM"],
      maxDuration: 60,
      maxSize: 10000,
      dimensions: [
        { width: 1080, height: 1920, orientation: "9:16 (Vertical)" },
      ],
    },
    imageSpecs: {
      formats: ["JPG", "PNG"],
      maxSize: 2,
      dimensions: [{ width: 1280, height: 720, ratio: "16:9" }],
    },
    captionLimit: 100,
    hashtagsLimit: 15,
    features: ["Shorts monetización", "Audio de Shorts", "Remix"],
    uploadUrl: "https://studio.youtube.com/",
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    icon: <Twitter className="w-5 h-5" />,
    color: "bg-black",
    videoSpecs: {
      formats: ["MP4"],
      maxDuration: 140,
      maxSize: 512,
      dimensions: [
        { width: 1920, height: 1080, orientation: "16:9 (Horizontal)" },
        { width: 1080, height: 1080, orientation: "1:1 (Cuadrado)" },
      ],
    },
    imageSpecs: {
      formats: ["JPG", "PNG", "GIF"],
      maxSize: 5,
      dimensions: [
        { width: 1200, height: 675, ratio: "16:9" },
        { width: 1080, height: 1080, ratio: "1:1" },
      ],
    },
    captionLimit: 280,
    hashtagsLimit: 5,
    features: ["Cards", "Threads", "Spaces link"],
    uploadUrl: "https://twitter.com/compose/tweet",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: <Facebook className="w-5 h-5" />,
    color: "bg-blue-600",
    videoSpecs: {
      formats: ["MP4", "MOV"],
      maxDuration: 240,
      maxSize: 4000,
      dimensions: [
        { width: 1080, height: 1920, orientation: "9:16 (Vertical - Reels)" },
        { width: 1280, height: 720, orientation: "16:9 (Horizontal)" },
      ],
    },
    imageSpecs: {
      formats: ["JPG", "PNG"],
      maxSize: 30,
      dimensions: [
        { width: 1200, height: 630, ratio: "1.91:1" },
        { width: 1080, height: 1080, ratio: "1:1" },
      ],
    },
    captionLimit: 63206,
    hashtagsLimit: 30,
    features: ["Facebook Reels", "Stories", "Events"],
    uploadUrl: "https://www.facebook.com/",
  },
];

interface SocialPublisherProps {
  releaseTitle: string;
  artistName: string;
  releaseDate?: Date;
  presaveUrl?: string;
  coverImageUrl?: string;
  videoUrl?: string;
  verticalVideoUrl?: string;
  audioPreviewUrl?: string;
  hashtags?: string[];
  className?: string;
}

// Caption templates
const CAPTION_TEMPLATES = {
  presave: {
    short: "🔥 PRE-SAVE NOW ⬇️\n\n{title} by {artist}\nOut {date}\n\n🎧 {link}",
    medium: "🚨 NEW MUSIC ALERT 🚨\n\n{title} by {artist}\n📅 {date}\n\n¡No te lo pierdas! Pre-save ahora y sé de los primeros en escucharlo 🎧\n\n🔗 Link en bio o ⬇️\n{link}\n\n{hashtags}",
    long: "🎵 ¡NUEVO LANZAMIENTO! 🎵\n\n{artist} presenta: \"{title}\"\n\n📅 Fecha de lanzamiento: {date}\n\n¡Pre-guarda ahora para no perderte el estreno! Al hacer pre-save, la música se guardará automáticamente en tu biblioteca el día del lanzamiento 💿\n\n🔗 Pre-save: {link}\n\n¡Comparte con alguien que necesita escuchar esto! 🔊\n\n{hashtags}",
  },
  release: {
    short: "🎵 OUT NOW 🎵\n\n{title} - {artist}\n\n🎧 {link}",
    medium: "🚀 ¡YA DISPONIBLE! 🚀\n\n{title} by {artist}\n\nEscúchalo ahora en todas las plataformas 🎧\n\n🔗 {link}\n\n{hashtags}",
  },
};

export function SocialPublisher({
  releaseTitle,
  artistName,
  releaseDate,
  presaveUrl,
  coverImageUrl,
  videoUrl,
  verticalVideoUrl,
  audioPreviewUrl,
  hashtags = ["nuevamusica", "presave", "musica"],
  className = "",
}: SocialPublisherProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("instagram-reels");
  const [captionType, setCaptionType] = useState<"short" | "medium" | "long">("medium");
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [customHashtags, setCustomHashtags] = useState(hashtags.join(" #"));

  const platform = PLATFORMS.find((p) => p.id === selectedPlatform)!;

  // Generate caption
  const generateCaption = useCallback(() => {
    const template = CAPTION_TEMPLATES.presave[captionType] || CAPTION_TEMPLATES.presave.medium;

    const formattedDate = releaseDate
      ? releaseDate.toLocaleDateString("es-MX", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "Próximamente";

    const formattedHashtags = customHashtags
      ? `#${customHashtags.replace(/\s+/g, " #").replace(/#+/g, "#")}`
      : hashtags.map((h) => `#${h}`).join(" ");

    return template
      .replace("{title}", releaseTitle)
      .replace("{artist}", artistName)
      .replace("{date}", formattedDate)
      .replace("{link}", presaveUrl || "[LINK]")
      .replace("{hashtags}", formattedHashtags);
  }, [releaseTitle, artistName, releaseDate, presaveUrl, captionType, customHashtags, hashtags]);

  // Copy caption
  const copyCaption = useCallback(async () => {
    const caption = generateCaption();
    await navigator.clipboard.writeText(caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  }, [generateCaption]);

  // Copy link
  const copyLink = useCallback(async () => {
    if (!presaveUrl) return;
    await navigator.clipboard.writeText(presaveUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [presaveUrl]);

  // Get recommended video for platform
  const getRecommendedVideo = useCallback(() => {
    const isVertical = platform.videoSpecs.dimensions.some(
      (d) => d.orientation.includes("9:16")
    );

    if (isVertical && verticalVideoUrl) {
      return { url: verticalVideoUrl, type: "vertical" };
    }
    if (!isVertical && videoUrl) {
      return { url: videoUrl, type: "horizontal" };
    }
    return verticalVideoUrl
      ? { url: verticalVideoUrl, type: "vertical" }
      : videoUrl
      ? { url: videoUrl, type: "horizontal" }
      : null;
  }, [platform, videoUrl, verticalVideoUrl]);

  const recommendedVideo = getRecommendedVideo();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h3 className="font-oswald text-xl uppercase flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" />
          Publicar en Redes Sociales
        </h3>
        <p className="text-sm text-slc-muted mt-1">
          Descarga contenido optimizado y copias para cada plataforma
        </p>
      </div>

      {/* Platform selector */}
      <div>
        <label className="block text-sm text-slc-muted mb-2">Plataforma</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPlatform(p.id)}
              className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                selectedPlatform === p.id
                  ? "bg-primary/10 border-primary"
                  : "bg-slc-card border-slc-border hover:border-primary/50"
              }`}
            >
              <div className={`p-1.5 rounded-lg ${p.color} text-white`}>
                {p.icon}
              </div>
              <span className="text-sm font-medium">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Platform specs */}
      <div className="bg-slc-dark border border-slc-border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${platform.color} text-white`}>
              {platform.icon}
            </div>
            <div>
              <h4 className="font-oswald text-lg">{platform.name}</h4>
              <p className="text-xs text-slc-muted">Especificaciones técnicas</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setExpandedPlatform(expandedPlatform === platform.id ? null : platform.id)
            }
          >
            {expandedPlatform === platform.id ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>

        {expandedPlatform === platform.id && (
          <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-slc-border">
            {/* Video specs */}
            <div>
              <h5 className="font-oswald text-sm uppercase mb-2 flex items-center gap-2">
                <Video className="w-4 h-4 text-red-500" />
                Video
              </h5>
              <ul className="text-xs text-slc-muted space-y-1">
                <li>Formatos: {platform.videoSpecs.formats.join(", ")}</li>
                <li>Duración máx: {platform.videoSpecs.maxDuration}s</li>
                <li>Tamaño máx: {platform.videoSpecs.maxSize}MB</li>
                <li>
                  Resolución:{" "}
                  {platform.videoSpecs.dimensions
                    .map((d) => `${d.width}x${d.height}`)
                    .join(", ")}
                </li>
              </ul>
            </div>

            {/* Image specs */}
            <div>
              <h5 className="font-oswald text-sm uppercase mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-green-500" />
                Imagen
              </h5>
              <ul className="text-xs text-slc-muted space-y-1">
                <li>Formatos: {platform.imageSpecs.formats.join(", ")}</li>
                <li>Tamaño máx: {platform.imageSpecs.maxSize}MB</li>
                <li>
                  Resolución:{" "}
                  {platform.imageSpecs.dimensions
                    .map((d) => `${d.width}x${d.height} (${d.ratio})`)
                    .join(", ")}
                </li>
              </ul>
            </div>

            {/* Caption specs */}
            <div>
              <h5 className="font-oswald text-sm uppercase mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Caption
              </h5>
              <ul className="text-xs text-slc-muted space-y-1">
                <li>Caracteres: {platform.captionLimit || "N/A"}</li>
                <li>Hashtags: máx {platform.hashtagsLimit}</li>
              </ul>
            </div>

            {/* Features */}
            <div>
              <h5 className="font-oswald text-sm uppercase mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                Features
              </h5>
              <ul className="text-xs text-slc-muted space-y-1">
                {platform.features.map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Content availability */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div
          className={`p-3 rounded-xl border ${
            coverImageUrl
              ? "bg-green-500/10 border-green-500/20"
              : "bg-slc-card border-slc-border"
          }`}
        >
          <div className="flex items-center gap-2">
            <ImageIcon
              className={`w-4 h-4 ${coverImageUrl ? "text-green-500" : "text-slc-muted"}`}
            />
            <span className="text-sm">Portada</span>
            {coverImageUrl ? (
              <Check className="w-4 h-4 text-green-500 ml-auto" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-500 ml-auto" />
            )}
          </div>
        </div>

        <div
          className={`p-3 rounded-xl border ${
            recommendedVideo
              ? "bg-green-500/10 border-green-500/20"
              : "bg-slc-card border-slc-border"
          }`}
        >
          <div className="flex items-center gap-2">
            <Video
              className={`w-4 h-4 ${recommendedVideo ? "text-green-500" : "text-slc-muted"}`}
            />
            <span className="text-sm">
              Video {recommendedVideo?.type === "vertical" ? "vertical" : "horizontal"}
            </span>
            {recommendedVideo ? (
              <Check className="w-4 h-4 text-green-500 ml-auto" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-500 ml-auto" />
            )}
          </div>
        </div>

        <div
          className={`p-3 rounded-xl border ${
            audioPreviewUrl
              ? "bg-green-500/10 border-green-500/20"
              : "bg-slc-card border-slc-border"
          }`}
        >
          <div className="flex items-center gap-2">
            <Music
              className={`w-4 h-4 ${audioPreviewUrl ? "text-green-500" : "text-slc-muted"}`}
            />
            <span className="text-sm">Audio Preview</span>
            {audioPreviewUrl ? (
              <Check className="w-4 h-4 text-green-500 ml-auto" />
            ) : (
              <Info className="w-4 h-4 text-slc-muted ml-auto" />
            )}
          </div>
        </div>
      </div>

      {/* Caption generator */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm text-slc-muted">Caption</label>
          <div className="flex gap-1">
            {(["short", "medium", "long"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setCaptionType(type)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  captionType === type
                    ? "bg-primary text-white"
                    : "bg-slc-card text-slc-muted hover:text-white"
                }`}
              >
                {type === "short" ? "Corto" : type === "medium" ? "Medio" : "Largo"}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <textarea
            value={generateCaption()}
            readOnly
            rows={8}
            className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-xl text-sm resize-none"
          />
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2"
            onClick={copyCaption}
          >
            {copiedCaption ? (
              <>
                <Check className="w-4 h-4 mr-1 text-green-500" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                Copiar
              </>
            )}
          </Button>
        </div>

        {/* Hashtags editor */}
        <div>
          <label className="block text-sm text-slc-muted mb-2">
            Hashtags (sin #, separados por espacio)
          </label>
          <input
            type="text"
            value={customHashtags}
            onChange={(e) => setCustomHashtags(e.target.value)}
            placeholder="nuevamusica presave hiphop"
            className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg text-sm"
          />
          <p className="text-xs text-slc-muted mt-1">
            Máximo {platform.hashtagsLimit} hashtags para {platform.name}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        {presaveUrl && (
          <Button variant="outline" onClick={copyLink} className="justify-start">
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-500" />
                Link copiado
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4 mr-2" />
                Copiar link de presave
              </>
            )}
          </Button>
        )}

        {platform.uploadUrl && (
          <Button variant="outline" asChild className="justify-start">
            <a href={platform.uploadUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir {platform.name}
            </a>
          </Button>
        )}
      </div>

      {/* Download buttons */}
      <div className="space-y-3">
        <label className="text-sm text-slc-muted">Descargar contenido</label>

        <div className="grid gap-2 sm:grid-cols-2">
          {coverImageUrl && (
            <Button variant="outline" asChild className="justify-start">
              <a href={coverImageUrl} download target="_blank">
                <ImageIcon className="w-4 h-4 mr-2" />
                Descargar portada
              </a>
            </Button>
          )}

          {recommendedVideo && (
            <Button variant="outline" asChild className="justify-start">
              <a href={recommendedVideo.url} download target="_blank">
                <Video className="w-4 h-4 mr-2" />
                Descargar video {recommendedVideo.type}
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Publishing checklist */}
      <div className="p-4 bg-slc-card rounded-xl border border-slc-border">
        <h4 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Checklist de publicación
        </h4>
        <ul className="text-sm space-y-2">
          <li className="flex items-start gap-2">
            <div className="w-5 h-5 rounded border border-slc-border mt-0.5" />
            <span>Verificar que el video cumple con las especificaciones</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-5 h-5 rounded border border-slc-border mt-0.5" />
            <span>Agregar música/audio desde la biblioteca de la app</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-5 h-5 rounded border border-slc-border mt-0.5" />
            <span>Pegar caption con hashtags</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-5 h-5 rounded border border-slc-border mt-0.5" />
            <span>Agregar link de presave (Link sticker en Stories)</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-5 h-5 rounded border border-slc-border mt-0.5" />
            <span>Programar publicación para hora óptima (7-9pm)</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default SocialPublisher;
