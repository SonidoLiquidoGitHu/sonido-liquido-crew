"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Plus,
  X,
  MessageCircle,
  Camera,
  Newspaper,
  UserPlus,
  FileText,
  RefreshCw,
  AlertTriangle,
  Server,
  Gift,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailLog {
  id: string;
  recipient: string;
  template: string;
  subject: string;
  status: "sent" | "failed" | "pending";
  sentAt: string;
  error?: string;
}

interface ProvidersStatus {
  resend: boolean;
  mandrill: boolean;
  sendgrid: boolean;
}

type EmailTemplate = "approval_message" | "approval_photo" | "newsletter" | "welcome" | "custom";

const TEMPLATES: { id: EmailTemplate; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: "approval_message",
    label: "Aprobación de Mensaje",
    icon: MessageCircle,
    description: "Email que se envía cuando se aprueba un mensaje del fan wall",
  },
  {
    id: "approval_photo",
    label: "Aprobación de Foto",
    icon: Camera,
    description: "Email que se envía cuando se aprueba una foto de concierto",
  },
  {
    id: "newsletter",
    label: "Newsletter",
    icon: Newspaper,
    description: "Boletín con novedades, lanzamientos y eventos",
  },
  {
    id: "welcome",
    label: "Bienvenida",
    icon: UserPlus,
    description: "Email de bienvenida para nuevos suscriptores",
  },
  {
    id: "custom",
    label: "Personalizado",
    icon: FileText,
    description: "Email con contenido personalizado",
  },
];

