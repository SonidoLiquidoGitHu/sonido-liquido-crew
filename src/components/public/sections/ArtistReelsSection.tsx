"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Smartphone,
  Play,
  Eye,
  Share2,
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

interface ArtistVideo {
  id: string;
  title: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  platform: string | null;
  isFeatured: boolean;
  shareCount: number;
  viewCount: number;
}

interface ArtistReelsSectionProps {
  artistId: string;
  artistSlug: string;
  artistName: string;
}

// ===========================================
// PLATFORM BADGE
// ===========================================

function PlatformBadge({ platform }: { platform: string | null }) {
  const config: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
    youtube: {
      icon: <Youtube className="w-3 h-3" />,
      label: "YT",
      className: "bg-red-600/80 text-white",
    },
    instagram: {
      icon: <Instagram className="w-3 h-3" />,
      label: "IG",
      className: "bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white",
    },
    tiktok: {
      icon: <Music2 className="w-3 h-3" />,
      label: "TT",
      className: "bg-slate-700/80 text-white",
    },
    dropbox: {
      icon: <Film className="w-3 h-3" />,
      label: "DB",
      className: "bg-blue-600/80 text-white",
    },
  };

  const c = platform ? config[platform] : null;

  if (!c) return null;

  return (
    <div className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium", c.className)}>
      {c.icon}
      {c.label}
    </div>
  );
}

// ===========================================
// SKELETON CARD
// ===========================================

function SkeletonCard() {
  return (
    <div className="shrink-0 w-36 sm:w-44 rounded-xl border border-slc-border bg-slc-card overflow-hidden animate-pulse">
      <div className="aspect-[9/16] bg-slc-dark/80" />
      <div className="p-2 space-y-1.5">
        <div className="h-3 w-3/4 bg-slc-border rounded" />
        <div className="h-2 w-1/2 bg-slc-border rounded" />
      </div>
    </div>
  );
}

// ===========================================
// VIDEO CARD
// ===========================================

function VideoCard({ video }: { video: ArtistVideo }) {
  return (
    <Link
      href={`/reels/${video.id}`}
      className="group relative shrink-0 w-36 sm:w-44 cursor-pointer overflow-hidden rounded-xl bg-slc-card border border-slc-border hover:border-primary/50 transition-all"
    >
      <div className="relative aspect-[9/16]">
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt={video.title || "Video"}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="176px"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slc-card to-slc-dark flex items-center justify-center">
            <Play className="w-10 h-10 text-slc-border" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
          </div>
        </div>

        {/* Featured badge */}
        {video.isFeatured && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 bg-primary text-white text-[9px] font-bold rounded-full uppercase tracking-wider">
              ★ Destacado
            </span>
          </div>
        )}

        {/* Platform badge */}
        <div className="absolute top-2 right-2">
          <PlatformBadge platform={video.platform} />
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          {video.title && (
            <h3 className="font-oswald text-xs text-white uppercase line-clamp-1">
              {video.title}
            </h3>
          )}
          <div className="flex items-center gap-2 mt-1 text-[10px] text-white/60">
            {video.viewCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Eye className="w-2.5 h-2.5" /> {video.viewCount}
              </span>
            )}
            {video.shareCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Share2 className="w-2.5 h-2.5" /> {video.shareCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export function ArtistReelsSection({
  artistId,
  artistSlug,
  artistName,
}: ArtistReelsSectionProps) {
  const [videos, setVideos] = useState<ArtistVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Fetch videos on mount
  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/vertical-videos?artistId=${encodeURIComponent(artistId)}&limit=10`
        );
        const data = await res.json();
        if (data.success) {
          setVideos(data.data || []);
          setTotal(data.total || 0);
        }
      } catch (error) {
        console.error("[ArtistReels] Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [artistId]);

  // Drag scroll handlers (desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  // Don't render if no videos after loading
  if (!loading && videos.length === 0) return null;

  return (
    <section className="mb-16">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/15 border border-primary/20">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-oswald text-2xl uppercase tracking-wide text-white leading-none">
              Reels
            </h2>
            <p className="text-xs text-slc-muted mt-0.5">
              Videos verticales de {artistName}
            </p>
          </div>
        </div>

        {videos.length > 0 && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-slc-muted hover:text-white hover:bg-white/5 shrink-0"
          >
            <Link href={`/reels?artist=${artistSlug}`}>
              Ver todos los Reels
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Video cards - horizontal scroll */}
      {!loading && videos.length > 0 && (
        <div
          ref={scrollRef}
          className={cn(
            "flex gap-4 overflow-x-auto scrollbar-hide pb-2",
            "select-none",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}

      {/* "Ver todos" CTA at bottom if many videos */}
      {!loading && total > 5 && (
        <div className="mt-4 text-center sm:text-right">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-slc-border text-slc-muted hover:text-white hover:bg-white/5"
          >
            <Link href={`/reels?artist=${artistSlug}`}>
              Ver todos los Reels ({total})
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
