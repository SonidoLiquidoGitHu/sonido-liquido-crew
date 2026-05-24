"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Upload,
  Copy,
  CheckCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { VideoThumbnail } from "@/components/ui/video-thumbnail";
import { cn } from "@/lib/utils";
import {
  getYouTubeId as extractYouTubeId,
  getProxiedThumbnailUrl,
  isYouTubeThumbnailUrl,
  getYouTubeThumbnailFallback,
  getVideoPlaceholderSvg,
  getDirectDropboxUrl,
  getProxiedVideoSrc,
  isDirectVideo as isDirectVideoUtil,
  type VideoLike,
} from "@/lib/video-utils";

// ===========================================
// TYPES
// ===========================================

interface ArtistVideo {
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
}

interface ArtistReelsSectionProps {
  artistId: string;
  artistSlug: string;
  artistName: string;
}

// ===========================================
// HELPERS (imported from @/lib/video-utils)
// ===========================================

/** Check if a video URL is a direct playable video (not an external platform embed) */
function isDirectVideo(videoUrl: string): boolean {
  return (
    videoUrl.includes(".mp4") ||
    videoUrl.includes(".webm") ||
    videoUrl.includes(".mov") ||
    videoUrl.includes("dropbox")
  );
}

// getYouTubeId is now imported as extractYouTubeId
// getVideoThumbnail is imported from @/lib/video-utils

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
// SHIMMER SKELETON CARD (Improvement #3)
// ===========================================

function SkeletonCard() {
  return (
    <div className="shrink-0 w-36 sm:w-44 rounded-xl border border-slc-border bg-slc-card overflow-hidden">
      <div className="aspect-[9/16] relative overflow-hidden bg-slc-dark/80">
        <div className="absolute inset-0 shimmer-gradient" />
      </div>
      <div className="p-2 space-y-1.5">
        <div className="h-3 w-3/4 rounded bg-slc-border/60 relative overflow-hidden">
          <div className="absolute inset-0 shimmer-gradient" />
        </div>
        <div className="h-2 w-1/2 rounded bg-slc-border/60 relative overflow-hidden">
          <div className="absolute inset-0 shimmer-gradient" />
        </div>
      </div>
    </div>
  );
}

