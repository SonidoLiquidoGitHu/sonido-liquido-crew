"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { BeatCard, BeatCardCompact } from "@/components/public/cards/BeatCard";
import { Button } from "@/components/ui/button";
import {
  Music,
  Loader2,
  Grid3X3,
  List,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

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

export default function BeatsPage() {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Audio player state
  const [currentBeatId, setCurrentBeatId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchBeats();

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

  const fetchBeats = async () => {
    try {
      const res = await fetch("/api/beats?active=true");
      const data = await res.json();
      if (data.success) {
        setBeats(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching beats:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentBeat = beats.find(b => b.id === currentBeatId);

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
    audio.volume = isMuted ? 0 : volume;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
      // Auto-play next beat
      const currentIndex = beats.findIndex(b => b.id === beatId);
      const nextBeat = beats[currentIndex + 1];
      if (nextBeat?.previewAudioUrl) {
        playBeat(nextBeat.id);
      }
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
  }, [beats, currentBeatId, volume, isMuted]);

  const pauseBeat = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pauseBeat();
    } else if (currentBeatId) {
      audioRef.current?.play();
      setIsPlaying(true);
    } else if (beats.length > 0 && beats[0].previewAudioUrl) {
      playBeat(beats[0].id);
    }
  }, [isPlaying, currentBeatId, beats, pauseBeat, playBeat]);

  const playPrevious = useCallback(() => {
    if (!currentBeatId) return;
    const currentIndex = beats.findIndex(b => b.id === currentBeatId);
    const prevBeat = beats[currentIndex - 1];
    if (prevBeat?.previewAudioUrl) {
      playBeat(prevBeat.id);
    }
  }, [currentBeatId, beats, playBeat]);

  const playNext = useCallback(() => {
    if (!currentBeatId) return;
    const currentIndex = beats.findIndex(b => b.id === currentBeatId);
    const nextBeat = beats[currentIndex + 1];
    if (nextBeat?.previewAudioUrl) {
      playBeat(nextBeat.id);
    }
  }, [currentBeatId, beats, playBeat]);

  const seekTo = useCallback((percent: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = (percent / 100) * duration;
      setCurrentTime(audioRef.current.currentTime);
    }
  }, [duration]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? volume : 0;
    }
    setIsMuted(!isMuted);
  }, [isMuted, volume]);

  const closePlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    setCurrentBeatId(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-32">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-transparent py-12 md:py-20">
        <div className="section-container">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="font-oswald text-4xl md:text-5xl lg:text-6xl uppercase text-white">
              Beats
            </h1>
            <p className="text-gray-400 mt-4">
              Escucha y descarga beats exclusivos de los productores de Sonido Líquido
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="section-container py-6">
        <div className="flex items-center justify-between">
          <p className="text-slc-muted">
            {beats.length} beat{beats.length !== 1 ? "s" : ""} disponible{beats.length !== 1 ? "s" : ""}
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Beats Grid/List */}
      <div className="section-container">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : beats.length === 0 ? (
          <div className="text-center py-20">
            <Music className="w-16 h-16 text-slc-muted mx-auto mb-4" />
            <h2 className="text-xl font-oswald uppercase mb-2">No hay beats disponibles</h2>
            <p className="text-slc-muted">Próximamente agregaremos más beats</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {beats.map((beat) => (
              <BeatCard
                key={beat.id}
                beat={beat}
                isPlaying={isPlaying && currentBeatId === beat.id}
                onPlay={playBeat}
                onPause={pauseBeat}
                currentTime={currentBeatId === beat.id ? currentTime : 0}
                duration={currentBeatId === beat.id ? duration : beat.duration || 0}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {beats.map((beat) => (
              <BeatCardCompact
                key={beat.id}
                beat={beat}
                isPlaying={isPlaying && currentBeatId === beat.id}
                onPlay={playBeat}
                onPause={pauseBeat}
                currentTime={currentBeatId === beat.id ? currentTime : 0}
                duration={currentBeatId === beat.id ? duration : beat.duration || 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fixed Audio Player Bar */}
      {currentBeat && (
        <div className="fixed bottom-0 left-0 right-0 bg-slc-dark/95 backdrop-blur-lg border-t border-slc-border z-50">
          {/* Progress Bar */}
          <div
            className="h-1 bg-slc-border cursor-pointer group"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = ((e.clientX - rect.left) / rect.width) * 100;
              seekTo(percent);
            }}
          >
            <div
              className="h-full bg-primary transition-all duration-100 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="section-container py-3">
            <div className="flex items-center gap-4">
              {/* Album Art */}
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-slc-card flex-shrink-0 relative">
                {currentBeat.coverImageUrl ? (
                  <SafeImage
                    src={currentBeat.coverImageUrl}
                    alt={currentBeat.title}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-6 h-6 text-slc-muted" />
                  </div>
                )}
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <Link href={`/beats/${currentBeat.slug}`} className="block">
                  <h4 className="font-medium text-white truncate hover:text-primary transition-colors">
                    {currentBeat.title}
                  </h4>
                </Link>
                {currentBeat.producerName && (
                  <p className="text-sm text-slc-muted truncate">{currentBeat.producerName}</p>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={playPrevious}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slc-muted hover:text-white transition-colors"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </button>

                <button
                  onClick={playNext}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slc-muted hover:text-white transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Time */}
              <div className="hidden sm:flex items-center gap-2 text-sm text-slc-muted">
                <span>{formatDuration(currentTime)}</span>
                <span>/</span>
                <span>{formatDuration(duration)}</span>
              </div>

              {/* Volume */}
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slc-muted hover:text-white transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setVolume(newVolume);
                    setIsMuted(false);
                    if (audioRef.current) {
                      audioRef.current.volume = newVolume;
                    }
                  }}
                  className="w-20 accent-primary"
                />
              </div>

              {/* Close */}
              <button
                onClick={closePlayer}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slc-muted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
