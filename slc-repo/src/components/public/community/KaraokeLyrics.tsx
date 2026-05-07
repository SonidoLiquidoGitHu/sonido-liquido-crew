"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Music,
  Mic2,
  Share2,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Settings,
  Type,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LyricLine {
  id: string;
  text: string;
  startTime: number; // milliseconds
  endTime?: number;
  isChorus?: boolean;
  speaker?: string;
  wordTimings?: { word: string; start: number; end: number }[];
}

interface KaraokeLyricsProps {
  trackTitle: string;
  trackArtist: string;
  trackCoverUrl?: string;
  audioUrl?: string;
  spotifyUri?: string;
  lyrics: string; // Plain text lyrics (fallback)
  syncedLyrics?: LyricLine[];
  backgroundColor?: string;
  className?: string;
}

// Font size options
const FONT_SIZES = [
  { label: "S", value: "text-lg" },
  { label: "M", value: "text-xl" },
  { label: "L", value: "text-2xl" },
  { label: "XL", value: "text-3xl" },
];

export function KaraokeLyrics({
  trackTitle,
  trackArtist,
  trackCoverUrl,
  audioUrl,
  spotifyUri,
  lyrics,
  syncedLyrics,
  backgroundColor = "#000",
  className = "",
}: KaraokeLyricsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [fontSize, setFontSize] = useState(FONT_SIZES[1].value);
  const [showSettings, setShowSettings] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  // Parse plain lyrics into lines if no synced lyrics
  const lyricLines: LyricLine[] = syncedLyrics || lyrics.split("\n").map((line, i) => ({
    id: `line-${i}`,
    text: line.trim(),
    startTime: i * 3000, // Estimate 3 seconds per line
    isChorus: line.toLowerCase().includes("[coro]") || line.toLowerCase().includes("[chorus]"),
  }));

  const hasSyncedLyrics = !!syncedLyrics && syncedLyrics.length > 0;

  // Update active line based on current time
  useEffect(() => {
    if (!hasSyncedLyrics) return;

    const activeIndex = lyricLines.findIndex((line, i) => {
      const nextLine = lyricLines[i + 1];
      const isAfterStart = currentTime >= line.startTime;
      const isBeforeNext = nextLine ? currentTime < nextLine.startTime : true;
      return isAfterStart && isBeforeNext;
    });

    if (activeIndex !== activeLineIndex) {
      setActiveLineIndex(activeIndex);
    }
  }, [currentTime, lyricLines, activeLineIndex, hasSyncedLyrics]);

  // Auto-scroll to active line
  useEffect(() => {
    if (autoScroll && activeLineRef.current && lyricsRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeLineIndex, autoScroll]);

  // Audio playback handlers
  const togglePlay = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime * 1000);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration * 1000);
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time / 1000;
      setCurrentTime(time);
    }
  }, []);

  const skipSeconds = useCallback((seconds: number) => {
    if (audioRef.current) {
      const newTime = (audioRef.current.currentTime + seconds) * 1000;
      seekTo(Math.max(0, Math.min(newTime, duration)));
    }
  }, [duration, seekTo]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Format time
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Click on line to seek
  const handleLineClick = (line: LyricLine) => {
    if (hasSyncedLyrics && audioUrl) {
      seekTo(line.startTime);
    }
  };

  // Share lyrics
  const handleShare = async () => {
    const shareData = {
      title: `${trackTitle} - ${trackArtist}`,
      text: `Escucha "${trackTitle}" de ${trackArtist} con letras`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slc-border",
        isFullscreen && "fixed inset-0 z-50 rounded-none",
        className
      )}
      style={{ backgroundColor }}
    >
      {/* Background blur with cover */}
      {trackCoverUrl && (
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={trackCoverUrl}
            alt=""
            className="w-full h-full object-cover blur-3xl opacity-20 scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full min-h-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slc-card flex-shrink-0">
              {trackCoverUrl ? (
                <img
                  src={trackCoverUrl}
                  alt={trackTitle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-6 h-6 text-slc-muted" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-oswald text-lg uppercase text-white truncate">
                {trackTitle}
              </h3>
              <p className="text-sm text-slc-muted truncate">{trackArtist}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Karaoke badge */}
            <div className="flex items-center gap-1 px-3 py-1 bg-primary/20 text-primary text-xs rounded-full">
              <Mic2 className="w-3 h-3" />
              Karaoke
            </div>

            {/* Settings */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              className="text-white/70 hover:text-white"
            >
              <Settings className="w-5 h-5" />
            </Button>

            {/* Share */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="text-white/70 hover:text-white"
            >
              <Share2 className="w-5 h-5" />
            </Button>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white/70 hover:text-white"
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </Button>

            {isFullscreen && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => document.exitFullscreen()}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 border-b border-white/10 bg-black/30 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-wrap items-center gap-6">
              {/* Font size */}
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-slc-muted" />
                <span className="text-sm text-slc-muted">Tamaño:</span>
                <div className="flex gap-1">
                  {FONT_SIZES.map((size) => (
                    <button
                      key={size.label}
                      onClick={() => setFontSize(size.value)}
                      className={cn(
                        "w-8 h-8 rounded text-sm font-medium transition-colors",
                        fontSize === size.value
                          ? "bg-primary text-white"
                          : "bg-white/10 text-white/70 hover:bg-white/20"
                      )}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto scroll */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="w-4 h-4 rounded border-white/30"
                />
                <span className="text-sm text-white">Auto-scroll</span>
              </label>
            </div>
          </div>
        )}

        {/* Lyrics */}
        <div
          ref={lyricsRef}
          className="flex-1 overflow-y-auto p-6 scroll-smooth"
          onScroll={() => setAutoScroll(false)}
        >
          <div className="max-w-2xl mx-auto space-y-4">
            {lyricLines.map((line, index) => {
              const isActive = index === activeLineIndex;
              const isPast = hasSyncedLyrics && index < activeLineIndex;
              const isEmpty = !line.text.trim();

              if (isEmpty) {
                return <div key={line.id} className="h-6" />;
              }

              return (
                <div
                  key={line.id}
                  ref={isActive ? activeLineRef : undefined}
                  onClick={() => handleLineClick(line)}
                  className={cn(
                    "transition-all duration-300 cursor-pointer",
                    fontSize,
                    "font-medium leading-relaxed text-center",
                    isActive
                      ? "text-white scale-105 text-shadow-lg"
                      : isPast
                      ? "text-white/40"
                      : "text-white/60 hover:text-white/80",
                    line.isChorus && "pl-4 border-l-2 border-primary/50 text-primary/90",
                    hasSyncedLyrics && "cursor-pointer"
                  )}
                >
                  {/* Speaker indicator */}
                  {line.speaker && (
                    <span className="text-xs text-primary/70 block mb-1">
                      [{line.speaker}]
                    </span>
                  )}
                  {line.text}
                </div>
              );
            })}
          </div>
        </div>

        {/* Audio Controls (if audio URL provided) */}
        {audioUrl && (
          <div className="p-4 border-t border-white/10 bg-black/30 backdrop-blur-sm">
            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />

            {/* Progress bar */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-slc-muted w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <div
                className="flex-1 h-1 bg-white/20 rounded-full cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percent = x / rect.width;
                  seekTo(percent * duration);
                }}
              >
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slc-muted w-10">
                {formatTime(duration)}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white/70 hover:text-white"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipSeconds(-10)}
                className="text-white/70 hover:text-white"
              >
                <SkipBack className="w-5 h-5" />
              </Button>

              <Button
                onClick={togglePlay}
                size="lg"
                className="w-14 h-14 rounded-full bg-primary hover:bg-primary/80"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6" />
                ) : (
                  <Play className="w-6 h-6 ml-1" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => skipSeconds(10)}
                className="text-white/70 hover:text-white"
              >
                <SkipForward className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Spotify CTA (if no audio but has Spotify URI) */}
        {!audioUrl && spotifyUri && (
          <div className="p-4 border-t border-white/10 bg-black/30 backdrop-blur-sm">
            <a
              href={`https://open.spotify.com/track/${spotifyUri.replace("spotify:track:", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-spotify hover:bg-spotify-dark text-white font-medium rounded-full transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                />
              </svg>
              Escuchar en Spotify
            </a>
          </div>
        )}
      </div>

      {/* CSS for text shadow */}
      <style jsx>{`
        .text-shadow-lg {
          text-shadow: 0 0 20px rgba(255, 255, 255, 0.3),
            0 0 40px rgba(249, 115, 22, 0.2);
        }
      `}</style>
    </div>
  );
}

export default KaraokeLyrics;
