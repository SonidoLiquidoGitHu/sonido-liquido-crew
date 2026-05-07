"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Palette,
  Plus,
  Search,
  Loader2,
  Trash2,
  Edit3,
  Copy,
  CheckCircle,
  AlertTriangle,
  Eye,
  Star,
  Globe,
  Lock,
  Filter,
  MoreVertical,
  Wand2,
  User,
  Music,
  Megaphone,
  Newspaper,
} from "lucide-react";
import {
  type StyleSettings,
  defaultStyleSettings,
  availableFonts,
  getFontClass,
} from "@/lib/style-config";

interface CustomStyle {
  id: string;
  name: string;
  description: string | null;
  settings: Partial<StyleSettings>;
  previewImageUrl: string | null;
  category: string;
  artistId: string | null;
  isPublic: boolean;
  isDefault: boolean;
  usageCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const categories = [
  { value: "all", label: "Todos", icon: Palette },
  { value: "general", label: "General", icon: Wand2 },
  { value: "campaign", label: "Campañas", icon: Megaphone },
  { value: "beat", label: "Beats", icon: Music },
  { value: "media", label: "Media", icon: Newspaper },
  { value: "artist", label: "Artistas", icon: User },
];

export default function StyleLibraryPage() {
  const [styles, setStyles] = useState<CustomStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStyle, setEditingStyle] = useState<CustomStyle | null>(null);
  const [previewStyle, setPreviewStyle] = useState<CustomStyle | null>(null);

  useEffect(() => {
    fetchStyles();
  }, [selectedCategory]);

