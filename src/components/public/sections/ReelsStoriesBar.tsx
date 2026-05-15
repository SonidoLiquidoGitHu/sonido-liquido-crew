"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import Link from "next/link";
import {
  Smartphone,
  Play,
  ArrowRight,
  Youtube,
  Instagram,
  Music2,
  Film,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";
import {
  getProxiedThumbnailUrl as getProxiedThumb,
  getYouTubeId,
  isYouTubeThumbnailUrl,
  getYouTubeThumbnailFallback,
  getVideoPlaceholderSvg,
} from "@/lib/video-utils";

// ===========================================
// TYPES
// ===========================================

interface StoriesBarVideo {
  id: string;
  title: string | null;
  thumbnailUrl: string | null;
  platform: string | null;
  isFeatured: boolean;
  artistName: string | null;
  artistSlug: string | null;
}

interface ReelsStoriesBarProps {
  videos: StoriesBarVideo[];
}

// ===========================================
// CONSTANTS
// ===========================================

const SEEN_STORAGE_KEY = "slc-seen-reels";
const AUTO_SCROLL_INTERVAL = 3000;
const ENTRANCE_STAGGER_MS = 50;

// Progress ring uses a 100×100 viewBox for scaling
const RING_VIEWBOX = 100;
const RING_STROKE = 3;
const RING_RADIUS = (RING_VIEWBOX - RING_STROKE * 2) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ≈ 295.3

// ===========================================
// PLATFORM ICON HELPER
// ===========================================

function PlatformIcon({ platform, className }: { platform: string | null; className?: string }) {
  switch (platform) {
    case "youtube":
      return <Youtube className={className} />;
    case "instagram":
      return <Instagram className={className} />;
    case "tiktok":
      return <Music2 className={className} />;
    default:
      return <Film className={className} />;
  }
}

// ===========================================
// GRADIENT PLACEHOLDER COLORS (per platform)
// ===========================================

function getPlaceholderGradient(platform: string | null): string {
  switch (platform) {
    case "youtube":
      return "from-red-600/60 to-red-900/60";
    case "instagram":
      return "from-purple-500/60 to-pink-600/60";
    case "tiktok":
      return "from-cyan-500/60 to-slate-800/60";
    default:
      return "from-primary/40 to-slc-dark/80";
  }
}

// ===========================================
// STORY CIRCLE ITEM
// ===========================================

function StoryCircle({
  video,
  isNew,
  isSeen,
  index,
  isVisible,
  onMarkSeen,
}: {
  video: StoriesBarVideo;
  isNew: boolean;
  isSeen: boolean;
  index: number;
  isVisible: boolean;
  onMarkSeen: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  // Ring gradient: seen stories get gray, unseen keep colorful
  const ringGradient = isSeen
    ? "from-gray-500 via-gray-600 to-gray-700"
    : video.isFeatured
      ? "from-yellow-400 via-orange-500 to-red-500"
      : "from-primary via-purple-500 to-pink-500";

  const href = `/reels/${video.id}`;

  const handleClick = useCallback(() => {
    onMarkSeen(video.id);
  }, [onMarkSeen, video.id]);

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        "group flex flex-col items-center gap-1.5 shrink-0 w-[86px] sm:w-[96px]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg",
        "snap-center scroll-mx-3 sm:scroll-mx-4"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "scale(1)" : "scale(0.6)",
        transition: `opacity 0.4s ease-out ${index * ENTRANCE_STAGGER_MS}ms, transform 0.4s ease-out ${index * ENTRANCE_STAGGER_MS}ms`,
      }}
    >
      {/* Gradient Ring */}
      <div
        className={cn(
          "relative rounded-full p-[3px] bg-gradient-to-br transition-all duration-300 group-hover:scale-105",
          ringGradient,
          !isSeen && isNew && "animate-story-pulse"
        )}
      >
        {/* Progress ring on hover — always in DOM, toggled via opacity + animation */}
        <div
          className={cn(
            "absolute inset-0 z-10 pointer-events-none",
            "transition-opacity duration-150",
            hovered ? "opacity-100" : "opacity-0"
          )}
        >
          <svg
            className="w-full h-full"
            viewBox={`0 0 ${RING_VIEWBOX} ${RING_VIEWBOX}`}
            style={{ transform: "rotate(-90deg)" }}
          >
            <circle
              cx={RING_VIEWBOX / 2}
              cy={RING_VIEWBOX / 2}
              r={RING_RADIUS}
              fill="none"
              stroke="rgba(249, 115, 22, 0.85)"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={RING_CIRCUMFERENCE}
              className={cn(hovered && "animate-story-ring-fill")}
            />
          </svg>
        </div>

        {/* Inner border (dark gap between gradient ring and thumbnail) */}
        <div className="rounded-full p-[2px] bg-slc-dark">
          {/* Thumbnail circle */}
          <div
            className={cn(
              "relative rounded-full overflow-hidden",
              "w-[72px] h-[72px] sm:w-[86px] sm:h-[86px]"
            )}
          >
            {getProxiedThumb(video) ? (
              <SafeImage
                src={getProxiedThumb(video)!}
                alt={video.title || video.artistName || "Reel"}
                fill
                className={cn(
                  "object-cover transition-opacity duration-300",
                  isSeen && "opacity-70 group-hover:opacity-100"
                )}
                sizes="86px"
                fallbackSrc={(() => {
                  const thumb = getProxiedThumb(video)!;
                  const ytId = getYouTubeId(video);
                  if (ytId && isYouTubeThumbnailUrl(thumb)) {
                    return getYouTubeThumbnailFallback(ytId, thumb) || getVideoPlaceholderSvg("9/16");
                  }
                  return getVideoPlaceholderSvg("9/16");
                })()}
              />
            ) : (
              <div
                className={cn(
                  "w-full h-full flex items-center justify-center bg-gradient-to-br",
                  getPlaceholderGradient(video.platform),
                  isSeen && "opacity-60 group-hover:opacity-100 transition-opacity duration-300"
                )}
              >
                <PlatformIcon
                  platform={video.platform}
                  className="w-6 h-6 sm:w-7 sm:h-7 text-white/70"
                />
              </div>
            )}

            {/* Hover overlay with play icon */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
              <Play
                className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow-lg"
                fill="white"
              />
            </div>
          </div>
        </div>

        {/* Featured star indicator */}
        {video.isFeatured && (
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg shadow-yellow-400/30 z-20">
            <span className="text-[8px] sm:text-[9px] text-black font-bold">★</span>
          </div>
        )}
      </div>

      {/* Artist name */}
      <span
        className={cn(
          "text-[10px] sm:text-xs text-center w-full truncate px-1",
          video.isFeatured && !isSeen
            ? "text-yellow-300 font-medium"
            : isSeen
              ? "text-slc-muted/60 group-hover:text-slc-muted transition-colors"
              : "text-slc-muted group-hover:text-white transition-colors"
        )}
      >
        {video.artistName || video.title || "Reel"}
      </span>
    </Link>
  );
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export function ReelsStoriesBar({ videos }: ReelsStoriesBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  // Determine which videos are "new" (featured ones, plus first 3)
  const newVideoIds = useMemo(
    () =>
      new Set(
        videos
          .filter((v) => v.isFeatured)
          .slice(0, 3)
          .map((v) => v.id)
      ),
    [videos]
  );

  // ===========================================
  // SEEN / UNSEEN STATE (localStorage)
  // ===========================================

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_STORAGE_KEY);
      if (raw) {
        const parsed: string[] = JSON.parse(raw);
        setSeenIds(new Set(parsed));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const markSeen = useCallback((id: string) => {
    setSeenIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  // ===========================================
  // INTERSECTION OBSERVER (animated entrance)
  // ===========================================

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ===========================================
  // AUTO-SCROLL (pauses on hover or drag)
  // ===========================================

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    if (isHovering || isDragging) return;

    const timer = setInterval(() => {
      if (!container) return;

      const itemWidth = 96;
      const maxScrollLeft = container.scrollWidth - container.clientWidth;

      if (container.scrollLeft >= maxScrollLeft - 2) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        container.scrollBy({ left: itemWidth, behavior: "smooth" });
      }
    }, AUTO_SCROLL_INTERVAL);

    return () => clearInterval(timer);
  }, [isHovering, isDragging]);

  // ===========================================
  // DRAG SCROLL HANDLERS
  // ===========================================

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!scrollRef.current) return;
      setIsDragging(true);
      setStartX(e.pageX - scrollRef.current.offsetLeft);
      setScrollLeft(scrollRef.current.scrollLeft);
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !scrollRef.current) return;
      e.preventDefault();
      const x = e.pageX - scrollRef.current.offsetLeft;
      const walk = (x - startX) * 1.5;
      scrollRef.current.scrollLeft = scrollLeft - walk;
    },
    [isDragging, startX, scrollLeft]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseEnterBar = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeaveBar = useCallback(() => {
    setIsDragging(false);
    setIsHovering(false);
  }, []);

  // ===========================================
  // RENDER
  // ===========================================

  if (videos.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="relative py-6 sm:py-8 bg-gradient-to-b from-slc-black via-slc-darker to-slc-black overflow-hidden"
    >
      {/* Subtle background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(249,115,22,0.04)_0%,transparent_70%)] pointer-events-none" />

      <div className="section-container relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/15 backdrop-blur-sm border border-primary/20">
              <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-oswald text-xl sm:text-2xl uppercase tracking-wide text-white leading-none">
                Reels
              </h2>
              <p className="text-[11px] sm:text-xs text-slc-muted mt-0.5">
                Toca para ver
              </p>
            </div>
          </div>

          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-slc-muted hover:text-white hover:bg-white/5 shrink-0"
          >
            <Link href="/reels">
              Ver todos
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>

        {/* Stories bar - horizontal scroll with snap */}
        <div
          ref={scrollRef}
          className={cn(
            "flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2",
            "select-none snap-x snap-mandatory",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseEnter={handleMouseEnterBar}
          onMouseLeave={handleMouseLeaveBar}
        >
          {/* Story circles */}
          {videos.map((video, index) => (
            <StoryCircle
              key={video.id}
              video={video}
              isNew={newVideoIds.has(video.id)}
              isSeen={seenIds.has(video.id)}
              index={index}
              isVisible={isVisible}
              onMarkSeen={markSeen}
            />
          ))}

          {/* "Ver todos" end card — enhanced with gradient + pulse */}
          <Link
            href="/reels"
            className={cn(
              "group flex flex-col items-center justify-center shrink-0 w-[86px] sm:w-[96px] gap-2",
              "snap-center scroll-mx-3 sm:scroll-mx-4"
            )}
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "scale(1)" : "scale(0.6)",
              transition: `opacity 0.4s ease-out ${videos.length * ENTRANCE_STAGGER_MS}ms, transform 0.4s ease-out ${videos.length * ENTRANCE_STAGGER_MS}ms`,
            }}
          >
            <div
              className={cn(
                "relative w-[72px] h-[72px] sm:w-[86px] sm:h-[86px] rounded-full flex items-center justify-center overflow-hidden",
                "bg-gradient-to-br from-primary/30 via-purple-500/20 to-pink-500/30",
                "group-hover:from-primary/50 group-hover:via-purple-500/40 group-hover:to-pink-500/50",
                "transition-all duration-300 group-hover:scale-105",
                "animate-story-pulse"
              )}
            >
              {/* Inner dashed ring */}
              <div className="absolute inset-[3px] rounded-full border-2 border-dashed border-white/20 group-hover:border-primary/60 transition-colors" />
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-white/70 group-hover:text-primary transition-colors relative z-10" />
            </div>
            <span className="text-[10px] sm:text-xs text-slc-muted group-hover:text-white transition-colors text-center font-medium">
              Ver todos
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
