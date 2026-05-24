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

// Extract a thumbnail frame from a video file using canvas.
// Uses requestVideoFrameCallback for guaranteed frame-ready detection,
// with a playback-based fallback when seeking produces only black frames.
// Strategy cascade:
//   1. Seek-based extraction (strict black-frame detection)
//   2. Playback-based extraction (strict black-frame detection)
//   3. Seek-based extraction with RELAXED black-frame detection
//   4. Playback-based extraction with RELAXED detection
//   5. Desperate mode: accept ANY frame (even dim) — better than no thumbnail
async function extractVideoThumbnail(
  file: File,
  initialSeekTime: number = 1.0
): Promise<Blob | null> {
  // Pass 1: Strict seek-based extraction
  const seekResult = await extractViaSeek(file, initialSeekTime, "strict");
  if (seekResult) return seekResult;

  // Pass 2: Strict playback-based extraction
  console.log("[VideoUploader Thumbnail] Strict seek failed, trying strict playback...");
  const playbackResult = await extractViaPlayback(file, "strict");
  if (playbackResult) return playbackResult;

  // Pass 3: Relaxed seek-based extraction (allows dim frames)
  console.log("[VideoUploader Thumbnail] Strict extraction failed, trying relaxed seek...");
  const relaxedSeekResult = await extractViaSeek(file, initialSeekTime, "relaxed");
  if (relaxedSeekResult) return relaxedSeekResult;

  // Pass 4: Relaxed playback-based extraction
  console.log("[VideoUploader Thumbnail] Relaxed seek failed, trying relaxed playback...");
  const relaxedPlaybackResult = await extractViaPlayback(file, "relaxed");
  if (relaxedPlaybackResult) return relaxedPlaybackResult;

  // Pass 5: Desperate mode — accept ANY frame that has video dimensions
  console.log("[VideoUploader Thumbnail] All previous passes failed, trying DESPERATE mode...");
  const desperateResult = await extractViaPlayback(file, "desperate");
  if (desperateResult) return desperateResult;

  console.error("[VideoUploader Thumbnail] ALL extraction strategies failed");
  return null;
}

// Black-frame detection mode:
// - "strict": avgBrightness < 25 || darkRatio > 0.9 (original, too strict for mobile)
// - "relaxed": avgBrightness < 10 || darkRatio > 0.97 (allows dim but visible frames)
// - "desperate": never returns true (accepts any frame with dimensions)
type BlackDetectionMode = "strict" | "relaxed" | "desperate";

function isCanvasMostlyBlack(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  mode: BlackDetectionMode = "strict"
): boolean {
  if (mode === "desperate") return false; // Accept anything
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let totalBrightness = 0;
    let sampledCount = 0;
    let darkPixelCount = 0;
    // Sample every 4th pixel for better coverage
    for (let i = 0; i < data.length; i += 16) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      totalBrightness += brightness;
      if (brightness < 20) darkPixelCount++;
      sampledCount++;
    }
    const avgBrightness = sampledCount > 0 ? totalBrightness / sampledCount : 0;
    const darkRatio = sampledCount > 0 ? darkPixelCount / sampledCount : 0;
    if (mode === "relaxed") {
      // Relaxed: only reject if the frame is extremely dark
      // avgBrightness < 10 means almost completely black
      // darkRatio > 0.97 means 97%+ of pixels are very dark
      return avgBrightness < 10 || darkRatio > 0.97;
    }
    // Strict (original): avgBrightness < 25 || darkRatio > 0.9
    return avgBrightness < 25 || darkRatio > 0.9;
  } catch {
    return false;
  }
}