  const fetchStyles = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") {
        params.set("category", selectedCategory);
      }
      params.set("includePublic", "true");

      const res = await fetch(`/api/admin/styles?${params}`);
      const data = await res.json();
      if (data.success) {
        setStyles(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching styles:", error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este estilo?")) return;

    try {
      const res = await fetch(`/api/admin/styles?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showMessage("success", "Estilo eliminado");
        fetchStyles();
      } else {
        showMessage("error", data.error || "Error al eliminar");
      }
    } catch (error) {
      showMessage("error", "Error de conexión");
    }
  };

  const handleDuplicate = async (style: CustomStyle) => {
    try {
      const res = await fetch("/api/admin/styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${style.name} (copia)`,
          description: style.description,
          settings: style.settings,
          category: style.category,
          isPublic: false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage("success", "Estilo duplicado");
        fetchStyles();
      } else {
        showMessage("error", data.error || "Error al duplicar");
      }
    } catch (error) {
      showMessage("error", "Error de conexión");
    }
  };

  const filteredStyles = styles.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase flex items-center gap-3">
            <Palette className="w-8 h-8 text-primary" />
            Librería de Estilos
          </h1>
          <p className="text-slc-muted mt-1">
            Guarda y reutiliza estilos personalizados para tus páginas
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Estilo
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-500"
              : "bg-red-500/10 border border-red-500/20 text-red-500"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar estilos..."
            className="pl-10"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-1 overflow-x-auto pb-2 sm:pb-0">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === cat.value
                    ? "bg-primary text-white"
                    : "bg-slc-card text-slc-muted hover:text-white hover:bg-slc-card/80"
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Styles Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredStyles.length === 0 ? (
        <div className="text-center py-20 bg-slc-card border border-slc-border rounded-xl">
          <Palette className="w-16 h-16 mx-auto text-slc-muted mb-4" />
          <h2 className="font-oswald text-xl mb-2">No hay estilos</h2>
          <p className="text-slc-muted mb-4">
            {searchQuery
              ? "No se encontraron estilos con ese nombre"
              : "Crea tu primer estilo personalizado"}
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Estilo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStyles.map((style) => (
            <StyleCard
              key={style.id}
              style={style}
              onPreview={() => setPreviewStyle(style)}
              onEdit={() => setEditingStyle(style)}
              onDelete={() => handleDelete(style.id)}
              onDuplicate={() => handleDuplicate(style)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingStyle) && (
        <StyleEditorModal
          style={editingStyle}
          onClose={() => {
            setShowCreateModal(false);
            setEditingStyle(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingStyle(null);
            fetchStyles();
          }}
        />
      )}

      {/* Preview Modal */}
      {previewStyle && (
        <StylePreviewModal
          style={previewStyle}
          onClose={() => setPreviewStyle(null)}
        />
      )}
    </div>
  );
}

// Style Card Component
function StyleCard({
  style,
  onPreview,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  style: CustomStyle;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const settings = { ...defaultStyleSettings, ...style.settings };
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="group relative bg-slc-dark border border-slc-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors">
      {/* Preview */}
      <div
        className="h-32 relative cursor-pointer"
        onClick={onPreview}
        style={{
          background: settings.darkMode
            ? `linear-gradient(135deg, ${settings.primaryColor}30, ${settings.secondaryColor}20)`
            : `linear-gradient(135deg, ${settings.primaryColor}20, white)`,
        }}
      >
        {/* Sample content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <p
            className={`text-lg font-bold ${getFontClass(settings.titleFont)} ${
              settings.titleStyle === "uppercase" ? "uppercase" : ""
            }`}
            style={{
              color: settings.titleStyle === "gradient" ? "transparent" : settings.primaryColor,
              background:
                settings.titleStyle === "gradient"
                  ? `linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor})`
                  : undefined,
              WebkitBackgroundClip: settings.titleStyle === "gradient" ? "text" : undefined,
            }}
          >
            Título
          </p>
          <p
            className={`text-xs mt-1 ${getFontClass(settings.bodyFont)}`}
            style={{ color: settings.darkMode ? "#999" : "#666" }}
          >
            Texto de ejemplo
          </p>
          <button
            className="mt-2 px-3 py-1 text-xs"
            style={{
              background:
                settings.buttonStyle === "gradient"
                  ? `linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor})`
                  : settings.buttonStyle === "solid"
                  ? settings.primaryColor
                  : "transparent",
              border:
                settings.buttonStyle === "outline"
                  ? `1px solid ${settings.primaryColor}`
                  : "none",
              borderRadius:
                settings.buttonRounded === "full"
                  ? "9999px"
                  : settings.buttonRounded === "lg"
                  ? "8px"
                  : settings.buttonRounded === "md"
                  ? "6px"
                  : settings.buttonRounded === "sm"
                  ? "4px"
                  : "0",
              color: settings.buttonStyle === "outline" ? settings.primaryColor : "white",
            }}
          >
            Botón
          </button>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {style.isDefault && (
            <span className="bg-yellow-500/20 text-yellow-500 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <Star className="w-3 h-3" /> Default
            </span>
          )}
          {style.isPublic ? (
            <span className="bg-green-500/20 text-green-500 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <Globe className="w-3 h-3" /> Público
            </span>
          ) : (
            <span className="bg-gray-500/20 text-gray-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-3 h-3" /> Privado
            </span>
          )}
        </div>

        {/* Dark/Light mode indicator */}
        <div className="absolute top-2 right-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              settings.darkMode
                ? "bg-gray-900/50 text-white"
                : "bg-white/80 text-gray-900"
            }`}
          >
            {settings.darkMode ? "Dark" : "Light"}
          </span>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" onClick={onPreview}>
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{style.name}</h3>
            {style.description && (
              <p className="text-xs text-slc-muted truncate mt-0.5">{style.description}</p>
            )}
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-slc-card rounded"
            >
              <MoreVertical className="w-4 h-4 text-slc-muted" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-slc-card border border-slc-border rounded-lg shadow-xl py-1 min-w-[140px]">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slc-dark flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" /> Editar
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDuplicate();
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slc-dark flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" /> Duplicar
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slc-dark flex items-center gap-2 text-red-500"
                  >
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Usage count */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slc-border">
          <span className="text-xs text-slc-muted">
            Usado {style.usageCount} {style.usageCount === 1 ? "vez" : "veces"}
          </span>
          <span className="text-xs text-slc-muted capitalize">{style.category}</span>
        </div>
      </div>
    </div>
  );
}

// Style Editor Modal
function StyleEditorModal({
  style,
  onClose,
  onSave,
}: {
  style: CustomStyle | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: style?.name || "",
    description: style?.description || "",
    category: style?.category || "general",
    isPublic: style?.isPublic || false,
    isDefault: style?.isDefault || false,
    settings: style?.settings || defaultStyleSettings,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setSaving(true);
    try {
      const method = style ? "PUT" : "POST";
      const body = style ? { id: style.id, ...formData } : formData;

      const res = await fetch("/api/admin/styles", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        onSave();
      }
    } catch (error) {
      console.error("Error saving style:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-slc-dark border border-slc-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="font-oswald text-xl uppercase mb-6">
            {style ? "Editar Estilo" : "Nuevo Estilo"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slc-muted mb-2">Nombre *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Mi estilo personalizado"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-slc-muted mb-2">Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Descripción opcional..."
                rows={2}
                className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-slc-muted mb-2">Categoría</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="general">General</option>
                <option value="campaign">Campañas</option>
                <option value="beat">Beats</option>
                <option value="media">Media Releases</option>
                <option value="artist">Artistas</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isPublic: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-slc-border"
                />
                <span>Público (visible para todos)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-slc-border"
                />
                <span>Usar como estilo por defecto</span>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {style ? "Guardar" : "Crear"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Style Preview Modal with responsive modes
function StylePreviewModal({
  style,
  onClose,
}: {
  style: CustomStyle;
  onClose: () => void;
}) {
  const [viewMode, setViewMode] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const settings = { ...defaultStyleSettings, ...style.settings };

  const viewSizes = {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: "100%", height: "100%" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="bg-slc-dark border border-slc-border rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slc-border">
          <div>
            <h2 className="font-oswald text-xl uppercase">{style.name}</h2>
            <p className="text-sm text-slc-muted">Vista previa del estilo</p>
          </div>

          {/* Responsive toggle */}
          <div className="flex items-center gap-2 bg-slc-card rounded-lg p-1">
            {(["mobile", "tablet", "desktop"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  viewMode === mode
                    ? "bg-primary text-white"
                    : "text-slc-muted hover:text-white"
                }`}
              >
                {mode === "mobile" ? "📱" : mode === "tablet" ? "📱" : "🖥️"}{" "}
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slc-card rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-zinc-900">
          <div
            className="transition-all duration-300 overflow-hidden rounded-lg shadow-2xl"
            style={{
              width: viewMode === "desktop" ? "100%" : viewSizes[viewMode].width,
              height: viewMode === "desktop" ? "auto" : viewSizes[viewMode].height,
              maxHeight: "70vh",
            }}
          >
            {/* Mock landing page */}
            <div
              className="min-h-full p-8"
              style={{
                background: settings.darkMode
                  ? `linear-gradient(135deg, ${settings.primaryColor}20, ${settings.secondaryColor}10)`
                  : `linear-gradient(135deg, white, ${settings.primaryColor}05)`,
              }}
            >
              <div className="flex flex-col items-center text-center space-y-6">
                {/* Badge */}
                <span
                  className="px-4 py-1.5 rounded-full text-sm"
                  style={{
                    backgroundColor: `${settings.accentColor}20`,
                    color: settings.accentColor,
                  }}
                >
                  Nuevo Lanzamiento
                </span>

                {/* Cover */}
                <div
                  className="w-40 h-40 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
                    boxShadow: settings.enableGlow
                      ? `0 20px 40px -10px ${settings.primaryColor}50`
                      : undefined,
                  }}
                />

                {/* Title */}
                <h1
                  className={`text-3xl ${getFontClass(settings.titleFont)} ${
                    settings.titleStyle === "uppercase" ? "uppercase" : ""
                  }`}
                  style={{
                    color:
                      settings.titleStyle === "gradient"
                        ? "transparent"
                        : settings.darkMode
                        ? settings.textColor
                        : "#1a1a1a",
                    background:
                      settings.titleStyle === "gradient"
                        ? `linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor})`
                        : undefined,
                    WebkitBackgroundClip: settings.titleStyle === "gradient" ? "text" : undefined,
                  }}
                >
                  Título del Track
                </h1>

                {/* Subtitle */}
                <p
                  className={`${getFontClass(settings.bodyFont)}`}
                  style={{ color: settings.primaryColor }}
                >
                  Artista · Sonido Líquido Crew
                </p>

                {/* Description */}
                <p
                  className={`max-w-md text-sm ${getFontClass(settings.bodyFont)}`}
                  style={{
                    color: settings.darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  }}
                >
                  Esta es una descripción de ejemplo para ver cómo se ve el texto
                  del cuerpo con este estilo aplicado.
                </p>

                {/* Button */}
                <button
                  className="px-8 py-3 font-medium transition-all"
                  style={{
                    background:
                      settings.buttonStyle === "gradient"
                        ? `linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor})`
                        : settings.buttonStyle === "solid"
                        ? settings.primaryColor
                        : settings.buttonStyle === "glass"
                        ? "rgba(255,255,255,0.1)"
                        : "transparent",
                    border:
                      settings.buttonStyle === "outline"
                        ? `2px solid ${settings.primaryColor}`
                        : settings.buttonStyle === "glass"
                        ? "1px solid rgba(255,255,255,0.2)"
                        : "none",
                    backdropFilter: settings.buttonStyle === "glass" ? "blur(10px)" : undefined,
                    borderRadius:
                      settings.buttonRounded === "full"
                        ? "9999px"
                        : settings.buttonRounded === "lg"
                        ? "0.5rem"
                        : settings.buttonRounded === "md"
                        ? "0.375rem"
                        : settings.buttonRounded === "sm"
                        ? "0.25rem"
                        : "0",
                    color: settings.buttonStyle === "outline" ? settings.primaryColor : "white",
                    boxShadow: settings.enableGlow
                      ? `0 10px 30px -5px ${settings.primaryColor}50`
                      : undefined,
                  }}
                >
                  Descargar Ahora
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
