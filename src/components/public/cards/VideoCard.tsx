"use client";

import { useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { Play, Eye } from "lucide-react";
import { cn, formatNumber, formatDuration } from "@/lib/utils";
import type { Video } from "@/types";
import { YouTubeEmbed } from "../embeds/YouTubeEmbed";

interface VideoCardProps {
  video: Video;
  showEmbed?: boolean;
}

export function VideoCard({ video, showEmbed = false }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (isPlaying || showEmbed) {
    return (
      <div className="aspect-video rounded-xl overflow-hidden bg-slc-card">
        <YouTubeEmbed videoId={video.youtubeId} autoplay={isPlaying} />
      </div>
    );
  }

  return (
    <div
      className="group relative aspect-video rounded-xl overflow-hidden bg-slc-card cursor-pointer"
      onClick={() => setIsPlaying(true)}
    >
      {/* Thumbnail */}
      <div className="absolute inset-0">
        {video.thumbnailUrl ? (
          <SafeImage
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-slc-card flex items-center justify-center">
            <Play className="w-16 h-16 text-slc-border" />
          </div>
        )}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Play Button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-youtube/90 flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:bg-youtube shadow-2xl">
          <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1" fill="white" />
        </div>
      </div>

      {/* Duration Badge */}
      {video.duration && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-black/80 rounded text-xs text-white">
          {formatDuration(video.duration)}
        </div>
      )}

      {/* Video Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-oswald text-sm sm:text-base uppercase tracking-wide text-white line-clamp-2">
          {video.title}
        </h3>
        {video.viewCount && (
          <div className="flex items-center gap-1 mt-2 text-xs text-slc-muted">
            <Eye className="w-3 h-3" />
            <span>{formatNumber(video.viewCount)} vistas</span>
          </div>
        )}
      </div>
    </div>
  );
}
