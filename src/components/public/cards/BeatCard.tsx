"use client";

import { useState, useRef, useEffect } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Play, Pause, Music, Download, Lock, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Beat {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  producerName: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  duration: number | null;
  previewAudioUrl: string | null;
  coverImageUrl: string | null;
  isFree: boolean;
  gateEnabled: boolean;
  playCount: number;
}

interface BeatCardProps {
  beat: Beat;
  isPlaying?: boolean;
  onPlay?: (beatId: string) => void;
  onPause?: () => void;
  currentTime?: number;
  duration?: number;
}

export function BeatCard({
  beat,
  isPlaying = false,
  onPlay,
  onPause,
  currentTime = 0,
  duration = 0,
}: BeatCardProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!beat.previewAudioUrl) return;

    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.(beat.id);
    }
  };

  return (
    <div className="group bg-slc-card border border-slc-border rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300">
      {/* Cover Image with Play Button */}
      <div className="relative aspect-square">
        {beat.coverImageUrl ? (
          <SafeImage
            src={beat.coverImageUrl}
            alt={beat.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-slc-dark flex items-center justify-center">
            <Music className="w-16 h-16 text-primary/50" />
          </div>
        )}

        {/* Play/Pause Button Overlay */}
        {beat.previewAudioUrl ? (
          <button
            onClick={handlePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-all duration-300"
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
              isPlaying
                ? "bg-primary scale-100"
                : "bg-primary/80 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100"
            }`}>
              {isPlaying ? (
                <Pause className="w-7 h-7 text-white" />
              ) : (
                <Play className="w-7 h-7 text-white ml-1" />
              )}
            </div>
          </button>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-center text-white/60">
              <Lock className="w-8 h-8 mx-auto mb-2" />
              <span className="text-xs">No preview</span>
            </div>
          </div>
        )}

        {/* Playing indicator */}
        {isPlaying && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-primary text-white text-xs">
            <Volume2 className="w-3 h-3 animate-pulse" />
            <span>Playing</span>
          </div>
        )}

        {/* Progress Bar */}
        {isPlaying && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Beat Info */}
      <div className="p-4">
        <Link href={`/beats/${beat.slug}`} className="block">
          <h3 className="font-oswald text-lg uppercase text-white hover:text-primary transition-colors line-clamp-1">
            {beat.title}
          </h3>
        </Link>

        {beat.producerName && (
          <p className="text-sm text-slc-muted mt-1">
            by {beat.producerName}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-3">
          {beat.bpm && (
            <span className="text-xs px-2 py-1 bg-slc-dark rounded-full text-slc-muted">
              {beat.bpm} BPM
            </span>
          )}
          {beat.key && (
            <span className="text-xs px-2 py-1 bg-slc-dark rounded-full text-slc-muted">
              {beat.key}
            </span>
          )}
          {beat.genre && (
            <span className="text-xs px-2 py-1 bg-slc-dark rounded-full text-slc-muted">
              {beat.genre}
            </span>
          )}
        </div>

        {/* Duration and Actions */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-slc-muted text-sm">
            {isPlaying ? (
              <span>{formatDuration(currentTime)} / {formatDuration(duration || beat.duration || 0)}</span>
            ) : (
              beat.duration && <span>{formatDuration(beat.duration)}</span>
            )}
          </div>

          <Button asChild size="sm" variant={beat.gateEnabled ? "outline" : "default"}>
            <Link href={`/beats/${beat.slug}`}>
              {beat.gateEnabled ? (
                <>
                  <Lock className="w-3 h-3 mr-1" />
                  Desbloquear
                </>
              ) : (
                <>
                  <Download className="w-3 h-3 mr-1" />
                  Descargar
                </>
              )}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Compact version for smaller displays
export function BeatCardCompact({
  beat,
  isPlaying = false,
  onPlay,
  onPause,
  currentTime = 0,
  duration = 0,
}: BeatCardProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!beat.previewAudioUrl) return;

    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.(beat.id);
    }
  };

  return (
    <div className={`group flex items-center gap-4 p-3 rounded-lg border transition-all duration-300 ${
      isPlaying
        ? "bg-primary/10 border-primary/30"
        : "bg-slc-card border-slc-border hover:border-primary/30"
    }`}>
      {/* Cover Image */}
      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
        {beat.coverImageUrl ? (
          <SafeImage
            src={beat.coverImageUrl}
            alt={beat.title}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-slc-dark flex items-center justify-center">
            <Music className="w-6 h-6 text-primary/50" />
          </div>
        )}
      </div>

      {/* Play Button */}
      <button
        onClick={handlePlayPause}
        disabled={!beat.previewAudioUrl}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
          beat.previewAudioUrl
            ? isPlaying
              ? "bg-primary text-white"
              : "bg-slc-dark hover:bg-primary text-white"
            : "bg-slc-dark text-slc-muted cursor-not-allowed"
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link href={`/beats/${beat.slug}`}>
          <h4 className="font-medium text-white hover:text-primary transition-colors truncate">
            {beat.title}
          </h4>
        </Link>
        <div className="flex items-center gap-2 text-xs text-slc-muted">
          {beat.producerName && <span>{beat.producerName}</span>}
          {beat.producerName && beat.bpm && <span>·</span>}
          {beat.bpm && <span>{beat.bpm} BPM</span>}
          {(beat.bpm || beat.producerName) && beat.key && <span>·</span>}
          {beat.key && <span>{beat.key}</span>}
        </div>

        {/* Progress bar when playing */}
        {isPlaying && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 bg-slc-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-slc-muted">
              {formatDuration(currentTime)}
            </span>
          </div>
        )}
      </div>

      {/* Duration / Action */}
      <div className="flex-shrink-0 text-right">
        {!isPlaying && beat.duration && (
          <span className="text-sm text-slc-muted">{formatDuration(beat.duration)}</span>
        )}
      </div>
    </div>
  );
}
