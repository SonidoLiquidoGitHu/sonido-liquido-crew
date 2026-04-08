"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Download, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactAudioPlayerProps {
  src: string;
  title: string;
  artist?: string;
  duration?: string;
  trackNumber?: number;
  onDownload?: () => void;
  showDownload?: boolean;
  showCopyLink?: boolean;
  className?: string;
}

export function CompactAudioPlayer({
  src,
  title,
  artist,
  duration,
  trackNumber,
  onDownload,
  showDownload = true,
  showCopyLink = true,
  className,
}: CompactAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setAudioDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      // Pause all other audio elements
      document.querySelectorAll("audio").forEach((el) => {
        if (el !== audio) {
          el.pause();
        }
      });
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(!isMuted);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progress = progressRef.current;
    if (!audio || !progress) return;

    const rect = progress.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audioDuration;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(src);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      const link = document.createElement("a");
      link.href = src;
      link.download = `${title}${artist ? ` - ${artist}` : ""}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-2 rounded-lg bg-slc-dark/50 hover:bg-slc-dark transition-colors",
        isPlaying && "bg-primary/5 border border-primary/20",
        className
      )}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Track Number */}
      {trackNumber !== undefined && (
        <span className="w-6 text-center text-sm font-mono text-slc-muted">
          {trackNumber}
        </span>
      )}

      {/* Play Button */}
      <button
        onClick={togglePlay}
        className={cn(
          "w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full transition-all",
          isPlaying
            ? "bg-primary text-white"
            : "bg-slc-card text-slc-muted hover:text-white hover:bg-primary/20"
        )}
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5" />
        ) : (
          <Play className="w-3.5 h-3.5 ml-0.5" />
        )}
      </button>

      {/* Track Info & Progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-medium truncate">
            {title}
          </span>
          {artist && (
            <span className="text-xs text-slc-muted truncate hidden sm:inline">
              {artist}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className="h-1 bg-slc-border rounded-full cursor-pointer overflow-hidden"
        >
          <div
            className="h-full bg-primary transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Time */}
      <div className="text-xs font-mono text-slc-muted w-20 text-right hidden sm:block">
        <span>{formatTime(currentTime)}</span>
        <span className="mx-1">/</span>
        <span>{duration || formatTime(audioDuration)}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Mute */}
        <button
          onClick={toggleMute}
          className="p-1.5 rounded hover:bg-slc-card text-slc-muted hover:text-white transition-colors"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Copy Link */}
        {showCopyLink && (
          <button
            onClick={handleCopyLink}
            className="p-1.5 rounded hover:bg-slc-card text-slc-muted hover:text-white transition-colors"
            title="Copy audio link"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Download */}
        {showDownload && (
          <button
            onClick={handleDownload}
            className="p-1.5 rounded hover:bg-slc-card text-slc-muted hover:text-white transition-colors"
            title="Download track"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Tracklist component for multiple tracks
interface Track {
  title: string;
  artist?: string;
  url: string;
  duration: string;
  trackNumber: number;
}

interface CompactTracklistProps {
  tracks: Track[];
  showDownloadAll?: boolean;
  onDownloadAll?: () => void;
  className?: string;
}

export function CompactTracklist({
  tracks,
  showDownloadAll = true,
  onDownloadAll,
  className,
}: CompactTracklistProps) {
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyAllLinks = async () => {
    try {
      const links = tracks
        .map((t, i) => `${i + 1}. ${t.title}${t.artist ? ` - ${t.artist}` : ""}\n   ${t.url}`)
        .join("\n\n");
      await navigator.clipboard.writeText(links);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const totalDuration = tracks.reduce((acc, track) => {
    const parts = track.duration.split(":");
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

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4 text-xs text-slc-muted">
          <span>{tracks.length} tracks</span>
          <span>•</span>
          <span>{formatTotalDuration(totalDuration)} total</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAllLinks}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-slc-muted hover:text-white hover:bg-slc-card transition-colors"
          >
            {copiedAll ? (
              <>
                <Check className="w-3 h-3 text-green-500" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copiar Links
              </>
            )}
          </button>
          {showDownloadAll && onDownloadAll && (
            <button
              onClick={onDownloadAll}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Download className="w-3 h-3" />
              Descargar Todo
            </button>
          )}
        </div>
      </div>

      {/* Track list */}
      <div className="space-y-1">
        {tracks.map((track, index) => (
          <CompactAudioPlayer
            key={index}
            src={track.url}
            title={track.title}
            artist={track.artist}
            duration={track.duration}
            trackNumber={track.trackNumber || index + 1}
          />
        ))}
      </div>
    </div>
  );
}
