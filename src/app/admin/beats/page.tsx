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
  Download,
  Loader2,
  X,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Lock,
  Tag,
} from "lucide-react";
import BeatEditModal from "../../../components/admin/BeatEditModal";
interface Beat {
  id: string;
  title: string;
  producerName: string;
  releaseDate: string | null;
  bpm: number | null;
  keySignature: string | null;
  tags: string | null;
  coverImageUrl: string | null;
  downloadGateEnabled: boolean;
  downloadCount: number;
  isAvailable: boolean;
  isFeatured: boolean;
}
interface Stats {
  totalBeats: number;
  availableBeats: number;
  gatedBeats: number;
  totalDownloads: number;
  producers: number;
}
export default function BeatsAdminPage() {
  const router = useRouter();
  const [beats, setBeats] = useState<Beat[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [editingBeat, setEditingBeat] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
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
  const fetchBeats = useCallback(async () => {
    try {
      const res = await fetch("/api/beats?all=true&stats=true");
      const data = await res.json();
      if (data.success) {
        setBeats(data.beats);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching beats:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    if (isAuthenticated) {
      fetchBeats();
    }
  }, [isAuthenticated, fetchBeats]);
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };
  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este beat?")) return;
    try {
      const res = await fetch(`/api/beats/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Beat eliminado exitosamente" });
        fetchBeats();
      } else {
        setMessage({ type: "error", text: "Error al eliminar el beat" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Error al eliminar el beat" });
    }
  };
  const handleCopyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/beats/${id}`);
    setMessage({ type: "success", text: "Link copiado al portapapeles" });
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
  const parseTags = (tagsString: string | null): string[] => {
    if (!tagsString) return [];
    return tagsString.split(",").map((t) => t.trim()).filter(Boolean);
  };
  if (isCheckingAuth || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
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
                <h1 className="text-xl font-bold text-white">CATÁLOGO DE BEATS</h1>
                <p className="text-zinc-400 text-sm">Gestiona los beats de uso libre</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nuevo Beat
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
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
              <p className="text-zinc-400 text-xs">Total Beats</p>
              <p className="text-2xl font-bold text-amber-500">{stats.totalBeats}</p>
            </div>
            <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
              <p className="text-zinc-400 text-xs">Disponibles</p>
              <p className="text-2xl font-bold text-green-500">{stats.availableBeats}</p>
            </div>
            <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
              <p className="text-zinc-400 text-xs">Con Download Gate</p>
              <p className="text-2xl font-bold text-purple-500">{stats.gatedBeats}</p>
            </div>
            <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
              <p className="text-zinc-400 text-xs">Descargas</p>
              <p className="text-2xl font-bold text-blue-500">{stats.totalDownloads}</p>
            </div>
            <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
              <p className="text-zinc-400 text-xs">Productores</p>
              <p className="text-2xl font-bold text-white">{stats.producers}</p>
            </div>
          </div>
        )}
        {/* Beats List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
          </div>
        ) : beats.length === 0 ? (
          <div className="text-center py-12 bg-zinc-800 rounded-xl border border-zinc-700">
            <Music2 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">No hay beats todavía</p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors"
            >
              Crear primer beat
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {beats.map((beat) => {
              const tags = parseTags(beat.tags);
              return (
                <div
                  key={beat.id}
                  className="bg-zinc-800 rounded-xl border border-zinc-700 p-4"
                >
                  <div className="flex items-start gap-4">
                    {/* Cover Image */}
                    <div className="w-20 h-20 rounded-lg bg-zinc-700 flex-shrink-0 overflow-hidden">
                      {beat.coverImageUrl ? (
                        <img
                          src={beat.coverImageUrl}
                          alt={beat.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music2 className="h-8 w-8 text-zinc-500" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-amber-500 truncate">{beat.title}</h3>
                          <p className="text-sm text-zinc-400">{beat.producerName}</p>
                        </div>
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => window.open(`/beats/${beat.id}`, "_blank")}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                            title="Ver"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleCopyLink(beat.id)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                            title="Copiar link"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingBeat(beat.id)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(beat.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-zinc-700 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {/* Meta info */}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        {beat.bpm && (
                          <span className="px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded">
                            {beat.bpm} BPM
                          </span>
                        )}
                        {beat.keySignature && (
                          <span className="px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded">
                            {beat.keySignature}
                          </span>
                        )}
                        {tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                      {/* Tags */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          beat.isAvailable
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-zinc-600 text-zinc-400"
                        }`}>
                          {beat.isAvailable ? "Disponible" : "No disponible"}
                        </span>
                        {beat.isFeatured && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Destacado
                          </span>
                        )}
                        {beat.downloadGateEnabled && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Download Gate
                          </span>
                        )}
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {beat.downloadCount} descargas
                        </span>
                        <span className="text-xs text-zinc-500">
                          {formatDate(beat.releaseDate)}
                        </span>
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
      {(editingBeat || isCreating) && (
        <BeatEditModal
          beatId={editingBeat}
          isOpen={true}
          onClose={() => {
            setEditingBeat(null);
            setIsCreating(false);
          }}
          onSave={() => {
            setEditingBeat(null);
            setIsCreating(false);
            fetchBeats();
            setMessage({ type: "success", text: "Beat guardado exitosamente" });
          }}
        />
      )}
    </div>
  );
}
