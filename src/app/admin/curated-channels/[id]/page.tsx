"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Music,
  ArrowLeft,
  Loader2,
  RefreshCw,
  ExternalLink,
  Clock,
  Disc3,
  Calendar,
  Play,
  Pause,
  Plus,
  Check,
  Star,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CuratedChannel {
  id: string;
  spotifyArtistId: string;
  spotifyArtistUrl: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
  popularity: number | null;
  followers: number | null;
  category: string;
  priority: number;
  description: string | null;
  isActive: boolean;
  lastSyncedAt: string | null;
  tracks: CuratedTrack[];
  trackCount: number;
}

interface CuratedTrack {
  id: string;
  spotifyTrackId: string;
  spotifyTrackUrl: string;
  name: string;
  artistName: string;
  albumName: string | null;
  albumImageUrl: string | null;
  durationMs: number | null;
  previewUrl: string | null;
  releaseDate: string | null;
  popularity: number | null;
  explicit: boolean;
  isAvailableForPlaylist: boolean;
  isFeatured: boolean;
}

const categoryLabels: Record<string, string> = {
  roster: "Artista del Roster",
  affiliate: "Artista Afiliado",
  collaborator: "Colaborador",
  label: "Sello Discográfico",
  featured: "Artista Destacado",
  other: "Otro",
};

const categoryColors: Record<string, string> = {
  roster: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  affiliate: "bg-green-500/10 text-green-500 border-green-500/30",
  collaborator: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  label: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  featured: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  other: "bg-gray-500/10 text-gray-500 border-gray-500/30",
};

