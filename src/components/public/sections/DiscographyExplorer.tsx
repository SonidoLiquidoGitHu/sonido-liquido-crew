"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Music2, ExternalLink, Disc3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Artist {
  id?: string;
  name: string;
  slug: string;
  role: string;
  spotifyId?: string;
  spotifyUrl?: string;
  profileImageUrl?: string;
}

// Fallback artist data with Spotify info
const fallbackArtists = [
  {
    name: "Zaque",
    slug: "zaque",
    spotifyId: "4WQmw3fIx9F7iPKL5v8SCN",
    spotifyUrl: "https://open.spotify.com/artist/4WQmw3fIx9F7iPKL5v8SCN",
    role: "Fundador / MC",
    color: "#1DB954",
  },
  {
    name: "Doctor Destino",
    slug: "doctor-destino",
    spotifyId: "5urer15JPbCELf17LVia7w",
    spotifyUrl: "https://open.spotify.com/artist/5urer15JPbCELf17LVia7w",
    role: "MC / Productor",
    color: "#D4A520",
  },
  {
    name: "Brez",
    slug: "brez",
    spotifyId: "2jJmTEMkGQfH3BxoG3MQvF",
    spotifyUrl: "https://open.spotify.com/artist/2jJmTEMkGQfH3BxoG3MQvF",
    role: "MC",
    color: "#5A7590",
  },
  {
    name: "Bruno Grasso",
    slug: "bruno-grasso",
    spotifyId: "4fNQqyvcM71IyF2EitEtCj",
    spotifyUrl: "https://open.spotify.com/artist/4fNQqyvcM71IyF2EitEtCj",
    role: "MC / Productor",
    color: "#C09020",
  },
  {
    name: "Dilema",
    slug: "dilema",
    spotifyId: "3eCEorgAoZkvnAQLdy4x38",
    spotifyUrl: "https://open.spotify.com/artist/3eCEorgAoZkvnAQLdy4x38",
    role: "MC",
    color: "#C45A3A",
  },
  {
    name: "Codak",
    slug: "codak",
    spotifyId: "2zrv1oduhIYh29vvQZwI5r",
    spotifyUrl: "https://open.spotify.com/artist/2zrv1oduhIYh29vvQZwI5r",
    role: "MC Fundador",
    color: "#4A4A90",
  },
  {
    name: "Kev Cabrone",
    slug: "kev-cabrone",
    spotifyId: "0QdRhOmiqAcV1dPCoiSIQJ",
    spotifyUrl: "https://open.spotify.com/artist/0QdRhOmiqAcV1dPCoiSIQJ",
    role: "MC",
    color: "#B54A30",
  },
  {
    name: "Hassyel",
    slug: "hassyel",
    spotifyId: "6AN9ek9RwrLbSp9rT2lcDG",
    spotifyUrl: "https://open.spotify.com/artist/6AN9ek9RwrLbSp9rT2lcDG",
    role: "MC",
    color: "#908050",
  },
  {
    name: "X Santa-Ana",
    slug: "x-santa-ana",
    spotifyId: "2Apt0MjZGqXAd1pl4LNQrR",
    spotifyUrl: "https://open.spotify.com/artist/2Apt0MjZGqXAd1pl4LNQrR",
    role: "DJ / Lado B",
    color: "#7A4A4A",
  },
  {
    name: "Fancy Freak",
    slug: "fancy-freak",
    spotifyId: "5TMoczTLclVyzzDY5qf3Yb",
    spotifyUrl: "https://open.spotify.com/artist/5TMoczTLclVyzzDY5qf3Yb",
    role: "DJ / Productor",
    color: "#3A6090",
  },
  {
    name: "Q Master Weed",
    slug: "q-master-weed",
    spotifyId: "4T4Z7jvUcMV16VsslRRuC5",
    spotifyUrl: "https://open.spotify.com/artist/4T4Z7jvUcMV16VsslRRuC5",
    role: "DJ / Productor",
    color: "#4A9070",
  },
  {
    name: "Chas 7P",
    slug: "chas-7p",
    spotifyId: "3RAg8fPmZ8RnacJO8MhLP1",
    spotifyUrl: "https://open.spotify.com/artist/3RAg8fPmZ8RnacJO8MhLP1",
    role: "DJ",
    color: "#8A4A7A",
  },
  {
    name: "Reick One",
    slug: "reick-one",
    spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ",
    spotifyUrl: "https://open.spotify.com/artist/4UqFXhJVb9zy2SbNx4ycJQ",
    role: "DJ / Productor",
    color: "#4A8A60",
  },
  {
    name: "Latin Geisha",
    slug: "latin-geisha",
    spotifyId: "16YScXC67nAnFDcA2LGdY0",
    spotifyUrl: "https://open.spotify.com/artist/16YScXC67nAnFDcA2LGdY0",
    role: "Cantante",
    color: "#C06A50",
  },
  {
    name: "Pepe Levine",
    slug: "pepe-levine",
    spotifyId: "5HrBwfVDf0HXzGDrJ6Znqc",
    spotifyUrl: "https://open.spotify.com/artist/5HrBwfVDf0HXzGDrJ6Znqc",
    role: "El Divo",
    color: "#904040",
  },
];

