"use client";

import { useState, useEffect } from "react";
import { Music, Play, ExternalLink, Shuffle, Loader2 } from "lucide-react";

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

const DEFAULT_COLOR = "#f97316"; // orange

export function RandomArtistPlayer() {
  const [rosterData, setRosterData] = useState<RosterArtist[]>([]);
  const [artist, setArtist] = useState<RosterArtist | null>(null);
  const [artistImage, setArtistImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Fetch roster data
  useEffect(() => {
    async function fetchRoster() {
      try {
        const res = await fetch("/api/artists/roster");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.length > 0) {
            setRosterData(data.data);
            // Pick a random artist right away
            const randomIndex = Math.floor(Math.random() * data.data.length);
            const selectedArtist = data.data[randomIndex];
            setArtist(selectedArtist);

            // Fetch artist image from Spotify oembed
            if (selectedArtist.spotifyId) {
              try {
                const imgResponse = await fetch(
                  `https://open.spotify.com/oembed?url=https://open.spotify.com/artist/${selectedArtist.spotifyId}`
                );
                if (imgResponse.ok) {
                  const imgData = await imgResponse.json();
                  setArtistImage(imgData.thumbnail_url);
                }
              } catch (error) {
                console.error("Failed to fetch artist image:", error);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch roster:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRoster();
  }, []);

  // Shuffle to another artist
  const shuffleArtist = () => {
    if (rosterData.length === 0) return;

    setIsLoading(true);
    let newIndex: number;
    do {
      newIndex = Math.floor(Math.random() * rosterData.length);
    } while (rosterData.length > 1 && rosterData[newIndex].spotifyId === artist?.spotifyId);

    const selectedArtist = rosterData[newIndex];
    setArtist(selectedArtist);
    setArtistImage(null);

    if (selectedArtist.spotifyId) {
      fetch(
        `https://open.spotify.com/oembed?url=https://open.spotify.com/artist/${selectedArtist.spotifyId}`
      )
        .then((res) => res.json())
        .then((data) => {
          setArtistImage(data.thumbnail_url);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  };

  const color = artist?.tintColor || DEFAULT_COLOR;

  if (!artist && rosterData.length === 0) {
    return (
      <div className="w-full min-h-[400px] bg-gradient-to-b from-slc-dark to-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!artist) {
    return null;
  }

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}15 0%, transparent 50%, ${color}10 100%)`,
      }}
    >
      {/* Background blur effect from artist image */}
      {artistImage && (
        <div
          className="absolute inset-0 opacity-30 blur-3xl scale-150"
          style={{
            backgroundImage: `url(${artistImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />

      {/* Animated glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl animate-pulse"
        style={{ backgroundColor: color }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">

          {/* Large Album/Artist Cover */}
          <div
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Glow effect behind cover */}
            <div
              className="absolute inset-0 rounded-2xl blur-2xl opacity-50 group-hover:opacity-70 transition-opacity duration-500"
              style={{ backgroundColor: color }}
            />

            {/* Cover container */}
            <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-2xl overflow-hidden shadow-2xl transform transition-all duration-500 group-hover:scale-[1.02]">
              {isLoading ? (
                <div className="w-full h-full bg-slc-card animate-pulse flex items-center justify-center">
                  <Music className="w-20 h-20 text-slc-muted/30" />
                </div>
              ) : artistImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={artistImage}
                    alt={artist.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Play overlay on hover */}
                  <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`}>
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center transform transition-transform duration-300 hover:scale-110"
                      style={{ backgroundColor: color }}
                    >
                      <Play className="w-10 h-10 text-white ml-1" fill="white" />
                    </div>
                  </div>
                </>
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: `${color}30` }}
                >
                  <span className="font-oswald text-8xl text-white/80">
                    {artist.name.charAt(0)}
                  </span>
                </div>
              )}

              {/* Corner badge */}
              <div className="absolute top-4 left-4">
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-medium uppercase tracking-wider backdrop-blur-md"
                  style={{ backgroundColor: `${color}CC` }}
                >
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  En Reproducción
                </div>
              </div>
            </div>

            {/* Vinyl record effect */}
            <div
              className="absolute -right-8 top-1/2 -translate-y-1/2 w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 -z-10 opacity-80 hidden lg:block"
              style={{
                animation: isHovered ? "spin 3s linear infinite" : "none",
              }}
            >
              {/* Vinyl grooves */}
              <div className="absolute inset-8 rounded-full border border-zinc-700" />
              <div className="absolute inset-16 rounded-full border border-zinc-700" />
              <div className="absolute inset-24 rounded-full border border-zinc-700" />
              <div className="absolute inset-32 rounded-full border border-zinc-700" />
              {/* Center label */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>

          {/* Artist Info & Player */}
          <div className="flex-1 text-center lg:text-left">
            {/* Now Playing Badge */}
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                <span className="w-1 h-4 rounded-full animate-pulse" style={{ backgroundColor: color, animationDelay: "0ms" }} />
                <span className="w-1 h-6 rounded-full animate-pulse" style={{ backgroundColor: color, animationDelay: "150ms" }} />
                <span className="w-1 h-3 rounded-full animate-pulse" style={{ backgroundColor: color, animationDelay: "300ms" }} />
                <span className="w-1 h-5 rounded-full animate-pulse" style={{ backgroundColor: color, animationDelay: "450ms" }} />
              </div>
              <span className="text-sm font-medium uppercase tracking-wider" style={{ color }}>
                Escuchando Ahora
              </span>
            </div>

            {/* Artist Name */}
            <h2 className="font-oswald text-5xl md:text-6xl lg:text-7xl uppercase tracking-tight text-white mb-2">
              {artist.name}
            </h2>

            {/* Role */}
            <p className="text-xl text-slc-muted mb-6">
              {artist.role} · <span className="text-primary">Sonido Líquido Crew</span>
            </p>

            {/* Spotify Player */}
            {artist.spotifyId && (
              <div className="w-full max-w-2xl mx-auto lg:mx-0 mb-6">
                <iframe
                  title={`Spotify Player - ${artist.name}`}
                  src={`https://open.spotify.com/embed/artist/${artist.spotifyId}?utm_source=generator&theme=0`}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-xl"
                  style={{ borderRadius: "12px" }}
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
              {artist.spotifyId && (
                <a
                  href={`https://open.spotify.com/artist/${artist.spotifyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-spotify hover:bg-spotify/90 text-black font-semibold rounded-full transition-all hover:scale-105"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                  Abrir en Spotify
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <button
                onClick={shuffleArtist}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-full border border-white/20 transition-all hover:scale-105 backdrop-blur-sm"
              >
                <Shuffle className="w-5 h-5" />
                Otro Artista
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />

      {/* Decorative elements */}
      <div className="absolute top-10 right-10 w-20 h-20 border border-white/5 rounded-full" />
      <div className="absolute bottom-20 left-10 w-32 h-32 border border-white/5 rounded-full" />

      {/* CSS for vinyl animation */}
      <style jsx>{`
        @keyframes spin {
          from { transform: translateY(-50%) rotate(0deg); }
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
