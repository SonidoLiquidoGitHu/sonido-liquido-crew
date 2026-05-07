"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Play,
  Pause,
  Music,
  Loader2,
  X,
  Volume2,
  VolumeX,
  Scissors,
  Clock,
  Activity,
  Check,
  AlertTriangle,
} from "lucide-react";

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
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const rawData = audioBuffer.getChannelData(0);
        const samples = 100; // Number of bars in waveform
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];

        for (let i = 0; i < samples; i++) {
          let blockStart = blockSize * i;
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
        const fakeData = Array.from({ length: 100 }, () => Math.random() * 0.5 + 0.3);
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

export function AudioSnippetUploader({
  value,
  onChange,
  maxDuration = 30,
  maxSize = 50,
  folder = "/audio-snippets",
  label = "Audio Preview",
  description,
  showWaveform = true,
  className = "",
}: AudioSnippetUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Audio event handlers
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
  const handleFileUpload = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("audio/")) {
      setError("Solo se permiten archivos de audio");
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`El archivo excede el límite de ${maxSize}MB`);
      return;
    }

    // Check duration
    const audioDuration = await getAudioDuration(file);
    if (audioDuration > maxDuration) {
      setError(`El audio debe ser máximo ${maxDuration} segundos. Este archivo dura ${Math.round(audioDuration)}s.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      setUploadProgress(30);

      const response = await fetch("/api/admin/dropbox/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(80);

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Server returned non-JSON response");
        throw new Error("Error de conexión con Dropbox. Reconecta tu cuenta en Sincronización.");
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Error al subir audio");
      }

      setUploadProgress(100);
      onChange(data.data.url, audioDuration);
      setDuration(audioDuration);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Get audio duration from file
  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.addEventListener("loadedmetadata", () => {
        resolve(audio.duration);
      });
      audio.addEventListener("error", () => {
        resolve(0);
      });
      audio.src = URL.createObjectURL(file);
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
          Máximo {maxDuration} segundos, {maxSize}MB. MP3, WAV, M4A, AAC.
        </p>
      </div>

      {/* Audio preview */}
      {value && (
        <div className="bg-slc-dark border border-slc-border rounded-xl p-4 space-y-4">
          <audio ref={audioRef} src={value} preload="metadata" />

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
                <span className="text-slc-muted font-mono">{formatTime(duration)}</span>
              </div>

              {/* Progress bar (fallback when waveform not shown) */}
              {!showWaveform && (
                <div className="mt-2 h-1 bg-slc-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-spotify transition-all"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
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
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
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
            accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />

          {isUploading ? (
            <>
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-spotify animate-spin" />
              <p className="text-sm font-medium mb-2">Subiendo audio...</p>
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
                Snippet de hasta {maxDuration}s para mostrar en la página de pre-save
              </p>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Tips */}
      <div className="p-3 bg-slc-card/50 rounded-lg border border-slc-border">
        <p className="text-xs text-slc-muted">
          <strong>Tip:</strong> Un snippet de 15-30 segundos con el hook de la canción genera más engagement en pre-saves.
        </p>
      </div>
    </div>
  );
}

export default AudioSnippetUploader;
