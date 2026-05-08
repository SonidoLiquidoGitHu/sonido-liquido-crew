"use client";

import { useState, useEffect, useCallback } from "react";
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
  Disc3,
  Database,
  Trash2,
  Save,
  Eye,
  EyeOff,
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
  contentType: "gallery_photo" | "spotify_track" | "artist_profile" | "curated_track";
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
  platform: "facebook" | "instagram" | "tiktok";
  contentType: "gallery_photo" | "spotify_track" | "artist_profile" | "curated_track";
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

interface TikTokStatus {
  configured: boolean;
  clientKey: boolean;
  clientSecret: boolean;
  accessToken: boolean;
}

interface ContentCounts {
  galleryPhotos: number;
  releases: number;
  artists: number;
  curatedTracks: number;
}

interface CredentialInfo {
  maskedValue: string;
  hasValue: boolean;
  source: "db" | "env" | "none";
}

// ===========================================
// HELPERS
// ===========================================

// ===========================================
// IMAGE URL HELPER
// ===========================================

/**
 * Route image URLs through the image proxy for mobile compatibility.
 * Dropbox URLs return content-type: application/json which mobile Safari rejects.
 * The proxy re-serves images with the correct MIME type.
 */
function getProxiedImageUrl(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    // Route Dropbox and other problematic hosts through the proxy
    const needsProxy = [
      "dl.dropboxusercontent.com",
      "dropboxusercontent.com",
      "www.dropbox.com",
      "dropbox.com",
      "ucarecdn.com",
    ].some(
      (host) =>
        parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
    );
    if (needsProxy) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    // Spotify CDN, YouTube, etc. work fine directly
    return url;
  } catch {
    return url;
  }
}

const contentTypeLabels: Record<string, string> = {
  gallery_photo: "Foto de Galería",
  spotify_track: "Lanzamiento",
  artist_profile: "Perfil de Artista",
  curated_track: "Track Curado",
};

const contentTypeIcons: Record<string, typeof ImageIcon> = {
  gallery_photo: ImageIcon,
  spotify_track: Music,
  artist_profile: Users,
  curated_track: Disc3,
};

const platformLabels: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
};

