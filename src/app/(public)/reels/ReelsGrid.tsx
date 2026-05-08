"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Share2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  CheckCircle,
  Smartphone,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { YouTubeEmbed } from "@/components/public/embeds/YouTubeEmbed";

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

interface ReelsGridProps {
  videos: ReelVideo[];
}

export function ReelsGrid({ videos }: ReelsGridProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [shareModalIndex, setShareModalIndex] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [playingIds, setPlayingIds] = useState<Set<string>>(new Set());
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  if (videos.length === 0) {
    return (
      <div className="text-center py-20">
        <Smartphone className="w-16 h-16 text-slc-muted mx-auto mb-4" />
        <h3 className="text-xl font-oswald uppercase mb-2">No hay Reels todavía</h3>
        <p className="text-slc-muted">Pronto subiremos videos verticales</p>
      </div>
    );
  }

  const openReel = (index: number) => setActiveIndex(index);
  const closeReel = () => setActiveIndex(null);
  const nextReel = () => {
    if (activeIndex !== null) setActiveIndex((activeIndex + 1) % videos.length);
  };
  const prevReel = () => {
    if (activeIndex !== null) setActiveIndex((activeIndex - 1 + videos.length) % videos.length);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeIndex === null) return;
      if (e.key === "Escape") closeReel();
      if (e.key === "ArrowRight") nextReel();
      if (e.key === "ArrowLeft") prevReel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex]);

  // Track share
  const trackShare = async (videoId: string, platform: string) => {
    try {
      await fetch(`/api/vertical-videos/${videoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
    } catch {}
  };

  // Copy share link
  const copyLink = async (videoId: string) => {
    const url = `${window.location.origin}/reels/${videoId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopiedLink(true);
    trackShare(videoId, "copy");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Native share
  const nativeShare = async (video: ReelVideo) => {
    const url = `${window.location.origin}/reels/${video.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title || "Sonido Líquido Crew",
          text: video.description || video.title || "Mira este video de Sonido Líquido Crew",
          url,
        });
        trackShare(video.id, "native");
      } catch {}
    } else {
      copyLink(video.id);
    }
  };

  // Get platform icon
  const getPlatformIcon = (platform: string | null) => {
    switch (platform?.toLowerCase()) {
      case "youtube":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        );
      case "tiktok":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
          </svg>
        );
      case "instagram":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
          </svg>
        );
      default:
        return <Smartphone className="w-4 h-4" />;
    }
  };

  // Check if a video is a YouTube short (can be embedded)
  const isYouTubeShort = (video: ReelVideo) => {
    return video.platform?.toLowerCase() === "youtube" || video.embedUrl;
  };

  // Get YouTube video ID from embed URL
  const getYouTubeId = (video: ReelVideo) => {
    if (video.embedUrl) {
      const match = video.embedUrl.match(/embed\/([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
    }
    if (video.platformUrl) {
      const match = video.platformUrl.match(/(?:shorts\/|watch\?v=)([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
    }
    if (video.videoUrl) {
      const match = video.videoUrl.match(/(?:shorts\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
    }
    return null;
  };

  return (
    <>
      {/* Grid of phone-shaped cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {videos.map((video, index) => (
          <div
            key={video.id}
            onClick={() => openReel(index)}
            className="group relative cursor-pointer overflow-hidden rounded-xl bg-slc-card border border-slc-border hover:border-primary/50 transition-all"
          >
            <div className="relative aspect-[9/16]">
              {video.thumbnailUrl ? (
                <Image
                  src={video.thumbnailUrl}
                  alt={video.title || "Video"}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slc-card to-slc-dark flex items-center justify-center">
                  <Play className="w-12 h-12 text-slc-border" />
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Play button */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play className="w-7 h-7 text-white ml-0.5" fill="white" />
                </div>
              </div>

              {/* Featured badge */}
              {video.isFeatured && (
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-1 bg-primary text-white text-xs rounded-full">
                    Destacado
                  </span>
                </div>
              )}

              {/* Platform badge */}
              {video.platform && (
                <div className="absolute top-2 right-2">
                  <div className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white">
                    {getPlatformIcon(video.platform)}
                  </div>
                </div>
              )}

              {/* Share button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShareModalIndex(index);
                }}
                className="absolute bottom-14 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary"
              >
                <Share2 className="w-4 h-4" />
              </button>

              {/* Info overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                {video.artistName && (
                  <Link
                    href={`/artistas/${video.artistSlug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-primary hover:underline"
                  >
                    {video.artistName}
                  </Link>
                )}
                {video.title && (
                  <h3 className="font-oswald text-sm text-white uppercase line-clamp-2 mt-0.5">
                    {video.title}
                  </h3>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-white/60">
                  <span className="flex items-center gap-0.5">
                    <Eye className="w-3 h-3" /> {video.viewCount}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Share2 className="w-3 h-3" /> {video.shareCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full-screen Reel Viewer */}
      {activeIndex !== null && videos[activeIndex] && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={closeReel}
        >
          {/* Close */}
          <button
            onClick={closeReel}
            className="absolute top-4 right-4 z-10 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Navigation */}
          <button
            onClick={(e) => { e.stopPropagation(); prevReel(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); nextReel(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>

          {/* Video Content */}
          <div
            className="relative max-h-[90vh] w-full max-w-sm aspect-[9/16]"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const video = videos[activeIndex];
              const ytId = getYouTubeId(video);
              if (ytId) {
                return (
                  <div className="w-full h-full rounded-xl overflow-hidden">
                    <YouTubeEmbed videoId={ytId} autoplay />
                  </div>
                );
              }
              if (video.videoUrl && (video.videoUrl.includes(".mp4") || video.videoUrl.includes(".webm") || video.videoUrl.includes("dropbox"))) {
                return (
                  <video
                    src={video.videoUrl}
                    className="w-full h-full object-contain rounded-xl"
                    controls
                    autoPlay
                    playsInline
                    loop
                  />
                );
              }
              // Fallback: show thumbnail with play link
              return (
                <div className="w-full h-full relative rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  {video.thumbnailUrl && (
                    <Image src={video.thumbnailUrl} alt={video.title || "Video"} fill className="object-cover" />
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
              );
            })()}
          </div>

          {/* Video Info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="max-w-sm mx-auto">
              {videos[activeIndex].artistName && (
                <Link
                  href={`/artistas/${videos[activeIndex].artistSlug}`}
                  className="text-sm text-primary hover:underline"
                >
                  {videos[activeIndex].artistName}
                </Link>
              )}
              {videos[activeIndex].title && (
                <h3 className="font-oswald text-lg text-white uppercase">
                  {videos[activeIndex].title}
                </h3>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-white/60">
                  {activeIndex + 1} / {videos.length}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nativeShare(videos[activeIndex]);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full hover:bg-white/20 text-white text-sm transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Compartir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareModalIndex !== null && videos[shareModalIndex] && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => { setShareModalIndex(null); setCopiedLink(false); }}
        >
          <div
            className="bg-slc-dark border border-slc-border rounded-xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slc-border">
              <h2 className="font-oswald text-lg uppercase flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Compartir
              </h2>
              <button onClick={() => { setShareModalIndex(null); setCopiedLink(false); }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slc-muted">{videos[shareModalIndex].title || "Video"}</p>

              {/* Copy link */}
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2.5 bg-slc-card border border-slc-border rounded-lg text-xs truncate">
                  {typeof window !== "undefined" ? `${window.location.origin}/reels/${videos[shareModalIndex].id}` : `/reels/${videos[shareModalIndex].id}`}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyLink(videos[shareModalIndex].id)}
                >
                  {copiedLink ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              {/* Social buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={async () => {
                    const url = `${window.location.origin}/reels/${videos[shareModalIndex].id}`;
                    const text = videos[shareModalIndex].title || "Mira este video de Sonido Líquido Crew";
                    if (navigator.share) {
                      try { await navigator.share({ title: text, url }); } catch {}
                    } else {
                      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`);
                    }
                    trackShare(videos[shareModalIndex].id, "whatsapp");
                  }}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => {
                    const url = `${window.location.origin}/reels/${videos[shareModalIndex].id}`;
                    const text = videos[shareModalIndex].title || "Mira este video";
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
                    trackShare(videos[shareModalIndex].id, "twitter");
                  }}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  X / Twitter
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => {
                    const url = `${window.location.origin}/reels/${videos[shareModalIndex].id}`;
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
                    trackShare(videos[shareModalIndex].id, "facebook");
                  }}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => nativeShare(videos[shareModalIndex])}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Más
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
