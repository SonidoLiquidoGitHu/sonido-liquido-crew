"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ListMusic,
  Play,
  Pause,
  Heart,
  Share2,
  Clock,
  User,
  Users,
  Music,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Code,
  X,
  UserPlus,
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

interface Collaborator {
  id: string;
  name?: string;
  email: string;
  role: string;
}

interface EmbedCode {
  iframe: string;
  html: string;
}

interface Playlist {
  id: string;
  name: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  ownerName?: string;
  playCount: number;
  likeCount: number;
  isPublic: boolean;
  isCollaborative?: boolean;
  createdAt: string;
  tracks: Track[];
  collaborators?: Collaborator[];
  embedCode?: EmbedCode;
}

export default function PlaylistPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [embedCopied, setEmbedCopied] = useState<"iframe" | "html" | null>(null);

  useEffect(() => {
    fetchPlaylist();
  }, [slug]);

  async function fetchPlaylist() {
    try {
      const res = await fetch(`/api/community/playlists?slug=${slug}`);
      const data = await res.json();

      if (data.success) {
        setPlaylist(data.data);
        // Increment play count
        incrementPlayCount(data.data.id);
      } else {
        setError(data.error || "Playlist no encontrada");
      }
    } catch (err) {
      setError("Error al cargar playlist");
    } finally {
      setLoading(false);
    }
  }

  async function incrementPlayCount(id: string) {
    try {
      await fetch(`/api/community/playlists/${id}/play`, { method: "POST" });
    } catch (err) {
      // Silent fail
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  function getTotalDuration() {
    if (!playlist) return "0:00";
    const total = playlist.tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
    const mins = Math.floor(total / 60);
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }
    return `${mins} min`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slc-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="min-h-screen bg-slc-black flex items-center justify-center">
        <div className="text-center">
          <ListMusic className="w-16 h-16 text-slc-muted mx-auto mb-4" />
          <h1 className="font-oswald text-2xl uppercase text-white mb-2">
            Playlist No Encontrada
          </h1>
          <p className="text-slc-muted mb-6">{error}</p>
          <Link href="/playlists">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Ver Playlists
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slc-black">
      {/* Header */}
      <section className="relative py-12 overflow-hidden">
        {/* Background blur */}
        {playlist.coverImageUrl && (
          <div className="absolute inset-0">
            <img
              src={playlist.coverImageUrl}
              alt=""
              className="w-full h-full object-cover blur-3xl opacity-20 scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-slc-black/80 to-slc-black" />
          </div>
        )}

        <div className="relative section-container">
          {/* Back button */}
          <Link
            href="/playlists"
            className="inline-flex items-center gap-2 text-slc-muted hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Playlists
          </Link>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Cover */}
            <div className="flex-shrink-0">
              <div className="w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden bg-slc-card shadow-2xl mx-auto md:mx-0">
                {playlist.coverImageUrl ? (
                  <img
                    src={playlist.coverImageUrl}
                    alt={playlist.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-slc-dark">
                    <ListMusic className="w-20 h-20 text-purple-500/50" />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-400 text-xs uppercase tracking-wider rounded-full mb-3">
                Playlist de la Comunidad
              </span>

              <h1 className="font-oswald text-4xl md:text-5xl uppercase text-white mb-3">
                {playlist.name}
              </h1>

              {playlist.description && (
                <p className="text-slc-muted mb-4 max-w-xl">
                  {playlist.description}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-slc-muted mb-6">
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {playlist.ownerName || "Anónimo"}
                </span>
                <span className="flex items-center gap-1">
                  <Music className="w-4 h-4" />
                  {playlist.tracks.length} tracks
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {getTotalDuration()}
                </span>
                <span className="flex items-center gap-1">
                  <Play className="w-4 h-4" />
                  {playlist.playCount} reproducciones
                </span>
              </div>

              {/* Collaborators */}
              {playlist.collaborators && playlist.collaborators.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-slc-muted" />
                  <span className="text-sm text-slc-muted">
                    Colaboradores: {playlist.collaborators.map(c => c.name || c.email.split("@")[0]).join(", ")}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <Button
                  onClick={copyLink}
                  variant="outline"
                  className="border-slc-border"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 mr-2" />
                      Compartir
                    </>
                  )}
                </Button>
                {playlist.embedCode && (
                  <Button
                    onClick={() => setShowEmbedModal(true)}
                    variant="outline"
                    className="border-slc-border"
                  >
                    <Code className="w-4 h-4 mr-2" />
                    Embed
                  </Button>
                )}
                <Link href="/comunidad">
                  <Button variant="outline" className="border-slc-border">
                    <ListMusic className="w-4 h-4 mr-2" />
                    Crear mi Playlist
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Track List */}
      <section className="py-8">
        <div className="section-container">
          <div className="bg-slc-card border border-slc-border rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[40px_1fr_1fr_80px] gap-4 px-4 py-3 border-b border-slc-border text-xs text-slc-muted uppercase tracking-wider">
              <span className="text-center">#</span>
              <span>Título</span>
              <span className="hidden md:block">Artista</span>
              <span className="text-right">
                <Clock className="w-4 h-4 inline" />
              </span>
            </div>

            {/* Tracks */}
            <div className="divide-y divide-slc-border/50">
              {playlist.tracks.map((track, index) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  index={index}
                  isPlaying={currentTrack === track.id && isPlaying}
                  onClick={() => {
                    if (track.spotifyUri) {
                      window.open(
                        `https://open.spotify.com/track/${track.spotifyUri.replace("spotify:track:", "")}`,
                        "_blank"
                      );
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Created date */}
      <section className="pb-16">
        <div className="section-container">
          <p className="text-center text-xs text-slc-muted flex items-center justify-center gap-2">
            <Calendar className="w-3 h-3" />
            Creada el {new Date(playlist.createdAt).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </section>

      {/* Embed Modal */}
      {showEmbedModal && playlist.embedCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-slc-card border border-slc-border rounded-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slc-border">
              <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
                <Code className="w-5 h-5 text-purple-500" />
                Embed Widget
              </h2>
              <button onClick={() => setShowEmbedModal(false)} className="text-slc-muted hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-sm text-slc-muted">
                Comparte esta playlist en tu sitio web copiando el código de abajo.
              </p>

              {/* Preview */}
              <div className="border border-slc-border rounded-xl overflow-hidden">
                <div className="bg-slc-dark p-2 border-b border-slc-border text-xs text-slc-muted">
                  Vista previa (300px height)
                </div>
                <iframe
                  src={`/embed/playlist/${playlist.slug}?theme=dark`}
                  width="100%"
                  height="300"
                  className="border-0"
                />
              </div>

              {/* iFrame Code */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">iFrame (recomendado)</label>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(playlist.embedCode!.iframe);
                      setEmbedCopied("iframe");
                      setTimeout(() => setEmbedCopied(null), 2000);
                    }}
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                  >
                    {embedCopied === "iframe" ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-slc-dark rounded-lg text-xs text-green-400 overflow-x-auto">
                  <code>{playlist.embedCode.iframe}</code>
                </pre>
              </div>

              {/* Widget Code */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Widget Script</label>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(playlist.embedCode!.html);
                      setEmbedCopied("html");
                      setTimeout(() => setEmbedCopied(null), 2000);
                    }}
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                  >
                    {embedCopied === "html" ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 bg-slc-dark rounded-lg text-xs text-green-400 overflow-x-auto whitespace-pre-wrap">
                  <code>{playlist.embedCode.html}</code>
                </pre>
              </div>

              {/* Options */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-slc-muted">Opciones de URL:</span>
                <code className="px-2 py-1 bg-slc-dark rounded">?theme=dark</code>
                <code className="px-2 py-1 bg-slc-dark rounded">?theme=light</code>
                <code className="px-2 py-1 bg-slc-dark rounded">?compact=true</code>
              </div>
            </div>

            <div className="p-4 border-t border-slc-border flex justify-end">
              <Button onClick={() => setShowEmbedModal(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Track Row Component
function TrackRow({
  track,
  index,
  isPlaying,
  onClick,
}: {
  track: Track;
  index: number;
  isPlaying: boolean;
  onClick: () => void;
}) {
  function formatDuration(seconds?: number) {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "group grid grid-cols-[auto_1fr_auto] md:grid-cols-[40px_1fr_1fr_80px] gap-4 px-4 py-3 hover:bg-slc-dark/50 transition-colors cursor-pointer",
        isPlaying && "bg-purple-500/10"
      )}
    >
      {/* Number / Play */}
      <div className="flex items-center justify-center w-6">
        <span className="text-slc-muted group-hover:hidden">{index + 1}</span>
        <Play
          className={cn(
            "w-4 h-4 hidden group-hover:block",
            isPlaying ? "text-purple-500" : "text-white"
          )}
          fill="currentColor"
        />
      </div>

      {/* Title & Cover */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded bg-slc-dark overflow-hidden flex-shrink-0">
          {track.coverUrl ? (
            <img
              src={track.coverUrl}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-4 h-4 text-slc-muted" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p
            className={cn(
              "font-medium truncate",
              isPlaying ? "text-purple-400" : "text-white"
            )}
          >
            {track.title}
          </p>
          <p className="text-xs text-slc-muted truncate md:hidden">
            {track.artist}
          </p>
        </div>
      </div>

      {/* Artist */}
      <p className="hidden md:flex items-center text-sm text-slc-muted truncate">
        {track.artist}
      </p>

      {/* Duration & Spotify */}
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-slc-muted">
          {formatDuration(track.duration)}
        </span>
        {track.spotifyUri && (
          <ExternalLink className="w-3 h-3 text-slc-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  );
}