// Seek-based extraction: seeks to multiple positions and tries to capture a non-black frame.
function extractViaSeek(
  file: File,
  initialSeekTime: number = 1.0,
  blackDetectionMode: BlackDetectionMode = "strict"
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    const objectUrl = video.src;
    let resolved = false;

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
      URL.revokeObjectURL(objectUrl);
    };

    // Wait for a video frame to be truly ready for canvas capture.
    // Uses requestVideoFrameCallback when available (the ONLY reliable method).
    // On mobile (especially Safari), we need MUCH longer waits because the
    // H.264 hardware decoder takes time to produce the first composited frame.
    const waitForFrameReady = (): Promise<void> => {
      return new Promise((frameResolve) => {
        const MAX_WAIT = 15000; // 15s — mobile decoders can be very slow
        const startTime = Date.now();

        // Method 1: requestVideoFrameCallback (Chrome 83+, Edge 83+)
        if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
          const onFrame = () => {
            requestAnimationFrame(() => {
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                frameResolve();
              } else {
                const pollDimensions = () => {
                  if (video.videoWidth > 0 && video.videoHeight > 0) {
                    frameResolve();
                  } else if (Date.now() - startTime < MAX_WAIT) {
                    setTimeout(pollDimensions, 150);
                  } else {
                    frameResolve();
                  }
                };
                pollDimensions();
              }
            });
          };

          try {
            video.requestVideoFrameCallback(onFrame);
            // Fallback timeout for requestVideoFrameCallback
            setTimeout(() => {
              if (video.readyState >= 2 && video.videoWidth > 0) {
                frameResolve();
              }
            }, 3000); // Longer fallback for mobile
            return;
          } catch {
            // Fall through to poll-based
          }
        }

        // Method 2: Poll-based fallback (Firefox, Safari, mobile browsers)
        // Use a much longer delay after readyState check because mobile H.264
        // decoders may report readyState >= 2 before the frame is composited.
        const checkReady = () => {
          if (Date.now() - startTime > MAX_WAIT) {
            frameResolve();
            return;
          }
          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            // 1500ms delay for mobile — the decoder needs time to actually
            // produce a composited frame after reporting readyState >= 2.
            setTimeout(() => frameResolve(), 1500);
            return;
          }
          setTimeout(checkReady, 150);
        };
        checkReady();
      });
    };

    // More seek positions for better coverage, especially for short mobile clips
    const seekPositions = [initialSeekTime, 0.3, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0];
    let currentSeekIndex = 0;

    const tryNextSeek = () => {
      currentSeekIndex++;
      if (currentSeekIndex < seekPositions.length) {
        const nextTime = seekPositions[currentSeekIndex];
        const duration = video.duration;
        if (isFinite(nextTime) && isFinite(duration) && nextTime < duration) {
          video.currentTime = nextTime;
          return;
        }
      }
      console.warn(`[VideoUploader Thumbnail] All seek positions produced black frames (${blackDetectionMode} mode)`);
      cleanup();
      resolve(null);
    };

    // KEY FIX: Wait for 'loadeddata' instead of 'loadedmetadata'.
    // 'loadedmetadata' fires when we know duration/dimensions but NO frames are decoded.
    // 'loadeddata' fires when the first frame is actually decoded and available.
    video.addEventListener("loadeddata", () => {
      const duration = video.duration;
      if (isFinite(duration) && duration > 0) {
        // More percentage-based positions for better coverage
        seekPositions.push(
          duration * 0.05, duration * 0.1, duration * 0.15,
          duration * 0.25, duration * 0.35, duration * 0.5
        );
      }
      const targetTime = Math.min(seekPositions[0], duration * 0.8);
      video.currentTime = targetTime;
    }, { once: true });

    // Safety net: if loadeddata never fires (happens on some mobile browsers),
    // fall back to loadedmetadata with a longer delay
    video.addEventListener("loadedmetadata", () => {
      if (video.readyState >= 2) return; // loadeddata already fired
      const duration = video.duration;
      if (isFinite(duration) && duration > 0) {
        seekPositions.push(
          duration * 0.05, duration * 0.1, duration * 0.15,
          duration * 0.25, duration * 0.35, duration * 0.5
        );
      }
      // Longer delay for mobile — the decoder hasn't produced any frames yet
      setTimeout(() => {
        if (!resolved) video.currentTime = Math.min(seekPositions[0], duration * 0.8);
      }, 800);
    }, { once: true });

    video.onseeked = async () => {
      if (resolved) return;
      try {
        await waitForFrameReady();

        if (video.videoWidth === 0 || video.videoHeight === 0) {
          tryNextSeek();
          return;
        }

        const canvas = document.createElement("canvas");
        const maxDim = 720;
        const scale = Math.min(maxDim / video.videoWidth, maxDim / video.videoHeight, 1);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (isCanvasMostlyBlack(ctx, canvas.width, canvas.height, blackDetectionMode)) {
          canvas.remove();
          tryNextSeek();
          return;
        }

        canvas.toBlob(
          (blob) => {
            canvas.remove();
            cleanup();
            resolve(blob);
          },
          "image/jpeg",
          0.85
        );
      } catch {
        tryNextSeek();
      }
    };

    video.onerror = () => {
      cleanup();
      resolve(null);
    };

    // 60s overall timeout — mobile uploads of large files need more time
    setTimeout(() => {
      cleanup();
      resolve(null);
    }, 60000);
  });
}

