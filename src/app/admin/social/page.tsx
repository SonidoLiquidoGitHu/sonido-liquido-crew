"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Share2,
  RefreshCw,
  Play,
  SkipForward,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Image as ImageIcon,
  Music,
  Users,
  Loader2,
  ExternalLink,
  ArrowRight,
  RotateCcw,
  Key,
  Facebook,
  Instagram,
} from "lucide-react";

// ===========================================
// TYPES
// ===========================================

interface QueueSummary {
  total: number;
  pending: number;
  posted: number;
  failed: number;
  skipped: number;
  byContentType: Record<string, number>;
  currentCycle: number;
}

interface QueueItem {
  id: string;
  contentType: "gallery_photo" | "spotify_track" | "artist_profile";
  sourceId: string;
  artistId: string | null;
  releaseId: string | null;
  imageUrl: string;
  caption: string | null;
  linkUrl: string | null;
  queueOrder: number;
  cycleNumber: number;
  status: "pending" | "posted" | "failed" | "skipped";
  platforms: string;
  postedPlatforms: string | null;
  errorMessage: string | null;
  postedAt: string | null;
  createdAt: string;
}

interface PostLog {
  id: string;
  queueId: string;
  platform: "facebook" | "instagram";
  contentType: "gallery_photo" | "spotify_track" | "artist_profile";
  sourceId: string;
  imageUrl: string;
  caption: string | null;
  linkUrl: string | null;
  platformPostId: string | null;
  platformPostUrl: string | null;
  status: "success" | "failed" | "rate_limited";
  errorMessage: string | null;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
  postedAt: string;
  createdAt: string;
}

interface MetaStatus {
  configured: boolean;
  appId: boolean;
  appSecret: boolean;
  systemUserToken: boolean;
  facebookPageId: boolean;
}

// ===========================================
// HELPERS
// ===========================================

const contentTypeLabels: Record<string, string> = {
  gallery_photo: "Foto de Galería",
  spotify_track: "Lanzamiento",
  artist_profile: "Perfil de Artista",
};

const contentTypeIcons: Record<string, typeof ImageIcon> = {
  gallery_photo: ImageIcon,
  spotify_track: Music,
  artist_profile: Users,
};

const platformLabels: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  posted: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
  skipped: "bg-gray-500/20 text-gray-400",
};

