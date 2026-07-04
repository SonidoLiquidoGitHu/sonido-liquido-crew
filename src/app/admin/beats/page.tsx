"use client";

import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  Headphones,
  Loader2,
  Lock,
  Mail,
  Music,
  Play,
  Plus,
  Search,
  Star,
  Trash2,
  TrendingUp,
  Unlock,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Beat {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  producerName: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  coverImageUrl: string | null;
  isFree: boolean;
  price: number | null;
  gateEnabled: boolean;
  isActive: boolean;
  isFeatured: boolean;
  playCount: number;
  downloadCount: number;
  viewCount: number;
  createdAt: string;
}

interface BeatStat {
  id: string;
  title: string;
  slug: string;
  isActive: boolean;
  gateEnabled: boolean;
  playCount: number;
  downloadCount: number;
  viewCount: number;
  periodDownloads: number;
  gateCompletionRate: number;
  uniqueEmails: number;
  lastDownloadAt: string | null;
  spotifyFollowCount: number;
  spotifyPlayCount: number;
}

interface DailyDownload {
  date: string;
  count: number;
}

interface RecentDownload {
  id: string;
  beatId: string;
  beatTitle: string | null;
  email: string | null;
  name: string | null;
  completedSpotifyFollow: boolean;
  completedSpotifyPlay: boolean;
  completedHyperfollow: boolean;
  completedInstagramShare: boolean;
  completedFacebookShare: boolean;
  completedCustomAction: boolean;
  createdAt: string | null;
}

interface StatsData {
  period: string;
  sinceDate: string;
  overview: {
    totalBeats: number;
    totalPlays: number;
    totalDownloads: number;
    totalViews: number;
    activeBeats: number;
    gatedBeats: number;
    overallConversionRate: number;
    periodDownloads: number;
    periodConversionRate: number;
  };
  gateActions: {
    count: number;
    withEmail: number;
    spotifyFollow: number;
    spotifyPlay: number;
    hyperfollow: number;
    instagramShare: number;
    facebookShare: number;
    customAction: number;
  };
  beatStats: BeatStat[];
  dailyDownloads: DailyDownload[];
  recentDownloads: RecentDownload[];
}

type PeriodOption = "7d" | "30d" | "90d" | "all";

