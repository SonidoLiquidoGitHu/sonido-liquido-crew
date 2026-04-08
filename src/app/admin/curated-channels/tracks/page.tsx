"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Music,
  ArrowLeft,
  Loader2,
  Search,
  Disc3,
  Clock,
  Play,
  Pause,
  Plus,
  Check,
  Star,
  Filter,
  ListMusic,
  ExternalLink,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  channel: {
    id: string;
    name: string;
    imageUrl: string | null;
    category: string;
  } | null;
}

interface CuratedChannel {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface Playlist {
  id: string;
  name: string;
  description: string;
  trackCount: number;
}

function formatDuration(ms: number | null): string {
  if (!ms) return "-";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function CuratedTracksPage() {
  const [tracks, setTracks] = useState<CuratedTrack[]>([]);
  const [channels, setChannels] = useState<CuratedChannel[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [filterFeatured, setFilterFeatured] = useState(false);
  const [filterAvailable, setFilterAvailable] = useState(true);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  // Add to playlist modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<CuratedTrack | null>(null);
  const [addingToPlaylist, setAddingToPlaylist] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchTracks(), fetchChannels(), fetchPlaylists()]);
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef) {
        audioRef.pause();
        audioRef.src = "";
      }
    };
  }, [audioRef]);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/curated-tracks");
      const data = await res.json();
      if (data.success) {
        setTracks(data.data);
      }
    } catch (error) {
      console.error("Error fetching tracks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await fetch("/api/admin/curated-channels");
      const data = await res.json();
      if (data.success) {
        setChannels(data.data);
      }
    } catch (error) {
      console.error("Error fetching channels:", error);
    }
  };

  const fetchPlaylists = async () => {
    try {
      const res = await fetch("/api/admin/playlists");
      const data = await res.json();
      if (data.success) {
        setPlaylists(data.data);
      }
    } catch (error) {
      console.error("Error fetching playlists:", error);
    }
  };

  const handlePlayPreview = (track: CuratedTrack) => {
    if (!track.previewUrl) return;

    if (playingTrack === track.id) {
      if (audioRef) {
        audioRef.pause();
      }
      setPlayingTrack(null);
    } else {
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

  const handleOpenAddModal = (track: CuratedTrack) => {
    setSelectedTrack(track);
    setShowAddModal(true);
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!selectedTrack) return;

    setAddingToPlaylist(playlistId);
    try {
      const res = await fetch("/api/admin/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId,
          spotifyTrackId: selectedTrack.spotifyTrackId,
          curatedTrackId: selectedTrack.id,
          trackName: selectedTrack.name,
          artistName: selectedTrack.artistName,
          albumImageUrl: selectedTrack.albumImageUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchPlaylists();
        setShowAddModal(false);
      } else {
        alert(data.error || "Error al agregar");
      }
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setAddingToPlaylist(null);
    }
  };

  // Filter tracks
  const filteredTracks = tracks.filter((track) => {
    const matchesSearch =
      track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (track.albumName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesChannel = !filterChannel || track.channel?.id === filterChannel;
    const matchesFeatured = !filterFeatured || track.isFeatured;
    const matchesAvailable = !filterAvailable || track.isAvailableForPlaylist;
    return matchesSearch && matchesChannel && matchesFeatured && matchesAvailable;
  });

  return (
    <div className="min-h-screen bg-slc-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <Link href="/admin/curated-channels" className="inline-flex items-center gap-2 text-slc-muted hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a Canales Curados
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-oswald text-3xl uppercase mb-2">
              Tracks Curados
            </h1>
            <p className="text-slc-muted">
              Navega y agrega tracks de los canales curados a las playlists
            </p>
          </div>

          <Link href="/admin/curated-channels/playlists">
            <Button>
              <ListMusic className="w-4 h-4 mr-2" />
              Gestionar Playlists
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-slc-card border border-slc-border rounded-xl p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
              <Input
                placeholder="Buscar por nombre, artista o álbum..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="px-4 py-2 bg-slc-dark border border-slc-border rounded-lg"
            >
              <option value="">Todos los canales</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>{ch.name}</option>
              ))}
            </select>

            <Button
              variant={filterFeatured ? "default" : "outline"}
              onClick={() => setFilterFeatured(!filterFeatured)}
            >
              <Star className="w-4 h-4 mr-2" fill={filterFeatured ? "currentColor" : "none"} />
              Destacados
            </Button>

            <Button
              variant={filterAvailable ? "default" : "outline"}
              onClick={() => setFilterAvailable(!filterAvailable)}
            >
              <Check className="w-4 h-4 mr-2" />
              Disponibles
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slc-card border border-slc-border rounded-xl p-4">
            <p className="text-2xl font-oswald">{tracks.length}</p>
            <p className="text-xs text-slc-muted">Total Tracks</p>
          </div>
          <div className="bg-slc-card border border-slc-border rounded-xl p-4">
            <p className="text-2xl font-oswald">{tracks.filter(t => t.isFeatured).length}</p>
            <p className="text-xs text-slc-muted">Destacados</p>
          </div>
          <div className="bg-slc-card border border-slc-border rounded-xl p-4">
            <p className="text-2xl font-oswald">{tracks.filter(t => t.isAvailableForPlaylist).length}</p>
            <p className="text-xs text-slc-muted">Disponibles</p>
          </div>
          <div className="bg-slc-card border border-slc-border rounded-xl p-4">
            <p className="text-2xl font-oswald">{filteredTracks.length}</p>
            <p className="text-xs text-slc-muted">Mostrando</p>
          </div>
        </div>

        {/* Tracks Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="text-center py-20">
            <Disc3 className="w-16 h-16 text-slc-muted mx-auto mb-4" />
            <h3 className="text-xl font-oswald uppercase mb-2">No hay tracks</h3>
            <p className="text-slc-muted">
              {tracks.length === 0
                ? "Sincroniza canales para obtener tracks"
                : "No se encontraron tracks con estos filtros"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTracks.map((track) => (
              <div
                key={track.id}
                className={cn(
                  "bg-slc-card border border-slc-border rounded-xl overflow-hidden hover:border-primary/50 transition-all group",
                  !track.isAvailableForPlaylist && "opacity-60"
                )}
              >
                <div className="flex gap-4 p-4">
                  {/* Album Art with Play Button */}
                  <div className="relative flex-shrink-0">
                    {track.albumImageUrl ? (
                      <SafeImage
                        src={track.albumImageUrl}
                        alt={track.albumName || ""}
                        width={80}
                        height={80}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-slc-dark flex items-center justify-center">
                        <Disc3 className="w-10 h-10 text-slc-muted" />
                      </div>
                    )}
                    {track.previewUrl && (
                      <button
                        onClick={() => handlePlayPreview(track)}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                      >
                        {playingTrack === track.id ? (
                          <Pause className="w-8 h-8 text-white" />
                        ) : (
                          <Play className="w-8 h-8 text-white ml-1" />
                        )}
                      </button>
                    )}
                    {track.isFeatured && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                        <Star className="w-3 h-3 text-black" fill="currentColor" />
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate mb-1">
                      {track.name}
                      {track.explicit && (
                        <span className="ml-2 text-[10px] px-1 py-0.5 bg-slc-muted/20 rounded text-slc-muted">
                          E
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-slc-muted truncate mb-1">
                      {track.artistName}
                    </p>
                    {track.albumName && (
                      <p className="text-xs text-slc-muted/70 truncate mb-2">
                        {track.albumName}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slc-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(track.durationMs)}
                      </span>
                      {track.popularity && (
                        <span>Pop: {track.popularity}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Channel */}
                {track.channel && (
                  <div className="px-4 py-2 border-t border-slc-border/50 bg-slc-dark/30">
                    <Link
                      href={`/admin/curated-channels/${track.channel.id}`}
                      className="flex items-center gap-2 text-xs text-slc-muted hover:text-primary"
                    >
                      {track.channel.imageUrl && (
                        <SafeImage
                          src={track.channel.imageUrl}
                          alt=""
                          width={16}
                          height={16}
                          className="rounded-full"
                        />
                      )}
                      {track.channel.name}
                    </Link>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between p-3 border-t border-slc-border/50">
                  <Button
                    size="sm"
                    onClick={() => handleOpenAddModal(track)}
                    disabled={!track.isAvailableForPlaylist}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar a Playlist
                  </Button>

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

      {/* Add to Playlist Modal */}
      {showAddModal && selectedTrack && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAddModal(false)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto bg-slc-dark border border-slc-border rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slc-border">
              <h3 className="font-oswald text-lg uppercase">Agregar a Playlist</h3>
              <button onClick={() => setShowAddModal(false)}>
                <X className="w-5 h-5 text-slc-muted hover:text-white" />
              </button>
            </div>

            {/* Track Preview */}
            <div className="flex items-center gap-4 p-4 bg-slc-card/50">
              {selectedTrack.albumImageUrl ? (
                <SafeImage
                  src={selectedTrack.albumImageUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="rounded"
                />
              ) : (
                <div className="w-12 h-12 rounded bg-slc-dark flex items-center justify-center">
                  <Disc3 className="w-6 h-6 text-slc-muted" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedTrack.name}</p>
                <p className="text-sm text-slc-muted truncate">{selectedTrack.artistName}</p>
              </div>
            </div>

            {/* Playlists */}
            <div className="p-4">
              <p className="text-sm text-slc-muted mb-3">Selecciona una playlist:</p>
              <div className="space-y-2">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handleAddToPlaylist(playlist.id)}
                    disabled={addingToPlaylist === playlist.id}
                    className="w-full flex items-center justify-between p-3 bg-slc-card border border-slc-border rounded-lg hover:border-primary/50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <ListMusic className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{playlist.name}</p>
                        <p className="text-xs text-slc-muted">{playlist.trackCount} tracks</p>
                      </div>
                    </div>
                    {addingToPlaylist === playlist.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 text-slc-muted" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
