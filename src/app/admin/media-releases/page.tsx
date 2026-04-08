"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  Newspaper,
  Calendar,
  Eye,
  EyeOff,
  Star,
  Download,
  Package,
  Loader2,
  CheckSquare,
  Square,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  FileDown,
  User,
  Filter,
} from "lucide-react";

interface MediaRelease {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  category: string;
  summary: string | null;
  coverImageUrl: string | null;
  publishDate: string;
  isPublished: boolean;
  isFeatured: boolean;
  viewCount: number;
  downloadCount: number;
  pressKitUrl: string | null;
  mainArtistId: string | null;
  mainArtistName: string | null;
  createdAt: string;
}

interface Artist {
  id: string;
  name: string;
}

const categoryLabels: Record<string, string> = {
  new_release: "Nuevo Lanzamiento",
  single: "Single",
  album: "Álbum",
  ep: "EP",
  tour: "Gira",
  collaboration: "Colaboración",
  event: "Evento",
  announcement: "Anuncio",
  interview: "Entrevista",
  feature: "Feature",
};

const categoryColors: Record<string, string> = {
  new_release: "bg-green-500/10 text-green-500",
  single: "bg-blue-500/10 text-blue-500",
  album: "bg-purple-500/10 text-purple-500",
  ep: "bg-cyan-500/10 text-cyan-500",
  tour: "bg-orange-500/10 text-orange-500",
  collaboration: "bg-pink-500/10 text-pink-500",
  event: "bg-yellow-500/10 text-yellow-500",
  announcement: "bg-slc-card text-slc-muted",
  interview: "bg-red-500/10 text-red-500",
  feature: "bg-indigo-500/10 text-indigo-500",
};

