"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Music,
  ListMusic,
  ExternalLink,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Track {
  id: string;
  type: string;
  title: string;
  artist: string;
  coverUrl?: string;
  duration?: number;
  spotifyUri?: string;
  position: number;
}

interface Playlist {
  id: string;
  name: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  ownerName?: string;
  tracks: Track[];
}

export default function PlaylistEmbedPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  // Theme from query params
  const theme = searchParams.get("theme") || "dark";
  const compact = searchParams.get("compact") === "true";
  const autoplay = searchParams.get("autoplay") === "true";
  const showArtwork = searchParams.get("artwork") !== "false";
  const accentColor = searchParams.get("accent") || "#f97316";

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    fetchPlaylist();
    trackEmbedView();
  }, [slug]);

  async function fetchPlaylist() {
    try {
      const res = await fetch(`/api/community/playlists?slug=${slug}`);
      const data = await res.json();

      if (data.success) {
        setPlaylist(data.data);
      } else {
        setError("Playlist no encontrada");
      }
    } catch (err) {
      setError("Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  async function trackEmbedView() {
    try {
      const referrer = document.referrer || "direct";
      await fetch("/api/embed/playlist/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          type: "view",
          referrer,
        }),
      });
    } catch (err) {
      // Silent fail
    }
  }

  function openInSpotify(track?: Track) {
    const uri = track?.spotifyUri || playlist?.tracks[currentTrackIndex]?.spotifyUri;
    if (uri) {
      const trackId = uri.replace("spotify:track:", "");
      window.open(`https://open.spotify.com/track/${trackId}`, "_blank");
    }
  }

  function openPlaylist() {
    window.open(`https://sonidoliquido.com/playlists/${slug}`, "_blank");
  }

  const currentTrack = playlist?.tracks[currentTrackIndex];

  // Theme styles
  const isDark = theme === "dark";
  const bgColor = isDark ? "#0a0a0a" : "#ffffff";
  const textColor = isDark ? "#ffffff" : "#000000";
  const mutedColor = isDark ? "#a1a1a1" : "#666666";
  const cardBg = isDark ? "#1a1a1a" : "#f5f5f5";
  const borderColor = isDark ? "#333333" : "#e5e5e5";

  if (loading) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: bgColor }}
      >
        <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: accentColor }} />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div
        className="w-full h-full flex items-center justify-center p-4"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <div className="text-center">
          <ListMusic className="w-12 h-12 mx-auto mb-2" style={{ color: mutedColor }} />
          <p style={{ color: mutedColor }}>{error || "Playlist no disponible"}</p>
        </div>
      </div>
    );
  }

  // Compact view - single track player
  if (compact) {
    return (
      <div
        className="w-full h-full p-3 flex items-center gap-3"
        style={{ backgroundColor: bgColor, fontFamily: "system-ui, sans-serif" }}
      >
        {/* Artwork */}
        {showArtwork && (
          <div
            className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
            style={{ backgroundColor: cardBg }}
          >
            {currentTrack?.coverUrl ? (
              <img
                src={currentTrack.coverUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-5 h-5" style={{ color: mutedColor }} />
              </div>
            )}
          </div>
        )}

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm" style={{ color: textColor }}>
            {currentTrack?.title}
          </p>
          <p className="text-xs truncate" style={{ color: mutedColor }}>
            {currentTrack?.artist}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentTrackIndex(Math.max(0, currentTrackIndex - 1))}
            className="p-1.5 rounded-full transition-colors hover:opacity-80"
            disabled={currentTrackIndex === 0}
            style={{ color: currentTrackIndex === 0 ? mutedColor : textColor }}
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => openInSpotify()}
            className="p-2 rounded-full"
            style={{ backgroundColor: accentColor }}
          >
            <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
          </button>
          <button
            onClick={() => setCurrentTrackIndex(Math.min(playlist.tracks.length - 1, currentTrackIndex + 1))}
            className="p-1.5 rounded-full transition-colors hover:opacity-80"
            disabled={currentTrackIndex === playlist.tracks.length - 1}
            style={{ color: currentTrackIndex === playlist.tracks.length - 1 ? mutedColor : textColor }}
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Open link */}
        <button
          onClick={openPlaylist}
          className="p-1.5 rounded-full transition-colors hover:opacity-80"
          style={{ color: mutedColor }}
          title="Ver en Sonido Líquido"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Full view
  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: bgColor, fontFamily: "system-ui, sans-serif" }}
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-4" style={{ borderBottom: `1px solid ${borderColor}` }}>
        {/* Cover */}
        {showArtwork && (
          <div
            className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
            style={{ backgroundColor: cardBg }}
          >
            {playlist.coverImageUrl ? (
              <img
                src={playlist.coverImageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ListMusic className="w-8 h-8" style={{ color: mutedColor }} />
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: accentColor }}>
            Playlist
          </p>
          <h1 className="font-bold text-lg truncate" style={{ color: textColor }}>
            {playlist.name}
          </h1>
          <p className="text-xs" style={{ color: mutedColor }}>
            {playlist.tracks.length} tracks • {playlist.ownerName || "Sonido Líquido"}
          </p>
        </div>

        {/* Open link */}
        <button
          onClick={openPlaylist}
          className="p-2 rounded-full transition-opacity hover:opacity-80"
          style={{ backgroundColor: cardBg }}
          title="Abrir en Sonido Líquido"
        >
          <ExternalLink className="w-5 h-5" style={{ color: textColor }} />
        </button>
      </div>

      {/* Track list */}
      <div className="flex-1 overflow-y-auto">
        {playlist.tracks.map((track, index) => (
          <button
            key={track.id}
            onClick={() => {
              setCurrentTrackIndex(index);
              openInSpotify(track);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors hover:opacity-90",
              index === currentTrackIndex && "opacity-100"
            )}
            style={{
              backgroundColor: index === currentTrackIndex ? cardBg : "transparent",
            }}
          >
            {/* Track number or playing indicator */}
            <div className="w-6 text-center flex-shrink-0">
              {index === currentTrackIndex ? (
                <div className="w-3 h-3 mx-auto rounded-full" style={{ backgroundColor: accentColor }} />
              ) : (
                <span className="text-sm" style={{ color: mutedColor }}>
                  {index + 1}
                </span>
              )}
            </div>

            {/* Cover */}
            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0" style={{ backgroundColor: borderColor }}>
              {track.coverUrl ? (
                <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-4 h-4" style={{ color: mutedColor }} />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p
                className="font-medium text-sm truncate"
                style={{ color: index === currentTrackIndex ? accentColor : textColor }}
              >
                {track.title}
              </p>
              <p className="text-xs truncate" style={{ color: mutedColor }}>
                {track.artist}
              </p>
            </div>

            {/* Duration */}
            {track.duration && (
              <span className="text-xs flex-shrink-0" style={{ color: mutedColor }}>
                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, "0")}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Footer branding */}
      <div
        className="px-4 py-2 flex items-center justify-between"
        style={{ borderTop: `1px solid ${borderColor}`, backgroundColor: cardBg }}
      >
        <a
          href="https://sonidoliquido.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs transition-opacity hover:opacity-80"
          style={{ color: mutedColor }}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: accentColor }}
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3 text-white">
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </div>
          <span>Sonido Líquido</span>
        </a>
        <button
          onClick={openPlaylist}
          className="text-xs px-3 py-1 rounded-full transition-colors"
          style={{ backgroundColor: accentColor, color: "white" }}
        >
          Ver completa
        </button>
      </div>
    </div>
  );
}
