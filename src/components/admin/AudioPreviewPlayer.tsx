"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AudioPreviewPlayerProps {
  url: string;
  filename?: string;
  className?: string;
}

export function AudioPreviewPlayer({ url, filename, className = "" }: AudioPreviewPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if URL is an audio file
  const isAudioFile = /\.(mp3|wav|flac|m4a|aac|ogg|webm)$/i.test(url);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      setError("No se puede reproducir el archivo");
      setIsLoading(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [url]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progress = progressRef.current;
    if (!audio || !progress) return;

    const rect = progress.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * duration;
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isAudioFile) {
    return (
      <div className={`p-3 bg-slc-card border border-slc-border rounded-lg text-center text-sm text-slc-muted ${className}`}>
        No es un archivo de audio (ZIP, RAR, etc.)
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center text-sm text-red-400 ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <div className={`bg-slc-card border border-slc-border rounded-lg p-4 ${className}`}>
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Filename */}
      {filename && (
        <p className="text-sm text-slc-muted mb-3 truncate">{filename}</p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={togglePlay}
          disabled={isLoading}
          className="w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </Button>

        {/* Progress Bar */}
        <div className="flex-1">
          <div
            ref={progressRef}
            className="h-2 bg-slc-border rounded-full cursor-pointer overflow-hidden"
            onClick={handleProgressClick}
          >
            <div
              className="h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-slc-muted">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Restart */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={restart}
          className="w-8 h-8"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        {/* Mute */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="w-8 h-8"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
