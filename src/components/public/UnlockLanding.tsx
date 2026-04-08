"use client";

import { useState, useRef, useEffect } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import {
  Music,
  Download,
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  Heart,
  CheckCircle2,
  Disc3,
  Maximize2,
  Minimize2,
  Video,
} from "lucide-react";
import {
  type StyleSettings,
  defaultStyleSettings,
  getStyleVariables,
  getFontClass,
} from "@/lib/style-config";

interface UnlockLandingProps {
  title: string;
  subtitle?: string;
  coverImageUrl?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  downloadUrl?: string | null;
  downloadFileName?: string | null;
  artistName?: string;
  releaseDate?: string;
  description?: string | null;

  variant?: "campaign" | "beat";
  tags?: { label: string; value: string }[];
  // For YouTube embeds
  youtubeVideoId?: string | null;
  // For vertical videos (TikTok/Reels style)
  videoIsVertical?: boolean;
  // For analytics
  contentId?: string;
  contentType?: "campaign" | "beat";
  // Style customization
  styleSettings?: Partial<StyleSettings>;
}

export function UnlockLanding({
  title,
  subtitle,
  coverImageUrl,
  audioUrl,
  videoUrl,
  downloadUrl,
  downloadFileName,
  artistName,
  releaseDate,
  description,
  variant = "campaign",
  tags = [],
  youtubeVideoId,
  videoIsVertical = false,
  contentId,
  contentType,
  styleSettings,
}: UnlockLandingProps) {
  // Get merged style settings
  const styles = { ...defaultStyleSettings, ...styleSettings };
  const styleVars = getStyleVariables(styles);
  const titleFontClass = getFontClass(styles.titleFont);
  const bodyFontClass = getFontClass(styles.bodyFont);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Analytics tracking
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [maxWatchedPercent, setMaxWatchedPercent] = useState(0);
  const watchTimeRef = useRef(0);
  const analyticsInterval = useRef<NodeJS.Timeout | null>(null);

  // Determine media type
  const hasVideo = !!videoUrl || !!youtubeVideoId;
  const hasAudio = !!audioUrl && !hasVideo;
  const mediaRef = hasVideo ? videoRef : audioRef;

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const handleTimeUpdate = () => setCurrentTime(media.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(media.duration);
      setIsLoaded(true);
    };
    const handleEnded = () => setIsPlaying(false);

    media.addEventListener("timeupdate", handleTimeUpdate);
    media.addEventListener("loadedmetadata", handleLoadedMetadata);
    media.addEventListener("ended", handleEnded);

    return () => {
      media.removeEventListener("timeupdate", handleTimeUpdate);
      media.removeEventListener("loadedmetadata", handleLoadedMetadata);
      media.removeEventListener("ended", handleEnded);
    };
  }, [hasVideo, mediaRef]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Analytics tracking for video
  const sendAnalytics = async (eventType: "play" | "progress" | "complete") => {
    if (!contentId || !contentType) return;

    try {
      await fetch("/api/video-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          contentType,
          eventType,
          currentTime: Math.floor(currentTime),
          duration: Math.floor(duration),
          percentWatched: duration > 0 ? Math.floor((currentTime / duration) * 100) : 0,
          maxPercentWatched: maxWatchedPercent,
          totalWatchTime: watchTimeRef.current,
        }),
      });
    } catch (error) {
      console.error("Analytics error:", error);
    }
  };

  // Track watch progress
  useEffect(() => {
    if (isPlaying && duration > 0) {
      const percent = Math.floor((currentTime / duration) * 100);
      if (percent > maxWatchedPercent) {
        setMaxWatchedPercent(percent);
      }
      watchTimeRef.current += 1;

      // Send progress update every 10 seconds
      if (watchTimeRef.current % 10 === 0) {
        sendAnalytics("progress");
      }

      // Check for completion (>= 90%)
      if (percent >= 90 && maxWatchedPercent < 90) {
        sendAnalytics("complete");
      }
    }
  }, [currentTime, isPlaying, duration]);

  // Send play event when video starts
  useEffect(() => {
    if (isPlaying && !hasStartedPlaying && (hasVideo || hasAudio)) {
      setHasStartedPlaying(true);
      sendAnalytics("play");
    }
  }, [isPlaying, hasStartedPlaying, hasVideo, hasAudio]);

  // Cleanup: send final analytics on unmount
  useEffect(() => {
    return () => {
      if (hasStartedPlaying && contentId) {
        sendAnalytics("progress");
      }
    };
  }, [hasStartedPlaying, contentId]);

  const togglePlay = () => {
    const media = mediaRef.current;
    if (!media) return;

    if (isPlaying) {
      media.pause();
    } else {
      media.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const media = mediaRef.current;
    if (!media) return;

    media.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = async () => {
    if (!videoContainerRef.current) return;

    if (!document.fullscreenElement) {
      await videoContainerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const media = mediaRef.current;
    const progressBar = progressRef.current;
    if (!media || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    media.currentTime = percent * duration;
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slc-black via-slc-dark to-slc-black relative overflow-hidden"
      style={styleVars as React.CSSProperties}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Blurred cover as background */}
        {coverImageUrl && (
          <div className="absolute inset-0 opacity-20 blur-3xl scale-150">
            <SafeImage
              src={coverImageUrl}
              alt=""
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Animated gradient orbs - using custom colors */}
        <div
          className={`absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl ${styles.enableAnimations ? "animate-pulse" : ""}`}
          style={{ backgroundColor: `${styles.primaryColor}20` }}
        />
        <div
          className={`absolute bottom-1/4 -right-32 w-96 h-96 rounded-full blur-3xl ${styles.enableAnimations ? "animate-pulse delay-1000" : ""}`}
          style={{ backgroundColor: `${styles.accentColor}10` }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Success Badge */}
        <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 px-4 py-2 rounded-full mb-8 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="text-green-300 font-medium text-sm uppercase tracking-wide">
            {hasVideo ? "Video Desbloqueado" : "Desbloqueado"}
          </span>
        </div>

        {/* Video Player */}
        {hasVideo && !youtubeVideoId && (
          <div
            ref={videoContainerRef}
            className={`relative mb-8 group ${
              videoIsVertical
                ? "w-full max-w-sm mx-auto"
                : "w-full max-w-2xl"
            }`}
          >
            <div className={`relative rounded-2xl overflow-hidden shadow-2xl bg-black ${
              videoIsVertical
                ? "aspect-[9/16]"
                : "aspect-video"
            }`}>
              <video
                ref={videoRef}
                src={videoUrl || undefined}
                className="w-full h-full object-contain"
                playsInline
                preload="metadata"
                poster={coverImageUrl || undefined}
                onClick={togglePlay}
              />

              {/* Video Overlay Controls */}
              <div
                className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 flex flex-col justify-between p-4 transition-opacity duration-300 ${
                  isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
                }`}
              >
                {/* Top bar */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-white/80">Video Exclusivo</span>
                  </div>
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 bg-black/50 rounded-lg hover:bg-black/70 transition-colors"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-5 h-5 text-white" />
                    ) : (
                      <Maximize2 className="w-5 h-5 text-white" />
                    )}
                  </button>
                </div>

                {/* Center play button */}
                <div className="flex-1 flex items-center justify-center">
                  <button
                    onClick={togglePlay}
                    className="w-20 h-20 rounded-full bg-primary/90 hover:bg-primary flex items-center justify-center shadow-lg shadow-primary/30 transition-transform hover:scale-105"
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8 text-white" />
                    ) : (
                      <Play className="w-8 h-8 text-white ml-1" />
                    )}
                  </button>
                </div>

                {/* Bottom controls */}
                <div className="space-y-2">
                  {/* Progress bar */}
                  <div
                    ref={progressRef}
                    onClick={handleProgressClick}
                    className="relative h-1 bg-white/20 rounded-full cursor-pointer group/progress"
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-primary rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity"
                      style={{ left: `calc(${progress}% - 6px)` }}
                    />
                  </div>

                  {/* Time and controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button onClick={togglePlay} className="text-white/80 hover:text-white">
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                      <button onClick={toggleMute} className="text-white/80 hover:text-white">
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <span className="text-xs text-white/60 font-mono">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* YouTube Embed */}
        {youtubeVideoId && (
          <div className={`mb-8 ${
            videoIsVertical
              ? "w-full max-w-sm mx-auto"
              : "w-full max-w-2xl"
          }`}>
            <div className={`relative rounded-2xl overflow-hidden shadow-2xl ${
              videoIsVertical
                ? "aspect-[9/16]"
                : "aspect-video"
            }`}>
              <iframe
                src={`https://www.youtube.com/embed/${youtubeVideoId}?rel=0&modestbranding=1`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
        )}

        {/* Cover Art with Vinyl Effect (only for audio) */}
        {hasAudio && (
          <div className="relative mb-8 group">
            {/* Vinyl Disc (behind cover) */}
            <div
              className={`absolute top-1/2 left-1/2 -translate-y-1/2 w-64 h-64 md:w-72 md:h-72 transition-transform duration-700 ${
                isPlaying ? "translate-x-12 md:translate-x-16" : "translate-x-0"
              }`}
            >
              <div className={`w-full h-full rounded-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 shadow-2xl ${isPlaying ? "animate-spin-slow" : ""}`}>
                {/* Vinyl grooves */}
                <div className="absolute inset-4 rounded-full border border-zinc-700/50" />
                <div className="absolute inset-8 rounded-full border border-zinc-700/30" />
                <div className="absolute inset-12 rounded-full border border-zinc-700/50" />
                <div className="absolute inset-16 rounded-full border border-zinc-700/30" />
                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-zinc-900" />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Cover */}
            <div className="relative w-64 h-64 md:w-72 md:h-72 rounded-2xl overflow-hidden shadow-2xl transform transition-transform duration-300 group-hover:scale-[1.02]">
              {coverImageUrl ? (
                <SafeImage
                  src={coverImageUrl}
                  alt={title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slc-card to-slc-dark flex items-center justify-center">
                  <Disc3 className="w-24 h-24 text-slc-muted" />
                </div>
              )}

              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          </div>
        )}

        {/* Cover for video (smaller, below video) */}
        {hasVideo && coverImageUrl && (
          <div className="w-24 h-24 rounded-xl overflow-hidden shadow-lg mb-4 border-2 border-white/10">
            <SafeImage
              src={coverImageUrl}
              alt={title}
              width={96}
              height={96}
              className="object-cover w-full h-full"
            />
          </div>
        )}

        {/* Title & Info */}
        <div className="text-center mb-6 max-w-md">
          <h1
            className={`text-3xl md:text-4xl ${titleFontClass} ${
              styles.titleStyle === "uppercase" ? "uppercase" : ""
            } tracking-tight mb-2`}
            style={{
              background: styles.titleStyle === "gradient"
                ? `linear-gradient(to right, ${styles.primaryColor}, ${styles.secondaryColor})`
                : undefined,
              WebkitBackgroundClip: styles.titleStyle === "gradient" ? "text" : undefined,
              WebkitTextFillColor: styles.titleStyle === "gradient" ? "transparent" : undefined,
              color: styles.titleStyle !== "gradient" ? styles.textColor : undefined,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg font-medium" style={{ color: styles.primaryColor }}>{subtitle}</p>
          )}
          {artistName && (
            <p className={`${bodyFontClass} text-slc-muted mt-1`}>{artistName}</p>
          )}
          {releaseDate && (
            <p className={`${bodyFontClass} text-sm text-slc-muted/60 mt-2`}>{releaseDate}</p>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1 bg-white/5 border border-white/10 rounded-full text-white/70"
              >
                {tag.label}: {tag.value}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="text-center text-slc-muted/80 max-w-md mb-8 text-sm leading-relaxed">
            {description}
          </p>
        )}

        {/* Audio Player (only for audio content) */}
        {hasAudio && (
          <div className="w-full max-w-md mb-8">
            <audio ref={audioRef} src={audioUrl || undefined} preload="metadata" />

            {/* Player Container */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              {/* Controls Row */}
              <div className="flex items-center justify-center gap-6 mb-4">
                {/* Restart */}
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = 0;
                    }
                  }}
                  className="p-2 text-white/50 hover:text-white transition-colors"
                  disabled={!isLoaded}
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 transition-transform disabled:opacity-50"
                  disabled={!isLoaded && !audioUrl}
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 text-white" />
                  ) : (
                    <Play className="w-7 h-7 text-white ml-1" />
                  )}
                </button>

                {/* Volume */}
                <button
                  onClick={toggleMute}
                  className="p-2 text-white/50 hover:text-white transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div
                  ref={progressRef}
                  onClick={handleProgressClick}
                  className="relative h-2 bg-white/10 rounded-full cursor-pointer group overflow-hidden"
                >
                  {/* Progress Fill */}
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-green-400 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                  {/* Hover Effect */}
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  {/* Knob */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `calc(${progress}% - 8px)` }}
                  />
                </div>

                {/* Time */}
                <div className="flex justify-between text-xs text-white/40 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          {/* Download Button */}
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={downloadFileName || true}
              className={`flex-1 h-14 text-lg font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 ${
                styles.buttonRounded === "full" ? "rounded-full"
                : styles.buttonRounded === "lg" ? "rounded-lg"
                : styles.buttonRounded === "md" ? "rounded-md"
                : styles.buttonRounded === "sm" ? "rounded-sm"
                : "rounded-none"
              }`}
              style={{
                background: styles.buttonStyle === "gradient"
                  ? `linear-gradient(to right, ${styles.primaryColor}, ${styles.accentColor})`
                  : styles.buttonStyle === "solid"
                  ? styles.primaryColor
                  : "transparent",
                border: styles.buttonStyle === "outline"
                  ? `2px solid ${styles.primaryColor}`
                  : "none",
                color: styles.buttonStyle === "outline" ? styles.primaryColor : "white",
                boxShadow: styles.enableGlow ? `0 10px 30px -10px ${styles.primaryColor}50` : undefined,
              }}
            >
              <Download className="w-5 h-5" />
              Descargar
            </a>
          )}

          {/* Like Button */}
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="lg"
              className="h-14 px-6 border-white/10 hover:bg-white/5"
              onClick={() => setLiked(!liked)}
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  liked ? "fill-red-500 text-red-500" : "text-white/70"
                }`}
              />
            </Button>
          </div>
        </div>

        {/* Footer Message */}
        <div className="mt-12 text-center max-w-sm space-y-2">
          {variant === "beat" && (
            <p className="text-sm text-primary font-medium">
              Úsalo y danos crédito, SonidoLiquido te repostea.
            </p>
          )}
          <p className="text-xs text-white/30">
            Gracias por tu apoyo.
          </p>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
