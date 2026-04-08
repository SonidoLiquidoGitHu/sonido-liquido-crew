"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Trash2,
  ExternalLink,
  Play,
  Eye,
  Star,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Video {
  id: string;
  title: string;
  description: string | null;
  youtubeId: string;
  youtubeUrl: string;
  thumbnailUrl: string | null;
  viewCount: number | null;
  isFeatured: boolean;
  displayOrder?: number;
  artistId: string | null;
  artist?: {
    id: string;
    name: string;
  } | null;
}

interface Artist {
  id: string;
  name: string;
}

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [artistFilter, setArtistFilter] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [videosRes, artistsRes] = await Promise.all([
        fetch("/api/admin/videos"),
        fetch("/api/admin/artists"),
      ]);

      const videosData = await videosRes.json();
      const artistsData = await artistsRes.json();

      if (videosData.success) {
        setVideos(videosData.data);
      }
      if (artistsData.success) {
        setArtists(artistsData.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessage({ type: "error", text: "Error al cargar los datos" });
    }
    setIsLoading(false);
  }

  async function toggleFeatured(video: Video) {
    setUpdatingId(video.id);
    try {
      const res = await fetch("/api/admin/videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: video.id,
          isFeatured: !video.isFeatured,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setVideos((prev) =>
          prev.map((v) =>
            v.id === video.id ? { ...v, isFeatured: !v.isFeatured } : v
          )
        );
        setMessage({
          type: "success",
          text: video.isFeatured
            ? "Video quitado de destacados"
            : "Video marcado como destacado",
        });
      } else {
        setMessage({ type: "error", text: data.error || "Error al actualizar" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" });
    }
    setUpdatingId(null);
    setTimeout(() => setMessage(null), 3000);
  }

  async function deleteVideo(video: Video) {
    if (!confirm(`¿Eliminar "${video.title}"?`)) return;

    setUpdatingId(video.id);
    try {
      const res = await fetch(`/api/admin/videos?id=${video.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        setVideos((prev) => prev.filter((v) => v.id !== video.id));
        setMessage({ type: "success", text: "Video eliminado" });
      } else {
        setMessage({ type: "error", text: data.error || "Error al eliminar" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" });
    }
    setUpdatingId(null);
    setTimeout(() => setMessage(null), 3000);
  }

  async function moveVideo(video: Video, direction: "up" | "down") {
    const sortedVideos = [...videos].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    const currentIndex = sortedVideos.findIndex((v) => v.id === video.id);

    if (direction === "up" && currentIndex === 0) return;
    if (direction === "down" && currentIndex === sortedVideos.length - 1) return;

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const swapVideo = sortedVideos[swapIndex];

    setUpdatingId(video.id);
    try {
      // Swap display orders
      await Promise.all([
        fetch("/api/admin/videos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: video.id,
            displayOrder: swapVideo.displayOrder || swapIndex,
          }),
        }),
        fetch("/api/admin/videos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: swapVideo.id,
            displayOrder: video.displayOrder || currentIndex,
          }),
        }),
      ]);

      // Update local state
      setVideos((prev) => {
        const updated = [...prev];
        const videoIdx = updated.findIndex((v) => v.id === video.id);
        const swapIdx = updated.findIndex((v) => v.id === swapVideo.id);

        const tempOrder = updated[videoIdx].displayOrder;
        updated[videoIdx] = { ...updated[videoIdx], displayOrder: updated[swapIdx].displayOrder };
        updated[swapIdx] = { ...updated[swapIdx], displayOrder: tempOrder };

        return updated;
      });

      setMessage({ type: "success", text: "Orden actualizado" });
    } catch (error) {
      setMessage({ type: "error", text: "Error al reordenar" });
    }
    setUpdatingId(null);
    setTimeout(() => setMessage(null), 2000);
  }

  // Filter videos
  const filteredVideos = videos.filter((video) => {
    const matchesSearch =
      !searchQuery ||
      video.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArtist = !artistFilter || video.artistId === artistFilter;
    return matchesSearch && matchesArtist;
  });

  // Sort: Featured first, then by displayOrder or createdAt
  const sortedVideos = [...filteredVideos].sort((a, b) => {
    // Featured videos first
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    // Then by displayOrder
    return (a.displayOrder || 0) - (b.displayOrder || 0);
  });

  const totalViews = videos.reduce((acc, v) => acc + (v.viewCount || 0), 0);
  const featuredCount = videos.filter((v) => v.isFeatured).length;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase">Videos</h1>
          <p className="text-slc-muted mt-1">
            Gestiona los videos de YouTube del crew
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Actualizar
          </Button>
          <Button asChild>
            <Link href="/admin/videos/new">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Video
            </Link>
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            "mb-6 p-4 rounded-lg flex items-center gap-2",
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-500"
              : "bg-red-500/10 border border-red-500/20 text-red-500"
          )}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
          <Input
            placeholder="Buscar videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={artistFilter}
          onChange={(e) => setArtistFilter(e.target.value)}
          className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
        >
          <option value="">Todos los artistas</option>
          {artists.map((artist) => (
            <option key={artist.id} value={artist.id}>
              {artist.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-primary">{videos.length}</div>
          <div className="text-xs text-slc-muted uppercase">Total Videos</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-yellow-500">{featuredCount}</div>
          <div className="text-xs text-slc-muted uppercase">Destacados</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-green-500">
            {formatNumber(totalViews)}
          </div>
          <div className="text-xs text-slc-muted uppercase">Vistas Totales</div>
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Videos Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedVideos.map((video) => (
              <div
                key={video.id}
                className={cn(
                  "bg-slc-dark border rounded-xl overflow-hidden group relative",
                  video.isFeatured
                    ? "border-yellow-500/50 ring-1 ring-yellow-500/20"
                    : "border-slc-border"
                )}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video">
                  {video.thumbnailUrl ? (
                    <SafeImage
                      src={video.thumbnailUrl}
                      alt={video.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slc-card flex items-center justify-center">
                      <Play className="w-12 h-12 text-slc-muted" />
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a
                      href={video.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-14 h-14 rounded-full bg-youtube flex items-center justify-center"
                    >
                      <Play className="w-7 h-7 text-white ml-1" fill="white" />
                    </a>
                  </div>

                  {/* Featured Badge */}
                  {video.isFeatured && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500 rounded text-xs font-medium text-black flex items-center gap-1">
                      <Star className="w-3 h-3" fill="currentColor" />
                      Destacado
                    </div>
                  )}

                  {/* Order Controls - shown on hover */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveVideo(video, "up")}
                      className="w-7 h-7 bg-black/70 hover:bg-black rounded flex items-center justify-center text-white"
                      title="Mover arriba"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveVideo(video, "down")}
                      className="w-7 h-7 bg-black/70 hover:bg-black rounded flex items-center justify-center text-white"
                      title="Mover abajo"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-oswald text-sm uppercase line-clamp-2 mb-2">
                    {video.title}
                  </h3>

                  {video.artist && (
                    <p className="text-xs text-primary mb-1">{video.artist.name}</p>
                  )}

                  {video.viewCount != null && (
                    <div className="flex items-center gap-1 text-xs text-slc-muted mb-3">
                      <Eye className="w-3 h-3" />
                      {formatNumber(video.viewCount)} vistas
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slc-border">
                    <a
                      href={video.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-youtube hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ver en YouTube
                    </a>
                    <div className="flex items-center gap-1">
                      {/* Toggle Featured */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8",
                          video.isFeatured
                            ? "text-yellow-500 hover:text-yellow-400"
                            : "text-slc-muted hover:text-yellow-500"
                        )}
                        onClick={() => toggleFeatured(video)}
                        disabled={updatingId === video.id}
                        title={video.isFeatured ? "Quitar de destacados" : "Marcar como destacado"}
                      >
                        {updatingId === video.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Star
                            className="w-4 h-4"
                            fill={video.isFeatured ? "currentColor" : "none"}
                          />
                        )}
                      </Button>
                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-400"
                        onClick={() => deleteVideo(video)}
                        disabled={updatingId === video.id}
                        title="Eliminar video"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {sortedVideos.length === 0 && !isLoading && (
            <div className="text-center py-16">
              <Play className="w-16 h-16 text-slc-muted mx-auto mb-4" />
              <h3 className="font-oswald text-xl uppercase mb-2">No hay videos</h3>
              <p className="text-slc-muted mb-6">
                {searchQuery || artistFilter
                  ? "No se encontraron videos con esos filtros."
                  : "Agrega videos de YouTube para mostrar en el sitio."}
              </p>
              {!searchQuery && !artistFilter && (
                <Button asChild>
                  <Link href="/admin/videos/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Video
                  </Link>
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
