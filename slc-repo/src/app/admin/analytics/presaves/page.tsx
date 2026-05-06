"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Music,
  Clock,
  Users,
  MousePointer,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Calendar,
  Smartphone,
  Globe,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PresaveStats {
  totalClicks: number;
  uniqueUsers: number;
  topPlatform: string;
  topSource: string;
  conversionRate: number;
}

interface PlatformData {
  platform: string;
  count: number;
  uniqueUsers: number;
  percentage: number;
}

interface SourceData {
  source: string;
  count: number;
  percentage: number;
}

interface TimelineData {
  date: string;
  count: number;
}

interface ReleaseAnalytics {
  id: string;
  title: string;
  artistName: string;
  presaveCount: number;
  viewCount: number;
  conversionRate: number;
  releaseDate: string;
}

// Platform colors
const platformColors: Record<string, string> = {
  spotify: "#1DB954",
  apple_music: "#FC3C44",
  deezer: "#00C7F2",
  rpm: "#f97316",
  tidal: "#000000",
  amazon_music: "#FF9900",
  youtube_music: "#FF0000",
};

// Platform labels
const platformLabels: Record<string, string> = {
  spotify: "Spotify",
  apple_music: "Apple Music",
  deezer: "Deezer",
  rpm: "RPM",
  tidal: "Tidal",
  amazon_music: "Amazon Music",
  youtube_music: "YouTube Music",
};

