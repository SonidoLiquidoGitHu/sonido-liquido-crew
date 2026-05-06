"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Camera,
  CheckCircle,
  XCircle,
  Star,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  Mail,
  Gift,
  Settings,
  RefreshCw,
  Globe,
  User,
  Calendar,
  Filter,
  Send,
  CheckSquare,
  Square,
  X,
  MonitorPlay,
  Shield,
  TestTube,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FanMessage {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  country?: string;
  city?: string;
  message: string;
  reaction?: string;
  artistId?: string;
  releaseId?: string;
  eventId?: string;
  isApproved: boolean;
  isFeatured: boolean;
  isHidden: boolean;
  createdAt: string;
}

interface ConcertMemory {
  id: string;
  submitterName: string;
  submitterEmail?: string;
  submitterInstagram?: string;
  eventId?: string;
  eventName?: string;
  eventCity?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  isApproved: boolean;
  isFeatured: boolean;
  isHidden: boolean;
  createdAt: string;
}

type ContentType = "messages" | "memories";
type FilterStatus = "pending" | "approved" | "all";

export default function CommunityModerationPage() {
  const [activeTab, setActiveTab] = useState<ContentType>("messages");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("pending");
  const [messages, setMessages] = useState<FanMessage[]>([]);
  const [memories, setMemories] = useState<ConcertMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Bulk selection state
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Email preview state
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState("");
  const [previewContentType, setPreviewContentType] = useState<"message" | "memory">("message");

  // Email settings state
  const [emailSettings, setEmailSettings] = useState({
    sendApprovalEmail: true,
    emailSubject: "¡Tu mensaje ha sido publicado en Sonido Líquido!",
    emailMessage: "Gracias por formar parte de nuestra comunidad. Tu mensaje ya está visible en el Fan Wall.",
    includeReward: false,
    rewardTitle: "Regalo sorpresa",
    rewardDescription: "Como agradecimiento, aquí tienes una descarga exclusiva:",
    rewardDownloadUrl: "",
    rewardFileName: "",
  });

  useEffect(() => {
    fetchContent();
    loadEmailSettings();
  }, [activeTab, filterStatus]);

  async function fetchContent() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: activeTab,
        status: filterStatus,
      });
      const res = await fetch(`/api/admin/community?${params}`);
      const data = await res.json();

      if (data.success) {
        if (activeTab === "messages") {
          setMessages(data.data.messages || []);
        } else {
          setMemories(data.data.memories || []);
        }
      }
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadEmailSettings() {
    try {
      const res = await fetch("/api/admin/community/email-settings");
      const data = await res.json();
      if (data.success && data.data) {
        setEmailSettings(data.data);
      }
    } catch (error) {
      console.error("Error loading email settings:", error);
    }
  }

  async function saveEmailSettings() {
    try {
      const res = await fetch("/api/admin/community/email-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailSettings),
      });
      const data = await res.json();
      if (data.success) {
        setShowSettings(false);
      }
    } catch (error) {
      console.error("Error saving email settings:", error);
    }
  }

  // Generate email preview
  async function generateEmailPreview(contentType: "message" | "memory") {
    try {
      const res = await fetch("/api/admin/community/email-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: emailSettings,
          contentType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailPreviewHtml(data.data.html);
        setPreviewContentType(contentType);
        setShowEmailPreview(true);
      }
    } catch (error) {
      console.error("Error generating preview:", error);
    }
  }

  // Toggle selection
  function toggleMessageSelection(id: string) {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMessages(newSelected);
  }

  function toggleMemorySelection(id: string) {
    const newSelected = new Set(selectedMemories);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMemories(newSelected);
  }

  // Select all
  function selectAllMessages() {
    if (selectedMessages.size === messages.length) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(new Set(messages.map(m => m.id)));
    }
  }

  function selectAllMemories() {
    if (selectedMemories.size === memories.length) {
      setSelectedMemories(new Set());
    } else {
      setSelectedMemories(new Set(memories.map(m => m.id)));
    }
  }

  // Bulk actions
  async function bulkAction(
    type: "message" | "memory",
    action: "approve" | "reject" | "delete"
  ) {
    const selected = type === "message" ? selectedMessages : selectedMemories;
    if (selected.size === 0) return;

    const confirmMsg = action === "delete"
      ? `¿Eliminar ${selected.size} ${type === "message" ? "mensajes" : "fotos"} permanentemente?`
      : `¿${action === "approve" ? "Aprobar" : "Rechazar"} ${selected.size} ${type === "message" ? "mensajes" : "fotos"}?`;

    if (!confirm(confirmMsg)) return;

    setBulkActionLoading(true);
    try {
      for (const id of selected) {
        if (action === "delete") {
          await fetch(`/api/admin/community?type=${type}&id=${id}`, {
            method: "DELETE",
          });
        } else {
          const items = type === "message" ? messages : memories;
          const item = items.find(i => i.id === id);
          const email = type === "message"
            ? (item as FanMessage)?.email
            : (item as ConcertMemory)?.submitterEmail;

          await fetch("/api/admin/community", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type,
              id,
              action,
              sendEmail: action === "approve" && emailSettings.sendApprovalEmail && email,
              recipientEmail: email,
            }),
          });
        }
      }

      // Clear selection and refresh
      if (type === "message") {
        setSelectedMessages(new Set());
      } else {
        setSelectedMemories(new Set());
      }
      fetchContent();
    } catch (error) {
      console.error("Bulk action error:", error);
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function handleAction(
    type: "message" | "memory",
    id: string,
    action: "approve" | "reject" | "feature" | "unfeature" | "hide" | "delete",
    email?: string
  ) {
    setActionLoading(`${type}-${id}-${action}`);
    try {
      if (action === "delete") {
        await fetch(`/api/admin/community?type=${type}&id=${id}`, {
          method: "DELETE",
        });
      } else {
        await fetch("/api/admin/community", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            id,
            action,
            sendEmail: action === "approve" && emailSettings.sendApprovalEmail && email,
            emailSettings: action === "approve" ? emailSettings : undefined,
            recipientEmail: email,
          }),
        });
      }
      fetchContent();
    } catch (error) {
      console.error("Error performing action:", error);
    } finally {
      setActionLoading(null);
    }
  }

  const pendingCount = activeTab === "messages"
    ? messages.filter(m => !m.isApproved && !m.isHidden).length
    : memories.filter(m => !m.isApproved && !m.isHidden).length;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-primary" />
            Moderación de Comunidad
          </h1>
          <p className="text-slc-muted mt-1">
            Aprueba o rechaza contenido enviado por fans
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => fetchContent()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          <Link href="/admin/community/trusted">
            <Button variant="outline" className="border-green-500/50 text-green-500 hover:bg-green-500/10">
              <Shield className="w-4 h-4 mr-2" />
              Confianza
            </Button>
          </Link>
          <Link href="/admin/email-test">
            <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
              <TestTube className="w-4 h-4 mr-2" />
              Test Email
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Config
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveTab("messages")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
            activeTab === "messages"
              ? "bg-primary text-white"
              : "bg-slc-card text-slc-muted hover:text-white"
          )}
        >
          <MessageCircle className="w-4 h-4" />
          Fan Wall
        </button>
        <button
          onClick={() => setActiveTab("memories")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
            activeTab === "memories"
              ? "bg-pink-500 text-white"
              : "bg-slc-card text-slc-muted hover:text-white"
          )}
        >
          <Camera className="w-4 h-4" />
          Fotos de Conciertos
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-slc-muted" />
        <span className="text-sm text-slc-muted">Filtrar:</span>
        {(["pending", "approved", "all"] as FilterStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={cn(
              "px-3 py-1 text-sm rounded-full transition-colors",
              filterStatus === status
                ? "bg-slc-border text-white"
                : "text-slc-muted hover:text-white"
            )}
          >
            {status === "pending" ? "Pendientes" : status === "approved" ? "Aprobados" : "Todos"}
            {status === "pending" && pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      {((activeTab === "messages" && selectedMessages.size > 0) ||
        (activeTab === "memories" && selectedMemories.size > 0)) && (
        <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-primary/10 border border-primary/20 rounded-xl animate-in slide-in-from-top-2">
          <span className="font-medium">
            {activeTab === "messages" ? selectedMessages.size : selectedMemories.size} seleccionado(s)
          </span>
          <div className="flex-1" />
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            disabled={bulkActionLoading}
            onClick={() => bulkAction(activeTab === "messages" ? "message" : "memory", "approve")}
          >
            {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
            Aprobar todos
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={bulkActionLoading}
            onClick={() => bulkAction(activeTab === "messages" ? "message" : "memory", "reject")}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Rechazar todos
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-500 border-red-500/50 hover:bg-red-500/10"
            disabled={bulkActionLoading}
            onClick={() => bulkAction(activeTab === "messages" ? "message" : "memory", "delete")}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Eliminar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (activeTab === "messages") setSelectedMessages(new Set());
              else setSelectedMemories(new Set());
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Select All */}
      {!loading && (activeTab === "messages" ? messages.length > 0 : memories.length > 0) && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={activeTab === "messages" ? selectAllMessages : selectAllMemories}
            className="flex items-center gap-2 text-sm text-slc-muted hover:text-white transition-colors"
          >
            {(activeTab === "messages" && selectedMessages.size === messages.length && messages.length > 0) ||
             (activeTab === "memories" && selectedMemories.size === memories.length && memories.length > 0) ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            Seleccionar todo ({activeTab === "messages" ? messages.length : memories.length})
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : activeTab === "messages" ? (
        <MessagesGrid
          messages={messages}
          onAction={handleAction}
          actionLoading={actionLoading}
          emailEnabled={emailSettings.sendApprovalEmail}
          selectedIds={selectedMessages}
          onToggleSelect={toggleMessageSelection}
        />
      ) : (
        <MemoriesGrid
          memories={memories}
          onAction={handleAction}
          actionLoading={actionLoading}
          emailEnabled={emailSettings.sendApprovalEmail}
          selectedIds={selectedMemories}
          onToggleSelect={toggleMemorySelection}
        />
      )}

      {/* Email Settings Modal */}
      {showSettings && (
        <EmailSettingsModal
          settings={emailSettings}
          onChange={setEmailSettings}
          onSave={saveEmailSettings}
          onClose={() => setShowSettings(false)}
          onPreview={generateEmailPreview}
        />
      )}

      {/* Email Preview Modal */}
      {showEmailPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] bg-slc-card border border-slc-border rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slc-border">
              <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
                <MonitorPlay className="w-5 h-5 text-primary" />
                Vista Previa del Email ({previewContentType === "message" ? "Mensaje" : "Foto"})
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowEmailPreview(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-900">
              <iframe
                srcDoc={emailPreviewHtml}
                className="w-full h-full min-h-[600px]"
                title="Email Preview"
              />
            </div>
            <div className="p-4 border-t border-slc-border flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowEmailPreview(false)}>
                Cerrar
              </Button>
              <Button onClick={() => {
                setShowEmailPreview(false);
                setShowSettings(true);
              }}>
                Editar Configuración
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Messages Grid Component
function MessagesGrid({
  messages,
  onAction,
  actionLoading,
  emailEnabled,
  selectedIds,
  onToggleSelect,
}: {
  messages: FanMessage[];
  onAction: (type: "message" | "memory", id: string, action: "approve" | "reject" | "feature" | "unfeature" | "hide" | "delete", email?: string) => void;
  actionLoading: string | null;
  emailEnabled: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-12 bg-slc-card rounded-xl">
        <MessageCircle className="w-12 h-12 text-slc-muted mx-auto mb-4" />
        <p className="text-slc-muted">No hay mensajes en esta categoría</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            "bg-slc-card border rounded-xl p-5 transition-all",
            msg.isApproved && !msg.isHidden
              ? "border-green-500/30"
              : msg.isHidden
              ? "border-red-500/30 opacity-60"
              : "border-yellow-500/30",
            selectedIds.has(msg.id) && "ring-2 ring-primary"
          )}
        >
          <div className="flex gap-4">
            {/* Selection Checkbox */}
            <button
              onClick={() => onToggleSelect(msg.id)}
              className={cn(
                "w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-colors",
                selectedIds.has(msg.id)
                  ? "bg-primary text-white"
                  : "bg-slc-dark hover:bg-slc-border"
              )}
            >
              {selectedIds.has(msg.id) && <CheckCircle className="w-4 h-4" />}
            </button>

            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-slc-dark flex items-center justify-center flex-shrink-0">
              {msg.avatarUrl ? (
                <img src={msg.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-slc-muted" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-white">{msg.displayName}</span>
                {msg.reaction && <span className="text-lg">{msg.reaction}</span>}
                {msg.isFeatured && (
                  <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                    Destacado
                  </span>
                )}
              </div>

              {(msg.city || msg.country) && (
                <p className="text-xs text-slc-muted flex items-center gap-1 mb-2">
                  <Globe className="w-3 h-3" />
                  {[msg.city, msg.country].filter(Boolean).join(", ")}
                </p>
              )}

              <p className="text-white/90 mb-3">"{msg.message}"</p>

              <div className="flex items-center gap-4 text-xs text-slc-muted">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(msg.createdAt).toLocaleDateString("es-MX")}
                </span>
                {msg.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {msg.email}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              {!msg.isApproved && !msg.isHidden && (
                <>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => onAction("message", msg.id, "approve", msg.email)}
                    disabled={actionLoading === `message-${msg.id}-approve`}
                  >
                    {actionLoading === `message-${msg.id}-approve` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Aprobar
                        {msg.email && emailEnabled && (
                          <Mail className="w-3 h-3 ml-1 opacity-60" />
                        )}
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onAction("message", msg.id, "reject")}
                    disabled={actionLoading === `message-${msg.id}-reject`}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Rechazar
                  </Button>
                </>
              )}

              {msg.isApproved && (
                <>
                  <Button
                    size="sm"
                    variant={msg.isFeatured ? "outline" : "default"}
                    className={msg.isFeatured ? "" : "bg-yellow-600 hover:bg-yellow-700"}
                    onClick={() => onAction("message", msg.id, msg.isFeatured ? "unfeature" : "feature")}
                  >
                    <Star className={cn("w-4 h-4 mr-1", msg.isFeatured && "fill-current")} />
                    {msg.isFeatured ? "Quitar" : "Destacar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAction("message", msg.id, "hide")}
                  >
                    <EyeOff className="w-4 h-4 mr-1" />
                    Ocultar
                  </Button>
                </>
              )}

              {msg.isHidden && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAction("message", msg.id, "approve", msg.email)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Mostrar
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  if (confirm("¿Eliminar este mensaje permanentemente?")) {
                    onAction("message", msg.id, "delete");
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Memories Grid Component
function MemoriesGrid({
  memories,
  onAction,
  actionLoading,
  emailEnabled,
  selectedIds,
  onToggleSelect,
}: {
  memories: ConcertMemory[];
  onAction: (type: "message" | "memory", id: string, action: "approve" | "reject" | "feature" | "unfeature" | "hide" | "delete", email?: string) => void;
  actionLoading: string | null;
  emailEnabled: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  if (memories.length === 0) {
    return (
      <div className="text-center py-12 bg-slc-card rounded-xl">
        <Camera className="w-12 h-12 text-slc-muted mx-auto mb-4" />
        <p className="text-slc-muted">No hay fotos en esta categoría</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {memories.map((memory) => (
        <div
          key={memory.id}
          className={cn(
            "bg-slc-card border rounded-xl overflow-hidden transition-all",
            memory.isApproved && !memory.isHidden
              ? "border-green-500/30"
              : memory.isHidden
              ? "border-red-500/30 opacity-60"
              : "border-yellow-500/30",
            selectedIds.has(memory.id) && "ring-2 ring-primary"
          )}
        >
          {/* Image */}
          <div className="relative aspect-square">
            <img
              src={memory.thumbnailUrl || memory.imageUrl}
              alt=""
              className="w-full h-full object-cover"
            />
            {/* Selection Checkbox */}
            <button
              onClick={() => onToggleSelect(memory.id)}
              className={cn(
                "absolute top-2 left-2 w-6 h-6 rounded flex items-center justify-center transition-colors z-10",
                selectedIds.has(memory.id)
                  ? "bg-primary text-white"
                  : "bg-black/50 text-white hover:bg-black/70"
              )}
            >
              {selectedIds.has(memory.id) && <CheckCircle className="w-4 h-4" />}
            </button>
            {memory.isFeatured && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-primary text-white text-xs rounded-full flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                Destacado
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-white">{memory.submitterName}</span>
              {memory.submitterInstagram && (
                <span className="text-xs text-pink-500">@{memory.submitterInstagram}</span>
              )}
            </div>

            {memory.eventName && (
              <p className="text-xs text-slc-muted mb-2">
                {memory.eventName} {memory.eventCity && `- ${memory.eventCity}`}
              </p>
            )}

            {memory.caption && (
              <p className="text-sm text-white/80 mb-3 line-clamp-2">"{memory.caption}"</p>
            )}

            <div className="flex items-center gap-2 text-xs text-slc-muted mb-4">
              <Calendar className="w-3 h-3" />
              {new Date(memory.createdAt).toLocaleDateString("es-MX")}
              {memory.submitterEmail && (
                <>
                  <Mail className="w-3 h-3 ml-2" />
                  {memory.submitterEmail}
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {!memory.isApproved && !memory.isHidden && (
                <>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => onAction("memory", memory.id, "approve", memory.submitterEmail)}
                    disabled={actionLoading === `memory-${memory.id}-approve`}
                  >
                    {actionLoading === `memory-${memory.id}-approve` ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Aprobar
                        {memory.submitterEmail && emailEnabled && (
                          <Mail className="w-3 h-3 ml-1 opacity-60" />
                        )}
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onAction("memory", memory.id, "reject")}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Rechazar
                  </Button>
                </>
              )}

              {memory.isApproved && (
                <>
                  <Button
                    size="sm"
                    variant={memory.isFeatured ? "outline" : "default"}
                    className={memory.isFeatured ? "" : "bg-yellow-600 hover:bg-yellow-700"}
                    onClick={() => onAction("memory", memory.id, memory.isFeatured ? "unfeature" : "feature")}
                  >
                    <Star className={cn("w-4 h-4 mr-1", memory.isFeatured && "fill-current")} />
                    {memory.isFeatured ? "Quitar" : "Destacar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAction("memory", memory.id, "hide")}
                  >
                    <EyeOff className="w-4 h-4 mr-1" />
                    Ocultar
                  </Button>
                </>
              )}

              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-400"
                onClick={() => {
                  if (confirm("¿Eliminar esta foto permanentemente?")) {
                    onAction("memory", memory.id, "delete");
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Email Settings Modal
interface EmailSettings {
  sendApprovalEmail: boolean;
  emailSubject: string;
  emailMessage: string;
  includeReward: boolean;
  rewardTitle: string;
  rewardDescription: string;
  rewardDownloadUrl: string;
  rewardFileName: string;
}

function EmailSettingsModal({
  settings,
  onChange,
  onSave,
  onClose,
  onPreview,
}: {
  settings: EmailSettings;
  onChange: (settings: EmailSettings) => void;
  onSave: () => void;
  onClose: () => void;
  onPreview: (contentType: "message" | "memory") => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slc-card border border-slc-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slc-border">
          <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Configuración de Email
          </h2>
          <button onClick={onClose} className="text-slc-muted hover:text-white">
            ×
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {/* Enable Email */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.sendApprovalEmail}
              onChange={(e) => onChange({ ...settings, sendApprovalEmail: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <div>
              <span className="font-medium text-white">Enviar email al aprobar</span>
              <p className="text-xs text-slc-muted">
                Notifica al usuario cuando su contenido es aprobado
              </p>
            </div>
          </label>

          {settings.sendApprovalEmail && (
            <>
              {/* Subject */}
              <div>
                <label className="block text-sm text-slc-muted mb-2">Asunto del email</label>
                <input
                  type="text"
                  value={settings.emailSubject}
                  onChange={(e) => onChange({ ...settings, emailSubject: e.target.value })}
                  className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm text-slc-muted mb-2">Mensaje</label>
                <textarea
                  value={settings.emailMessage}
                  onChange={(e) => onChange({ ...settings, emailMessage: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Reward Section */}
              <div className="pt-4 border-t border-slc-border">
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={settings.includeReward}
                    onChange={(e) => onChange({ ...settings, includeReward: e.target.checked })}
                    className="w-5 h-5 rounded"
                  />
                  <div>
                    <span className="font-medium text-white flex items-center gap-2">
                      <Gift className="w-4 h-4 text-primary" />
                      Incluir regalo sorpresa
                    </span>
                    <p className="text-xs text-slc-muted">
                      Agrega un archivo de descarga como recompensa
                    </p>
                  </div>
                </label>

                {settings.includeReward && (
                  <div className="space-y-4 pl-8">
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Título del regalo</label>
                      <input
                        type="text"
                        value={settings.rewardTitle}
                        onChange={(e) => onChange({ ...settings, rewardTitle: e.target.value })}
                        placeholder="Ej: Track exclusivo"
                        className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Descripción</label>
                      <input
                        type="text"
                        value={settings.rewardDescription}
                        onChange={(e) => onChange({ ...settings, rewardDescription: e.target.value })}
                        placeholder="Ej: Como agradecimiento..."
                        className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slc-muted mb-2">
                        URL de descarga (Dropbox, etc.)
                      </label>
                      <input
                        type="url"
                        value={settings.rewardDownloadUrl}
                        onChange={(e) => onChange({ ...settings, rewardDownloadUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Nombre del archivo</label>
                      <input
                        type="text"
                        value={settings.rewardFileName}
                        onChange={(e) => onChange({ ...settings, rewardFileName: e.target.value })}
                        placeholder="Ej: track_exclusivo.mp3"
                        className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 p-6 border-t border-slc-border">
          {/* Preview Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onPreview("message")}>
              <MonitorPlay className="w-4 h-4 mr-1" />
              Vista Previa (Mensaje)
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPreview("memory")}>
              <MonitorPlay className="w-4 h-4 mr-1" />
              Vista Previa (Foto)
            </Button>
          </div>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSave}>
            <Send className="w-4 h-4 mr-2" />
            Guardar configuración
          </Button>
        </div>
      </div>
    </div>
  );
}
