"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Edit2,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Music2,
  Plus,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";

interface UpcomingRelease {
  id: string;
  title: string;
  artistName: string;
  releaseType: string;
  releaseDate: string;
  coverImageUrl: string | null;
  description: string | null;
  status: string;
  isFeatured: boolean;
  isActive: boolean;
  presaveUrl: string | null;
  presavePlatform: string;
  sortOrder: number;
}

const RELEASE_TYPES = [
  { value: "single", label: "Single", color: "bg-orange-500" },
  { value: "album", label: "Album", color: "bg-blue-500" },
  { value: "ep", label: "EP", color: "bg-purple-500" },
];

const STATUS_OPTIONS = [
  { value: "listo", label: "Listo", color: "bg-emerald-500" },
  { value: "promocion", label: "Promoción", color: "bg-amber-500" },
  { value: "pendiente", label: "Pendiente", color: "bg-zinc-500" },
];

export default function UpcomingReleasesAdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [releases, setReleases] = useState<UpcomingRelease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<UpcomingRelease | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    artistName: "",
    releaseType: "single",
    releaseDate: "",
    coverImageUrl: "",
    description: "",
    status: "listo",
    isFeatured: false,
    isActive: true,
    presaveUrl: "",
    presavePlatform: "onerpm",
    sortOrder: 0,
  });

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

  const fetchReleases = useCallback(async () => {
    try {
      const res = await fetch("/api/upcoming-releases?all=true");
      const data = await res.json();
      if (data.success) {
        setReleases(data.releases);
      }
    } catch (error) {
      console.error("Error fetching releases:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchReleases();
    }
  }, [isAuthenticated, fetchReleases]);

  const openModal = (release?: UpcomingRelease) => {
    if (release) {
      setEditingRelease(release);
      setFormData({
        title: release.title,
        artistName: release.artistName,
        releaseType: release.releaseType,
        releaseDate: release.releaseDate,
        coverImageUrl: release.coverImageUrl || "",
        description: release.description || "",
        status: release.status,
        isFeatured: release.isFeatured,
        isActive: release.isActive,
        presaveUrl: release.presaveUrl || "",
        presavePlatform: release.presavePlatform,
        sortOrder: release.sortOrder,
      });
    } else {
      setEditingRelease(null);
      setFormData({
        title: "",
        artistName: "",
        releaseType: "single",
        releaseDate: "",
        coverImageUrl: "",
        description: "",
        status: "listo",
        isFeatured: false,
        isActive: true,
        presaveUrl: "",
        presavePlatform: "onerpm",
        sortOrder: 0,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRelease(null);
    setMessage(null);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.artistName || !formData.releaseDate) {
      setMessage({ type: "error", text: "Título, artista y fecha son requeridos" });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const url = editingRelease
        ? `/api/upcoming-releases/${editingRelease.id}`
        : "/api/upcoming-releases";

      const res = await fetch(url, {
        method: editingRelease ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: editingRelease ? "Actualizado correctamente" : "Creado correctamente" });
        await fetchReleases();
        setTimeout(() => closeModal(), 1000);
      } else {
        setMessage({ type: "error", text: data.error || "Error al guardar" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error al guardar" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este lanzamiento?")) return;

    try {
      const res = await fetch(`/api/upcoming-releases/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        await fetchReleases();
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const getDaysUntilRelease = (dateStr: string) => {
    const releaseDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    releaseDate.setHours(0, 0, 0, 0);
    const diffTime = releaseDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (isCheckingAuth || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="bg-zinc-800 border-b border-zinc-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-zinc-400 hover:text-white">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Próximos Lanzamientos</h1>
                <p className="text-zinc-400 text-sm">Administrar lanzamientos con pre-save</p>
              </div>
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nuevo Lanzamiento
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
          </div>
        ) : releases.length === 0 ? (
          <div className="text-center py-16 bg-zinc-800 rounded-xl border border-zinc-700">
            <Calendar className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Sin lanzamientos próximos</h3>
            <p className="text-zinc-400 mb-6">Crea tu primer lanzamiento para mostrarlo en la página principal</p>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              Crear Lanzamiento
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {releases.map((release) => {
              const days = getDaysUntilRelease(release.releaseDate);
              const typeConfig = RELEASE_TYPES.find(t => t.value === release.releaseType);
              const statusConfig = STATUS_OPTIONS.find(s => s.value === release.status);
              const isPast = days < 0;

              return (
                <div
                  key={release.id}
                  className={`bg-zinc-800 rounded-xl border overflow-hidden ${
                    release.isActive ? "border-zinc-700" : "border-zinc-800 opacity-60"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Cover Image */}
                    <div className="relative w-full sm:w-40 h-40 flex-shrink-0">
                      {release.coverImageUrl ? (
                        <img
                          src={release.coverImageUrl}
                          alt={release.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-700 flex items-center justify-center">
                          <ImageIcon className="h-10 w-10 text-zinc-500" />
                        </div>
                      )}
                      {/* Type badge */}
                      <span className={`absolute top-2 left-2 px-2 py-0.5 ${typeConfig?.color || "bg-orange-500"} text-white text-xs font-bold rounded`}>
                        {typeConfig?.label || release.releaseType}
                      </span>
                      {/* Featured badge */}
                      {release.isFeatured && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-black text-xs font-bold rounded">
                          DESTACADO
                        </span>
                      )}
                      {/* Days counter */}
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-center">
                        <span className="text-xl font-bold text-white block leading-none">
                          {isPast ? "+" : ""}{Math.abs(days)}
                        </span>
                        <span className="text-[10px] text-zinc-400 uppercase">días</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-4 flex flex-col justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white uppercase">{release.title}</h3>
                        <p className="text-orange-400 text-sm">{release.artistName}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`px-2 py-0.5 ${statusConfig?.color || "bg-zinc-500"} text-white text-xs font-medium rounded`}>
                            {statusConfig?.label || release.status}
                          </span>
                          <span className="text-zinc-400 text-sm flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(release.releaseDate)}
                          </span>
                        </div>
                        {release.description && (
                          <p className="text-zinc-400 text-sm mt-2 line-clamp-2">{release.description}</p>
                        )}
                      </div>

                      {/* Pre-save link preview */}
                      {release.presaveUrl && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                          <ExternalLink className="h-3 w-3" />
                          <span className="truncate">{release.presaveUrl}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col items-center justify-end gap-2 p-4 border-t sm:border-t-0 sm:border-l border-zinc-700">
                      <button
                        onClick={() => openModal(release)}
                        className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4 text-zinc-300" />
                      </button>
                      <button
                        onClick={() => handleDelete(release.id)}
                        className="p-2 bg-zinc-700 hover:bg-red-600 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4 text-zinc-300" />
                      </button>
                      {release.presaveUrl && (
                        <a
                          href={release.presaveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
                          title="Ver Pre-save"
                        >
                          <ExternalLink className="h-4 w-4 text-white" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-zinc-900 border-b border-zinc-700">
              <h2 className="text-xl font-bold text-white">
                {editingRelease ? "Editar Lanzamiento" : "Nuevo Lanzamiento"}
              </h2>
              <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Message */}
              {message && (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                  message.type === "success"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-red-500/20 text-red-300"
                }`}>
                  {message.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  {message.text}
                </div>
              )}

              {/* Cover Preview */}
              {formData.coverImageUrl && (
                <div className="flex justify-center">
                  <div className="relative w-48 h-48 rounded-lg overflow-hidden bg-zinc-800">
                    <img
                      src={formData.coverImageUrl}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Título *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    placeholder="Nombre del lanzamiento"
                  />
                </div>

                {/* Artist */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Artista *</label>
                  <input
                    type="text"
                    value={formData.artistName}
                    onChange={(e) => setFormData({ ...formData, artistName: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    placeholder="Nombre del artista"
                  />
                </div>

                {/* Release Date */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Fecha de Lanzamiento *</label>
                  <input
                    type="date"
                    value={formData.releaseDate}
                    onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Release Type */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Tipo</label>
                  <select
                    value={formData.releaseType}
                    onChange={(e) => setFormData({ ...formData, releaseType: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    {RELEASE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>

                {/* Cover Image URL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">URL de Portada</label>
                  <input
                    type="url"
                    value={formData.coverImageUrl}
                    onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    placeholder="https://..."
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                    placeholder="Breve descripción del lanzamiento..."
                  />
                </div>

                {/* Pre-save URL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Link de Pre-save (OneRPM)</label>
                  <input
                    type="url"
                    value={formData.presaveUrl}
                    onChange={(e) => setFormData({ ...formData, presaveUrl: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    placeholder="https://onerpm.link/..."
                  />
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Orden</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-orange-500 focus:ring-orange-500"
                    />
                    <Star className="h-4 w-4 text-amber-400" />
                    <span className="text-sm text-zinc-300">Destacado</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-sm text-zinc-300">Activo</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex items-center justify-end gap-3 p-6 bg-zinc-900 border-t border-zinc-700">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar
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