const platformIcons: Record<string, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Music, // Using Music icon as TikTok placeholder
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
  const [tiktokStatus, setTikTokStatus] = useState<TikTokStatus | null>(null);
  const [contentCounts, setContentCounts] = useState<ContentCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [populating, setPopulating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validatingTikTok, setValidatingTikTok] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [tiktokTokenInfo, setTikTokTokenInfo] = useState<any>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"queue" | "history" | "config">("queue");

  // Credentials state
  const [credentialInfo, setCredentialInfo] = useState<Record<string, CredentialInfo> | null>(null);
  const [credentialEdits, setCredentialEdits] = useState<Record<string, string>>({});
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [showCredentialValues, setShowCredentialValues] = useState<Record<string, boolean>>({});
  const [credentialSaveResult, setCredentialSaveResult] = useState<string | null>(null);

  // Populate options
  const [populateOptions, setPopulateOptions] = useState({
    includeGallery: true,
    includeReleases: true,
    includeArtists: true,
    includeCuratedTracks: true,
    platforms: ["facebook", "instagram", "tiktok"],
  });

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
        setTikTokStatus(data.data.tiktokStatus);
        setContentCounts(data.data.contentCounts);
      }
    } catch (error) {
      console.error("Error fetching social data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check for TikTok OAuth callback params in URL
  const [tiktokOAuthResult, setTiktokOAuthResult] = useState<{
    success: boolean;
    accessToken?: string;
    refreshToken?: string;
    openId?: string;
    error?: string;
  } | null>(null);

  useEffect(() => {
    fetchData();

    // Check URL for TikTok OAuth callback results
    const params = new URLSearchParams(window.location.search);
    if (params.get("tiktok_success") === "true") {
      setTiktokOAuthResult({
        success: true,
        accessToken: params.get("tiktok_access_token") || undefined,
        refreshToken: params.get("tiktok_refresh_token") || undefined,
        openId: params.get("tiktok_open_id") || undefined,
      });
      // Clean URL params
      window.history.replaceState({}, "", "/admin/social");
    } else if (params.get("tiktok_error")) {
      setTiktokOAuthResult({
        success: false,
        error: params.get("tiktok_error") || "Unknown error",
      });
      window.history.replaceState({}, "", "/admin/social");
    }
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

  const populateQueue = async () => {
    setPopulating(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/admin/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "populate",
          options: {
            includeGallery: populateOptions.includeGallery,
            includeReleases: populateOptions.includeReleases,
            includeArtists: populateOptions.includeArtists,
            includeCuratedTracks: populateOptions.includeCuratedTracks,
            platforms: populateOptions.platforms,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLastResult(`${data.message} — ${JSON.stringify(data.details)}`);
      } else {
        setLastResult(`Error: ${data.message || data.error}`);
      }
      fetchData();
    } catch (error) {
      setLastResult("Error populating queue");
    } finally {
      setPopulating(false);
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
    if (!confirm("Reiniciar todos los items publicados a pendientes para un nuevo ciclo?")) return;
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
    if (!confirm("Reintentar todos los items fallidos?")) return;
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

  const clearQueue = async () => {
    if (!confirm("Eliminar todos los items pendientes de la cola? Esta accion no se puede deshacer.")) return;
    try {
      const res = await fetch("/api/admin/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-queue" }),
      });
      const data = await res.json();
      setLastResult(data.message);
      fetchData();
    } catch (error) {
      setLastResult("Error clearing queue");
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

  const validateTikTokToken = async () => {
    setValidatingTikTok(true);
    try {
      const res = await fetch("/api/admin/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validate-tiktok" }),
      });
      const data = await res.json();
      setTikTokTokenInfo(data.data);
    } catch (error) {
      setTikTokTokenInfo({ isValid: false, error: "Validation failed" });
    } finally {
      setValidatingTikTok(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setPopulateOptions((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  // Fetch credentials from the API
  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/social/credentials");
      const data = await res.json();
      if (data.success) {
        setCredentialInfo(data.data.credentials);
      }
    } catch (error) {
      console.error("Error fetching credentials:", error);
    }
  }, []);

  // Save credentials to the API
  const saveCredentials = async () => {
    setSavingCredentials(true);
    setCredentialSaveResult(null);
    try {
      // Only send credentials that have been edited with non-empty values
      const changedCredentials: Record<string, string> = {};
      for (const [key, value] of Object.entries(credentialEdits)) {
        if (value !== undefined && value !== "" && value !== "__CANCEL__") {
          changedCredentials[key] = value;
        }
      }

      if (Object.keys(changedCredentials).length === 0) {
        setCredentialSaveResult("No hay cambios para guardar.");
        setSavingCredentials(false);
        return;
      }

      const res = await fetch("/api/admin/social/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentials: changedCredentials }),
      });
      const data = await res.json();
      if (data.success) {
        setCredentialSaveResult(data.message);
        setCredentialEdits({});
        // Refresh credential info
        await fetchCredentials();
        // Also refresh the main social data (config status may have changed)
        fetchData();
      } else {
        setCredentialSaveResult(`Error: ${data.error}`);
      }
    } catch (error) {
      setCredentialSaveResult("Error al guardar credenciales");
    } finally {
      setSavingCredentials(false);
    }
  };

  // Load credentials when config tab is opened
  useEffect(() => {
    if (activeTab === "config" && !credentialInfo) {
      fetchCredentials();
    }
  }, [activeTab, credentialInfo, fetchCredentials]);

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
            Publicación automática a Facebook, Instagram y TikTok — 3x al día
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

      {/* TikTok OAuth Result Banner */}
      {tiktokOAuthResult && (
        <div className={`mb-6 p-4 rounded-lg border ${tiktokOAuthResult.success ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
          <div className="flex items-start gap-3">
            {tiktokOAuthResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 text-sm">
              {tiktokOAuthResult.success ? (
                <>
                  <p className="text-green-300 font-medium">TikTok conectado exitosamente</p>
                  <p className="text-green-300/70 mt-1">
                    Para completar la configuración, agrega estas variables de entorno en Netlify:
                  </p>
                  <div className="mt-3 space-y-2">
                    <div className="bg-slc-dark p-2 rounded font-mono text-xs">
                      <span className="text-slc-muted">TIKTOK_ACCESS_TOKEN=</span>
                      <span className="text-primary break-all">{tiktokOAuthResult.accessToken}</span>
                    </div>
                    {tiktokOAuthResult.refreshToken && (
                      <div className="bg-slc-dark p-2 rounded font-mono text-xs">
                        <span className="text-slc-muted">TIKTOK_REFRESH_TOKEN=</span>
                        <span className="text-primary break-all">{tiktokOAuthResult.refreshToken}</span>
                      </div>
                    )}
                    {tiktokOAuthResult.openId && (
                      <div className="bg-slc-dark p-2 rounded font-mono text-xs">
                        <span className="text-slc-muted">TIKTOK_OPEN_ID=</span>
                        <span className="text-primary">{tiktokOAuthResult.openId}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-green-300/70 mt-2">
                    Copia estos valores a las variables de entorno de Netlify y redeployea el sitio.
                  </p>
                </>
              ) : (
                <p className="text-red-300">Error al conectar TikTok: {tiktokOAuthResult.error}</p>
              )}
            </div>
            <button
              onClick={() => setTiktokOAuthResult(null)}
              className="text-slc-muted hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Meta Config Warning */}
      {metaStatus && !metaStatus.configured && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-red-300 font-medium">Meta API no configurada</p>
            <p className="text-red-300/70 mt-1">
              Agrega tus credenciales en la seccion &quot;Credenciales&quot; abajo, o configura las variables de entorno en Netlify:
              META_SYSTEM_USER_TOKEN, FACEBOOK_PAGE_ID
            </p>
          </div>
        </div>
      )}

      {/* Queue Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
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
          label="Ciclo"
          value={queueSummary?.currentCycle || 0}
          icon={<RotateCcw className="w-4 h-4" />}
          color="text-blue-400"
        />
        <StatCard
          label="Fotos"
          value={queueSummary?.byContentType?.gallery_photo || 0}
          icon={<ImageIcon className="w-4 h-4" />}
          color="text-purple-400"
        />
        <StatCard
          label="Tracks / Artistas / Curados"
          value={`${queueSummary?.byContentType?.spotify_track || 0} / ${queueSummary?.byContentType?.artist_profile || 0} / ${queueSummary?.byContentType?.curated_track || 0}`}
          icon={<Disc3 className="w-4 h-4" />}
          color="text-cyan-400"
          small
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Button
          onClick={populateQueue}
          disabled={populating}
          className="bg-green-600 hover:bg-green-700"
        >
          {populating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Database className="w-4 h-4 mr-2" />
          )}
          Poblar Cola
        </Button>
        <Button variant="outline" size="sm" onClick={retryFailed} disabled={!queueSummary?.failed}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar Fallidos ({queueSummary?.failed || 0})
        </Button>
        <Button variant="outline" size="sm" onClick={resetCycle}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reiniciar Ciclo
        </Button>
        <Button variant="outline" size="sm" onClick={clearQueue} className="text-red-400 hover:text-red-300">
          <Trash2 className="w-4 h-4 mr-2" />
          Limpiar Pendientes
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
                Haz clic en &quot;Poblar Cola&quot; para agregar contenido.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={resetCycle}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reiniciar Ciclo
                </Button>
                <Button onClick={populateQueue} className="bg-green-600 hover:bg-green-700">
                  <Database className="w-4 h-4 mr-2" />
                  Poblar Cola
                </Button>
              </div>
            </div>
          ) : (
            nextPending.map((item, index) => {
              const IconComp = contentTypeIcons[item.contentType] || ImageIcon;
              const platforms: string[] = JSON.parse(item.platforms || "[]");
              return (
                <div
                  key={item.id}
                  className="flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-slc-card border border-slc-border rounded-lg hover:border-primary/30 transition-colors"
                >
                  {/* Order indicator */}
                  <div className="text-lg font-oswald text-slc-muted w-6 sm:w-8 text-center flex-shrink-0">
                    #{item.queueOrder}
                  </div>

                  {/* Thumbnail */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 relative rounded-lg overflow-hidden flex-shrink-0 bg-slc-dark">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getProxiedImageUrl(item.imageUrl)}
                      alt={truncate(item.caption, 50)}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // Fallback: try original URL if proxy fails
                        const img = e.currentTarget;
                        if (!img.dataset.retried) {
                          img.dataset.retried = 'true';
                          img.src = item.imageUrl;
                        }
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                      <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                      <span className="text-xs sm:text-sm font-medium">
                        {contentTypeLabels[item.contentType] || item.contentType}
                      </span>
                      <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${statusColors[item.status]}`}>
                        {item.status}
                      </span>
                      <span className="text-[10px] sm:text-xs text-slc-muted">Ciclo {item.cycleNumber}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slc-muted truncate">
                      {truncate(item.caption, 80)}
                    </p>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                      {platforms.map((p) => {
                        const PIcon = platformIcons[p] || Music;
                        return (
                          <span key={p} className="flex items-center gap-1 text-xs text-slc-muted">
                            <PIcon className="w-3 h-3" />
                            {platformLabels[p]}
                          </span>
                        );
                      })}
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
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {index === 0 && (
                      <Button size="sm" onClick={processNext} disabled={processing} className="hidden sm:inline-flex">
                        <Play className="w-3 h-3 mr-1" />
                        Publicar
                      </Button>
                    )}
                    {index === 0 && (
                      <Button size="sm" onClick={processNext} disabled={processing} className="sm:hidden">
                        <Play className="w-3 h-3" />
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
                className="flex items-start sm:items-center gap-3 p-3 bg-slc-card border border-slc-border rounded-lg"
              >
                {/* Platform icon */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slc-dark flex-shrink-0">
                  {log.platform === "facebook" ? (
                    <Facebook className="w-4 h-4 text-blue-400" />
                  ) : log.platform === "instagram" ? (
                    <Instagram className="w-4 h-4 text-pink-400" />
                  ) : (
                    <Music className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-medium">
                      {contentTypeLabels[log.contentType] || log.contentType}
                    </span>
                    <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${logStatusColors[log.status]}`}>
                      {log.status}
                    </span>
                    <span className="text-[10px] sm:text-xs text-slc-muted">
                      {platformLabels[log.platform] || log.platform}
                    </span>
                  </div>
                  <p className="text-xs text-slc-muted truncate">
                    {truncate(log.caption, 80)}
                  </p>
                  {log.errorMessage && (
                    <p className="text-xs text-red-400 truncate mt-0.5">{log.errorMessage}</p>
                  )}
                </div>

                {/* Metrics - hide on very small screens */}
                <div className="hidden sm:flex items-center gap-4 text-xs text-slc-muted">
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
          {/* Populate Queue Section — NEW */}
          <div className="bg-slc-card border border-slc-border rounded-xl p-6">
            <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Poblar Cola
            </h2>
            <p className="text-sm text-slc-muted mb-4">
              Selecciona el contenido que quieres agregar a la cola de publicación.
              Solo se agregarán items nuevos (no duplicados).
            </p>

            {/* Content Sources */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <label className="flex items-center gap-2 p-3 bg-slc-dark rounded-lg cursor-pointer hover:bg-slc-dark/80 transition-colors">
                <input
                  type="checkbox"
                  checked={populateOptions.includeGallery}
                  onChange={(e) => setPopulateOptions((prev) => ({ ...prev, includeGallery: e.target.checked }))}
                  className="rounded border-slc-border"
                />
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <div>
                  <p className="text-sm font-medium">Galería</p>
                  <p className="text-xs text-slc-muted">{contentCounts?.galleryPhotos || 0} fotos</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 bg-slc-dark rounded-lg cursor-pointer hover:bg-slc-dark/80 transition-colors">
                <input
                  type="checkbox"
                  checked={populateOptions.includeReleases}
                  onChange={(e) => setPopulateOptions((prev) => ({ ...prev, includeReleases: e.target.checked }))}
                  className="rounded border-slc-border"
                />
                <Music className="w-4 h-4 text-green-400" />
                <div>
                  <p className="text-sm font-medium">Lanzamientos</p>
                  <p className="text-xs text-slc-muted">{contentCounts?.releases || 0} releases</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 bg-slc-dark rounded-lg cursor-pointer hover:bg-slc-dark/80 transition-colors">
                <input
                  type="checkbox"
                  checked={populateOptions.includeArtists}
                  onChange={(e) => setPopulateOptions((prev) => ({ ...prev, includeArtists: e.target.checked }))}
                  className="rounded border-slc-border"
                />
                <Users className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-sm font-medium">Artistas</p>
                  <p className="text-xs text-slc-muted">{contentCounts?.artists || 0} perfiles</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 bg-slc-dark rounded-lg cursor-pointer hover:bg-slc-dark/80 transition-colors">
                <input
                  type="checkbox"
                  checked={populateOptions.includeCuratedTracks}
                  onChange={(e) => setPopulateOptions((prev) => ({ ...prev, includeCuratedTracks: e.target.checked }))}
                  className="rounded border-slc-border"
                />
                <Disc3 className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-sm font-medium">Tracks Curados</p>
                  <p className="text-xs text-slc-muted">{contentCounts?.curatedTracks || 0} tracks</p>
                </div>
              </label>
            </div>

            {/* Platform Selection */}
            <div className="mb-4">
              <p className="text-sm text-slc-muted mb-2">Plataformas destino:</p>
              <div className="flex gap-3">
                {(["facebook", "instagram", "tiktok"] as const).map((platform) => (
                  <label
                    key={platform}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      populateOptions.platforms.includes(platform)
                        ? "bg-primary/20 border border-primary/50"
                        : "bg-slc-dark border border-slc-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={populateOptions.platforms.includes(platform)}
                      onChange={() => togglePlatform(platform)}
                      className="rounded border-slc-border"
                    />
                    {platform === "facebook" ? (
                      <Facebook className="w-4 h-4 text-blue-400" />
                    ) : platform === "instagram" ? (
                      <Instagram className="w-4 h-4 text-pink-400" />
                    ) : (
                      <Music className="w-4 h-4 text-white" />
                    )}
                    <span className="text-sm">{platformLabels[platform]}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              onClick={populateQueue}
              disabled={populating || populateOptions.platforms.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {populating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Database className="w-4 h-4 mr-2" />
              )}
              Poblar Cola Ahora
            </Button>
          </div>

          {/* Meta API Configuration */}
          <div className="bg-slc-card border border-slc-border rounded-xl p-6">
            <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Meta API (Facebook + Instagram)
            </h2>
            <p className="text-sm text-slc-muted mb-4">
              Ingresa las credenciales de Meta para publicar en Facebook e Instagram.
              Los valores guardados aquí tienen prioridad sobre las variables de entorno de Netlify.
            </p>
            <div className="space-y-3">
              <CredentialInput
                label="META_APP_ID"
                info={credentialInfo?.META_APP_ID}
                editValue={credentialEdits.META_APP_ID}
                onEdit={(val) => {
                  if (val === "__CANCEL__") {
                    const { META_APP_ID, ...rest } = credentialEdits;
                    setCredentialEdits(rest);
                  } else {
                    setCredentialEdits((prev) => ({ ...prev, META_APP_ID: val }));
                  }
                }}
                showValue={showCredentialValues.META_APP_ID}
                onToggleShow={() => setShowCredentialValues((prev) => ({ ...prev, META_APP_ID: !prev.META_APP_ID }))}
              />
              <CredentialInput
                label="META_APP_SECRET"
                info={credentialInfo?.META_APP_SECRET}
                editValue={credentialEdits.META_APP_SECRET}
                onEdit={(val) => {
                  if (val === "__CANCEL__") {
                    const { META_APP_SECRET, ...rest } = credentialEdits;
                    setCredentialEdits(rest);
                  } else {
                    setCredentialEdits((prev) => ({ ...prev, META_APP_SECRET: val }));
                  }
                }}
                showValue={showCredentialValues.META_APP_SECRET}
                onToggleShow={() => setShowCredentialValues((prev) => ({ ...prev, META_APP_SECRET: !prev.META_APP_SECRET }))}
              />
              <CredentialInput
                label="META_SYSTEM_USER_TOKEN"
                info={credentialInfo?.META_SYSTEM_USER_TOKEN}
                editValue={credentialEdits.META_SYSTEM_USER_TOKEN}
                onEdit={(val) => {
                  if (val === "__CANCEL__") {
                    const { META_SYSTEM_USER_TOKEN, ...rest } = credentialEdits;
                    setCredentialEdits(rest);
                  } else {
                    setCredentialEdits((prev) => ({ ...prev, META_SYSTEM_USER_TOKEN: val }));
                  }
                }}
                showValue={showCredentialValues.META_SYSTEM_USER_TOKEN}
                onToggleShow={() => setShowCredentialValues((prev) => ({ ...prev, META_SYSTEM_USER_TOKEN: !prev.META_SYSTEM_USER_TOKEN }))}
              />
              <CredentialInput
                label="FACEBOOK_PAGE_ID"
                info={credentialInfo?.FACEBOOK_PAGE_ID}
                editValue={credentialEdits.FACEBOOK_PAGE_ID}
                onEdit={(val) => {
                  if (val === "__CANCEL__") {
                    const { FACEBOOK_PAGE_ID, ...rest } = credentialEdits;
                    setCredentialEdits(rest);
                  } else {
                    setCredentialEdits((prev) => ({ ...prev, FACEBOOK_PAGE_ID: val }));
                  }
                }}
                showValue={showCredentialValues.FACEBOOK_PAGE_ID}
                onToggleShow={() => setShowCredentialValues((prev) => ({ ...prev, FACEBOOK_PAGE_ID: !prev.FACEBOOK_PAGE_ID }))}
                placeholder="163429477044436"
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
                  Validar Token Meta
                </Button>
                {tokenInfo && (
                  <div className="flex items-center gap-2 text-sm">
                    {tokenInfo.isValid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Token valido</span>
                        <span className="text-slc-muted">
                          — FB Page: {tokenInfo.pageAccessible ? "✓" : "✗"} | IG: {tokenInfo.igAccountAccessible ? "✓" : "✗"}
                        </span>
                        <span className="text-slc-muted">
                          — Expira: {tokenInfo.expiresAt ? formatDate(tokenInfo.expiresAt) : "Nunca"}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400">Token invalido</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TikTok Configuration */}
          <div className="bg-slc-card border border-slc-border rounded-xl p-6">
            <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
              <Music className="w-5 h-5 text-white" />
              TikTok
            </h2>
            <p className="text-sm text-slc-muted mb-4">
              Ingresa las credenciales de TikTok para publicar automaticamente.
              Los valores guardados aqui tienen prioridad sobre las variables de entorno de Netlify.
            </p>
            {tiktokStatus && !tiktokStatus.configured && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-300">
                <p className="font-medium">TikTok no configurado aun</p>
                <p className="text-yellow-300/70 mt-1">
                  Para publicar en TikTok automaticamente, necesitas:
                </p>
                <ol className="text-yellow-300/70 mt-1 list-decimal list-inside space-y-1">
                  <li>Crear una app en developers.tiktok.com</li>
                  <li>Solicitar acceso al Content Posting API (Direct Post)</li>
                  <li>Obtener client_key y client_secret</li>
                  <li>Ingresar las credenciales abajo y luego conectar tu cuenta</li>
                </ol>
              </div>
            )}
            <div className="space-y-3">
              <CredentialInput
                label="TIKTOK_CLIENT_KEY"
                info={credentialInfo?.TIKTOK_CLIENT_KEY}
                editValue={credentialEdits.TIKTOK_CLIENT_KEY}
                onEdit={(val) => {
                  if (val === "__CANCEL__") {
                    const { TIKTOK_CLIENT_KEY, ...rest } = credentialEdits;
                    setCredentialEdits(rest);
                  } else {
                    setCredentialEdits((prev) => ({ ...prev, TIKTOK_CLIENT_KEY: val }));
                  }
                }}
                showValue={showCredentialValues.TIKTOK_CLIENT_KEY}
                onToggleShow={() => setShowCredentialValues((prev) => ({ ...prev, TIKTOK_CLIENT_KEY: !prev.TIKTOK_CLIENT_KEY }))}
              />
              <CredentialInput
                label="TIKTOK_CLIENT_SECRET"
                info={credentialInfo?.TIKTOK_CLIENT_SECRET}
                editValue={credentialEdits.TIKTOK_CLIENT_SECRET}
                onEdit={(val) => {
                  if (val === "__CANCEL__") {
                    const { TIKTOK_CLIENT_SECRET, ...rest } = credentialEdits;
                    setCredentialEdits(rest);
                  } else {
                    setCredentialEdits((prev) => ({ ...prev, TIKTOK_CLIENT_SECRET: val }));
                  }
                }}
                showValue={showCredentialValues.TIKTOK_CLIENT_SECRET}
                onToggleShow={() => setShowCredentialValues((prev) => ({ ...prev, TIKTOK_CLIENT_SECRET: !prev.TIKTOK_CLIENT_SECRET }))}
              />
              <CredentialInput
                label="TIKTOK_ACCESS_TOKEN"
                info={credentialInfo?.TIKTOK_ACCESS_TOKEN}
                editValue={credentialEdits.TIKTOK_ACCESS_TOKEN}
                onEdit={(val) => {
                  if (val === "__CANCEL__") {
                    const { TIKTOK_ACCESS_TOKEN, ...rest } = credentialEdits;
                    setCredentialEdits(rest);
                  } else {
                    setCredentialEdits((prev) => ({ ...prev, TIKTOK_ACCESS_TOKEN: val }));
                  }
                }}
                showValue={showCredentialValues.TIKTOK_ACCESS_TOKEN}
                onToggleShow={() => setShowCredentialValues((prev) => ({ ...prev, TIKTOK_ACCESS_TOKEN: !prev.TIKTOK_ACCESS_TOKEN }))}
              />
            </div>

            {/* TikTok OAuth Connect */}
            <div className="mt-6 pt-4 border-t border-slc-border space-y-4">
              {/* Connect Button (shown when Client Key is set but no Access Token) */}
              {(tiktokStatus?.clientKey || credentialEdits.TIKTOK_CLIENT_KEY) && !tiktokStatus?.accessToken && !credentialEdits.TIKTOK_ACCESS_TOKEN && (
                <div>
                  <p className="text-sm text-slc-muted mb-3">
                    Conecta tu cuenta de TikTok para autorizar la publicacion automatica:
                  </p>
                  <a href="/api/auth/tiktok?returnUrl=/admin/social">
                    <Button className="bg-black hover:bg-gray-800 text-white">
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.88a8.28 8.28 0 0 0 4.76 1.5V6.93a4.84 4.84 0 0 1-1-.24z"/>
                      </svg>
                      Conectar con TikTok
                    </Button>
                  </a>
                </div>
              )}

              {/* Token Validation Button */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={validateTikTokToken}
                  disabled={validatingTikTok || !tiktokStatus?.configured}
                >
                  {validatingTikTok ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  Validar Token TikTok
                </Button>
                {tiktokTokenInfo && (
                  <div className="flex items-center gap-2 text-sm">
                    {tiktokTokenInfo.isValid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Token valido</span>
                        <span className="text-slc-muted">
                          — Open ID: {tiktokTokenInfo.openId || "N/A"}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400">Token invalido</span>
                        {tiktokTokenInfo.error && (
                          <span className="text-slc-muted">— {tiktokTokenInfo.error}</span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Setup Instructions (shown when Client Key not set) */}
              {!tiktokStatus?.clientKey && !credentialEdits.TIKTOK_CLIENT_KEY && (
                <div className="p-3 bg-slc-dark rounded-lg text-sm text-slc-muted">
                  <p className="font-medium text-white mb-2">Configuracion paso a paso:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Crea una app en <a href="https://developers.tiktok.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">developers.tiktok.com</a></li>
                    <li>Solicita acceso al <strong>Content Posting API (Direct Post)</strong></li>
                    <li>Agrega la Redirect URI: <code className="text-primary">https://sonidoliquido.com/api/auth/tiktok/callback</code></li>
                    <li>Copia el Client Key y Client Secret en los campos de arriba</li>
                    <li>Guarda los cambios y luego haz clic en &quot;Conectar con TikTok&quot;</li>
                  </ol>
                </div>
              )}
            </div>
          </div>

          {/* Save Credentials Button */}
          <div className="bg-slc-card border border-slc-border rounded-xl p-6">
            <div className="flex items-center gap-4">
              <Button
                onClick={saveCredentials}
                disabled={savingCredentials || Object.keys(credentialEdits).filter(k => credentialEdits[k] && credentialEdits[k] !== "__CANCEL__").length === 0}
                className="bg-primary hover:bg-primary/90"
              >
                {savingCredentials ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar Credenciales
              </Button>
              {credentialSaveResult && (
                <span className={`text-sm ${credentialSaveResult.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
                  {credentialSaveResult}
                </span>
              )}
              {Object.keys(credentialEdits).filter(k => credentialEdits[k] && credentialEdits[k] !== "__CANCEL__").length > 0 && (
                <span className="text-xs text-slc-muted">
                  {Object.keys(credentialEdits).filter(k => credentialEdits[k] && credentialEdits[k] !== "__CANCEL__").length} cambio(s) pendiente(s)
                </span>
              )}
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
              se publican 3 items/día. Cada item se publica en todas las plataformas configuradas
              (FB + IG + TikTok = hasta 9 posts/día).
            </p>
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

function CredentialInput({
  label,
  info,
  editValue,
  onEdit,
  showValue,
  onToggleShow,
  placeholder,
}: {
  label: string;
  info?: CredentialInfo;
  editValue?: string;
  onEdit: (value: string) => void;
  showValue?: boolean;
  onToggleShow: () => void;
  placeholder?: string;
}) {
  const hasValue = info?.hasValue || false;
  const source = info?.source || "none";
  const maskedValue = info?.maskedValue || "";
  const isEditing = editValue !== undefined;

  return (
    <div className="p-3 bg-slc-dark rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          {hasValue ? (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              source === "db"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-green-500/20 text-green-400"
            }`}>
              {source === "db" ? "DB" : "Env Var"}
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
              Sin configurar
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasValue && !isEditing && (
            <button
              onClick={onToggleShow}
              className="p-1 text-slc-muted hover:text-white transition-colors"
              title={showValue ? "Ocultar valor" : "Mostrar valor"}
            >
              {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          {!isEditing ? (
            <button
              onClick={() => onEdit("")}
              className="text-xs text-primary hover:underline"
            >
              {hasValue ? "Editar" : "Agregar"}
            </button>
          ) : (
            <button
              onClick={() => onEdit("__CANCEL__")}
              className="text-xs text-slc-muted hover:text-white"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Display current value (masked or shown) */}
      {hasValue && !isEditing && (
        <p className="text-xs font-mono text-slc-muted break-all">
          {showValue ? maskedValue : "••••••••••••"}
        </p>
      )}

      {/* Edit input */}
      {isEditing && (
        <input
          type={showValue ? "text" : "password"}
          value={editValue}
          onChange={(e) => onEdit(e.target.value)}
          placeholder={placeholder || (hasValue ? "Dejar vacio para mantener el valor actual" : `Ingresa ${label}`)}
          className="w-full mt-1 px-3 py-2 bg-slc-card border border-slc-border rounded text-sm text-white placeholder:text-slc-muted focus:outline-none focus:border-primary"
        />
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
