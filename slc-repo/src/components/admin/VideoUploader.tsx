"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Youtube,
  Instagram,
  Video,
  Play,
  Pause,
  X,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Smartphone,
  Monitor,
  Link as LinkIcon,
  Cloud,
  Music,
  Sparkles,
} from "lucide-react";
import { uploadToDropboxDirect, type DropboxUploadProgress } from "@/lib/clients/dropbox-browser";

// TikTok icon (custom)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

type VideoSource = "upload" | "youtube" | "social" | "url";
type VideoOrientation = "horizontal" | "vertical" | "square" | "unknown";

interface VideoInfo {
  source: VideoSource;
  url: string;
  thumbnailUrl?: string;
  title?: string;
  platform?: string;
  orientation: VideoOrientation;
  duration?: number;
  embedUrl?: string;
}

interface VideoUploaderProps {
  value?: VideoInfo | null;
  onChange: (video: VideoInfo | null) => void;
  label?: string;
  description?: string;
  orientation?: "horizontal" | "vertical" | "any";
  maxSize?: number; // MB
  folder?: string;
  className?: string;
}

// Extract video info from various URL formats
function parseVideoUrl(url: string): Partial<VideoInfo> | null {
  if (!url) return null;

  const trimmedUrl = url.trim();

  // YouTube patterns
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of youtubePatterns) {
    const match = trimmedUrl.match(pattern);
    if (match) {
      const videoId = match[1];
      const isShort = trimmedUrl.includes("/shorts/");
      return {
        source: "youtube",
        url: trimmedUrl,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        platform: "YouTube",
        orientation: isShort ? "vertical" : "horizontal",
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
      };
    }
  }

  // Instagram Reel patterns
  const instagramPatterns = [
    /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
    /instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
    /instagram\.com\/tv\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of instagramPatterns) {
    const match = trimmedUrl.match(pattern);
    if (match) {
      const isReel = trimmedUrl.includes("/reel/");
      return {
        source: "social",
        url: trimmedUrl,
        platform: "Instagram",
        orientation: isReel ? "vertical" : "unknown",
      };
    }
  }

  // TikTok patterns
  const tiktokPatterns = [
    /tiktok\.com\/@[^/]+\/video\/(\d+)/,
    /vm\.tiktok\.com\/([a-zA-Z0-9]+)/,
    /tiktok\.com\/t\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of tiktokPatterns) {
    if (pattern.test(trimmedUrl)) {
      return {
        source: "social",
        url: trimmedUrl,
        platform: "TikTok",
        orientation: "vertical",
      };
    }
  }

  // Dropbox/direct video URLs
  if (trimmedUrl.includes("dropbox") ||
      trimmedUrl.match(/\.(mp4|webm|mov|avi|mkv)(\?|$)/i)) {
    return {
      source: "upload",
      url: trimmedUrl,
      platform: "Video directo",
      orientation: "unknown",
    };
  }

  // Generic URL
  return {
    source: "url",
    url: trimmedUrl,
    platform: "Enlace",
    orientation: "unknown",
  };
}

// Get platform icon
function PlatformIcon({ platform, className }: { platform?: string; className?: string }) {
  switch (platform?.toLowerCase()) {
    case "youtube":
      return <Youtube className={className} />;
    case "instagram":
      return <Instagram className={className} />;
    case "tiktok":
      return <TikTokIcon className={className} />;
    default:
      return <Video className={className} />;
  }
}

// Get orientation icon
function OrientationIcon({ orientation, className }: { orientation: VideoOrientation; className?: string }) {
  switch (orientation) {
    case "vertical":
      return <Smartphone className={className} />;
    case "horizontal":
      return <Monitor className={className} />;
    default:
      return <Video className={className} />;
  }
}

