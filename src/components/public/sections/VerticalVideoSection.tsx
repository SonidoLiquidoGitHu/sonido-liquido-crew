"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Play,
  Share2,
  Eye,
  Smartphone,
  ArrowRight,
  PlayCircle,
  Copy,
  CheckCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { cn } from "@/lib/utils";
import {
  getYouTubeId,
  getProxiedThumbnailUrl,
  isYouTubeThumbnailUrl,
  getYouTubeThumbnailFallback,
  getVideoPlaceholderSvg,
  type VideoLike,
} from "@/lib/video-utils";

// ===========================================
// TYPES
// ===========================================

interface VerticalVideo {
  id: string;
  title: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  platform: string | null;
  platformUrl: string | null;
  embedUrl: string | null;
  isFeatured: boolean;
  shareCount: number;
  viewCount: number;
  artistName: string | null;
  artistSlug: string | null;
  tags: { id: string; name: string; slug: string }[];
}

interface VerticalVideoSectionProps {
  initialVideos?: VerticalVideo[];
  limit?: number;
}

// ===========================================
// PLATFORM ICON BADGES (Improvement #5)
// ===========================================

function PlatformIconBadge({ platform }: { platform: string | null }) {
  const config: Record<
    string,
    { icon: React.ReactNode; className: string }
  > = {
    youtube: {
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
      className: "bg-red-600/80 text-white",
    },
    instagram: {
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      ),
      className:
        "bg-gradient-to-r from-purple-600/80 to-pink-600/80 text-white",
    },
    tiktok: {
      icon: (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      ),
      className: "bg-slate-700/80 text-white",
    },
  };

  const c = platform ? config[platform.toLowerCase()] : null;

  if (!c) {
    // Fallback for unknown platforms — show a generic smartphone icon
    return (
      <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white">
        <Smartphone className="w-3 h-3" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center",
        c.className
      )}
    >
      {c.icon}
    </div>
  );
}

// ===========================================
// HELPERS (imported from @/lib/video-utils)
// ===========================================

// getYouTubeId, getVideoThumbnail, etc. are now shared utilities.
// The VerticalVideo type satisfies the VideoLike interface so they work
// without any adapter.

// ===========================================
// SHIMMER SKELETON CARDS (Improvement #1)
// ===========================================

