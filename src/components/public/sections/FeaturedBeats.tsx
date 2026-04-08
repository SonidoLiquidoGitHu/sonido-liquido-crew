"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { ArrowRight, Music, Play, Pause, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Beat {
  id: string;
  title: string;
  slug: string;
  producerName: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  duration: number | null;
  previewAudioUrl: string | null;
  coverImageUrl: string | null;
  isFree: boolean;
  gateEnabled: boolean;
}

interface FeaturedBeatsProps {
  beats: Beat[];
}

export function FeaturedBeats({ beats }: FeaturedBeatsProps) {
  const [currentBeatId, setCurrentBeatId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playBeat = useCallback((beatId: string) => {
    const beat = beats.find(b => b.id === beatId);
    if (!beat?.previewAudioUrl) return;

    // If same beat, just resume
    if (currentBeatId === beatId && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }

    // Create new audio element
    const audio = new Audio(beat.previewAudioUrl);
    audio.volume = 0.8;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    audio.play();
    audioRef.current = audio;
    setCurrentBeatId(beatId);
    setIsPlaying(true);
    setCurrentTime(0);

    // Update progress
    progressInterval.current = setInterval(() => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }, 100);
  }, [beats, currentBeatId]);

  const pauseBeat = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlay = useCallback((beatId: string) => {
    if (isPlaying && currentBeatId === beatId) {
      pauseBeat();
    } else {
      playBeat(beatId);
    }
  }, [isPlaying, currentBeatId, pauseBeat, playBeat]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!beats.length) return null;

  return (
    <section className="py-16 md:py-24 bg-slc-darker">
      <div className="section-container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="font-oswald text-3xl md:text-4xl lg:text-5xl uppercase tracking-wide text-white">
              Beats
            </h2>
            <p className="text-gray-400 mt-2">
              Beats exclusivos de nuestros productores
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0 border-gray-600 text-white hover:bg-white/10">
            <Link href="/beats">
              Ver todos
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Beats List */}
        <div className="bg-slc-card border border-slc-border rounded-xl overflow-hidden">
          {beats.slice(0, 5).map((beat, index) => {
            const isCurrent = currentBeatId === beat.id;
            const beatIsPlaying = isPlaying && isCurrent;
            const progress = isCurrent && duration > 0 ? (currentTime / duration) * 100 : 0;

            return (
              <div
                key={beat.id}
                className={`flex items-center gap-4 p-4 transition-colors ${
                  index !== 0 ? "border-t border-slc-border" : ""
                } ${beatIsPlaying ? "bg-primary/5" : "hover:bg-slc-dark/50"}`}
              >
                {/* Number / Play Button */}
                <div className="w-10 flex-shrink-0">
                  {beat.previewAudioUrl ? (
                    <button
                      onClick={() => togglePlay(beat.id)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        beatIsPlaying
                          ? "bg-primary text-white"
                          : "bg-slc-dark hover:bg-primary text-white"
                      }`}
                    >
                      {beatIsPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                  ) : (
                    <span className="text-slc-muted text-center block">{index + 1}</span>
                  )}
                </div>

                {/* Cover */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slc-dark flex-shrink-0">
                  {beat.coverImageUrl ? (
                    <SafeImage
                      src={beat.coverImageUrl}
                      alt={beat.title}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-5 h-5 text-slc-muted" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/beats/${beat.slug}`}>
                    <h3 className="font-medium text-white hover:text-primary transition-colors truncate">
                      {beat.title}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-slc-muted">
                    {beat.producerName && <span>{beat.producerName}</span>}
                    {beat.producerName && beat.genre && <span>·</span>}
                    {beat.genre && <span>{beat.genre}</span>}
                  </div>

                  {/* Progress bar when playing */}
                  {beatIsPlaying && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-slc-border rounded-full overflow-hidden max-w-xs">
                        <div
                          className="h-full bg-primary transition-all duration-100"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slc-muted">
                        {formatDuration(currentTime)} / {formatDuration(duration)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="hidden md:flex items-center gap-2">
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
                </div>

                {/* Duration / Playing indicator */}
                <div className="text-sm text-slc-muted flex-shrink-0">
                  {beatIsPlaying ? (
                    <Volume2 className="w-4 h-4 text-primary animate-pulse" />
                  ) : (
                    beat.duration && formatDuration(beat.duration)
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 text-center sm:hidden">
          <Button asChild variant="outline" size="lg" className="border-gray-600 text-white hover:bg-white/10">
            <Link href="/beats">
              Ver todos los beats
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
