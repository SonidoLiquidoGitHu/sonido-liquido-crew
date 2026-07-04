"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  Clock,
  Eye,
  Globe,
  Monitor,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

interface VisitorData {
  totalViews: number;
  uniqueSessions: number;
  todayViews: number;
  todaySessions: number;
  yesterdayViews: number;
  yesterdaySessions: number;
  viewsTrend: number;
  sessionsTrend: number;
  avgPagesPerSession: number;
  topPages: { page: string; views: number }[];
  viewsByDay: { date: string; views: number; uniqueVisitors: number }[];
  referrers: { referrer: string; count: number }[];
  devices: { mobile: number; desktop: number; bot: number };
  recentActivity: {
    eventType: string;
    page: string;
    referrer: string | null;
    isMobile: boolean;
    time: string;
  }[];
}

interface VisitorMetricsProps {
  initialData?: VisitorData | null;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatPagePath(path: string | null): string {
  if (!path || path === "/") return "Inicio";
  const map: Record<string, string> = {
    "/musica": "Música",
    "/prensa": "Prensa",
    "/beats": "Beats",
    "/eventos": "Eventos",
    "/comunidad": "Comunidad",
    "/galeria": "Galería",
    "/artistas": "Artistas",
  };
  if (map[path]) return map[path];
  // Handle dynamic routes
  if (path.startsWith("/prensa/")) return `Prensa → ${path.split("/").pop()}`;
  if (path.startsWith("/artistas/"))
    return `Artista → ${path.split("/").pop()}`;
  if (path.startsWith("/beats/")) return `Beat → ${path.split("/").pop()}`;
  if (path.length > 20) return `...${path.slice(-17)}`;
  return path;
}

function timeAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return "ahora";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
    return `${Math.floor(diffSec / 86400)}d`;
  } catch {
    return "";
  }
}

