"use client";

import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  Check,
  Clock,
  Loader2,
  Music,
  Pause,
  Play,
  Scissors,
  Upload,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface AudioSnippetUploaderProps {
  value?: string | null;
  onChange: (url: string | null, duration?: number) => void;
  maxDuration?: number; // seconds
  maxSize?: number; // MB
  folder?: string;
  label?: string;
  description?: string;
  showWaveform?: boolean;
  className?: string;
}

// Simple waveform visualization
function WaveformVisualizer({
  audioUrl,
  currentTime,
  duration,
  isPlaying,
  onSeek,
}: {
  audioUrl: string;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate waveform data from audio
  useEffect(() => {
    if (!audioUrl) return;

    const generateWaveform = async () => {
      setIsLoading(true);
      try {
        const audioContext = new (
          // biome-ignore lint/suspicious/noExplicitAny: dynamic type
          window.AudioContext || (window as any).webkitAudioContext
        )();
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const rawData = audioBuffer.getChannelData(0);
        const samples = 100; // Number of bars in waveform
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];

        for (let i = 0; i < samples; i++) {
          const blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          filteredData.push(sum / blockSize);
        }

        // Normalize
        const max = Math.max(...filteredData);
        const normalized = filteredData.map((n) => n / max);
        setWaveformData(normalized);
      } catch (error) {
        console.error("Error generating waveform:", error);
        // Generate fake waveform as fallback
        const fakeData = Array.from(
          { length: 100 },
          () => Math.random() * 0.5 + 0.3,
        );
        setWaveformData(fakeData);
      } finally {
        setIsLoading(false);
      }
    };

    generateWaveform();
  }, [audioUrl]);

  // Draw waveform
  useEffect(() => {
    if (!canvasRef.current || waveformData.length === 0) return;

    const canvas = canvasRef.current;
    // biome-ignore lint/style/noNonNullAssertion: guaranteed non-null
    const ctx = canvas.getContext("2d")!;
    const { width, height } = canvas;

    // Clear
    ctx.clearRect(0, 0, width, height);

    const barWidth = width / waveformData.length;
    const progress = duration > 0 ? currentTime / duration : 0;
    const progressX = progress * width;

    waveformData.forEach((value, index) => {
      const x = index * barWidth;
      const barHeight = value * height * 0.8;
      const y = (height - barHeight) / 2;

      // Color based on progress
      if (x < progressX) {
        ctx.fillStyle = "#ff6b00"; // Primary color (played)
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)"; // Unplayed
      }

      ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
    });

    // Playhead
    if (isPlaying || currentTime > 0) {
      ctx.fillStyle = "#ff6b00";
      ctx.fillRect(progressX - 1, 0, 2, height);
    }
  }, [waveformData, currentTime, duration, isPlaying]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || duration === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    onSeek(progress * duration);
  };

  if (isLoading) {
    return (
      <div className="h-16 bg-slc-dark rounded-lg flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-slc-muted" />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={64}
      onClick={handleClick}
      className="w-full h-16 cursor-pointer rounded-lg bg-slc-dark"
    />
  );
}