function ShimmerCard() {
  return (
    <div className="shrink-0 w-44 md:w-auto rounded-xl border border-slc-border bg-slc-card overflow-hidden">
      <div className="aspect-[9/16] relative overflow-hidden bg-slc-dark/80">
        <div className="absolute inset-0 shimmer-gradient" />
        {/* Skeleton overlay details */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 space-y-1.5">
          <div className="h-2 w-3/4 rounded bg-slc-border/40 relative overflow-hidden">
            <div className="absolute inset-0 shimmer-gradient" />
          </div>
          <div className="h-1.5 w-1/2 rounded bg-slc-border/40 relative overflow-hidden">
            <div className="absolute inset-0 shimmer-gradient" />
          </div>
          <div className="flex gap-2">
            <div className="h-1.5 w-8 rounded bg-slc-border/30 relative overflow-hidden">
              <div className="absolute inset-0 shimmer-gradient" />
            </div>
            <div className="h-1.5 w-8 rounded bg-slc-border/30 relative overflow-hidden">
              <div className="absolute inset-0 shimmer-gradient" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// SHARE MODAL (Improvement #4)
// ===========================================

function ShareModal({
  video,
  onClose,
}: {
  video: VerticalVideo;
  onClose: () => void;
}) {
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/reels/${video.id}`
      : `/reels/${video.id}`;

  const trackShare = async (platform: string) => {
    try {
      await fetch(`/api/vertical-videos/${video.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
    } catch {
      // silently fail
    }
  };

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
    setCopiedLink(true);
    trackShare("copy");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title || "Sonido Líquido Crew",
          url: shareUrl,
        });
        trackShare("native");
      } catch {
        // cancelled
      }
    } else {
      copyLink();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slc-dark border border-slc-border rounded-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slc-border">
          <h2 className="font-oswald text-lg uppercase flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Compartir
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slc-card transition-colors"
          >
            <X className="w-5 h-5 text-slc-muted" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-slc-muted">
            {video.title || "Video"}
          </p>

          {/* Copy link row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 p-2.5 bg-slc-card border border-slc-border rounded-lg text-xs truncate text-slc-muted">
              {shareUrl}
            </div>
            <Button variant="outline" size="icon" onClick={copyLink}>
              {copiedLink ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Social buttons grid */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="w-full text-sm"
              onClick={async () => {
                const text =
                  video.title || "Mira este video de Sonido Líquido Crew";
                if (navigator.share) {
                  try {
                    await navigator.share({ title: text, url: shareUrl });
                  } catch {
                    /* cancelled */
                  }
                } else {
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(text + " " + shareUrl)}`
                  );
                }
                trackShare("whatsapp");
              }}
            >
              <svg
                className="w-4 h-4 mr-2"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </Button>
            <Button
              variant="outline"
              className="w-full text-sm"
              onClick={() => {
                const text = video.title || "Mira este video";
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`
                );
                trackShare("twitter");
              }}
            >
              <svg
                className="w-4 h-4 mr-2"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              X / Twitter
            </Button>
            <Button
              variant="outline"
              className="w-full text-sm"
              onClick={() => {
                window.open(
                  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
                );
                trackShare("facebook");
              }}
            >
              <svg
                className="w-4 h-4 mr-2"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </Button>
            <Button variant="outline" className="w-full text-sm" onClick={nativeShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Más opciones
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// ANIMATED VIDEO CARD (Improvement #2 — staggered entrance)
// ===========================================

function VideoCard({
  video,
  index,
  onShare,
}: {
  video: VerticalVideo;
  index: number;
  onShare: (video: VerticalVideo) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Stagger delay based on index
          const delay = Math.min(index * 80, 600);
          setTimeout(() => setIsVisible(true), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "shrink-0 w-44 md:w-auto transition-all duration-500",
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-6"
      )}
    >
      <Link
        href={`/reels/${video.id}`}
        className="group relative block cursor-pointer overflow-hidden rounded-xl bg-slc-card border border-slc-border hover:border-primary/50 transition-all"
      >
        <div className="relative aspect-[9/16]">
          <VideoThumbnail
            video={video}
            alt={video.title || "Video"}
            fill
            className="transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 176px, (max-width: 1024px) 25vw, 20vw"
            aspectRatio="9/16"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
            </div>
          </div>

          {/* Featured badge */}
          {video.isFeatured && (
            <div className="absolute top-2 left-2 z-10">
              <span className="px-2 py-0.5 bg-primary text-white text-[10px] rounded-full font-bold uppercase tracking-wider">
                ★ Destacado
              </span>
            </div>
          )}

          {/* Platform icon badge (Improvement #5) */}
          {video.platform && (
            <div className="absolute top-2 right-2 z-10">
              <PlatformIconBadge platform={video.platform} />
            </div>
          )}

          {/* Title + Artist overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10">
            {video.title && (
              <h3 className="font-oswald text-sm text-white font-bold uppercase truncate">
                {video.title}
              </h3>
            )}
            {video.artistName && (
              <p className="text-[11px] text-gray-400 truncate mt-0.5">
                {video.artistName}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1 text-[10px] text-white/60">
              <span className="flex items-center gap-0.5">
                <Eye className="w-2.5 h-2.5" /> {video.viewCount}
              </span>
              <span className="flex items-center gap-0.5">
                <Share2 className="w-2.5 h-2.5" /> {video.shareCount}
              </span>
            </div>
          </div>

          {/* Inline share quick-action button (Improvement #4) */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onShare(video);
            }}
            className="absolute bottom-12 right-2 z-20 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:scale-110"
            title="Compartir"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </Link>
    </div>
  );
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export function VerticalVideoSection({
  initialVideos,
  limit = 8,
}: VerticalVideoSectionProps) {
  const [videos, setVideos] = useState<VerticalVideo[]>(initialVideos || []);
  const [loading, setLoading] = useState(!initialVideos);
  const [shareVideo, setShareVideo] = useState<VerticalVideo | null>(null);

  useEffect(() => {
    if (!initialVideos) {
      fetchVideos();
    }
  }, [initialVideos]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vertical-videos?limit=${limit}`);
      const data = await res.json();
      if (data.success) {
        setVideos(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching vertical videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = useCallback((video: VerticalVideo) => {
    setShareVideo(video);
  }, []);

  // ---------- RENDER: Loading skeleton (Improvement #1) ----------
  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-b from-[#0a0a0a] to-[#111]">
        <div className="section-container">
          {/* Header skeleton */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slc-border/30 relative overflow-hidden">
                <div className="absolute inset-0 shimmer-gradient" />
              </div>
              <div>
                <div className="h-8 w-28 rounded bg-slc-border/30 relative overflow-hidden mb-2">
                  <div className="absolute inset-0 shimmer-gradient" />
                </div>
                <div className="h-4 w-48 rounded bg-slc-border/20 relative overflow-hidden">
                  <div className="absolute inset-0 shimmer-gradient" />
                </div>
              </div>
            </div>
          </div>

          {/* Shimmer card row */}
          <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-4 lg:grid-cols-5 md:overflow-visible md:pb-0 scrollbar-hide">
            {Array.from({ length: limit }).map((_, i) => (
              <ShimmerCard key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (videos.length === 0) return null;

  // ---------- RENDER: Content ----------
  return (
    <>
      <section className="py-20 bg-gradient-to-b from-[#0a0a0a] to-[#111]">
        <div className="section-container">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-primary/20 border border-primary/30">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-oswald text-3xl md:text-4xl lg:text-5xl uppercase tracking-wide text-white">
                  Reels
                </h2>
              </div>
              <p className="text-gray-400">
                Nuestros videos verticales en formato 9:16
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Modo Inmersivo CTA (Improvement #3) */}
              <Button asChild className="gap-2">
                <Link href="/reels/feed">
                  <PlayCircle className="w-5 h-5" />
                  Modo Inmersivo
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="border-gray-600 text-white hover:bg-white/10"
              >
                <Link href="/reels">
                  Ver todos
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Horizontal scroll on mobile, grid on desktop */}
          <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-4 lg:grid-cols-5 md:overflow-visible md:pb-0 scrollbar-hide">
            {videos.map((video, index) => (
              <VideoCard
                key={video.id}
                video={video}
                index={index}
                onShare={handleShare}
              />
            ))}
          </div>

          {/* Bottom CTAs */}
          {videos.length >= limit && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              {/* Secondary Modo Inmersivo CTA (Improvement #3) */}
              <Button asChild size="lg" className="gap-2">
                <Link href="/reels/feed">
                  <PlayCircle className="w-5 h-5" />
                  Modo Inmersivo
                </Link>
              </Button>
              <p className="text-xs text-gray-500">Desliza como en TikTok</p>

              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-gray-600 text-white hover:bg-white/10"
              >
                <Link href="/reels">
                  Ver todos los Reels
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Share modal (Improvement #4) */}
      {shareVideo && (
        <ShareModal
          video={shareVideo}
          onClose={() => setShareVideo(null)}
        />
      )}
    </>
  );
}
