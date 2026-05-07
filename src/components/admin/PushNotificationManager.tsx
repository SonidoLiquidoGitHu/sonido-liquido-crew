"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Bell,
  BellRing,
  Send,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Trash2,
  Smartphone,
  Sparkles,
  Settings,
  RefreshCw,
} from "lucide-react";

interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledFor: string;
  status: string;
  notificationType: string;
}

interface PushNotificationManagerProps {
  releaseTitle?: string;
  releaseSlug?: string;
  releaseDate?: Date;
  coverImageUrl?: string;
  className?: string;
}

export function PushNotificationManager({
  releaseTitle,
  releaseSlug,
  releaseDate,
  coverImageUrl,
  className = "",
}: PushNotificationManagerProps) {
  const [isConfigured, setIsConfigured] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [notificationType, setNotificationType] = useState<"general" | "release" | "presave" | "event">("general");

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/admin/push-notifications");
      const data = await res.json();

      if (data.success) {
        setIsConfigured(data.data.isConfigured);
        setSubscriberCount(data.data.subscriberCount);
        setScheduledNotifications(data.data.scheduledNotifications || []);
      }
    } catch (err) {
      console.error("Error fetching push stats:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!title || !body) {
      setError("Título y mensaje son requeridos");
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/push-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          url: url || (releaseSlug ? `/proximos/${releaseSlug}` : "/"),
          icon: coverImageUrl,
          notificationType,
          schedule: scheduleDate || undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      if (data.data.scheduled) {
        setSuccess(`Notificación programada para ${new Date(data.data.scheduledFor).toLocaleString("es-MX")}`);
        fetchStats();
      } else {
        setSuccess(`Notificación enviada a ${data.data.sent} suscriptores (${data.data.failed} fallidos)`);
      }

      // Clear form
      setTitle("");
      setBody("");
      setUrl("");
      setScheduleDate("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  // Prefill for release notifications
  function prefillReleaseNotification(type: "announcement" | "reminder" | "release") {
    if (!releaseTitle) return;

    switch (type) {
      case "announcement":
        setTitle(`🎵 Próximamente: ${releaseTitle}`);
        setBody(`Nuevo lanzamiento de Sonido Líquido Crew. ¡Haz pre-save ahora!`);
        setNotificationType("presave");
        break;
      case "reminder":
        setTitle(`⏰ ¡No te lo pierdas!`);
        setBody(`${releaseTitle} sale pronto. ¿Ya hiciste pre-save?`);
        setNotificationType("presave");
        break;
      case "release":
        setTitle(`🚀 ¡Ya disponible: ${releaseTitle}!`);
        setBody(`Nueva música de Sonido Líquido Crew. ¡Escúchala ahora!`);
        setNotificationType("release");
        break;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-oswald text-xl uppercase flex items-center gap-2">
            <BellRing className="w-5 h-5 text-primary" />
            Notificaciones Push
          </h3>
          <p className="text-sm text-slc-muted mt-1">
            Envía notificaciones a dispositivos suscritos
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchStats}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 rounded-xl border ${isConfigured ? "bg-green-500/10 border-green-500/20" : "bg-yellow-500/10 border-yellow-500/20"}`}>
          <div className="flex items-center gap-2 mb-2">
            {isConfigured ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            )}
            <span className="text-sm font-medium">
              {isConfigured ? "Configurado" : "No configurado"}
            </span>
          </div>
          <p className="text-xs text-slc-muted">
            {isConfigured
              ? "VAPID keys están configuradas"
              : "Configura VAPID keys en .env"}
          </p>
        </div>

        <div className="p-4 bg-slc-card rounded-xl border border-slc-border">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-2xl font-oswald">{subscriberCount}</span>
          </div>
          <p className="text-xs text-slc-muted">Suscriptores activos</p>
        </div>
      </div>

      {/* Quick actions for releases */}
      {releaseTitle && (
        <div className="p-4 bg-slc-dark rounded-xl border border-slc-border">
          <h4 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Plantillas Rápidas
          </h4>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => prefillReleaseNotification("announcement")}
            >
              <Bell className="w-4 h-4 mr-1" />
              Anuncio
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => prefillReleaseNotification("reminder")}
            >
              <Clock className="w-4 h-4 mr-1" />
              Recordatorio
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => prefillReleaseNotification("release")}
            >
              <Send className="w-4 h-4 mr-1" />
              Lanzamiento
            </Button>
          </div>
        </div>
      )}

      {/* Notification form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="🎵 Nueva música disponible"
            className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Mensaje</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Descripción de la notificación..."
            rows={3}
            className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">URL de destino</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/proximos/nuevo-single"
              className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tipo</label>
            <select
              value={notificationType}
              onChange={(e) => setNotificationType(e.target.value as any)}
              className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="general">General</option>
              <option value="release">Lanzamiento</option>
              <option value="presave">Pre-save</option>
              <option value="event">Evento</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Programar (opcional)
          </label>
          <input
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
          />
          <p className="text-xs text-slc-muted mt-1">
            Deja vacío para enviar inmediatamente
          </p>
        </div>
      </div>

      {/* Error/Success messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Send button */}
      <Button
        onClick={handleSend}
        disabled={!isConfigured || sending || !title || !body}
        className="w-full"
      >
        {sending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Enviando...
          </>
        ) : scheduleDate ? (
          <>
            <Calendar className="w-4 h-4 mr-2" />
            Programar Notificación
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Enviar Ahora ({subscriberCount} suscriptores)
          </>
        )}
      </Button>

      {/* Scheduled notifications */}
      {scheduledNotifications.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-oswald text-sm uppercase flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Notificaciones Programadas
          </h4>
          <div className="space-y-2">
            {scheduledNotifications.map((notification) => (
              <div
                key={notification.id}
                className="p-3 bg-slc-dark rounded-lg border border-slc-border flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-sm">{notification.title}</p>
                  <p className="text-xs text-slc-muted">
                    {new Date(notification.scheduledFor).toLocaleString("es-MX")}
                  </p>
                </div>
                <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-xs">
                  {notification.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup instructions */}
      {!isConfigured && (
        <div className="p-4 bg-slc-card/50 rounded-xl border border-slc-border">
          <h4 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            Configuración Requerida
          </h4>
          <ol className="text-sm text-slc-muted space-y-2 list-decimal list-inside">
            <li>
              Genera VAPID keys:{" "}
              <code className="px-1 py-0.5 bg-slc-dark rounded text-xs">
                npx web-push generate-vapid-keys
              </code>
            </li>
            <li>Agrega las keys a tu archivo .env</li>
            <li>Reinicia el servidor</li>
          </ol>
        </div>
      )}
    </div>
  );
}

export default PushNotificationManager;
