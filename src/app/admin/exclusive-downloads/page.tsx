"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  FileText,
  Link as LinkIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DownloadItem {
  id: string;
  name: string;
  description: string;
  fileUrl: string;
  isActive: boolean;
}

export default function ExclusiveDownloadsAdminPage() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    fileUrl: "",
    isActive: true,
  });

  // Add state
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    description: "",
    fileUrl: "",
    isActive: true,
  });

  const fetchDownloads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/exclusive-downloads");
      const data = await res.json();
      if (data.success) {
        setDownloads(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching downloads:", error);
      setMessage({ type: "error", text: "Error al cargar descargas" });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDownloads();
  }, [fetchDownloads]);

  const saveDownloads = async (updatedDownloads: DownloadItem[]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/exclusive-downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ downloads: updatedDownloads }),
      });
      const data = await res.json();
      if (data.success) {
        setDownloads(updatedDownloads);
        setMessage({ type: "success", text: "Descargas guardadas" });
      } else {
        setMessage({ type: "error", text: data.error || "Error al guardar" });
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión" });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAdd = () => {
    if (!addForm.name || !addForm.fileUrl) return;

    const newItem: DownloadItem = {
      id: crypto.randomUUID(),
      name: addForm.name,
      description: addForm.description,
      fileUrl: addForm.fileUrl,
      isActive: addForm.isActive,
    };

    const updated = [...downloads, newItem];
    saveDownloads(updated);
    setShowAdd(false);
    setAddForm({ name: "", description: "", fileUrl: "", isActive: true });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;

    const updated = downloads.map((d) =>
      d.id === editingId
        ? { ...d, name: editForm.name, description: editForm.description, fileUrl: editForm.fileUrl, isActive: editForm.isActive }
        : d
    );

    saveDownloads(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar esta descarga?")) return;
    const updated = downloads.filter((d) => d.id !== id);
    saveDownloads(updated);
  };

  const toggleActive = (id: string) => {
    const updated = downloads.map((d) =>
      d.id === id ? { ...d, isActive: !d.isActive } : d
    );
    saveDownloads(updated);
  };

  const openEdit = (item: DownloadItem) => {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      description: item.description,
      fileUrl: item.fileUrl,
      isActive: item.isActive,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-oswald text-2xl uppercase flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Descargas Exclusivas
          </h1>
          <p className="text-slc-muted text-sm mt-1">
            Archivos exclusivos para suscriptores del newsletter
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} disabled={showAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Descarga
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            "mb-6 p-4 rounded-lg flex items-center gap-2",
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-500"
              : "bg-red-500/10 border border-red-500/20 text-red-500"
          )}
        >
          {message.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <div className="bg-slc-card border border-slc-border rounded-xl p-6 mb-6">
          <h2 className="font-oswald text-lg uppercase mb-4">Nueva Descarga</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slc-muted mb-1.5">Nombre *</label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Beat exclusivo 2025..."
              />
            </div>
            <div>
              <label className="block text-sm text-slc-muted mb-1.5">Descripción</label>
              <Input
                value={addForm.description}
                onChange={(e) => setAddForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción del archivo..."
              />
            </div>
            <div>
              <label className="block text-sm text-slc-muted mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" /> URL del archivo *
              </label>
              <Input
                value={addForm.fileUrl}
                onChange={(e) => setAddForm((prev) => ({ ...prev, fileUrl: e.target.value }))}
                placeholder="https://dropbox.com/..."
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={addForm.isActive}
                onChange={(e) => setAddForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">Activo</span>
              {addForm.isActive ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-red-500" />}
            </label>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAdd} disabled={!addForm.name || !addForm.fileUrl}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        /* Downloads List */
        <div className="space-y-4">
          {downloads.map((item) => (
            <div
              key={item.id}
              className={cn(
                "bg-slc-card border rounded-xl p-6 transition-all",
                item.isActive ? "border-slc-border" : "border-red-500/20 opacity-70"
              )}
            >
              {editingId === item.id ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slc-muted mb-1.5">Nombre *</label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slc-muted mb-1.5">Descripción</label>
                    <Input
                      value={editForm.description}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slc-muted mb-1.5 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5" /> URL del archivo *
                    </label>
                    <Input
                      value={editForm.fileUrl}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, fileUrl: e.target.value }))}
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Activo</span>
                  </label>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setEditingId(null)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveEdit}>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-oswald text-lg uppercase">{item.name}</h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs",
                        item.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {item.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-slc-muted text-sm mt-1">{item.description}</p>
                    )}
                    <p className="text-slc-muted text-xs mt-2 truncate flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" /> {item.fileUrl}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActive(item.id)}
                      className={cn(
                        "p-2 rounded transition-colors",
                        item.isActive ? "text-green-500 hover:bg-green-500/10" : "text-red-500 hover:bg-red-500/10"
                      )}
                      title={item.isActive ? "Desactivar" : "Activar"}
                    >
                      {item.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEdit(item)}
                      className="p-2 text-slc-muted hover:text-primary hover:bg-slc-card rounded transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-slc-muted hover:text-red-500 hover:bg-slc-card rounded transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {downloads.length === 0 && !loading && (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-slc-muted mx-auto mb-4" />
              <h3 className="font-oswald text-xl uppercase mb-2">Sin descargas</h3>
              <p className="text-slc-muted mb-6">Agrega archivos exclusivos para suscriptores.</p>
              <Button onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Descarga
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Preview link */}
      <div className="mt-8 pt-6 border-t border-slc-border">
        <p className="text-slc-muted text-sm">
          Página pública:{" "}
          <a href="/descargas" target="_blank" className="text-primary hover:underline">
            /descargas
          </a>
        </p>
      </div>
    </div>
  );
}