// Playback-based extraction: plays the video and captures a frame during playback.
// This forces the decoder to produce real frames, making canvas capture reliable.
// Used as a fallback when seek-based extraction produces only black frames.
function extractViaPlayback(
  file: File,
  blackDetectionMode: BlackDetectionMode = "strict"
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = URL.createObjectURL(file);

    const objectUrl = video.src;
    let resolved = false;

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
      URL.revokeObjectURL(objectUrl);
    };

    let captureAttempts = 0;
    // More attempts for relaxed/desperate modes — mobile needs more time
    const MAX_CAPTURE_ATTEMPTS = blackDetectionMode === "desperate" ? 50 :
                                   blackDetectionMode === "relaxed" ? 40 : 30;

    const tryCapture = (): Blob | null => {
      try {
        if (video.videoWidth === 0 || video.videoHeight === 0) return null;
        const canvas = document.createElement("canvas");
        const maxDim = 720;
        const scale = Math.min(maxDim / video.videoWidth, maxDim / video.videoHeight, 1);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (isCanvasMostlyBlack(ctx, canvas.width, canvas.height, blackDetectionMode)) {
          canvas.remove();
          return null;
        }
        // Synchronous blob extraction for small canvases
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        canvas.remove();
        // Convert data URL to blob
        const byteString = atob(dataUrl.split(",")[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: "image/jpeg" });
      } catch {
        return null;
      }
    };

    video.addEventListener("playing", () => {
      // Start capturing after a delay to let the first few real frames render
      // Longer initial delay for mobile — the H.264 decoder needs time
      const initialDelay = blackDetectionMode === "desperate" ? 800 :
                           blackDetectionMode === "relaxed" ? 500 : 400;
      const attemptCapture = () => {
        if (resolved) return;
        captureAttempts++;
        const blob = tryCapture();
        if (blob) {
          cleanup();
          resolve(blob);
          return;
        }
        if (captureAttempts < MAX_CAPTURE_ATTEMPTS) {
          // Longer interval for mobile — more time for decoder to produce frames
          const interval = blackDetectionMode === "desperate" ? 400 : 250;
          setTimeout(attemptCapture, interval);
        } else {
          cleanup();
          resolve(null);
        }
      };
      setTimeout(attemptCapture, initialDelay);
    }, { once: true });

    video.addEventListener("loadeddata", () => {
      video.play().catch(() => {
        cleanup();
        resolve(null);
      });
    }, { once: true });

    // Safety net for mobile browsers where loadeddata may not fire
    video.addEventListener("loadedmetadata", () => {
      if (video.readyState >= 2) return; // loadeddata already fired
      setTimeout(() => {
        if (!resolved) {
          video.play().catch(() => {
            cleanup();
            resolve(null);
          });
        }
      }, 1000);
    }, { once: true });

    video.onerror = () => {
      cleanup();
      resolve(null);
    };

    // 60s timeout — mobile needs much more time
    setTimeout(() => {
      cleanup();
      resolve(null);
    }, 60000);
  });
}

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
      // Detect orientation AND extract thumbnail in parallel with upload
      let detectedOrientation: VideoOrientation = "unknown";
      let thumbnailBlob: Blob | null = null;

      try {
        // Use the shared extractVideoThumbnail function which handles
        // black-frame detection and multiple seek positions
        const [orientationInfo, thumbBlob] = await Promise.all([
          // Detect orientation
          new Promise<VideoOrientation>((resolve) => {
            const v = document.createElement("video");
            v.preload = "auto";
            v.muted = true;
            v.playsInline = true;
            v.src = URL.createObjectURL(file);
            v.onloadedmetadata = () => {
              URL.revokeObjectURL(v.src);
              v.remove();
              if (v.videoWidth > v.videoHeight) resolve("horizontal");
              else if (v.videoHeight > v.videoWidth) resolve("vertical");
              else resolve("square");
            };
            v.onerror = () => {
              URL.revokeObjectURL(v.src);
              v.remove();
              resolve("unknown");
            };
            setTimeout(() => {
              URL.revokeObjectURL(v.src);
              v.remove();
              resolve("unknown");
            }, 10000);
          }),
          // Extract thumbnail with black-frame detection
          extractVideoThumbnail(file),
        ]);
        detectedOrientation = orientationInfo;
        thumbnailBlob = thumbBlob;
      } catch (e) {
        console.error("Error detecting video orientation / extracting thumbnail:", e);
      }

      // Format file size for display
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setUploadStatus(`Subiendo video (${fileSizeMB} MB)...`);

      // Start video upload to Dropbox
      const videoUploadPromise = uploadToDropboxDirect(
        file,
        folder,
        (progress: DropboxUploadProgress) => {
          // Show video upload as 80% of total progress
          const totalProgress = Math.round(progress.percent * 0.8);
          setUploadProgress(totalProgress);
          if (progress.percent < 30) {
            setUploadStatus(`Subiendo video (${fileSizeMB} MB)...`);
          } else if (progress.percent < 80) {
            setUploadStatus(`Subiendo a Dropbox (${progress.percent}%)...`);
          } else if (progress.percent < 100) {
            setUploadStatus("Creando enlace compartido...");
          }
        }
      );

      // Upload thumbnail in parallel if we captured one
      const thumbnailUploadPromise = thumbnailBlob
        ? uploadToDropboxDirect(
            new File([thumbnailBlob], "thumbnail.jpg", { type: "image/jpeg" }),
            `${folder}/thumbnails`,
            undefined
          ).catch((err) => {
            console.warn("Thumbnail upload failed, continuing without it:", err);
            return null;
          })
        : Promise.resolve(null);

      // Wait for both uploads
      const [result, thumbnailResult] = await Promise.all([
        videoUploadPromise,
        thumbnailUploadPromise,
      ]);

      if (!result.success) {
        throw new Error(result.error || "Error al subir video");
      }

      if (!result.url) {
        throw new Error("No se pudo obtener el enlace del video");
      }

      const thumbnailUrl = thumbnailResult?.success ? thumbnailResult.url : undefined;

      setUploadProgress(100);
      setUploadStatus("¡Video subido exitosamente!");

      onChange({
        source: "upload",
        url: result.url,
        thumbnailUrl,
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
