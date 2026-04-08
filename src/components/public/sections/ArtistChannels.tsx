"use client";

import { useState, useEffect, useCallback } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { Youtube, ChevronLeft, ChevronRight, Play, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Artist {
  id: string;
  name: string;
  slug: string;
  role: string;
  profileImageUrl?: string;
  youtubeUrl?: string;
}

interface Video {
  id: string;
  youtubeId: string;
  title: string;
  thumbnailUrl?: string;
}

// Real artist YouTube channel URLs - these link directly to each artist's channel
const artistChannelsData: Record<string, { channelUrl: string; channelHandle: string; color: string }> = {
  "zaque": {
    channelUrl: "https://youtube.com/@zakeuno",
    channelHandle: "@zakeuno",
    color: "#3D7A7A",
  },
  "doctor-destino": {
    channelUrl: "https://youtube.com/@doctordestinohiphop",
    channelHandle: "@doctordestinohiphop",
    color: "#D4A520",
  },
  "brez": {
    channelUrl: "https://youtube.com/@brezhiphopmexicoslc25",
    channelHandle: "@brezhiphopmexicoslc25",
    color: "#5A7590",
  },
  "dilema": {
    channelUrl: "https://youtube.com/@dilema999",
    channelHandle: "@dilema999",
    color: "#C45A3A",
  },
  "bruno-grasso": {
    channelUrl: "https://youtube.com/@brunograssosl",
    channelHandle: "@brunograssosl",
    color: "#C09020",
  },
  "kev-cabrone": {
    channelUrl: "https://youtube.com/@kevcabrone",
    channelHandle: "@kevcabrone",
    color: "#B54A30",
  },
  "x-santa-ana": {
    channelUrl: "https://youtube.com/@xsanta-ana",
    channelHandle: "@xsanta-ana",
    color: "#7A4A4A",
  },
  "latin-geisha": {
    channelUrl: "https://youtube.com/@latingeishamx",
    channelHandle: "@latingeishamx",
    color: "#4A9070",
  },
  "q-master-weed": {
    channelUrl: "https://youtube.com/@qmasterw",
    channelHandle: "@qmasterw",
    color: "#C06A50",
  },
  "chas-7p": {
    channelUrl: "https://youtube.com/@chas7p347",
    channelHandle: "@chas7p347",
    color: "#8A4A7A",
  },
  "fancy-freak": {
    channelUrl: "https://youtube.com/@fancyfreakdj",
    channelHandle: "@fancyfreakdj",
    color: "#3A6090",
  },
  "hassyel": {
    channelUrl: "https://youtube.com/channel/UCZp_YCv7jK3-lEtvSONNs8A",
    channelHandle: "Hassyel",
    color: "#908050",
  },
  "reick-one": {
    channelUrl: "https://youtube.com/channel/UCMvZBwXGDTnXVV7NbYKWfaA",
    channelHandle: "Reick Uno",
    color: "#4A8A60",
  },
  "pepe-levine": {
    channelUrl: "https://youtube.com/@pepelevineonline",
    channelHandle: "@pepelevineonline",
    color: "#904040",
  },
  "codak": {
    channelUrl: "https://youtube.com/@codak",
    channelHandle: "@codak",
    color: "#4A4A90",
  },
};

// Fallback artist order
const artistOrder = [
  "zaque", "doctor-destino", "brez", "dilema", "bruno-grasso",
  "kev-cabrone", "x-santa-ana", "latin-geisha", "q-master-weed",
  "chas-7p", "fancy-freak", "hassyel", "reick-one", "pepe-levine", "codak"
];

export function ArtistChannels() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [artistVideos, setArtistVideos] = useState<Record<string, Video[]>>({});
  const [loadingVideos, setLoadingVideos] = useState(false);

  // Fetch artists from API
  useEffect(() => {
    async function fetchArtists() {
      try {
        const res = await fetch("/api/artists");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.length > 0) {
            // Sort artists by the predefined order
            const sortedArtists = [...data.data].sort((a: Artist, b: Artist) => {
              const indexA = artistOrder.indexOf(a.slug);
              const indexB = artistOrder.indexOf(b.slug);
              return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
            });
            setArtists(sortedArtists);
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

  // Fetch videos for the selected artist
  const fetchArtistVideos = useCallback(async (artistSlug: string) => {
    // Check cache first
    if (artistVideos[artistSlug]) {
      return;
    }

    setLoadingVideos(true);
    try {
      const res = await fetch(`/api/videos?artistSlug=${artistSlug}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data?.length > 0) {
          setArtistVideos(prev => ({
            ...prev,
            [artistSlug]: data.data
          }));
        } else {
          // No videos found - store empty array
          setArtistVideos(prev => ({
            ...prev,
            [artistSlug]: []
          }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch artist videos:", error);
      setArtistVideos(prev => ({
        ...prev,
        [artistSlug]: []
      }));
    } finally {
      setLoadingVideos(false);
    }
  }, [artistVideos]);

  // Fetch videos when artist changes
  useEffect(() => {
    const selectedArtist = artists[selectedIndex];
    if (selectedArtist) {
      fetchArtistVideos(selectedArtist.slug);
    }
  }, [selectedIndex, artists, fetchArtistVideos]);

  const selectedArtist = artists[selectedIndex];
  const channelData = selectedArtist ? artistChannelsData[selectedArtist.slug] : null;
  const currentVideos = selectedArtist ? artistVideos[selectedArtist.slug] : undefined;
  const featuredVideo = currentVideos?.[0];

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev === 0 ? artists.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === artists.length - 1 ? 0 : prev + 1));
  };

  const handleImageError = (slug: string) => {
    setImageErrors(prev => ({ ...prev, [slug]: true }));
  };

  if (loading) {
    return (
      <section className="py-16 md:py-24 bg-gradient-to-b from-[#0a0a0a] to-[#111]">
        <div className="section-container flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      </section>
    );
  }

  if (!selectedArtist || !channelData) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-[#0a0a0a] to-[#111]">
      <div className="section-container">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-red-600/20 border border-red-600/30">
            <Youtube className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="font-oswald text-3xl md:text-4xl lg:text-5xl uppercase tracking-wide text-white">
            Canales del Roster
          </h2>
        </div>
        <p className="text-gray-400 mb-8 max-w-2xl">
          Explora el contenido de cada artista en YouTube. Freestyles, videos oficiales, sesiones en vivo y más.
        </p>

        {/* Artist Selector - Horizontal Scroll */}
        <div className="relative mb-8">
          {/* Navigation Arrows */}
          <button
            onClick={handlePrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/80 rounded-full border border-white/10 hover:bg-white/10 transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/80 rounded-full border border-white/10 hover:bg-white/10 transition-colors"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>

          {/* Artist Pills with Images */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-10 py-2">
            {artists.map((artist, index) => {
              const data = artistChannelsData[artist.slug];
              const color = data?.color || "#666";
              const hasImage = artist.profileImageUrl && !imageErrors[artist.slug];

              return (
                <button
                  key={artist.slug}
                  onClick={() => setSelectedIndex(index)}
                  className={`
                    shrink-0 flex items-center gap-2 px-3 py-2 rounded-full font-medium text-sm transition-all duration-300
                    ${selectedIndex === index
                      ? "text-white scale-105 shadow-lg"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                    }
                  `}
                  style={{
                    backgroundColor: selectedIndex === index ? color : undefined,
                    boxShadow: selectedIndex === index ? `0 4px 20px ${color}40` : undefined,
                  }}
                >
                  {/* Profile Image */}
                  <div
                    className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: !hasImage ? color : undefined }}
                  >
                    {hasImage ? (
                      <SafeImage
                        src={artist.profileImageUrl!}
                        alt={artist.name}
                        width={28}
                        height={28}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(artist.slug)}
                        unoptimized
                      />
                    ) : (
                      <span className="text-white">{artist.name.charAt(0)}</span>
                    )}
                  </div>
                  <span>{artist.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Video Embed or Channel Link */}
        <div className="relative">
          {/* Decorative border */}
          <div
            className="absolute -inset-1 rounded-xl opacity-50 blur-sm"
            style={{ background: `linear-gradient(135deg, ${channelData.color}, transparent)` }}
          />

          <div className="relative bg-[#0a0a0a] rounded-xl overflow-hidden border border-white/10">
            {/* Channel Header with Profile Image */}
            <div
              className="flex items-center justify-between p-4 border-b border-white/10"
              style={{ background: `linear-gradient(90deg, ${channelData.color}20, transparent)` }}
            >
              <div className="flex items-center gap-3">
                {/* Profile Image in Header */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-oswald font-bold text-white text-lg overflow-hidden ring-2 ring-offset-2 ring-offset-[#0a0a0a]"
                  style={{
                    backgroundColor: channelData.color,
                    boxShadow: `0 0 0 2px ${channelData.color}`
                  }}
                >
                  {selectedArtist.profileImageUrl && !imageErrors[selectedArtist.slug] ? (
                    <SafeImage
                      src={selectedArtist.profileImageUrl}
                      alt={selectedArtist.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      onError={() => handleImageError(selectedArtist.slug)}
                      unoptimized
                    />
                  ) : (
                    selectedArtist.name.charAt(0)
                  )}
                </div>
                <div>
                  <h3 className="font-oswald text-xl text-white uppercase">{selectedArtist.name}</h3>
                  <p className="text-gray-400 text-sm">{channelData.channelHandle}</p>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-red-600/50 text-red-500 hover:bg-red-600/20"
              >
                <a href={channelData.channelUrl} target="_blank" rel="noopener noreferrer">
                  <Youtube className="w-4 h-4 mr-2" />
                  Ver Canal
                </a>
              </Button>
            </div>

            {/* Video Embed or Placeholder */}
            <div className="aspect-video bg-[#111]">
              {loadingVideos ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="w-10 h-10 animate-spin text-red-500" />
                </div>
              ) : featuredVideo ? (
                <iframe
                  src={`https://www.youtube.com/embed/${featuredVideo.youtubeId}?rel=0&modestbranding=1`}
                  title={featuredVideo.title || `Video de ${selectedArtist.name}`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                /* No videos - show channel link placeholder */
                <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8"
                  style={{ background: `linear-gradient(135deg, ${channelData.color}20, transparent)` }}
                >
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${channelData.color}40` }}
                  >
                    <Youtube className="w-12 h-12 text-red-500" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-oswald text-xl text-white uppercase mb-2">
                      Canal de {selectedArtist.name}
                    </h4>
                    <p className="text-gray-400 text-sm mb-4">
                      Visita el canal de YouTube para ver todos sus videos
                    </p>
                    <Button
                      asChild
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <a href={channelData.channelUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ir al Canal
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Video list if we have more than one */}
            {currentVideos && currentVideos.length > 1 && (
              <div className="p-4 border-t border-white/10">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Más videos de {selectedArtist.name}</p>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                  {currentVideos.slice(1, 5).map((video) => (
                    <button
                      key={video.id}
                      onClick={() => {
                        // Move this video to the front
                        setArtistVideos(prev => ({
                          ...prev,
                          [selectedArtist.slug]: [video, ...prev[selectedArtist.slug].filter(v => v.id !== video.id)]
                        }));
                      }}
                      className="shrink-0 group relative w-40 aspect-video rounded-lg overflow-hidden bg-black/50 hover:ring-2 hover:ring-red-500 transition-all"
                    >
                      {video.thumbnailUrl ? (
                        <SafeImage
                          src={video.thumbnailUrl}
                          alt={video.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900">
                          <Play className="w-6 h-6 text-gray-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links - All Channels with Images */}
        <div className="mt-8 pt-8 border-t border-white/10">
          <h4 className="text-gray-400 text-sm uppercase tracking-wider mb-4">Todos los canales</h4>
          <div className="flex flex-wrap gap-2">
            {artists.map((artist) => {
              const data = artistChannelsData[artist.slug];
              const hasImage = artist.profileImageUrl && !imageErrors[artist.slug];

              return (
                <a
                  key={artist.slug}
                  href={data?.channelUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full text-sm text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-colors"
                >
                  {/* Small Profile Image */}
                  <div
                    className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold shrink-0 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: data?.color || "#666" }}
                  >
                    {hasImage ? (
                      <SafeImage
                        src={artist.profileImageUrl!}
                        alt={artist.name}
                        width={20}
                        height={20}
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(artist.slug)}
                        unoptimized
                      />
                    ) : (
                      <span className="text-white">{artist.name.charAt(0)}</span>
                    )}
                  </div>
                  <Youtube className="w-3 h-3" />
                  {artist.name}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
