"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Play,
  Share2,
  Eye,
  Smartphone,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VerticalVideo {
  id: string;
  title: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  platform: string | null;
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

export function VerticalVideoSection({ initialVideos, limit = 8 }: VerticalVideoSectionProps) {
  const [videos, setVideos] = useState<VerticalVideo[]>(initialVideos || []);
  const [loading, setLoading] = useState(!initialVideos);

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

  if (loading) {
    return (
      <section className="py-20 bg-gradient-to-b from-[#0a0a0a] to-[#111]">
        <div className="section-container flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (videos.length === 0) return null;

  return (
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
          <Button asChild variant="outline" className="shrink-0 border-gray-600 text-white hover:bg-white/10">
            <Link href="/reels">
              Ver todos
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-4 lg:grid-cols-5 md:overflow-visible md:pb-0 scrollbar-hide">
          {videos.map((video) => (
            <Link
              key={video.id}
              href={`/reels/${video.id}`}
              className="group relative shrink-0 w-44 md:w-auto cursor-pointer overflow-hidden rounded-xl bg-slc-card border border-slc-border hover:border-primary/50 transition-all"
            >
              <div className="relative aspect-[9/16]">
                {video.thumbnailUrl ? (
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title || "Video"}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 176px, (max-width: 1024px) 25vw, 20vw"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slc-card to-slc-dark flex items-center justify-center">
                    <Play className="w-10 h-10 text-slc-border" />
                  </div>
                )}

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
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 bg-primary text-white text-[10px] rounded-full">
                      Destacado
                    </span>
                  </div>
                )}

                {/* Platform badge */}
                {video.platform && (
                  <div className="absolute top-2 right-2">
                    <div className="px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white capitalize">
                      {video.platform}
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  {video.artistName && (
                    <p className="text-[10px] text-primary truncate">{video.artistName}</p>
                  )}
                  {video.title && (
                    <h3 className="font-oswald text-xs text-white uppercase line-clamp-1 mt-0.5">
                      {video.title}
                    </h3>
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
              </div>
            </Link>
          ))}
        </div>

        {/* View more */}
        {videos.length >= limit && (
          <div className="text-center mt-10">
            <Button asChild size="lg" variant="outline" className="border-gray-600 text-white hover:bg-white/10">
              <Link href="/reels">
                Ver todos los Reels
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
