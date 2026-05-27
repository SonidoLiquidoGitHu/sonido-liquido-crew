"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Music2, ExternalLink, Disc3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Type for artist data from /api/artists/roster
interface RosterArtist {
  id: string;
  name: string;
  slug: string;
  role: string;
  tintColor: string | null;
  profileImageUrl: string | null;
  isFeatured: boolean;
  spotifyId: string | null;
  spotifyUrl: string | null;
  youtubeUrl: string | null;
  youtubeHandle: string | null;
  instagramUrl: string | null;
  instagramHandle: string | null;
  mixcloudUrl: string | null;
  mixcloudHandle: string | null;
  externalProfiles: Array<{
    platform: string;
    externalId: string | null;
    externalUrl: string;
    handle: string | null;
    isVerified: boolean;
  }>;
}

const DEFAULT_COLOR = "#1DB954";

export function DiscographyExplorer() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [artists, setArtists] = useState<RosterArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [artistImages, setArtistImages] = useState<Record<string, string>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const spotifyEmbedRef = useRef<HTMLDivElement>(null);

  // Fetch artist image from Spotify oembed
  const fetchArtistImage = useCallback(async (spotifyId: string): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://open.spotify.com/oembed?url=https://open.spotify.com/artist/${spotifyId}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.thumbnail_url || null;
      }
    } catch (error) {
      console.error(`Failed to fetch image for artist ${spotifyId}:`, error);
    }
    return null;
  }, []);

  // Fetch artists from roster API
  useEffect(() => {
    async function fetchArtists() {
      try {
        const res = await fetch("/api/artists/roster");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.length > 0) {
            setArtists(data.data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch artists:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchArtists();
  }, []);

  // Fetch all artist images from Spotify oembed
  useEffect(() => {
    if (artists.length === 0) return;

    async function fetchAllImages() {
      const images: Record<string, string> = {};

      // Fetch images in parallel
      await Promise.all(
        artists.map(async (artist) => {
          if (artist.spotifyId) {
            const imageUrl = await fetchArtistImage(artist.spotifyId);
            if (imageUrl) {
              images[artist.slug] = imageUrl;
            }
          }
        })
      );

      setArtistImages(images);
    }

    fetchAllImages();
  }, [artists, fetchArtistImage]);

  if (artists.length === 0 && !loading) {
    return null;
  }

  const selectedArtist = artists[selectedIndex];
  const selectedColor = selectedArtist?.tintColor || DEFAULT_COLOR;
  const selectedSpotifyId = selectedArtist?.spotifyId || null;
  const selectedSpotifyUrl = selectedArtist?.spotifyUrl || "#";
  const selectedImage = selectedArtist ? artistImages[selectedArtist.slug] : undefined;

  const handleImageError = (slug: string) => {
    setImageErrors(prev => ({ ...prev, [slug]: true }));
  };

  // Handle artist selection with mobile scroll
  const handleSelectArtist = useCallback((index: number) => {
    setSelectedIndex(index);
    // On mobile, scroll to the Spotify embed
    if (window.innerWidth < 768 && spotifyEmbedRef.current) {
      setTimeout(() => {
        spotifyEmbedRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 100);
    }
  }, []);

  if (loading) {
    return (
      <section className="py-16 md:py-24 bg-[#0a0a0a]">
        <div className="section-container flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#1DB954]" />
        </div>
      </section>
    );
  }

  if (!selectedArtist) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 bg-[#0a0a0a]">
      <div className="section-container">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/30">
            <Disc3 className="w-6 h-6 text-[#1DB954]" />
          </div>
          <h2 className="font-oswald text-3xl md:text-4xl lg:text-5xl uppercase tracking-wide text-white">
            Discografías del Roster
          </h2>
        </div>
        <p className="text-gray-400 mb-10 max-w-2xl">
          Explora la discografía completa de cada artista. Álbumes, EPs, singles y colaboraciones.
        </p>

        {/* Spotify Embed - NOW AT TOP */}
        <div className="mb-8 relative" ref={spotifyEmbedRef}>
          {/* Glow Effect */}
          <div
            className="absolute -inset-2 rounded-2xl opacity-30 blur-xl -z-10"
            style={{ backgroundColor: selectedColor }}
          />

          <div className="relative bg-[#121212] rounded-xl overflow-hidden border border-white/10">
            {/* Artist Header */}
            <div
              className="p-4 border-b border-white/10"
              style={{ background: `linear-gradient(90deg, ${selectedColor}30, transparent)` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Large Profile Image */}
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center font-oswald font-black text-2xl text-white shadow-lg overflow-hidden ring-2 ring-white/20"
                    style={{ backgroundColor: selectedColor }}
                  >
                    {selectedImage && !imageErrors[selectedArtist.slug] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedImage}
                        alt={selectedArtist.name}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(selectedArtist.slug)}
                      />
                    ) : (
                      selectedArtist.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="font-oswald text-2xl text-white uppercase">{selectedArtist.name}</h3>
                    <p className="text-gray-400">{selectedArtist.role}</p>
                  </div>
                </div>
                {selectedSpotifyUrl !== "#" && (
                  <Button
                    asChild
                    className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold"
                  >
                    <a href={selectedSpotifyUrl} target="_blank" rel="noopener noreferrer">
                      <Music2 className="w-4 h-4 mr-2" />
                      Abrir en Spotify
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Spotify Embed */}
            <div className="h-[352px]">
              {selectedSpotifyId ? (
                <iframe
                  src={`https://open.spotify.com/embed/artist/${selectedSpotifyId}?utm_source=generator&theme=0`}
                  title={`Reproductor Spotify de ${selectedArtist.name}`}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-b-xl"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#181818]">
                  <p className="text-gray-500">Spotify no disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Artist List - BELOW PLAYER */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {artists.map((artist, index) => {
            const color = artist.tintColor || DEFAULT_COLOR;
            const artistImage = artistImages[artist.slug];
            const hasImage = artistImage && !imageErrors[artist.slug];
            const isSelected = selectedIndex === index;

            return (
              <button
                key={artist.slug}
                type="button"
                onClick={() => handleSelectArtist(index)}
                className={`
                  flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 touch-manipulation
                  ${isSelected
                    ? "bg-white/10 border-2"
                    : "bg-white/5 hover:bg-white/10 border-2 border-transparent active:bg-white/15"
                  }
                `}
                style={{
                  borderColor: isSelected ? color : "transparent",
                }}
              >
                {/* Artist Image */}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center font-oswald font-bold text-xl shrink-0 overflow-hidden transition-transform hover:scale-105"
                  style={{
                    backgroundColor: hasImage ? undefined : color,
                    boxShadow: isSelected ? `0 0 0 3px #0a0a0a, 0 0 0 5px ${color}` : `0 0 15px ${color}40`,
                  }}
                >
                  {hasImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={artistImage}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(artist.slug)}
                    />
                  ) : (
                    <span className="text-white">{artist.name.charAt(0)}</span>
                  )}
                </div>

                {/* Artist Name */}
                <span className={`text-sm font-medium truncate max-w-full ${isSelected ? "text-white" : "text-gray-400"}`}>
                  {artist.name}
                </span>

                {/* Active Indicator */}
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Access Grid */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <h4 className="text-gray-400 text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
            <Music2 className="w-4 h-4" />
            Acceso rápido a todos los artistas
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {artists.map((artist) => {
              const color = artist.tintColor || DEFAULT_COLOR;
              const spotifyUrl = artist.spotifyUrl || "#";
              const artistImage = artistImages[artist.slug];
              const hasImage = artistImage && !imageErrors[artist.slug];

              return (
                <a
                  key={artist.slug}
                  href={spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-[#1DB954]/20 transition-all duration-300 border border-transparent hover:border-[#1DB954]/30"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-oswald font-bold text-sm text-white shrink-0 group-hover:scale-110 transition-transform overflow-hidden"
                    style={{
                      backgroundColor: hasImage ? undefined : color,
                      boxShadow: `0 0 10px ${color}30`,
                    }}
                  >
                    {hasImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={artistImage}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(artist.slug)}
                      />
                    ) : (
                      artist.name.charAt(0)
                    )}
                  </div>
                  <span className="text-sm text-gray-300 group-hover:text-white truncate">
                    {artist.name}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
