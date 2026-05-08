"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type TouchEvent as ReactTouchEvent,
} from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Share2,
  Heart,
  Eye,
  Loader2,
  X,
  Copy,
  CheckCircle,
  Smartphone,
  Music,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { YouTubeEmbed } from "@/components/public/embeds/YouTubeEmbed";

// ===========================================
// TYPES
// ===========================================

interface ReelVideo {
  id: string;
  title: string | null;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  platform: string | null;
  platformUrl: string | null;
  embedUrl: string | null;
  artistId: string | null;
  isFeatured: boolean;
  shareCount: number;
  viewCount: number;
  duration: number | null;
  createdAt: Date | string | null;
  artistName: string | null;
  artistSlug: string | null;
  tags: { id: string; name: string; slug: string }[];
}

interface TikTokFeedProps {
  videos: ReelVideo[];
}

// ===========================================
// HELPERS
// ===========================================

const getYouTubeId = (video: ReelVideo) => {
  if (video.embedUrl) {
    const match = video.embedUrl.match(/embed\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  }
  if (video.platformUrl) {
    const match = video.platformUrl.match(
      /(?:shorts\/|watch\?v=)([a-zA-Z0-9_-]+)/
    );
    if (match) return match[1];
  }
  if (video.videoUrl) {
    const match = video.videoUrl.match(
      /(?:shorts\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
    );
    if (match) return match[1];
  }
  return null;
};

const isDirectVideo = (video: ReelVideo) => {
  if (getYouTubeId(video)) return false;
  const url = video.videoUrl?.toLowerCase() || "";
  return (
    url.includes(".mp4") ||
    url.includes(".webm") ||
    url.includes("dropbox") ||
    url.includes("dropboxusercontent")
  );
};

function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

// ===========================================
// CIRCULAR PROGRESS RING COMPONENT
// (Feature #4: Video progress indicator)
// ===========================================

function CircularProgressRing({
  progress,
  size = 80,
  strokeWidth = 3,
  className,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ transform: "rotate(-90deg)" }}
    >
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="white"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.3s ease-linear" }}
      />
    </svg>
  );
}

// ===========================================
// HEART ANIMATION COMPONENT
// ===========================================

function HeartBurst({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{ left: x - 40, top: y - 40 }}
    >
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2"
          style={{
            animation: `heart-burst-${i % 2 === 0 ? "out" : "spin"} 0.8s ease-out forwards`,
            transform: `rotate(${i * 60}deg)`,
          }}
        >
          <Heart
            className="text-red-500"
            fill="currentColor"
            style={{
              transform: `translateY(-30px) scale(${0.6 + Math.random() * 0.6})`,
              opacity: 0,
              animation: `heart-fade 0.8s ease-out ${i * 0.05}s forwards`,
            }}
            size={20 + Math.random() * 12}
          />
        </div>
      ))}
      {/* Central big heart */}
      <Heart
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500"
        fill="currentColor"
        style={{
          animation: "heart-pop 0.6s ease-out forwards",
        }}
        size={80}
      />
    </div>
  );
}

// ===========================================
// SHARE MODAL COMPONENT
// ===========================================

