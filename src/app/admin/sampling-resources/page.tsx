"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircle,
  Check,
  ExternalLink,
  GripVertical,
  Headphones,
  Link2,
  Loader2,
  Mail,
  MousePointerClick,
  Music,
  Music2,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  TrendingUp,
  X,
  Youtube,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// ===========================================
// Types
// ===========================================

type ResourceType = "video" | "channel" | "playlist";

interface SamplingResource {
  id: string;
  type: ResourceType;
  title: string;
  url: string;
  category: string;
  description: string;
  tags: string[];
  videoId?: string;
  playlistId?: string;
  handle?: string;
  // Analytics fields (from migration 0022)
  viewCount?: number;
  clickCount?: number;
  accessCount?: number;
}

type GateType = "email" | "presave" | "both";

interface SamplingData {
  title: string;
  subtitle: string;
  internalNote: string;
  gateType: GateType;
  presaveUrl: string;
  presaveCta: string;
  resources: SamplingResource[];
}

// ===========================================
// Constants
// ===========================================

const TYPE_META: Record<
  ResourceType,
  { label: string; color: string; icon: typeof Youtube }
> = {
  channel: {
    label: "Canal",
    color: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    icon: Youtube,
  },
  video: {
    label: "Video",
    color: "bg-red-500/15 text-red-400 border-red-500/30",
    icon: Youtube,
  },
  playlist: {
    label: "Playlist",
    color: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    icon: Music2,
  },
};

const RESOURCE_TYPES: ResourceType[] = ["channel", "video", "playlist"];

const GATE_TYPE_META: Record<
  GateType,
  { label: string; description: string; icon: typeof Mail }
> = {
  email: {
    label: "Email",
    description: "Requiere email para desbloquear",
    icon: Mail,
  },
  presave: {
    label: "Pre-save",
    description: "Requiere pre-save en Spotify",
    icon: Music,
  },
  both: {
    label: "Ambos",
    description: "El usuario elige: email o pre-save",
    icon: Settings,
  },
};

const GATE_TYPES: GateType[] = ["email", "presave", "both"];

const EXISTING_CATEGORIES = [
  "Salsa & Latin Classics",
  "Soul & Funk Deep Cuts",
  "Cumbia & Tropical",
  "Jazz & Modal",
  "Percussion & Drum Breaks",
  "Brazilian & Bossa",
  "African & Afrobeat",
  "Bolero & Romántico",
  "Cinematic & Library",
];

// ===========================================
// Sortable Resource Item
// ===========================================

