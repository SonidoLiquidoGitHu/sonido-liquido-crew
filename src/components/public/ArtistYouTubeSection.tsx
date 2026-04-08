"use client";

import { useState, useEffect } from "react";
import { Youtube, Play, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Video {
  id: string;
  title: string;
  youtubeId: string;
  thumbnailUrl?: string;
  viewCount?: number;
  publishedAt?: string;
}

interface ArtistYouTubeSectionProps {
  artistName: string;
  artistSlug: string;
  channelUrl?: string;
  channelHandle?: string;
  maxVideos?: number;
}

export function ArtistYouTubeSection({
  artistName,
  artistSlug,
  channelUrl,
  channelHandle,
  maxVideos = 4,
}: ArtistYouTubeSectionProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVideos() {
      try {
        // Fetch videos associated with this artist from the database
        const response = await fetch(`/api/videos?artistSlug=${artistSlug}&limit=${maxVideos}`);
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            setVideos(data.data);
          }
        }
      } catch (err) {
        console.error("Error fetching videos:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
  }, [artistSlug, maxVideos]);

  if (loading) {
    return (
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <Youtube className="w-6 h-6 text-red-500" />
          <h2 className="font-oswald text-2xl uppercase">Videos</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      </section>
    );
  }

  // If no videos found in database, show channel link card
  if (videos.length === 0 && channelUrl) {
    return (
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-oswald text-2xl uppercase flex items-center gap-3">
            <Youtube className="w-6 h-6 text-red-500" />
            Videos de YouTube
          </h2>
        </div>
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center justify-between gap-4 p-5 bg-gradient-to-r from-red-900/20 via-red-900/10 to-transparent border border-white/10 rounded-xl hover:border-red-500/50 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Youtube className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-oswald text-lg uppercase text-white group-hover:text-red-400 transition-colors">
                Canal de YouTube
              </h3>
              <p className="text-sm text-gray-400">{channelHandle || artistName}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-red-500/50 text-red-400 hover:bg-red-500/20 group-hover:border-red-400"
          >
            <Play className="w-4 h-4 mr-2" fill="currentColor" />
            Ver Canal
            <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
          </Button>
        </a>
      </section>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-oswald text-2xl uppercase flex items-center gap-3">
          <Youtube className="w-6 h-6 text-red-500" />
          Videos
        </h2>
        {channelUrl && (
          <Button asChild variant="ghost" size="sm" className="text-red-500 hover:text-red-400">
            <a href={channelUrl} target="_blank" rel="noopener noreferrer">
              Ver todos en YouTube
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videos.map((video) => (
          <div
            key={video.id}
            className="bg-slc-card border border-slc-border rounded-xl overflow-hidden group"
          >
            {playingVideoId === video.youtubeId ? (
              // Show embedded player
              <div className="aspect-video">
                <iframe
                  src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={video.title}
                  className="w-full h-full"
                />
              </div>
            ) : (
              // Show thumbnail with play button
              <button
                onClick={() => setPlayingVideoId(video.youtubeId)}
                className="relative aspect-video w-full cursor-pointer"
              >
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <img
                    src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                  <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                    <Play className="w-8 h-8 text-white ml-1" fill="white" />
                  </div>
                </div>
              </button>
            )}
            {/* Video info */}
            <div className="p-4">
              <h3 className="font-medium text-white line-clamp-2 group-hover:text-red-400 transition-colors">
                {video.title}
              </h3>
              {video.viewCount && (
                <p className="text-sm text-gray-500 mt-1">
                  {video.viewCount.toLocaleString()} vistas
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
