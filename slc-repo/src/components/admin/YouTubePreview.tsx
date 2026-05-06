"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Youtube,
  Play,
  ExternalLink,
  AlertTriangle,
  Loader2,
  X,
  Clock,
  Eye,
  ThumbsUp,
} from "lucide-react";

interface YouTubePreviewProps {
  videoUrl: string | null | undefined;
  showEmbed?: boolean;
  embedHeight?: number;
  className?: string;
  onVideoIdExtracted?: (videoId: string) => void;
}

interface VideoInfo {
  id: string;
  title?: string;
  thumbnail: string;
  embedUrl: string;
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(input: string): string | null {
  if (!input) return null;

  // Already a video ID (11 characters)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) {
    return input.trim();
  }

  // Various YouTube URL patterns
  const patterns = [
    // Standard watch URL
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // Shortened URL
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Embed URL
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    // Mobile URL
    /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    // YouTube Shorts
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    // With additional parameters
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export function YouTubePreview({
  videoUrl,
  showEmbed = true,
  embedHeight = 315,
  className = "",
  onVideoIdExtracted,
}: YouTubePreviewProps) {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    if (!videoUrl) {
      setVideoInfo(null);
      setError(null);
      setShowPlayer(false);
      return;
    }

    const videoId = extractYouTubeId(videoUrl);

    if (!videoId) {
      setError("URL de YouTube no válida");
      setVideoInfo(null);
      return;
    }

    // Notify parent of extracted ID
    onVideoIdExtracted?.(videoId);

    setIsLoading(true);
    setError(null);

    // Build video info from ID
    const info: VideoInfo = {
      id: videoId,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
    };

    // Try to load the high-res thumbnail, fallback to medium quality
    const img = new Image();
    img.onload = () => {
      // maxresdefault might return a placeholder for some videos
      // Check if image is actually valid (not the gray placeholder)
      if (img.naturalWidth <= 120) {
        info.thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
      setVideoInfo(info);
      setIsLoading(false);
    };
    img.onerror = () => {
      info.thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      setVideoInfo(info);
      setIsLoading(false);
    };
    img.src = info.thumbnail;
  }, [videoUrl, onVideoIdExtracted]);

  if (!videoUrl) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-slc-muted">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando preview...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {videoInfo && !isLoading && (
        <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
          {/* Thumbnail or Player */}
          <div className="relative aspect-video bg-black">
            {showPlayer && showEmbed ? (
              <>
                <iframe
                  src={`${videoInfo.embedUrl}?autoplay=1&rel=0`}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white z-10"
                  onClick={() => setShowPlayer(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <img
                  src={videoInfo.thumbnail}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                />
                {/* Play button overlay */}
                <button
                  type="button"
                  onClick={() => setShowPlayer(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
                >
                  <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <Play className="w-8 h-8 text-white ml-1" fill="white" />
                  </div>
                </button>
                {/* YouTube badge */}
                <div className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 bg-black/70 rounded-lg text-white text-sm">
                  <Youtube className="w-4 h-4 text-red-500" />
                  <span>YouTube</span>
                </div>
              </>
            )}
          </div>

          {/* Video info footer */}
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slc-muted">
              <span className="font-mono text-xs bg-slc-card px-2 py-1 rounded">
                ID: {videoInfo.id}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                asChild
              >
                <a
                  href={`https://www.youtube.com/watch?v=${videoInfo.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Abrir en YouTube
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline YouTube preview for forms
export function YouTubeInlinePreview({
  videoUrl,
  className = "",
}: {
  videoUrl: string | null | undefined;
  className?: string;
}) {
  const videoId = videoUrl ? extractYouTubeId(videoUrl) : null;

  if (!videoId) return null;

  return (
    <div className={`mt-2 ${className}`}>
      <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt="Video thumbnail"
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center">
            <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
          </div>
        </div>
        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-black/70 rounded text-xs text-white">
          <Youtube className="w-3 h-3 text-red-500" />
          {videoId}
        </div>
      </div>
    </div>
  );
}

// Export the utility function
export { extractYouTubeId };