// Color map for each artist
const artistColors: Record<string, string> = {
  "zaque": "#1DB954",
  "doctor-destino": "#D4A520",
  "brez": "#5A7590",
  "bruno-grasso": "#C09020",
  "dilema": "#C45A3A",
  "codak": "#4A4A90",
  "kev-cabrone": "#B54A30",
  "hassyel": "#908050",
  "x-santa-ana": "#7A4A4A",
  "fancy-freak": "#3A6090",
  "q-master-weed": "#4A9070",
  "chas-7p": "#8A4A7A",
  "reick-one": "#4A8A60",
  "latin-geisha": "#C06A50",
  "pepe-levine": "#904040",
};

// Gradient map for each artist
const artistGradients: Record<string, string> = {
  "zaque": "from-emerald-900/50 to-transparent",
  "doctor-destino": "from-amber-900/50 to-transparent",
  "brez": "from-slate-800/50 to-transparent",
  "bruno-grasso": "from-yellow-900/50 to-transparent",
  "dilema": "from-orange-900/50 to-transparent",
  "codak": "from-indigo-900/50 to-transparent",
  "kev-cabrone": "from-red-900/50 to-transparent",
  "hassyel": "from-stone-800/50 to-transparent",
  "x-santa-ana": "from-rose-900/50 to-transparent",
  "fancy-freak": "from-blue-900/50 to-transparent",
  "q-master-weed": "from-teal-900/50 to-transparent",
  "chas-7p": "from-purple-900/50 to-transparent",
  "reick-one": "from-green-900/50 to-transparent",
  "latin-geisha": "from-pink-900/50 to-transparent",
  "pepe-levine": "from-red-800/50 to-transparent",
};

export function DiscographyExplorer() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [artists, setArtists] = useState<Artist[]>([]);
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

  // Fetch artists from API and then fetch all images
  useEffect(() => {
    async function fetchArtists() {
      try {
        const res = await fetch("/api/artists");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.length > 0) {
            // Merge with fallback data to get Spotify info
            const mergedArtists = data.data.map((artist: Artist) => {
              const fallback = fallbackArtists.find(f => f.slug === artist.slug);
              return {
                ...artist,
                spotifyId: artist.spotifyId || fallback?.spotifyId,
                spotifyUrl: artist.spotifyUrl || fallback?.spotifyUrl,
              };
            });
            setArtists(mergedArtists);
          } else {
            // Use fallback
            setArtists(fallbackArtists as Artist[]);
          }
        } else {
          setArtists(fallbackArtists as Artist[]);
        }
      } catch (error) {
        console.error("Failed to fetch artists:", error);
        setArtists(fallbackArtists as Artist[]);
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
          const spotifyId = artist.spotifyId || fallbackArtists.find(f => f.slug === artist.slug)?.spotifyId;
          if (spotifyId) {
            const imageUrl = await fetchArtistImage(spotifyId);
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

  const selectedArtist = artists[selectedIndex] || fallbackArtists[0];
  const selectedColor = artistColors[selectedArtist.slug] || "#1DB954";
  const selectedGradient = artistGradients[selectedArtist.slug] || "from-emerald-900/50 to-transparent";
  const selectedSpotifyId = selectedArtist.spotifyId || fallbackArtists.find(f => f.slug === selectedArtist.slug)?.spotifyId;
  const selectedSpotifyUrl = selectedArtist.spotifyUrl || fallbackArtists.find(f => f.slug === selectedArtist.slug)?.spotifyUrl || "#";
  const selectedImage = artistImages[selectedArtist.slug];

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
              </div>
            </div>

            {/* Spotify Embed */}
            <div className="h-[352px]">
              {selectedSpotifyId ? (
                <iframe
                  src={`https://open.spotify.com/embed/artist/${selectedSpotifyId}?utm_source=generator&theme=0`}
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
            const color = artistColors[artist.slug] || "#1DB954";
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
              const color = artistColors[artist.slug] || "#1DB954";
              const spotifyUrl = artist.spotifyUrl || fallbackArtists.find(f => f.slug === artist.slug)?.spotifyUrl || "#";
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