// Generate unique ID
function generateUniqueId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function AudioSnippetUploader({
  value,
  onChange,
  maxDuration = 30,
  maxSize = 150,
  folder = "/audio-snippets",
  label = "Audio Preview",
  description,
  showWaveform = true,
  className = "",
}: AudioSnippetUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Dropbox direct upload state
  const [dropboxConfigured, setDropboxConfigured] = useState<boolean | null>(
    null,
  );
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Initialize Dropbox direct upload on mount
  useEffect(() => {
    const initDropbox = async () => {
      try {
        const statusRes = await fetch("/api/admin/dropbox");
        const statusData = await statusRes.json();
        if (!statusData?.data?.connected) {
          console.log("[AudioSnippet] Dropbox not connected");
          setDropboxConfigured(false);
          return;
        }
        const tokenRes = await fetch("/api/admin/dropbox/token");
        const tokenData = await tokenRes.json();
        if (tokenData.success && tokenData.data?.token) {
          setAccessToken(tokenData.data.token);
          setDropboxConfigured(true);
          console.log("[AudioSnippet] Ready for direct Dropbox uploads");
        } else {
          setDropboxConfigured(false);
        }
      } catch (error) {
        console.error("[AudioSnippet] Dropbox init error:", error);
        setDropboxConfigured(false);
      }
    };
    initDropbox();
  }, []);

  // Audio event handlers
  // biome-ignore lint/correctness/useExhaustiveDependencies: stable reference
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [value]);

  // Handle file upload
  // Known audio file extensions for mobile browsers that may not set MIME type
  const AUDIO_EXTENSIONS = [
    "mp3",
    "wav",
    "m4a",
    "aac",
    "ogg",
    "flac",
    "wma",
    "opus",
    "weba",
  ];

  // Convert Dropbox shared link to direct link with ?raw=1
  const convertToDirectLink = (url: string): string => {
    const result = url.replace("?dl=0", "?raw=1").replace("&dl=0", "&raw=1");
    if (!result.includes("raw=1")) {
      return `${result + (result.includes("?") ? "&" : "?")}raw=1`;
    }
    return result;
  };

  // Create a shared link for a file on Dropbox (direct browser call)
  const createSharedLink = async (path: string): Promise<string> => {
    if (!accessToken) throw new Error("No hay token de Dropbox");

    try {
      const response = await fetch(
        "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path,
            settings: {
              access: "viewer",
              audience: "public",
              requested_visibility: "public",
            },
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        return convertToDirectLink(data.url);
      }

      // Link might already exist
      const errorData = await response.json().catch(() => ({}));
      if (
        errorData.error_summary?.includes("shared_link_already_exists") ||
        response.status === 409
      ) {
        const listResponse = await fetch(
          "https://api.dropboxapi.com/2/sharing/list_shared_links",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ path, direct_only: true }),
          },
        );
        if (listResponse.ok) {
          const listData = await listResponse.json();
          if (listData.links && listData.links.length > 0) {
            return convertToDirectLink(listData.links[0].url);
          }
        }
      }
      throw new Error(
        errorData.error_summary || "Failed to create shared link",
      );
    } catch (error) {
      console.error("[AudioSnippet] Create link error:", error);
      throw error;
    }
  };

  // Upload a file directly to Dropbox from the browser (bypasses server size limits on Netlify)
  const uploadDirectToDropbox = async (file: File): Promise<string> => {
    if (!accessToken) {
      throw new Error(
        "No hay token de Dropbox disponible. Reconecta en Sincronización.",
      );
    }

    const ext = file.name.split(".").pop() || "";
    const baseName = file.name
      .replace(`.${ext}`, "")
      .replace(/[^a-zA-Z0-9-_]/g, "_");
    const uniqueId = generateUniqueId();
    const filename = `${baseName}_${uniqueId}.${ext}`;
    const normalizedFolder = folder.startsWith("/") ? folder : `/${folder}`;
    const dropboxPath = `${normalizedFolder}/${filename}`;

    const fileSizeMB = file.size / (1024 * 1024);
    const isLargeFile = fileSizeMB > 150;

    if (isLargeFile) {
      // Chunked upload for files > 150MB
      const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB chunks
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      // Start session
      setUploadMessage("Iniciando sesión de subida...");
      const startResponse = await fetch(
        "https://content.dropboxapi.com/2/files/upload_session/start",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/octet-stream",
            "Dropbox-API-Arg": JSON.stringify({ close: false }),
          },
          body: new ArrayBuffer(0),
        },
      );
      if (!startResponse.ok) {
        const errData = await startResponse.json().catch(() => ({}));
        throw new Error(
          errData.error_summary || "Failed to start upload session",
        );
      }
      const { session_id } = await startResponse.json();

      let offset = 0;
      for (let i = 0; i < totalChunks; i++) {
        const chunk = file.slice(offset, offset + CHUNK_SIZE);
        const chunkBuffer = await chunk.arrayBuffer();
        const isLastChunk = i === totalChunks - 1;

        const progress = Math.round(30 + ((i + 1) / totalChunks) * 50);
        setUploadProgress(progress);
        setUploadMessage(`Subiendo parte ${i + 1} de ${totalChunks}...`);

        if (isLastChunk) {
          const finishResponse = await fetch(
            "https://content.dropboxapi.com/2/files/upload_session/finish",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/octet-stream",
                "Dropbox-API-Arg": JSON.stringify({
                  cursor: { session_id, offset },
                  commit: {
                    path: dropboxPath,
                    mode: "overwrite",
                    autorename: false,
                    mute: false,
                  },
                }),
              },
              body: chunkBuffer,
            },
          );
          if (!finishResponse.ok) {
            const errorData = await finishResponse.json().catch(() => ({}));
            throw new Error(
              errorData.error_summary || "Failed to finish upload",
            );
          }
        } else {
          const appendResponse = await fetch(
            "https://content.dropboxapi.com/2/files/upload_session/append_v2",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/octet-stream",
                "Dropbox-API-Arg": JSON.stringify({
                  cursor: { session_id, offset },
                  close: false,
                }),
              },
              body: chunkBuffer,
            },
          );
          if (!appendResponse.ok) {
            const errData = await appendResponse.json().catch(() => ({}));
            throw new Error(errData.error_summary || "Failed to append chunk");
          }
        }
        offset += chunkBuffer.byteLength;
      }
    } else {
      // Single-request upload for files <= 150MB
      setUploadMessage("Subiendo a Dropbox...");
      setUploadProgress(40);

      const arrayBuffer = await file.arrayBuffer();

      const uploadResponse = await fetch(
        "https://content.dropboxapi.com/2/files/upload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/octet-stream",
            "Dropbox-API-Arg": JSON.stringify({
              path: dropboxPath,
              mode: "overwrite",
              autorename: false,
              mute: false,
            }),
          },
          body: arrayBuffer,
        },
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        if (uploadResponse.status === 401) {
          throw new Error(
            "Token de Dropbox expirado. Reconecta en Sincronización → Dropbox.",
          );
        }
        throw new Error(
          errorData.error_summary || `Error HTTP ${uploadResponse.status}`,
        );
      }
    }

    setUploadProgress(85);
    setUploadMessage("Creando enlace...");

    // Create shared link
    const sharedUrl = await createSharedLink(dropboxPath);

    return sharedUrl;
  };

  const handleFileUpload = async (file: File) => {
    // Validate file type - check both MIME type and extension
    // Some mobile browsers don't set MIME type correctly for audio files
    const isAudioMime = file.type.startsWith("audio/");
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isAudioExt = AUDIO_EXTENSIONS.includes(ext);

    if (!isAudioMime && !isAudioExt) {
      setError(
        "Solo se permiten archivos de audio (MP3, WAV, FLAC, M4A, AAC, OGG, WMA, AIFF)",
      );
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`El archivo excede el límite de ${maxSize}MB`);
      return;
    }

    // Check duration (skip check if we can't determine it — allows upload on mobile
    // browsers that may not support Audio duration detection for all formats)
    const audioDuration = await getAudioDuration(file);
    if (audioDuration > 0 && audioDuration > maxDuration) {
      setError(
        `El audio debe ser máximo ${maxDuration} segundos. Este archivo dura ${Math.round(audioDuration)}s.`,
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadMessage(null);
    setError(null);

    try {
      // Use direct browser-to-Dropbox upload (bypasses server body size limits on Netlify)
      if (accessToken && dropboxConfigured) {
        setUploadProgress(10);
        const sharedUrl = await uploadDirectToDropbox(file);

        setUploadProgress(100);
        onChange(sharedUrl, audioDuration);
        setDuration(audioDuration);
      } else {
        // Fallback: Server-side upload (for when Dropbox is not configured for direct upload)
        // NOTE: This path has body size limits (~4.5MB on Netlify) and should rarely be used
        console.warn(
          "[AudioSnippet] No direct Dropbox token, falling back to server upload (may fail for large files)",
        );

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        setUploadProgress(30);
        setUploadMessage(
          "Subiendo por servidor (puede fallar con archivos grandes)...",
        );

        const response = await fetch("/api/admin/dropbox/upload", {
          method: "POST",
          body: formData,
        });

        setUploadProgress(80);

        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error("Server returned non-JSON response");
          throw new Error(
            "Error de conexión con Dropbox. Reconecta tu cuenta en Sincronización.",
          );
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Error al subir audio");
        }

        setUploadProgress(100);
        onChange(data.data.url, audioDuration);
        setDuration(audioDuration);
      }
    } catch (err) {
      const errMsg = (err as Error).message;

      // Retry on token expiry (after refreshing)
      if (
        errMsg.includes("401") ||
        errMsg.includes("expired") ||
        errMsg.includes("expirado")
      ) {
        console.log("[AudioSnippet] Token expired, refreshing and retrying");
        try {
          const tokenRes = await fetch("/api/admin/dropbox/token");
          const tokenData = await tokenRes.json();
          if (tokenData.success && tokenData.data?.token) {
            setAccessToken(tokenData.data.token);
            // Retry upload with new token
            setIsUploading(false);
            setUploadProgress(0);
            // Don't auto-retry to avoid infinite loops - show clear error instead
            setError("Token expirado. Intenta subir de nuevo.");
            return;
          }
        } catch {
          // Refresh failed
        }
      }

      setError(errMsg);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadMessage(null);
    }
  };

  // Get audio duration from file with timeout
  // Some mobile browsers may not fire loadedmetadata or return Infinity
  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      let resolved = false;
      const objectUrl = URL.createObjectURL(file);

      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        audio.removeAttribute("src");
        audio.load();
        URL.revokeObjectURL(objectUrl);
      };

      // Timeout after 10 seconds (mobile can be slow)
      const timeout = setTimeout(() => {
        cleanup();
        resolve(0);
      }, 10000);

      audio.addEventListener("loadedmetadata", () => {
        clearTimeout(timeout);
        const dur = audio.duration;
        cleanup();
        // Some browsers return Infinity for streaming formats
        if (!Number.isFinite(dur)) {
          resolve(0);
        } else {
          resolve(dur);
        }
      });

      audio.addEventListener("error", () => {
        clearTimeout(timeout);
        cleanup();
        resolve(0);
      });

      audio.src = objectUrl;
    });
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

  // Toggle play/pause
  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Seek to time
  const handleSeek = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // Toggle mute
  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Clear audio
  const handleClear = () => {
    onChange(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div>
        <label className="block text-sm font-medium mb-1 flex items-center gap-2">
          <Music className="w-4 h-4 text-spotify" />
          {label}
        </label>
        {description && <p className="text-xs text-slc-muted">{description}</p>}
        <p className="text-xs text-slc-muted mt-1">
          Máximo {maxDuration} segundos, {maxSize}MB. MP3, WAV, FLAC, M4A, AAC,
          OGG, WMA, AIFF.
        </p>
        {dropboxConfigured && (
          <div className="flex items-center gap-1.5 mt-1">
            <Zap className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-500">
              Upload directo a Dropbox desde tu navegador
            </span>
          </div>
        )}
        {dropboxConfigured === false && (
          <div className="flex items-center gap-1.5 mt-1">
            <AlertTriangle className="w-3 h-3 text-yellow-500" />
            <span className="text-xs text-yellow-500">
              Dropbox no configurado.{" "}
              <a href="/admin/sync" className="underline">
                Conectar
              </a>
            </span>
          </div>
        )}
      </div>

      {/* Audio preview */}
      {value && (
        <div className="bg-slc-dark border border-slc-border rounded-xl p-4 space-y-4">
          <audio ref={audioRef} src={value} preload="metadata" >
            <track kind="captions" />
          </audio>

          {/* Waveform */}
          {showWaveform && (
            <WaveformVisualizer
              audioUrl={value}
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              onSeek={handleSeek}
            />
          )}

          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={togglePlayback}
              className="h-10 w-10 rounded-full bg-spotify hover:bg-spotify/80 text-white"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </Button>

            {/* Time */}
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono">{formatTime(currentTime)}</span>
                <span className="text-slc-muted font-mono">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Progress bar (fallback when waveform not shown) */}
              {!showWaveform && (
                <div className="mt-2 h-1 bg-slc-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-spotify transition-all"
                    style={{
                      width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Volume */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>

            {/* Clear */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="text-red-500 hover:text-red-400"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Duration badge */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2 py-1 bg-slc-card rounded text-xs">
              <Clock className="w-3 h-3" />
              {formatTime(duration)}
            </span>
            {duration <= maxDuration ? (
              <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs">
                <Check className="w-3 h-3" />
                Duración OK
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs">
                <AlertTriangle className="w-3 h-3" />
                Muy largo
              </span>
            )}
          </div>
        </div>
      )}

      {/* Upload area (when no audio) */}
      {!value && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragOver
              ? "border-spotify bg-spotify/5"
              : "border-slc-border hover:border-spotify/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.wma,.aiff,.opus,.weba"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading || dropboxConfigured === false}
          />

          {isUploading ? (
            <>
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-spotify animate-spin" />
              <p className="text-sm font-medium mb-2">
                {uploadMessage || "Subiendo audio..."}
              </p>
              <div className="w-full max-w-xs mx-auto bg-slc-border rounded-full h-2">
                <div
                  className="bg-spotify h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-slc-muted mt-2">{uploadProgress}%</p>
            </>
          ) : (
            <>
              <Activity className="w-12 h-12 mx-auto mb-4 text-slc-muted" />
              <p className="text-sm font-medium mb-1">
                Arrastra un archivo de audio o haz clic para seleccionar
              </p>
              <p className="text-xs text-slc-muted">
                Snippet de hasta {maxDuration}s para mostrar en la página de
                pre-save
              </p>
              {dropboxConfigured && (
                <p className="text-xs text-emerald-500/80 mt-2">
                  Los archivos se suben directo a Dropbox desde tu navegador
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p>{error}</p>
            {(error.toLowerCase().includes("token") ||
              error.toLowerCase().includes("expirado")) && (
              <a
                href="/admin/sync"
                className="text-xs text-primary hover:underline mt-1 inline-block"
              >
                Ir a Sincronización - Dropbox
              </a>
            )}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="p-3 bg-slc-card/50 rounded-lg border border-slc-border">
        <p className="text-xs text-slc-muted">
          <strong>Tip:</strong> Un snippet de 15-30 segundos con el hook de la
          canción genera más engagement en pre-saves.
        </p>
      </div>
    </div>
  );
}

export default AudioSnippetUploader;