export default function AdminBeatsPage() {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodOption>("30d");
  const [expandedBeat, setExpandedBeat] = useState<string | null>(null);
  const [showRecentDownloads, setShowRecentDownloads] = useState(false);

  useEffect(() => {
    fetchBeats();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchBeats = async () => {
    try {
      const res = await fetch("/api/admin/beats");
      const data = await res.json();
      if (data.success) {
        setBeats(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching beats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/admin/beats/stats?period=${period}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleDelete = async (beat: Beat) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${beat.title}"?`)) {
      return;
    }

    setDeletingId(beat.id);
    try {
      const res = await fetch(`/api/admin/beats?id=${beat.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setBeats((prev) => prev.filter((b) => b.id !== beat.id));
      } else {
        alert(`Error al eliminar: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error deleting beat:", error);
      alert("Error al eliminar el beat");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleBeatVisibility = async (beatId: string, newIsActive: boolean) => {
    setBeats((prev) =>
      prev.map((b) => (b.id === beatId ? { ...b, isActive: newIsActive } : b)),
    );
    setTogglingId(beatId);

    try {
      const res = await fetch("/api/admin/beats", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: beatId, isActive: newIsActive }),
      });
      const data = await res.json();

      if (data.success) {
        setBeats((prev) =>
          prev.map((b) => (b.id === beatId ? { ...b, ...data.data } : b)),
        );
      } else {
        setBeats((prev) =>
          prev.map((b) =>
            b.id === beatId ? { ...b, isActive: !newIsActive } : b,
          ),
        );
        alert(`Error al cambiar visibilidad: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      setBeats((prev) =>
        prev.map((b) =>
          b.id === beatId ? { ...b, isActive: !newIsActive } : b,
        ),
      );
      console.error("Error toggling beat visibility:", error);
      alert("Error al cambiar visibilidad del beat");
    } finally {
      setTogglingId(null);
    }
  };

  const genres = [...new Set(beats.map((b) => b.genre).filter(Boolean))];

  const filteredBeats = beats.filter((beat) => {
    const matchesSearch = beat.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesGenre = !genreFilter || beat.genre === genreFilter;
    return matchesSearch && matchesGenre;
  });

  const visibleCount = beats.filter((b) => b.isActive).length;
  const hiddenCount = beats.filter((b) => !b.isActive).length;

  const periodLabel: Record<PeriodOption, string> = {
    "7d": "Últimos 7 días",
    "30d": "Últimos 30 días",
    "90d": "Últimos 90 días",
    all: "Todo el tiempo",
  };

  const getBeatStat = (beatId: string): BeatStat | undefined => {
    return stats?.beatStats.find((s) => s.id === beatId);
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "—";
    }
  };

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `hace ${diffMins}m`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `hace ${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `hace ${diffDays}d`;
      return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    } catch {
      return "—";
    }
  };

  // Mini sparkline for daily downloads
  const renderSparkline = (data: DailyDownload[]) => {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map((d) => d.count), 1);
    const barWidth = 100 / Math.max(data.length, 1);
    return (
      <div className="flex items-end gap-px h-8 w-full">
        {data.slice(-30).map((d, i) => (
          <div
            key={i}
            className="bg-primary/60 rounded-t-sm flex-1 min-w-[2px] transition-all hover:bg-primary"
            style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }}
            title={`${d.date}: ${d.count} descargas`}
          />
        ))}
      </div>
    );
  };

  // Completion rate color
  const getRateColor = (rate: number) => {
    if (rate >= 50) return "text-green-500";
    if (rate >= 25) return "text-yellow-500";
    if (rate > 0) return "text-orange-500";
    return "text-slc-muted";
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-oswald text-3xl uppercase">Beats</h1>
          <p className="text-slc-muted mt-1">
            Gestiona beats con download gates y acciones requeridas
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/beats/new">
            <Plus className="w-4 h-4 mr-2" />
            Agregar Beat
          </Link>
        </Button>
      </div>

      {/* Sampling Resources Landing Page — link card */}
      <Link
        href="/recursos-sampling"
        target="_blank"
        className="group mb-6 block rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-primary/5 hover:border-purple-400/50 hover:from-purple-500/15 transition-all duration-300"
      >
        <div className="flex items-center gap-4 p-5">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Headphones className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-oswald text-lg uppercase text-white group-hover:text-purple-300 transition-colors">
              Recursos para Sampling
            </h3>
            <p className="text-sm text-slc-muted mt-0.5">
              Curaduría de canales, videos y playlists de YouTube para encontrar
              música sampleable. Link privado con email gate.
            </p>
          </div>
          <ExternalLink className="w-5 h-5 text-purple-400/60 group-hover:text-purple-300 flex-shrink-0 transition-colors" />
        </div>
      </Link>

      {/* Quick links row */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/beats"
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg text-primary hover:bg-primary/20 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="text-sm font-medium">
            Ver página pública de beats
          </span>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Estadísticas
          </h2>
          <div className="flex items-center gap-1 bg-slc-card border border-slc-border rounded-lg p-1">
            {(["7d", "30d", "90d", "all"] as PeriodOption[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  period === p
                    ? "bg-primary text-white"
                    : "text-slc-muted hover:text-white hover:bg-slc-border",
                )}
              >
                {p === "7d"
                  ? "7d"
                  : p === "30d"
                    ? "30d"
                    : p === "90d"
                      ? "90d"
                      : "Todo"}
              </button>
            ))}
          </div>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="bg-slc-card border border-slc-border rounded-lg p-4 animate-pulse"
              >
                <div className="h-6 bg-slc-border rounded w-12 mb-2" />
                <div className="h-3 bg-slc-border rounded w-16" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Main stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
              <div className="bg-slc-card border border-slc-border rounded-lg p-4">
                <div className="font-oswald text-2xl text-white">
                  {formatNumber(stats.overview.totalViews)}
                </div>
                <div className="text-xs text-slc-muted uppercase flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Visitas
                </div>
              </div>
              <div className="bg-slc-card border border-slc-border rounded-lg p-4">
                <div className="font-oswald text-2xl text-blue-500">
                  {formatNumber(stats.overview.totalPlays)}
                </div>
                <div className="text-xs text-slc-muted uppercase flex items-center gap-1">
                  <Play className="w-3 h-3" /> Previews
                </div>
              </div>
              <div className="bg-slc-card border border-slc-border rounded-lg p-4">
                <div className="font-oswald text-2xl text-purple-500">
                  {formatNumber(stats.overview.totalDownloads)}
                </div>
                <div className="text-xs text-slc-muted uppercase flex items-center gap-1">
                  <Download className="w-3 h-3" /> Descargas
                </div>
              </div>
              <div className="bg-slc-card border border-slc-border rounded-lg p-4">
                <div
                  className={cn(
                    "font-oswald text-2xl",
                    getRateColor(stats.overview.overallConversionRate),
                  )}
                >
                  {stats.overview.overallConversionRate}%
                </div>
                <div className="text-xs text-slc-muted uppercase flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Conversión
                </div>
              </div>
              <div className="bg-slc-card border border-slc-border rounded-lg p-4">
                <div className="font-oswald text-2xl text-green-500">
                  {formatNumber(stats.overview.periodDownloads)}
                </div>
                <div className="text-xs text-slc-muted uppercase">
                  Descargas ({periodLabel[period].split(" ").slice(-1)[0]})
                </div>
              </div>
              <div className="bg-slc-card border border-slc-border rounded-lg p-4">
                <div className="font-oswald text-2xl text-yellow-500">
                  {formatNumber(stats.gateActions.withEmail)}
                </div>
                <div className="text-xs text-slc-muted uppercase flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Emails
                </div>
              </div>
              <div className="bg-slc-card border border-slc-border rounded-lg p-4">
                <div className="font-oswald text-2xl text-slc-muted">
                  {stats.overview.activeBeats}/{stats.overview.totalBeats}
                </div>
                <div className="text-xs text-slc-muted uppercase">Activos</div>
              </div>
            </div>

            {/* Gate Actions Breakdown + Sparkline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Gate Actions */}
              <div className="bg-slc-card border border-slc-border rounded-lg p-4">
                <h3 className="text-sm font-medium text-slc-muted uppercase mb-3">
                  Acciones de Gate completadas ({periodLabel[period]})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <div>
                      <div className="text-sm font-medium">
                        {stats.gateActions.spotifyFollow}
                      </div>
                      <div className="text-xs text-slc-muted">
                        Spotify Follow
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <div>
                      <div className="text-sm font-medium">
                        {stats.gateActions.spotifyPlay}
                      </div>
                      <div className="text-xs text-slc-muted">Spotify Play</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <div>
                      <div className="text-sm font-medium">
                        {stats.gateActions.hyperfollow}
                      </div>
                      <div className="text-xs text-slc-muted">Hyperfollow</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-pink-500" />
                    <div>
                      <div className="text-sm font-medium">
                        {stats.gateActions.instagramShare}
                      </div>
                      <div className="text-xs text-slc-muted">Instagram</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <div>
                      <div className="text-sm font-medium">
                        {stats.gateActions.facebookShare}
                      </div>
                      <div className="text-xs text-slc-muted">Facebook</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500" />
                    <div>
                      <div className="text-sm font-medium">
                        {stats.gateActions.customAction}
                      </div>
                      <div className="text-xs text-slc-muted">
                        Personalizada
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Downloads sparkline */}
              <div className="bg-slc-card border border-slc-border rounded-lg p-4">
                <h3 className="text-sm font-medium text-slc-muted uppercase mb-3">
                  Descargas por día
                </h3>
                {stats.dailyDownloads.length > 0 ? (
                  <div>
                    {renderSparkline(stats.dailyDownloads)}
                    <div className="flex justify-between mt-2 text-xs text-slc-muted">
                      <span>{formatDate(stats.dailyDownloads[0]?.date)}</span>
                      <span>
                        {formatDate(
                          stats.dailyDownloads[stats.dailyDownloads.length - 1]
                            ?.date,
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-slc-muted text-sm py-4 text-center">
                    Sin datos en este período
                  </div>
                )}
              </div>
            </div>

            {/* Recent Downloads */}
            <div className="bg-slc-card border border-slc-border rounded-lg overflow-hidden">
              <button
                onClick={() => setShowRecentDownloads(!showRecentDownloads)}
                className="w-full p-4 flex items-center justify-between hover:bg-slc-border/30 transition-colors"
              >
                <h3 className="text-sm font-medium text-slc-muted uppercase flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Descargas Recientes
                  <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs">
                    {stats.recentDownloads.length}
                  </span>
                </h3>
                {showRecentDownloads ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              {showRecentDownloads && (
                <div className="border-t border-slc-border">
                  {stats.recentDownloads.length === 0 ? (
                    <div className="p-4 text-center text-slc-muted text-sm">
                      Sin descargas en este período
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {stats.recentDownloads.map((dl) => (
                        <div
                          key={dl.id}
                          className="flex items-center gap-3 px-4 py-2 border-b border-slc-border/50 last:border-0 hover:bg-slc-border/20"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            {dl.email ? (
                              <Mail className="w-4 h-4 text-primary" />
                            ) : (
                              <Users className="w-4 h-4 text-slc-muted" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">
                              {dl.name || dl.email || "Anónimo"}
                            </div>
                            <div className="text-xs text-slc-muted truncate">
                              {dl.beatTitle || "Beat desconocido"}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {dl.completedSpotifyFollow && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                                Spotify
                              </span>
                            )}
                            {dl.completedInstagramShare && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-pink-500/20 text-pink-400 rounded-full">
                                IG
                              </span>
                            )}
                            {dl.completedFacebookShare && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                                FB
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slc-muted flex-shrink-0">
                            {formatTimeAgo(dl.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
          <input
            type="text"
            placeholder="Buscar beats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value)}
          className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
        >
          <option value="">Todos los géneros</option>
          {genres.map((genre) => (
            <option key={genre} value={genre || ""}>
              {genre}
            </option>
          ))}
        </select>
      </div>

      {/* Quick stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-primary">
            {beats.length}
          </div>
          <div className="text-xs text-slc-muted uppercase">Total</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-green-500">
            {visibleCount}
          </div>
          <div className="text-xs text-slc-muted uppercase">Visibles</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-slc-muted">
            {hiddenCount}
          </div>
          <div className="text-xs text-slc-muted uppercase">Ocultos</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-blue-500">
            {beats.reduce((sum, b) => sum + b.playCount, 0).toLocaleString()}
          </div>
          <div className="text-xs text-slc-muted uppercase">Reproducciones</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-purple-500">
            {beats
              .reduce((sum, b) => sum + b.downloadCount, 0)
              .toLocaleString()}
          </div>
          <div className="text-xs text-slc-muted uppercase">Descargas</div>
        </div>
      </div>

      {/* Beats Grid */}
      <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slc-muted">
            Cargando beats...
          </div>
        ) : filteredBeats.length === 0 ? (
          <div className="p-8 text-center">
            <Music className="w-12 h-12 text-slc-muted mx-auto mb-4" />
            <p className="text-slc-muted">No hay beats todavía</p>
            <Button asChild className="mt-4">
              <Link href="/admin/beats/new">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primer Beat
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredBeats.map((beat) => {
              const bs = getBeatStat(beat.id);
              const isExpanded = expandedBeat === beat.id;
              return (
                <div
                  key={beat.id}
                  className={cn(
                    "bg-slc-card border rounded-lg overflow-hidden transition-colors relative",
                    beat.isActive
                      ? "border-slc-border hover:border-primary/50"
                      : "border-slc-border/50 opacity-70 hover:opacity-100 hover:border-slc-border",
                  )}
                >
                  {/* Hidden overlay badge */}
                  {!beat.isActive && (
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-slc-dark/90 border border-slc-border rounded-full">
                      <EyeOff className="w-3.5 h-3.5 text-slc-muted" />
                      <span className="text-xs text-slc-muted font-medium uppercase">
                        Oculto
                      </span>
                    </div>
                  )}

                  {/* Cover */}
                  <div className="aspect-square relative bg-slc-border">
                    {beat.coverImageUrl ? (
                      <SafeImage
                        src={beat.coverImageUrl}
                        alt={beat.title}
                        fill
                        className={cn(
                          "object-cover transition-all",
                          !beat.isActive && "grayscale-[50%]",
                        )}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Music className="w-16 h-16 text-slc-muted" />
                      </div>
                    )}
                    {/* Gate indicator */}
                    <div className="absolute top-2 right-2">
                      {beat.gateEnabled ? (
                        <div
                          className="bg-orange-500/90 rounded-full p-1.5"
                          title="Download Gate Activo"
                        >
                          <Lock className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div
                          className="bg-green-500/90 rounded-full p-1.5"
                          title="Descarga Libre"
                        >
                          <Unlock className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    {/* Featured badge */}
                    {beat.isFeatured && (
                      <div className="absolute top-2 left-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      </div>
                    )}

                    {/* Visibility toggle overlay on cover */}
                    <div className="absolute bottom-2 right-2">
                      <button
                        onClick={() =>
                          toggleBeatVisibility(beat.id, !beat.isActive)
                        }
                        disabled={togglingId === beat.id}
                        className={cn(
                          "p-2 rounded-lg transition-all backdrop-blur-sm border",
                          beat.isActive
                            ? "bg-green-500/90 border-green-400/50 text-white hover:bg-green-600/90"
                            : "bg-slc-dark/90 border-slc-border text-slc-muted hover:bg-slc-card/90 hover:text-white",
                        )}
                        title={
                          beat.isActive
                            ? "Ocultar del sitio"
                            : "Mostrar en el sitio"
                        }
                      >
                        {togglingId === beat.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : beat.isActive ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-lg">{beat.title}</h3>
                        {beat.producerName && (
                          <p className="text-sm text-slc-muted">
                            {beat.producerName}
                          </p>
                        )}
                      </div>
                      {!beat.isFree && beat.price && (
                        <span className="text-primary font-medium">
                          ${beat.price}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {beat.bpm && (
                        <span className="text-xs px-2 py-1 bg-slc-border rounded-full">
                          {beat.bpm} BPM
                        </span>
                      )}
                      {beat.key && (
                        <span className="text-xs px-2 py-1 bg-slc-border rounded-full">
                          {beat.key}
                        </span>
                      )}
                      {beat.genre && (
                        <span className="text-xs px-2 py-1 bg-slc-border rounded-full">
                          {beat.genre}
                        </span>
                      )}
                    </div>

                    {/* Basic Stats */}
                    <div className="flex items-center gap-4 text-sm text-slc-muted mb-3">
                      <div className="flex items-center gap-1" title="Visitas">
                        <Eye className="w-3 h-3" />
                        <span>{beat.viewCount.toLocaleString()}</span>
                      </div>
                      <div
                        className="flex items-center gap-1"
                        title="Previews reproducidos"
                      >
                        <Play className="w-3 h-3" />
                        <span>{beat.playCount.toLocaleString()}</span>
                      </div>
                      <div
                        className="flex items-center gap-1"
                        title="Descargas completadas"
                      >
                        <Download className="w-3 h-3" />
                        <span>{beat.downloadCount.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Conversion Rate Bar */}
                    {bs && beat.gateEnabled && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slc-muted">
                            Tasa de conversión
                          </span>
                          <span
                            className={cn(
                              "font-medium",
                              getRateColor(bs.gateCompletionRate),
                            )}
                          >
                            {bs.gateCompletionRate}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slc-border rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              bs.gateCompletionRate >= 50
                                ? "bg-green-500"
                                : bs.gateCompletionRate >= 25
                                  ? "bg-yellow-500"
                                  : bs.gateCompletionRate > 0
                                    ? "bg-orange-500"
                                    : "bg-slc-border",
                            )}
                            style={{
                              width: `${Math.min(bs.gateCompletionRate, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Expand Stats Button */}
                    <button
                      onClick={() =>
                        setExpandedBeat(isExpanded ? null : beat.id)
                      }
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-slc-muted hover:text-primary transition-colors py-1 mb-2"
                    >
                      <BarChart3 className="w-3 h-3" />
                      {isExpanded ? "Ocultar detalles" : "Ver detalles"}
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>

                    {/* Expanded Stats */}
                    {isExpanded && bs && (
                      <div className="bg-slc-dark/50 rounded-lg p-3 mb-3 space-y-2 border border-slc-border/50">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slc-muted">
                              Visitas totales
                            </span>
                            <span className="font-medium">
                              {bs.viewCount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slc-muted">Previews</span>
                            <span className="font-medium">
                              {bs.playCount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slc-muted">Descargas</span>
                            <span className="font-medium">
                              {bs.downloadCount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slc-muted">Conversión</span>
                            <span
                              className={cn(
                                "font-medium",
                                getRateColor(bs.gateCompletionRate),
                              )}
                            >
                              {bs.gateCompletionRate}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slc-muted">
                              Descargas ({period})
                            </span>
                            <span className="font-medium text-primary">
                              {bs.periodDownloads}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slc-muted">
                              Emails únicos
                            </span>
                            <span className="font-medium text-yellow-500">
                              {bs.uniqueEmails}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slc-muted">
                              Spotify Follows
                            </span>
                            <span className="font-medium text-green-500">
                              {bs.spotifyFollowCount}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slc-muted">
                              Spotify Plays
                            </span>
                            <span className="font-medium text-green-400">
                              {bs.spotifyPlayCount}
                            </span>
                          </div>
                        </div>
                        {bs.lastDownloadAt && (
                          <div className="flex items-center gap-1.5 text-xs text-slc-muted pt-1 border-t border-slc-border/50">
                            <Clock className="w-3 h-3" />
                            Última descarga: {formatTimeAgo(bs.lastDownloadAt)}
                          </div>
                        )}
                        {/* View-to-download funnel */}
                        <div className="pt-1 border-t border-slc-border/50">
                          <div className="text-xs text-slc-muted mb-1.5">
                            Embudo
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="w-16 text-[10px] text-slc-muted text-right">
                                Visitas
                              </div>
                              <div className="flex-1 h-3 bg-slc-border rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500/60 rounded-full"
                                  style={{ width: "100%" }}
                                />
                              </div>
                              <div className="w-10 text-[10px] text-right">
                                {bs.viewCount}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16 text-[10px] text-slc-muted text-right">
                                Previews
                              </div>
                              <div className="flex-1 h-3 bg-slc-border rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary/60 rounded-full"
                                  style={{
                                    width: `${bs.viewCount > 0 ? Math.max((bs.playCount / bs.viewCount) * 100, 2) : 0}%`,
                                  }}
                                />
                              </div>
                              <div className="w-10 text-[10px] text-right">
                                {bs.playCount}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16 text-[10px] text-slc-muted text-right">
                                Descargas
                              </div>
                              <div className="flex-1 h-3 bg-slc-border rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-500/60 rounded-full"
                                  style={{
                                    width: `${bs.viewCount > 0 ? Math.max((bs.downloadCount / bs.viewCount) * 100, 2) : 0}%`,
                                  }}
                                />
                              </div>
                              <div className="w-10 text-[10px] text-right">
                                {bs.downloadCount}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Link href={`/beats/${beat.slug}`} target="_blank">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Ver
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Link href={`/admin/beats/${beat.id}`}>
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => handleDelete(beat)}
                        disabled={deletingId === beat.id}
                      >
                        {deletingId === beat.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