function formatDuration(ms: number | null): string {
  if (!ms) return "-";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatNumber(num: number | null): string {
  if (!num) return "-";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function CuratedChannelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [channel, setChannel] = useState<CuratedChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchChannel();
  }, [id]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef) {
        audioRef.pause();
        audioRef.src = "";
      }
    };
  }, [audioRef]);

  const fetchChannel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/curated-channels/${id}`);
      const data = await res.json();
      if (data.success) {
        setChannel(data.data);
      }
    } catch (error) {
      console.error("Error fetching channel:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/curated-channels/${id}/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert(`Sincronizado: ${data.data.tracksAdded} tracks nuevos de ${data.data.albumsProcessed} álbumes`);
        fetchChannel();
      } else {
        alert(data.error || "Error al sincronizar");
      }
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setSyncing(false);
    }
  };

  const handlePlayPreview = (track: CuratedTrack) => {
    if (!track.previewUrl) return;

    if (playingTrack === track.id) {
      // Stop playing
      if (audioRef) {
        audioRef.pause();
      }
      setPlayingTrack(null);
    } else {
      // Start playing
      if (audioRef) {
        audioRef.pause();
      }
      const audio = new Audio(track.previewUrl);
      audio.play();
      audio.onended = () => setPlayingTrack(null);
      setAudioRef(audio);
      setPlayingTrack(track.id);
    }
  };

  const handleToggleFeatured = async (track: CuratedTrack) => {
    try {
      const res = await fetch(`/api/admin/curated-tracks/${track.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !track.isFeatured }),
      });
      if (res.ok) {
        fetchChannel();
      }
    } catch (error) {
      console.error("Error updating track:", error);
    }
  };

  const handleToggleAvailable = async (track: CuratedTrack) => {
    try {
      const res = await fetch(`/api/admin/curated-tracks/${track.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailableForPlaylist: !track.isAvailableForPlaylist }),
      });
      if (res.ok) {
        fetchChannel();
      }
    } catch (error) {
      console.error("Error updating track:", error);
    }
  };

  const filteredTracks = channel?.tracks.filter((track) =>
    track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (track.albumName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  ) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-slc-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-slc-black p-6">
        <div className="max-w-7xl mx-auto">
          <Link href="/admin/curated-channels" className="inline-flex items-center gap-2 text-slc-muted hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" />
            Volver a Canales
          </Link>
          <div className="text-center py-20">
            <Music className="w-16 h-16 text-slc-muted mx-auto mb-4" />
            <h3 className="text-xl font-oswald uppercase mb-2">Canal no encontrado</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slc-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <Link href="/admin/curated-channels" className="inline-flex items-center gap-2 text-slc-muted hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a Canales Curados
        </Link>

        {/* Channel Header */}
        <div className="bg-slc-card border border-slc-border rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Image */}
            <div className="flex-shrink-0">
              {channel.imageUrl ? (
                <SafeImage
                  src={channel.imageUrl}
                  alt={channel.name}
                  width={160}
                  height={160}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-40 h-40 rounded-full bg-slc-dark flex items-center justify-center">
                  <Music className="w-16 h-16 text-slc-muted" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full border",
                  categoryColors[channel.category]
                )}>
                  {categoryLabels[channel.category]}
                </span>
                {!channel.isActive && (
                  <span className="text-xs px-2 py-0.5 bg-red-500/10 text-red-500 rounded-full">
                    Inactivo
                  </span>
                )}
              </div>

              <h1 className="font-oswald text-3xl uppercase mb-2">{channel.name}</h1>

              {channel.description && (
                <p className="text-slc-muted mb-4">{channel.description}</p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slc-muted">Seguidores</p>
                  <p className="font-oswald text-xl">{formatNumber(channel.followers)}</p>
                </div>
                <div>
                  <p className="text-xs text-slc-muted">Popularidad</p>
                  <p className="font-oswald text-xl">{channel.popularity || "-"}/100</p>
                </div>
                <div>
                  <p className="text-xs text-slc-muted">Tracks Sincronizados</p>
                  <p className="font-oswald text-xl">{channel.trackCount}</p>
                </div>
                <div>
                  <p className="text-xs text-slc-muted">Última Sincronización</p>
                  <p className="font-oswald text-sm">
                    {channel.lastSyncedAt
                      ? new Date(channel.lastSyncedAt).toLocaleDateString("es-MX")
                      : "Nunca"}
                  </p>
                </div>
              </div>

              {/* Genres */}
              {channel.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {channel.genres.map((genre) => (
                    <span key={genre} className="text-xs px-2 py-1 bg-slc-dark rounded-full text-slc-muted">
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={handleSync} disabled={syncing}>
                  {syncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Sincronizar Tracks
                </Button>
                <a
                  href={channel.spotifyArtistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Ver en Spotify
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Tracks Section */}
        <div className="bg-slc-card border border-slc-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 border-b border-slc-border">
            <h2 className="font-oswald text-xl uppercase">
              Tracks Sincronizados ({channel.trackCount})
            </h2>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
              <Input
                placeholder="Buscar tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tracks Table */}
          {filteredTracks.length === 0 ? (
            <div className="text-center py-12">
              <Disc3 className="w-12 h-12 text-slc-muted mx-auto mb-3" />
              <p className="text-slc-muted">
                {channel.trackCount === 0
                  ? "No hay tracks sincronizados. Haz clic en \"Sincronizar Tracks\" para obtener música."
                  : "No se encontraron tracks con esa búsqueda"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slc-border/50">
              {filteredTracks.map((track, index) => (
                <div
                  key={track.id}
                  className={cn(
                    "flex items-center gap-4 p-4 hover:bg-slc-dark/50 transition-colors",
                    !track.isAvailableForPlaylist && "opacity-50"
                  )}
                >
                  {/* Track Number */}
                  <span className="w-8 text-center text-sm text-slc-muted">
                    {index + 1}
                  </span>

                  {/* Album Art with Play Button */}
                  <div className="relative group flex-shrink-0">
                    {track.albumImageUrl ? (
                      <SafeImage
                        src={track.albumImageUrl}
                        alt={track.albumName || ""}
                        width={48}
                        height={48}
                        className="rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-slc-dark flex items-center justify-center">
                        <Disc3 className="w-6 h-6 text-slc-muted" />
                      </div>
                    )}
                    {track.previewUrl && (
                      <button
                        onClick={() => handlePlayPreview(track)}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded"
                      >
                        {playingTrack === track.id ? (
                          <Pause className="w-5 h-5 text-white" />
                        ) : (
                          <Play className="w-5 h-5 text-white ml-0.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {track.name}
                      {track.explicit && (
                        <span className="ml-2 text-[10px] px-1 py-0.5 bg-slc-muted/20 rounded text-slc-muted">
                          E
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slc-muted truncate">
                      {track.artistName}
                      {track.albumName && ` • ${track.albumName}`}
                    </p>
                  </div>

                  {/* Release Date */}
                  <div className="hidden md:block text-sm text-slc-muted w-24">
                    {track.releaseDate || "-"}
                  </div>

                  {/* Duration */}
                  <div className="hidden md:flex items-center gap-1 text-sm text-slc-muted w-16">
                    <Clock className="w-3 h-3" />
                    {formatDuration(track.durationMs)}
                  </div>

                  {/* Popularity */}
                  <div className="hidden md:block text-sm text-slc-muted w-12 text-center">
                    {track.popularity || "-"}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleFeatured(track)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        track.isFeatured
                          ? "bg-yellow-500/10 text-yellow-500"
                          : "text-slc-muted hover:text-yellow-500 hover:bg-slc-dark"
                      )}
                      title={track.isFeatured ? "Quitar de destacados" : "Marcar como destacado"}
                    >
                      <Star className="w-4 h-4" fill={track.isFeatured ? "currentColor" : "none"} />
                    </button>
                    <button
                      onClick={() => handleToggleAvailable(track)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        track.isAvailableForPlaylist
                          ? "bg-green-500/10 text-green-500"
                          : "text-slc-muted hover:text-green-500 hover:bg-slc-dark"
                      )}
                      title={track.isAvailableForPlaylist ? "Quitar de disponibles" : "Hacer disponible para playlists"}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <a
                      href={track.spotifyTrackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slc-muted hover:text-green-500 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
