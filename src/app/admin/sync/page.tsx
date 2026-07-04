"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Disc3,
  Eye,
  EyeOff,
  FolderOpen,
  Link2,
  Loader2,
  Music,
  Play,
  Plus,
  RefreshCw,
  Save,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";

interface SyncService {
  id: string;
  name: string;
  description: string;
  iconId: "spotify" | "youtube" | "dropbox"; // Use ID instead of JSX
  status: "idle" | "running" | "success" | "error";
  lastSync: string | null;
  itemsProcessed: number;
  errorMessage?: string;
  color: string;
}

interface Stats {
  artists: number;
  releases: number;
  videos: number;
}

// Use plain objects without JSX - icons are rendered in the component
const initialServices: SyncService[] = [
  {
    id: "spotify",
    name: "Spotify",
    description:
      "Sincroniza imágenes de artistas y datos de álbumes usando embed API (sin límites de tasa).",
    iconId: "spotify",
    status: "idle",
    lastSync: null,
    itemsProcessed: 0,
    color: "spotify",
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Sincroniza videos y vistas desde los canales de YouTube.",
    iconId: "youtube",
    status: "idle",
    lastSync: null,
    itemsProcessed: 0,
    color: "youtube",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Sincroniza archivos multimedia y press kits desde Dropbox.",
    iconId: "dropbox",
    status: "idle",
    lastSync: null,
    itemsProcessed: 0,
    color: "blue-500",
  },
];

// Helper to render icons based on ID
function ServiceIcon({ iconId }: { iconId: SyncService["iconId"] }) {
  switch (iconId) {
    case "spotify":
      return <Music className="w-6 h-6" />;
    case "youtube":
      return <Video className="w-6 h-6" />;
    case "dropbox":
      return <FolderOpen className="w-6 h-6" />;
    default:
      return <Database className="w-6 h-6" />;
  }
}