function FeaturedSkeletonCard() {
  return (
    <div className="shrink-0 w-72 sm:w-88 rounded-xl border border-slc-border bg-slc-card overflow-hidden">
      <div className="aspect-[9/16] relative overflow-hidden bg-slc-dark/80">
        <div className="absolute inset-0 shimmer-gradient" />
      </div>
      <div className="p-2 space-y-1.5">
        <div className="h-3 w-3/4 rounded bg-slc-border/60 relative overflow-hidden">
          <div className="absolute inset-0 shimmer-gradient" />
        </div>
        <div className="h-2 w-1/2 rounded bg-slc-border/60 relative overflow-hidden">
          <div className="absolute inset-0 shimmer-gradient" />
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
  video: ArtistVideo;
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
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slc-card transition-colors">
            <X className="w-5 h-5 text-slc-muted" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-slc-muted">{video.title || "Video"}</p>

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
                const text = video.title || "Mira este video de Sonido Líquido Crew";
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
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
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
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
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
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
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
// VIDEO CARD (with hover preview + share quick-action)
// Improvements #1 and #4
// ===========================================

function VideoCard({
  video,
  isSpotlight = false,
  onShare,
}: {
  video: ArtistVideo;
  isSpotlight?: boolean;
  onShare: (video: ArtistVideo) => void;
}) {
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const canPreview = isDirectVideo(video.videoUrl);

  const handleMouseEnter = useCallback(() => {
    if (!canPreview) return;

    // Small delay before starting preview to avoid accidental triggers
    hoverTimeoutRef.current = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().then(() => {
          setIsPreviewPlaying(true);
        }).catch(() => {
          // autoplay blocked, ignore
        });
      }
    }, 400);
  }, [canPreview]);

  const handleMouseLeave = useCallback(() => {
    setIsPreviewPlaying(false);

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  const widthClass = isSpotlight
    ? "w-72 sm:w-88"
    : "w-36 sm:w-44";

  return (
    <div
      className={cn(
        "group relative shrink-0 cursor-pointer overflow-hidden rounded-xl bg-slc-card border hover:border-primary/50 transition-all",
        widthClass,
        isSpotlight ? "border-primary/30" : "border-slc-border"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={`/reels/${video.id}`} className="block relative aspect-[9/16]">
        {/* Thumbnail: use VideoThumbnail for reliable display even without explicit thumbnail */}
        {getProxiedThumbnailUrl(video) ? (
          <SafeImage
            src={getProxiedThumbnailUrl(video)!}
            alt={video.title || "Video"}
            fill
            className={cn(
              "object-cover transition-opacity duration-300",
              isPreviewPlaying ? "opacity-0" : "opacity-100"
            )}
            sizes={isSpotlight ? "352px" : "176px"}
            fallbackSrc={(() => {
              const thumb = getProxiedThumbnailUrl(video)!;
              const ytId = extractYouTubeId(video);
              if (ytId && isYouTubeThumbnailUrl(thumb)) {
                return getYouTubeThumbnailFallback(ytId, thumb) || getVideoPlaceholderSvg("9/16");
              }
              return getVideoPlaceholderSvg("9/16");
            })()}
          />
        ) : (
          <VideoThumbnail
            video={video}
            alt={video.title || "Video"}
            fill
            className={cn(
              "transition-opacity duration-300",
              isPreviewPlaying ? "opacity-0" : "opacity-100"
            )}
            sizes={isSpotlight ? "352px" : "176px"}
            aspectRatio="9/16"
          />
        )}

        {/* Inline video preview (Improvement #1) */}
        {canPreview && (
          <video
            ref={videoRef}
            src={getProxiedVideoSrc(video as unknown as VideoLike)}
            muted
            playsInline
            loop
            preload="none"
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
              isPreviewPlaying ? "opacity-100" : "opacity-0"
            )}
          />
        )}

        {/* Preview label (Improvement #1) */}
        {isPreviewPlaying && (
          <div className={cn(
            "absolute left-2 z-20 flex items-center gap-1 px-2 py-0.5 bg-white/90 text-black text-[9px] font-bold rounded-full uppercase tracking-wider",
            video.isFeatured ? "top-9" : "top-2"
          )}>
            <Play className="w-2.5 h-2.5" fill="black" />
            Preview
          </div>
        )}

        {/* Gradient overlay — special for spotlight (Improvement #2) */}
        {isSpotlight ? (
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-primary/10 to-transparent" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        )}

        {/* Play button on hover (hidden during preview) */}
        {!isPreviewPlaying && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
            </div>
          </div>
        )}

        {/* Featured badge (Improvement #2: more prominent for spotlight) */}
        {video.isFeatured && (
          <div className="absolute top-2 left-2 z-10">
            {isSpotlight ? (
              <span className="px-3 py-1 bg-gradient-to-r from-primary to-primary/80 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-lg shadow-primary/30 flex items-center gap-1">
                <span className="text-yellow-300">★</span> Destacado
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-primary text-white text-[9px] font-bold rounded-full uppercase tracking-wider">
                ★ Destacado
              </span>
            )}
          </div>
        )}

        {/* Platform badge */}
        <div className="absolute top-2 right-2 z-10">
          <PlatformBadge platform={video.platform} />
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10">
          {video.title && (
            <h3
              className={cn(
                "font-oswald text-white uppercase line-clamp-1",
                isSpotlight ? "text-sm" : "text-xs"
              )}
            >
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
      </Link>

      {/* Share quick-action button (Improvement #4) */}
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
  );
}

// ===========================================
// EMPTY STATE (Improvement #6)
// ===========================================

function EmptyState({ artistName }: { artistName: string }) {
  return (
    <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slc-border bg-slc-card/30">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slc-dark/50 mb-4">
        <Smartphone className="w-7 h-7 text-slc-muted" />
      </div>
      <h3 className="font-oswald text-lg uppercase text-white/80 mb-1">
        Sin Reels todavía
      </h3>
      <p className="text-sm text-slc-muted mb-4 max-w-xs mx-auto">
        Aún no hay videos verticales de {artistName}. ¡Pronto se añadirán nuevos reels!
      </p>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="border-slc-border text-slc-muted hover:text-white hover:bg-white/5"
      >
        <Link href="/admin/vertical-videos">
          <Upload className="w-3.5 h-3.5 mr-1.5" />
          Subir Reels
        </Link>
      </Button>
    </div>
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
  const [shareVideo, setShareVideo] = useState<ArtistVideo | null>(null);

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

  // Handle share action from cards
  const handleShare = useCallback((video: ArtistVideo) => {
    setShareVideo(video);
  }, []);

  // Determine if the first video should be shown as a spotlight (Improvement #2)
  const hasFeaturedSpotlight = videos.length > 0 && videos[0].isFeatured;

  return (
    <>
      <section className="mb-16">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/15 border border-primary/20">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-oswald text-2xl uppercase tracking-wide text-white leading-none">
                  Reels
                </h2>
                {/* Video count badge (Improvement #5) */}
                {!loading && total > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary/20 border border-primary/30 text-[10px] font-bold text-primary">
                    {total}
                  </span>
                )}
              </div>
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

        {/* Loading skeleton with shimmer (Improvement #3) */}
        {loading && (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            <FeaturedSkeletonCard />
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty state (Improvement #6) */}
        {!loading && videos.length === 0 && (
          <EmptyState artistName={artistName} />
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
            {videos.map((video, index) => (
              <VideoCard
                key={video.id}
                video={video}
                isSpotlight={hasFeaturedSpotlight && index === 0}
                onShare={handleShare}
              />
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

      {/* Share modal (Improvement #4) */}
      {shareVideo && (
        <ShareModal video={shareVideo} onClose={() => setShareVideo(null)} />
      )}
    </>
  );
}
