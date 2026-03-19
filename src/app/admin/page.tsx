"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Disc3,
  Video,
  Calendar,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Music2,
  AlertCircle,
  ArrowLeft,
  Mail,
  Gift,
  Upload,
  FileText,
  Trash2,
  LogOut
} from "lucide-react";

interface Stats {
  artists: number;
  releases: number;
  videos: number;
  events: number;
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

interface SyncStatus {
  success: boolean;
  artists?: number;
  releases?: number;
  videos?: number;
  events?: number;
  lastSynced?: string;
  lastSync?: SyncLog | null;
  recentLogs?: SyncLog[];
}

interface NewsletterSettings {
  rewardFileUrl: string | null;
  rewardFileName: string | null;
  rewardTitle: string;
  rewardDescription: string;
  popupTitle: string;
  popupDescription: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [stats, setStats] = useState<Stats>({
    artists: 0,
    releases: 0,
    videos: 0,
    events: 0,
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncResult, setSyncResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Newsletter state
  const [newsletterSettings, setNewsletterSettings] = useState<NewsletterSettings>({
    rewardFileUrl: null,
    rewardFileName: null,
    rewardTitle: "Exclusive Content",
    rewardDescription: "Download our exclusive content as a thank you for subscribing!",
    popupTitle: "Join Our Newsletter",
    popupDescription: "Get exclusive updates, new releases, and special content delivered to your inbox.",
  });
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSavingNewsletter, setIsSavingNewsletter] = useState(false);
  const [newsletterMessage, setNewsletterMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check authentication on mount
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
      } catch (err) {
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

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/spotify/sync");
      const data = await res.json();
      setSyncStatus(data);

      if (data.success) {
        setStats({
          artists: data.artists || 0,
          releases: data.releases || 0,
          videos: data.videos || 0,
          events: data.events || 0,
        });
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  }, []);

  const fetchNewsletterSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/newsletter/settings");
      const data = await res.json();
      if (data.success) {
        if (data.settings) {
          setNewsletterSettings({
            rewardFileUrl: data.settings.rewardFileUrl,
            rewardFileName: data.settings.rewardFileName,
            rewardTitle: data.settings.rewardTitle || "Exclusive Content",
            rewardDescription: data.settings.rewardDescription || "Download our exclusive content as a thank you for subscribing!",
            popupTitle: data.settings.popupTitle || "Join Our Newsletter",
            popupDescription: data.settings.popupDescription || "Get exclusive updates, new releases, and special content delivered to your inbox.",
          });
        }
        setSubscriberCount(data.subscriberCount || 0);
      }
    } catch (err) {
      console.error("Error fetching newsletter settings:", err);
    }
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/spotify/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncResult({
          type: "success",
          message: `Successfully synced ${data.artistsUpdated || 0} artists and ${data.releasesAdded || 0} releases`,
        });
      } else {
        setSyncResult({
          type: "error",
          message: data.error || data.message || "Unknown error",
        });
      }
      await fetchData();
    } catch (err) {
      setSyncResult({
        type: "error",
        message: err instanceof Error ? err.message : "Sync failed",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    setNewsletterMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/newsletter/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setNewsletterSettings(prev => ({
          ...prev,
          rewardFileUrl: data.fileUrl,
          rewardFileName: data.fileName,
        }));
        setNewsletterMessage({
          type: "success",
          message: "File uploaded successfully!",
        });
      } else {
        setNewsletterMessage({
          type: "error",
          message: data.error || "Failed to upload file",
        });
      }
    } catch (err) {
      setNewsletterMessage({
        type: "error",
        message: "Failed to upload file",
      });
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = () => {
    setNewsletterSettings(prev => ({
      ...prev,
      rewardFileUrl: null,
      rewardFileName: null,
    }));
  };

  const handleSaveNewsletterSettings = async () => {
    setIsSavingNewsletter(true);
    setNewsletterMessage(null);

    try {
      const res = await fetch("/api/newsletter/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newsletterSettings),
      });

      const data = await res.json();

      if (data.success) {
        setNewsletterMessage({
          type: "success",
          message: "Settings saved successfully!",
        });
      } else {
        setNewsletterMessage({
          type: "error",
          message: data.error || "Failed to save settings",
        });
      }
    } catch (err) {
      setNewsletterMessage({
        type: "error",
        message: "Failed to save settings",
      });
    } finally {
      setIsSavingNewsletter(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchData(), fetchNewsletterSettings()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchData, fetchNewsletterSettings]);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (dateString: string | null | undefined) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
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
        return <Clock className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "in_progress":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  };

  // Show loading while checking authentication
  if (isCheckingAuth || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading dashboard...</p>
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
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-zinc-400 text-sm">Sonido Líquido Crew</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to Site
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-zinc-800 rounded-xl p-5 border border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs">Artists</p>
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
                <p className="text-zinc-400 text-xs">Releases</p>
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
          <div className="bg-zinc-800 rounded-xl p-5 border border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs">Events</p>
                <p className="text-2xl font-bold text-white mt-1">{stats.events}</p>
              </div>
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Calendar className="h-5 w-5 text-green-400" />
              </div>
            </div>
          </div>
          <div className="bg-zinc-800 rounded-xl p-5 border border-zinc-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-xs">Subscribers</p>
                <p className="text-2xl font-bold text-white mt-1">{subscriberCount}</p>
              </div>
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Mail className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Sync Result Alert */}
        {syncResult && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            syncResult.type === "success"
              ? "bg-green-500/20 border border-green-500/50"
              : "bg-red-500/20 border border-red-500/50"
          }`}>
            {syncResult.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
            )}
            <div>
              <p className={`font-medium ${syncResult.type === "success" ? "text-green-300" : "text-red-300"}`}>
                {syncResult.type === "success" ? "Sync Completed" : "Sync Failed"}
              </p>
              <p className={`text-sm mt-1 ${syncResult.type === "success" ? "text-green-400" : "text-red-400"}`}>
                {syncResult.message}
              </p>
            </div>
            <button
              onClick={() => setSyncResult(null)}
              className="ml-auto text-zinc-400 hover:text-white"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Sync & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Spotify Sync</h2>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isSyncing ? "bg-zinc-600 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Sync Now"}
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span className="text-zinc-400 text-sm">Last Synced</span>
                <div className="text-right">
                  <span className="text-white font-medium text-sm">{formatRelativeTime(syncStatus?.lastSynced)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-400 text-sm">Status</span>
                {syncStatus?.lastSync ? (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(syncStatus.lastSync.status)}`}>
                    {syncStatus.lastSync.status.replace("_", " ").toUpperCase()}
                  </span>
                ) : (
                  <span className="text-zinc-500 text-sm">No syncs yet</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
            <h2 className="text-lg font-semibold text-white mb-6">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Link href="/admin/upcoming-releases" className="p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg hover:bg-orange-500/30 transition-colors text-center">
                <Calendar className="h-5 w-5 text-orange-400 mx-auto mb-1" />
                <p className="text-xs text-orange-300 font-medium">Próximos</p>
              </Link>
              <Link href="/admin/releases" className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition-colors text-center">
                <Disc3 className="h-5 w-5 text-amber-400 mx-auto mb-1" />
                <p className="text-xs text-amber-300 font-medium">Media Releases</p>
              </Link>
              <Link href="/admin/beats" className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors text-center">
                <Music2 className="h-5 w-5 text-purple-400 mx-auto mb-1" />
                <p className="text-xs text-purple-300 font-medium">Beats</p>
              </Link>
              <Link href="/" className="p-3 bg-zinc-700/50 rounded-lg hover:bg-zinc-700 transition-colors text-center">
                <Users className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                <p className="text-xs text-white">Ver Sitio</p>
              </Link>
              <a href="https://open.spotify.com/playlist/2YqHiwxhbYazjcBy62sMAb" target="_blank" rel="noopener noreferrer" className="p-3 bg-zinc-700/50 rounded-lg hover:bg-zinc-700 transition-colors text-center">
                <Music2 className="h-5 w-5 text-[#1DB954] mx-auto mb-1" />
                <p className="text-xs text-white">Spotify</p>
              </a>
              <a href="https://youtube.com/@sonidoliquidocrew" target="_blank" rel="noopener noreferrer" className="p-3 bg-zinc-700/50 rounded-lg hover:bg-zinc-700 transition-colors text-center">
                <Video className="h-5 w-5 text-red-500 mx-auto mb-1" />
                <p className="text-xs text-white">YouTube</p>
              </a>
            </div>
          </div>
        </div>

        {/* Newsletter Settings */}
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden mb-8">
          <div className="p-6 border-b border-zinc-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Gift className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Newsletter & Reward Settings</h2>
                <p className="text-sm text-zinc-400">Manage your newsletter popup and reward file</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Newsletter Message */}
            {newsletterMessage && (
              <div className={`mb-6 p-3 rounded-lg flex items-center gap-2 ${
                newsletterMessage.type === "success"
                  ? "bg-green-500/20 border border-green-500/50 text-green-300"
                  : "bg-red-500/20 border border-red-500/50 text-red-300"
              }`}>
                {newsletterMessage.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <span className="text-sm">{newsletterMessage.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column - Reward File */}
              <div>
                <h3 className="text-sm font-medium text-white mb-4">Reward File</h3>

                {/* Current file */}
                {newsletterSettings.rewardFileUrl ? (
                  <div className="bg-zinc-700/50 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <FileText className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {newsletterSettings.rewardFileName}
                        </p>
                        <a
                          href={newsletterSettings.rewardFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:underline"
                        >
                          Preview file
                        </a>
                      </div>
                      <button
                        onClick={handleRemoveFile}
                        className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-700/30 border-2 border-dashed border-zinc-600 rounded-lg p-6 text-center mb-4">
                    <Gift className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
                    <p className="text-sm text-zinc-400">No reward file uploaded</p>
                  </div>
                )}

                {/* Upload button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="*/*"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingFile}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
                >
                  {isUploadingFile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      {newsletterSettings.rewardFileUrl ? "Replace File" : "Upload Reward File"}
                    </>
                  )}
                </button>

                {/* Reward info fields */}
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Reward Title</label>
                    <input
                      type="text"
                      value={newsletterSettings.rewardTitle}
                      onChange={(e) => setNewsletterSettings(prev => ({ ...prev, rewardTitle: e.target.value }))}
                      className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                      placeholder="e.g., Exclusive EP"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Reward Description</label>
                    <input
                      type="text"
                      value={newsletterSettings.rewardDescription}
                      onChange={(e) => setNewsletterSettings(prev => ({ ...prev, rewardDescription: e.target.value }))}
                      className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                      placeholder="e.g., Download our exclusive content..."
                    />
                  </div>
                </div>
              </div>

              {/* Right column - Popup Text */}
              <div>
                <h3 className="text-sm font-medium text-white mb-4">Popup Content</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Popup Title</label>
                    <input
                      type="text"
                      value={newsletterSettings.popupTitle}
                      onChange={(e) => setNewsletterSettings(prev => ({ ...prev, popupTitle: e.target.value }))}
                      className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                      placeholder="Join Our Newsletter"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Popup Description</label>
                    <textarea
                      value={newsletterSettings.popupDescription}
                      onChange={(e) => setNewsletterSettings(prev => ({ ...prev, popupDescription: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 resize-none"
                      placeholder="Get exclusive updates..."
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-4 p-4 bg-zinc-900 rounded-lg border border-zinc-700">
                  <p className="text-xs text-zinc-500 mb-2">Preview</p>
                  <p className="font-semibold text-white text-sm">{newsletterSettings.popupTitle}</p>
                  <p className="text-xs text-zinc-400 mt-1">{newsletterSettings.popupDescription}</p>
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSaveNewsletterSettings}
                disabled={isSavingNewsletter}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
              >
                {isSavingNewsletter ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sync Logs Table */}
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden">
          <div className="p-6 border-b border-zinc-700">
            <h2 className="text-lg font-semibold text-white">Sync History</h2>
            <p className="text-sm text-zinc-400 mt-1">Recent sync operations and their status</p>
          </div>

          {syncStatus?.recentLogs && syncStatus.recentLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-900/50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Type</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Artists</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Releases</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Started</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700">
                  {syncStatus.recentLogs.map((log) => {
                    const startTime = new Date(log.startedAt).getTime();
                    const endTime = log.completedAt ? new Date(log.completedAt).getTime() : Date.now();
                    const durationMs = endTime - startTime;
                    const durationSecs = Math.floor(durationMs / 1000);
                    const durationMins = Math.floor(durationSecs / 60);
                    const duration = durationMins > 0
                      ? `${durationMins}m ${durationSecs % 60}s`
                      : `${durationSecs}s`;

                    return (
                      <tr key={log.id} className="hover:bg-zinc-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(log.status)}`}>
                              {log.status.replace("_", " ")}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-300">
                          {log.syncType.replace("_", " ")}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-300">
                          {log.artistsSynced}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-300">
                          {log.releasesSynced}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-400">
                          {formatDate(log.startedAt)}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-400">
                          {log.status === "in_progress" ? (
                            <span className="text-yellow-400">In progress...</span>
                          ) : (
                            duration
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Clock className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No sync history yet</p>
              <p className="text-sm text-zinc-500 mt-1">Click "Sync Now" to start your first sync</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
