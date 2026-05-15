"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Share2,
  Eye,
  Copy,
  CheckCircle,
  Play,
  Smartphone,
  ArrowLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { YouTubeEmbed } from "@/components/public/embeds/YouTubeEmbed";
import {
  getYouTubeId,
  getProxiedThumbnailUrl,
  isYouTubeThumbnailUrl,
  getYouTubeThumbnailFallback,
  getVideoPlaceholderSvg,
  isDirectVideo,
  getVideoSrc,
  getProxiedVideoSrc,
} from "@/lib/video-utils";

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

interface ReelDetailProps {
  video: ReelVideo;
}

export function ReelDetail({ video }: ReelDetailProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const trackShare = async (platform: string) => {
    try {
      await fetch(`/api/vertical-videos/${video.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
    } catch {}
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/reels/${video.id}`;
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
    trackShare("copy");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const nativeShare = async () => {
    const url = `${window.location.origin}/reels/${video.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: video.title || "Sonido Líquido Crew",
          text: video.description || video.title || "Mira este video de Sonido Líquido Crew",
          url,
        });
        trackShare("native");
      } catch {}
    } else {
      copyLink();
    }
  };

  // Use shared YouTube ID extraction utility
  const ytId = getYouTubeId(video);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center py-8 px-4">
      {/* Back button */}
      <div className="w-full max-w-sm mb-4">
        <Link
          href="/reels"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Reels
        </Link>
      </div>

      {/* Video container - 9:16 aspect ratio */}
      <div className="relative w-full max-w-sm aspect-[9/16] rounded-xl overflow-hidden bg-black">
        {ytId ? (
          <YouTubeEmbed videoId={ytId} autoplay />
        ) : isDirectVideo(video) ? (
          <video
            src={getProxiedVideoSrc(video)}
            className="w-full h-full object-contain"
            controls
            autoPlay
            playsInline
            loop
            preload="auto"
            poster={getProxiedThumbnailUrl(video) || undefined}
          />
        ) : (
          <div className="w-full h-full relative flex items-center justify-center">
            {getProxiedThumbnailUrl(video) && (
              <SafeImage
                src={getProxiedThumbnailUrl(video)!}
                alt={video.title || "Video"}
                fill
                className="object-cover"
                fallbackSrc={(() => {
                  const thumb = getProxiedThumbnailUrl(video)!;
                  if (ytId && isYouTubeThumbnailUrl(thumb)) {
                    return getYouTubeThumbnailFallback(ytId, thumb) || getVideoPlaceholderSvg("9/16");
                  }
                  return getVideoPlaceholderSvg("9/16");
                })()}
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

      {/* Video info */}
      <div className="w-full max-w-sm mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {video.artistName && (
              <Link
                href={`/artistas/${video.artistSlug}`}
                className="text-sm text-primary hover:underline"
              >
                {video.artistName}
              </Link>
            )}
            {video.title && (
              <h1 className="font-oswald text-lg text-white uppercase">{video.title}</h1>
            )}
            {video.description && (
              <p className="text-sm text-white/60 line-clamp-2">{video.description}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowShareModal(true)}
            className="ml-3 shrink-0"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-white/50">
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" /> {video.viewCount} vistas
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="w-4 h-4" /> {video.shareCount} compartidos
          </span>
        </div>

        {/* Tags */}
        {video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {video.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2.5 py-1 bg-white/10 rounded-full text-xs text-white/70"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Platform link */}
        {video.platformUrl && (
          <a
            href={video.platformUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ver en {video.platform || "plataforma original"}
          </a>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-slc-dark border border-slc-border rounded-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slc-border">
              <h2 className="font-oswald text-lg uppercase flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Compartir
              </h2>
              <button onClick={() => setShowShareModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slc-muted">{video.title || "Video"}</p>

              <div className="flex items-center gap-2">
                <div className="flex-1 p-2.5 bg-slc-card border border-slc-border rounded-lg text-xs truncate">
                  {typeof window !== "undefined" ? `${window.location.origin}/reels/${video.id}` : `/reels/${video.id}`}
                </div>
                <Button variant="outline" size="icon" onClick={copyLink}>
                  {copiedLink ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={async () => {
                    const url = `${window.location.origin}/reels/${video.id}`;
                    const text = video.title || "Mira este video de Sonido Líquido Crew";
                    if (navigator.share) {
                      try { await navigator.share({ title: text, url }); } catch {}
                    } else {
                      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`);
                    }
                    trackShare("whatsapp");
                  }}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => {
                    const url = `${window.location.origin}/reels/${video.id}`;
                    const text = video.title || "Mira este video";
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
                    trackShare("twitter");
                  }}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  X / Twitter
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => {
                    const url = `${window.location.origin}/reels/${video.id}`;
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
                    trackShare("facebook");
                  }}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
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
      )}
    </div>
  );
}