export default function AdminSyncPage() {
  const [services, setServices] = useState<SyncService[]>(initialServices);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [stats, setStats] = useState<Stats>({
    artists: 0,
    releases: 0,
    videos: 0,
  });
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [isAddingRelease, setIsAddingRelease] = useState(false);
  const [addMessage, setAddMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Spotify releases sync state
  const [isSyncingReleases, setIsSyncingReleases] = useState(false);
  const [releasesSyncResult, setReleasesSyncResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    help?: string;
    totalReleasesFound?: number;
    newReleasesCreated?: number;
    existingReleasesSkipped?: number;
    artistBreakdown?: { name: string; found: number; created: number }[];
  } | null>(null);

  // Spotify stats sync state
  const [isSyncingStats, setIsSyncingStats] = useState(false);
  const [statsSyncResult, setStatsSyncResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    processed?: number;
    failed?: number;
  } | null>(null);

  // Dropbox token state
  const [dropboxToken, setDropboxToken] = useState("");
  const [showDropboxToken, setShowDropboxToken] = useState(false);
  const [isSavingDropboxToken, setIsSavingDropboxToken] = useState(false);
  const [isTestingDropbox, setIsTestingDropbox] = useState(false);
  const [dropboxSaveMessage, setDropboxSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [dropboxStatus, setDropboxStatus] = useState<{
    configured: boolean; // token exists
    connected: boolean; // token works
    oauthConfigured: boolean; // OAuth credentials available
    hasRefreshToken: boolean; // Has refresh token for auto-renewal
    usingEnvToken?: boolean; // Using DROPBOX_ACCESS_TOKEN env var
    tokenSource?: string; // Where the token comes from
    tokenPreview?: string; // Preview of the token
    tokenSavedAt?: string; // When the token was saved
    accountName?: string;
    email?: string;
    error?: string;
  } | null>(null);

  // Fetch stats and Dropbox status on mount
  useEffect(() => {
    async function fetchStats() {
      try {
        const [artistsRes, releasesRes, videosRes] = await Promise.all([
          fetch("/api/artists").catch(() => ({
            ok: false,
            json: () => Promise.resolve({ data: [] }),
          })),
          fetch("/api/releases").catch(() => ({
            ok: false,
            json: () => Promise.resolve({ data: [] }),
          })),
          fetch("/api/videos").catch(() => ({
            ok: false,
            json: () => Promise.resolve({ data: [] }),
          })),
        ]);

        const [artistsData, releasesData, videosData] = await Promise.all([
          artistsRes.ok !== false
            ? artistsRes.json().catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
          releasesRes.ok !== false
            ? releasesRes.json().catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
          videosRes.ok !== false
            ? videosRes.json().catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
        ]);

        setStats({
          artists: artistsData?.data?.length || 0,
          releases: releasesData?.data?.length || 0,
          videos: videosData?.data?.length || 0,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    async function checkDropboxStatus(forceRefresh = false) {
      try {
        const url = forceRefresh
          ? "/api/admin/dropbox?refresh=true"
          : "/api/admin/dropbox";
        const response = await fetch(url);
        const data = await response.json();
        console.log("[Sync] Dropbox status response:", data);

        if (data.success && data.data) {
          // configured = token exists in DB or env
          // connected = token actually works with Dropbox API
          const hasToken =
            data.data.configured ||
            data.data.hasDatabaseToken ||
            data.data.hasEnvToken;
          const isConnected = data.data.connected === true;

          setDropboxStatus({
            configured: hasToken,
            connected: isConnected,
            oauthConfigured: data.data.oauthConfigured === true,
            hasRefreshToken: data.data.hasRefreshToken === true,
            usingEnvToken: data.data.usingEnvToken === true,
            tokenSource: data.data.tokenSource || data.data.testedTokenSource,
            tokenPreview: data.data.tokenPreview,
            tokenSavedAt: data.data.tokenSavedAt,
            accountName: data.data.accountName,
            email: data.data.email,
            error: data.data.error,
          });
        } else {
          setDropboxStatus({
            configured: false,
            connected: false,
            oauthConfigured: false,
            hasRefreshToken: false,
            usingEnvToken: false,
            error: data.error || "Error checking status",
          });
        }
      } catch (error) {
        console.error("[Sync] Error checking Dropbox status:", error);
        setDropboxStatus({
          configured: false,
          connected: false,
          oauthConfigured: false,
          hasRefreshToken: false,
          error: "Connection error",
        });
      }
    }

    // Check URL params for OAuth callback results
    function handleOAuthCallback() {
      const urlParams = new URLSearchParams(window.location.search);
      const dropboxSuccess = urlParams.get("dropbox_success");
      const dropboxError = urlParams.get("dropbox_error");

      if (dropboxSuccess) {
        setDropboxSaveMessage({
          type: "success",
          text: `¡Conectado exitosamente a Dropbox${dropboxSuccess !== "connected" ? `: ${dropboxSuccess}` : ""}!`,
        });
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
      } else if (dropboxError) {
        setDropboxSaveMessage({
          type: "error",
          text: `Error al conectar: ${dropboxError}`,
        });
        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
      }
    }

    handleOAuthCallback();
    fetchStats();
    checkDropboxStatus();
  }, []);

  // Save Dropbox token
  const handleSaveDropboxToken = async () => {
    if (!dropboxToken.trim()) {
      setDropboxSaveMessage({
        type: "error",
        text: "Por favor ingresa un token",
      });
      return;
    }

    setIsSavingDropboxToken(true);
    setDropboxSaveMessage(null);

    try {
      console.log("[Sync] Saving Dropbox token...");
      const response = await fetch("/api/admin/dropbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: dropboxToken.trim(), action: "save" }),
      });

      const data = await response.json();
      console.log("[Sync] Save token response:", data);

      if (data.success) {
        setDropboxStatus({
          configured: true,
          connected: true,
          oauthConfigured: dropboxStatus?.oauthConfigured || false,
          hasRefreshToken: false, // Manual tokens don't have refresh tokens
          accountName: data.data?.accountName,
          email: data.data?.email,
        });
        setDropboxToken("");
        setDropboxSaveMessage({
          type: "success",
          text: `¡Conectado! Cuenta: ${data.data?.accountName || data.data?.email || "verificada"}`,
        });
      } else {
        const errorMsg = data.error || "Error desconocido al guardar token";
        setDropboxStatus({
          configured: false,
          connected: false,
          oauthConfigured: dropboxStatus?.oauthConfigured || false,
          hasRefreshToken: false,
          error: errorMsg,
        });
        setDropboxSaveMessage({ type: "error", text: errorMsg });
      }
    } catch (error) {
      console.error("[Sync] Error saving token:", error);
      const errorMsg = "Error de conexión al servidor";
      setDropboxStatus({
        configured: false,
        connected: false,
        oauthConfigured: false,
        hasRefreshToken: false,
        error: errorMsg,
      });
      setDropboxSaveMessage({ type: "error", text: errorMsg });
    } finally {
      setIsSavingDropboxToken(false);
    }
  };

  // Test Dropbox connection (with force refresh to bypass cache)
  const handleTestDropbox = async (forceRefresh = true) => {
    setIsTestingDropbox(true);
    setDropboxSaveMessage(null);
    try {
      // Always force refresh when testing to get fresh data
      const url = forceRefresh
        ? "/api/admin/dropbox?refresh=true"
        : "/api/admin/dropbox";
      const response = await fetch(url);
      const data = await response.json();
      console.log("[Sync] Test connection response:", data);

      if (data.success && data.data) {
        const hasToken = data.data.configured || data.data.hasDatabaseToken;
        const isConnected = data.data.connected === true;

        setDropboxStatus({
          configured: hasToken,
          connected: isConnected,
          oauthConfigured: data.data.oauthConfigured === true,
          hasRefreshToken: data.data.hasRefreshToken === true,
          usingEnvToken: data.data.usingEnvToken === true,
          tokenSource: data.data.tokenSource || data.data.testedTokenSource,
          tokenPreview: data.data.tokenPreview,
          tokenSavedAt: data.data.tokenSavedAt,
          accountName: data.data.accountName,
          email: data.data.email,
          error: data.data.error,
        });

        // Show result message
        if (isConnected) {
          setDropboxSaveMessage({
            type: "success",
            text: `Conectado correctamente. Token: ${data.data.tokenSource || "database"}`,
          });
        } else if (data.data.error) {
          setDropboxSaveMessage({
            type: "error",
            text: `Error: ${data.data.error}`,
          });
        }
      } else {
        setDropboxStatus({
          configured: false,
          connected: false,
          oauthConfigured: false,
          hasRefreshToken: false,
          error: data.error || "Error testing connection",
        });
        setDropboxSaveMessage({
          type: "error",
          text: data.error || "Error al verificar conexión",
        });
      }
    } catch (error) {
      console.error("[Sync] Error testing connection:", error);
      setDropboxStatus({
        configured: false,
        connected: false,
        oauthConfigured: false,
        hasRefreshToken: false,
        error: "Error de conexión",
      });
      setDropboxSaveMessage({
        type: "error",
        text: "Error de conexión al servidor",
      });
    } finally {
      setIsTestingDropbox(false);
    }
  };

  const handleSync = async (serviceId: string) => {
    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId
          ? { ...s, status: "running" as const, errorMessage: undefined }
          : s,
      ),
    );

    try {
      let endpoint = "";
      switch (serviceId) {
        case "spotify":
          endpoint = "/api/admin/sync/spotify";
          break;
        case "youtube":
          endpoint = "/api/admin/sync/youtube";
          break;
        case "dropbox":
          endpoint = "/api/admin/sync/dropbox";
          break;
      }

      const response = await fetch(endpoint, { method: "POST" });
      const data = await response.json();

      if (data.success) {
        // For YouTube, also show errors from the data object
        const youtubeErrors =
          serviceId === "youtube" && data.data?.errors?.length > 0
            ? data.data.errors[0] // Show first error as the status message
            : undefined;

        setServices((prev) =>
          prev.map((s) =>
            s.id === serviceId
              ? {
                  ...s,
                  status: youtubeErrors
                    ? ("error" as const)
                    : ("success" as const),
                  lastSync: new Date().toISOString(),
                  itemsProcessed:
                    data.data?.videosProcessed ||
                    data.processed ||
                    data.count ||
                    0,
                  errorMessage: youtubeErrors,
                }
              : s,
          ),
        );

        // Refresh stats
        const [artistsRes, releasesRes, videosRes] = await Promise.all([
          fetch("/api/artists"),
          fetch("/api/releases"),
          fetch("/api/videos"),
        ]);
        const [artistsData, releasesData, videosData] = await Promise.all([
          artistsRes.json(),
          releasesRes.json(),
          videosRes.json(),
        ]);
        setStats({
          artists: artistsData.data?.length || 0,
          releases: releasesData.data?.length || 0,
          videos: videosData.data?.length || 0,
        });
      } else {
        setServices((prev) =>
          prev.map((s) =>
            s.id === serviceId
              ? {
                  ...s,
                  status: "error" as const,
                  errorMessage:
                    data.error || data.data?.errors?.[0] || "Sync failed",
                }
              : s,
          ),
        );
      }
    } catch (error) {
      setServices((prev) =>
        prev.map((s) =>
          s.id === serviceId
            ? {
                ...s,
                status: "error" as const,
                errorMessage: "Connection error",
              }
            : s,
        ),
      );
    }

    // Reset status after 5 seconds
    setTimeout(() => {
      setServices((prev) =>
        prev.map((s) =>
          s.id === serviceId ? { ...s, status: "idle" as const } : s,
        ),
      );
    }, 5000);
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    for (const service of services) {
      await handleSync(service.id);
    }
    setIsSyncingAll(false);
  };

  // Sync all releases from Spotify for all SLC artists
  const handleSyncAllReleases = async () => {
    setIsSyncingReleases(true);
    setReleasesSyncResult(null);

    try {
      const response = await fetch("/api/admin/sync/spotify-releases", {
        method: "POST",
      });

      const data = await response.json();
      setReleasesSyncResult(data);

      if (data.success) {
        // Refresh stats
        const releasesRes = await fetch("/api/releases");
        const releasesData = await releasesRes.json();
        setStats((prev) => ({
          ...prev,
          releases: releasesData?.data?.length || 0,
        }));
      }
    } catch (error) {
      setReleasesSyncResult({
        success: false,
        error: "Error de conexión al sincronizar releases",
      });
    } finally {
      setIsSyncingReleases(false);
    }
  };

  // Sync follower stats from Spotify API
  const handleSyncStats = async () => {
    setIsSyncingStats(true);
    setStatsSyncResult(null);

    try {
      const response = await fetch("/api/admin/sync/spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "stats" }),
      });

      const data = await response.json();
      setStatsSyncResult({
        success: data.success,
        message: data.message,
        error:
          typeof data.error === "string"
            ? data.error
            : data.error?.message ||
              (data.success ? undefined : "Error desconocido"),
        processed: data.processed,
        failed: data.failed,
      });
    } catch (error) {
      setStatsSyncResult({
        success: false,
        error: "Error de conexión al sincronizar estadísticas",
      });
    } finally {
      setIsSyncingStats(false);
    }
  };

  const handleAddReleaseFromSpotify = async () => {
    if (!spotifyUrl) return;

    setIsAddingRelease(true);
    setAddMessage(null);

    try {
      // Extract album ID from URL
      const match = spotifyUrl.match(/album\/([a-zA-Z0-9]+)/);
      if (!match) {
        setAddMessage({ type: "error", text: "URL de Spotify inválida" });
        return;
      }

      // Redirect to the release creation page with the URL pre-filled
      window.location.href = `/admin/releases/new?spotify=${encodeURIComponent(spotifyUrl)}`;
    } catch (error) {
      setAddMessage({ type: "error", text: "Error al procesar URL" });
    } finally {
      setIsAddingRelease(false);
    }
  };

  const getStatusIcon = (status: SyncService["status"]) => {
    switch (status) {
      case "running":
        return <RefreshCw className="w-5 h-5 animate-spin text-yellow-500" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-slc-muted" />;
    }
  };

  const getStatusText = (status: SyncService["status"]) => {
    switch (status) {
      case "running":
        return "Sincronizando...";
      case "success":
        return "Completado";
      case "error":
        return "Error";
      default:
        return "Listo";
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase">Sincronización</h1>
          <p className="text-slc-muted mt-1">
            Mantén la información actualizada desde fuentes externas
          </p>
        </div>
        <Button onClick={handleSyncAll} disabled={isSyncingAll}>
          {isSyncingAll ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Sincronizar Todo
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-slc-card border border-slc-border rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-spotify/10 text-spotify flex items-center justify-center">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slc-muted text-sm">Artistas</p>
              <p className="font-oswald text-2xl">{stats.artists}</p>
            </div>
          </div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slc-muted text-sm">Lanzamientos</p>
              <p className="font-oswald text-2xl">{stats.releases}</p>
            </div>
          </div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-youtube/10 text-youtube flex items-center justify-center">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slc-muted text-sm">Videos</p>
              <p className="font-oswald text-2xl">{stats.videos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sync All Spotify Releases */}
      <div className="bg-gradient-to-r from-spotify/10 to-transparent border border-spotify/30 rounded-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-spotify/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-spotify" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
                <Disc3 className="w-5 h-5 text-spotify" />
                Sincronizar TODA la Discografía
              </h2>
              <p className="text-slc-muted text-sm mt-1">
                Descarga automáticamente todos los álbumes, EPs y singles de los
                15 artistas del crew desde Spotify. Incluye portadas en alta
                resolución.
              </p>
            </div>
          </div>
          <Button
            onClick={handleSyncAllReleases}
            disabled={isSyncingReleases}
            className="bg-spotify hover:bg-spotify/90 text-black font-bold px-6 h-12 shrink-0"
          >
            {isSyncingReleases ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                Cargar Discografía Completa
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {releasesSyncResult && (
          <div
            className={`mt-6 p-4 rounded-lg ${
              releasesSyncResult.success
                ? "bg-green-500/10 border border-green-500/30"
                : "bg-red-500/10 border border-red-500/30"
            }`}
          >
            {releasesSyncResult.success ? (
              <div>
                <div className="flex items-center gap-2 text-green-500 font-medium mb-3">
                  <CheckCircle className="w-5 h-5" />
                  {releasesSyncResult.message}
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-slc-dark/50 rounded-lg">
                    <div className="font-oswald text-2xl text-spotify">
                      {releasesSyncResult.totalReleasesFound || 0}
                    </div>
                    <div className="text-xs text-slc-muted uppercase">
                      Encontrados
                    </div>
                  </div>
                  <div className="text-center p-3 bg-slc-dark/50 rounded-lg">
                    <div className="font-oswald text-2xl text-green-500">
                      {releasesSyncResult.newReleasesCreated || 0}
                    </div>
                    <div className="text-xs text-slc-muted uppercase">
                      Nuevos
                    </div>
                  </div>
                  <div className="text-center p-3 bg-slc-dark/50 rounded-lg">
                    <div className="font-oswald text-2xl text-slc-muted">
                      {releasesSyncResult.existingReleasesSkipped || 0}
                    </div>
                    <div className="text-xs text-slc-muted uppercase">
                      Ya existentes
                    </div>
                  </div>
                </div>
                {releasesSyncResult.artistBreakdown &&
                  releasesSyncResult.artistBreakdown.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-slc-muted mb-2">
                        Desglose por artista:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
                        {releasesSyncResult.artistBreakdown.map((artist) => (
                          <div
                            key={artist.name}
                            className="bg-slc-dark/50 rounded px-2 py-1 flex justify-between"
                          >
                            <span className="truncate">{artist.name}</span>
                            <span className="text-spotify ml-1">
                              {artist.found}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 text-red-500 font-medium">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  {releasesSyncResult.error || "Error al sincronizar"}
                </div>
                {/* Show help text if available */}
                {"help" in releasesSyncResult && releasesSyncResult.help && (
                  <pre className="mt-3 text-xs text-slc-muted whitespace-pre-wrap bg-slc-dark/50 p-3 rounded">
                    {String(releasesSyncResult.help)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sync Spotify Stats */}
      <div className="bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/30 rounded-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-8 h-8 text-purple-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
                Sincronizar Estadísticas
              </h2>
              <p className="text-slc-muted text-sm mt-1">
                Actualiza el conteo de seguidores de Spotify para todos los
                artistas del crew. Requiere credenciales de API de Spotify
                configuradas.
              </p>
            </div>
          </div>
          <Button
            onClick={handleSyncStats}
            disabled={isSyncingStats}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold px-6 h-12 shrink-0"
          >
            {isSyncingStats ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                Sincronizar Stats
              </>
            )}
          </Button>
        </div>

        {/* Stats Sync Results */}
        {statsSyncResult && (
          <div
            className={`mt-6 p-4 rounded-lg ${
              statsSyncResult.success
                ? "bg-green-500/10 border border-green-500/30"
                : "bg-red-500/10 border border-red-500/30"
            }`}
          >
            {statsSyncResult.success ? (
              <div>
                <div className="flex items-center gap-2 text-green-500 font-medium mb-3">
                  <CheckCircle className="w-5 h-5" />
                  {statsSyncResult.message}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slc-dark/50 rounded-lg">
                    <div className="font-oswald text-2xl text-purple-500">
                      {statsSyncResult.processed || 0}
                    </div>
                    <div className="text-xs text-slc-muted uppercase">
                      Actualizados
                    </div>
                  </div>
                  <div className="text-center p-3 bg-slc-dark/50 rounded-lg">
                    <div className="font-oswald text-2xl text-red-500">
                      {statsSyncResult.failed || 0}
                    </div>
                    <div className="text-xs text-slc-muted uppercase">
                      Fallidos
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="w-5 h-5" />
                {statsSyncResult.error || "Error al sincronizar"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Add Release */}
      <div className="bg-slc-dark border border-slc-border rounded-xl p-6 mb-8">
        <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Agregar Lanzamiento Rápido
        </h2>
        <p className="text-slc-muted text-sm mb-4">
          Pega la URL de un álbum de Spotify para agregarlo directamente a la
          discografía.
        </p>

        {addMessage && (
          <div
            className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
              addMessage.type === "success"
                ? "bg-green-500/10 border border-green-500/20 text-green-500"
                : "bg-red-500/10 border border-red-500/20 text-red-500"
            }`}
          >
            {addMessage.type === "success" ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            {addMessage.text}
          </div>
        )}

        <div className="flex gap-3">
          <Input
            value={spotifyUrl}
            onChange={(e) => setSpotifyUrl(e.target.value)}
            placeholder="https://open.spotify.com/album/..."
            className="flex-1"
          />
          <Button
            onClick={handleAddReleaseFromSpotify}
            disabled={isAddingRelease || !spotifyUrl}
          >
            {isAddingRelease ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Sync Services */}
      <div className="space-y-4">
        <h2 className="font-oswald text-xl uppercase">Servicios</h2>

        {services.map((service) => (
          <div
            key={service.id}
            className="bg-slc-dark border border-slc-border rounded-xl p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={
                    "w-12 h-12 rounded-lg flex items-center justify-center"
                  }
                  style={{
                    backgroundColor:
                      service.id === "spotify"
                        ? "rgba(30, 215, 96, 0.1)"
                        : service.id === "youtube"
                          ? "rgba(255, 0, 0, 0.1)"
                          : "rgba(59, 130, 246, 0.1)",
                    color:
                      service.id === "spotify"
                        ? "#1ed760"
                        : service.id === "youtube"
                          ? "#ff0000"
                          : "#3b82f6",
                  }}
                >
                  <ServiceIcon iconId={service.iconId} />
                </div>
                <div>
                  <h3 className="font-oswald text-lg uppercase">
                    {service.name}
                  </h3>
                  <p className="text-slc-muted text-sm">
                    {service.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    {getStatusIcon(service.status)}
                    <span className="text-sm">
                      {getStatusText(service.status)}
                    </span>
                  </div>
                  {service.lastSync && (
                    <p className="text-xs text-slc-muted mt-1">
                      Último:{" "}
                      {new Date(service.lastSync).toLocaleString("es-MX")}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSync(service.id)}
                  disabled={service.status === "running"}
                >
                  {service.status === "running" ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Progress indicator when running */}
            {service.status === "running" && (
              <div className="mt-4">
                <div className="w-full h-1 bg-slc-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary animate-pulse"
                    style={{ width: "60%" }}
                  />
                </div>
              </div>
            )}

            {/* Results when completed */}
            {service.status === "success" && service.itemsProcessed > 0 && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-500 text-sm">
                  ✓ {service.itemsProcessed} items procesados correctamente
                </p>
              </div>
            )}

            {/* Error message */}
            {service.status === "error" && service.errorMessage && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-500 text-sm">✗ {service.errorMessage}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Roster Monthly Videos Sync */}
      <RosterVideosSync
        onVideosAdded={() => {
          // Refresh stats
          fetch("/api/videos")
            .then((r) => r.json())
            .then((data) => {
              setStats((prev) => ({ ...prev, videos: data.data?.length || 0 }));
            });
        }}
      />

      {/* Dropbox Configuration */}
      <div className="mt-8">
        <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-blue-500" />
          Configuración de Dropbox
        </h2>
        <div className="bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/30 rounded-xl p-6">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-slc-muted text-sm mb-4">
                Conecta tu cuenta de Dropbox para habilitar la subida de
                archivos multimedia (beats, imágenes, press kits).
              </p>

              {/* Status indicator */}
              {dropboxStatus && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm ${
                    dropboxStatus.connected
                      ? "bg-green-500/10 border border-green-500/20 text-green-500"
                      : dropboxStatus.configured
                        ? "bg-red-500/10 border border-red-500/20 text-red-500"
                        : "bg-yellow-500/10 border border-yellow-500/20 text-yellow-500"
                  }`}
                >
                  {dropboxStatus.connected ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>
                            Conectado como{" "}
                            <strong>
                              {dropboxStatus.accountName ||
                                dropboxStatus.email ||
                                "cuenta verificada"}
                            </strong>
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              await fetch("/api/admin/dropbox", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "clear" }),
                              });
                              setDropboxStatus({
                                configured: false,
                                connected: false,
                                oauthConfigured: dropboxStatus.oauthConfigured,
                                hasRefreshToken: false,
                              });
                              setDropboxSaveMessage({
                                type: "success",
                                text: "Dropbox desconectado",
                              });
                            } catch (e) {
                              setDropboxSaveMessage({
                                type: "error",
                                text: "Error al desconectar",
                              });
                            }
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          Desconectar
                        </Button>
                      </div>
                      {/* Token source badges */}
                      <div className="flex flex-wrap gap-2">
                        {dropboxStatus.tokenSource && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              dropboxStatus.tokenSource === "database"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            Token: {dropboxStatus.tokenSource}
                          </span>
                        )}
                        {dropboxStatus.hasRefreshToken && (
                          <span className="text-xs bg-green-500/20 px-2 py-0.5 rounded text-green-400">
                            Auto-renovación
                          </span>
                        )}
                        {dropboxStatus.usingEnvToken && (
                          <span className="text-xs bg-yellow-500/20 px-2 py-0.5 rounded text-yellow-400">
                            ⚠️ Env token (fallback)
                          </span>
                        )}
                      </div>
                      {/* Token preview for debugging */}
                      {dropboxStatus.tokenPreview && (
                        <div className="text-xs text-green-400/60 font-mono mt-1">
                          Token: {dropboxStatus.tokenPreview}
                          {dropboxStatus.tokenSavedAt && (
                            <span className="ml-2">
                              (guardado:{" "}
                              {new Date(
                                dropboxStatus.tokenSavedAt,
                              ).toLocaleString("es-MX")}
                              )
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : dropboxStatus.configured ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span>
                          {dropboxStatus.error || "Token inválido o expirado"}
                        </span>
                      </div>
                      {/* Show token info even when failed */}
                      {dropboxStatus.tokenPreview && (
                        <div className="text-xs text-red-400/60 font-mono mt-2">
                          Token probado: {dropboxStatus.tokenPreview}
                          {dropboxStatus.tokenSource && (
                            <span className="ml-2">
                              (fuente: {dropboxStatus.tokenSource})
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs mt-2 text-red-400/80">
                        {dropboxStatus.oauthConfigured
                          ? "Haz clic en 'Conectar con Dropbox' para renovar la conexión automáticamente."
                          : "Los tokens manuales expiran cada 4 horas. Genera uno nuevo en Dropbox App Console."}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>
                        No configurado - Conecta tu cuenta de Dropbox abajo
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* OAuth Connect Button - Always show when not connected */}
              {!dropboxStatus?.connected && (
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-medium text-blue-400 mb-1">
                        Conectar con Dropbox
                      </h4>
                      <p className="text-xs text-slc-muted">
                        {dropboxStatus?.oauthConfigured
                          ? "Conecta con un clic. Los tokens se renuevan automáticamente, sin necesidad de volver a conectar."
                          : "Haz clic para conectar tu cuenta de Dropbox."}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        window.location.href = "/api/dropbox/auth";
                      }}
                      className="bg-blue-500 hover:bg-blue-600 font-bold shrink-0"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 6.134L6.069 9.797L12 13.459l5.931-3.662L12 6.134zM6.069 14.797L12 18.459l5.931-3.662L12 11.134l-5.931 3.663zM12 2L2 8.259l5.69 3.519L12 9.253l4.31 2.525L22 8.259 12 2zm0 14.506L7.69 19.03 12 21.555l4.31-2.525L12 16.506z" />
                      </svg>
                      Conectar con Dropbox
                    </Button>
                  </div>
                </div>
              )}

              {/* Save result message */}
              {dropboxSaveMessage && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
                    dropboxSaveMessage.type === "success"
                      ? "bg-green-500/10 border border-green-500/20 text-green-500"
                      : "bg-red-500/10 border border-red-500/20 text-red-500"
                  }`}
                >
                  {dropboxSaveMessage.type === "success" ? (
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{dropboxSaveMessage.text}</span>
                </div>
              )}

              {/* Manual token entry - Fallback method */}
              {!dropboxStatus?.connected && (
                <details className="group">
                  <summary className="cursor-pointer text-sm text-slc-muted hover:text-white mb-3 flex items-center gap-2">
                    <span className="group-open:rotate-90 transition-transform">
                      ▶
                    </span>
                    Método alternativo: Token manual
                  </summary>
                  <div className="ml-4 mt-3 p-4 bg-slc-card rounded-lg border border-slc-border">
                    <p className="text-xs text-slc-muted mb-3">
                      Si OAuth no está disponible, puedes ingresar un token
                      manualmente.
                      <strong className="text-yellow-400">
                        {" "}
                        Los tokens manuales expiran cada 4 horas.
                      </strong>
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Input
                          type={showDropboxToken ? "text" : "password"}
                          value={dropboxToken}
                          onChange={(e) => setDropboxToken(e.target.value)}
                          placeholder="sl.xxxxx... (Access Token)"
                          className="pr-10 font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDropboxToken(!showDropboxToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slc-muted hover:text-white"
                        >
                          {showDropboxToken ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <Button
                        onClick={handleSaveDropboxToken}
                        disabled={isSavingDropboxToken || !dropboxToken.trim()}
                        variant="outline"
                      >
                        {isSavingDropboxToken ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Guardar
                      </Button>
                    </div>

                    <div className="mt-3 text-xs text-slc-muted">
                      <p className="mb-2">Para obtener un token manual:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>
                          Ve a{" "}
                          <a
                            href="https://www.dropbox.com/developers/apps"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline"
                          >
                            Dropbox App Console
                          </a>
                        </li>
                        <li>Selecciona tu app o crea una nueva</li>
                        <li>
                          En "Settings", haz clic en "Generate" bajo "Generated
                          access token"
                        </li>
                      </ol>
                    </div>
                  </div>
                </details>
              )}

              {/* Connection Test Button - Always show for debugging */}
              <div className="flex flex-wrap gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => handleTestDropbox(true)}
                  disabled={isTestingDropbox}
                >
                  {isTestingDropbox ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Verificar Conexión (Forzar)
                </Button>
                <a
                  href="/api/dropbox/debug"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-slc-border rounded-lg hover:bg-slc-card/50 transition-colors"
                >
                  <Link2 className="w-4 h-4" />
                  Ver Debug Info
                </a>
              </div>

              {/* OAuth not configured warning */}
              {!dropboxStatus?.oauthConfigured && (
                <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <p className="text-xs text-orange-400">
                    <strong>Nota:</strong> Para habilitar OAuth (conexión con un
                    clic y renovación automática), configura las variables de
                    entorno{" "}
                    <code className="bg-slc-dark px-1 rounded">
                      DROPBOX_APP_KEY
                    </code>{" "}
                    y{" "}
                    <code className="bg-slc-dark px-1 rounded">
                      DROPBOX_APP_SECRET
                    </code>{" "}
                    en Netlify.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* API Configuration */}
      <div className="mt-8">
        <h2 className="font-oswald text-xl uppercase mb-4">
          Configuración de API
        </h2>
        <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-spotify" />
                Spotify API
              </h3>
              <p className="text-slc-muted text-sm mb-3">
                Usando embed API pública (sin límites de tasa). También se
                pueden configurar credenciales completas.
              </p>
              <code className="block p-3 bg-slc-card rounded text-xs text-slc-muted">
                SPOTIFY_CLIENT_ID=d43c...68
                <br />
                SPOTIFY_CLIENT_SECRET=d3c...b6
              </code>
              <div className="mt-2 flex items-center gap-2 text-xs text-green-500">
                <CheckCircle className="w-3 h-3" />
                Configurado
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-youtube" />
                YouTube API
              </h3>
              <p className="text-slc-muted text-sm mb-3">
                Usando oembed API pública (sin API key necesaria).
              </p>
              <code className="block p-3 bg-slc-card rounded text-xs text-slc-muted">
                YOUTUBE_API_KEY=opcional
              </code>
              <div className="mt-2 flex items-center gap-2 text-xs text-green-500">
                <CheckCircle className="w-3 h-3" />
                Disponible (oembed)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Tips */}
      <div className="mt-8">
        <h2 className="font-oswald text-xl uppercase mb-4">Consejos</h2>
        <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
          <ul className="space-y-3 text-sm text-slc-muted">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>
                El sync de <strong>Spotify</strong> usa el embed API que no
                tiene límites de tasa.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>
                Puedes agregar releases manualmente desde la página de{" "}
                <a
                  href="/admin/releases/new"
                  className="text-primary hover:underline"
                >
                  nuevo lanzamiento
                </a>
                .
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>
                Los videos se pueden agregar desde URLs de YouTube sin necesidad
                de API key.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>
                Sincroniza regularmente para mantener las imágenes y conteos
                actualizados.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// ROSTER VIDEOS SYNC COMPONENT
// ===========================================

interface RosterVideosSyncProps {
  onVideosAdded?: () => void;
}

function RosterVideosSync({ onVideosAdded }: RosterVideosSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [videosPerMonth, setVideosPerMonth] = useState(4);
  const [status, setStatus] = useState<{
    lastSync: string | null;
    canSyncThisMonth: boolean;
    totalChannels: number;
  } | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    videosSynced?: number;
    videosSkipped?: number;
    newVideosAvailable?: number;
    channelsProcessed?: number;
    channelsFailed?: number;
    alreadySyncedThisMonth?: boolean;
    lastSyncDate?: string;
    errors?: string[];
  } | null>(null);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/admin/sync/roster-videos");
      const data = await response.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error("Error fetching roster videos status:", error);
    }
  };

  const handleSync = async (force = false) => {
    setIsSyncing(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/sync/roster-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videosPerMonth,
          force,
        }),
      });

      const data = await response.json();
      setResult(data.data || data);

      if (data.success && data.data?.videosSynced > 0) {
        onVideosAdded?.();
      }

      // Refresh status
      fetchStatus();
    } catch (error) {
      setResult({
        success: false,
        errors: ["Error de conexión al sincronizar videos"],
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    return new Date(dateString).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="bg-gradient-to-r from-youtube/10 to-transparent border border-youtube/30 rounded-xl p-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-youtube/20 flex items-center justify-center flex-shrink-0">
            <Video className="w-8 h-8 text-youtube" />
          </div>
          <div>
            <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-youtube" />
              Videos Mensuales del Roster
            </h2>
            <p className="text-slc-muted text-sm mt-1">
              Carga videos aleatorios de los canales de YouTube de los{" "}
              {status?.totalChannels || 14} artistas del crew. Solo se cargan
              videos que no existan ya en la base de datos.
            </p>
            {status && (
              <div className="flex flex-wrap gap-3 mt-2 text-xs">
                <span
                  className={`px-2 py-1 rounded ${status.canSyncThisMonth ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}
                >
                  {status.canSyncThisMonth
                    ? "Disponible para sincronizar"
                    : "Ya sincronizado este mes"}
                </span>
                <span className="px-2 py-1 rounded bg-slc-card text-slc-muted">
                  Última: {formatDate(status.lastSync)}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {/* Video count selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-slc-muted whitespace-nowrap">
              Videos a cargar:
            </label>
            <select
              value={videosPerMonth}
              onChange={(e) => setVideosPerMonth(Number(e.target.value))}
              className="px-3 py-1.5 bg-slc-card border border-slc-border rounded-lg text-sm"
              disabled={isSyncing}
            >
              {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n} video{n !== 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => handleSync(false)}
              disabled={isSyncing}
              className="bg-youtube hover:bg-youtube/90 text-white font-bold px-6 h-10 shrink-0"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Cargar Videos
                </>
              )}
            </Button>
            {!status?.canSyncThisMonth && (
              <Button
                onClick={() => handleSync(true)}
                disabled={isSyncing}
                variant="outline"
                className="border-youtube/50 text-youtube hover:bg-youtube/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Forzar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div
          className={`mt-6 p-4 rounded-lg ${
            result.success && !result.alreadySyncedThisMonth
              ? "bg-green-500/10 border border-green-500/30"
              : result.alreadySyncedThisMonth
                ? "bg-yellow-500/10 border border-yellow-500/30"
                : "bg-red-500/10 border border-red-500/30"
          }`}
        >
          {result.success && !result.alreadySyncedThisMonth ? (
            <div>
              <div className="flex items-center gap-2 text-green-500 font-medium mb-3">
                <CheckCircle className="w-5 h-5" />
                ¡Sincronización completada!
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-slc-dark/50 rounded-lg">
                  <div className="font-oswald text-2xl text-green-500">
                    {result.videosSynced || 0}
                  </div>
                  <div className="text-xs text-slc-muted uppercase">
                    Nuevos Videos
                  </div>
                </div>
                <div className="text-center p-3 bg-slc-dark/50 rounded-lg">
                  <div className="font-oswald text-2xl text-blue-500">
                    {result.newVideosAvailable || 0}
                  </div>
                  <div className="text-xs text-slc-muted uppercase">
                    Disponibles
                  </div>
                </div>
                <div className="text-center p-3 bg-slc-dark/50 rounded-lg">
                  <div className="font-oswald text-2xl text-slc-muted">
                    {result.videosSkipped || 0}
                  </div>
                  <div className="text-xs text-slc-muted uppercase">
                    Ya Existentes
                  </div>
                </div>
                <div className="text-center p-3 bg-slc-dark/50 rounded-lg">
                  <div className="font-oswald text-2xl text-youtube">
                    {result.channelsProcessed || 0}
                  </div>
                  <div className="text-xs text-slc-muted uppercase">
                    Canales
                  </div>
                </div>
              </div>
            </div>
          ) : result.alreadySyncedThisMonth ? (
            <div className="flex items-center gap-2 text-yellow-500">
              <AlertTriangle className="w-5 h-5" />
              <span>
                Ya se sincronizaron videos este mes (
                {formatDate(result.lastSyncDate || null)}). Usa el botón
                "Forzar" para cargar más videos.
              </span>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-red-500 font-medium">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                Error al sincronizar videos
              </div>
              {result.errors && result.errors.length > 0 && (
                <ul className="mt-2 text-sm text-red-400 list-disc list-inside">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-slc-card/50 rounded-lg text-xs text-slc-muted">
        <p>
          <strong>Nota:</strong> Requiere que la API de YouTube esté configurada
          (YOUTUBE_API_KEY). Los videos se seleccionan aleatoriamente entre los
          canales del roster para mostrar variedad en el contenido.
        </p>
      </div>
    </div>
  );
}
