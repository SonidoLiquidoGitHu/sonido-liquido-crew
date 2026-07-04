"use client";

import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Facebook,
  FileText,
  Image as ImageIcon,
  Info,
  Instagram,
  Link as LinkIcon,
  Loader2,
  Monitor,
  Music,
  Send,
  Share2,
  Smartphone,
  Sparkles,
  Twitter,
  Video,
  Youtube,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

// Spotify icon
function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
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
    features: [
      "Link sticker (10K+ seguidores)",
      "Música",
      "Encuestas",
      "Countdown sticker",
    ],
    uploadUrl: "https://www.instagram.com/",
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
  releaseId?: string;
  className?: string;
}

// Caption templates
const CAPTION_TEMPLATES = {
  presave: {
    short:
      "🔥 PRE-GUARDA AHORA ⬇️\n\n{title} por {artist}\nSale {date}\n\n🎧 {link}",
    medium:
      "🚨 ¡NUEVA MÚSICA! 🚨\n\n{title} por {artist}\n📅 {date}\n\n¡No te lo pierdas! Pre-guarda ahora y sé de los primeros en escucharlo 🎧\n\n🔗 Link en bio o ⬇️\n{link}\n\n{hashtags}",
    long: '🎵 ¡NUEVO LANZAMIENTO! 🎵\n\n{artist} presenta: "{title}"\n\n📅 Fecha de lanzamiento: {date}\n\n¡Pre-guarda ahora para no perderte el estreno! Al hacer pre-save, la música se guardará automáticamente en tu biblioteca el día del lanzamiento 💿\n\n🔗 Pre-save: {link}\n\n¡Comparte con alguien que necesita escuchar esto! 🔊\n\n{hashtags}',
  },
  release: {
    short: "🎵 YA DISPONIBLE 🎵\n\n{title} - {artist}\n\n🎧 {link}",
    medium:
      "🚀 ¡YA DISPONIBLE! 🚀\n\n{title} por {artist}\n\nEscúchalo ahora en todas las plataformas 🎧\n\n🔗 {link}\n\n{hashtags}",
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
  releaseId,
  className = "",
}: SocialPublisherProps) {
  const [selectedPlatform, setSelectedPlatform] =
    useState<string>("instagram-reels");
  const [captionType, setCaptionType] = useState<"short" | "medium" | "long">(
    "medium",
  );
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [customHashtags, setCustomHashtags] = useState(hashtags.join(" #"));

  // Auto-post state
  const [isAutoPosting, setIsAutoPosting] = useState(false);
  const [autoPostResult, setAutoPostResult] = useState<{
    success: boolean;
    message: string;
    fbPostUrl?: string;
    igPostUrl?: string;
  } | null>(null);

  // Reel post state
  const [isPostingReel, setIsPostingReel] = useState(false);
  const [reelPostResult, setReelPostResult] = useState<{
    success: boolean;
    message: string;
    igReelUrl?: string;
    fbReelUrl?: string;
  } | null>(null);

  // Token validation state
  const [tokenStatus, setTokenStatus] = useState<{
    checked: boolean;
    valid: boolean;
    message: string;
    guidance?: string;
    checking: boolean;
  }>({ checked: false, valid: false, message: "", checking: false });

  const platform = PLATFORMS.find((p) => p.id === selectedPlatform) as (typeof PLATFORMS)[number];

  // Generate caption
  const generateCaption = useCallback(() => {
    const template =
      CAPTION_TEMPLATES.presave[captionType] ||
      CAPTION_TEMPLATES.presave.medium;

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
  }, [
    releaseTitle,
    artistName,
    releaseDate,
    presaveUrl,
    captionType,
    customHashtags,
    hashtags,
  ]);

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

  // Helper: Safely parse JSON from API response, handling HTML error pages
  const safeParseJson = async (
    response: Response,
  ): Promise<Record<string, unknown>> => {
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (
      contentType.includes("application/json") ||
      text.trim().startsWith("{")
    ) {
      try {
        return JSON.parse(text);
      } catch {
        return {
          success: false,
          message: "Error al procesar la respuesta del servidor",
        };
      }
    }

    // Server returned HTML (Netlify error page, Next.js error page, etc.)
    console.error(
      "[SocialPublisher] Received non-JSON response:",
      text.substring(0, 200),
    );
    if (response.status === 502 || response.status === 504) {
      return {
        success: false,
        message:
          "El servidor está tardando demasiado. Intenta de nuevo en unos segundos.",
      };
    }
    if (response.status === 500) {
      return {
        success: false,
        message:
          "Error interno del servidor. Verifica la configuración de las credenciales Meta en /admin/social.",
      };
    }
    if (!response.ok) {
      return {
        success: false,
        message: `Error del servidor (${response.status}). Verifica que las credenciales Meta estén configuradas.`,
      };
    }
    return {
      success: false,
      message:
        "Respuesta inesperada del servidor. Verifica la configuración de credenciales.",
    };
  };

  // Auto-post to Facebook and Instagram
  // biome-ignore lint/correctness/useExhaustiveDependencies: stable function reference
  const handleAutoPost = useCallback(async () => {
    if (!coverImageUrl) return;
    setIsAutoPosting(true);
    setAutoPostResult(null);

    try {
      const caption = generateCaption();
      const response = await fetch("/api/admin/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "post-upcoming-release",
          imageUrl: coverImageUrl,
          caption,
          linkUrl: presaveUrl || undefined,
          releaseId: releaseId || undefined,
          platforms: ["facebook", "instagram"],
        }),
      });

      const data = await safeParseJson(response);

      if (data.success) {
        setAutoPostResult({
          success: true,
          message: (data.message as string) || "¡Publicación exitosa!",
          fbPostUrl: (data.results as Record<string, Record<string, string>>)
            ?.facebook?.postUrl,
          igPostUrl: (data.results as Record<string, Record<string, string>>)
            ?.instagram?.permalink,
        });
      } else {
        setAutoPostResult({
          success: false,
          message:
            (data.message as string) ||
            (data.error as string) ||
            "Error al publicar",
        });
      }
    } catch (err) {
      setAutoPostResult({
        success: false,
        message: err instanceof Error ? err.message : "Error de conexión",
      });
    } finally {
      setIsAutoPosting(false);
    }
  }, [coverImageUrl, presaveUrl, releaseId, generateCaption]);

  // Post as Reel to IG and/or FB
  // biome-ignore lint/correctness/useExhaustiveDependencies: stable function reference
  const handlePostReel = useCallback(async () => {
    if (!verticalVideoUrl) return;
    setIsPostingReel(true);
    setReelPostResult(null);

    try {
      // Get selected platforms
      const igCheckbox = document.getElementById(
        "reel-platform-ig",
      ) as HTMLInputElement;
      const fbCheckbox = document.getElementById(
        "reel-platform-fb",
      ) as HTMLInputElement;
      const platforms: string[] = [];
      if (igCheckbox?.checked) platforms.push("instagram");
      if (fbCheckbox?.checked) platforms.push("facebook");

      if (platforms.length === 0) {
        setReelPostResult({
          success: false,
          message: "Selecciona al menos una plataforma",
        });
        setIsPostingReel(false);
        return;
      }

      const caption = generateCaption();
      const response = await fetch("/api/admin/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "post-reel",
          videoUrl: verticalVideoUrl,
          caption,
          platforms,
          releaseId: releaseId || undefined,
          releaseTitle: releaseTitle || undefined,
        }),
      });

      const data = await safeParseJson(response);

      if (data.success) {
        setReelPostResult({
          success: true,
          message: (data.message as string) || "¡Reel publicado exitosamente!",
          igReelUrl: (data.results as Record<string, Record<string, string>>)
            ?.instagram?.permalink,
          fbReelUrl: (data.results as Record<string, Record<string, string>>)
            ?.facebook?.postUrl,
        });
      } else {
        setReelPostResult({
          success: false,
          message:
            (data.message as string) ||
            (data.error as string) ||
            "Error al publicar Reel",
        });
      }
    } catch (err) {
      setReelPostResult({
        success: false,
        message: err instanceof Error ? err.message : "Error de conexión",
      });
    } finally {
      setIsPostingReel(false);
    }
  }, [verticalVideoUrl, releaseId, releaseTitle, generateCaption]);

  // Validate Meta token for reel posting
  const handleValidateReelToken = useCallback(async () => {
    setTokenStatus({
      checked: false,
      valid: false,
      message: "",
      checking: true,
    });
    try {
      const response = await fetch("/api/admin/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate-reel-token" }),
      });
      const data = await safeParseJson(response);
      const result = data.data as Record<string, unknown>;
      if (data.success && result?.canPostReel) {
        setTokenStatus({
          checked: true,
          valid: true,
          message: (result.message as string) || "Token válido",
          checking: false,
        });
      } else {
        setTokenStatus({
          checked: true,
          valid: false,
          message:
            (result?.message as string) ||
            (data.message as string) ||
            "Token inválido",
          guidance: (result?.guidance as string) || undefined,
          checking: false,
        });
      }
    } catch {
      setTokenStatus({
        checked: true,
        valid: false,
        message: "Error al validar el token",
        checking: false,
      });
    }
  // biome-ignore lint/correctness/useExhaustiveDependencies: stable function reference
  }, [safeParseJson]);

  // Get recommended video for platform
  const getRecommendedVideo = useCallback(() => {
    const isVertical = platform.videoSpecs.dimensions.some((d) =>
      d.orientation.includes("9:16"),
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
              <p className="text-xs text-slc-muted">
                Especificaciones técnicas
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setExpandedPlatform(
                expandedPlatform === platform.id ? null : platform.id,
              )
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
              Video{" "}
              {recommendedVideo?.type === "vertical"
                ? "vertical"
                : "horizontal"}
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
                {type === "short"
                  ? "Corto"
                  : type === "medium"
                    ? "Medio"
                    : "Largo"}
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
          <Button
            variant="outline"
            onClick={copyLink}
            className="justify-start"
          >
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
            <a
              href={platform.uploadUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
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
              <a href={coverImageUrl} download target="_blank" rel="noreferrer">
                <ImageIcon className="w-4 h-4 mr-2" />
                Descargar portada
              </a>
            </Button>
          )}

          {recommendedVideo && (
            <Button variant="outline" asChild className="justify-start">
              <a
                href={recommendedVideo.url}
                download
                target="_blank"
                rel="noreferrer"
              >
                <Video className="w-4 h-4 mr-2" />
                Descargar video {recommendedVideo.type}
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Auto-post to Facebook & Instagram */}
      <div className="p-4 bg-slc-card rounded-xl border border-primary/30 space-y-4">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          <h4 className="font-oswald text-sm uppercase">
            Publicación automática
          </h4>
        </div>
        <p className="text-xs text-slc-muted">
          Publica la portada con el caption directamente en Facebook e Instagram
          con un clic. Se usará la portada como imagen y el caption generado
          arriba.
        </p>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleAutoPost}
            disabled={isAutoPosting || !coverImageUrl}
            className="flex-1"
          >
            {isAutoPosting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Publicar en Facebook e Instagram
              </>
            )}
          </Button>
        </div>

        {!coverImageUrl && (
          <p className="text-xs text-yellow-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Se requiere una portada para publicar automáticamente
          </p>
        )}

        {autoPostResult && (
          <div
            className={`p-3 rounded-lg text-sm ${
              autoPostResult.success
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}
          >
            <p className="font-medium mb-1">
              {autoPostResult.success
                ? "✓ Publicación exitosa"
                : "✗ Error al publicar"}
            </p>
            <p className="text-xs opacity-80">{autoPostResult.message}</p>
            {autoPostResult.success && (
              <div className="mt-2 flex flex-wrap gap-2">
                {autoPostResult.fbPostUrl && (
                  <a
                    href={autoPostResult.fbPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Facebook className="w-3 h-3" /> Ver en Facebook
                  </a>
                )}
                {autoPostResult.igPostUrl && (
                  <a
                    href={autoPostResult.igPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-pink-400 hover:underline flex items-center gap-1"
                  >
                    <Instagram className="w-3 h-3" /> Ver en Instagram
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post as Reel — Video auto-post to IG Reels + FB Reels */}
      <div className="p-4 bg-slc-card rounded-xl border border-pink-500/30 space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-pink-500" />
          <h4 className="font-oswald text-sm uppercase">Publicar como Reel</h4>
        </div>
        <p className="text-xs text-slc-muted">
          Publica el video vertical directamente como Reel en Instagram y
          Facebook. El video debe estar en formato MP4, vertical (9:16), máximo
          90 segundos. Se usará el caption generado arriba.
        </p>

        {verticalVideoUrl ? (
          <div className="space-y-3">
            {/* Video indicator */}
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Video className="w-5 h-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-400">
                  Video vertical disponible
                </p>
                <p className="text-xs text-slc-muted truncate max-w-[300px]">
                  {verticalVideoUrl}
                </p>
              </div>
              <Smartphone className="w-4 h-4 text-green-500" />
            </div>

            {/* Meta Token Validation */}
            <div className="p-3 bg-slc-dark border border-slc-border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Token de Meta API</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleValidateReelToken}
                  disabled={tokenStatus.checking}
                  className="text-xs"
                >
                  {tokenStatus.checking ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />{" "}
                      Validando...
                    </>
                  ) : tokenStatus.checked ? (
                    tokenStatus.valid ? (
                      <>
                        <Check className="w-3 h-3 mr-1 text-green-500" /> Válido
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 mr-1 text-red-500" />{" "}
                        Inválido
                      </>
                    )
                  ) : (
                    "Verificar token"
                  )}
                </Button>
              </div>
              {tokenStatus.checked && (
                <p
                  className={`text-xs ${tokenStatus.valid ? "text-green-400" : "text-red-400"}`}
                >
                  {tokenStatus.message}
                </p>
              )}
              {tokenStatus.checked &&
                !tokenStatus.valid &&
                tokenStatus.guidance && (
                  <p className="text-xs text-yellow-400">
                    {tokenStatus.guidance}
                  </p>
                )}
              {!tokenStatus.checked && !tokenStatus.checking && (
                <p className="text-xs text-slc-muted">
                  Verifica el token antes de publicar para evitar errores.
                </p>
              )}
            </div>

            {/* Platform selection for Reels */}
            <div className="flex gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  id="reel-platform-ig"
                  className="w-4 h-4 rounded border-slc-border bg-slc-dark text-pink-500 focus:ring-pink-500"
                />
                <span className="text-sm flex items-center gap-1">
                  <Instagram className="w-4 h-4 text-pink-500" />
                  Instagram Reels
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  id="reel-platform-fb"
                  className="w-4 h-4 rounded border-slc-border bg-slc-dark text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm flex items-center gap-1">
                  <Facebook className="w-4 h-4 text-blue-500" />
                  Facebook Reels
                </span>
              </label>
            </div>

            {/* Post button */}
            <Button
              onClick={handlePostReel}
              disabled={isPostingReel}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white"
            >
              {isPostingReel ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publicando Reel... (puede tardar hasta 30s)
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4 mr-2" />
                  Publicar como Reel
                </>
              )}
            </Button>

            {/* Reel post result */}
            {reelPostResult && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  reelPostResult.success
                    ? "bg-green-500/10 border border-green-500/20 text-green-400"
                    : "bg-red-500/10 border border-red-500/20 text-red-400"
                }`}
              >
                <p className="font-medium mb-1">
                  {reelPostResult.success
                    ? "✓ Reel publicado"
                    : "✗ Error al publicar Reel"}
                </p>
                <p className="text-xs opacity-80">{reelPostResult.message}</p>
                {reelPostResult.success && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {reelPostResult.igReelUrl && (
                      <a
                        href={reelPostResult.igReelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-pink-400 hover:underline flex items-center gap-1"
                      >
                        <Instagram className="w-3 h-3" /> Ver Reel en Instagram
                      </a>
                    )}
                    {reelPostResult.fbReelUrl && (
                      <a
                        href={reelPostResult.fbReelUrl}
                        target="blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Facebook className="w-3 h-3" /> Ver Reel en Facebook
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              No hay video vertical disponible. Sube un video vertical (MP4,
              9:16) en la pestaña "Videos" para poder publicar como Reel.
            </p>
          </div>
        )}
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
