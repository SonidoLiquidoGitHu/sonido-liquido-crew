"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ListMusic, Play, ExternalLink, Loader2, Music2, Headphones,
  Plus, Search, X, GripVertical, Trash2, ChevronRight, LogIn, LogOut,
  Disc3, User,
} from "lucide-react";
import { type PlaylistTrack, type SearchResultTrack, formatDuration, formatFollowers } from "@/lib/types";
import { ARTIST_CONFIGS } from "@/lib/artist-config";

// ── Auth Hook ─────────────────────────────────────────────────────

interface AuthUser {
  id: string;
  displayName: string;
  email: string;
  image: string;
}

function useSpotifyAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/spotify/me");
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = () => {
    window.location.href = "/api/auth/spotify/login";
  };

  const logout = async () => {
    await fetch("/api/auth/spotify/logout", { method: "POST" });
    setUser(null);
  };

  return { user, loading, login, logout };
}

// ── Main Admin Page ───────────────────────────────────────────────

export default function PlaylistAdminPage() {
  const auth = useSpotifyAuth();

  if (auth.loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!auth.user) {
    return <LoginScreen onLogin={auth.login} />;
  }

  return <PlaylistDashboard user={auth.user} onLogout={auth.logout} />;
}

// ── Login Screen ──────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <ListMusic className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          Playlist Creator
        </h1>
        <p className="mt-4 text-muted-foreground">
          Inicia sesión con tu cuenta de Spotify para crear y gestionar playlists curadas para Sonido Líquido Crew.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Necesitas permisos para crear playlists, agregar tracks y subir portadas.
        </p>
        <button
          onClick={onLogin}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1DB954] px-8 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          <LogIn className="h-4 w-4" />
          Iniciar sesión con Spotify
        </button>
        <div className="mt-6 text-xs text-muted-foreground">
          Se requerirán los siguientes permisos: crear playlists, agregar tracks, subir imágenes
        </div>
      </div>
    </main>
  );
}

// ── Playlist Dashboard ────────────────────────────────────────────

interface DashboardUser {
  id: string;
  displayName: string;
  email: string;
  image: string;
}

