"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
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
import { cn } from "@/lib/utils";

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
}: {
  video: StoriesBarVideo;
  isNew: boolean;
}) {
  const ringGradient = video.isFeatured
    ? "from-yellow-400 via-orange-500 to-red-500"
    : "from-primary via-purple-500 to-pink-500";

  const href = `/reels/${video.id}`;

  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-1.5 shrink-0 w-[86px] sm:w-[96px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
    >
      {/* Gradient Ring */}
      <div
        className={cn(
          "relative rounded-full p-[3px] bg-gradient-to-br transition-transform duration-300 group-hover:scale-105",
          ringGradient,
          isNew && "animate-story-pulse"
        )}
      >
        {/* Inner border (dark gap between gradient ring and thumbnail) */}
        <div className="rounded-full p-[2px] bg-slc-dark">
          {/* Thumbnail circle */}
          <div
            className={cn(
              "relative rounded-full overflow-hidden",
              "w-[72px] h-[72px] sm:w-[86px] sm:h-[86px]"
            )}
          >
            {video.thumbnailUrl ? (
              <Image
                src={video.thumbnailUrl}
                alt={video.title || video.artistName || "Reel"}
                fill
                className="object-cover"
                sizes="86px"
              />
            ) : (
              <div
                className={cn(
                  "w-full h-full flex items-center justify-center bg-gradient-to-br",
                  getPlaceholderGradient(video.platform)
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
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg shadow-yellow-400/30">
            <span className="text-[8px] sm:text-[9px] text-black font-bold">★</span>
          </div>
        )}
      </div>

      {/* Artist name */}
      <span
        className={cn(
          "text-[10px] sm:text-xs text-center w-full truncate px-1",
          video.isFeatured ? "text-yellow-300 font-medium" : "text-slc-muted group-hover:text-white transition-colors"
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
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Determine which videos are "new" (featured ones, plus first 3)
  const newVideoIds = new Set(
    videos
      .filter((v) => v.isFeatured)
      .slice(0, 3)
      .map((v) => v.id)
  );

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

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ===========================================
  // TOUCH SCROLL (native behavior works, just need drag for desktop)
  // ===========================================

  if (videos.length === 0) return null;

  return (
    <section className="relative py-6 sm:py-8 bg-gradient-to-b from-slc-black via-slc-darker to-slc-black overflow-hidden">
      {/* Subtle background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(249,115,22,0.04)_0%,transparent_70%)] pointer-events-none" />

      <div className="section-container relative z-10">
        {/* Header - glass-morphism style */}
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

        {/* Stories bar - horizontal scroll */}
        <div
          ref={scrollRef}
          className={cn(
            "flex gap-3 sm:gap-4 overflow-x-auto scrollbar-hide pb-2",
            "select-none",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Story circles */}
          {videos.map((video) => (
            <StoryCircle
              key={video.id}
              video={video}
              isNew={newVideoIds.has(video.id)}
            />
          ))}

          {/* "Ver todos" end card */}
          <Link
            href="/reels"
            className="group flex flex-col items-center justify-center shrink-0 w-[72px] sm:w-[86px] gap-2"
          >
            <div className="w-[72px] h-[72px] sm:w-[86px] sm:h-[86px] rounded-full border-2 border-dashed border-slc-border group-hover:border-primary/50 flex items-center justify-center bg-slc-card/50 transition-colors">
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-slc-muted group-hover:text-primary transition-colors" />
            </div>
            <span className="text-[10px] sm:text-xs text-slc-muted group-hover:text-white transition-colors text-center">
              Ver todos
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
