"use client";

import { Button } from "@/components/ui/button";
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  Disc3,
  ExternalLink,
  Eye,
  EyeOff,
  Facebook,
  Image as ImageIcon,
  Instagram,
  Key,
  Loader2,
  Music,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Share2,
  SkipForward,
  Trash2,
  Users,
  Video,
  XCircle,
  Youtube,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
  contentType:
    | "gallery_photo"
    | "spotify_track"
    | "artist_profile"
    | "curated_track"
    | "vertical_video"
    | "youtube_video"
    | "event";
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
  contentType:
    | "gallery_photo"
    | "spotify_track"
    | "artist_profile"
    | "curated_track"
    | "vertical_video"
    | "youtube_video"
    | "event";
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

interface ContentCounts {
  galleryPhotos: number;
  releases: number;
  artists: number;
  curatedTracks: number;
  verticalVideos: number;
  youtubeVideos: number;
  events: number;
}

interface ScheduleConfig {
  scheduleHours: number[];
  storyScheduleHours: number[];
  postsPerRun: number;
  maxPostsPerDay: number;
  maxStoriesPerDay: number;
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
        parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
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
  vertical_video: "Reel / Video",
  youtube_video: "Video YouTube",
  event: "Evento",
};

const contentTypeIcons: Record<string, typeof ImageIcon> = {
  gallery_photo: ImageIcon,
  spotify_track: Music,
  artist_profile: Users,
  curated_track: Disc3,
  vertical_video: Video,
  youtube_video: Youtube,
  event: Calendar,
};

const platformLabels: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  instagram_story: "IG Story",
  instagram_reel: "IG Reel",
  facebook_reel: "FB Reel",
};

const platformIcons: Record<string, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  instagram_story: Instagram,
  instagram_reel: Instagram,
  facebook_reel: Facebook,
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
  return str.length > max ? `${str.substring(0, max)}...` : str;
}

// ===========================================
// COMPONENT
// ===========================================

