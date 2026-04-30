"use client";

import { useState, useEffect, useCallback } from "react";
import { Instagram, Youtube, Music2, Loader2, Radio } from "lucide-react";

// Real artist social data with slugs and Spotify IDs for matching
const rosterSocials = [
  {
    name: "Zaque",
    slug: "zaque",
    spotifyId: "4WQmw3fIx9F7iPKL5v8SCN",
    instagram: "https://www.instagram.com/zaqueslc",
    youtube: "https://youtube.com/@zakeuno",
    spotify: "https://open.spotify.com/artist/4WQmw3fIx9F7iPKL5v8SCN",
    color: "#3D7A7A",
  },
  {
    name: "Doctor Destino",
    slug: "doctor-destino",
    spotifyId: "5urer15JPbCELf17LVia7w",
    instagram: "https://www.instagram.com/estoesdoctordestino",
    youtube: "https://youtube.com/@doctordestinohiphop",
    spotify: "https://open.spotify.com/artist/5urer15JPbCELf17LVia7w",
    mixcloud: "https://www.mixcloud.com/doctinho/",
    color: "#D4A520",
  },
  {
    name: "Brez",
    slug: "brez",
    spotifyId: "2jJmTEMkGQfH3BxoG3MQvF",
    instagram: "https://www.instagram.com/brez_idc",
    youtube: "https://youtube.com/@brezhiphopmexicoslc25",
    spotify: "https://open.spotify.com/artist/2jJmTEMkGQfH3BxoG3MQvF",
    color: "#5A7590",
  },
  {
    name: "Bruno Grasso",
    slug: "bruno-grasso",
    spotifyId: "4fNQqyvcM71IyF2EitEtCj",
    instagram: "https://www.instagram.com/brunograssosl",
    youtube: "https://youtube.com/@brunograssosl",
    spotify: "https://open.spotify.com/artist/4fNQqyvcM71IyF2EitEtCj",
    color: "#C09020",
  },
  {
    name: "Dilema",
    slug: "dilema",
    spotifyId: "3eCEorgAoZkvnAQLdy4x38",
    instagram: "https://www.instagram.com/dilema_ladee",
    youtube: "https://youtube.com/@dilema999",
    spotify: "https://open.spotify.com/artist/3eCEorgAoZkvnAQLdy4x38",
    color: "#C45A3A",
  },
  {
    name: "Kev Cabrone",
    slug: "kev-cabrone",
    spotifyId: "0QdRhOmiqAcV1dPCoiSIQJ",
    instagram: "https://www.instagram.com/kev.cabrone",
    youtube: "https://youtube.com/@kevcabrone",
    spotify: "https://open.spotify.com/artist/0QdRhOmiqAcV1dPCoiSIQJ",
    color: "#B54A30",
  },
  {
    name: "X Santa-Ana",
    slug: "x-santa-ana",
    spotifyId: "2Apt0MjZGqXAd1pl4LNQrR",
    instagram: "https://www.instagram.com/x_santa_ana",
    youtube: "https://youtube.com/@xsanta-ana",
    spotify: "https://open.spotify.com/artist/2Apt0MjZGqXAd1pl4LNQrR",
    color: "#7A4A4A",
  },
  {
    name: "Latin Geisha",
    slug: "latin-geisha",
    spotifyId: "16YScXC67nAnFDcA2LGdY0",
    instagram: "https://www.instagram.com/latingeishamx",
    youtube: "https://youtube.com/@latingeishamx",
    spotify: "https://open.spotify.com/artist/16YScXC67nAnFDcA2LGdY0",
    color: "#4A9070",
  },
  {
    name: "Q Master Weed",
    slug: "q-master-weed",
    spotifyId: "4T4Z7jvUcMV16VsslRRuC5",
    instagram: "https://www.instagram.com/q.masterw",
    youtube: "https://youtube.com/@qmasterw",
    spotify: "https://open.spotify.com/artist/4T4Z7jvUcMV16VsslRRuC5",
    mixcloud: "https://www.mixcloud.com/q-masterw/",
    color: "#C06A50",
  },
  {
    name: "Chas 7P",
    slug: "chas-7p",
    spotifyId: "3RAg8fPmZ8RnacJO8MhLP1",
    instagram: "https://www.instagram.com/chas7pecados",
    youtube: "https://youtube.com/@chas7p347",
    spotify: "https://open.spotify.com/artist/3RAg8fPmZ8RnacJO8MhLP1",
    color: "#8A4A7A",
  },
  {
    name: "Fancy Freak",
    slug: "fancy-freak",
    spotifyId: "5TMoczTLclVyzzDY5qf3Yb",
    instagram: "https://www.instagram.com/fancyfreakcorp",
    youtube: "https://youtube.com/@fancyfreakdj",
    spotify: "https://open.spotify.com/artist/5TMoczTLclVyzzDY5qf3Yb",
    mixcloud: "https://www.mixcloud.com/fancyfreak1/",
    color: "#3A6090",
  },
  {
    name: "Pepe Levine",
    slug: "pepe-levine",
    spotifyId: "5HrBwfVDf0HXzGDrJ6Znqc",
    instagram: "https://www.instagram.com/pepelevineonline",
    youtube: "https://youtube.com/@pepelevineonline",
    spotify: "https://open.spotify.com/artist/5HrBwfVDf0HXzGDrJ6Znqc",
    color: "#904040",
  },
  {
    name: "Reick One",
    slug: "reick-one",
    spotifyId: "4UqFXhJVb9zy2SbNx4ycJQ",
    instagram: "https://www.instagram.com/reickuno",
    youtube: "https://youtube.com/channel/UCMvZBwXGDTnXVV7NbYKWfaA",
    spotify: "https://open.spotify.com/artist/4UqFXhJVb9zy2SbNx4ycJQ",
    mixcloud: "https://www.mixcloud.com/reickuno/",
    color: "#4A8A60",
  },
  {
    name: "Codak",
    slug: "codak",
    spotifyId: "2zrv1oduhIYh29vvQZwI5r",
    instagram: "https://www.instagram.com/ilikebigbuds_i_canot_lie",
    youtube: "https://youtu.be/1K7VwrXGCr8",
    spotify: "https://open.spotify.com/artist/2zrv1oduhIYh29vvQZwI5r",
    color: "#4A4A90",
  },
  {
    name: "Hassyel",
    slug: "hassyel",
    spotifyId: "6AN9ek9RwrLbSp9rT2lcDG",
    instagram: "https://www.instagram.com/ilikebigbuds_i_canot_lie",
    youtube: "https://youtube.com/channel/UCZp_YCv7jK3-lEtvSONNs8A",
    spotify: "https://open.spotify.com/artist/6AN9ek9RwrLbSp9rT2lcDG",
    color: "#908050",
  },
];

