"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Shield,
  ShieldCheck,
  ShieldPlus,
  Star,
  User,
  Mail,
  Instagram,
  Trash2,
  Loader2,
  ArrowLeft,
  MessageCircle,
  Camera,
  Check,
  X,
  Sparkles,
  Crown,
  Award,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustedContributor {
  id: string;
  identifierType: "email" | "instagram";
  identifierValue: string;
  displayName: string | null;
  trustLevel: number;
  autoApproveMessages: boolean;
  autoApprovePhotos: boolean;
  autoFeature: boolean;
  notes: string | null;
  addedBy: string | null;
  approvedCount: number;
  lastSubmissionAt: string | null;
  isActive: boolean;
  createdAt: string;
}

const TRUST_LEVELS = [
  { level: 1, label: "Básico", icon: Shield, color: "text-blue-500" },
  { level: 2, label: "Verificado", icon: ShieldCheck, color: "text-green-500" },
  { level: 3, label: "VIP", icon: Crown, color: "text-yellow-500" },
];

export default function TrustedContributorsPage() {
  const [contributors, setContributors] = useState<TrustedContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    identifierType: "email" as "email" | "instagram",
    identifierValue: "",
    displayName: "",
    trustLevel: 1,
    autoApproveMessages: true,
    autoApprovePhotos: true,
    autoFeature: false,
    notes: "",
  });

  useEffect(() => {
    fetchContributors();
  }, []);

  async function fetchContributors() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/community/trusted-contributors");
      const data = await res.json();
      if (data.success) {
        setContributors(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching contributors:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.identifierValue.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/community/trusted-contributors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        fetchContributors();
        setShowAddForm(false);
        resetForm();
      }
    } catch (error) {
      console.error("Error adding contributor:", error);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await fetch("/api/admin/community/trusted-contributors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !isActive }),
      });
      fetchContributors();
    } catch (error) {
      console.error("Error toggling:", error);
    }
  }

  async function deleteContributor(id: string) {
    if (!confirm("¿Eliminar este contribuidor de confianza?")) return;
    try {
      await fetch(`/api/admin/community/trusted-contributors?id=${id}`, {
        method: "DELETE",
      });
      fetchContributors();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  }

  function resetForm() {
    setFormData({
      identifierType: "email",
      identifierValue: "",
      displayName: "",
      trustLevel: 1,
      autoApproveMessages: true,
      autoApprovePhotos: true,
      autoFeature: false,
      notes: "",
    });
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <Link
            href="/admin/community"
            className="inline-flex items-center gap-2 text-sm text-slc-muted hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Moderación
          </Link>
          <h1 className="font-oswald text-3xl uppercase flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-green-500" />
            Contribuidores de Confianza
          </h1>
          <p className="text-slc-muted mt-1">
            Usuarios cuyo contenido se aprueba automáticamente
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <ShieldPlus className="w-4 h-4 mr-2" />
          Agregar Contribuidor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-slc-card border border-slc-border rounded-xl p-4 text-center">
          <Shield className="w-6 h-6 text-blue-500 mx-auto mb-2" />
          <p className="font-oswald text-2xl">
            {contributors.filter((c) => c.trustLevel === 1).length}
          </p>
          <p className="text-xs text-slc-muted">Básico</p>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-xl p-4 text-center">
          <ShieldCheck className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <p className="font-oswald text-2xl">
            {contributors.filter((c) => c.trustLevel === 2).length}
          </p>
          <p className="text-xs text-slc-muted">Verificado</p>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-xl p-4 text-center">
          <Crown className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
          <p className="font-oswald text-2xl">
            {contributors.filter((c) => c.trustLevel === 3).length}
          </p>
          <p className="text-xs text-slc-muted">VIP</p>
        </div>
      </div>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slc-card border border-slc-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slc-border">
              <h2 className="font-oswald text-xl uppercase">
                Agregar Contribuidor
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Identifier Type */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, identifierType: "email" })}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors",
                    formData.identifierType === "email"
                      ? "bg-primary text-white border-primary"
                      : "border-slc-border text-slc-muted hover:text-white"
                  )}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, identifierType: "instagram" })}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border transition-colors",
                    formData.identifierType === "instagram"
                      ? "bg-pink-500 text-white border-pink-500"
                      : "border-slc-border text-slc-muted hover:text-white"
                  )}
                >
                  <Instagram className="w-4 h-4" />
                  Instagram
                </button>
              </div>

              {/* Identifier Value */}
              <div>
                <label className="block text-sm text-slc-muted mb-1.5">
                  {formData.identifierType === "email" ? "Email" : "Usuario de Instagram"}
                </label>
                <Input
                  value={formData.identifierValue}
                  onChange={(e) =>
                    setFormData({ ...formData, identifierValue: e.target.value })
                  }
                  placeholder={
                    formData.identifierType === "email"
                      ? "usuario@ejemplo.com"
                      : "@usuario"
                  }
                  required
                />
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm text-slc-muted mb-1.5">
                  Nombre (opcional)
                </label>
                <Input
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  placeholder="Nombre para mostrar"
                />
              </div>

              {/* Trust Level */}
              <div>
                <label className="block text-sm text-slc-muted mb-1.5">
                  Nivel de Confianza
                </label>
                <div className="flex gap-2">
                  {TRUST_LEVELS.map(({ level, label, icon: Icon, color }) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData({ ...formData, trustLevel: level })}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 py-3 rounded-lg border transition-colors",
                        formData.trustLevel === level
                          ? "bg-slc-dark border-primary"
                          : "border-slc-border hover:border-primary/50"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", color)} />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoApproveMessages}
                    onChange={(e) =>
                      setFormData({ ...formData, autoApproveMessages: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <MessageCircle className="w-4 h-4 text-slc-muted" />
                  <span className="text-sm">Auto-aprobar mensajes</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoApprovePhotos}
                    onChange={(e) =>
                      setFormData({ ...formData, autoApprovePhotos: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <Camera className="w-4 h-4 text-slc-muted" />
                  <span className="text-sm">Auto-aprobar fotos</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.autoFeature}
                    onChange={(e) =>
                      setFormData({ ...formData, autoFeature: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">Auto-destacar contenido</span>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm text-slc-muted mb-1.5">
                  Notas (opcional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Razón para agregar, etc..."
                  rows={2}
                  className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ShieldPlus className="w-4 h-4 mr-2" />
                  )}
                  Agregar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contributors List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : contributors.length === 0 ? (
        <div className="text-center py-16 bg-slc-card rounded-xl">
          <ShieldCheck className="w-16 h-16 text-slc-muted mx-auto mb-4" />
          <h3 className="font-oswald text-xl uppercase mb-2">Sin Contribuidores</h3>
          <p className="text-slc-muted mb-4">
            Agrega usuarios de confianza para auto-aprobar su contenido
          </p>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Primero
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {contributors.map((contributor) => {
            const trustLevel = TRUST_LEVELS.find((t) => t.level === contributor.trustLevel);
            const TrustIcon = trustLevel?.icon || Shield;

            return (
              <div
                key={contributor.id}
                className={cn(
                  "bg-slc-card border rounded-xl p-4 transition-all",
                  contributor.isActive ? "border-slc-border" : "border-red-500/30 opacity-60"
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                      contributor.trustLevel === 3
                        ? "bg-yellow-500/20"
                        : contributor.trustLevel === 2
                        ? "bg-green-500/20"
                        : "bg-blue-500/20"
                    )}
                  >
                    <TrustIcon className={cn("w-6 h-6", trustLevel?.color)} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {contributor.displayName && (
                        <span className="font-medium text-white">
                          {contributor.displayName}
                        </span>
                      )}
                      <span className="text-sm text-slc-muted flex items-center gap-1">
                        {contributor.identifierType === "email" ? (
                          <Mail className="w-3 h-3" />
                        ) : (
                          <Instagram className="w-3 h-3" />
                        )}
                        {contributor.identifierValue}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full",
                          trustLevel?.color,
                          contributor.trustLevel === 3
                            ? "bg-yellow-500/10"
                            : contributor.trustLevel === 2
                            ? "bg-green-500/10"
                            : "bg-blue-500/10"
                        )}
                      >
                        {trustLevel?.label}
                      </span>

                      {contributor.autoApproveMessages && (
                        <span className="text-slc-muted flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          Mensajes
                        </span>
                      )}
                      {contributor.autoApprovePhotos && (
                        <span className="text-slc-muted flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          Fotos
                        </span>
                      )}
                      {contributor.autoFeature && (
                        <span className="text-yellow-500 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Destacar
                        </span>
                      )}

                      <span className="text-slc-muted">
                        {contributor.approvedCount} aprobaciones
                      </span>
                    </div>

                    {contributor.notes && (
                      <p className="text-xs text-slc-muted mt-2 italic">
                        "{contributor.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={contributor.isActive ? "outline" : "default"}
                      onClick={() => toggleActive(contributor.id, contributor.isActive)}
                    >
                      {contributor.isActive ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-400"
                      onClick={() => deleteContributor(contributor.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