export default function AdminMediaReleasesPage() {
  const [mediaReleases, setMediaReleases] = useState<MediaRelease[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [publishedFilter, setPublishedFilter] = useState("");
  const [artistFilter, setArtistFilter] = useState("");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [releaseToDelete, setReleaseToDelete] = useState<MediaRelease | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toggle loading state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // PDF generation state
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    fetchMediaReleases();
    fetchArtists();
  }, []);

  const fetchMediaReleases = async () => {
    try {
      const res = await fetch("/api/admin/media-releases");
      const data = await res.json();
      if (data.success) {
        setMediaReleases(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching media releases:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArtists = async () => {
    try {
      const res = await fetch("/api/admin/artists");
      const data = await res.json();
      if (data.success) {
        setArtists(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching artists:", error);
    }
  };

  // Helper to get artist name
  const getArtistName = (release: MediaRelease): string | null => {
    if (release.mainArtistName) return release.mainArtistName;
    if (release.mainArtistId) {
      const artist = artists.find((a) => a.id === release.mainArtistId);
      return artist?.name || null;
    }
    return null;
  };

  const filteredReleases = mediaReleases.filter((release) => {
    const matchesSearch = release.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPublished =
      publishedFilter === "" ||
      (publishedFilter === "published" && release.isPublished) ||
      (publishedFilter === "draft" && !release.isPublished);
    const matchesArtist =
      artistFilter === "" ||
      artistFilter === "none" && !release.mainArtistId && !release.mainArtistName ||
      release.mainArtistId === artistFilter;
    return matchesSearch && matchesPublished && matchesArtist;
  });

  // Get unique artists from media releases for filter dropdown
  const artistsInReleases = Array.from(
    new Set(
      mediaReleases
        .filter((r) => r.mainArtistId)
        .map((r) => r.mainArtistId)
    )
  ).filter(Boolean) as string[];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Toggle publish status
  const handleTogglePublish = async (release: MediaRelease) => {
    setTogglingId(release.id);
    try {
      const res = await fetch("/api/admin/media-releases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: release.id,
          title: release.title,
          isPublished: !release.isPublished,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMediaReleases((prev) =>
          prev.map((r) =>
            r.id === release.id ? { ...r, isPublished: !r.isPublished } : r
          )
        );
      }
    } catch (error) {
      console.error("Error toggling publish status:", error);
    } finally {
      setTogglingId(null);
    }
  };

  // Delete media release
  const handleDelete = async () => {
    if (!releaseToDelete) return;

    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/media-releases?id=${releaseToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setMediaReleases((prev) => prev.filter((r) => r.id !== releaseToDelete.id));
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(releaseToDelete.id);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Error deleting media release:", error);
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
      setReleaseToDelete(null);
    }
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredReleases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReleases.map((r) => r.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Bulk actions
  const handleBulkPublish = async (publish: boolean) => {
    if (selectedIds.size === 0) return;

    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedIds).map((id) => {
        const release = mediaReleases.find((r) => r.id === id);
        if (!release) return Promise.resolve();

        return fetch("/api/admin/media-releases", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            title: release.title,
            isPublished: publish,
          }),
        });
      });

      await Promise.all(promises);

      setMediaReleases((prev) =>
        prev.map((r) =>
          selectedIds.has(r.id) ? { ...r, isPublished: publish } : r
        )
      );
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error bulk updating:", error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/admin/media-releases?id=${id}`, { method: "DELETE" })
      );

      await Promise.all(promises);

      setMediaReleases((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Error bulk deleting:", error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const isAllSelected = filteredReleases.length > 0 && selectedIds.size === filteredReleases.length;
  const hasSelection = selectedIds.size > 0;

  // Generate Press Kit PDF
  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);

    try {
      const res = await fetch("/api/admin/press-kit/generate-pdf");

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al generar PDF");
      }

      // Get the filename from Content-Disposition header
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "press-kit.pdf";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Download the PDF
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert(err instanceof Error ? err.message : "Error al generar PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase">Media Releases</h1>
          <p className="text-slc-muted mt-1">
            Comunicados de prensa y noticias del crew
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
          >
            {generatingPdf ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 mr-2" />
                Press Kit PDF
              </>
            )}
          </Button>
          <Button asChild>
            <Link href="/admin/media-releases/new">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Media Release
            </Link>
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
          <input
            type="text"
            placeholder="Buscar media releases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={artistFilter}
          onChange={(e) => setArtistFilter(e.target.value)}
          className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
        >
          <option value="">Todos los artistas</option>
          <option value="none">Sin artista</option>
          {artists
            .filter((a) => artistsInReleases.includes(a.id))
            .map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
              </option>
            ))}
        </select>
        <select
          value={publishedFilter}
          onChange={(e) => setPublishedFilter(e.target.value)}
          className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
        >
          <option value="">Estado: Todos</option>
          <option value="published">Publicados</option>
          <option value="draft">Borradores</option>
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {hasSelection && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            <span className="font-medium">
              {selectedIds.size} {selectedIds.size === 1 ? "seleccionado" : "seleccionados"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkPublish(true)}
              disabled={bulkActionLoading}
            >
              {bulkActionLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              Publicar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkPublish(false)}
              disabled={bulkActionLoading}
            >
              {bulkActionLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <EyeOff className="w-4 h-4 mr-2" />
              )}
              Despublicar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-500 border-red-500/50 hover:bg-red-500/10"
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
            >
              {bulkActionLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Eliminar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkActionLoading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-primary">{mediaReleases.length}</div>
          <div className="text-xs text-slc-muted uppercase">Total</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-green-500">
            {mediaReleases.filter((r) => r.isPublished).length}
          </div>
          <div className="text-xs text-slc-muted uppercase">Publicados</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-orange-500">
            {mediaReleases.filter((r) => !r.isPublished).length}
          </div>
          <div className="text-xs text-slc-muted uppercase">Borradores</div>
        </div>
      </div>

      {/* Media Releases List */}
      <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slc-muted">Cargando media releases...</div>
        ) : filteredReleases.length === 0 ? (
          <div className="p-8 text-center">
            <Newspaper className="w-12 h-12 text-slc-muted mx-auto mb-4" />
            <p className="text-slc-muted">No hay media releases todavía</p>
            <Button asChild className="mt-4">
              <Link href="/admin/media-releases/new">
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Media Release
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slc-border">
                  <th className="text-left px-4 py-4 w-12">
                    <button
                      onClick={handleSelectAll}
                      className="p-1 hover:bg-slc-card rounded transition-colors"
                      title={isAllSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Square className="w-5 h-5 text-slc-muted" />
                      )}
                    </button>
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Media Release
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Artista
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slc-border">
                {filteredReleases.map((release) => (
                  <tr
                    key={release.id}
                    className={`hover:bg-slc-card/50 ${
                      selectedIds.has(release.id) ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleSelectOne(release.id)}
                        className="p-1 hover:bg-slc-card rounded transition-colors"
                      >
                        {selectedIds.has(release.id) ? (
                          <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                          <Square className="w-5 h-5 text-slc-muted" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-10 rounded overflow-hidden bg-slc-card flex-shrink-0">
                          {release.coverImageUrl ? (
                            <SafeImage
                              src={release.coverImageUrl}
                              alt={release.title}
                              width={64}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Newspaper className="w-5 h-5 text-slc-muted" />
                            </div>
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/admin/media-releases/${release.id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {release.title}
                          </Link>
                          {release.summary && (
                            <p className="text-xs text-slc-muted line-clamp-1 max-w-md">
                              {release.summary}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getArtistName(release) ? (
                        <div className="flex items-center gap-1 text-sm">
                          <User className="w-3 h-3 text-primary" />
                          <span className="text-white">{getArtistName(release)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slc-muted">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-slc-muted">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(release.publishDate)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleTogglePublish(release)}
                        disabled={togglingId === release.id}
                        className="group flex items-center gap-2 transition-colors"
                        title={release.isPublished ? "Click para despublicar" : "Click para publicar"}
                      >
                        {togglingId === release.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slc-muted" />
                        ) : release.isPublished ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/10 text-green-500 group-hover:bg-green-500/20">
                            <ToggleRight className="w-4 h-4" />
                            Publicado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20">
                            <ToggleLeft className="w-4 h-4" />
                            Borrador
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          title={release.isPublished ? "Ver página pública" : "Vista previa (borrador)"}
                        >
                          <Link
                            href={release.isPublished
                              ? `/prensa/comunicados/${release.slug}`
                              : `/prensa/comunicados/${release.slug}?preview=true`
                            }
                            target="_blank"
                          >
                            <Eye className={`w-4 h-4 ${release.isPublished ? "text-green-500" : "text-slc-muted"}`} />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon" title="Editar">
                          <Link href={`/admin/media-releases/${release.id}`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-400"
                          title="Eliminar"
                          onClick={() => {
                            setReleaseToDelete(release);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slc-dark border-slc-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              Eliminar Media Release
            </DialogTitle>
            <DialogDescription className="text-slc-muted">
              ¿Estás seguro de que quieres eliminar{" "}
              <span className="text-white font-medium">"{releaseToDelete?.title}"</span>?
              <br />
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setReleaseToDelete(null);
              }}
              disabled={deleteLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