export default function AdminSocialPage() {
  const [queueSummary, setQueueSummary] = useState<QueueSummary | null>(null);
  const [nextPending, setNextPending] = useState<QueueItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<PostLog[]>([]);
  const [metaStatus, setMetaStatus] = useState<MetaStatus | null>(null);
  const [contentCounts, setContentCounts] = useState<ContentCounts | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [populating, setPopulating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "queue" | "history" | "schedule" | "config"
  >("queue");

  // Schedule config state
  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig | null>(
    null,
  );
  const [editScheduleHours, setEditScheduleHours] = useState<number[]>([]);
  const [editStoryScheduleHours, setEditStoryScheduleHours] = useState<
    number[]
  >([]);
  const [editPostsPerRun, setEditPostsPerRun] = useState(1);
  const [editMaxPostsPerDay, setEditMaxPostsPerDay] = useState(4);
  const [editMaxStoriesPerDay, setEditMaxStoriesPerDay] = useState(3);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSaveResult, setScheduleSaveResult] = useState<string | null>(
    null,
  );
  const [debugResult, setDebugResult] = useState<Record<string, any> | null>(
    null,
  );
  const [debugLoading, setDebugLoading] = useState(false);

  // Credentials state
  const [credentialInfo, setCredentialInfo] = useState<Record<
    string,
    CredentialInfo
  > | null>(null);
  const [credentialEdits, setCredentialEdits] = useState<
    Record<string, string>
  >({});
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [showCredentialValues, setShowCredentialValues] = useState<
    Record<string, boolean>
  >({});
  const [credentialSaveResult, setCredentialSaveResult] = useState<
    string | null
  >(null);

  // Populate options
  const [populateOptions, setPopulateOptions] = useState({
    includeGallery: true,
    includeReleases: true,
    includeArtists: true,
    includeCuratedTracks: true,
    includeVerticalVideos: true,
    includeYoutubeVideos: true,
    includeEvents: true,
    platforms: ["facebook", "instagram"],
    force: false,
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
        setContentCounts(data.data.contentCounts);
        // Load schedule config
        if (data.data.scheduleConfig) {
          setScheduleConfig(data.data.scheduleConfig);
          setEditScheduleHours(data.data.scheduleConfig.scheduleHours);
          setEditStoryScheduleHours(
            data.data.scheduleConfig.storyScheduleHours ||
              data.data.scheduleConfig.scheduleHours,
          );
          setEditPostsPerRun(data.data.scheduleConfig.postsPerRun);
          setEditMaxPostsPerDay(data.data.scheduleConfig.maxPostsPerDay);
          setEditMaxStoriesPerDay(
            data.data.scheduleConfig.maxStoriesPerDay ?? 3,
          );
        }
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
            includeVerticalVideos: populateOptions.includeVerticalVideos,
            includeEvents: populateOptions.includeEvents,
            platforms: populateOptions.platforms,
            force: populateOptions.force,
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
    if (
      !confirm(
        "Reiniciar todos los items publicados a pendientes para un nuevo ciclo?",
      )
    )
      return;
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
    if (
      !confirm(
        "Eliminar todos los items pendientes de la cola? Esta accion no se puede deshacer.",
      )
    )
      return;
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

  const saveScheduleConfig = async () => {
    setSavingSchedule(true);
    setScheduleSaveResult(null);
    try {
      const res = await fetch("/api/admin/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-schedule-config",
          scheduleHours: editScheduleHours,
          storyScheduleHours: editStoryScheduleHours,
          postsPerRun: editPostsPerRun,
          maxPostsPerDay: editMaxPostsPerDay,
          maxStoriesPerDay: editMaxStoriesPerDay,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setScheduleSaveResult("Horario guardado exitosamente");
        setScheduleConfig(data.data);
      } else {
        setScheduleSaveResult(`Error: ${data.error || "No se pudo guardar"}`);
      }
    } catch {
      setScheduleSaveResult("Error al guardar la configuración");
    } finally {
      setSavingSchedule(false);
    }
  };

  const toggleScheduleHour = (hour: number) => {
    setEditScheduleHours((prev) =>
      prev.includes(hour)
        ? prev.filter((h) => h !== hour)
        : [...prev, hour].sort((a, b) => a - b),
    );
  };

  const toggleStoryScheduleHour = (hour: number) => {
    setEditStoryScheduleHours((prev) =>
      prev.includes(hour)
        ? prev.filter((h) => h !== hour)
        : [...prev, hour].sort((a, b) => a - b),
    );
  };

  // Convenience: copy feed-post schedule to story schedule (one-click mirror)
  const copyFeedScheduleToStories = () => {
    setEditStoryScheduleHours([...editScheduleHours].sort((a, b) => a - b));
  };

  const runDiagnostics = async () => {
    setDebugLoading(true);
    setDebugResult(null);
    try {
      const res = await fetch("/api/admin/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "debug-autopost" }),
      });
      const data = await res.json();
      if (data.success) {
        setDebugResult(data.diagnostics);
      } else {
        setDebugResult({ error: data.error || "Unknown error" });
      }
    } catch (err) {
      setDebugResult({
        error: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setDebugLoading(false);
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
            Publicación automática a Facebook e Instagram —{" "}
            {scheduleConfig?.scheduleHours?.length || 3}x al día
            <span className="text-slc-muted/60 ml-2">
              (Eventos: FB feed + IG Story, 2x/día, 3x/día la semana del evento)
            </span>
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
              Agrega tus credenciales en la seccion &quot;Credenciales&quot;
              abajo, o configura las variables de entorno en Netlify:
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
        <Button
          variant="outline"
          size="sm"
          onClick={retryFailed}
          disabled={!queueSummary?.failed}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar Fallidos ({queueSummary?.failed || 0})
        </Button>
        <Button variant="outline" size="sm" onClick={resetCycle}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reiniciar Ciclo
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={clearQueue}
          className="text-red-400 hover:text-red-300"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Limpiar Pendientes
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slc-border overflow-x-auto">
        {(["queue", "history", "schedule", "config"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-slc-muted hover:text-white"
            }`}
          >
            {tab === "queue" && "Cola Pendiente"}
            {tab === "history" && "Historial"}
            {tab === "schedule" && "Horario"}
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
                Todos los items han sido publicados o la cola está vacía. Haz
                clic en &quot;Poblar Cola&quot; para agregar contenido.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={resetCycle}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reiniciar Ciclo
                </Button>
                <Button
                  onClick={populateQueue}
                  className="bg-green-600 hover:bg-green-700"
                >
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
                        // Fallback: try original URL if proxy fails, then show icon
                        const img = e.currentTarget;
                        if (!img.dataset.retried) {
                          img.dataset.retried = "true";
                          img.src = item.imageUrl;
                        } else {
                          // Both proxy and original failed — hide img and show icon
                          img.style.display = "none";
                          const sibling = img.nextElementSibling as HTMLElement;
                          if (sibling) sibling.style.display = "flex";
                        }
                      }}
                    />
                    <div
                      className="absolute inset-0 items-center justify-center hidden"
                      style={{ display: "none" }}
                    >
                      <IconComp className="w-6 h-6 text-slc-muted" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                      <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                      <span className="text-xs sm:text-sm font-medium">
                        {contentTypeLabels[item.contentType] ||
                          item.contentType}
                      </span>
                      <span
                        className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${statusColors[item.status]}`}
                      >
                        {item.status}
                      </span>
                      <span className="text-[10px] sm:text-xs text-slc-muted">
                        Ciclo {item.cycleNumber}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slc-muted truncate">
                      {truncate(item.caption, 80)}
                    </p>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                      {platforms.map((p) => {
                        const PIcon = platformIcons[p] || Music;
                        return (
                          <span
                            key={p}
                            className="flex items-center gap-1 text-xs text-slc-muted"
                          >
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
                      <Button
                        size="sm"
                        onClick={processNext}
                        disabled={processing}
                        className="hidden sm:inline-flex"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Publicar
                      </Button>
                    )}
                    {index === 0 && (
                      <Button
                        size="sm"
                        onClick={processNext}
                        disabled={processing}
                        className="sm:hidden"
                      >
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
              <p className="text-slc-muted">
                Aún no se han realizado publicaciones.
              </p>
            </div>
          ) : (
            recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start sm:items-center gap-3 p-3 bg-slc-card border border-slc-border rounded-lg"
              >
                {/* Platform icon */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slc-dark flex-shrink-0">
                  {(() => {
                    const Icon =
                      platformIcons[log.platform] ||
                      (log.platform.startsWith("facebook")
                        ? Facebook
                        : Instagram);
                    return (
                      <Icon
                        className={`w-4 h-4 ${log.platform.startsWith("facebook") ? "text-blue-400" : "text-pink-400"}`}
                      />
                    );
                  })()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-medium">
                      {contentTypeLabels[log.contentType] || log.contentType}
                    </span>
                    <span
                      className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${logStatusColors[log.status]}`}
                    >
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
                    <p className="text-xs text-red-400 truncate mt-0.5">
                      {log.errorMessage}
                    </p>
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

      {activeTab === "schedule" && (
        <div className="space-y-6">
          {/* Schedule Configuration */}
          <div className="bg-slc-card border border-slc-border rounded-xl p-6">
            <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Horario de Publicación
            </h2>
            <p className="text-sm text-slc-muted mb-6">
              Configura a qué horas se publican los posts automáticamente (hora
              de Ciudad de México / CST). El sistema revisa la cola cada hora y
              publica los items pendientes en los horarios seleccionados.
            </p>

            {/* Schedule Hours Grid */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">
                Horas de publicación (hora México)
              </label>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
                {Array.from({ length: 24 }, (_, h) => (
                  <button
                    key={h}
                    onClick={() => toggleScheduleHour(h)}
                    className={`px-2 py-2 rounded-lg text-sm font-medium transition-all ${
                      editScheduleHours.includes(h)
                        ? "bg-primary text-white border border-primary"
                        : "bg-slc-dark text-slc-muted border border-slc-border hover:border-primary/50"
                    }`}
                  >
                    {h.toString().padStart(2, "0")}:00
                  </button>
                ))}
              </div>
              <p className="text-xs text-slc-muted mt-2">
                Seleccionadas:{" "}
                {editScheduleHours.length > 0
                  ? editScheduleHours
                      .map((h) => `${h.toString().padStart(2, "0")}:00`)
                      .join(", ")
                  : "Ninguna — se usarán las horas por defecto (04:00, 10:00, 15:00)"}
              </p>
              <p className="text-xs text-slc-muted mt-1">
                <span className="text-white font-medium">Posts en feed:</span>{" "}
                Facebook (muro) + Instagram (feed). No incluye Stories.
              </p>
            </div>

            {/* Story Schedule Hours Grid */}
            <div className="mb-6 p-4 rounded-lg border border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium flex items-center gap-2">
                  <Instagram className="w-4 h-4 text-primary" />
                  Horas de Stories (hora México)
                </label>
                <button
                  onClick={copyFeedScheduleToStories}
                  className="text-xs px-2 py-1 rounded border border-slc-border bg-slc-dark hover:border-primary/50 text-slc-muted hover:text-white transition"
                  title="Copiar las mismas horas seleccionadas arriba"
                >
                  Copiar de feed
                </button>
              </div>
              <p className="text-xs text-slc-muted mb-3">
                En estas horas, el item de la cola también se publica como{" "}
                <span className="text-white font-medium">
                  Story de Instagram
                </span>{" "}
                (además del feed). Las Stories desaparecen en 24h — ideal para
                contenido "throwback" sin saturar el feed.
              </p>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
                {Array.from({ length: 24 }, (_, h) => (
                  <button
                    key={h}
                    onClick={() => toggleStoryScheduleHour(h)}
                    className={`px-2 py-2 rounded-lg text-sm font-medium transition-all ${
                      editStoryScheduleHours.includes(h)
                        ? "bg-pink-600 text-white border border-pink-500"
                        : "bg-slc-dark text-slc-muted border border-slc-border hover:border-pink-500/50"
                    }`}
                  >
                    {h.toString().padStart(2, "0")}:00
                  </button>
                ))}
              </div>
              <p className="text-xs text-slc-muted mt-2">
                Seleccionadas:{" "}
                {editStoryScheduleHours.length > 0
                  ? editStoryScheduleHours
                      .map((h) => `${h.toString().padStart(2, "0")}:00`)
                      .join(", ")
                  : "Ninguna — se usarán las mismas horas que el feed"}
              </p>
              <p className="text-xs text-slc-muted mt-1">
                <span className="text-white font-medium">Stories/día:</span>{" "}
                {editStoryScheduleHours.length} de throwback
                <span className="text-slc-muted"> + </span>
                <span className="text-white font-medium">2–3</span> de evento
                (autopost independiente)
              </p>
            </div>

            {/* Posts Per Run */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Posts por ejecución
              </label>
              <p className="text-xs text-slc-muted mb-3">
                Cuántos items de la cola se procesan cada vez que el cron corre
                (cada hora en los horarios seleccionados). Más items = más posts
                por día.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setEditPostsPerRun(Math.max(1, editPostsPerRun - 1))
                  }
                  className="w-10 h-10 rounded-lg bg-slc-dark border border-slc-border flex items-center justify-center hover:border-primary/50 text-lg font-bold"
                >
                  −
                </button>
                <span className="text-2xl font-oswald w-12 text-center">
                  {editPostsPerRun}
                </span>
                <button
                  onClick={() =>
                    setEditPostsPerRun(Math.min(10, editPostsPerRun + 1))
                  }
                  className="w-10 h-10 rounded-lg bg-slc-dark border border-slc-border flex items-center justify-center hover:border-primary/50 text-lg font-bold"
                >
                  +
                </button>
                <span className="text-sm text-slc-muted ml-2">
                  ({editPostsPerRun} post{editPostsPerRun > 1 ? "s" : ""} por
                  hora en horarios seleccionados)
                </span>
              </div>
            </div>

            {/* Max Posts Per Day */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Máximo de posts por día
              </label>
              <p className="text-xs text-slc-muted mb-3">
                Límite diario de publicaciones. Si el cron intenta pasar este
                límite, se detiene.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setEditMaxPostsPerDay(Math.max(1, editMaxPostsPerDay - 1))
                  }
                  className="w-10 h-10 rounded-lg bg-slc-dark border border-slc-border flex items-center justify-center hover:border-primary/50 text-lg font-bold"
                >
                  −
                </button>
                <span className="text-2xl font-oswald w-12 text-center">
                  {editMaxPostsPerDay}
                </span>
                <button
                  onClick={() =>
                    setEditMaxPostsPerDay(Math.min(24, editMaxPostsPerDay + 1))
                  }
                  className="w-10 h-10 rounded-lg bg-slc-dark border border-slc-border flex items-center justify-center hover:border-primary/50 text-lg font-bold"
                >
                  +
                </button>
                <span className="text-sm text-slc-muted ml-2">
                  (máximo {editMaxPostsPerDay} publicación
                  {editMaxPostsPerDay > 1 ? "es" : ""} por día en FB + IG)
                </span>
              </div>
            </div>

            {/* Max Stories Per Day */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Máximo de Stories por día
              </label>
              <p className="text-xs text-slc-muted mb-3">
                Límite diario de Instagram Stories (throwback). Independiente
                del límite de feed. Si el cron intenta pasar este límite, se
                detiene la publicación de Stories.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setEditMaxStoriesPerDay(
                      Math.max(0, editMaxStoriesPerDay - 1),
                    )
                  }
                  className="w-10 h-10 rounded-lg bg-slc-dark border border-slc-border flex items-center justify-center hover:border-pink-500/50 text-lg font-bold"
                >
                  −
                </button>
                <span className="text-2xl font-oswald w-12 text-center">
                  {editMaxStoriesPerDay}
                </span>
                <button
                  onClick={() =>
                    setEditMaxStoriesPerDay(
                      Math.min(24, editMaxStoriesPerDay + 1),
                    )
                  }
                  className="w-10 h-10 rounded-lg bg-slc-dark border border-slc-border flex items-center justify-center hover:border-pink-500/50 text-lg font-bold"
                >
                  +
                </button>
                <span className="text-sm text-slc-muted ml-2">
                  (máximo {editMaxStoriesPerDay} Stor
                  {editMaxStoriesPerDay === 1 ? "y" : "ies"} por día en
                  Instagram)
                </span>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 bg-slc-dark rounded-lg border border-slc-border mb-6">
              <h3 className="text-sm font-medium mb-2">
                Resumen de tu configuración
              </h3>
              <div className="space-y-1 text-sm text-slc-muted">
                <p>
                  <span className="text-white font-medium">
                    Horarios (feed):
                  </span>{" "}
                  {editScheduleHours.length > 0
                    ? editScheduleHours
                        .map((h) => `${h.toString().padStart(2, "0")}:00`)
                        .join(", ")
                    : "04:00, 10:00, 15:00 (por defecto)"}{" "}
                  (hora México)
                </p>
                <p>
                  <span className="text-white font-medium">
                    Horarios (Stories):
                  </span>{" "}
                  {editStoryScheduleHours.length > 0
                    ? editStoryScheduleHours
                        .map((h) => `${h.toString().padStart(2, "0")}:00`)
                        .join(", ")
                    : "Iguales que el feed"}{" "}
                  (hora México)
                </p>
                <p>
                  <span className="text-white font-medium">
                    Posts por ejecución:
                  </span>{" "}
                  {editPostsPerRun}
                </p>
                <p>
                  <span className="text-white font-medium">
                    Máximo diario (feed):
                  </span>{" "}
                  {editMaxPostsPerDay} posts
                </p>
                <p>
                  <span className="text-white font-medium">
                    Máximo diario (Stories):
                  </span>{" "}
                  {editMaxStoriesPerDay} Stories
                </p>
                <p>
                  <span className="text-white font-medium">Feed/día:</span>{" "}
                  {Math.min(
                    (editScheduleHours.length || 3) * editPostsPerRun,
                    editMaxPostsPerDay,
                  )}{" "}
                  posts × 2 plataformas ={" "}
                  {Math.min(
                    (editScheduleHours.length || 3) * editPostsPerRun,
                    editMaxPostsPerDay,
                  ) * 2}{" "}
                  publicaciones
                </p>
                <p>
                  <span className="text-white font-medium">
                    Stories throwback/día:
                  </span>{" "}
                  {Math.min(
                    editStoryScheduleHours.length ||
                      editScheduleHours.length ||
                      3,
                    editMaxStoriesPerDay,
                  )}{" "}
                  Stories
                </p>
              </div>
            </div>

            {/* Event Autopost Info */}
            <div className="p-4 bg-slc-dark rounded-lg border border-primary/20 mb-6">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Autopost de Eventos
              </h3>
              <div className="space-y-1 text-sm text-slc-muted">
                <p>
                  <span className="text-white font-medium">Facebook:</span> Post
                  en el muro (feed)
                </p>
                <p>
                  <span className="text-white font-medium">Instagram:</span>{" "}
                  Story (no feed, no Reel) — desaparece en 24h
                </p>
                <p>
                  <span className="text-white font-medium">
                    Más de 1 semana antes:
                  </span>{" "}
                  2 publicaciones/día (cada 12 horas)
                </p>
                <p>
                  <span className="text-white font-medium">
                    La semana del evento:
                  </span>{" "}
                  3 publicaciones/día (cada 8 horas)
                </p>
                <p className="text-xs mt-2">
                  Los posts de eventos son independientes y no cuentan contra el
                  límite diario de la cola regular.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4">
              <Button
                onClick={saveScheduleConfig}
                disabled={savingSchedule}
                className="bg-green-600 hover:bg-green-700"
              >
                {savingSchedule ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar Horario
              </Button>
              {scheduleSaveResult && (
                <span
                  className={`text-sm ${scheduleSaveResult.includes("Error") ? "text-red-400" : "text-green-400"}`}
                >
                  {scheduleSaveResult}
                </span>
              )}
            </div>
          </div>

          {/* Diagnostics Panel */}
          <div className="bg-slc-card border border-slc-border rounded-xl p-6">
            <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Diagnóstico de Autopost
            </h2>
            <p className="text-sm text-slc-muted mb-4">
              Verifica por qué no se están publicando los posts automáticos.
              Revisa configuración, cola, token y horarios.
            </p>
            <Button
              onClick={runDiagnostics}
              disabled={debugLoading}
              variant="outline"
              className="mb-4"
            >
              {debugLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Activity className="w-4 h-4 mr-2" />
              )}
              Ejecutar Diagnóstico
            </Button>

            {debugResult && (
              <div className="space-y-4">
                {/* Likely Issues */}
                {((debugResult.likelyIssues as string[]) || []).length > 0 && (
                  <div
                    className={`p-4 rounded-lg border ${
                      (debugResult.likelyIssues as string[]).some((i) =>
                        i.includes("No obvious"),
                      )
                        ? "bg-green-500/10 border-green-500/20"
                        : "bg-red-500/10 border-red-500/20"
                    }`}
                  >
                    <h3 className="text-sm font-medium mb-2">
                      Problemas encontrados:
                    </h3>
                    <ul className="space-y-1">
                      {(debugResult.likelyIssues as string[]).map(
                        (issue, i) => (
                          <li
                            key={i}
                            className="text-sm text-slc-muted flex items-start gap-2"
                          >
                            <span className="text-red-400 mt-0.5">•</span>
                            {issue}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}

                {/* Key Status Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatusBadge
                    label="Meta API"
                    ok={debugResult.metaConfigured as boolean}
                    okText="Configurada"
                    failText="No configurada"
                  />
                  <StatusBadge
                    label="Token"
                    ok={debugResult.tokenValid as boolean}
                    okText="Válido"
                    failText={(debugResult.tokenError as string) || "Inválido"}
                  />
                  <StatusBadge
                    label="Cola pendiente"
                    ok={(debugResult.queuePending as number) > 0}
                    okText={`${debugResult.queuePending} items`}
                    failText="Vacía"
                  />
                  <StatusBadge
                    label="Horario en DB"
                    ok={debugResult.hasAutopostScheduleHours as boolean}
                    okText={
                      (debugResult.autopostScheduleHoursValue as string) ||
                      "Guardado"
                    }
                    failText="No guardado"
                  />
                </div>

                {/* Schedule Debug */}
                <div className="p-3 bg-slc-dark rounded-lg text-sm space-y-1">
                  <p>
                    <span className="text-slc-muted">Hora actual (CST):</span>{" "}
                    <span className="text-white font-mono">
                      {debugResult.currentTimeCST}:00
                    </span>
                  </p>
                  <p>
                    <span className="text-slc-muted">Hora actual (UTC):</span>{" "}
                    <span className="text-white font-mono">
                      {debugResult.currentTimeUTC}:00
                    </span>
                  </p>
                  <p>
                    <span className="text-slc-muted">Horarios CST:</span>{" "}
                    <span className="text-white font-mono">
                      {(debugResult.scheduleConfig as any)?.scheduleHours?.join(
                        ", ",
                      ) || "N/A"}
                    </span>
                  </p>
                  <p>
                    <span className="text-slc-muted">Horarios UTC:</span>{" "}
                    <span className="text-white font-mono">
                      {(debugResult.utcScheduleHours as number[])?.join(", ") ||
                        "N/A"}
                    </span>
                  </p>
                  <p>
                    <span className="text-slc-muted">
                      ¿Debería publicar ahora?
                    </span>{" "}
                    <span
                      className={
                        debugResult.shouldPostNow
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    >
                      {debugResult.shouldPostNow ? "Sí" : "No"}
                    </span>
                  </p>
                  <p>
                    <span className="text-slc-muted">
                      Próximo horario (CST):
                    </span>{" "}
                    <span className="text-white font-mono">
                      {debugResult.nextScheduledCST}:00
                    </span>
                  </p>
                  <p>
                    <span className="text-slc-muted">Posts hoy:</span>{" "}
                    <span className="text-white font-mono">
                      {debugResult.todayPostsCount as number}
                    </span>
                  </p>
                </div>

                {/* Stuck items warning */}
                {(debugResult.stuckProcessingItems as number) > 0 && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-300">
                    <span className="font-medium">Atención:</span>{" "}
                    {debugResult.stuckProcessingItems} items están atascados en
                    estado "processing". Prueba "Reiniciar Ciclo" para
                    resetearlos.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Last Post Info */}
          {recentLogs.length > 0 && (
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Última Publicación
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slc-muted">Último post exitoso</p>
                  <p className="font-medium text-sm">
                    {(() => {
                      const successLog = recentLogs.find((l) => l.status === "success");
                      return successLog ? formatDate(successLog.postedAt ?? null) : "—";
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slc-muted">Plataforma</p>
                  <p className="font-medium text-sm">
                    {(() => {
                      const successLog = recentLogs.find((l) => l.status === "success");
                      return successLog
                        ? platformLabels[successLog.platform] || successLog.platform
                        : "—";
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slc-muted">Posts hoy</p>
                  <p className="font-medium text-sm">
                    {
                      recentLogs.filter((l) => {
                        if (!l.postedAt) return false;
                        const postDate = new Date(l.postedAt);
                        const today = new Date();
                        return (
                          postDate.toDateString() === today.toDateString() &&
                          l.status === "success"
                        );
                      }).length
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slc-muted">Pendientes en cola</p>
                  <p className="font-medium text-sm">
                    {queueSummary?.pending || 0}
                  </p>
                </div>
              </div>
            </div>
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
              Selecciona el contenido que quieres agregar a la cola de
              publicación. Solo se agregarán items nuevos (no duplicados).
            </p>

            {/* Content Sources */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-4">
              <label className="flex items-center gap-2 p-3 bg-slc-dark rounded-lg cursor-pointer hover:bg-slc-dark/80 transition-colors">
                <input
                  type="checkbox"
                  checked={populateOptions.includeGallery}
                  onChange={(e) =>
                    setPopulateOptions((prev) => ({
                      ...prev,
                      includeGallery: e.target.checked,
                    }))
                  }
                  className="rounded border-slc-border"
                />
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <div>
                  <p className="text-sm font-medium">Galería</p>
                  <p className="text-xs text-slc-muted">
                    {contentCounts?.galleryPhotos || 0} fotos
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 bg-slc-dark rounded-lg cursor-pointer hover:bg-slc-dark/80 transition-colors">
                <input
                  type="checkbox"
                  checked={populateOptions.includeReleases}
                  onChange={(e) =>
                    setPopulateOptions((prev) => ({
                      ...prev,
                      includeReleases: e.target.checked,
                    }))
                  }
                  className="rounded border-slc-border"
                />
                <Music className="w-4 h-4 text-green-400" />
                <div>
                  <p className="text-sm font-medium">Lanzamientos</p>
                  <p className="text-xs text-slc-muted">
                    {contentCounts?.releases || 0} releases
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 bg-slc-dark rounded-lg cursor-pointer hover:bg-slc-dark/80 transition-colors">
                <input
                  type="checkbox"
                  checked={populateOptions.includeArtists}
                  onChange={(e) =>
                    setPopulateOptions((prev) => ({
                      ...prev,
                      includeArtists: e.target.checked,
                    }))
                  }
                  className="rounded border-slc-border"
                />
                <Users className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-sm font-medium">Artistas</p>
                  <p className="text-xs text-slc-muted">
                    {contentCounts?.artists || 0} perfiles
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 bg-slc-dark rounded-lg cursor-pointer hover:bg-slc-dark/80 transition-colors">
                <input
                  type="checkbox"
                  checked={populateOptions.includeCuratedTracks}
                  onChange={(e) =>
                    setPopulateOptions((prev) => ({
                      ...prev,
                      includeCuratedTracks: e.target.checked,
                    }))
                  }
                  className="rounded border-slc-border"
                />
                <Disc3 className="w-4 h-4 text-cyan-400" />
                <div>
                  <p className="text-sm font-medium">Tracks Curados</p>
                  <p className="text-xs text-slc-muted">
                    {contentCounts?.curatedTracks || 0} tracks
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 bg-slc-dark rounded-lg cursor-pointer hover:bg-slc-dark/80 transition-colors">
                <input
                  type="checkbox"
                  checked={populateOptions.includeVerticalVideos}
                  onChange={(e) =>
                    setPopulateOptions((prev) => ({
                      ...prev,
                      includeVerticalVideos: e.target.checked,
                    }))
                  }
                  className="rounded border-slc-border"
                />
                <Video className="w-4 h-4 text-red-400" />
                <div>
                  <p className="text-sm font-medium">Reels / Videos</p>
                  <p className="text-xs text-slc-muted">
                    {contentCounts?.verticalVideos || 0} videos
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 bg-slc-dark rounded-lg cursor-pointer hover:bg-slc-dark/80 transition-colors">
                <input
                  type="checkbox"
                  checked={populateOptions.includeYoutubeVideos}
                  onChange={(e) =>
                    setPopulateOptions((prev) => ({
                      ...prev,
                      includeYoutubeVideos: e.target.checked,
                    }))
                  }
                  className="rounded border-slc-border"
                />
                <Youtube className="w-4 h-4 text-red-500" />
                <div>
                  <p className="text-sm font-medium">Videos YouTube</p>
                  <p className="text-xs text-slc-muted">
                    {contentCounts?.youtubeVideos || 0} videos
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 bg-slc-dark rounded-lg cursor-pointer hover:bg-slc-dark/80 transition-colors">
                <input
                  type="checkbox"
                  checked={populateOptions.includeEvents}
                  onChange={(e) =>
                    setPopulateOptions((prev) => ({
                      ...prev,
                      includeEvents: e.target.checked,
                    }))
                  }
                  className="rounded border-slc-border"
                />
                <Calendar className="w-4 h-4 text-amber-400" />
                <div>
                  <p className="text-sm font-medium">Eventos</p>
                  <p className="text-xs text-slc-muted">
                    {contentCounts?.events || 0} próximos
                  </p>
                </div>
              </label>
            </div>

            {/* Platform Selection */}
            <div className="mb-4">
              <p className="text-sm text-slc-muted mb-2">
                Plataformas destino:
              </p>
              <div className="flex gap-3">
                {(["facebook", "instagram"] as const).map((platform) => (
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
                    ) : (
                      <Instagram className="w-4 h-4 text-pink-400" />
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

            {/* Force re-add toggle */}
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={populateOptions.force}
                onChange={(e) =>
                  setPopulateOptions((prev) => ({
                    ...prev,
                    force: e.target.checked,
                  }))
                }
                className="rounded border-slc-border"
              />
              <span className="text-sm text-yellow-400">
                Forzar re-agregado
              </span>
              <span className="text-xs text-slc-muted">
                (Re-agregar items que ya existen en la cola — útil si los tracks
                curados no se agregaron antes)
              </span>
            </label>
          </div>

          {/* Meta API Configuration */}
          <div className="bg-slc-card border border-slc-border rounded-xl p-6">
            <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Meta API (Facebook + Instagram)
            </h2>
            <p className="text-sm text-slc-muted mb-4">
              Ingresa las credenciales de Meta para publicar en Facebook e
              Instagram. Los valores guardados aquí tienen prioridad sobre las
              variables de entorno de Netlify.
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
                    setCredentialEdits((prev) => ({
                      ...prev,
                      META_APP_ID: val,
                    }));
                  }
                }}
                showValue={showCredentialValues.META_APP_ID}
                onToggleShow={() =>
                  setShowCredentialValues((prev) => ({
                    ...prev,
                    META_APP_ID: !prev.META_APP_ID,
                  }))
                }
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
                    setCredentialEdits((prev) => ({
                      ...prev,
                      META_APP_SECRET: val,
                    }));
                  }
                }}
                showValue={showCredentialValues.META_APP_SECRET}
                onToggleShow={() =>
                  setShowCredentialValues((prev) => ({
                    ...prev,
                    META_APP_SECRET: !prev.META_APP_SECRET,
                  }))
                }
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
                    setCredentialEdits((prev) => ({
                      ...prev,
                      META_SYSTEM_USER_TOKEN: val,
                    }));
                  }
                }}
                showValue={showCredentialValues.META_SYSTEM_USER_TOKEN}
                onToggleShow={() =>
                  setShowCredentialValues((prev) => ({
                    ...prev,
                    META_SYSTEM_USER_TOKEN: !prev.META_SYSTEM_USER_TOKEN,
                  }))
                }
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
                    setCredentialEdits((prev) => ({
                      ...prev,
                      FACEBOOK_PAGE_ID: val,
                    }));
                  }
                }}
                showValue={showCredentialValues.FACEBOOK_PAGE_ID}
                onToggleShow={() =>
                  setShowCredentialValues((prev) => ({
                    ...prev,
                    FACEBOOK_PAGE_ID: !prev.FACEBOOK_PAGE_ID,
                  }))
                }
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
                          — FB Page: {tokenInfo.pageAccessible ? "✓" : "✗"} |
                          IG: {tokenInfo.igAccountAccessible ? "✓" : "✗"}
                        </span>
                        <span className="text-slc-muted">
                          — Expira:{" "}
                          {tokenInfo.expiresAt
                            ? formatDate(tokenInfo.expiresAt)
                            : "Nunca"}
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

          {/* Save Credentials Button */}
          <div className="bg-slc-card border border-slc-border rounded-xl p-6">
            <div className="flex items-center gap-4">
              <Button
                onClick={saveCredentials}
                disabled={
                  savingCredentials ||
                  Object.keys(credentialEdits).filter(
                    (k) =>
                      credentialEdits[k] && credentialEdits[k] !== "__CANCEL__",
                  ).length === 0
                }
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
                <span
                  className={`text-sm ${credentialSaveResult.startsWith("Error") ? "text-red-400" : "text-green-400"}`}
                >
                  {credentialSaveResult}
                </span>
              )}
              {Object.keys(credentialEdits).filter(
                (k) =>
                  credentialEdits[k] && credentialEdits[k] !== "__CANCEL__",
              ).length > 0 && (
                <span className="text-xs text-slc-muted">
                  {
                    Object.keys(credentialEdits).filter(
                      (k) =>
                        credentialEdits[k] &&
                        credentialEdits[k] !== "__CANCEL__",
                    ).length
                  }{" "}
                  cambio(s) pendiente(s)
                </span>
              )}
            </div>
          </div>

          {/* Schedule Info */}
          <div className="bg-slc-card border border-slc-border rounded-xl p-6">
            <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Horario de Publicación Actual
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(scheduleConfig?.scheduleHours || [4, 10, 15]).map((h) => {
                const labels: Record<number, string> = {
                  0: "Medianoche",
                  1: "Madrugada",
                  2: "Madrugada",
                  3: "Madrugada",
                  4: "Mañana temprano",
                  5: "Mañana temprano",
                  6: "Mañana",
                  7: "Mañana",
                  8: "Mañana",
                  9: "Media mañana",
                  10: "Media mañana",
                  11: "Mediodía",
                  12: "Mediodía",
                  13: "Tarde",
                  14: "Tarde",
                  15: "Tarde",
                  16: "Atardecer",
                  17: "Atardecer",
                  18: "Anochecer",
                  19: "Anochecer",
                  20: "Noche",
                  21: "Noche",
                  22: "Noche",
                  23: "Noche",
                };
                const ampm = h < 12 ? "AM" : "PM";
                const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
                return (
                  <ScheduleCard
                    key={h}
                    time={`${displayHour}:00 ${ampm}`}
                    label={labels[h] || "Horario"}
                    tz="CDMX"
                  />
                );
              })}
            </div>
            <p className="text-sm text-slc-muted mt-4">
              El sistema revisa la cola cada hora y publica{" "}
              {scheduleConfig?.postsPerRun || 1} item(s) por ejecución en los
              horarios seleccionados. Con{" "}
              {scheduleConfig?.scheduleHours?.length || 3} ejecuciones/día, se
              publican{" "}
              {(scheduleConfig?.scheduleHours?.length || 3) *
                (scheduleConfig?.postsPerRun || 1)}{" "}
              items/día (máximo {scheduleConfig?.maxPostsPerDay || 3}). Cada
              item se publica en todas las plataformas configuradas (FB + IG =
              hasta{" "}
              {(scheduleConfig?.scheduleHours?.length || 3) *
                (scheduleConfig?.postsPerRun || 1) *
                2}{" "}
              publicaciones totales/día).
            </p>
            <div className="mt-4 p-3 rounded-lg border border-pink-500/20 bg-pink-500/5">
              <p className="text-sm text-slc-muted">
                <span className="text-white font-medium flex items-center gap-2 mb-1">
                  <Instagram className="w-4 h-4 text-pink-500" />
                  Horario de Stories:
                </span>
                {scheduleConfig?.storyScheduleHours &&
                scheduleConfig.storyScheduleHours.length > 0 ? (
                  <>
                    {scheduleConfig.storyScheduleHours
                      .map((h) => `${h.toString().padStart(2, "0")}:00`)
                      .join(", ")}{" "}
                    (hora México)
                    {" — "}
                    {scheduleConfig.storyScheduleHours.length} Stories
                    throwback/día + 2–3 de evento
                  </>
                ) : (
                  <>
                    Iguales que el feed (
                    {(scheduleConfig?.scheduleHours || [4, 10, 15])
                      .map((h) => `${h.toString().padStart(2, "0")}:00`)
                      .join(", ")}
                    )
                  </>
                )}
              </p>
            </div>
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
      <div className={`font-oswald ${small ? "text-lg" : "text-2xl"} ${color}`}>
        {value}
      </div>
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
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                source === "db"
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-green-500/20 text-green-400"
              }`}
            >
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
              {showValue ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
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
          placeholder={
            placeholder ||
            (hasValue
              ? "Dejar vacio para mantener el valor actual"
              : `Ingresa ${label}`)
          }
          className="w-full mt-1 px-3 py-2 bg-slc-card border border-slc-border rounded text-sm text-white placeholder:text-slc-muted focus:outline-none focus:border-primary"
        />
      )}
    </div>
  );
}

function ScheduleCard({
  time,
  label,
  tz,
}: { time: string; label: string; tz: string }) {
  return (
    <div className="bg-slc-dark rounded-lg p-4 text-center">
      <p className="font-oswald text-2xl text-primary">{time}</p>
      <p className="text-sm text-slc-muted">{label}</p>
      <p className="text-xs text-slc-muted">({tz})</p>
    </div>
  );
}

function StatusBadge({
  label,
  ok,
  okText,
  failText,
}: { label: string; ok: boolean; okText: string; failText: string }) {
  return (
    <div
      className={`p-3 rounded-lg border ${ok ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}
    >
      <p className="text-xs text-slc-muted">{label}</p>
      <p
        className={`text-sm font-medium ${ok ? "text-green-400" : "text-red-400"}`}
      >
        {ok ? okText : failText}
      </p>
    </div>
  );
}