export function RosterSocials() {
  const [artistImages, setArtistImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

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
    async function fetchAllImages() {
      const images: Record<string, string> = {};

      // Fetch images in parallel
      await Promise.all(
        rosterSocials.map(async (artist) => {
          if (artist.spotifyId) {
            const imageUrl = await fetchArtistImage(artist.spotifyId);
            if (imageUrl) {
              images[artist.slug] = imageUrl;
            }
          }
        })
      );

      setArtistImages(images);
      setLoading(false);
    }

    fetchAllImages();
  }, [fetchArtistImage]);

  // Handle image error
  const handleImageError = (slug: string) => {
    setImageErrors(prev => ({ ...prev, [slug]: true }));
  };

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

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Artist Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {rosterSocials.map((artist) => {
            const profileImage = artistImages[artist.slug];
            const hasImage = profileImage && !imageErrors[artist.slug];

            return (
              <div
                key={artist.name}
                className="group relative bg-white/5 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300"
              >
                {/* Artist Profile Image */}
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center font-oswald font-bold text-xl text-white mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform overflow-hidden"
                  style={{
                    backgroundColor: hasImage ? undefined : artist.color,
                    boxShadow: `0 0 0 3px #0a0a0a, 0 0 0 5px ${artist.color}`,
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
                  <a
                    href={artist.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 hover:scale-110 transition-transform"
                    aria-label={`Instagram de ${artist.name}`}
                  >
                    <Instagram className="w-4 h-4 text-white" />
                  </a>
                  <a
                    href={artist.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-red-600 hover:bg-red-500 hover:scale-110 transition-all"
                    aria-label={`YouTube de ${artist.name}`}
                  >
                    <Youtube className="w-4 h-4 text-white" />
                  </a>
                  <a
                    href={artist.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] hover:scale-110 transition-all"
                    aria-label={`Spotify de ${artist.name}`}
                  >
                    <Music2 className="w-4 h-4 text-white" />
                  </a>
                  {artist.mixcloud && (
                    <a
                      href={artist.mixcloud}
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
                  style={{ backgroundColor: artist.color }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