function ShareModal({
  video,
  onClose,
  onTrackShare,
}: {
  video: ReelVideo;
  onClose: () => void;
  onTrackShare: (platform: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/reels/${video.id}`
      : `/reels/${video.id}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(
    video.title || "Mira este video de Sonido Líquido Crew"
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    onTrackShare("copy");
    setTimeout(() => setCopied(false), 2000);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title || "Sonido Líquido Crew",
          text:
            video.description ||
            video.title ||
            "Mira este video de Sonido Líquido Crew",
          url: shareUrl,
        });
        onTrackShare("native");
      } catch {
        /* cancelled */
      }
    } else {
      copyLink();
    }
  };

  const socialButtons = [
    {
      name: "WhatsApp",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      action: () => {
        window.open(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`);
        onTrackShare("whatsapp");
      },
      color: "hover:bg-[#25D366] hover:text-white hover:border-[#25D366]",
    },
    {
      name: "X",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      action: () => {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`
        );
        onTrackShare("twitter");
      },
      color: "hover:bg-black hover:text-white hover:border-black",
    },
    {
      name: "Facebook",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      action: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        );
        onTrackShare("facebook");
      },
      color: "hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]",
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[70] mx-auto max-w-sm bg-slc-dark border border-slc-border rounded-2xl p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-oswald text-lg uppercase tracking-wide flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Compartir
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slc-card transition-colors"
          >
            <X className="w-5 h-5 text-slc-muted" />
          </button>
        </div>

        {/* Title preview */}
        <p className="text-sm text-slc-muted mb-4 line-clamp-2">
          {video.title || "Video"}
        </p>

        {/* Social buttons */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {socialButtons.map((btn) => (
            <button
              key={btn.name}
              onClick={btn.action}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl bg-slc-card border border-slc-border transition-all",
                btn.color
              )}
            >
              {btn.icon}
              <span className="text-xs">{btn.name}</span>
            </button>
          ))}
        </div>

        {/* Copy link */}
        <button
          onClick={copyLink}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-slc-card border border-slc-border hover:border-primary transition-colors mb-3"
        >
          {copied ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-500">Enlace copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              <span>Copiar enlace</span>
            </>
          )}
        </button>

        {/* Native share */}
        {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
          <button
            onClick={nativeShare}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary transition-colors"
          >
            <Share2 className="w-5 h-5" />
            <span>Más opciones</span>
          </button>
        )}
      </div>
    </>
  );
}

// ===========================================
// VIDEO PLAYER COMPONENT
// (Enhanced with: #4 progress ring, #5 auto-advance,
//  #6 blurred thumbnail loading, #3 preload)
// ===========================================

