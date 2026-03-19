"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Music2,
  ArrowLeft,
  Plus,
  Eye,
  Edit,
  Trash2,
  Copy,
  Mail,
  Loader2,
  X,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  LogOut,
} from "lucide-react";
import ReleaseEditModal from "../../../components/admin/ReleaseEditModal";
interface Release {
  id: string;
  title: string;
  titleEn: string | null;
  artistName: string | null;
  releaseType: string;
  releaseDate: string | null;
  coverImageUrl: string | null;
  isActive: number;
  isPublic: number;
  isPublished: number;
}
export default function ReleasesAdminPage() {
  const router = useRouter();
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [editingRelease, setEditingRelease] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
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
      } catch (err) {
        router.push("/admin/login");
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);
  const fetchReleases = useCallback(async () => {
    try {
      const res = await fetch("/api/releases?all=true");
      const data = await res.json();
      if (data.success) {
        setReleases(data.releases);
      }
    } catch (err) {
      console.error("Error fetching releases:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    if (isAuthenticated) {
      fetchReleases();
    }
  }, [isAuthenticated, fetchReleases]);
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };
  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este release?")) return;
    try {
      const res = await fetch(`/api/releases/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Release eliminado exitosamente" });
        fetchReleases();
      } else {
        setMessage({ type: "error", text: "Error al eliminar el release" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Error al eliminar el release" });
    }
  };
  const handleCopyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/releases/${id}`);
    setMessage({ type: "success", text: "Link copiado al portapapeles" });
  };
  const getDaysRemaining = (releaseDate: string | null) => {
    if (!releaseDate) return null;
    const release = new Date(releaseDate);
    const today = new Date();
    const diffTime = release.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Sin fecha";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="p-2 hover:bg-zinc-700 rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5 text-zinc-400" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">MEDIA RELEASES</h1>
                <p className="text-zinc-400 text-sm">Gestiona previews para medios y prensa</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nuevo Release
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === "success"
              ? "bg-green-500/20 border border-green-500/50 text-green-300"
              : "bg-red-500/20 border border-red-500/50 text-red-300"
          }`}>
            {message.type === "success" ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {/* Stats */}
        <div className="mb-6 p-4 bg-zinc-800 rounded-xl border border-zinc-700">
          <p className="text-amber-400 font-bold text-lg">{releases.length} MEDIA RELEASES</p>
        </div>
        {/* Releases List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
          </div>
        ) : releases.length === 0 ? (
          <div className="text-center py-12 bg-zinc-800 rounded-xl border border-zinc-700">
            <Music2 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">No hay releases todavía</p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors"
            >
              Crear primer release
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {releases.map((release) => {
              const daysRemaining = getDaysRemaining(release.releaseDate);
              return (
                <div
                  key={release.id}
                  className="bg-zinc-800 rounded-xl border border-zinc-700 p-4"
                >
                  <div className="flex items-start gap-4">
                    {/* Cover Image */}
                    <div className="w-24 h-24 rounded-lg bg-zinc-700 flex-shrink-0 overflow-hidden">
                      {release.coverImageUrl ? (
                        <img
                          src={release.coverImageUrl}
                          alt={release.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-zinc-500" />
                          <span className="sr-only">Sin imagen</span>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-white truncate">{release.title}</h3>
                          <p className="text-sm text-zinc-400">{release.artistName || "Sin artista"}</p>
                        </div>
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => window.open(`/releases/${release.id}`, "_blank")}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                            title="Ver"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleCopyLink(release.id)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                            title="Copiar link"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingRelease(release.id)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(release.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-zinc-700 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {/* Tags */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          release.isActive ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-zinc-600 text-zinc-400"
                        }`}>
                          {release.isActive ? "Activo" : "Inactivo"}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          release.isPublic ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "bg-zinc-600 text-zinc-400"
                        }`}>
                          {release.isPublic ? "Público" : "Privado"}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-700 text-zinc-300">
                          {release.releaseType === "album" ? "Álbum" :
                           release.releaseType === "single" ? "Single" :
                           release.releaseType === "ep" ? "EP" : release.releaseType}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {formatDate(release.releaseDate)}
                        </span>
                        {daysRemaining !== null && daysRemaining > 0 && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {daysRemaining} días restantes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      {/* Edit Modal */}
      {(editingRelease || isCreating) && (
        <ReleaseEditModal
          releaseId={editingRelease}
          isOpen={true}
          onClose={() => {
            setEditingRelease(null);
            setIsCreating(false);
          }}
          onSave={() => {
            setEditingRelease(null);
            setIsCreating(false);
            fetchReleases();
            setMessage({ type: "success", text: "Release guardado exitosamente" });
          }}
        />
      )}
    </div>
  );
}