export default function EmailTestPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [providers, setProviders] = useState<ProvidersStatus>({ resend: false, mandrill: false, sendgrid: false });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form state
  const [recipients, setRecipients] = useState<string[]>([""]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>("approval_message");
  const [customSubject, setCustomSubject] = useState("");
  const [customContent, setCustomContent] = useState("");
  const [includeReward, setIncludeReward] = useState(false);
  const [rewardUrl, setRewardUrl] = useState("");
  const [rewardFileName, setRewardFileName] = useState("");

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email/test");
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.logs || []);
        setProviders(data.data.providers);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  }

  function addRecipient() {
    if (recipients.length < 5) {
      setRecipients([...recipients, ""]);
    }
  }

  function removeRecipient(index: number) {
    if (recipients.length > 1) {
      setRecipients(recipients.filter((_, i) => i !== index));
    }
  }

  function updateRecipient(index: number, value: string) {
    const updated = [...recipients];
    updated[index] = value;
    setRecipients(updated);
  }

  async function generatePreview() {
    try {
      const res = await fetch("/api/admin/community/email-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            sendApprovalEmail: true,
            emailSubject: customSubject || undefined,
            emailMessage: customContent || "Este es un email de prueba.",
            includeReward,
            rewardTitle: "Regalo de Prueba",
            rewardDescription: "Descarga exclusiva de prueba:",
            rewardDownloadUrl: rewardUrl,
            rewardFileName,
          },
          contentType: selectedTemplate === "approval_photo" ? "memory" : "message",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewHtml(data.data.html);
        setShowPreview(true);
      }
    } catch (error) {
      console.error("Error generating preview:", error);
    }
  }

  async function sendTestEmails() {
    const validRecipients = recipients.filter((r) => r.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.trim()));

    if (validRecipients.length === 0) {
      alert("Agrega al menos un email válido");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: validRecipients.map((r) => r.trim()),
          template: selectedTemplate,
          subject: customSubject || undefined,
          customContent: selectedTemplate === "custom" ? customContent : undefined,
          includeReward,
          rewardUrl: includeReward ? rewardUrl : undefined,
          rewardFileName: includeReward ? rewardFileName : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(data.message);
        fetchLogs(); // Refresh logs
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error sending:", error);
      alert("Error al enviar emails");
    } finally {
      setSending(false);
    }
  }

  const hasConfiguredProvider = providers.resend || providers.mandrill || providers.sendgrid;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-slc-muted hover:text-white mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Dashboard
        </Link>
        <h1 className="font-oswald text-3xl uppercase flex items-center gap-3">
          <Mail className="w-8 h-8 text-primary" />
          Pruebas de Email
        </h1>
        <p className="text-slc-muted mt-1">
          Envía emails de prueba para verificar la configuración y entrega
        </p>
      </div>

      {/* Provider Status */}
      <div className="bg-slc-card border border-slc-border rounded-xl p-4 mb-8">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Server className="w-4 h-4 text-slc-muted" />
          Proveedores de Email Configurados
        </h3>
        <div className="flex flex-wrap gap-3">
          <ProviderBadge name="Resend" configured={providers.resend} />
          <ProviderBadge name="Mandrill" configured={providers.mandrill} />
          <ProviderBadge name="SendGrid" configured={providers.sendgrid} />
        </div>
        {!hasConfiguredProvider && (
          <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-500">
              No hay proveedores de email configurados. Agrega RESEND_API_KEY, MANDRILL_API_KEY, o
              SENDGRID_API_KEY a las variables de entorno.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Send Test Email Form */}
        <div className="bg-slc-card border border-slc-border rounded-xl p-6">
          <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Enviar Email de Prueba
          </h2>

          <div className="space-y-5">
            {/* Recipients */}
            <div>
              <label className="block text-sm text-slc-muted mb-2">
                Destinatarios (máx. 5)
              </label>
              <div className="space-y-2">
                {recipients.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => updateRecipient(index, e.target.value)}
                      placeholder="email@ejemplo.com"
                      className="flex-1"
                    />
                    {recipients.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRecipient(index)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {recipients.length < 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addRecipient}
                  className="mt-2 text-slc-muted hover:text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar otro
                </Button>
              )}
            </div>

            {/* Template Selection */}
            <div>
              <label className="block text-sm text-slc-muted mb-2">
                Plantilla de Email
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                        selectedTemplate === template.id
                          ? "bg-primary/10 border-primary"
                          : "border-slc-border hover:border-primary/50"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5 mt-0.5 flex-shrink-0",
                          selectedTemplate === template.id ? "text-primary" : "text-slc-muted"
                        )}
                      />
                      <div>
                        <p
                          className={cn(
                            "font-medium text-sm",
                            selectedTemplate === template.id ? "text-white" : "text-slc-muted"
                          )}
                        >
                          {template.label}
                        </p>
                        <p className="text-xs text-slc-muted mt-0.5 line-clamp-2">
                          {template.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Subject */}
            <div>
              <label className="block text-sm text-slc-muted mb-2">
                Asunto personalizado (opcional)
              </label>
              <Input
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Dejar vacío para usar el asunto por defecto"
              />
            </div>

            {/* Custom Content (for custom template) */}
            {selectedTemplate === "custom" && (
              <div>
                <label className="block text-sm text-slc-muted mb-2">
                  Contenido del email (HTML permitido)
                </label>
                <textarea
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  placeholder="<p>Escribe tu contenido aquí...</p>"
                  rows={4}
                  className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none font-mono text-sm"
                />
              </div>
            )}

            {/* Include Reward */}
            <div className="space-y-3 pt-2 border-t border-slc-border">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeReward}
                  onChange={(e) => setIncludeReward(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <Gift className="w-4 h-4 text-primary" />
                <span className="text-sm">Incluir sección de regalo</span>
              </label>

              {includeReward && (
                <div className="pl-7 space-y-3">
                  <Input
                    value={rewardUrl}
                    onChange={(e) => setRewardUrl(e.target.value)}
                    placeholder="URL de descarga (https://...)"
                  />
                  <Input
                    value={rewardFileName}
                    onChange={(e) => setRewardFileName(e.target.value)}
                    placeholder="Nombre del archivo (ej: track_exclusivo.mp3)"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={generatePreview}
                className="flex-1"
              >
                <Eye className="w-4 h-4 mr-2" />
                Vista Previa
              </Button>
              <Button
                onClick={sendTestEmails}
                disabled={sending || !hasConfiguredProvider}
                className="flex-1"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Enviar Prueba
              </Button>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-slc-card border border-slc-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
              <Clock className="w-5 h-5 text-slc-muted" />
              Historial de Envíos
            </h2>
            <Button variant="ghost" size="sm" onClick={fetchLogs}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-slc-muted mx-auto mb-3" />
              <p className="text-slc-muted">No hay emails de prueba enviados</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    log.status === "sent"
                      ? "bg-green-500/5 border-green-500/20"
                      : "bg-red-500/5 border-red-500/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {log.status === "sent" ? (
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{log.recipient}</p>
                      <p className="text-xs text-slc-muted truncate">{log.subject}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slc-muted">
                        <span className="px-1.5 py-0.5 bg-slc-border rounded">
                          {log.template}
                        </span>
                        <span>
                          {new Date(log.sentAt).toLocaleString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {log.error && (
                        <p className="text-xs text-red-400 mt-1 truncate">
                          Error: {log.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] bg-slc-card border border-slc-border rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slc-border">
              <h2 className="font-oswald text-xl uppercase">Vista Previa del Email</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-900">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full min-h-[600px]"
                title="Email Preview"
              />
            </div>
            <div className="p-4 border-t border-slc-border flex justify-end">
              <Button onClick={() => setShowPreview(false)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Provider Badge Component
function ProviderBadge({ name, configured }: { name: string; configured: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
        configured
          ? "bg-green-500/10 text-green-500 border border-green-500/30"
          : "bg-slc-dark text-slc-muted border border-slc-border"
      )}
    >
      {configured ? (
        <CheckCircle className="w-3.5 h-3.5" />
      ) : (
        <XCircle className="w-3.5 h-3.5" />
      )}
      {name}
    </div>
  );
}
