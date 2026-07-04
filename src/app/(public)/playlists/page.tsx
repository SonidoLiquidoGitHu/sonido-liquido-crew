"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  ChevronRight,
  Disc3,
  ExternalLink,
  ListMusic,
  Loader2,
  Music,
  Play,
  Share2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { type PlaylistShareData, PlaylistStoryCard } from "./PlaylistStoryCard";

interface Playlist {
  id: string;
  name: string;
  description: string;
  coverColor: string;
  coverImageUrl?: string | null;
  trackCount: number;
  spotifyPlaylistId?: string | null;
  spotifyPlaylistUrl?: string | null;
  tracks?: PlaylistTrack[];
}

interface PlaylistTrack {
  id: string;
  name: string;
  artist: string;
  albumImage: string | null;
  spotifyId: string;
  position: number;
}

function PlaylistsPageContent() {
  const searchParams = useSearchParams();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [sharePlaylist, setSharePlaylist] = useState<Playlist | null>(null);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/playlists");
      const data = await res.json();
      if (data.success) {
        setPlaylists(data.data);
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
      const res = await fetch(`/api/playlists?id=${playlistId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedPlaylist(data.data);
      }
    } catch (error) {
      console.error("Error fetching playlist tracks:", error);
    } finally {
      setLoadingTracks(false);
    }
  };

  const handleSelectPlaylist = (playlist: Playlist) => {
    if (selectedPlaylist?.id === playlist.id) {
      setSelectedPlaylist(null);
    } else {
      if (playlist.spotifyPlaylistId) {
        setSelectedPlaylist(playlist);
      } else {
        fetchPlaylistTracks(playlist.id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slc-dark via-slc-black to-slc-black">
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-green-500/10 rounded-full blur-2xl" />
        </div>

        <div className="section-container relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full mb-6">
              <svg
                className="w-4 h-4 text-green-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              <span className="text-xs font-medium uppercase tracking-wider text-green-500">
                Escucha en Spotify
              </span>
            </div>

            <h1 className="font-oswald text-4xl md:text-5xl uppercase tracking-wide mb-4">
              Playlists Curadas
            </h1>
            <p className="text-slc-muted text-lg">
              Playlists seleccionadas por el crew. Escúchalas directamente o
              ábrelas en Spotify.
            </p>
          </div>

          {/* Playlists Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-20">
              <ListMusic className="w-16 h-16 text-slc-muted mx-auto mb-4" />
              <h3 className="font-oswald text-xl uppercase mb-2">
                No hay playlists
              </h3>
              <p className="text-slc-muted">
                Pronto agregaremos playlists curadas
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {playlists.map((playlist) => (
                <div
                  key={playlist.id}
                  className={cn(
                    "bg-slc-card border border-slc-border rounded-2xl overflow-hidden transition-all",
                    selectedPlaylist?.id === playlist.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "hover:border-primary/50",
                  )}
                >
                  {/* Playlist Header */}
                  <button
                    onClick={() => handleSelectPlaylist(playlist)}
                    className="w-full text-left p-6 hover:bg-slc-dark/30 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Playlist Cover */}
                      {playlist.coverImageUrl ? (
                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                          <Image
                            src={playlist.coverImageUrl}
                            alt={playlist.name}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: `${playlist.coverColor}20`,
                          }}
                        >
                          <ListMusic
                            className="w-10 h-10"
                            style={{ color: playlist.coverColor }}
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="font-oswald text-xl uppercase mb-1 truncate">
                          {playlist.name}
                        </h3>
                        <p className="text-sm text-slc-muted mb-2">
                          {playlist.description}
                        </p>
                        <div className="flex items-center gap-2">
                          {playlist.spotifyPlaylistId && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-500 text-xs rounded-full">
                              <svg
                                className="w-3 h-3"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                              </svg>
                              Spotify
                            </span>
                          )}
                          {playlist.trackCount > 0 && (
                            <span className="text-xs text-slc-muted/70">
                              {playlist.trackCount} tracks
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight
                        className={cn(
                          "w-5 h-5 text-slc-muted transition-transform flex-shrink-0",
                          selectedPlaylist?.id === playlist.id && "rotate-90",
                        )}
                      />
                    </div>
                  </button>

                  {/* Action button row — sits between the header and the expanded content */}
                  <div className="flex items-center justify-end gap-2 px-6 py-2 border-t border-slc-border/50 bg-slc-darker/30">
                    <Link
                      href={`/playlists/curated/${playlist.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-medium uppercase tracking-wide hover:bg-primary/20 hover:border-primary/50 transition-colors"
                      title="Ver página de detalle"
                    >
                      Ver detalle
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSharePlaylist(playlist);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/30 text-[#1ed760] text-xs font-medium uppercase tracking-wide hover:bg-[#1DB954]/20 hover:border-[#1DB954]/50 transition-colors"
                      title="Compartir playlist"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Compartir
                    </button>
                  </div>

                  {/* Expanded Content */}
                  {selectedPlaylist?.id === playlist.id && (
                    <div className="border-t border-slc-border">
                      {playlist.spotifyPlaylistId ? (
                        /* Spotify Embed */
                        <div className="p-4">
                          <iframe
                            src={`https://open.spotify.com/embed/playlist/${playlist.spotifyPlaylistId}?utm_source=generator&theme=0`}
                            width="100%"
                            height="380"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            className="rounded-xl"
                            style={{ border: "none" }}
                            title={`Reproductor de ${playlist.name}`}
                          />
                          {playlist.spotifyPlaylistUrl && (
                            <a
                              href={playlist.spotifyPlaylistUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-bold rounded-full transition-colors text-sm"
                            >
                              <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                              </svg>
                              Abrir en Spotify
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ) : loadingTracks ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : selectedPlaylist?.tracks &&
                        selectedPlaylist.tracks.length > 0 ? (
                        /* Track List (legacy for playlists without Spotify ID) */
                        <>
                          <div className="max-h-72 overflow-y-auto">
                            {selectedPlaylist.tracks.map((track, index) => (
                              <div
                                key={track.id}
                                className="flex items-center gap-3 px-6 py-3 hover:bg-slc-dark/30 transition-colors"
                              >
                                <span className="w-6 text-center text-sm text-slc-muted">
                                  {index + 1}
                                </span>
                                {track.albumImage ? (
                                  <Image
                                    src={track.albumImage}
                                    alt={track.name || "Album"}
                                    width={40}
                                    height={40}
                                    className="rounded"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-slc-dark flex items-center justify-center">
                                    <Disc3 className="w-5 h-5 text-slc-muted" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {track.name}
                                  </p>
                                  <p className="text-xs text-slc-muted truncate">
                                    {track.artist}
                                  </p>
                                </div>
                                <a
                                  href={`https://open.spotify.com/track/${track.spotifyId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-slc-muted hover:text-green-500 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        /* No tracks, no Spotify */
                        <div className="p-8 text-center">
                          <Music className="w-8 h-8 text-slc-muted mx-auto mb-2" />
                          <p className="text-sm text-slc-muted">
                            Próximamente con tracks
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Info Section */}
      <section className="py-16 border-t border-slc-border/30">
        <div className="section-container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="font-oswald text-2xl uppercase mb-4">
              ¿Cómo funciona?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="font-oswald text-primary">1</span>
                </div>
                <h3 className="font-medium mb-1">Elige una playlist</h3>
                <p className="text-sm text-slc-muted">
                  Explora nuestras playlists curadas
                </p>
              </div>
              <div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="font-oswald text-primary">2</span>
                </div>
                <h3 className="font-medium mb-1">Escucha directo</h3>
                <p className="text-sm text-slc-muted">
                  Reproduce las playlists aquí mismo
                </p>
              </div>
              <div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="font-oswald text-primary">3</span>
                </div>
                <h3 className="font-medium mb-1">Sigue en Spotify</h3>
                <p className="text-sm text-slc-muted">
                  Guárdalas en tu biblioteca de Spotify
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Playlist Story Card Share Modal */}
      {sharePlaylist && (
        <PlaylistStoryCard
          playlist={sharePlaylist as PlaylistShareData}
          onClose={() => setSharePlaylist(null)}
        />
      )}
    </div>
  );
}

export default function PlaylistsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-slc-dark via-slc-black to-slc-black flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <PlaylistsPageContent />
    </Suspense>
  );
}
