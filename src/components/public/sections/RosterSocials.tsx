"use client";

import { useState, useEffect, useCallback } from "react";
import { Instagram, Youtube, Music2, Loader2, Radio } from "lucide-react";

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

const DEFAULT_COLOR = "#666666";

export function RosterSocials() {
  const [rosterData, setRosterData] = useState<RosterArtist[]>([]);
  const [artistImages, setArtistImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Fetch roster data from API
  useEffect(() => {
    async function fetchRoster() {
      try {
        const res = await fetch("/api/artists/roster");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.length > 0) {
            setRosterData(data.data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch roster data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchRoster();
  }, []);

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

  // Fetch all artist images from Spotify oembed
  useEffect(() => {
    if (rosterData.length === 0) return;

    async function fetchAllImages() {
      const images: Record<string, string> = {};

      // Fetch images in parallel
      await Promise.all(
        rosterData.map(async (artist) => {
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
  }, [rosterData, fetchArtistImage]);

  // Handle image error
  const handleImageError = (slug: string) => {
    setImageErrors(prev => ({ ...prev, [slug]: true }));
  };

  if (loading) {
    return (
      <section className="py-16 md:py-20 bg-gradient-to-b from-[#111] to-[#0a0a0a]">
        <div className="section-container flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (rosterData.length === 0) {
    return null;
  }

  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-[#111] to-[#0a0a0a]">
      <div className="section-container">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-oswald text-3xl md:text-4xl lg:text-5xl uppercase tracking-wide text-white mb-4">
            Conecta con el Roster
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Sigue a todos los artistas de Sonido Líquido Crew en sus redes sociales
          </p>
        </div>

        {/* Artist Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {rosterData.map((artist) => {
            const profileImage = artistImages[artist.slug];
            const hasImage = profileImage && !imageErrors[artist.slug];
            const color = artist.tintColor || DEFAULT_COLOR;

            return (
              <div
                key={artist.slug}
                className="group relative bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300"
              >
                {/* Artist Profile Image */}
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center font-oswald font-bold text-xl text-white mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform overflow-hidden"
                  style={{
                    backgroundColor: hasImage ? undefined : color,
                    boxShadow: `0 0 0 3px #0a0a0a, 0 0 0 5px ${color}`,
                  }}
                >
                  {hasImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileImage}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(artist.slug)}
                    />
                  ) : (
                    <span className="text-2xl font-bold drop-shadow-md">
                      {artist.name.charAt(0)}
                    </span>
                  )}
                </div>

                {/* Name */}
                <h4 className="font-medium text-white text-center text-sm mb-3 truncate">
                  {artist.name}
                </h4>

                {/* Social Links */}
                <div className="flex justify-center gap-2 flex-wrap">
                  {artist.instagramUrl && (
                    <a
                      href={artist.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 hover:scale-110 transition-transform"
                      aria-label={`Instagram de ${artist.name}`}
                    >
                      <Instagram className="w-4 h-4 text-white" />
                    </a>
                  )}
                  {artist.youtubeUrl && (
                    <a
                      href={artist.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-red-600 hover:bg-red-500 hover:scale-110 transition-all"
                      aria-label={`YouTube de ${artist.name}`}
                    >
                      <Youtube className="w-4 h-4 text-white" />
                    </a>
                  )}
                  {artist.spotifyUrl && (
                    <a
                      href={artist.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] hover:scale-110 transition-all"
                      aria-label={`Spotify de ${artist.name}`}
                    >
                      <Music2 className="w-4 h-4 text-white" />
                    </a>
                  )}
                  {artist.mixcloudUrl && (
                    <a
                      href={artist.mixcloudUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-[#5000FF] hover:bg-[#6a33ff] hover:scale-110 transition-all"
                      aria-label={`Mixcloud de ${artist.name}`}
                    >
                      <Radio className="w-4 h-4 text-white" />
                    </a>
                  )}
                </div>

                {/* Hover Glow Effect */}
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"
                  style={{ backgroundColor: color }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
