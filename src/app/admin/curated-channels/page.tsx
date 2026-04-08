"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Music,
  Plus,
  Search,
  Loader2,
  Trash2,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Users,
  Disc3,
  Settings2,
  Eye,
  EyeOff,
  ChevronDown,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CuratedChannel {
  id: string;
  spotifyArtistId: string;
  spotifyArtistUrl: string;
  name: string;
  imageUrl: string | null;
  genres: string | null;
  popularity: number | null;
  followers: number | null;
  category: string;
  priority: number;
  description: string | null;
  autoSync: boolean;
  syncNewReleases: boolean;
  syncTopTracks: boolean;
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
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

export default function CuratedChannelsPage() {
  const [channels, setChannels] = useState<CuratedChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [showInactive, setShowInactive] = useState(false);

  // Add channel modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSpotifyUrl, setNewSpotifyUrl] = useState("");
  const [newCategory, setNewCategory] = useState("roster");
  const [newDescription, setNewDescription] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Sync state
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    fetchChannels();
  }, [showInactive]);

  const fetchChannels = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/curated-channels?active=${!showInactive}`);
      const data = await res.json();
      if (data.success) {
        setChannels(data.data);
      }
    } catch (error) {
      console.error("Error fetching channels:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddChannel = async () => {
    if (!newSpotifyUrl.trim()) {
      setAddError("Ingresa la URL de Spotify del artista");
      return;
    }

    setAdding(true);
    setAddError("");

    try {
      const res = await fetch("/api/admin/curated-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotifyUrl: newSpotifyUrl,
          category: newCategory,
          description: newDescription,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setShowAddModal(false);
        setNewSpotifyUrl("");
        setNewDescription("");
        fetchChannels();
      } else {
        // Show rate limit hint if available
        if (data.rateLimited && data.hint) {
          setAddError(`${data.error}\n\n${data.hint}`);
        } else {
          setAddError(data.error || "Error al agregar el canal");
        }
      }
    } catch (error) {
      setAddError("Error de conexión");
    } finally {
      setAdding(false);
    }
  };

  const handleSyncChannel = async (channelId: string) => {
    setSyncing(channelId);
    try {
      const res = await fetch(`/api/admin/curated-channels/${channelId}/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert(`Sincronizado: ${data.data.tracksAdded} tracks nuevos de ${data.data.albumsProcessed} álbumes`);
        fetchChannels();
      } else {
        // Show rate limit hint if available
        if (data.rateLimited && data.hint) {
          alert(`${data.error}\n\n${data.hint}`);
        } else {
          alert(data.error || "Error al sincronizar");
        }
      }
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setSyncing(null);
    }
  };

  const handleToggleActive = async (channel: CuratedChannel) => {
    try {
      const res = await fetch(`/api/admin/curated-channels/${channel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !channel.isActive }),
      });

      if (res.ok) {
        fetchChannels();
      }
    } catch (error) {
      console.error("Error toggling channel:", error);
    }
  };

  const handleDeleteChannel = async (channel: CuratedChannel) => {
    if (!confirm(`¿Eliminar "${channel.name}" de los canales curados?`)) return;

    try {
      const res = await fetch(`/api/admin/curated-channels/${channel.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchChannels();
      }
    } catch (error) {
      console.error("Error deleting channel:", error);
    }
  };

  const filteredChannels = channels.filter((channel) => {
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || channel.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const formatNumber = (num: number | null) => {
    if (!num) return "-";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-slc-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-oswald text-3xl uppercase mb-2">
              Canales Curados de Spotify
            </h1>
            <p className="text-slc-muted">
              Administra qué artistas de Spotify están disponibles para agregar canciones a las playlists
            </p>
          </div>

          <div className="flex gap-3">
            <Link href="/admin/curated-channels/tracks">
              <Button variant="outline">
                <Music className="w-4 h-4 mr-2" />
                Ver Tracks
              </Button>
            </Link>
            <Link href="/admin/curated-channels/playlists">
              <Button variant="outline">
                <Disc3 className="w-4 h-4 mr-2" />
                Playlists
              </Button>
            </Link>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Canal
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
            <Input
              placeholder="Buscar por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg"
          >
            <option value="">Todas las categorías</option>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <Button
            variant={showInactive ? "default" : "outline"}
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
            {showInactive ? "Mostrando todos" : "Mostrar inactivos"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slc-card border border-slc-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-oswald">{channels.length}</p>
                <p className="text-xs text-slc-muted">Canales Curados</p>
              </div>
            </div>
          </div>
          <div className="bg-slc-card border border-slc-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-oswald">{channels.filter(c => c.isActive).length}</p>
                <p className="text-xs text-slc-muted">Activos</p>
              </div>
            </div>
          </div>
          <div className="bg-slc-card border border-slc-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-oswald">{channels.filter(c => c.category === "roster").length}</p>
                <p className="text-xs text-slc-muted">Del Roster</p>
              </div>
            </div>
          </div>
          <div className="bg-slc-card border border-slc-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Disc3 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-oswald">{channels.filter(c => c.category === "collaborator").length}</p>
                <p className="text-xs text-slc-muted">Colaboradores</p>
              </div>
            </div>
          </div>
        </div>

        {/* Channels Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="text-center py-20">
            <Music className="w-16 h-16 text-slc-muted mx-auto mb-4" />
            <h3 className="text-xl font-oswald uppercase mb-2">No hay canales</h3>
            <p className="text-slc-muted mb-4">
              {searchQuery || filterCategory
                ? "No se encontraron canales con estos filtros"
                : "Agrega tu primer canal de Spotify para comenzar"}
            </p>
            {!searchQuery && !filterCategory && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Canal
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChannels.map((channel) => (
              <div
                key={channel.id}
                className={cn(
                  "bg-slc-card border border-slc-border rounded-xl overflow-hidden transition-all hover:border-primary/50",
                  !channel.isActive && "opacity-50"
                )}
              >
                {/* Channel Header - Clickable */}
                <Link
                  href={`/admin/curated-channels/${channel.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-slc-dark/30 transition-colors"
                >
                  {channel.imageUrl ? (
                    <SafeImage
                      src={channel.imageUrl}
                      alt={channel.name}
                      width={64}
                      height={64}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slc-dark flex items-center justify-center">
                      <Music className="w-8 h-8 text-slc-muted" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-oswald text-lg truncate">{channel.name}</h3>
                    <span className={cn(
                      "inline-flex text-xs px-2 py-0.5 rounded-full border",
                      categoryColors[channel.category]
                    )}>
                      {categoryLabels[channel.category]}
                    </span>
                  </div>
                </Link>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 px-4 py-3 bg-slc-dark/50">
                  <div>
                    <p className="text-xs text-slc-muted">Seguidores</p>
                    <p className="font-oswald">{formatNumber(channel.followers)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slc-muted">Popularidad</p>
                    <p className="font-oswald">{channel.popularity || "-"}/100</p>
                  </div>
                </div>

                {/* Genres */}
                {channel.genres && (
                  <div className="px-4 py-2 border-t border-slc-border/50">
                    <div className="flex flex-wrap gap-1">
                      {(JSON.parse(channel.genres) as string[]).slice(0, 3).map((genre) => (
                        <span key={genre} className="text-xs px-2 py-0.5 bg-slc-dark rounded-full text-slc-muted">
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between p-4 border-t border-slc-border/50">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSyncChannel(channel.id)}
                      disabled={syncing === channel.id}
                    >
                      {syncing === channel.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(channel)}
                    >
                      {channel.isActive ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteChannel(channel)}
                      className="text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <a
                    href={channel.spotifyArtistUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-500 hover:text-green-400"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Channel Modal */}
      {showAddModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAddModal(false)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-lg mx-auto bg-slc-dark border border-slc-border rounded-2xl p-6">
            <h2 className="font-oswald text-xl uppercase mb-4">Agregar Canal de Spotify</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">URL del Artista en Spotify *</label>
                <Input
                  value={newSpotifyUrl}
                  onChange={(e) => setNewSpotifyUrl(e.target.value)}
                  placeholder="https://open.spotify.com/artist/..."
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Categoría</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2">Descripción (opcional)</label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Notas sobre este artista..."
                />
              </div>

              {addError && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {addError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddChannel}
                  disabled={adding}
                >
                  {adding ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Agregar
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
