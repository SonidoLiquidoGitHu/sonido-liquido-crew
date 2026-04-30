"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Music,
  ArrowLeft,
  Loader2,
  ListMusic,
  Disc3,
  Play,
  Pause,
  Trash2,
  GripVertical,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaylistTrack {
  id: string;
  playlistId: string;
  playlistName: string | null;
  spotifyTrackId: string;
  curatedTrackId: string | null;
  trackName: string;
  artistName: string;
  albumImageUrl: string | null;
  position: number;
  isActive: boolean;
  addedAt: string;
}

interface Playlist {
  id: string;
  name: string;
  description: string;
  trackCount: number;
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  useEffect(() => {
    if (selectedPlaylist) {
      fetchPlaylistTracks(selectedPlaylist);
    }
  }, [selectedPlaylist]);

  useEffect(() => {
    return () => {
      if (audioRef) {
        audioRef.pause();
        audioRef.src = "";
      }
    };
  }, [audioRef]);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/playlists");
      const data = await res.json();
      if (data.success) {
        setPlaylists(data.data);
        if (data.data.length > 0 && !selectedPlaylist) {
          setSelectedPlaylist(data.data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching playlists:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylistTracks = async (playlistId: string) => {
    setLoadingTracks(true);
    try {
      const res = await fetch(`/api/admin/playlists?playlistId=${playlistId}`);
      const data = await res.json();
      if (data.success) {
        setPlaylistTracks(data.data);
      }
    } catch (error) {
      console.error("Error fetching playlist tracks:", error);
    } finally {
      setLoadingTracks(false);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!confirm("¿Eliminar este track de la playlist?")) return;

    try {
      const res = await fetch(`/api/admin/playlists/${trackId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchPlaylists();
        if (selectedPlaylist) {
          fetchPlaylistTracks(selectedPlaylist);
        }
      }
    } catch (error) {
      console.error("Error removing track:", error);
    }
  };

  const handleMoveTrack = async (trackId: string, direction: "up" | "down") => {
    const track = playlistTracks.find((t) => t.id === trackId);
    if (!track) return;

    const currentIndex = playlistTracks.findIndex((t) => t.id === trackId);
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= playlistTracks.length) return;

    const otherTrack = playlistTracks[newIndex];

    try {
      // Swap positions
      await Promise.all([
        fetch(`/api/admin/playlists/${track.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: otherTrack.position }),
        }),
        fetch(`/api/admin/playlists/${otherTrack.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: track.position }),
        }),
      ]);

      if (selectedPlaylist) {
        fetchPlaylistTracks(selectedPlaylist);
      }
    } catch (error) {
      console.error("Error moving track:", error);
    }
  };

  const currentPlaylist = playlists.find((p) => p.id === selectedPlaylist);

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
              Gestionar Playlists
            </h1>
            <p className="text-slc-muted">
              Organiza los tracks curados en playlists
            </p>
          </div>

          <Link href="/admin/curated-channels/tracks">
            <Button>
              <Music className="w-4 h-4 mr-2" />
              Explorar Tracks
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Playlist Selector */}
            <div className="lg:col-span-1">
              <div className="bg-slc-card border border-slc-border rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slc-border">
                  <h2 className="font-oswald uppercase">Playlists</h2>
                </div>
                <div className="divide-y divide-slc-border/50">
                  {playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => setSelectedPlaylist(playlist.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-4 transition-colors text-left",
                        selectedPlaylist === playlist.id
                          ? "bg-primary/10 border-l-2 border-primary"
                          : "hover:bg-slc-dark"
                      )}
                    >
                      <ListMusic
                        className={cn(
                          "w-5 h-5",
                          selectedPlaylist === playlist.id ? "text-primary" : "text-slc-muted"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{playlist.name}</p>
                        <p className="text-xs text-slc-muted">{playlist.trackCount} tracks</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Playlist Tracks */}
            <div className="lg:col-span-3">
              <div className="bg-slc-card border border-slc-border rounded-2xl overflow-hidden">
                {/* Playlist Header */}
                {currentPlaylist && (
                  <div className="p-6 border-b border-slc-border bg-gradient-to-r from-primary/10 to-transparent">
                    <h2 className="font-oswald text-2xl uppercase mb-1">
                      {currentPlaylist.name}
                    </h2>
                    <p className="text-slc-muted">{currentPlaylist.description}</p>
                    <p className="text-sm mt-2">
                      <span className="font-oswald text-primary">{playlistTracks.length}</span> tracks
                    </p>
                  </div>
                )}

                {/* Tracks List */}
                {loadingTracks ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : playlistTracks.length === 0 ? (
                  <div className="text-center py-12">
                    <Disc3 className="w-12 h-12 text-slc-muted mx-auto mb-3" />
                    <p className="text-slc-muted mb-4">Esta playlist está vacía</p>
                    <Link href="/admin/curated-channels/tracks">
                      <Button>
                        <Music className="w-4 h-4 mr-2" />
                        Agregar Tracks
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slc-border/50">
                    {playlistTracks
                      .sort((a, b) => a.position - b.position)
                      .map((track, index) => (
                        <div
                          key={track.id}
                          className="flex items-center gap-4 p-4 hover:bg-slc-dark/30 transition-colors group"
                        >
                          {/* Position & Move Buttons */}
                          <div className="flex flex-col items-center gap-1 w-10">
                            <button
                              onClick={() => handleMoveTrack(track.id, "up")}
                              disabled={index === 0}
                              className="p-1 text-slc-muted hover:text-white disabled:opacity-30"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-slc-muted font-mono w-6 text-center">
                              {track.position}
                            </span>
                            <button
                              onClick={() => handleMoveTrack(track.id, "down")}
                              disabled={index === playlistTracks.length - 1}
                              className="p-1 text-slc-muted hover:text-white disabled:opacity-30"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Album Art */}
                          <div className="relative flex-shrink-0">
                            {track.albumImageUrl ? (
                              <Image
                                src={track.albumImageUrl}
                                alt=""
                                width={56}
                                height={56}
                                className="rounded object-cover"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded bg-slc-dark flex items-center justify-center">
                                <Disc3 className="w-7 h-7 text-slc-muted" />
                              </div>
                            )}
                          </div>

                          {/* Track Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{track.trackName}</p>
                            <p className="text-sm text-slc-muted truncate">{track.artistName}</p>
                          </div>

                          {/* Added Date */}
                          <div className="hidden md:block text-xs text-slc-muted">
                            {new Date(track.addedAt).toLocaleDateString("es-MX")}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={`https://open.spotify.com/track/${track.spotifyTrackId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slc-muted hover:text-green-500 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleRemoveTrack(track.id)}
                              className="p-2 text-slc-muted hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