export default function PresaveAnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [stats, setStats] = useState<PresaveStats | null>(null);
  const [platformData, setPlatformData] = useState<PlatformData[]>([]);
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [releaseAnalytics, setReleaseAnalytics] = useState<ReleaseAnalytics[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  async function fetchAnalytics() {
    setIsLoading(true);
    try {
      const [clicksRes, releasesRes] = await Promise.all([
        fetch(`/api/admin/analytics/presaves?range=${dateRange}`),
        fetch("/api/upcoming-releases?limit=20"),
      ]);

      const clicksData = await clicksRes.json();
      const releasesData = await releasesRes.json();

      if (clicksData.success) {
        setStats(clicksData.data.stats);
        setPlatformData(clicksData.data.byPlatform || []);
        setSourceData(clicksData.data.bySource || []);
        setTimelineData(clicksData.data.timeline || []);
      }

      if (releasesData.success) {
        const analytics = releasesData.data.map((r: any) => ({
          id: r.id,
          title: r.title,
          artistName: r.artistName,
          presaveCount: r.presaveCount || 0,
          viewCount: r.viewCount || 0,
          conversionRate: r.viewCount > 0 ? ((r.presaveCount || 0) / r.viewCount * 100) : 0,
          releaseDate: r.releaseDate,
        }));
        setReleaseAnalytics(analytics.sort((a: ReleaseAnalytics, b: ReleaseAnalytics) => b.presaveCount - a.presaveCount));
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
    setIsLoading(false);
  }

  // Calculate max for bar chart scaling
  const maxPlatformCount = Math.max(...platformData.map(p => p.count), 1);
  const maxTimelineCount = Math.max(...timelineData.map(t => t.count), 1);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-oswald text-3xl uppercase flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary" />
              Analytics de Presaves
            </h1>
            <p className="text-slc-muted mt-1">
              Métricas y conversiones de pre-guardados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex bg-slc-card rounded-lg p-1">
            {(["7d", "30d", "90d", "all"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                  dateRange === range
                    ? "bg-primary text-white"
                    : "text-slc-muted hover:text-white"
                )}
              >
                {range === "7d" ? "7 días" : range === "30d" ? "30 días" : range === "90d" ? "90 días" : "Todo"}
              </button>
            ))}
          </div>
          <Button onClick={fetchAnalytics} variant="outline" disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Actualizar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slc-card border border-slc-border rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <MousePointer className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-oswald">{stats?.totalClicks || 0}</p>
                  <p className="text-xs text-slc-muted">Total clics</p>
                </div>
              </div>
            </div>

            <div className="bg-slc-card border border-slc-border rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-oswald">{stats?.uniqueUsers || 0}</p>
                  <p className="text-xs text-slc-muted">Usuarios únicos</p>
                </div>
              </div>
            </div>

            <div className="bg-slc-card border border-slc-border rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1DB954]/20 flex items-center justify-center">
                  <Music className="w-5 h-5 text-[#1DB954]" />
                </div>
                <div>
                  <p className="text-lg font-oswald">{platformLabels[stats?.topPlatform || ""] || "N/A"}</p>
                  <p className="text-xs text-slc-muted">Top plataforma</p>
                </div>
              </div>
            </div>

            <div className="bg-slc-card border border-slc-border rounded-xl p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-2xl font-oswald">{(stats?.conversionRate || 0).toFixed(1)}%</p>
                  <p className="text-xs text-slc-muted">Conversión</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Platform Distribution */}
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h3 className="font-oswald text-lg uppercase mb-6 flex items-center gap-2">
                <Music className="w-5 h-5 text-primary" />
                Clics por Plataforma
              </h3>

              {platformData.length === 0 ? (
                <p className="text-slc-muted text-sm text-center py-8">No hay datos disponibles</p>
              ) : (
                <div className="space-y-4">
                  {platformData.map((platform) => (
                    <div key={platform.platform} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: platformColors[platform.platform] || "#666" }}
                          />
                          <span className="text-sm font-medium">
                            {platformLabels[platform.platform] || platform.platform}
                          </span>
                        </div>
                        <div className="text-sm text-slc-muted">
                          {platform.count} ({platform.percentage.toFixed(1)}%)
                        </div>
                      </div>
                      <div className="h-2 bg-slc-dark rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(platform.count / maxPlatformCount) * 100}%`,
                            backgroundColor: platformColors[platform.platform] || "#666",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Source Distribution */}
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h3 className="font-oswald text-lg uppercase mb-6 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Clics por Fuente
              </h3>

              {sourceData.length === 0 ? (
                <p className="text-slc-muted text-sm text-center py-8">No hay datos disponibles</p>
              ) : (
                <div className="space-y-4">
                  {sourceData.map((source, index) => {
                    const colors = ["#f97316", "#22c55e", "#3b82f6", "#a855f7"];
                    const sourceLabels: Record<string, string> = {
                      website: "Sitio Web",
                      widget: "Widget Embebido",
                      embed: "Embed Externo",
                    };
                    const sourceIcons: Record<string, typeof Globe> = {
                      website: Globe,
                      widget: Smartphone,
                      embed: ExternalLink,
                    };
                    const Icon = sourceIcons[source.source] || Globe;

                    return (
                      <div key={source.source} className="flex items-center gap-4 p-3 bg-slc-dark rounded-lg">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${colors[index % colors.length]}20` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: colors[index % colors.length] }} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{sourceLabels[source.source] || source.source}</p>
                          <p className="text-xs text-slc-muted">{source.count} clics</p>
                        </div>
                        <div className="text-lg font-oswald" style={{ color: colors[index % colors.length] }}>
                          {source.percentage.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Timeline Chart */}
          <div className="bg-slc-card border border-slc-border rounded-xl p-6 mb-8">
            <h3 className="font-oswald text-lg uppercase mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Clics en el Tiempo
            </h3>

            {timelineData.length === 0 ? (
              <p className="text-slc-muted text-sm text-center py-8">No hay datos disponibles</p>
            ) : (
              <div className="h-48">
                <div className="flex items-end justify-between h-full gap-1">
                  {timelineData.slice(-30).map((day, index) => (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center gap-1 group"
                    >
                      <div
                        className="w-full bg-primary/80 hover:bg-primary rounded-t transition-all cursor-pointer relative"
                        style={{
                          height: `${Math.max((day.count / maxTimelineCount) * 100, 4)}%`,
                          minHeight: "4px",
                        }}
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slc-dark border border-slc-border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          <p className="font-medium">{day.count} clics</p>
                          <p className="text-slc-muted">{new Date(day.date).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</p>
                        </div>
                      </div>
                      {/* Show date labels for some bars */}
                      {(index === 0 || index === Math.floor(timelineData.slice(-30).length / 2) || index === timelineData.slice(-30).length - 1) && (
                        <span className="text-[10px] text-slc-muted">
                          {new Date(day.date).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top Releases */}
          <div className="bg-slc-card border border-slc-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slc-border">
              <h3 className="font-oswald text-lg uppercase flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Top Lanzamientos por Presaves
              </h3>
            </div>

            {releaseAnalytics.length === 0 ? (
              <p className="text-slc-muted text-sm text-center py-8">No hay lanzamientos</p>
            ) : (
              <div className="divide-y divide-slc-border">
                {releaseAnalytics.slice(0, 10).map((release, index) => (
                  <div key={release.id} className="p-4 flex items-center gap-4 hover:bg-slc-dark/50">
                    <div className="w-8 h-8 rounded-full bg-slc-dark flex items-center justify-center font-oswald text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{release.title}</p>
                      <p className="text-xs text-slc-muted">{release.artistName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-oswald text-lg">{release.presaveCount}</p>
                      <p className="text-xs text-slc-muted">presaves</p>
                    </div>
                    <div className="text-right">
                      <p className="font-oswald text-lg text-slc-muted">{release.viewCount}</p>
                      <p className="text-xs text-slc-muted">vistas</p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-oswald text-lg",
                        release.conversionRate > 10 ? "text-green-500" :
                        release.conversionRate > 5 ? "text-yellow-500" : "text-slc-muted"
                      )}>
                        {release.conversionRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-slc-muted">conversión</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
