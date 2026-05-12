"use client";

import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  Rocket,
  Calendar,
  Star,
  Eye,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Mail,
  Bell,
  Download,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Send,
  Copy,
  Check,
  Disc3,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UpcomingRelease {
  id: string;
  title: string;
  slug: string;
  artistName: string;
  featuredArtists?: string | null;
  releaseType: string;
  description?: string | null;
  coverImageUrl?: string | null;
  bannerImageUrl?: string | null;
  backgroundColor?: string;
  releaseDate: string;
  announceDate?: string | null;
  rpmPresaveUrl?: string | null;
  spotifyPresaveUrl?: string | null;
  appleMusicPresaveUrl?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  showCountdown: boolean;
  presaveCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

const releaseTypeColors: Record<string, string> = {
  album: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  ep: "bg-green-500/10 text-green-500 border-green-500/20",
  single: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "maxi-single": "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  compilation: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  mixtape: "bg-pink-500/10 text-pink-500 border-pink-500/20",
};

const releaseTypeLabels: Record<string, string> = {
  album: "Álbum",
  ep: "EP",
  single: "Single",
  "maxi-single": "Maxi-Single",
  compilation: "Compilación",
  mixtape: "Mixtape",
};

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getTimeUntilRelease(releaseDate: string) {
  const now = new Date();
  const release = new Date(releaseDate);
  const diff = release.getTime() - now.getTime();

  if (diff <= 0) return "Ya lanzado";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months} mes${months > 1 ? "es" : ""}`;
  }
  if (days > 0) return `${days} día${days > 1 ? "s" : ""}`;
  return `${hours} hora${hours > 1 ? "s" : ""}`;
}

function isReleased(releaseDate: string) {
  return new Date(releaseDate).getTime() <= Date.now();
}

interface PresaveStats {
  topReleases: {
    id: string;
    title: string;
    artistName: string;
    releaseDate: Date | string;
    presaveCount: number;
    viewCount: number;
    isActive: boolean;
    coverImageUrl?: string | null;
  }[];
  recentSubscribers: {
    id: string;
    email: string;
    subscribedAt: Date | string;
    notified: boolean;
    releaseTitle: string | null;
    releaseId: string | null;
  }[];
  totalSubscribers: number;
  totalViews: number;
  conversionRate: string;
}

type TabType = "releases" | "subscribers" | "analytics";

export default function AdminUpcomingReleasesPage() {
  const [releases, setReleases] = useState<UpcomingRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [releaseToDelete, setReleaseToDelete] = useState<UpcomingRelease | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Convert to release state
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [releaseToConvert, setReleaseToConvert] = useState<UpcomingRelease | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertUrls, setConvertUrls] = useState({ spotifyUrl: "", appleMusicUrl: "", youtubeMusicUrl: "" });
  const [convertResult, setConvertResult] = useState<{ success: boolean; message: string; releaseId?: string } | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<TabType>("releases");

  // Subscribers state
  const [stats, setStats] = useState<PresaveStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [copiedEmails, setCopiedEmails] = useState(false);
  const [selectedReleaseForExport, setSelectedReleaseForExport] = useState<string>("");

  useEffect(() => {
    fetchReleases();
  }, []);

  useEffect(() => {
    if (activeTab === "subscribers" || activeTab === "analytics") {
      fetchStats();
    }
  }, [activeTab]);

  async function fetchReleases() {
    try {
      const res = await fetch("/api/admin/upcoming-releases");
      const data = await res.json();
      if (data.success) {
        setReleases(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching upcoming releases:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/upcoming-releases/subscribers?stats=true");
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
    }
  }

  async function exportEmails(releaseId: string) {
    try {
      const res = await fetch("/api/admin/upcoming-releases/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export", releaseId }),
      });
      const data = await res.json();
      if (data.success) {
        navigator.clipboard.writeText(data.data.csv);
        setCopiedEmails(true);
        setTimeout(() => setCopiedEmails(false), 2000);
      }
    } catch (error) {
      console.error("Error exporting emails:", error);
    }
  }

  async function markAllNotified(releaseId: string) {
    try {
      const res = await fetch("/api/admin/upcoming-releases/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_notified", releaseId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStats();
      }
    } catch (error) {
      console.error("Error marking notified:", error);
    }
  }

  async function handleDelete() {
    if (!releaseToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/upcoming-releases?id=${releaseToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setReleases((prev) => prev.filter((r) => r.id !== releaseToDelete.id));
        setDeleteDialogOpen(false);
        setReleaseToDelete(null);
      }
    } catch (error) {
      console.error("Error deleting release:", error);
    } finally {
      setDeleting(false);
    }
  }

  async function handleConvert() {
    if (!releaseToConvert) return;

    setConverting(true);
    setConvertResult(null);
    try {
      const res = await fetch("/api/admin/upcoming-releases/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upcomingReleaseId: releaseToConvert.id,
          spotifyUrl: convertUrls.spotifyUrl || undefined,
          appleMusicUrl: convertUrls.appleMusicUrl || undefined,
          youtubeMusicUrl: convertUrls.youtubeMusicUrl || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setConvertResult({
          success: true,
          message: data.isNew ? "Lanzamiento creado exitosamente" : "Vinculado a lanzamiento existente",
          releaseId: data.releaseId,
        });
        // Update local state to mark as inactive
        setReleases((prev) =>
          prev.map((r) =>
            r.id === releaseToConvert.id ? { ...r, isActive: false } : r
          )
        );
      } else {
        setConvertResult({
          success: false,
          message: data.error || "Error al convertir",
          releaseId: data.releaseId,
        });
      }
    } catch (error) {
      console.error("Error converting release:", error);
      setConvertResult({ success: false, message: "Error de conexión" });
    } finally {
      setConverting(false);
    }
  }

  function openConvertDialog(release: UpcomingRelease) {
    setReleaseToConvert(release);
    setConvertUrls({ spotifyUrl: "", appleMusicUrl: "", youtubeMusicUrl: "" });
    setConvertResult(null);
    setConvertDialogOpen(true);
  }

  // Filter releases
  const filteredReleases = releases.filter((release) => {
    const matchesSearch =
      release.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      release.artistName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || release.releaseType === typeFilter;
    const matchesStatus =
      !statusFilter ||
      (statusFilter === "active" && release.isActive && !isReleased(release.releaseDate)) ||
      (statusFilter === "inactive" && !release.isActive) ||
      (statusFilter === "released" && isReleased(release.releaseDate));
    return matchesSearch && matchesType && matchesStatus;
  });

  // Stats
  const activeCount = releases.filter((r) => r.isActive && !isReleased(r.releaseDate)).length;
  const releasedCount = releases.filter((r) => isReleased(r.releaseDate)).length;
  const totalPresaves = releases.reduce((acc, r) => acc + r.presaveCount, 0);
  const totalViews = releases.reduce((acc, r) => acc + r.viewCount, 0);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-slc-card rounded mb-4" />
          <div className="h-4 w-48 bg-slc-card rounded mb-8" />
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slc-card rounded-lg" />
            ))}
          </div>
          <div className="h-96 bg-slc-card rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase flex items-center gap-3">
            <Rocket className="w-8 h-8 text-primary" />
            Próximos Lanzamientos
          </h1>
          <p className="text-slc-muted mt-1">
            Gestiona presaves, countdowns y promociones de lanzamientos
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/upcoming-releases/new">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Próximo Lanzamiento
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slc-border">
        <button
          onClick={() => setActiveTab("releases")}
          className={cn(
            "px-4 py-2 font-medium text-sm transition-colors border-b-2 -mb-px",
            activeTab === "releases"
              ? "border-primary text-primary"
              : "border-transparent text-slc-muted hover:text-white"
          )}
        >
          <Rocket className="w-4 h-4 inline mr-2" />
          Lanzamientos
        </button>
        <button
          onClick={() => setActiveTab("subscribers")}
          className={cn(
            "px-4 py-2 font-medium text-sm transition-colors border-b-2 -mb-px",
            activeTab === "subscribers"
              ? "border-primary text-primary"
              : "border-transparent text-slc-muted hover:text-white"
          )}
        >
          <Bell className="w-4 h-4 inline mr-2" />
          Suscriptores
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={cn(
            "px-4 py-2 font-medium text-sm transition-colors border-b-2 -mb-px",
            activeTab === "analytics"
              ? "border-primary text-primary"
              : "border-transparent text-slc-muted hover:text-white"
          )}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Analíticas
        </button>
      </div>

      {/* Releases Tab */}
      {activeTab === "releases" && (
        <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="font-oswald text-3xl text-primary">{activeCount}</div>
          <div className="text-xs text-slc-muted uppercase tracking-wider">Activos</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <div className="font-oswald text-3xl text-green-500">{releasedCount}</div>
          <div className="text-xs text-slc-muted uppercase tracking-wider">Lanzados</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <div className="font-oswald text-3xl text-blue-500">{totalPresaves}</div>
          <div className="text-xs text-slc-muted uppercase tracking-wider">Presaves</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Eye className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <div className="font-oswald text-3xl text-purple-500">{totalViews}</div>
          <div className="text-xs text-slc-muted uppercase tracking-wider">Vistas</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
          <input
            type="text"
            placeholder="Buscar por título o artista..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="">Todos los tipos</option>
            <option value="single">Single</option>
            <option value="ep">EP</option>
            <option value="album">Álbum</option>
            <option value="mixtape">Mixtape</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="released">Ya lanzados</option>
          </select>
        </div>
      </div>

      {/* Releases Table */}
      {filteredReleases.length === 0 ? (
        <div className="bg-slc-card border border-slc-border rounded-xl p-12 text-center">
          <Rocket className="w-16 h-16 text-slc-muted mx-auto mb-4" />
          <h3 className="font-oswald text-xl mb-2">No hay próximos lanzamientos</h3>
          <p className="text-slc-muted mb-6">
            {searchQuery || typeFilter || statusFilter
              ? "No se encontraron resultados con los filtros actuales"
              : "Crea tu primer próximo lanzamiento para comenzar a recibir presaves"}
          </p>
          {!searchQuery && !typeFilter && !statusFilter && (
            <Button asChild>
              <Link href="/admin/upcoming-releases/new">
                <Plus className="w-4 h-4 mr-2" />
                Crear Próximo Lanzamiento
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slc-border">
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Lanzamiento
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Countdown
                  </th>
                  <th className="text-center px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Presaves
                  </th>
                  <th className="text-center px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-slc-muted uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slc-border">
                {filteredReleases.map((release) => (
                  <tr key={release.id} className="hover:bg-slc-card/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-lg overflow-hidden bg-slc-card flex-shrink-0"
                          style={{ backgroundColor: release.backgroundColor || "#1a1a1a" }}
                        >
                          {release.coverImageUrl ? (
                            <SafeImage
                              src={release.coverImageUrl}
                              alt={release.title}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Rocket className="w-6 h-6 text-slc-muted" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{release.title}</span>
                            {release.isFeatured && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          <p className="text-sm text-slc-muted">{release.artistName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${
                          releaseTypeColors[release.releaseType] ||
                          "bg-slc-card text-slc-muted border-slc-border"
                        }`}
                      >
                        {releaseTypeLabels[release.releaseType] || release.releaseType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-slc-muted" />
                        <span>{formatDate(release.releaseDate)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={`flex items-center gap-2 text-sm ${
                          isReleased(release.releaseDate) ? "text-green-500" : "text-primary"
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        <span>{getTimeUntilRelease(release.releaseDate)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-4 h-4 text-slc-muted" />
                        <span className="font-medium">{release.presaveCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isReleased(release.releaseDate) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-500/10 text-green-500 border border-green-500/20">
                          <CheckCircle className="w-3 h-3" />
                          Lanzado
                        </span>
                      ) : release.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                          <Rocket className="w-3 h-3" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slc-card text-slc-muted border border-slc-border">
                          <XCircle className="w-3 h-3" />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Publicar a Discografía - solo si ya pasó la fecha */}
                        {isReleased(release.releaseDate) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-500 hover:text-green-400"
                            title="Publicar a Discografía"
                            onClick={() => openConvertDialog(release)}
                          >
                            <Disc3 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button asChild variant="ghost" size="icon" title="Ver página">
                          <Link href={`/proximos/${release.slug}`} target="_blank">
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button asChild variant="ghost" size="icon" title="Editar">
                          <Link href={`/admin/upcoming-releases/${release.id}`}>
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

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slc-border">
            <p className="text-sm text-slc-muted">
              Mostrando {filteredReleases.length} de {releases.length} lanzamientos
            </p>
          </div>
        </div>
      )}

        </>
      )}

      {/* Subscribers Tab */}
      {activeTab === "subscribers" && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : stats ? (
            <>
              {/* Stats Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slc-card border border-slc-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="w-5 h-5 text-primary" />
                    <span className="text-xs text-slc-muted uppercase">Total Suscriptores</span>
                  </div>
                  <p className="font-oswald text-3xl">{stats.totalSubscribers}</p>
                </div>
                <div className="bg-slc-card border border-slc-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-purple-500" />
                    <span className="text-xs text-slc-muted uppercase">Total Vistas</span>
                  </div>
                  <p className="font-oswald text-3xl">{stats.totalViews}</p>
                </div>
                <div className="bg-slc-card border border-slc-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="text-xs text-slc-muted uppercase">Conversión</span>
                  </div>
                  <p className="font-oswald text-3xl">{stats.conversionRate}%</p>
                </div>
                <div className="bg-slc-card border border-slc-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Rocket className="w-5 h-5 text-blue-500" />
                    <span className="text-xs text-slc-muted uppercase">Releases Activos</span>
                  </div>
                  <p className="font-oswald text-3xl">{activeCount}</p>
                </div>
              </div>

              {/* Export Section */}
              <div className="bg-slc-card border border-slc-border rounded-xl p-6">
                <h3 className="font-oswald text-lg uppercase mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Exportar Emails
                </h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <select
                    value={selectedReleaseForExport}
                    onChange={(e) => setSelectedReleaseForExport(e.target.value)}
                    className="flex-1 px-4 py-2 bg-slc-dark border border-slc-border rounded-lg"
                  >
                    <option value="">Selecciona un lanzamiento...</option>
                    {releases.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} - {r.artistName} ({r.presaveCount} suscriptores)
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => selectedReleaseForExport && exportEmails(selectedReleaseForExport)}
                      disabled={!selectedReleaseForExport}
                      variant="outline"
                    >
                      {copiedEmails ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copiar Emails
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => selectedReleaseForExport && markAllNotified(selectedReleaseForExport)}
                      disabled={!selectedReleaseForExport}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Marcar Notificados
                    </Button>
                  </div>
                </div>
              </div>

              {/* Recent Subscribers */}
              <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slc-border">
                  <h3 className="font-oswald text-lg uppercase">Suscriptores Recientes</h3>
                </div>
                <div className="divide-y divide-slc-border">
                  {stats.recentSubscribers.length === 0 ? (
                    <div className="px-6 py-8 text-center text-slc-muted">
                      <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No hay suscriptores aún</p>
                    </div>
                  ) : (
                    stats.recentSubscribers.map((sub) => (
                      <div key={sub.id} className="px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slc-card flex items-center justify-center">
                            <Mail className="w-4 h-4 text-slc-muted" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{sub.email}</p>
                            <p className="text-xs text-slc-muted">
                              {sub.releaseTitle || "Sin release"} • {formatDate(sub.subscribedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {sub.notified ? (
                            <span className="px-2 py-1 text-xs bg-green-500/10 text-green-500 rounded-full">
                              Notificado
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-yellow-500/10 text-yellow-500 rounded-full">
                              Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slc-muted">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Error al cargar estadísticas</p>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : stats ? (
            <>
              {/* Top Performing Releases */}
              <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slc-border">
                  <h3 className="font-oswald text-lg uppercase flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Top Lanzamientos por Presaves
                  </h3>
                </div>
                <div className="divide-y divide-slc-border">
                  {stats.topReleases.length === 0 ? (
                    <div className="px-6 py-8 text-center text-slc-muted">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No hay datos de lanzamientos</p>
                    </div>
                  ) : (
                    stats.topReleases.map((release, index) => (
                      <div key={release.id} className="px-6 py-4 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-slc-card flex items-center justify-center font-oswald">
                          {index + 1}
                        </div>
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slc-card">
                          {release.coverImageUrl ? (
                            <img
                              src={release.coverImageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Rocket className="w-5 h-5 text-slc-muted" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{release.title}</p>
                          <p className="text-sm text-slc-muted">{release.artistName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-oswald text-xl text-primary">{release.presaveCount}</p>
                          <p className="text-xs text-slc-muted">presaves</p>
                        </div>
                        <div className="text-right">
                          <p className="font-oswald text-xl text-purple-500">{release.viewCount}</p>
                          <p className="text-xs text-slc-muted">vistas</p>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <p className="font-oswald text-lg text-green-500">
                            {release.viewCount > 0
                              ? ((release.presaveCount / release.viewCount) * 100).toFixed(1)
                              : 0}
                            %
                          </p>
                          <p className="text-xs text-slc-muted">conversión</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Conversion Funnel */}
              <div className="bg-slc-card border border-slc-border rounded-xl p-6">
                <h3 className="font-oswald text-lg uppercase mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Embudo de Conversión
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-sm text-slc-muted">Vistas</div>
                    <div className="flex-1 h-8 bg-slc-dark rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: "100%" }} />
                    </div>
                    <div className="w-24 text-right font-oswald">{stats.totalViews}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-sm text-slc-muted">Presaves</div>
                    <div className="flex-1 h-8 bg-slc-dark rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${stats.totalViews > 0 ? (stats.totalSubscribers / stats.totalViews) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <div className="w-24 text-right font-oswald">{stats.totalSubscribers}</div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slc-border text-center">
                  <p className="text-sm text-slc-muted">
                    Tasa de conversión promedio:{" "}
                    <span className="text-green-500 font-bold">{stats.conversionRate}%</span>
                  </p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Próximo Lanzamiento</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar &quot;{releaseToDelete?.title}&quot;? Esta
              acción no se puede deshacer y se perderán todos los datos de presaves asociados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Release Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Disc3 className="w-5 h-5 text-green-500" />
              Publicar a Discografía
            </DialogTitle>
            <DialogDescription>
              Convierte &quot;{releaseToConvert?.title}&quot; de {releaseToConvert?.artistName} a un
              lanzamiento oficial en la discografía.
            </DialogDescription>
          </DialogHeader>

          {convertResult ? (
            <div className={cn(
              "p-4 rounded-lg flex items-center gap-3",
              convertResult.success
                ? "bg-green-500/10 border border-green-500/20"
                : "bg-red-500/10 border border-red-500/20"
            )}>
              {convertResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500" />
              )}
              <div>
                <p className={convertResult.success ? "text-green-500" : "text-red-500"}>
                  {convertResult.message}
                </p>
                {convertResult.releaseId && (
                  <Link
                    href={`/admin/releases/${convertResult.releaseId}`}
                    className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    Ver en discografía <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slc-muted">
                Opcionalmente, agrega los enlaces de streaming (si ya están disponibles):
              </p>
              <div>
                <label className="block text-sm text-slc-muted mb-1">Spotify URL</label>
                <input
                  type="url"
                  value={convertUrls.spotifyUrl}
                  onChange={(e) => setConvertUrls(prev => ({ ...prev, spotifyUrl: e.target.value }))}
                  placeholder="https://open.spotify.com/album/..."
                  className="w-full px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slc-muted mb-1">Apple Music URL</label>
                <input
                  type="url"
                  value={convertUrls.appleMusicUrl}
                  onChange={(e) => setConvertUrls(prev => ({ ...prev, appleMusicUrl: e.target.value }))}
                  placeholder="https://music.apple.com/..."
                  className="w-full px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slc-muted mb-1">YouTube Music URL</label>
                <input
                  type="url"
                  value={convertUrls.youtubeMusicUrl}
                  onChange={(e) => setConvertUrls(prev => ({ ...prev, youtubeMusicUrl: e.target.value }))}
                  placeholder="https://music.youtube.com/..."
                  className="w-full px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {convertResult ? (
              <Button onClick={() => setConvertDialogOpen(false)}>
                Cerrar
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setConvertDialogOpen(false)} disabled={converting}>
                  Cancelar
                </Button>
                <Button onClick={handleConvert} disabled={converting} className="bg-green-600 hover:bg-green-700">
                  {converting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    <>
                      <Disc3 className="w-4 h-4 mr-2" />
                      Publicar a Discografía
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