export function VisitorMetrics({ initialData }: VisitorMetricsProps) {
  const [data, setData] = useState<VisitorData | null>(initialData || null);
  const [period, setPeriod] = useState<number>(30);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/analytics/visitors?days=${period}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setData(json.data);
          }
        }
      } catch (err) {
        console.debug("[VisitorMetrics] Fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [period]);

  const todayVsYesterdayViews = data?.yesterdayViews
    ? Math.round(
        ((data.todayViews - data.yesterdayViews) / data.yesterdayViews) * 100,
      )
    : data?.todayViews
      ? 100
      : 0;

  const todayVsYesterdaySessions = data?.yesterdaySessions
    ? Math.round(
        ((data.todaySessions - data.yesterdaySessions) /
          data.yesterdaySessions) *
          100,
      )
    : data?.todaySessions
      ? 100
      : 0;

  const totalDevices =
    (data?.devices.desktop || 0) + (data?.devices.mobile || 0);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="font-oswald text-xl uppercase">
            Visitantes del Sitio
          </h2>
        </div>
        <div className="flex items-center gap-1 bg-slc-card border border-slc-border rounded-lg p-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                period === d
                  ? "bg-primary text-white"
                  : "text-slc-muted hover:text-white"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Visitors */}
        <div className="admin-metric-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slc-muted text-sm">Visitantes Hoy</p>
              <p className="font-oswald text-3xl mt-1">
                {loading ? "—" : formatNumber(data?.todaySessions || 0)}
              </p>
              <p
                className={`text-xs mt-2 flex items-center gap-1 ${todayVsYesterdaySessions >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {todayVsYesterdaySessions >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {todayVsYesterdaySessions >= 0 ? "+" : ""}
                {todayVsYesterdaySessions}% vs ayer
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Today's Page Views */}
        <div className="admin-metric-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slc-muted text-sm">Vistas Hoy</p>
              <p className="font-oswald text-3xl mt-1">
                {loading ? "—" : formatNumber(data?.todayViews || 0)}
              </p>
              <p
                className={`text-xs mt-2 flex items-center gap-1 ${todayVsYesterdayViews >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {todayVsYesterdayViews >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {todayVsYesterdayViews >= 0 ? "+" : ""}
                {todayVsYesterdayViews}% vs ayer
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Period Visitors */}
        <div className="admin-metric-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slc-muted text-sm">Visitantes {period}d</p>
              <p className="font-oswald text-3xl mt-1">
                {loading ? "—" : formatNumber(data?.uniqueSessions || 0)}
              </p>
              <p
                className={`text-xs mt-2 flex items-center gap-1 ${(data?.sessionsTrend || 0) >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {(data?.sessionsTrend || 0) >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {(data?.sessionsTrend || 0) >= 0 ? "+" : ""}
                {data?.sessionsTrend || 0}% vs período anterior
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Period Views + Avg Pages */}
        <div className="admin-metric-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slc-muted text-sm">Vistas {period}d</p>
              <p className="font-oswald text-3xl mt-1">
                {loading ? "—" : formatNumber(data?.totalViews || 0)}
              </p>
              <p className="text-xs mt-2 text-slc-muted">
                {data?.avgPagesPerSession || 0} págs/sesión
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Device Breakdown */}
        <div className="bg-slc-dark border border-slc-border rounded-xl p-5">
          <h3 className="font-oswald text-sm uppercase text-slc-muted mb-4">
            Dispositivos
          </h3>
          {totalDevices > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">Desktop</span>
                </div>
                <span className="text-sm font-medium">
                  {Math.round(
                    ((data?.devices.desktop || 0) / totalDevices) * 100,
                  )}
                  %{" "}
                  <span className="text-slc-muted">
                    ({data?.devices.desktop || 0})
                  </span>
                </span>
              </div>
              <div className="w-full bg-slc-border rounded-full h-2">
                <div
                  className="bg-blue-400 h-2 rounded-full transition-all"
                  style={{
                    width: `${((data?.devices.desktop || 0) / totalDevices) * 100}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-green-400" />
                  <span className="text-sm">Mobile</span>
                </div>
                <span className="text-sm font-medium">
                  {Math.round(
                    ((data?.devices.mobile || 0) / totalDevices) * 100,
                  )}
                  %{" "}
                  <span className="text-slc-muted">
                    ({data?.devices.mobile || 0})
                  </span>
                </span>
              </div>
              <div className="w-full bg-slc-border rounded-full h-2">
                <div
                  className="bg-green-400 h-2 rounded-full transition-all"
                  style={{
                    width: `${((data?.devices.mobile || 0) / totalDevices) * 100}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slc-muted">
              {loading ? "Cargando..." : "Sin datos aún"}
            </p>
          )}
        </div>

        {/* Top Pages */}
        <div className="bg-slc-dark border border-slc-border rounded-xl p-5">
          <h3 className="font-oswald text-sm uppercase text-slc-muted mb-4">
            Páginas Más Visitadas
          </h3>
          {data?.topPages && data.topPages.length > 0 ? (
            <div className="space-y-2">
              {data.topPages.slice(0, 6).map((page, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate flex-1 mr-2">
                    {formatPagePath(page.page)}
                  </span>
                  <span className="text-primary font-medium whitespace-nowrap">
                    {formatNumber(page.views)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slc-muted">
              {loading ? "Cargando..." : "Sin datos aún"}
            </p>
          )}
        </div>

        {/* Top Referrers */}
        <div className="bg-slc-dark border border-slc-border rounded-xl p-5">
          <h3 className="font-oswald text-sm uppercase text-slc-muted mb-4">
            Fuentes de Tráfico
          </h3>
          {data?.referrers && data.referrers.length > 0 ? (
            <div className="space-y-2">
              {data.referrers.slice(0, 6).map((ref, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate flex-1 mr-2">
                    {ref.referrer === "direct" ? "Directo" : ref.referrer}
                  </span>
                  <span className="text-primary font-medium whitespace-nowrap">
                    {formatNumber(ref.count)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slc-muted">
              {loading ? "Cargando..." : "Sin datos aún"}
            </p>
          )}
        </div>
      </div>

      {/* Views Chart (simple bar visualization) */}
      {data?.viewsByDay && data.viewsByDay.length > 0 && (
        <div className="bg-slc-dark border border-slc-border rounded-xl p-5">
          <h3 className="font-oswald text-sm uppercase text-slc-muted mb-4">
            Vistas por Día
          </h3>
          <div className="flex items-end gap-1 h-24">
            {data.viewsByDay.slice(-30).map((day, i) => {
              const maxViews = Math.max(
                ...data.viewsByDay.slice(-30).map((d) => d.views),
              );
              const height = maxViews > 0 ? (day.views / maxViews) * 100 : 0;
              return (
                <div
                  key={i}
                  className="flex-1 min-w-[4px] group relative"
                  title={`${day.date}: ${day.views} vistas, ${day.uniqueVisitors} visitantes`}
                >
                  <div
                    className="w-full bg-primary/60 hover:bg-primary rounded-t transition-all cursor-pointer"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slc-muted">
            <span>{data.viewsByDay[0]?.date}</span>
            <span>{data.viewsByDay[data.viewsByDay.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Recent Activity Feed */}
      {data?.recentActivity && data.recentActivity.length > 0 && (
        <div className="bg-slc-dark border border-slc-border rounded-xl p-5">
          <h3 className="font-oswald text-sm uppercase text-slc-muted mb-4">
            Actividad Reciente
          </h3>
          <div className="space-y-2">
            {data.recentActivity.slice(0, 8).map((event, i) => (
              <div key={i} className="flex items-center gap-3 text-sm py-1.5">
                <div
                  className={`w-2 h-2 rounded-full ${
                    event.eventType === "page_view"
                      ? "bg-green-500"
                      : "bg-blue-500"
                  }`}
                />
                <span className="truncate flex-1">
                  {formatPagePath(event.page)}
                </span>
                {event.isMobile ? (
                  <Smartphone className="w-3 h-3 text-slc-muted" />
                ) : (
                  <Monitor className="w-3 h-3 text-slc-muted" />
                )}
                <span className="text-slc-muted text-xs whitespace-nowrap">
                  {timeAgo(event.time)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