const logStatusColors: Record<string, string> = {
  success: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
  rate_limited: "bg-orange-500/20 text-orange-400",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function truncate(str: string | null, max: number): string {
  if (!str) return "—";
  return str.length > max ? str.substring(0, max) + "..." : str;
}

// ===========================================
// COMPONENT
// ===========================================

export default function AdminSocialPage() {
  const [queueSummary, setQueueSummary] = useState<QueueSummary | null>(null);
  const [nextPending, setNextPending] = useState<QueueItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<PostLog[]>([]);
  const [metaStatus, setMetaStatus] = useState<MetaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [validating, setValidating] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"queue" | "history" | "config">("queue");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/social");
      const data = await res.json();
      if (data.success) {
        setQueueSummary(data.data.queue);
        setNextPending(data.data.nextPending || []);
        setRecentLogs(data.data.recentLogs || []);
        setMetaStatus(data.data.metaStatus);
      }
    } catch (error) {
      console.error("Error fetching social data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const processNext = async () => {
    setProcessing(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/admin/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process-next" }),
      });
      const data = await res.json();
      setLastResult(data.message || (data.success ? "Posted!" : "Failed"));
      fetchData();
    } catch (error) {
      setLastResult("Error processing next item");
    } finally {
      setProcessing(false);
    }
  };

  const skipItem = async (queueId: string) => {
    try {
      await fetch("/api/admin/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip-item", queueId }),
      });
      fetchData();
    } catch (error) {
      console.error("Error skipping item:", error);
    }
  };

  const resetCycle = async () => {
    if (!confirm("Reset all posted items to pending for a new cycle?")) return;
    try {
      const res = await fetch("/api/admin/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-cycle" }),
      });
      const data = await res.json();
      setLastResult(data.message);
      fetchData();
    } catch (error) {
      setLastResult("Error resetting cycle");
    }
  };

  const retryFailed = async () => {
    if (!confirm("Retry all failed items?")) return;
    try {
      const res = await fetch("/api/admin/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry-failed" }),
      });
      const data = await res.json();
      setLastResult(data.message);
      fetchData();
    } catch (error) {
      setLastResult("Error retrying failed items");
    }
  };

  const validateToken = async () => {
    setValidating(true);
    try {
      const res = await fetch("/api/admin/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate-token" }),
      });
      const data = await res.json();
      setTokenInfo(data.data);
    } catch (error) {
      setTokenInfo({ isValid: false, error: "Validation failed" });
    } finally {
      setValidating(false);
    }
  };

  // ===========================================
  // RENDER
  // ===========================================

  if (loading && !queueSummary) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase flex items-center gap-3">
            <Share2 className="w-8 h-8 text-primary" />
            Social Auto-Post
          </h1>
          <p className="text-slc-muted mt-1">
            Publicación automática a Facebook e Instagram — 3x al día
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          <Button
            onClick={processNext}
            disabled={processing || !metaStatus?.configured}
          >
            {processing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Publicar Siguiente
          </Button>
        </div>
      </div>

      {/* Last Result Banner */}
      {lastResult && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-300 flex-1">{lastResult}</div>
          <button
            onClick={() => setLastResult(null)}
            className="text-blue-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Meta Config Warning */}
      {metaStatus && !metaStatus.configured && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-red-300 font-medium">Meta API no configurada</p>
            <p className="text-red-300/70 mt-1">
              Configura las variables de entorno: META_APP_ID, META_APP_SECRET,
              META_SYSTEM_USER_TOKEN, FACEBOOK_PAGE_ID
            </p>
          </div>
        </div>
      )}

      {/* Queue Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <StatCard
          label="Total"
          value={queueSummary?.total || 0}
          icon={<Share2 className="w-4 h-4" />}
          color="text-white"
        />
        <StatCard
          label="Pendientes"
          value={queueSummary?.pending || 0}
          icon={<Clock className="w-4 h-4" />}
          color="text-yellow-400"
        />
        <StatCard
          label="Publicados"
          value={queueSummary?.posted || 0}
          icon={<CheckCircle2 className="w-4 h-4" />}
          color="text-green-400"
        />
        <StatCard
          label="Fallidos"
          value={queueSummary?.failed || 0}
          icon={<XCircle className="w-4 h-4" />}
          color="text-red-400"
        />
        <StatCard
          label="Ciclo Actual"
          value={queueSummary?.currentCycle || 0}
          icon={<RotateCcw className="w-4 h-4" />}
          color="text-blue-400"
        />
        <StatCard
          label="Fotos / Tracks / Artistas"
          value={`${queueSummary?.byContentType?.gallery_photo || 0} / ${queueSummary?.byContentType?.spotify_track || 0} / ${queueSummary?.byContentType?.artist_profile || 0}`}
          icon={<ImageIcon className="w-4 h-4" />}
          color="text-purple-400"
          small
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button variant="outline" size="sm" onClick={retryFailed} disabled={!queueSummary?.failed}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar Fallidos ({queueSummary?.failed || 0})
        </Button>
        <Button variant="outline" size="sm" onClick={resetCycle}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reiniciar Ciclo
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slc-border">
        {(["queue", "history", "config"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-slc-muted hover:text-white"
            }`}
          >
            {tab === "queue" && "Cola Pendiente"}
            {tab === "history" && "Historial"}
            {tab === "config" && "Configuración"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "queue" && (
        <div className="space-y-3">
          {nextPending.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">Cola vacía</h3>
              <p className="text-slc-muted mb-4">
                Todos los items han sido publicados o la cola está vacía.
              </p>
              <Button variant="outline" onClick={resetCycle}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reiniciar Ciclo
              </Button>
            </div>
          ) : (
            nextPending.map((item, index) => {
              const IconComp = contentTypeIcons[item.contentType] || ImageIcon;
              const platforms: string[] = JSON.parse(item.platforms || "[]");
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-4 bg-slc-card border border-slc-border rounded-lg hover:border-primary/30 transition-colors"
                >
                  {/* Order indicator */}
                  <div className="text-lg font-oswald text-slc-muted w-8 text-center">
                    #{item.queueOrder}
                  </div>

                  {/* Thumbnail */}
                  <div className="w-16 h-16 relative rounded-lg overflow-hidden flex-shrink-0 bg-slc-dark">
                    <Image
                      src={item.imageUrl}
                      alt={truncate(item.caption, 50)}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <IconComp className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">
                        {contentTypeLabels[item.contentType] || item.contentType}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[item.status]}`}>
                        {item.status}
                      </span>
                      <span className="text-xs text-slc-muted">Ciclo {item.cycleNumber}</span>
                    </div>
                    <p className="text-sm text-slc-muted truncate">
                      {truncate(item.caption, 120)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {platforms.map((p) => (
                        <span key={p} className="flex items-center gap-1 text-xs text-slc-muted">
                          {p === "facebook" ? <Facebook className="w-3 h-3" /> : <Instagram className="w-3 h-3" />}
                          {platformLabels[p]}
                        </span>
                      ))}
                      {item.linkUrl && (
                        <a
                          href={item.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Ver
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {index === 0 && (
                      <Button size="sm" onClick={processNext} disabled={processing}>
                        <Play className="w-3 h-3 mr-1" />
                        Publicar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => skipItem(item.id)}
                      title="Saltar"
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-2">
          {recentLogs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-16 h-16 text-slc-muted mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">Sin historial</h3>
              <p className="text-slc-muted">Aún no se han realizado publicaciones.</p>
            </div>
          ) : (
            recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-4 p-3 bg-slc-card border border-slc-border rounded-lg"
              >
                {/* Platform icon */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slc-dark">
                  {log.platform === "facebook" ? (
                    <Facebook className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Instagram className="w-4 h-4 text-pink-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium">
                      {contentTypeLabels[log.contentType]}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${logStatusColors[log.status]}`}>
                      {log.status}
                    </span>
                  </div>
                  <p className="text-xs text-slc-muted truncate">
                    {truncate(log.caption, 100)}
                  </p>
                  {log.errorMessage && (
                    <p className="text-xs text-red-400 truncate mt-0.5">{log.errorMessage}</p>
                  )}
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-4 text-xs text-slc-muted">
                  {log.likes > 0 && <span>❤ {log.likes}</span>}
                  {log.comments > 0 && <span>💬 {log.comments}</span>}
                  {log.shares > 0 && <span>🔄 {log.shares}</span>}
                </div>

                {/* Link */}
                {log.platformPostUrl && (
                  <a
                    href={log.platformPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                {/* Timestamp */}
                <div className="text-xs text-slc-muted w-32 text-right">
                  {formatDate(log.postedAt)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "config" && (
        <div className="space-y-6">
          {/* Meta API Configuration */}
          <div className="bg-slc-card border border-slc-border rounded-xl p-6">
            <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Meta API Configuration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ConfigItem
                label="META_APP_ID"
                configured={metaStatus?.appId || false}
              />
              <ConfigItem
                label="META_APP_SECRET"
                configured={metaStatus?.appSecret || false}
              />
              <ConfigItem
                label="META_SYSTEM_USER_TOKEN"
                configured={metaStatus?.systemUserToken || false}
              />
              <ConfigItem
                label="FACEBOOK_PAGE_ID"
                configured={metaStatus?.facebookPageId || false}
                value="163429477044436"
              />
            </div>

            {/* Token Validation */}
            <div className="mt-6 pt-4 border-t border-slc-border">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={validateToken}
                  disabled={validating || !metaStatus?.configured}
                >
                  {validating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  Validar Token
                </Button>
                {tokenInfo && (
                  <div className="flex items-center gap-2 text-sm">
                    {tokenInfo.isValid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Token válido</span>
                        <span className="text-slc-muted">
                          — Scopes: {tokenInfo.scopes?.join(", ") || "none"}
                        </span>
                        <span className="text-slc-muted">
                          — Tipo: {tokenInfo.type || "unknown"}
                        </span>
                        <span className="text-slc-muted">
                          — Expira: {tokenInfo.expiresAt ? formatDate(tokenInfo.expiresAt) : "Nunca"}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400">Token inválido</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Schedule Info */}
          <div className="bg-slc-card border border-slc-border rounded-xl p-6">
            <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Horario de Publicación
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ScheduleCard time="4:00 AM" label="Mañana temprano" tz="CDMX" />
              <ScheduleCard time="10:00 AM" label="Media mañana" tz="CDMX" />
              <ScheduleCard time="3:00 PM" label="Tarde" tz="CDMX" />
            </div>
            <p className="text-sm text-slc-muted mt-4">
              La función programada publica 1 item por ejecución. Con 3 ejecuciones/día,
              se publican 3 items/día (6 posts totales: 3 FB + 3 IG).
            </p>
          </div>

          {/* Queue Population */}
          <div className="bg-slc-card border border-slc-border rounded-xl p-6">
            <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-primary" />
              Poblar Cola
            </h2>
            <p className="text-sm text-slc-muted mb-4">
              Para llenar la cola con fotos de galería, lanzamientos y perfiles de artistas existentes,
              ejecuta el script de población desde tu terminal:
            </p>
            <code className="block bg-slc-dark p-3 rounded-lg text-sm text-primary font-mono">
              npx tsx scripts/populate-social-queue.ts
            </code>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================
// SUB-COMPONENTS
// ===========================================

function StatCard({
  label,
  value,
  icon,
  color,
  small,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  small?: boolean;
}) {
  return (
    <div className="bg-slc-card border border-slc-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-xs text-slc-muted">{label}</span>
      </div>
      <div className={`font-oswald ${small ? "text-lg" : "text-2xl"} ${color}`}>{value}</div>
    </div>
  );
}

function ConfigItem({
  label,
  configured,
  value,
}: {
  label: string;
  configured: boolean;
  value?: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-slc-dark rounded-lg">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {value && <p className="text-xs text-slc-muted">{value}</p>}
      </div>
      {configured ? (
        <CheckCircle2 className="w-5 h-5 text-green-400" />
      ) : (
        <XCircle className="w-5 h-5 text-red-400" />
      )}
    </div>
  );
}

function ScheduleCard({ time, label, tz }: { time: string; label: string; tz: string }) {
  return (
    <div className="bg-slc-dark rounded-lg p-4 text-center">
      <p className="font-oswald text-2xl text-primary">{time}</p>
      <p className="text-sm text-slc-muted">{label}</p>
      <p className="text-xs text-slc-muted">({tz})</p>
    </div>
  );
}
