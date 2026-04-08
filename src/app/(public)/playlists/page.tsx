"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ListMusic,
  Play,
  Pause,
  ExternalLink,
  Check,
  AlertCircle,
  Loader2,
  Music,
  Clock,
  ChevronRight,
  Disc3,
  X,
  UserPlus,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlaylistTrack {
  id: string;
  name: string;
  artist: string;
  albumImage: string | null;
  spotifyId: string;
  position: number;
}

interface Playlist {
  id: string;
  name: string;
  description: string;
  coverColor: string;
  trackCount: number;
  tracks?: PlaylistTrack[];
}

function PlaylistsPageContent() {
  const searchParams = useSearchParams();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savePlaylistId, setSavePlaylistId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [followArtists, setFollowArtists] = useState(true);

  // Success/Error states from URL params
  const success = searchParams.get("success") === "true";
  const spotifyUrl = searchParams.get("spotify_url");
  const trackCount = searchParams.get("track_count");
  const artistsFollowed = searchParams.get("artists_followed");
  const error = searchParams.get("error");

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
      fetchPlaylistTracks(playlist.id);
    }
  };

  const handleOpenSaveModal = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      setSavePlaylistId(playlistId);
      setCustomName(`Sonido Líquido - ${playlist.name}`);
      setFollowArtists(true);
      setShowSaveModal(true);
    }
  };

  const handleSaveToSpotify = () => {
    if (!savePlaylistId) return;

    const returnUrl = encodeURIComponent(`/playlists`);
    const encodedName = encodeURIComponent(customName);
    const followParam = followArtists ? "true" : "false";

    window.location.href = `/api/auth/spotify?playlistId=${savePlaylistId}&returnUrl=${returnUrl}&customName=${encodedName}&followArtists=${followParam}`;
  };

  const getErrorMessage = (error: string) => {
    switch (error) {
      case "spotify_denied":
        return "Cancelaste la autorización de Spotify";
      case "token_failed":
        return "Error al conectar con Spotify";
      case "empty_playlist":
        return "La playlist está vacía";
      case "playlist_create_failed":
        return "No se pudo crear la playlist";
      default:
        return "Ocurrió un error";
    }
  };

  // Get unique album images for cover preview
  const getPlaylistCoverImages = (playlist: Playlist | null) => {
    if (!playlist?.tracks) return [];
    const images = playlist.tracks
      .filter(t => t.albumImage)
      .map(t => t.albumImage as string)
      .filter((img, idx, arr) => arr.indexOf(img) === idx)
      .slice(0, 4);
    return images;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slc-dark via-slc-black to-slc-black">
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-green-500/10 rounded-full blur-2xl" />
        </div>

        <div className="section-container relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full mb-6">
              <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              <span className="text-xs font-medium uppercase tracking-wider text-green-500">
                Guárdalas en tu Spotify
              </span>
            </div>

            <h1 className="font-oswald text-4xl md:text-5xl uppercase tracking-wide mb-4">
              Playlists Curadas
            </h1>
            <p className="text-slc-muted text-lg">
              Playlists seleccionadas por el crew. Agrégalas directamente a tu cuenta de Spotify.
            </p>
          </div>

          {/* Success Message */}
          {success && spotifyUrl && (
            <div className="max-w-xl mx-auto mb-8 bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="font-oswald text-xl uppercase mb-2">Playlist Guardada</h3>
              <p className="text-slc-muted mb-2">
                Se agregaron {trackCount} tracks a tu Spotify
              </p>
              {artistsFollowed && parseInt(artistsFollowed) > 0 && (
                <p className="text-green-400 text-sm mb-4">
                  Ahora sigues a {artistsFollowed} artistas del crew
                </p>
              )}
              <a
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-black font-bold rounded-full transition-colors"
              >
                Abrir en Spotify
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="max-w-xl mx-auto mb-8 bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="font-oswald text-xl uppercase mb-2">Error</h3>
              <p className="text-slc-muted">{getErrorMessage(error)}</p>
            </div>
          )}

          {/* Playlists Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-20">
              <ListMusic className="w-16 h-16 text-slc-muted mx-auto mb-4" />
              <h3 className="font-oswald text-xl uppercase mb-2">No hay playlists</h3>
              <p className="text-slc-muted">Pronto agregaremos playlists curadas</p>
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
                      : "hover:border-primary/50"
                  )}
                >
                  {/* Playlist Header */}
                  <button
                    onClick={() => handleSelectPlaylist(playlist)}
                    className="w-full text-left p-6 hover:bg-slc-dark/30 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Playlist Cover */}
                      <div
                        className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${playlist.coverColor}20` }}
                      >
                        <ListMusic
                          className="w-10 h-10"
                          style={{ color: playlist.coverColor }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-oswald text-xl uppercase mb-1 truncate">
                          {playlist.name}
                        </h3>
                        <p className="text-sm text-slc-muted mb-2">
                          {playlist.description}
                        </p>
                        <p className="text-xs text-slc-muted/70">
                          {playlist.trackCount} tracks
                        </p>
                      </div>

                      <ChevronRight
                        className={cn(
                          "w-5 h-5 text-slc-muted transition-transform flex-shrink-0",
                          selectedPlaylist?.id === playlist.id && "rotate-90"
                        )}
                      />
                    </div>
                  </button>

                  {/* Expanded Track List */}
                  {selectedPlaylist?.id === playlist.id && (
                    <div className="border-t border-slc-border">
                      {loadingTracks ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        <>
                          {/* Track List */}
                          <div className="max-h-72 overflow-y-auto">
                            {selectedPlaylist.tracks?.map((track, index) => (
                              <div
                                key={track.id}
                                className="flex items-center gap-3 px-6 py-3 hover:bg-slc-dark/30 transition-colors"
                              >
                                <span className="w-6 text-center text-sm text-slc-muted">
                                  {index + 1}
                                </span>
                                {track.albumImage ? (
                                  <SafeImage
                                    src={track.albumImage}
                                    alt=""
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

                          {/* Save to Spotify Button */}
                          <div className="p-4 border-t border-slc-border/50 bg-slc-dark/30">
                            <Button
                              onClick={() => handleOpenSaveModal(playlist.id)}
                              className="w-full bg-green-500 hover:bg-green-600 text-black font-bold gap-2"
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                              </svg>
                              Guardar en mi Spotify
                            </Button>
                            <p className="text-xs text-center text-slc-muted mt-2">
                              Personaliza antes de guardar
                            </p>
                          </div>
                        </>
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
                <h3 className="font-medium mb-1">Personaliza y conecta</h3>
                <p className="text-sm text-slc-muted">
                  Elige nombre y sigue a los artistas
                </p>
              </div>
              <div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="font-oswald text-primary">3</span>
                </div>
                <h3 className="font-medium mb-1">Disfruta</h3>
                <p className="text-sm text-slc-muted">
                  La playlist aparece en tu biblioteca
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Save Modal */}
      {showSaveModal && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-50"
            onClick={() => setShowSaveModal(false)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto bg-slc-dark border border-slc-border rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slc-border">
              <h3 className="font-oswald text-lg uppercase">Guardar en Spotify</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-1 text-slc-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cover Preview */}
            <div className="p-6 bg-gradient-to-br from-green-900/30 to-slc-dark">
              <div className="flex items-center gap-4">
                {/* Generated Cover Grid */}
                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 grid grid-cols-2 grid-rows-2 bg-slc-card">
                  {getPlaylistCoverImages(selectedPlaylist).length >= 4 ? (
                    getPlaylistCoverImages(selectedPlaylist).map((img, i) => (
                      <SafeImage
                        key={i}
                        src={img}
                        alt=""
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ))
                  ) : (
                    <div className="col-span-2 row-span-2 flex items-center justify-center bg-green-500/20">
                      <ListMusic className="w-12 h-12 text-green-500" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slc-muted mb-1">Vista previa</p>
                  <p className="font-medium truncate">{customName}</p>
                  <p className="text-xs text-slc-muted">
                    {selectedPlaylist?.trackCount || 0} tracks
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              {/* Custom Name */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Pencil className="w-4 h-4 inline mr-2" />
                  Nombre de la playlist
                </label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Mi playlist de Sonido Líquido"
                  className="bg-slc-card border-slc-border"
                />
              </div>

              {/* Follow Artists Option */}
              <div
                onClick={() => setFollowArtists(!followArtists)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                  followArtists
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-slc-card border-slc-border hover:border-slc-muted"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  followArtists ? "bg-green-500/20" : "bg-slc-dark"
                )}>
                  <UserPlus className={cn(
                    "w-5 h-5",
                    followArtists ? "text-green-500" : "text-slc-muted"
                  )} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Seguir a los artistas</p>
                  <p className="text-xs text-slc-muted">
                    Sigue automáticamente a los artistas del roster en Spotify
                  </p>
                </div>
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  followArtists
                    ? "bg-green-500 border-green-500"
                    : "border-slc-muted"
                )}>
                  {followArtists && <Check className="w-4 h-4 text-black" />}
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSaveToSpotify}
                disabled={!customName.trim()}
                className="w-full h-12 bg-green-500 hover:bg-green-600 text-black font-bold gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Guardar y Conectar con Spotify
              </Button>

              <p className="text-xs text-center text-slc-muted">
                Serás redirigido a Spotify para autorizar
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function PlaylistsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slc-dark via-slc-black to-slc-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <PlaylistsPageContent />
    </Suspense>
  );
}