function SortableResourceItem({
  resource,
  onEdit,
  onDelete,
  isDragOverlay = false,
}: {
  resource: SamplingResource;
  onEdit: (r: SamplingResource) => void;
  onDelete: (id: string) => void;
  isDragOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: resource.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const meta = TYPE_META[resource.type];
  const Icon = meta.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-slc-card border rounded-xl p-5 transition-all ${
        isDragging
          ? "border-primary/60 shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)] scale-[1.01]"
          : "border-slc-border hover:border-primary/30"
      } ${isDragOverlay ? "shadow-2xl" : ""}`}
    >
      <div className="flex items-start gap-4">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 mt-1 p-1.5 rounded-lg text-slc-muted/40 hover:text-primary hover:bg-primary/10 cursor-grab active:cursor-grabbing transition-colors touch-none"
          title="Arrastrar para reordenar"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Type badge */}
        <div
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${meta.color}`}
        >
          <Icon className="w-3 h-3" />
          {meta.label}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-oswald text-lg uppercase text-white leading-tight group-hover:text-primary transition-colors">
                {resource.title}
              </h3>
              <p className="text-[11px] uppercase tracking-widest text-primary/80 mt-0.5">
                {resource.category}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg text-slc-muted hover:text-white hover:bg-slc-darker transition-colors"
                title="Abrir en YouTube"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={() => onEdit(resource)}
                className="p-2 rounded-lg text-slc-muted hover:text-primary hover:bg-primary/10 transition-colors"
                title="Editar"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(resource.id)}
                className="p-2 rounded-lg text-slc-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-sm text-slc-muted leading-relaxed mt-2 line-clamp-2">
            {resource.description}
          </p>

          {/* Tags + Handle */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {resource.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-[10px] uppercase tracking-wide rounded bg-slc-darker border border-slc-border text-slc-muted"
              >
                {tag}
              </span>
            ))}
            {resource.handle && (
              <span className="px-2 py-0.5 text-[10px] uppercase tracking-wide rounded bg-youtube/10 border border-youtube/30 text-red-400">
                {resource.handle}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Main Page Component
// ===========================================

export default function SamplingResourcesAdminPage() {
  const [data, setData] = useState<SamplingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ResourceType | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Drag & drop state
  const [savingOrder, setSavingOrder] = useState(false);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] =
    useState<SamplingResource | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Gate config states
  const [gateType, setGateType] = useState<GateType>("email");
  const [presaveUrl, setPresaveUrl] = useState("");
  const [presaveCta, setPresaveCta] = useState("Pre-guardar en Spotify");
  const [savingGate, setSavingGate] = useState(false);
  const [showGateConfig, setShowGateConfig] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = useCallback(
    (type: "success" | "error", message: string) => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 3500);
    },
    [],
  );

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sampling-resources");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        // Sync gate config state from DB
        setGateType(json.data.gateType || "email");
        setPresaveUrl(json.data.presaveUrl || "");
        setPresaveCta(json.data.presaveCta || "Pre-guardar en Spotify");
      }
    } catch (err) {
      console.error("Error fetching sampling resources:", err);
      showToast("error", "Error al cargar recursos");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Delete handler
  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/sampling-resources?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setDeletingId(null);
        await fetchData(); // Re-fetch to ensure UI stays in sync with DB
        showToast("success", "Recurso eliminado");
      } else {
        showToast("error", json.error || "Error al eliminar");
      }
    } catch {
      showToast("error", "Error de conexión");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Gate config save handler
  const handleSaveGateConfig = async () => {
    setSavingGate(true);
    try {
      const res = await fetch("/api/admin/sampling-resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _action: "settings",
          gateType,
          presaveUrl,
          presaveCta,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchData();
        showToast("success", "Configuración de acceso guardada");
      } else {
        showToast("error", json.error || "Error al guardar configuración");
      }
    } catch {
      showToast("error", "Error de conexión");
    } finally {
      setSavingGate(false);
    }
  };

  // ===========================================
  // Drag & Drop
  // ===========================================

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !data) return;

    const oldIndex = data.resources.findIndex((r) => r.id === active.id);
    const newIndex = data.resources.findIndex((r) => r.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic update — reorder locally first
    const reordered = arrayMove(data.resources, oldIndex, newIndex);
    setData((prev) => (prev ? { ...prev, resources: reordered } : prev));

    // Persist new order to server
    setSavingOrder(true);
    try {
      const orderedIds = reordered.map((r) => r.id);
      const res = await fetch("/api/admin/sampling-resources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      const json = await res.json();
      if (!json.success) {
        // Rollback on failure
        setData((prev) =>
          prev ? { ...prev, resources: data.resources } : prev,
        );
        showToast("error", "Error al guardar orden");
      } else {
        showToast("success", "Orden guardado");
      }
    } catch {
      // Rollback on network error
      setData((prev) => (prev ? { ...prev, resources: data.resources } : prev));
      showToast("error", "Error de conexión al reordenar");
    } finally {
      setSavingOrder(false);
    }
  };

  // Filter resources (for display; drag reordering works on the full list)
  const filteredResources =
    data?.resources.filter((r) => {
      const matchesSearch =
        !searchQuery ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tags.some((t) =>
          t.toLowerCase().includes(searchQuery.toLowerCase()),
        ) ||
        r.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || r.type === typeFilter;
      const matchesCategory =
        categoryFilter === "all" || r.category === categoryFilter;
      return matchesSearch && matchesType && matchesCategory;
    }) || [];

  const isFiltered =
    searchQuery || typeFilter !== "all" || categoryFilter !== "all";

  // Categories from current data
  const categories = data
    ? Array.from(new Set(data.resources.map((r) => r.category))).sort()
    : [];

  // Counts
  const counts = data
    ? {
        total: data.resources.length,
        channels: data.resources.filter((r) => r.type === "channel").length,
        videos: data.resources.filter((r) => r.type === "video").length,
        playlists: data.resources.filter((r) => r.type === "playlist").length,
        categories: new Set(data.resources.map((r) => r.category)).size,
      }
    : null;

  // Analytics: sum view/click/access counts from resources
  const analytics = data
    ? {
        totalViews: data.resources.reduce((sum, r) => sum + (r.viewCount || 0), 0),
        totalClicks: data.resources.reduce((sum, r) => sum + (r.clickCount || 0), 0),
        totalAccess: data.resources.length > 0
          ? data.resources[0].accessCount || 0
          : 0, // accessCount is global (same for all resources)
        topResource: data.resources
          .filter((r) => (r.clickCount || 0) > 0)
          .sort((a, b) => (b.clickCount || 0) - (a.clickCount || 0))[0],
      }
    : null;

  // ===========================================
  // Loading state
  // ===========================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slc-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ===========================================
  // Render
  // ===========================================

  return (
    <div className="min-h-screen bg-slc-black">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] animate-in fade-in slide-in-from-top-2">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg ${
              toast.type === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {toast.type === "success" ? (
              <Check className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="text-sm">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Saving order indicator */}
      {savingOrder && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary shadow-lg">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Guardando orden…</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slc-border bg-slc-dark">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary mb-2">
                <Headphones className="w-5 h-5" />
                <span className="text-xs uppercase tracking-widest font-medium">
                  Email Gate Resource
                </span>
              </div>
              <h1 className="font-oswald text-3xl md:text-4xl uppercase text-white">
                Recursos para Sampling
              </h1>
              <p className="text-slc-muted text-sm mt-2 max-w-xl leading-relaxed">
                Curaduría de canales, videos y playlists de YouTube para
                encontrar música sampleable. Configura el tipo de acceso (email,
                pre-save o ambos) y arrastra los recursos para reordenarlos.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowGateConfig(!showGateConfig)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium uppercase tracking-wide transition-colors ${
                  showGateConfig
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-slc-card border-slc-border text-white hover:border-primary/40"
                }`}
              >
                <Settings className="w-4 h-4" />
                Configurar Acceso
              </button>
              <Link
                href="/recursos-sampling"
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slc-card border border-slc-border text-sm text-white hover:border-primary/40 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Ver página pública
              </Link>
              <button
                onClick={() => {
                  setEditingResource(null);
                  setShowForm(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-bold uppercase tracking-wide transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar Recurso
              </button>
            </div>
          </div>

          {/* Stats */}
          {counts && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
              <StatCard label="Total Recursos" value={counts.total} accent />
              <StatCard
                label="Canales"
                value={counts.channels}
                icon={Youtube}
              />
              <StatCard label="Videos" value={counts.videos} icon={Youtube} />
              <StatCard
                label="Playlists"
                value={counts.playlists}
                icon={Music2}
              />
              <StatCard label="Categorías" value={counts.categories} />
            </div>
          )}

          {/* Analytics Stats */}
          {analytics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <StatCard
                label="Visitas"
                value={analytics.totalViews}
                icon={Eye}
              />
              <StatCard
                label="Clicks"
                value={analytics.totalClicks}
                icon={MousePointerClick}
              />
              <StatCard
                label="Accesos (emails)"
                value={analytics.totalAccess}
                icon={Mail}
              />
              <div className="rounded-xl border p-4 bg-slc-card border-slc-border">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-xs uppercase tracking-wider text-slc-muted">
                    Conversión
                  </span>
                </div>
                <p className="font-oswald text-2xl text-green-500">
                  {analytics.totalViews > 0
                    ? `${Math.round((analytics.totalClicks / analytics.totalViews) * 100)}%`
                    : "—"}
                </p>
                <p className="text-[10px] text-slc-muted mt-0.5">
                  clicks / visitas
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gate Config Panel */}
      {showGateConfig && (
        <div className="border-b border-slc-border bg-slc-dark">
          <div className="p-6 md:p-8">
            <div className="max-w-2xl">
              <h2 className="font-oswald text-xl uppercase text-white mb-1">
                Configurar Acceso
              </h2>
              <p className="text-slc-muted text-sm mb-6">
                Define qué requisito deben cumplir los usuarios para desbloquear
                los recursos.
              </p>

              {/* Gate Type Selector */}
              <div className="mb-6">
                <label className="block text-xs uppercase tracking-wider text-slc-muted mb-3">
                  Tipo de Acceso
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {GATE_TYPES.map((gt) => {
                    const meta = GATE_TYPE_META[gt];
                    const Icon = meta.icon;
                    return (
                      <button
                        key={gt}
                        type="button"
                        onClick={() => setGateType(gt)}
                        className={`flex flex-col items-center gap-2 px-4 py-3.5 rounded-lg border text-sm transition-colors ${
                          gateType === gt
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-slc-card border-slc-border text-slc-muted hover:text-white hover:border-slc-muted"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-bold uppercase tracking-wide">
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-slc-muted/80 text-center leading-tight">
                          {meta.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pre-save settings (visible when gate type is presave or both) */}
              {(gateType === "presave" || gateType === "both") && (
                <div className="space-y-4 mb-6 p-4 rounded-lg bg-slc-card border border-slc-border">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Music className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider font-medium">
                      Configuración de Pre-save
                    </span>
                  </div>

                  <div>
                    <label
                      htmlFor="gate-presave-url"
                      className="block text-xs uppercase tracking-wider text-slc-muted mb-1.5"
                    >
                      URL de Pre-save <span className="text-primary">*</span>
                    </label>
                    <input
                      id="gate-presave-url"
                      type="url"
                      value={presaveUrl}
                      onChange={(e) => setPresaveUrl(e.target.value)}
                      placeholder="https://presave.io/tu-enlace o URL de Feature.fm / Linkfire"
                      className="w-full px-3 py-2.5 bg-slc-darker border border-slc-border rounded-lg text-sm text-white placeholder:text-slc-muted/60 focus:outline-none focus:border-primary transition-colors"
                    />
                    <p className="text-[10px] text-slc-muted/60 mt-1">
                      URL del enlace de pre-save (Feature.fm, Linkfire, Spotify
                      SmartLink, etc.)
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="gate-presave-cta"
                      className="block text-xs uppercase tracking-wider text-slc-muted mb-1.5"
                    >
                      Texto del Botón
                    </label>
                    <input
                      id="gate-presave-cta"
                      type="text"
                      value={presaveCta}
                      onChange={(e) => setPresaveCta(e.target.value)}
                      placeholder="Pre-guardar en Spotify"
                      className="w-full px-3 py-2.5 bg-slc-darker border border-slc-border rounded-lg text-sm text-white placeholder:text-slc-muted/60 focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Current gate badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slc-muted">Acceso actual:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full border bg-primary/10 border-primary/30 text-primary">
                    {(() => {
                      const Icon = GATE_TYPE_META[gateType].icon;
                      return <Icon className="w-3 h-3" />;
                    })()}
                    {GATE_TYPE_META[gateType].label}
                  </span>
                </div>

                <button
                  onClick={handleSaveGateConfig}
                  disabled={
                    savingGate ||
                    ((gateType === "presave" || gateType === "both") &&
                      !presaveUrl.trim())
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingGate ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando…
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Guardar Configuración
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="border-b border-slc-border bg-slc-card/50">
        <div className="p-4 md:px-8 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, descripción, tag..."
              className="w-full pl-10 pr-4 py-2.5 bg-slc-darker border border-slc-border rounded-lg text-sm text-white placeholder:text-slc-muted/60 focus:outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slc-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as ResourceType | "all")
            }
            className="px-3 py-2.5 bg-slc-darker border border-slc-border rounded-lg text-sm text-white focus:outline-none focus:border-primary transition-colors"
          >
            <option value="all">Todos los tipos</option>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_META[t].label}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2.5 bg-slc-darker border border-slc-border rounded-lg text-sm text-white focus:outline-none focus:border-primary transition-colors"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        {isFiltered && (
          <div className="px-4 md:px-8 pb-3">
            <p className="text-xs text-primary/70">
              Los filtros están activos. El reordenamiento por arrastre solo
              funciona sin filtros.
            </p>
          </div>
        )}
      </div>

      {/* Resource List with DnD */}
      <div className="p-4 md:p-8">
        {filteredResources.length === 0 ? (
          <div className="text-center py-16">
            <Headphones className="w-12 h-12 text-slc-muted/30 mx-auto mb-4" />
            <p className="text-slc-muted text-lg">No se encontraron recursos</p>
            <p className="text-slc-muted/60 text-sm mt-1">
              {searchQuery || typeFilter !== "all" || categoryFilter !== "all"
                ? "Intenta ajustar los filtros"
                : "Agrega el primer recurso con el botón de arriba"}
            </p>
          </div>
        ) : isFiltered ? (
          /* When filters are active, show simple list without drag */
          <div className="space-y-3">
            {filteredResources.map((resource) => (
              <SortableResourceItem
                key={resource.id}
                resource={resource}
                onEdit={(r) => {
                  setEditingResource(r);
                  setShowForm(true);
                }}
                onDelete={(id) => setDeletingId(id)}
              />
            ))}
          </div>
        ) : (
          /* Full list with drag & drop */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={data?.resources.map((r) => r.id) || []}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {data?.resources.map((resource) => (
                  <SortableResourceItem
                    key={resource.id}
                    resource={resource}
                    onEdit={(r) => {
                      setEditingResource(r);
                      setShowForm(true);
                    }}
                    onDelete={(id) => setDeletingId(id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <ResourceFormModal
          resource={editingResource}
          existingCategories={EXISTING_CATEGORIES}
          existingTags={
            data
              ? Array.from(
                  new Set(data.resources.flatMap((r) => r.tags)),
                ).sort()
              : []
          }
          saving={saving}
          onSave={async (resourceData) => {
            setSaving(true);
            try {
              if (editingResource) {
                // Update
                const res = await fetch("/api/admin/sampling-resources", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: editingResource.id,
                    ...resourceData,
                  }),
                });
                const json = await res.json();
                if (json.success) {
                  setShowForm(false);
                  setEditingResource(null);
                  await fetchData(); // Re-fetch to ensure UI stays in sync with DB
                  showToast("success", "Recurso actualizado");
                } else {
                  showToast("error", json.error || "Error al actualizar");
                }
              } else {
                // Create
                const res = await fetch("/api/admin/sampling-resources", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(resourceData),
                });
                const json = await res.json();
                if (json.success) {
                  setShowForm(false);
                  await fetchData(); // Re-fetch to ensure UI stays in sync with DB
                  showToast("success", "Recurso creado");
                } else {
                  showToast("error", json.error || "Error al crear");
                }
              }
            } catch {
              showToast("error", "Error de conexión");
            } finally {
              setSaving(false);
            }
          }}
          onClose={() => {
            setShowForm(false);
            setEditingResource(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deleteLoading && setDeletingId(null)}
          />
          <div className="relative bg-slc-card border border-slc-border rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-oswald text-xl uppercase text-white mb-2">
              Eliminar Recurso
            </h3>
            <p className="text-slc-muted text-sm mb-6">
              ¿Estás seguro de que quieres eliminar este recurso? Esta acción no
              se puede deshacer.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingId(null)}
                disabled={deleteLoading}
                className="px-4 py-2.5 rounded-lg bg-slc-darker border border-slc-border text-sm text-white hover:bg-slc-card transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                disabled={deleteLoading}
                className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Eliminando…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================
// Stat Card
// ===========================================

function StatCard({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: number;
  accent?: boolean;
  icon?: typeof Youtube;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "bg-primary/5 border-primary/20"
          : "bg-slc-card border-slc-border"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        {Icon && (
          <Icon
            className={`w-4 h-4 ${accent ? "text-primary" : "text-slc-muted"}`}
          />
        )}
        <span
          className={`text-xs uppercase tracking-wider ${accent ? "text-primary/80" : "text-slc-muted"}`}
        >
          {label}
        </span>
      </div>
      <span
        className={`font-oswald text-2xl ${accent ? "text-primary" : "text-white"}`}
      >
        {value}
      </span>
    </div>
  );
}

// ===========================================
// Resource Form Modal
// ===========================================

function ResourceFormModal({
  resource,
  existingCategories,
  existingTags,
  saving,
  onSave,
  onClose,
}: {
  resource: SamplingResource | null;
  existingCategories: string[];
  existingTags: string[];
  saving: boolean;
  onSave: (data: Partial<SamplingResource>) => Promise<void>;
  onClose: () => void;
}) {
  const isEditing = !!resource;

  const [type, setType] = useState<ResourceType>(resource?.type || "channel");
  const [title, setTitle] = useState(resource?.title || "");
  const [url, setUrl] = useState(resource?.url || "");
  const [category, setCategory] = useState(resource?.category || "");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState(resource?.description || "");
  const [tagsInput, setTagsInput] = useState(resource?.tags.join(", ") || "");
  const [videoId, setVideoId] = useState(resource?.videoId || "");
  const [playlistId, setPlaylistId] = useState(resource?.playlistId || "");
  const [handle, setHandle] = useState(resource?.handle || "");

  // Auto-extract IDs from URLs
  const extractVideoId = (url: string): string => {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : "";
  };

  const extractPlaylistId = (url: string): string => {
    const match = url.match(/[?&]list=([^&]+)/);
    return match ? match[1] : "";
  };

  const extractHandle = (url: string): string => {
    const match = url.match(/youtube\.com\/(@[\w.-]+)/);
    return match ? match[1] : "";
  };

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    if (type === "video" && !videoId) {
      const extracted = extractVideoId(newUrl);
      if (extracted) setVideoId(extracted);
    }
    if (type === "playlist" && !playlistId) {
      const extracted = extractPlaylistId(newUrl);
      if (extracted) setPlaylistId(extracted);
    }
    if (type === "channel" && !handle) {
      const extracted = extractHandle(newUrl);
      if (extracted) setHandle(extracted);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalCategory =
      category === "__custom__" ? customCategory.trim() : category;
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const payload: Partial<SamplingResource> = {
      type,
      title: title.trim(),
      url: url.trim(),
      category: finalCategory,
      description: description.trim(),
      tags,
    };

    if (type === "video")
      payload.videoId = videoId.trim() || extractVideoId(url);
    if (type === "playlist")
      payload.playlistId = playlistId.trim() || extractPlaylistId(url);
    if (type === "channel")
      payload.handle = handle.trim() || extractHandle(url);

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-slc-dark border border-slc-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slc-dark border-b border-slc-border p-6 flex items-center justify-between">
          <h2 className="font-oswald text-2xl uppercase text-white">
            {isEditing ? "Editar Recurso" : "Agregar Recurso"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slc-muted hover:text-white hover:bg-slc-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-slc-muted mb-2">
              Tipo de Recurso <span className="text-primary">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {RESOURCE_TYPES.map((t) => {
                const meta = TYPE_META[t];
                const Icon = meta.icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium uppercase tracking-wide transition-colors ${
                      type === t
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-slc-card border-slc-border text-slc-muted hover:text-white hover:border-slc-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="sr-title"
              className="block text-xs uppercase tracking-wider text-slc-muted mb-1.5"
            >
              Título <span className="text-primary">*</span>
            </label>
            <input
              id="sr-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre del canal, video o playlist"
              className="w-full px-3 py-2.5 bg-slc-card border border-slc-border rounded-lg text-sm text-white placeholder:text-slc-muted/60 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* URL */}
          <div>
            <label
              htmlFor="sr-url"
              className="block text-xs uppercase tracking-wider text-slc-muted mb-1.5"
            >
              URL de YouTube <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
              <input
                id="sr-url"
                type="url"
                required
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://www.youtube.com/..."
                className="w-full pl-10 pr-4 py-2.5 bg-slc-card border border-slc-border rounded-lg text-sm text-white placeholder:text-slc-muted/60 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Type-specific fields */}
          {type === "video" && (
            <div>
              <label
                htmlFor="sr-videoId"
                className="block text-xs uppercase tracking-wider text-slc-muted mb-1.5"
              >
                Video ID{" "}
                <span className="text-slc-muted/60">
                  (se extrae automáticamente de la URL)
                </span>
              </label>
              <input
                id="sr-videoId"
                type="text"
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                placeholder="dQw4w9WgXcQ"
                className="w-full px-3 py-2.5 bg-slc-card border border-slc-border rounded-lg text-sm text-white placeholder:text-slc-muted/60 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          {type === "playlist" && (
            <div>
              <label
                htmlFor="sr-playlistId"
                className="block text-xs uppercase tracking-wider text-slc-muted mb-1.5"
              >
                Playlist ID{" "}
                <span className="text-slc-muted/60">
                  (se extrae automáticamente de la URL)
                </span>
              </label>
              <input
                id="sr-playlistId"
                type="text"
                value={playlistId}
                onChange={(e) => setPlaylistId(e.target.value)}
                placeholder="PLrJZk6e7pFZ0xV6vKQlq5pZp2r9sT8uYw"
                className="w-full px-3 py-2.5 bg-slc-card border border-slc-border rounded-lg text-sm text-white placeholder:text-slc-muted/60 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          {type === "channel" && (
            <div>
              <label
                htmlFor="sr-handle"
                className="block text-xs uppercase tracking-wider text-slc-muted mb-1.5"
              >
                Handle{" "}
                <span className="text-slc-muted/60">
                  (se extrae automáticamente de la URL)
                </span>
              </label>
              <input
                id="sr-handle"
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@FaniaRecordsOfficial"
                className="w-full px-3 py-2.5 bg-slc-card border border-slc-border rounded-lg text-sm text-white placeholder:text-slc-muted/60 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          {/* Category */}
          <div>
            <label
              htmlFor="sr-category"
              className="block text-xs uppercase tracking-wider text-slc-muted mb-1.5"
            >
              Categoría <span className="text-primary">*</span>
            </label>
            <select
              id="sr-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slc-card border border-slc-border rounded-lg text-sm text-white focus:outline-none focus:border-primary transition-colors"
            >
              <option value="" disabled>
                Selecciona una categoría...
              </option>
              {existingCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="__custom__">+ Nueva categoría...</option>
            </select>
            {category === "__custom__" && (
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Nombre de la nueva categoría"
                className="w-full mt-2 px-3 py-2.5 bg-slc-card border border-slc-border rounded-lg text-sm text-white placeholder:text-slc-muted/60 focus:outline-none focus:border-primary transition-colors"
              />
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="sr-description"
              className="block text-xs uppercase tracking-wider text-slc-muted mb-1.5"
            >
              Descripción <span className="text-primary">*</span>
            </label>
            <textarea
              id="sr-description"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe qué ofrece este recurso para samplers..."
              rows={3}
              className="w-full px-3 py-2.5 bg-slc-card border border-slc-border rounded-lg text-sm text-white placeholder:text-slc-muted/60 focus:outline-none focus:border-primary transition-colors resize-y"
            />
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="sr-tags"
              className="block text-xs uppercase tracking-wider text-slc-muted mb-1.5"
            >
              Tags{" "}
              <span className="text-slc-muted/60">(separados por coma)</span>
            </label>
            <input
              id="sr-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="salsa, vinyl, 70s, tumbao"
              className="w-full px-3 py-2.5 bg-slc-card border border-slc-border rounded-lg text-sm text-white placeholder:text-slc-muted/60 focus:outline-none focus:border-primary transition-colors"
            />
            {existingTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {existingTags.slice(0, 15).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const current = tagsInput
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean);
                      if (!current.includes(tag)) {
                        setTagsInput(
                          current.length > 0 ? `${tagsInput}, ${tag}` : tag,
                        );
                      }
                    }}
                    className="px-2 py-0.5 text-[10px] uppercase tracking-wide rounded bg-slc-darker border border-slc-border text-slc-muted hover:text-primary hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-slc-border">
            {!title || !url || !category || !description ? (
              <p className="text-xs text-slc-muted/60 text-right">
                Completa todos los campos requeridos: {!title && "título "}
                {!url && "URL "}
                {!category && "categoría "}
                {!description && "descripción"}
              </p>
            ) : null}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2.5 rounded-lg bg-slc-card border border-slc-border text-sm text-white hover:bg-slc-darker transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !title || !url || !category || !description}
                className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {isEditing ? "Guardar Cambios" : "Crear Recurso"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
