"use client";

import { useState, useEffect, useRef } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Play, ChevronLeft, ChevronRight, RefreshCw, Youtube, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RandomVideo {
  id: string;
  title: string;
  description: string | null;
  youtubeId: string;
  youtubeUrl: string;
  thumbnailUrl: string | null;
  duration: number | null;
  viewCount: number | null;
  artistName: string | null;
  artistSlug: string | null;
}

interface RandomVideoCarouselProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showRefreshButton?: boolean;
}

export function RandomVideoCarousel({
  title = "Videos del Crew",
  subtitle = "Explora contenido aleatorio de los artistas",
  limit = 6,
  autoPlay = false,
  autoPlayInterval = 5000,
  showRefreshButton = true,
}: RandomVideoCarouselProps) {
  const [videos, setVideos] = useState<RandomVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<RandomVideo | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const fetchRandomVideos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/videos/random?limit=${limit}`);
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setVideos(data.data);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error("Failed to fetch random videos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomVideos();
  }, [limit]);

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || videos.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % videos.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, videos.length]);

  const scrollToIndex = (index: number) => {
    setCurrentIndex(index);
    if (carouselRef.current) {
      const scrollWidth = carouselRef.current.scrollWidth;
      const itemWidth = scrollWidth / videos.length;
      carouselRef.current.scrollTo({
        left: itemWidth * index,
        behavior: "smooth",
      });
    }
  };

  const handlePrevious = () => {
    const newIndex = currentIndex === 0 ? videos.length - 1 : currentIndex - 1;
    scrollToIndex(newIndex);
  };

  const handleNext = () => {
    const newIndex = (currentIndex + 1) % videos.length;
    scrollToIndex(newIndex);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatViews = (views: number | null) => {
    if (!views) return "";
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-slc-black">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
          </div>
        </div>
      </section>
    );
  }

  if (videos.length === 0) {
    return null; // Don't render if no videos
  }

  return (
    <section className="py-16 bg-gradient-to-b from-slc-black via-slc-dark to-slc-black">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-red-500 text-sm uppercase tracking-wider mb-2">
              <Youtube className="w-4 h-4" />
              <span>Contenido Aleatorio</span>
            </div>
            <h2 className="font-oswald text-3xl md:text-4xl uppercase">{title}</h2>
            {subtitle && <p className="text-slc-muted mt-2">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2">
            {showRefreshButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRandomVideos}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Cargar otros
              </Button>
            )}

            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevious}
                disabled={videos.length <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNext}
                disabled={videos.length <= 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Video Modal */}
        {selectedVideo && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setSelectedVideo(null)}
          >
            <div
              className="w-full max-w-4xl aspect-video"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                title={selectedVideo.title}
                className="w-full h-full rounded-xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Carousel */}
        <div
          ref={carouselRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {videos.map((video, index) => (
            <div
              key={video.id}
              className={cn(
                "flex-shrink-0 w-[300px] md:w-[350px] snap-start transition-all duration-300",
                currentIndex === index ? "scale-100 opacity-100" : "scale-95 opacity-70"
              )}
            >
              <div
                className="group relative rounded-xl overflow-hidden bg-slc-card border border-slc-border hover:border-red-500/50 transition-all cursor-pointer"
                onClick={() => setSelectedVideo(video)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video">
                  {video.thumbnailUrl ? (
                    <SafeImage
                      src={video.thumbnailUrl}
                      alt={video.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-slc-dark flex items-center justify-center">
                      <Youtube className="w-12 h-12 text-slc-muted" />
                    </div>
                  )}

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform">
                      <Play className="w-8 h-8 text-white ml-1" fill="white" />
                    </div>
                  </div>

                  {/* Duration Badge */}
                  {video.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded">
                      {formatDuration(video.duration)}
                    </div>
                  )}

                  {/* Views Badge */}
                  {video.viewCount && (
                    <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                      </svg>
                      {formatViews(video.viewCount)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-red-400 transition-colors">
                    {video.title}
                  </h3>

                  {video.artistName && (
                    <Link
                      href={`/artistas/${video.artistSlug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-slc-muted hover:text-red-400 transition-colors"
                    >
                      {video.artistName}
                    </Link>
                  )}


                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Dots */}
        {videos.length > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {videos.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToIndex(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  currentIndex === index
                    ? "bg-red-500 w-6"
                    : "bg-slc-muted/30 hover:bg-slc-muted/50"
                )}
              />
            ))}
          </div>
        )}

        {/* View All Link */}
        <div className="text-center mt-8">
          <Link
            href="/videos"
            className="inline-flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors"
          >
            Ver todos los videos
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default RandomVideoCarousel;