function VideoPlayer({
  video,
  isVisible,
  isMuted,
  onToggleMute,
  onTogglePlay,
  isPlaying,
  onVideoEnd,
  onProgress,
}: {
  video: ReelVideo;
  isVisible: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onTogglePlay: () => void;
  isPlaying: boolean;
  onVideoEnd?: () => void;
  onProgress?: (progress: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showPlayIndicator, setShowPlayIndicator] = useState(false);

  // Autoplay / pause based on visibility
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (isVisible && isPlaying) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isVisible, isPlaying]);

  // Muted state sync
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = isMuted;
  }, [isMuted]);

  // Reset loading when video changes
  useEffect(() => {
    setIsLoading(true);
    setProgress(0);
  }, [video.id]);

  // Progress tracking & events
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onTimeUpdate = () => {
      if (el.duration > 0) {
        const p = (el.currentTime / el.duration) * 100;
        setProgress(p);
        onProgress?.(p);
      }
    };

    const onLoadedData = () => setIsLoading(false);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);

    // Feature #5: Auto-advance when video ends
    const onEnded = () => {
      onVideoEnd?.();
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadeddata", onLoadedData);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("ended", onEnded);

    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadeddata", onLoadedData);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("ended", onEnded);
    };
  }, [onVideoEnd, onProgress]);

  // Show play/pause indicator briefly
  useEffect(() => {
    if (isVisible) {
      setShowPlayIndicator(true);
      const timer = setTimeout(() => setShowPlayIndicator(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, isVisible]);

  // Handle Dropbox URLs — convert dl=0 to dl=1 for direct playback
  const videoSrc = (() => {
    let url = video.videoUrl;
    if (url.includes("dropbox.com") && url.includes("dl=0")) {
      url = url.replace("dl=0", "dl=1");
    }
    if (url.includes("dropbox.com") && !url.includes("dl=")) {
      url += "?dl=1";
    }
    return url;
  })();

  return (
    <div className="relative w-full h-full">
      {/* Feature #6: Blurred thumbnail background while loading */}
      {isLoading && video.thumbnailUrl && (
        <div
          className="absolute inset-0 z-[5] scale-105"
          style={{
            backgroundImage: `url(${video.thumbnailUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(20px)",
          }}
        />
      )}

      {/* Loading spinner on top of blurred thumbnail */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-full object-cover"
        playsInline
        muted={isMuted}
        preload="auto"
        poster={video.thumbnailUrl || undefined}
      />

      {/* Feature #4: Circular progress ring + play/pause indicator (center) */}
      {isVisible && (showPlayIndicator || !isPlaying) && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Progress ring */}
            <CircularProgressRing
              progress={progress}
              size={80}
              strokeWidth={3}
              className="absolute inset-0"
            />
            {/* Play/Pause icon */}
            <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" fill="white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" fill="white" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feature #4: Progress ring always visible (small, top-right) when playing */}
      {isVisible && isPlaying && !showPlayIndicator && (
        <div className="absolute top-4 right-4 z-20 pointer-events-none">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <CircularProgressRing
              progress={progress}
              size={32}
              strokeWidth={2}
              className="absolute inset-0"
            />
            <div className="w-5 h-5 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              {isLoading ? (
                <Loader2 className="w-3 h-3 text-white animate-spin" />
              ) : (
                <Pause className="w-2.5 h-2.5 text-white" fill="white" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress bar at bottom (kept from original) */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 z-20">
        <div
          className="h-full bg-white transition-[width] duration-300 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ===========================================
// YOUTUBE PLAYER COMPONENT
// ===========================================

function YouTubePlayer({
  video,
  ytId,
  isVisible,
  isMuted,
}: {
  video: ReelVideo;
  ytId: string;
  isVisible: boolean;
  isMuted: boolean;
}) {
  return (
    <div className="relative w-full h-full">
      {video.thumbnailUrl && !isVisible && (
        <div
          className="absolute inset-0 bg-cover bg-center z-10"
          style={{ backgroundImage: `url(${video.thumbnailUrl})` }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        </div>
      )}
      <YouTubeEmbed
        videoId={ytId}
        autoplay={isVisible}
        muted={isMuted}
        controls={false}
        title={video.title || "YouTube video"}
      />
    </div>
  );
}

// ===========================================
// NEXT VIDEO PREVIEW COMPONENT
// (Feature #8: Pull-up next preview)
// ===========================================

function NextVideoPreview({
  nextVideo,
  onSwipeUp,
}: {
  nextVideo: ReelVideo | null;
  onSwipeUp: () => void;
}) {
  if (!nextVideo) return null;

  return (
    <div className="absolute bottom-20 left-0 right-0 z-30 pointer-events-none">
      <div
        className="flex items-center gap-3 px-4 py-2 cursor-pointer pointer-events-auto"
        onClick={onSwipeUp}
      >
        {/* Mini thumbnail */}
        <div className="relative w-12 h-[4.5rem] rounded-lg overflow-hidden flex-shrink-0 border border-white/20">
          {nextVideo.thumbnailUrl ? (
            <img
              src={nextVideo.thumbnailUrl}
              alt={nextVideo.title || "Next video"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <Play className="w-4 h-4 text-white/60" fill="white" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white/60 text-[10px] uppercase tracking-wider font-medium flex items-center gap-1">
            <ChevronUp className="w-3 h-3" />
            Siguiente
          </p>
          <p className="text-white text-xs truncate mt-0.5">
            {nextVideo.title || "Video"}
          </p>
          {nextVideo.artistName && (
            <p className="text-white/50 text-[10px] truncate">
              {nextVideo.artistName}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// AUTO-ADVANCE COUNTDOWN INDICATOR
// (Feature #5: Countdown indicator)
// ===========================================

function AutoAdvanceCountdown({
  countdown,
  onCancel,
}: {
  countdown: number | null;
  onCancel: () => void;
}) {
  if (countdown === null) return null;

  return (
    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-sm hover:bg-black/80 transition-colors"
      >
        <span className="relative w-5 h-5">
          <svg width="20" height="20" className="-rotate-90">
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
            />
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 8}`}
              strokeDashoffset={`${2 * Math.PI * 8 * (1 - countdown / 1000)}`}
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
          </svg>
        </span>
        <span>Siguiente en {Math.ceil(countdown / 1000)}s</span>
      </button>
    </div>
  );
}

// ===========================================
// SINGLE REEL ITEM
// ===========================================

function ReelItem({
  video,
  isActive,
  onTrackView,
  nextVideo,
  onGoToNext,
}: {
  video: ReelVideo;
  isActive: boolean;
  onTrackView: (id: string) => void;
  nextVideo: ReelVideo | null;
  onGoToNext: () => void;
}) {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [heartBursts, setHeartBursts] = useState<
    { id: number; x: number; y: number }[]
  >([]);
  const [showShare, setShowShare] = useState(false);
  const [viewTracked, setViewTracked] = useState(false);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const lastTapRef = useRef<number>(0);
  const burstIdRef = useRef(0);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownStartRef = useRef<number>(0);

  const ytId = getYouTubeId(video);
  const isDirect = isDirectVideo(video);

  // Track view when becoming visible
  useEffect(() => {
    if (isActive && !viewTracked) {
      setViewTracked(true);
      onTrackView(video.id);
    }
  }, [isActive, viewTracked, video.id, onTrackView]);

  // Reset view tracking when component unmounts (so revisiting re-tracks)
  useEffect(() => {
    return () => {
      setViewTracked(false);
    };
  }, []);

  // Feature #5: Auto-advance when direct video ends
  const handleVideoEnd = useCallback(() => {
    if (!nextVideo) return; // Don't auto-advance if no next video

    // Start 1-second countdown
    countdownStartRef.current = Date.now();
    setAutoAdvanceCountdown(1000);

    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - countdownStartRef.current;
      const remaining = 1000 - elapsed;
      if (remaining <= 0) {
        setAutoAdvanceCountdown(null);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        onGoToNext();
      } else {
        setAutoAdvanceCountdown(remaining);
      }
    }, 50);

    autoAdvanceTimerRef.current = setTimeout(() => {
      setAutoAdvanceCountdown(null);
      onGoToNext();
    }, 1000);
  }, [nextVideo, onGoToNext]);

  // Cancel auto-advance
  const cancelAutoAdvance = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setAutoAdvanceCountdown(null);
  }, []);

  // Clean up timers on unmount or when leaving
  useEffect(() => {
    if (!isActive) {
      cancelAutoAdvance();
    }
    return () => {
      cancelAutoAdvance();
    };
  }, [isActive, cancelAutoAdvance]);

  // Reset playing state when becoming active again
  useEffect(() => {
    if (isActive) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [isActive]);

  // Track share
  const trackShare = useCallback(
    async (platform: string) => {
      try {
        await fetch(`/api/vertical-videos/${video.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform }),
        });
      } catch {}
    },
    [video.id]
  );

  // Double-tap to like (Feature #7: haptic feedback added)
  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | ReactTouchEvent<HTMLDivElement>) => {
      const now = Date.now();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      let clientX: number, clientY: number;

      if ("touches" in e) {
        const touch = e.changedTouches?.[0];
        if (!touch) return;
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      if (now - lastTapRef.current < 300) {
        // Double tap — like
        setIsLiked(true);
        // Feature #7: Haptic feedback on mobile
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          try {
            navigator.vibrate(10);
          } catch {
            // Silently fail if vibration not supported
          }
        }
        const id = ++burstIdRef.current;
        setHeartBursts((prev) => [
          ...prev,
          { id, x: clientX - rect.left, y: clientY - rect.top },
        ]);
        setTimeout(() => {
          setHeartBursts((prev) => prev.filter((b) => b.id !== id));
        }, 900);
      } else {
        // Single tap — toggle play (for direct videos only)
        if (isDirect) {
          setIsPlaying((prev) => !prev);
          // Cancel auto-advance on user interaction
          cancelAutoAdvance();
        }
      }
      lastTapRef.current = now;
    },
    [isDirect, cancelAutoAdvance]
  );

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => !prev);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
    cancelAutoAdvance();
  }, [cancelAutoAdvance]);

  return (
    <section
      className="relative h-[100dvh] w-full scroll-snap-align-start flex-shrink-0 bg-black overflow-hidden"
      style={{ scrollSnapAlign: "start" }}
    >
      {/* Video content */}
      <div
        className="absolute inset-0"
        onClick={handleTap}
        onTouchEnd={handleTap}
      >
        {ytId ? (
          <YouTubePlayer
            video={video}
            ytId={ytId}
            isVisible={isActive}
            isMuted={isMuted}
          />
        ) : isDirect ? (
          <VideoPlayer
            video={video}
            isVisible={isActive}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted((m) => !m)}
            onTogglePlay={togglePlay}
            isPlaying={isPlaying}
            onVideoEnd={handleVideoEnd}
          />
        ) : (
          /* Fallback: show thumbnail with external link */
          <div className="w-full h-full relative flex items-center justify-center">
            {video.thumbnailUrl && (
              <img
                src={video.thumbnailUrl}
                alt={video.title || "Video"}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            <a
              href={video.platformUrl || video.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <Play className="w-10 h-10 text-white ml-1" fill="white" />
            </a>
          </div>
        )}
      </div>

      {/* Heart burst animations */}
      {heartBursts.map((burst) => (
        <HeartBurst key={burst.id} x={burst.x} y={burst.y} />
      ))}

      {/* Right side action buttons */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-30">
        {/* Mute/Unmute */}
        <button
          onClick={toggleMute}
          className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>

        {/* Like */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsLiked((prev) => !prev);
            // Feature #7: Haptic feedback on explicit like too
            if (!isLiked && typeof navigator !== "undefined" && "vibrate" in navigator) {
              try {
                navigator.vibrate(10);
              } catch {}
            }
          }}
          className="flex flex-col items-center gap-1"
          aria-label="Like"
        >
          <div
            className={cn(
              "w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center transition-colors",
              isLiked ? "text-red-500" : "text-white hover:bg-black/60"
            )}
          >
            <Heart
              className="w-6 h-6"
              fill={isLiked ? "currentColor" : "none"}
            />
          </div>
        </button>

        {/* Share */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowShare(true);
          }}
          className="flex flex-col items-center gap-1"
          aria-label="Share"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors">
            <Share2 className="w-5 h-5" />
          </div>
          <span className="text-[10px] text-white/80">
            {formatViewCount(video.shareCount)}
          </span>
        </button>

        {/* Views */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
            <Eye className="w-5 h-5" />
          </div>
          <span className="text-[10px] text-white/80">
            {formatViewCount(video.viewCount)}
          </span>
        </div>
      </div>

      {/* Play/Pause overlay for direct videos — now handled inside VideoPlayer with progress ring */}

      {/* Feature #5: Auto-advance countdown indicator */}
      <AutoAdvanceCountdown
        countdown={autoAdvanceCountdown}
        onCancel={cancelAutoAdvance}
      />

      {/* Feature #8: Next video preview at bottom */}
      {isActive && nextVideo && (
        <NextVideoPreview nextVideo={nextVideo} onSwipeUp={onGoToNext} />
      )}

      {/* Bottom info overlay with gradient */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-24 pb-6 px-4">
          {/* Artist name */}
          {video.artistName && (
            <Link
              href={`/artistas/${video.artistSlug}`}
              className="pointer-events-auto text-sm text-primary font-semibold hover:underline inline-flex items-center gap-1.5"
            >
              <Music className="w-3.5 h-3.5" />
              {video.artistName}
            </Link>
          )}

          {/* Title */}
          {video.title && (
            <h2 className="font-oswald text-xl md:text-2xl text-white uppercase tracking-wide mt-1 line-clamp-2">
              {video.title}
            </h2>
          )}

          {/* Tags */}
          {video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {video.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-0.5 text-[10px] rounded-full bg-white/10 backdrop-blur-sm text-white/80 border border-white/10"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Featured badge */}
          {video.isFeatured && (
            <span className="inline-block mt-2 px-2 py-0.5 text-[10px] rounded-full bg-primary/80 text-white font-semibold uppercase tracking-wider">
              Destacado
            </span>
          )}
        </div>
      </div>

      {/* Share modal */}
      {showShare && (
        <ShareModal
          video={video}
          onClose={() => setShowShare(false)}
          onTrackShare={trackShare}
        />
      )}
    </section>
  );
}

// ===========================================
// PRELOAD MANAGER
// (Feature #3: Preload next video)
// ===========================================

function usePreloadManager(videos: ReelVideo[], activeIndex: number) {
  const preloadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Preload the next video when active index changes
    const nextIndex = activeIndex + 1;
    const afterNextIndex = activeIndex + 2;

    const preloadVideo = (index: number) => {
      if (index >= videos.length) return;
      const video = videos[index];
      if (preloadedRef.current.has(video.id)) return;

      // Preload thumbnail via Image
      if (video.thumbnailUrl) {
        const img = new Image();
        img.src = video.thumbnailUrl;
      }

      // For direct videos, preload the video element
      if (isDirectVideo(video)) {
        const videoEl = document.createElement("video");
        videoEl.preload = "auto";
        videoEl.src = video.videoUrl;
        // Don't need to append to DOM — just creating starts preloading in most browsers
        preloadedRef.current.add(video.id);
      }

      // For YouTube, we can preload the thumbnail at least
      if (getYouTubeId(video)) {
        const ytId = getYouTubeId(video);
        if (ytId && video.thumbnailUrl) {
          const img = new Image();
          img.src = video.thumbnailUrl;
          preloadedRef.current.add(video.id);
        }
      }
    };

    preloadVideo(nextIndex);
    preloadVideo(afterNextIndex);
  }, [activeIndex, videos]);
}

// ===========================================
// MAIN TIKTOK FEED COMPONENT
// (Enhanced with: #1 swipe gestures, #2 smooth transitions, #3 preloading)
// ===========================================

export function TikTokFeed({ videos }: TikTokFeedProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const trackedViewsRef = useRef<Set<string>>(new Set());

  // Feature #1: Swipe gesture state
  const touchStartYRef = useRef<number>(0);
  const touchStartXRef = useRef<number>(0);
  const isSwipingRef = useRef<boolean>(false);

  // Feature #3: Preload next video
  usePreloadManager(videos, activeIndex);

  // Navigate to a specific index with smooth scrolling
  const goToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= videos.length || isTransitioning) return;
      setIsTransitioning(true);
      setActiveIndex(index);

      const container = containerRef.current;
      if (container) {
        const target = container.querySelector(`[data-index="${index}"]`);
        if (target) {
          target.scrollIntoView({ behavior: "smooth" });
        }
      }

      // Reset transition lock after animation completes
      setTimeout(() => setIsTransitioning(false), 400);
    },
    [videos.length, isTransitioning]
  );

  const goToNext = useCallback(() => {
    if (activeIndex < videos.length - 1) {
      goToIndex(activeIndex + 1);
    }
  }, [activeIndex, videos.length, goToIndex]);

  const goToPrev = useCallback(() => {
    if (activeIndex > 0) {
      goToIndex(activeIndex - 1);
    }
  }, [activeIndex, goToIndex]);

  // Empty state
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-black text-white">
        <Smartphone className="w-16 h-16 text-slc-muted mb-4" />
        <h3 className="text-xl font-oswald uppercase mb-2">
          No hay Reels todavía
        </h3>
        <p className="text-slc-muted text-sm">
          Pronto subiremos videos verticales
        </p>
        <Link href="/reels">
          <Button variant="outline" className="mt-6 gap-2">
            <ChevronUp className="w-4 h-4" />
            Volver a Reels
          </Button>
        </Link>
      </div>
    );
  }

  // IntersectionObserver for autoplay & index tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const index = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(index)) {
              setActiveIndex(index);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.6,
      }
    );

    // Observe all children
    const children = container.querySelectorAll("[data-index]");
    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [videos]);

  // Feature #1: Touch swipe handlers
  const handleTouchStart = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartYRef.current = touch.clientY;
    touchStartXRef.current = touch.clientX;
    isSwipingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    const deltaY = Math.abs(touch.clientY - touchStartYRef.current);
    const deltaX = Math.abs(touch.clientX - touchStartXRef.current);
    // Consider it a vertical swipe if Y delta > X delta
    if (deltaY > deltaX && deltaY > 10) {
      isSwipingRef.current = true;
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      if (!isSwipingRef.current) return;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaY = touchStartYRef.current - touch.clientY;
      const SWIPE_THRESHOLD = 50;

      if (Math.abs(deltaY) >= SWIPE_THRESHOLD) {
        if (deltaY > 0) {
          // Swiped up → next video
          goToNext();
        } else {
          // Swiped down → previous video
          goToPrev();
        }
      }

      isSwipingRef.current = false;
    },
    [goToNext, goToPrev]
  );

  // Track view via API
  const handleTrackView = useCallback(async (videoId: string) => {
    // Don't track same view twice in a session
    if (trackedViewsRef.current.has(videoId)) return;
    trackedViewsRef.current.add(videoId);

    try {
      await fetch(`/api/vertical-videos/${videoId}`, {
        method: "GET",
      });
    } catch {}
  }, []);

  return (
    <>
      {/* CSS keyframe animations */}
      <style jsx global>{`
        @keyframes heart-pop {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }
        @keyframes heart-fade {
          0% {
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        @keyframes heart-burst-out {
          0% {
            opacity: 0;
          }
          30% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(-60px);
          }
        }
        @keyframes heart-burst-spin {
          0% {
            opacity: 0;
            transform: rotate(0deg);
          }
          30% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: rotate(30deg) translateY(-50px);
          }
        }
        /* Feature #2: Smooth slide transition */
        @keyframes slide-in-up {
          0% {
            transform: translateY(100%);
            opacity: 0.7;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes slide-in-down {
          0% {
            transform: translateY(-100%);
            opacity: 0.7;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        /* Custom scrollbar for feed */
        .tiktok-feed::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
        .tiktok-feed {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        /* Feature #2: Smooth scroll behavior */
        .tiktok-feed-reel {
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .tiktok-feed-reel.entering-up {
          animation: slide-in-up 0.35s ease-out forwards;
        }
        .tiktok-feed-reel.entering-down {
          animation: slide-in-down 0.35s ease-out forwards;
        }
      `}</style>

      {/* Scroll container */}
      <div
        ref={containerRef}
        className="tiktok-feed relative w-full h-[100dvh] overflow-y-scroll bg-black"
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {videos.map((video, index) => (
          <div
            key={video.id}
            data-index={index}
            ref={(el) => {
              if (el) sectionRefs.current.set(video.id, el);
            }}
            style={{ scrollSnapAlign: "start" }}
          >
            <ReelItem
              video={video}
              isActive={activeIndex === index}
              onTrackView={handleTrackView}
              nextVideo={index < videos.length - 1 ? videos[index + 1] : null}
              onGoToNext={goToNext}
            />
          </div>
        ))}
      </div>

      {/* Top navigation overlay */}
      <div className="fixed top-0 left-0 right-0 z-40 pointer-events-none">
        <div className="bg-gradient-to-b from-black/60 to-transparent pt-safe-top">
          <div className="flex items-center justify-between px-4 pt-3 pb-8 pointer-events-auto">
            <Link
              href="/reels"
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            >
              <ChevronUp className="w-5 h-5" />
            </Link>

            <div className="font-oswald text-white text-sm uppercase tracking-widest">
              <span className="text-primary font-bold">SLC</span> Reels
            </div>

            <div className="w-10 h-10 flex items-center justify-center text-white/60 text-xs font-medium">
              {activeIndex + 1}/{videos.length}
            </div>
          </div>

          {/* Feature #1/#2: Swipe hint indicator (subtle) */}
          {activeIndex < videos.length - 1 && (
            <div className="flex justify-center -mt-4 mb-2">
              <div className="flex flex-col items-center gap-0.5 animate-bounce">
                <ChevronUp className="w-4 h-4 text-white/40" />
                <span className="text-[9px] text-white/30 uppercase tracking-widest">
                  Desliza
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feature #1: Navigation arrows for desktop */}
      <div className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-40 flex-col gap-2">
        <button
          onClick={goToPrev}
          disabled={activeIndex === 0}
          className={cn(
            "w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white transition-all",
            activeIndex === 0
              ? "opacity-30 cursor-not-allowed"
              : "hover:bg-black/60 hover:scale-110"
          )}
          aria-label="Previous video"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <button
          onClick={goToNext}
          disabled={activeIndex === videos.length - 1}
          className={cn(
            "w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white transition-all",
            activeIndex === videos.length - 1
              ? "opacity-30 cursor-not-allowed"
              : "hover:bg-black/60 hover:scale-110"
          )}
          aria-label="Next video"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
    </>
  );
}
