"use client";

import { useState, useEffect } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Disc3, Play, ExternalLink, Calendar, Clock, Music2, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Album {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  release_date: string;
  album_type: "album" | "single" | "compilation";
  total_tracks: number;
  external_urls: { spotify: string };
}

interface ArtistDiscographyProps {
  spotifyId: string;
  artistName: string;
  artistSlug: string;
  showFullPage?: boolean;
}

const releaseTypeLabels: Record<string, string> = {
  album: "Álbumes",
  single: "Singles",
  compilation: "Compilaciones",
  all: "Todos",
};

const releaseTypeColors: Record<string, string> = {
  album: "bg-purple-500",
  single: "bg-green-500",
  compilation: "bg-blue-500",
};

export function ArtistDiscography({
  spotifyId,
  artistName,
  artistSlug,
  showFullPage = false,
}: ArtistDiscographyProps) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<"all" | "album" | "single" | "compilation">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    fetchDiscography();
  }, [spotifyId]);

  const fetchDiscography = async () => {
    setLoading(true);
    setError(false);

    try {
      // Use Spotify's oEmbed and browse endpoints
      const response = await fetch(
        `https://api.spotify.com/v1/artists/${spotifyId}/albums?include_groups=album,single,compilation&market=MX&limit=50`,
        {
          headers: {
            // Note: This requires a valid Spotify access token
            // For now, we'll use the embed approach instead
          },
        }
      );

      // Since we don't have direct API access, use alternative approach
      // Fetch from our own API that uses stored data
      const localResponse = await fetch(`/api/artists/${artistSlug}/releases`);

      if (localResponse.ok) {
        const data = await localResponse.json();
        if (data.success && data.data) {
          setAlbums(data.data.map((r: any) => ({
            id: r.spotifyId || r.id,
            name: r.title,
            images: [{ url: r.coverImageUrl, width: 300, height: 300 }],
            release_date: r.releaseDate,
            album_type: r.releaseType || "album",
            total_tracks: r.trackCount || 1,
            external_urls: { spotify: r.spotifyUrl },
          })));
        }
      }
    } catch (err) {
      console.error("Error fetching discography:", err);
      // Don't set error - we'll show the Spotify embed fallback
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort albums
  const filteredAlbums = albums
    .filter((album) => filter === "all" || album.album_type === filter)
    .sort((a, b) => {
      const dateA = new Date(a.release_date).getTime();
      const dateB = new Date(b.release_date).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

  // Group by year
  const albumsByYear = filteredAlbums.reduce((acc, album) => {
    const year = new Date(album.release_date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(album);
    return acc;
  }, {} as Record<number, Album[]>);

  const years = Object.keys(albumsByYear)
    .map(Number)
    .sort((a, b) => (sortBy === "newest" ? b - a : a - b));

  // Stats
  const stats = {
    total: albums.length,
    albums: albums.filter((a) => a.album_type === "album").length,
    singles: albums.filter((a) => a.album_type === "single").length,
    compilations: albums.filter((a) => a.album_type === "compilation").length,
  };

  return (
    <div className={cn("relative", showFullPage ? "min-h-screen" : "")}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-primary/20 border border-primary/30">
              <Disc3 className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-oswald text-2xl md:text-3xl uppercase text-white">
              Discografía
            </h2>
          </div>
          {!loading && albums.length > 0 && (
            <p className="text-gray-400">
              {stats.total} lanzamientos • {stats.albums} álbumes • {stats.singles} singles
            </p>
          )}
        </div>

        {/* Filters */}
        {albums.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(["all", "album", "single", "compilation"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  filter === type
                    ? "bg-primary text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                )}
              >
                {releaseTypeLabels[type]}
                {type !== "all" && (
                  <span className="ml-1 opacity-60">
                    ({type === "album" ? stats.albums : type === "single" ? stats.singles : stats.compilations})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State - Show Spotify Embed */}
      {!loading && albums.length === 0 && (
        <div className="bg-slc-card border border-slc-border rounded-xl overflow-hidden">
          {/* Spotify Artist Discography Embed */}
          <iframe
            src={`https://open.spotify.com/embed/artist/${spotifyId}?utm_source=generator&theme=0`}
            width="100%"
            height="400"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl"
          />

          <div className="p-6 text-center border-t border-slc-border">
            <p className="text-gray-400 mb-4">
              Escucha toda la discografía de {artistName} en Spotify
            </p>
            <Button asChild className="bg-spotify hover:bg-spotify/90">
              <a
                href={`https://open.spotify.com/artist/${spotifyId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Music2 className="w-4 h-4 mr-2" />
                Ver en Spotify
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      )}

      {/* Albums Grid */}
      {!loading && albums.length > 0 && (
        <div className="space-y-12">
          {years.map((year) => (
            <div key={year}>
              {/* Year Header */}
              <div className="flex items-center gap-4 mb-6">
                <span className="font-oswald text-4xl text-primary">{year}</span>
                <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent" />
                <span className="text-sm text-gray-500">
                  {albumsByYear[year].length} lanzamiento{albumsByYear[year].length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Albums Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {albumsByYear[year].map((album) => (
                  <a
                    key={album.id}
                    href={album.external_urls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative"
                  >
                    {/* Album Cover */}
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-slc-card mb-3">
                      {album.images[0]?.url ? (
                        <SafeImage
                          src={album.images[0].url}
                          alt={album.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slc-card to-slc-border">
                          <Disc3 className="w-12 h-12 text-slc-muted" />
                        </div>
                      )}

                      {/* Play Overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-spotify flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform">
                          <Play className="w-6 h-6 text-white ml-1" fill="white" />
                        </div>
                      </div>

                      {/* Type Badge */}
                      <div className="absolute top-2 left-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-medium uppercase",
                            releaseTypeColors[album.album_type] || "bg-gray-500"
                          )}
                        >
                          {album.album_type === "album"
                            ? "Álbum"
                            : album.album_type === "single"
                            ? "Single"
                            : "Compilación"}
                        </span>
                      </div>
                    </div>

                    {/* Album Info */}
                    <h3 className="font-medium text-white text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {album.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{new Date(album.release_date).getFullYear()}</span>
                      {album.total_tracks > 1 && (
                        <>
                          <span>•</span>
                          <span>{album.total_tracks} tracks</span>
                        </>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Spotify CTA */}
      {!loading && albums.length > 0 && (
        <div className="mt-12 text-center">
          <Button asChild size="lg" className="bg-spotify hover:bg-spotify/90">
            <a
              href={`https://open.spotify.com/artist/${spotifyId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Music2 className="w-5 h-5 mr-2" />
              Escuchar en Spotify
              <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
