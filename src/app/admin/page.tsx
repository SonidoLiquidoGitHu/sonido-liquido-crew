import Link from "next/link";
import { dashboardService } from "@/lib/services";
import { getSyncHealth } from "@/lib/sync";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { checkConnection, isDatabaseConfigured } from "@/db/client";
import {
  Users,
  Disc3,
  Video,
  ShoppingBag,
  Mail,
  Download,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  Rocket,
  Bell,
  Eye,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { CalendarDashboard } from "@/components/admin/CalendarDashboard";
import { SpotifySyncButton } from "@/components/admin/SpotifySyncButton";
import { EnsureTablesButton } from "@/components/admin/EnsureTablesButton";
import { VisitorMetrics } from "@/components/admin/VisitorMetrics";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dashboard | Admin - Sonido Líquido Crew",
};

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  href?: string;
  trend?: { value: number; isPositive: boolean };
}

function MetricCard({ title, value, icon, href, trend }: MetricCardProps) {
  const content = (
    <div className="admin-metric-card hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slc-muted text-sm">{title}</p>
          <p className="font-oswald text-3xl mt-1">{value}</p>
          {trend && (
            <p className={`text-xs mt-2 flex items-center gap-1 ${trend.isPositive ? "text-green-500" : "text-red-500"}`}>
              <TrendingUp className={`w-3 h-3 ${!trend.isPositive && "rotate-180"}`} />
              {trend.isPositive ? "+" : ""}{trend.value}% vs mes anterior
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function SyncStatusCard({
  name,
  status,
  lastSync,
  itemsProcessed,
}: {
  name: string;
  status: string;
  lastSync: Date | null;
  itemsProcessed: number;
}) {
  const statusConfig = {
    healthy: { color: "text-green-500", bg: "bg-green-500/10", icon: CheckCircle },
    running: { color: "text-yellow-500", bg: "bg-yellow-500/10", icon: RefreshCw },
    error: { color: "text-red-500", bg: "bg-red-500/10", icon: AlertTriangle },
    stale: { color: "text-orange-500", bg: "bg-orange-500/10", icon: Clock },
    never: { color: "text-slc-muted", bg: "bg-slc-card", icon: Clock },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.never;
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center gap-4 p-4 bg-slc-card border border-slc-border rounded-lg">
      <div className={`w-10 h-10 rounded-full ${config.bg} ${config.color} flex items-center justify-center`}>
        <StatusIcon className={`w-5 h-5 ${status === "running" ? "animate-spin" : ""}`} />
      </div>
      <div className="flex-1">
        <h4 className="font-medium">{name}</h4>
        <p className="text-xs text-slc-muted">
          {lastSync ? (
            <>
              Último sync: {formatRelativeTime(lastSync)} • {itemsProcessed} items
            </>
          ) : (
            "Nunca sincronizado"
          )}
        </p>
      </div>
      <div className={`text-xs uppercase tracking-wider ${config.color}`}>
        {status === "healthy" ? "OK" : status === "running" ? "Sync..." : status === "error" ? "Error" : status === "stale" ? "Pendiente" : "N/A"}
      </div>
    </div>
  );
}

// Types for sync health
type SyncStatus = "healthy" | "running" | "error" | "stale" | "never";

interface SyncHealthItem {
  status: SyncStatus;
  lastSync: Date | null;
  itemsProcessed: number;
  itemsFailed?: number;
}

interface SyncHealth {
  spotify: SyncHealthItem;
  youtube: SyncHealthItem;
  dropbox: SyncHealthItem;
}

// Default fallback data when database is unavailable
const defaultSummary = {
  totalArtists: 0,
  totalReleases: 0,
  totalVideos: 0,
  totalSubscribers: 0,
  latestReleases: [] as Array<{ id: string; title: string; releaseDate: Date; releaseType: string; coverImageUrl: string | null }>,
  releasesPerYear: [] as Array<{ year: number; count: number }>,
  upcomingStats: {
    activeReleases: 0,
    totalPresaves: 0,
    topRelease: null as { title: string; artistName: string; presaveCount: number } | null,
  },
};

const defaultSyncHealth: SyncHealth = {
  spotify: { status: "never", lastSync: null, itemsProcessed: 0 },
  youtube: { status: "never", lastSync: null, itemsProcessed: 0 },
  dropbox: { status: "never", lastSync: null, itemsProcessed: 0 },
};

export default async function AdminDashboardPage() {
  let summary = defaultSummary;
  let syncHealth: SyncHealth = defaultSyncHealth;
  let hasError = false;
  let dbConnected = false;
  let dbConfigured = false;

  try {
    // Check database status
    dbConfigured = isDatabaseConfigured();
    if (dbConfigured) {
      dbConnected = await checkConnection();
    }

    const [summaryResult, syncHealthResult] = await Promise.all([
      dashboardService.getSummary().catch((e) => {
        console.error("Failed to get dashboard summary:", e);
        return null;
      }),
      getSyncHealth().catch((e) => {
        console.error("Failed to get sync health:", e);
        return null;
      }),
    ]);

    if (summaryResult) {
      summary = summaryResult;
    } else {
      hasError = true;
    }

    if (syncHealthResult) {
      syncHealth = syncHealthResult as SyncHealth;
    }
  } catch (error) {
    console.error("Admin dashboard error:", error);
    hasError = true;
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Error Banner */}
      {hasError && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="text-yellow-500 font-medium">Conexión limitada</p>
            <p className="text-sm text-yellow-500/80">
              Algunos datos no están disponibles. Verifica la configuración de la base de datos.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase">Dashboard</h1>
          <p className="text-slc-muted mt-1">
            Resumen general de Sonido Líquido Crew
          </p>
        </div>
        {/* Database Status Indicator */}
        <div className="flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full ${dbConnected ? "bg-green-500" : dbConfigured ? "bg-yellow-500" : "bg-red-500"}`} />
          <span className={dbConnected ? "text-green-500" : dbConfigured ? "text-yellow-500" : "text-red-500"}>
            {dbConnected ? "Base de datos conectada" : dbConfigured ? "Conectando..." : "Base de datos no configurada"}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Artistas"
          value={summary.totalArtists}
          icon={<Users className="w-6 h-6" />}
          href="/admin/artists"
        />
        <MetricCard
          title="Lanzamientos"
          value={summary.totalReleases}
          icon={<Disc3 className="w-6 h-6" />}
          href="/admin/releases"
        />
        <MetricCard
          title="Videos"
          value={summary.totalVideos}
          icon={<Video className="w-6 h-6" />}
          href="/admin/videos"
        />
        <MetricCard
          title="Suscriptores"
          value={summary.totalSubscribers}
          icon={<Mail className="w-6 h-6" />}
          href="/admin/subscribers"
        />
      </div>

      {/* Visitor Metrics */}
      <div className="mb-8">
        <VisitorMetrics />
      </div>

      {/* Upcoming Releases / Presave Stats */}
      {(summary.upcomingStats?.activeReleases > 0 || summary.upcomingStats?.totalPresaves > 0) && (
        <div className="bg-gradient-to-r from-primary/10 via-orange-500/5 to-primary/10 border border-primary/20 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                <Rocket className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="font-oswald text-xl uppercase">Próximos Lanzamientos</h3>
                <p className="text-slc-muted text-sm">
                  {summary.upcomingStats.activeReleases} activo{summary.upcomingStats.activeReleases !== 1 ? "s" : ""} •{" "}
                  <span className="text-primary font-bold">{summary.upcomingStats.totalPresaves}</span> presaves totales
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {summary.upcomingStats.topRelease && (
                <div className="hidden sm:block text-right">
                  <p className="text-xs text-slc-muted uppercase">Top Release</p>
                  <p className="font-medium">{summary.upcomingStats.topRelease.title}</p>
                  <p className="text-sm text-slc-muted">
                    {summary.upcomingStats.topRelease.artistName} •
                    <span className="text-primary ml-1">{summary.upcomingStats.topRelease.presaveCount} presaves</span>
                  </p>
                </div>
              )}
              <Button asChild>
                <Link href="/admin/upcoming-releases">
                  <Bell className="w-4 h-4 mr-2" />
                  Gestionar
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sync Status */}
        <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-oswald text-xl uppercase">Sincronización</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/sync">
                Gestionar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
          <div className="space-y-3">
            <SyncStatusCard
              name="Spotify"
              status={syncHealth.spotify.status}
              lastSync={syncHealth.spotify.lastSync}
              itemsProcessed={syncHealth.spotify.itemsProcessed}
            />
            <SyncStatusCard
              name="YouTube"
              status={syncHealth.youtube.status}
              lastSync={syncHealth.youtube.lastSync}
              itemsProcessed={syncHealth.youtube.itemsProcessed}
            />
            <SyncStatusCard
              name="Dropbox"
              status={syncHealth.dropbox.status}
              lastSync={syncHealth.dropbox.lastSync}
              itemsProcessed={syncHealth.dropbox.itemsProcessed}
            />
          </div>

          {/* Spotify Quick Sync */}
          <div className="mt-4 pt-4 border-t border-slc-border">
            <p className="text-sm text-slc-muted mb-2">Sync Rápido de Spotify</p>
            <SpotifySyncButton />
          </div>
        </div>

        {/* Latest Releases */}
        <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-oswald text-xl uppercase">Últimos Lanzamientos</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/releases">
                Ver todos
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
          <div className="space-y-3">
            {summary.latestReleases.slice(0, 5).map((release) => (
              <Link
                key={release.id}
                href={`/admin/releases/${release.id}`}
                className="flex items-center gap-4 p-3 bg-slc-card border border-slc-border rounded-lg hover:border-primary/30 transition-colors"
              >
                <div className="w-12 h-12 rounded overflow-hidden bg-slc-border flex items-center justify-center flex-shrink-0">
                  {release.coverImageUrl ? (
                    <SafeImage
                      src={release.coverImageUrl}
                      alt={release.title}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Disc3 className="w-6 h-6 text-slc-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{release.title}</h4>
                  <p className="text-xs text-slc-muted" suppressHydrationWarning>
                    {formatDate(release.releaseDate, { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>
                <span className="text-xs text-primary uppercase">
                  {release.releaseType}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Dashboard */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-6 h-6 text-primary" />
          <h2 className="font-oswald text-xl uppercase">Calendario de Actividades</h2>
        </div>
        <CalendarDashboard />
      </div>

      {/* Releases by Year Chart Placeholder */}
      <div className="mt-8 bg-slc-dark border border-slc-border rounded-xl p-6">
        <h2 className="font-oswald text-xl uppercase mb-4">Lanzamientos por Año</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
          {summary.releasesPerYear.slice(0, 8).map((item) => (
            <div key={item.year} className="text-center p-4 bg-slc-card rounded-lg">
              <div className="font-oswald text-2xl text-primary">{item.count}</div>
              <div className="text-xs text-slc-muted mt-1">{item.year}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/artists/new"
          className="flex items-center gap-3 p-4 bg-slc-card border border-slc-border rounded-lg hover:border-primary/50 transition-colors"
        >
          <Users className="w-5 h-5 text-primary" />
          <span>Agregar Artista</span>
        </Link>
        <Link
          href="/admin/releases/new"
          className="flex items-center gap-3 p-4 bg-slc-card border border-slc-border rounded-lg hover:border-primary/50 transition-colors"
        >
          <Disc3 className="w-5 h-5 text-primary" />
          <span>Agregar Lanzamiento</span>
        </Link>
        <Link
          href="/admin/videos/new"
          className="flex items-center gap-3 p-4 bg-slc-card border border-slc-border rounded-lg hover:border-primary/50 transition-colors"
        >
          <Video className="w-5 h-5 text-primary" />
          <span>Agregar Video</span>
        </Link>
        <Link
          href="/admin/sync"
          className="flex items-center gap-3 p-4 bg-slc-card border border-slc-border rounded-lg hover:border-primary/50 transition-colors"
        >
          <RefreshCw className="w-5 h-5 text-primary" />
          <span>Sincronizar Todo</span>
        </Link>
      </div>

      {/* Database Maintenance */}
      <div className="mt-8 bg-slc-dark border border-slc-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-primary" />
            <h2 className="font-oswald text-xl uppercase">Mantenimiento de Base de Datos</h2>
          </div>
          <EnsureTablesButton connected={dbConnected} />
        </div>
        <p className="text-sm text-slc-muted">
          Si alguna función no funciona (playlists, galería, etc.), ejecuta "Asegurar Tablas" para crear las tablas faltantes.
        </p>
      </div>
    </div>
  );
}