function PlaylistDashboard({ user, onLogout }: { user: DashboardUser; onLogout: () => void }) {
  const [playlists, setPlaylists] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchPlaylists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/playlists");
      const data = await res.json();
      if (data.playlists) {
        setPlaylists(data.playlists);
      }
    } catch {
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlaylists(); }, [fetchPlaylists]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Playlist Creator</h1>
          <p className="mt-1 text-muted-foreground">Crea y gestiona playlists curadas del crew</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5">
            {user.image && (
              <Image src={user.image} alt={user.displayName} width={24} height={24} className="rounded-full" />
            )}
            <span className="text-sm font-medium">{user.displayName}</span>
          </div>
          <button
            onClick={onLogout}
            className="rounded-full border border-[#2a2a2a] bg-[#1a1a1a] p-2 text-muted-foreground transition-colors hover:text-foreground"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nueva Playlist
        </button>
      </div>

      {/* Playlists Grid or Selected Playlist Editor */}
      {selectedPlaylist ? (
        <PlaylistEditor
          playlistId={selectedPlaylist}
          onBack={() => { setSelectedPlaylist(null); fetchPlaylists(); }}
        />
      ) : (
        <>
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : playlists.length === 0 ? (
            <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-12 text-center">
              <ListMusic className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-bold">No tienes playlists todavía</p>
              <p className="mt-2 text-muted-foreground">Crea tu primera playlist para empezar a curar música del crew</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {playlists.map((pl) => {
                const images = pl.images as { url: string; height: number; width: number }[] | undefined;
                const tracks = pl.tracks as { total: number } | undefined;
                const externalUrls = pl.external_urls as { spotify: string } | undefined;
                return (
                  <button
                    key={String(pl.id)}
                    onClick={() => setSelectedPlaylist(String(pl.id))}
                    className="group overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-left transition-all hover:border-primary/30"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#2a2a2a]">
                      {images && images.length > 0 ? (
                        <Image
                          src={images[0].url}
                          alt={String(pl.name)}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ListMusic className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="truncate text-sm font-bold">{String(pl.name)}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tracks?.total ?? 0} tracks
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {pl.public ? "Pública" : "Privada"}
                        </span>
                        {externalUrls?.spotify && (
                          <a
                            href={externalUrls.spotify}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create Playlist Modal */}
      {showCreate && (
        <CreatePlaylistModal
          onClose={() => setShowCreate(false)}
          onCreated={(id: string) => {
            setShowCreate(false);
            setSelectedPlaylist(id);
          }}
        />
      )}
    </main>
  );
}

// ── Create Playlist Modal ─────────────────────────────────────────

function CreatePlaylistModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/playlists/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description, public: isPublic }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (data.playlist?.id) {
        onCreated(data.playlist.id);
      }
    } catch {
      setError("Error al crear la playlist");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Nueva Playlist</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="SLC - Best of 2025"
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Lo mejor del Hip Hop mexicano curado por SLC..."
              rows={3}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="playlist-public"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-[#2a2a2a] accent-primary"
            />
            <label htmlFor="playlist-public" className="text-sm">Playlist pública</label>
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="w-full rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {creating ? "Creando..." : "Crear Playlist"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Playlist Editor ───────────────────────────────────────────────

function PlaylistEditor({
  playlistId,
  onBack,
}: {
  playlistId: string;
  onBack: () => void;
}) {
  const [playlist, setPlaylist] = useState<Record<string, unknown> | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showRosterTracks, setShowRosterTracks] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);

  const fetchPlaylist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/playlists?playlistId=${playlistId}`);
      const data = await res.json();
      if (data.playlist) {
        setPlaylist(data.playlist);
        if (Array.isArray(data.tracks)) {
          setTracks(
            data.tracks.map((t: Record<string, unknown>) => {
              const track = t.track as Record<string, unknown>;
              const artists = track.artists as Record<string, unknown>[];
              const album = track.album as Record<string, unknown>;
              const albumImages = album?.images as { url: string }[] | undefined;
              return {
                addedAt: String(t.added_at ?? ""),
                id: String(track.id ?? ""),
                name: String(track.name ?? ""),
                uri: String(track.uri ?? ""),
                durationMs: typeof track.duration_ms === "number" ? track.duration_ms : 0,
                artists: Array.isArray(artists)
                  ? artists.map((a: Record<string, unknown>) => ({
                      id: String(a.id ?? ""),
                      name: String(a.name ?? ""),
                      spotifyUrl: (a.external_urls as Record<string, string>)?.spotify ?? "",
                    }))
                  : [],
                album: {
                  id: String(album?.id ?? ""),
                  name: String(album?.name ?? ""),
                  images: Array.isArray(albumImages) ? albumImages : [],
                  spotifyUrl: (album?.external_urls as Record<string, string>)?.spotify ?? "",
                },
                spotifyUrl: (track.external_urls as Record<string, string>)?.spotify ?? "",
                previewUrl: track.preview_url ? String(track.preview_url) : null,
              };
            })
          );
        }
      }
    } catch {
      setPlaylist(null);
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => { fetchPlaylist(); }, [fetchPlaylist]);

  const addTracks = async (uris: string[]) => {
    try {
      await fetch("/api/playlists/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, action: "add_tracks", data: { uris } }),
      });
      fetchPlaylist();
    } catch {
      // silently fail
    }
  };

  const removeTrack = async (uri: string) => {
    try {
      await fetch("/api/playlists/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, action: "remove_tracks", data: { uris: [uri], snapshotId: playlist?.snapshot_id } }),
      });
      fetchPlaylist();
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">No se pudo cargar la playlist</p>
        <button onClick={onBack} className="mt-4 text-primary hover:underline">Volver</button>
      </div>
    );
  }

  const plImages = playlist.images as { url: string; height: number; width: number }[] | undefined;
  const plTracks = playlist.tracks as { total: number } | undefined;
  const plExternal = playlist.external_urls as { spotify: string } | undefined;

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4 rotate-180" />
        Mis Playlists
      </button>

      {/* Playlist Header */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-xl bg-[#2a2a2a]">
          {plImages && plImages.length > 0 ? (
            <Image src={plImages[0].url} alt={String(playlist.name)} fill className="object-cover" sizes="192px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ListMusic className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Playlist</span>
          <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{String(playlist.name)}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {String(playlist.description ?? "")}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-sm font-medium">{plTracks?.total ?? 0} tracks</span>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {playlist.public ? "Pública" : "Privada"}
            </span>
            {plExternal?.spotify && (
              <a href={plExternal.spotify} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-1.5 text-xs font-medium transition-colors hover:border-primary"
            >
              <Search className="h-3.5 w-3.5" />
              Buscar Tracks
            </button>
            <button
              onClick={() => setShowRosterTracks(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-1.5 text-xs font-medium transition-colors hover:border-primary"
            >
              <Disc3 className="h-3.5 w-3.5" />
              Tracks del Roster
            </button>
            <button
              onClick={() => setEditingDetails(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-4 py-1.5 text-xs font-medium transition-colors hover:border-primary"
            >
              Editar Detalles
            </button>
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]">
        <div className="border-b border-[#2a2a2a] px-4 py-3">
          <h3 className="text-sm font-bold">Tracks</h3>
        </div>
        {tracks.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Music2 className="mx-auto mb-3 h-8 w-8" />
            <p className="text-sm">No hay tracks todavía. Busca y agrega tracks del roster o de otros artistas.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2a2a2a]">
            {tracks.map((track, idx) => (
              <div
                key={`${track.id}-${idx}`}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#2a2a2a]/30"
              >
                <span className="w-6 text-right text-xs text-muted-foreground">{idx + 1}</span>
                {track.album.images.length > 0 ? (
                  <Image
                    src={track.album.images[0].url}
                    alt={track.album.name}
                    width={40}
                    height={40}
                    className="rounded"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-[#2a2a2a]">
                    <Music2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{track.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {track.artists.map((a) => a.name).join(", ")} · {track.album.name}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{formatDuration(track.durationMs)}</span>
                <button
                  onClick={() => removeTrack(track.uri)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 transition-opacity hover:text-red-300"
                  title="Quitar track"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search Modal */}
      {showSearch && (
        <SearchTracksModal
          onClose={() => setShowSearch(false)}
          onAdd={addTracks}
        />
      )}

      {/* Roster Tracks Modal */}
      {showRosterTracks && (
        <RosterTracksModal
          onClose={() => setShowRosterTracks(false)}
          onAdd={addTracks}
        />
      )}

      {/* Edit Details Modal */}
      {editingDetails && playlist && (
        <EditDetailsModal
          playlistId={playlistId}
          currentName={String(playlist.name)}
          currentDescription={String(playlist.description ?? "")}
          currentPublic={!!playlist.public}
          onClose={() => setEditingDetails(false)}
          onSaved={fetchPlaylist}
        />
      )}
    </div>
  );
}

// ── Search Tracks Modal ───────────────────────────────────────────

function SearchTracksModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (uris: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/playlists/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.tracks) {
        setResults(
          data.tracks.map((t: Record<string, unknown>) => ({
            id: String(t.id ?? ""),
            name: String(t.name ?? ""),
            uri: String(t.uri ?? ""),
            durationMs: typeof t.duration_ms === "number" ? t.duration_ms : 0,
            artists: Array.isArray(t.artists)
              ? t.artists.map((a: Record<string, unknown>) => ({ id: String(a.id ?? ""), name: String(a.name ?? "") }))
              : [],
            album: {
              id: String((t.album as Record<string, unknown>)?.id ?? ""),
              name: String((t.album as Record<string, unknown>)?.name ?? ""),
              images: Array.isArray((t.album as Record<string, unknown>)?.images)
                ? (t.album as Record<string, unknown>).images as { url: string }[]
                : [],
            },
            previewUrl: null,
          }))
        );
      }
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const toggleSelect = (uri: string) => {
    const next = new Set(selected);
    if (next.has(uri)) next.delete(uri);
    else next.add(uri);
    setSelected(next);
  };

  const handleAdd = () => {
    if (selected.size === 0) return;
    onAdd(Array.from(selected));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#2a2a2a] p-4">
          <h2 className="text-lg font-bold">Buscar Tracks</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 border-b border-[#2a2a2a] p-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar artista, canción o álbum..."
            className="flex-1 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {results.map((track) => (
            <button
              key={track.id}
              onClick={() => toggleSelect(track.uri)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                selected.has(track.uri) ? "bg-primary/10 border border-primary/30" : "hover:bg-[#2a2a2a]/30"
              }`}
            >
              {track.album.images.length > 0 ? (
                <Image src={track.album.images[0].url} alt={track.album.name} width={40} height={40} className="rounded" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-[#2a2a2a]">
                  <Music2 className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{track.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {track.artists.map((a) => a.name).join(", ")}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{formatDuration(track.durationMs)}</span>
            </button>
          ))}
          {results.length === 0 && query && !searching && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Busca tracks para agregar a tu playlist
            </p>
          )}
        </div>

        {selected.size > 0 && (
          <div className="border-t border-[#2a2a2a] p-4">
            <button
              onClick={handleAdd}
              className="w-full rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              Agregar {selected.size} track{selected.size > 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Roster Tracks Modal ───────────────────────────────────────────

function RosterTracksModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (uris: string[]) => void;
}) {
  const [rosterTracks, setRosterTracks] = useState<{ artistId: string; tracks: SearchResultTrack[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/playlists/artist-tracks")
      .then((r) => r.json())
      .then((data) => {
        if (data.artists) {
          setRosterTracks(
            data.artists.map((a: Record<string, unknown>) => ({
              artistId: String(a.artistId ?? ""),
              tracks: Array.isArray(a.tracks)
                ? a.tracks.map((t: Record<string, unknown>) => ({
                    id: String(t.id ?? ""),
                    name: String(t.name ?? ""),
                    uri: String(t.uri ?? ""),
                    durationMs: typeof t.duration_ms === "number" ? t.duration_ms : 0,
                    artists: Array.isArray(t.artists)
                      ? t.artists.map((ar: Record<string, unknown>) => ({ id: String(ar.id ?? ""), name: String(ar.name ?? "") }))
                      : [],
                    album: {
                      id: String((t.album as Record<string, unknown>)?.id ?? ""),
                      name: String((t.album as Record<string, unknown>)?.name ?? ""),
                      images: Array.isArray((t.album as Record<string, unknown>)?.images)
                        ? (t.album as Record<string, unknown>).images as { url: string }[]
                        : [],
                    },
                    previewUrl: null,
                  }))
                : [],
            }))
          );
        }
      })
      .catch(() => setRosterTracks([]))
      .finally(() => setLoading(false));
  }, []);

  const toggleSelect = (uri: string) => {
    const next = new Set(selected);
    if (next.has(uri)) next.delete(uri);
    else next.add(uri);
    setSelected(next);
  };

  const handleAdd = () => {
    if (selected.size === 0) return;
    onAdd(Array.from(selected));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-[#2a2a2a] bg-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#2a2a2a] p-4">
          <h2 className="text-lg font-bold">Tracks del Roster</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            rosterTracks.map((artist) => (
              <div key={artist.artistId} className="mb-4">
                <div className="mb-2 px-3 text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  {artist.tracks.length > 0 ? artist.tracks[0].artists[0]?.name : artist.artistId}
                </div>
                {artist.tracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => toggleSelect(track.uri)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                      selected.has(track.uri) ? "bg-primary/10 border border-primary/30" : "hover:bg-[#2a2a2a]/30"
                    }`}
                  >
                    {track.album.images.length > 0 ? (
                      <Image src={track.album.images[0].url} alt={track.album.name} width={36} height={36} className="rounded" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded bg-[#2a2a2a]">
                        <Music2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{track.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {track.artists.map((a) => a.name).join(", ")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {selected.size > 0 && (
          <div className="border-t border-[#2a2a2a] p-4">
            <button
              onClick={handleAdd}
              className="w-full rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              Agregar {selected.size} track{selected.size > 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Edit Details Modal ────────────────────────────────────────────

function EditDetailsModal({
  playlistId,
  currentName,
  currentDescription,
  currentPublic,
  onClose,
  onSaved,
}: {
  playlistId: string;
  currentName: string;
  currentDescription: string;
  currentPublic: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription);
  const [isPublic, setIsPublic] = useState(currentPublic);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/playlists/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId,
          action: "details",
          data: { name: name.trim(), description, public: isPublic },
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        onSaved();
        onClose();
      }
    } catch {
      setError("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Editar Playlist</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-public"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-[#2a2a2a] accent-primary"
            />
            <label htmlFor="edit-public" className="text-sm">Playlist pública</label>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50 hover:opacity-90"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