export function VideoUploader({
  value,
  onChange,
  label = "Video",
  description,
  orientation = "any",
  maxSize = 500, // 500MB default for videos
  folder = "/videos",
  className = "",
}: VideoUploaderProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "url">("url");
  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle URL paste/input
  const handleUrlSubmit = useCallback(() => {
    if (!urlInput.trim()) return;

    setError(null);
    const parsed = parseVideoUrl(urlInput);

    if (!parsed) {
      setError("URL no reconocida. Prueba con YouTube, Instagram, TikTok o un enlace directo.");
      return;
    }

    // Check orientation if required
    if (orientation !== "any" && parsed.orientation !== "unknown" && parsed.orientation !== orientation) {
      const expected = orientation === "horizontal" ? "horizontal (16:9)" : "vertical (9:16)";
      setError(`Este video parece ser ${parsed.orientation}. Se esperaba un video ${expected}.`);
      // Still allow it but show warning
    }

    onChange({
      source: parsed.source || "url",
      url: parsed.url || urlInput,
      thumbnailUrl: parsed.thumbnailUrl,
      platform: parsed.platform,
      orientation: parsed.orientation || "unknown",
      embedUrl: parsed.embedUrl,
    });

    setUrlInput("");
  }, [urlInput, orientation, onChange]);

  // Handle file upload - Using DIRECT browser upload to bypass serverless timeout
  const handleFileUpload = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("video/")) {
      setError("Solo se permiten archivos de video");
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`El archivo excede el límite de ${maxSize}MB`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("Preparando video...");
    setError(null);

    try {
      // Detect orientation BEFORE upload (so we can show it while uploading)
      let detectedOrientation: VideoOrientation = "unknown";
      try {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.src = URL.createObjectURL(file);
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            if (video.videoWidth > video.videoHeight) {
              detectedOrientation = "horizontal";
            } else if (video.videoHeight > video.videoWidth) {
              detectedOrientation = "vertical";
            } else {
              detectedOrientation = "square";
            }
            URL.revokeObjectURL(video.src);
            resolve();
          };
          video.onerror = () => {
            URL.revokeObjectURL(video.src);
            resolve();
          };
          // Timeout in case metadata never loads
          setTimeout(() => {
            URL.revokeObjectURL(video.src);
            resolve();
          }, 5000);
        });
      } catch (e) {
        console.error("Error detecting video orientation:", e);
      }

      // Format file size for display
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setUploadStatus(`Subiendo video (${fileSizeMB} MB)...`);

      // Use DIRECT browser upload to Dropbox (bypasses serverless timeout)
      const result = await uploadToDropboxDirect(
        file,
        folder,
        (progress: DropboxUploadProgress) => {
          setUploadProgress(progress.percent);
          if (progress.percent < 30) {
            setUploadStatus(`Preparando video (${fileSizeMB} MB)...`);
          } else if (progress.percent < 80) {
            setUploadStatus(`Subiendo a Dropbox (${progress.percent}%)...`);
          } else if (progress.percent < 100) {
            setUploadStatus("Creando enlace compartido...");
          } else {
            setUploadStatus("¡Completado!");
          }
        }
      );

      if (!result.success) {
        throw new Error(result.error || "Error al subir video");
      }

      if (!result.url) {
        throw new Error("No se pudo obtener el enlace del video");
      }

      setUploadProgress(100);
      setUploadStatus("¡Video subido exitosamente!");

      onChange({
        source: "upload",
        url: result.url,
        platform: "Dropbox",
        orientation: detectedOrientation,
        title: file.name.replace(/\.[^/.]+$/, ""),
      });

    } catch (err) {
      console.error("Video upload error:", err);
      const errorMessage = (err as Error).message;

      // Provide helpful error messages
      if (errorMessage.includes("401") || errorMessage.includes("expired") || errorMessage.includes("token")) {
        setError("Token de Dropbox expirado. Ve a Sincronización > Dropbox y reconecta tu cuenta.");
      } else if (errorMessage.includes("timeout") || errorMessage.includes("network")) {
        setError("Error de conexión. Verifica tu internet e intenta de nuevo.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus("");
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Clear video
  const handleClear = () => {
    onChange(null);
    setError(null);
    setIsPlaying(false);
  };

  // Toggle video playback
  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Orientation hint
  const orientationHint = orientation === "horizontal"
    ? "Se recomienda video horizontal (16:9) para YouTube y web"
    : orientation === "vertical"
    ? "Se recomienda video vertical (9:16) para Reels, TikTok y Stories"
    : "Cualquier orientación es válida";

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div>
        <label className="block text-sm font-medium mb-1 flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          {label}
        </label>
        {description && (
          <p className="text-xs text-slc-muted">{description}</p>
        )}
        <p className="text-xs text-slc-muted mt-1 flex items-center gap-1">
          {orientation === "vertical" ? (
            <Smartphone className="w-3 h-3" />
          ) : orientation === "horizontal" ? (
            <Monitor className="w-3 h-3" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          {orientationHint}
        </p>
      </div>

      {/* Current video preview */}
      {value && (
        <div className="relative bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
          {/* Video preview */}
          <div className={`relative ${value.orientation === "vertical" ? "aspect-[9/16] max-h-[400px] mx-auto" : "aspect-video"} bg-black`}>
            {value.source === "youtube" && value.embedUrl ? (
              <iframe
                src={`${value.embedUrl}?rel=0`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : value.source === "upload" ? (
              <>
                <video
                  ref={videoRef}
                  src={value.url}
                  className="w-full h-full object-contain"
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                />
                {/* Play/pause overlay */}
                <button
                  type="button"
                  onClick={togglePlayback}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                >
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-black" />
                    ) : (
                      <Play className="w-8 h-8 text-black ml-1" />
                    )}
                  </div>
                </button>
              </>
            ) : value.thumbnailUrl ? (
              <>
                <img
                  src={value.thumbnailUrl}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-red-600/90 flex items-center justify-center">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <PlatformIcon platform={value.platform} className="w-16 h-16 text-slc-muted" />
              </div>
            )}

            {/* Clear button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              onClick={handleClear}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Video info */}
          <div className="p-3 flex items-center justify-between border-t border-slc-border">
            <div className="flex items-center gap-3">
              <PlatformIcon platform={value.platform} className="w-5 h-5 text-slc-muted" />
              <div>
                <p className="text-sm font-medium">{value.platform || "Video"}</p>
                <div className="flex items-center gap-2 text-xs text-slc-muted">
                  <OrientationIcon orientation={value.orientation} className="w-3 h-3" />
                  <span>
                    {value.orientation === "horizontal" ? "Horizontal (16:9)" :
                     value.orientation === "vertical" ? "Vertical (9:16)" :
                     value.orientation === "square" ? "Cuadrado (1:1)" : "Desconocido"}
                  </span>
                </div>
              </div>
            </div>
            {value.source !== "upload" && (
              <Button type="button" variant="ghost" size="sm" asChild>
                <a href={value.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Abrir
                </a>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Upload/URL input section (when no video) */}
      {!value && (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-slc-card rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab("url")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "url"
                  ? "bg-primary text-white"
                  : "text-slc-muted hover:text-white"
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              Pegar URL
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === "upload"
                  ? "bg-primary text-white"
                  : "text-slc-muted hover:text-white"
              }`}
            >
              <Cloud className="w-4 h-4" />
              Subir Video
            </button>
          </div>

          {/* URL input */}
          {activeTab === "url" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                    placeholder="Pega URL de YouTube, Instagram, TikTok..."
                    className="w-full pl-10 pr-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  />
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
                </div>
                <Button type="button" onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
                  Agregar
                </Button>
              </div>

              {/* Platform hints */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-slc-muted">Soportado:</span>
                <span className="flex items-center gap-1 text-xs text-red-500">
                  <Youtube className="w-3 h-3" /> YouTube
                </span>
                <span className="flex items-center gap-1 text-xs text-pink-500">
                  <Instagram className="w-3 h-3" /> Instagram
                </span>
                <span className="flex items-center gap-1 text-xs text-white">
                  <TikTokIcon className="w-3 h-3" /> TikTok
                </span>
              </div>
            </div>
          )}

          {/* File upload */}
          {activeTab === "upload" && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-slc-border hover:border-primary/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />

              {isUploading ? (
                <>
                  <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                  <p className="text-sm font-medium mb-2">{uploadStatus || "Subiendo video..."}</p>
                  <div className="w-full max-w-xs mx-auto bg-slc-border rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slc-muted mt-2">{uploadProgress}%</p>
                  <p className="text-xs text-slc-muted mt-2">
                    Los videos se suben directamente a Dropbox
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 mx-auto mb-4 text-slc-muted" />
                  <p className="text-sm font-medium mb-1">
                    Arrastra un video o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-slc-muted">
                    MP4, WebM, MOV • Máximo {maxSize}MB
                  </p>
                  <p className="text-xs text-primary mt-2">
                    ✓ Subida directa a Dropbox (sin límite de tiempo)
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

// Compact version for inline use
export function VideoUrlInput({
  value,
  onChange,
  placeholder = "URL de YouTube, Instagram, TikTok...",
  className = "",
}: {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const parsed = value ? parseVideoUrl(value) : null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
        />
        {parsed ? (
          <PlatformIcon platform={parsed.platform} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
        ) : (
          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
        )}
      </div>

      {parsed && parsed.thumbnailUrl && (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-black max-w-sm">
          <img
            src={parsed.thumbnailUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center">
              <Play className="w-6 h-6 text-white ml-0.5" />
            </div>
          </div>
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-black/70 rounded text-xs text-white">
            <PlatformIcon platform={parsed.platform} className="w-3 h-3" />
            {parsed.platform}
          </div>
        </div>
      )}
    </div>
  );
}

export { parseVideoUrl };
