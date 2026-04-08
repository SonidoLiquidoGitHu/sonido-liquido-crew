"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  BellRing,
  Send,
  Users,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Rocket,
  Calendar,
  Settings,
  Mail,
  Smartphone,
  Globe,
  ChevronRight,
  Search,
  Filter,
  History,
  BarChart3,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Subscription {
  id: string;
  endpoint: string;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
}

interface UpcomingRelease {
  id: string;
  title: string;
  artistName: string;
  releaseDate: string;
  coverImageUrl: string | null;
}

interface NotificationStats {
  activeSubscriptions: number;
  upcomingReleasesIn7Days: number;
  vapidConfigured: boolean;
}

interface NotificationHistoryEntry {
  id: string;
  title: string;
  body: string;
  url: string | null;
  type: string;
  releaseId: string | null;
  releaseName: string | null;
  recipientCount: number;
  successCount: number;
  failedCount: number;
  sentBy: string | null;
  sentAt: string;
}

interface HistoryStats {
  totalSent: number;
  totalFailed: number;
  totalNotifications: number;
  successRate: number;
}

export default function NotificationsAdminPage() {
  const [activeTab, setActiveTab] = useState<"subscriptions" | "send" | "history" | "settings">("subscriptions");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [releases, setReleases] = useState<UpcomingRelease[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [history, setHistory] = useState<NotificationHistoryEntry[]>([]);
  const [historyStats, setHistoryStats] = useState<HistoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Send notification state
  const [sendForm, setSendForm] = useState({
    title: "",
    body: "",
    url: "",
    releaseId: "",
  });
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [subsRes, statsRes, releasesRes, historyRes] = await Promise.all([
        fetch("/api/admin/notifications/subscriptions"),
        fetch("/api/notifications/send-upcoming"),
        fetch("/api/upcoming-releases?limit=10"),
        fetch("/api/admin/notifications/history?limit=50"),
      ]);

      const [subsData, statsData, releasesData, historyData] = await Promise.all([
        subsRes.json(),
        statsRes.json(),
        releasesRes.json(),
        historyRes.json(),
      ]);

      if (subsData.success) setSubscriptions(subsData.data);
      if (statsData.success) setStats(statsData.data);
      if (releasesData.success) setReleases(releasesData.data);
      if (historyData.success) {
        setHistory(historyData.data.history);
        setHistoryStats(historyData.data.stats);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setIsLoading(false);
  }

  async function deleteSubscription(id: string) {
    if (!confirm("¿Eliminar esta suscripción?")) return;

    try {
      const res = await fetch(`/api/admin/notifications/subscriptions?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (error) {
      console.error("Error deleting subscription:", error);
    }
  }

  async function sendNotification(e: React.FormEvent) {
    e.preventDefault();
    if (!sendForm.title || !sendForm.body) {
      setSendResult({ success: false, message: "Título y mensaje son requeridos" });
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendForm),
      });
      const data = await res.json();

      if (data.success) {
        setSendResult({ success: true, message: `Enviado a ${data.sent} suscriptores` });
        setSendForm({ title: "", body: "", url: "", releaseId: "" });
      } else {
        setSendResult({ success: false, message: data.error || "Error al enviar" });
      }
    } catch (error) {
      setSendResult({ success: false, message: "Error de conexión" });
    }
    setIsSending(false);
  }

  async function triggerScheduledNotifications() {
    setIsSending(true);
    try {
      const res = await fetch("/api/notifications/send-upcoming", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setSendResult({ success: true, message: `Enviadas ${data.sent} notificaciones programadas` });
      } else {
        setSendResult({ success: false, message: data.error || "Error al enviar" });
      }
    } catch (error) {
      setSendResult({ success: false, message: "Error de conexión" });
    }
    setIsSending(false);
  }

  function selectRelease(release: UpcomingRelease) {
    setSendForm({
      title: `🚀 ${release.title} - Próximamente`,
      body: `${release.artistName} lanza "${release.title}" pronto. ¡No te lo pierdas!`,
      url: `/proximos/${release.id}`,
      releaseId: release.id,
    });
  }

  function getDeviceIcon(userAgent: string | null) {
    if (!userAgent) return <Globe className="w-4 h-4" />;
    if (userAgent.includes("Mobile") || userAgent.includes("Android") || userAgent.includes("iPhone")) {
      return <Smartphone className="w-4 h-4" />;
    }
    return <Globe className="w-4 h-4" />;
  }

  function getBrowserName(userAgent: string | null): string {
    if (!userAgent) return "Desconocido";
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "Otro";
  }

  const filteredSubscriptions = subscriptions.filter((sub) =>
    sub.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sub.userAgent && sub.userAgent.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase flex items-center gap-3">
            <Bell className="w-8 h-8 text-primary" />
            Notificaciones Push
          </h1>
          <p className="text-slc-muted mt-1">
            Gestiona suscripciones y envía notificaciones
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" disabled={isLoading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slc-card border border-slc-border rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-oswald">{stats?.activeSubscriptions || 0}</p>
              <p className="text-xs text-slc-muted">Suscriptores activos</p>
            </div>
          </div>
        </div>

        <div className="bg-slc-card border border-slc-border rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-oswald">{stats?.upcomingReleasesIn7Days || 0}</p>
              <p className="text-xs text-slc-muted">Lanzamientos en 7 días</p>
            </div>
          </div>
        </div>

        <div className="bg-slc-card border border-slc-border rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              stats?.vapidConfigured ? "bg-green-500/20" : "bg-red-500/20"
            )}>
              <Settings className={cn(
                "w-5 h-5",
                stats?.vapidConfigured ? "text-green-500" : "text-red-500"
              )} />
            </div>
            <div>
              <p className="text-sm font-medium">
                {stats?.vapidConfigured ? "Configurado" : "Sin configurar"}
              </p>
              <p className="text-xs text-slc-muted">VAPID Keys</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slc-border pb-4">
        <button
          onClick={() => setActiveTab("subscriptions")}
          className={cn(
            "px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2",
            activeTab === "subscriptions"
              ? "bg-primary text-white"
              : "bg-slc-card text-slc-muted hover:text-white"
          )}
        >
          <Users className="w-4 h-4" />
          Suscriptores
        </button>
        <button
          onClick={() => setActiveTab("send")}
          className={cn(
            "px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2",
            activeTab === "send"
              ? "bg-primary text-white"
              : "bg-slc-card text-slc-muted hover:text-white"
          )}
        >
          <Send className="w-4 h-4" />
          Enviar Notificación
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2",
            activeTab === "history"
              ? "bg-primary text-white"
              : "bg-slc-card text-slc-muted hover:text-white"
          )}
        >
          <History className="w-4 h-4" />
          Historial
          {history.length > 0 && (
            <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">{history.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={cn(
            "px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2",
            activeTab === "settings"
              ? "bg-primary text-white"
              : "bg-slc-card text-slc-muted hover:text-white"
          )}
        >
          <Settings className="w-4 h-4" />
          Configuración
        </button>
        <Link
          href="/admin/analytics/presaves"
          className="px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 bg-slc-card text-slc-muted hover:text-white"
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </Link>
      </div>

      {/* Subscriptions Tab */}
      {activeTab === "subscriptions" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
              <Input
                placeholder="Buscar por dispositivo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <span className="text-sm text-slc-muted">
              {filteredSubscriptions.length} de {subscriptions.length}
            </span>
          </div>

          {/* Subscriptions List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center py-12 bg-slc-card rounded-xl border border-slc-border">
              <Bell className="w-12 h-12 text-slc-muted mx-auto mb-4" />
              <p className="text-slc-muted">No hay suscriptores</p>
            </div>
          ) : (
            <div className="bg-slc-card border border-slc-border rounded-xl overflow-hidden">
              <div className="divide-y divide-slc-border">
                {filteredSubscriptions.map((sub) => (
                  <div key={sub.id} className="p-4 flex items-center gap-4 hover:bg-slc-dark/50">
                    <div className="w-10 h-10 rounded-full bg-slc-dark flex items-center justify-center">
                      {getDeviceIcon(sub.userAgent)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getBrowserName(sub.userAgent)}
                      </p>
                      <p className="text-xs text-slc-muted truncate">
                        {sub.endpoint.substring(0, 50)}...
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slc-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(sub.createdAt).toLocaleDateString("es-MX")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Último: {new Date(sub.lastUsedAt).toLocaleDateString("es-MX")}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSubscription(sub.id)}
                      className="text-slc-muted hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Send Notification Tab */}
      {activeTab === "send" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Manual Send Form */}
          <div className="bg-slc-card border border-slc-border rounded-xl p-6">
            <h3 className="font-oswald text-lg uppercase mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Enviar Notificación Manual
            </h3>

            <form onSubmit={sendNotification} className="space-y-4">
              <div>
                <label className="block text-sm text-slc-muted mb-1">Título *</label>
                <Input
                  value={sendForm.title}
                  onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
                  placeholder="🚀 ¡Nueva música!"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm text-slc-muted mb-1">Mensaje *</label>
                <textarea
                  value={sendForm.body}
                  onChange={(e) => setSendForm({ ...sendForm, body: e.target.value })}
                  placeholder="Descripción de la notificación..."
                  className="w-full h-24 px-3 py-2 bg-slc-dark border border-slc-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm text-slc-muted mb-1">URL (opcional)</label>
                <Input
                  value={sendForm.url}
                  onChange={(e) => setSendForm({ ...sendForm, url: e.target.value })}
                  placeholder="/proximos/nuevo-lanzamiento"
                />
              </div>

              {sendResult && (
                <div className={cn(
                  "p-3 rounded-lg flex items-center gap-2 text-sm",
                  sendResult.success ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                )}>
                  {sendResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {sendResult.message}
                </div>
              )}

              <Button type="submit" disabled={isSending} className="w-full">
                {isSending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Enviar a {stats?.activeSubscriptions || 0} suscriptores
              </Button>
            </form>
          </div>

          {/* Quick Send from Releases */}
          <div className="space-y-4">
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h3 className="font-oswald text-lg uppercase mb-4 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-yellow-500" />
                Envío Rápido por Lanzamiento
              </h3>

              {releases.length === 0 ? (
                <p className="text-sm text-slc-muted">No hay próximos lanzamientos</p>
              ) : (
                <div className="space-y-2">
                  {releases.slice(0, 5).map((release) => (
                    <button
                      key={release.id}
                      onClick={() => selectRelease(release)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg bg-slc-dark hover:bg-slc-dark/70 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center shrink-0">
                        <Rocket className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{release.title}</p>
                        <p className="text-xs text-slc-muted">{release.artistName}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slc-muted" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Trigger Scheduled */}
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h3 className="font-oswald text-lg uppercase mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-500" />
                Notificaciones Programadas
              </h3>
              <p className="text-sm text-slc-muted mb-4">
                Envía notificaciones automáticas para lanzamientos que se acercan (7 días, 24 horas, 1 hora antes).
              </p>
              <Button onClick={triggerScheduledNotifications} variant="outline" disabled={isSending}>
                {isSending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BellRing className="w-4 h-4 mr-2" />
                )}
                Ejecutar Ahora
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {/* History Stats */}
          {historyStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slc-card border border-slc-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Send className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-oswald">{historyStats.totalNotifications}</p>
                    <p className="text-xs text-slc-muted">Total enviadas</p>
                  </div>
                </div>
              </div>

              <div className="bg-slc-card border border-slc-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xl font-oswald">{historyStats.totalSent}</p>
                    <p className="text-xs text-slc-muted">Entregadas</p>
                  </div>
                </div>
              </div>

              <div className="bg-slc-card border border-slc-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xl font-oswald">{historyStats.totalFailed}</p>
                    <p className="text-xs text-slc-muted">Fallidas</p>
                  </div>
                </div>
              </div>

              <div className="bg-slc-card border border-slc-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-cyan-500" />
                  </div>
                  <div>
                    <p className="text-xl font-oswald">{historyStats.successRate.toFixed(1)}%</p>
                    <p className="text-xs text-slc-muted">Tasa de éxito</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 bg-slc-card rounded-xl border border-slc-border">
              <History className="w-12 h-12 text-slc-muted mx-auto mb-4" />
              <p className="text-slc-muted">No hay notificaciones en el historial</p>
              <p className="text-xs text-slc-muted mt-1">Las notificaciones enviadas aparecerán aquí</p>
            </div>
          ) : (
            <div className="bg-slc-card border border-slc-border rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slc-border bg-slc-dark/50">
                <h3 className="font-oswald text-sm uppercase text-slc-muted">
                  Historial de Notificaciones ({history.length})
                </h3>
              </div>
              <div className="divide-y divide-slc-border">
                {history.map((entry) => (
                  <div key={entry.id} className="p-4 hover:bg-slc-dark/30 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        entry.type === "manual" ? "bg-primary/20" :
                        entry.type === "automated" ? "bg-cyan-500/20" : "bg-yellow-500/20"
                      )}>
                        {entry.type === "manual" ? (
                          <Send className={cn("w-5 h-5", entry.type === "manual" ? "text-primary" : "text-cyan-500")} />
                        ) : entry.type === "automated" ? (
                          <Clock className="w-5 h-5 text-cyan-500" />
                        ) : (
                          <Calendar className="w-5 h-5 text-yellow-500" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-medium text-sm">{entry.title}</h4>
                            <p className="text-xs text-slc-muted mt-1 line-clamp-2">{entry.body}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-slc-muted">
                              {new Date(entry.sentAt).toLocaleDateString("es-MX", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          {/* Type Badge */}
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            entry.type === "manual" ? "bg-primary/20 text-primary" :
                            entry.type === "automated" ? "bg-cyan-500/20 text-cyan-500" : "bg-yellow-500/20 text-yellow-500"
                          )}>
                            {entry.type === "manual" ? "Manual" :
                             entry.type === "automated" ? "Automática" : "Programada"}
                          </span>

                          {/* Stats */}
                          <div className="flex items-center gap-1 text-xs text-green-500">
                            <CheckCircle className="w-3 h-3" />
                            <span>{entry.successCount} enviadas</span>
                          </div>
                          {entry.failedCount > 0 && (
                            <div className="flex items-center gap-1 text-xs text-red-500">
                              <XCircle className="w-3 h-3" />
                              <span>{entry.failedCount} fallidas</span>
                            </div>
                          )}

                          {/* Recipients */}
                          <div className="flex items-center gap-1 text-xs text-slc-muted">
                            <Users className="w-3 h-3" />
                            <span>{entry.recipientCount} destinatarios</span>
                          </div>

                          {/* URL if exists */}
                          {entry.url && (
                            <div className="flex items-center gap-1 text-xs text-slc-muted">
                              <Globe className="w-3 h-3" />
                              <span className="truncate max-w-[150px]">{entry.url}</span>
                            </div>
                          )}

                          {/* Release link */}
                          {entry.releaseName && (
                            <div className="flex items-center gap-1 text-xs text-primary">
                              <Rocket className="w-3 h-3" />
                              <span>{entry.releaseName}</span>
                            </div>
                          )}

                          {/* Sent by */}
                          {entry.sentBy && (
                            <div className="flex items-center gap-1 text-xs text-slc-muted">
                              <span>por {entry.sentBy}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-slc-card border border-slc-border rounded-xl p-6">
            <h3 className="font-oswald text-lg uppercase mb-4">Configuración VAPID</h3>
            <p className="text-sm text-slc-muted mb-4">
              Las claves VAPID son necesarias para enviar notificaciones push. Se configuran en las variables de entorno de Netlify.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slc-dark rounded-lg">
                <span className="text-sm">VAPID_PUBLIC_KEY</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs",
                  stats?.vapidConfigured ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                )}>
                  {stats?.vapidConfigured ? "Configurado" : "No configurado"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slc-dark rounded-lg">
                <span className="text-sm">VAPID_PRIVATE_KEY</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs",
                  stats?.vapidConfigured ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                )}>
                  {stats?.vapidConfigured ? "Configurado" : "No configurado"}
                </span>
              </div>
            </div>

            {!stats?.vapidConfigured && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-500">
                  Para generar claves VAPID, ejecuta: <code className="bg-slc-dark px-1 rounded">npx web-push generate-vapid-keys</code>
                </p>
              </div>
            )}
          </div>

          <div className="bg-slc-card border border-slc-border rounded-xl p-6">
            <h3 className="font-oswald text-lg uppercase mb-4">Cron Job</h3>
            <p className="text-sm text-slc-muted mb-4">
              Configura un cron job para enviar notificaciones automáticamente. En Netlify, usa Scheduled Functions.
            </p>

            <div className="p-3 bg-slc-dark rounded-lg font-mono text-sm">
              POST /api/notifications/send-upcoming
              <br />
              Authorization: Bearer YOUR_CRON_SECRET
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
