"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Music2,
  ArrowLeft,
  AlertTriangle,
  Users,
  Disc3,
  Video,
  ExternalLink,
  LogOut,
} from "lucide-react";

interface SpotifyStatus {
  hasCredentials: boolean;
  credentialsValid: boolean;
  errorMessage: string | null;
  message: string;
}

interface Stats {
  artists: number;
  releases: number;
  videos: number;
}

interface SyncLog {
  id: string;
  syncType: string;
  status: string;
  itemsSynced: number;
  artistsSynced: number;
  releasesSynced: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export default function SyncPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [spotifyStatus, setSpotifyStatus] = useState<SpotifyStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [stats, setStats] = useState<Stats>({ artists: 0, releases: 0, videos: 0 });
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
        } else {
          router.push("/admin/login");
        }
      } catch {
        router.push("/admin/login");
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Fetch Spotify status
  const fetchSpotifyStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/status");
      const data = await res.json();
      setSpotifyStatus(data);
    } catch (err) {
      console.error("Error fetching Spotify status:", err);
      setSpotifyStatus({
        hasCredentials: false,
        credentialsValid: false,
        errorMessage: "Error al verificar el estado de Spotify",
        message: "Error al verificar el estado",
      });
    }
  }, []);

  // Fetch sync data
  const fetchSyncData = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/sync");
      const data = await res.json();
      if (data.success) {
        setStats({
          artists: data.artists || 0,
          releases: data.releases || 0,
          videos: data.videos || 0,
        });
        setRecentLogs(data.recentLogs || []);
      }
    } catch (err) {
      console.error("Error fetching sync data:", err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingStatus(true);
      await Promise.all([fetchSpotifyStatus(), fetchSyncData()]);
      setIsLoadingStatus(false);
    };
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, fetchSpotifyStatus, fetchSyncData]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/spotify/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncResult({
          type: "success",
          message: `Sincronizado: ${data.artistsUpdated || 0} artistas y ${data.releasesAdded || 0} lanzamientos`,
        });
        await fetchSyncData();
      } else {
        setSyncResult({
          type: "error",
          message: data.error || data.message || "Error desconocido",
        });
      }
    } catch (err) {
      setSyncResult({
        type: "error",
        message: err instanceof Error ? err.message : "Error de sincronización",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    return new Date(dateString).toLocaleString("es-MX", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-400" />;
      case "in_progress":
        return <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-zinc-400" />;
    }
  };

  if (isCheckingAuth || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <header className="bg-zinc-800 border-b border-zinc-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center">
                <Music2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Sincronización</h1>
                <p className="text-zinc-400 text-sm">Mantén la información actualizada desde fuentes externas</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-800 rounded-xl p-5 border border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs">Artistas</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.artists}</p>
              </div>
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </div>
          <div className="bg-zinc-800 rounded-xl p-5 border border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs">Lanzamientos</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.releases}</p>
              </div>
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Disc3 className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-zinc-800 rounded-xl p-5 border border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs">Videos</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.videos}</p>
              </div>
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Video className="h-5 w-5 text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Spotify Sync Section */}
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <svg className="h-6 w-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold">Sincronizar Discografía</h2>
                <p className="text-zinc-400 text-sm">
                  Descarga automáticamente todos los álbumes, EPs y singles de los artistas del crew desde Spotify
                </p>
              </div>
            </div>
            <button
              onClick={handleSync}
              disabled={isSyncing || !spotifyStatus?.hasCredentials}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-zinc-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Cargar Discografía Completa
                </>
              )}
            </button>
          </div>

          {/* Spotify Status */}
          {isLoadingStatus ? (
            <div className="flex items-center gap-2 text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando estado de Spotify...
            </div>
          ) : spotifyStatus ? (
            <div className="space-y-4">
              {spotifyStatus.hasCredentials && spotifyStatus.credentialsValid ? (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  <span>{spotifyStatus.message}</span>
                </div>
              ) : spotifyStatus.hasCredentials && !spotifyStatus.credentialsValid ? (
                <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <span>{spotifyStatus.errorMessage || spotifyStatus.message}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400">
                    <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                    <span>No hay credenciales de Spotify configuradas</span>
                  </div>
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 font-medium mb-2">Para resolver esto:</p>
                    <ol className="text-red-300 text-sm space-y-1 list-decimal list-inside">
                      <li>
                        Crea una app en{" "}
                        <a
                          href="https://developer.spotify.com/dashboard"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-red-200 inline-flex items-center gap-1"
                        >
                          developer.spotify.com/dashboard
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                      <li>Copia el Client ID y Client Secret</li>
                      <li>
                        Agrégalos en Netlify como <code className="bg-red-500/20 px-1 rounded">SPOTIFY_CLIENT_ID</code> y{" "}
                        <code className="bg-red-500/20 px-1 rounded">SPOTIFY_CLIENT_SECRET</code>
                      </li>
                      <li>Redespliega el sitio para aplicar los cambios</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Sync Result */}
          {syncResult && (
            <div
              className={`mt-4 flex items-center gap-2 p-3 rounded-lg ${
                syncResult.type === "success"
                  ? "bg-green-500/10 border border-green-500/30 text-green-400"
                  : "bg-red-500/10 border border-red-500/30 text-red-400"
              }`}
            >
              {syncResult.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 flex-shrink-0" />
              )}
              <span>{syncResult.message}</span>
            </div>
          )}
        </div>

        {/* Recent Sync Logs */}
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-6">
          <h3 className="text-lg font-semibold mb-4">Historial de Sincronización</h3>
          {recentLogs.length > 0 ? (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-zinc-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <p className="text-sm font-medium">
                        {log.artistsSynced} artistas, {log.releasesSynced} lanzamientos
                      </p>
                      <p className="text-xs text-zinc-400">{formatDate(log.completedAt || log.startedAt)}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      log.status === "completed"
                        ? "bg-green-500/20 text-green-400"
                        : log.status === "failed"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {log.status === "completed" ? "Completado" : log.status === "failed" ? "Error" : "En progreso"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-400 text-sm">No hay registros de sincronización</p>
          )}
        </div>
      </main>
    </div>
  );
}
