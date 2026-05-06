"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  Music,
  Play,
  Download,
  Eye,
  Star,
  Lock,
  Unlock,
  Loader2,
} from "lucide-react";

interface Beat {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  producerName: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  coverImageUrl: string | null;
  isFree: boolean;
  price: number | null;
  gateEnabled: boolean;
  isActive: boolean;
  isFeatured: boolean;
  playCount: number;
  downloadCount: number;
  viewCount: number;
  createdAt: string;
}

export default function AdminBeatsPage() {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBeats();
  }, []);

  const fetchBeats = async () => {
    try {
      const res = await fetch("/api/admin/beats");
      const data = await res.json();
      if (data.success) {
        setBeats(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching beats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (beat: Beat) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${beat.title}"?`)) {
      return;
    }

    setDeletingId(beat.id);
    try {
      const res = await fetch(`/api/admin/beats?id=${beat.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setBeats((prev) => prev.filter((b) => b.id !== beat.id));
      } else {
        alert("Error al eliminar: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error deleting beat:", error);
      alert("Error al eliminar el beat");
    } finally {
      setDeletingId(null);
    }
  };

  const genres = [...new Set(beats.map((b) => b.genre).filter(Boolean))];

  const filteredBeats = beats.filter((beat) => {
    const matchesSearch = beat.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = !genreFilter || beat.genre === genreFilter;
    return matchesSearch && matchesGenre;
  });

  return (
    <div className="p-6 lg:p-8">
      {/* Link to public beats page */}
      <div className="mb-4">
        <Link
          href="/beats"
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg text-primary hover:bg-primary/20 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="text-sm font-medium">Ver página pública de beats</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase">Beats</h1>
          <p className="text-slc-muted mt-1">
            Gestiona beats con download gates y acciones requeridas
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/beats/new">
            <Plus className="w-4 h-4 mr-2" />
            Agregar Beat
          </Link>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
          <input
            type="text"
            placeholder="Buscar beats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={genreFilter}
          onChange={(e) => setGenreFilter(e.target.value)}
          className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
        >
          <option value="">Todos los géneros</option>
          {genres.map((genre) => (
            <option key={genre} value={genre || ""}>
              {genre}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-primary">{beats.length}</div>
          <div className="text-xs text-slc-muted uppercase">Total</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-green-500">
            {beats.filter((b) => b.isFree).length}
          </div>
          <div className="text-xs text-slc-muted uppercase">Gratis</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-blue-500">
            {beats.reduce((sum, b) => sum + b.playCount, 0).toLocaleString()}
          </div>
          <div className="text-xs text-slc-muted uppercase">Reproducciones</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-purple-500">
            {beats.reduce((sum, b) => sum + b.downloadCount, 0).toLocaleString()}
          </div>
          <div className="text-xs text-slc-muted uppercase">Descargas</div>
        </div>
      </div>

      {/* Beats Grid */}
      <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slc-muted">Cargando beats...</div>
        ) : filteredBeats.length === 0 ? (
          <div className="p-8 text-center">
            <Music className="w-12 h-12 text-slc-muted mx-auto mb-4" />
            <p className="text-slc-muted">No hay beats todavía</p>
            <Button asChild className="mt-4">
              <Link href="/admin/beats/new">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primer Beat
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredBeats.map((beat) => (
              <div
                key={beat.id}
                className="bg-slc-card border border-slc-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
              >
                {/* Cover */}
                <div className="aspect-square relative bg-slc-border">
                  {beat.coverImageUrl ? (
                    <Image
                      src={beat.coverImageUrl}
                      alt={beat.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Music className="w-16 h-16 text-slc-muted" />
                    </div>
                  )}
                  {/* Gate indicator */}
                  <div className="absolute top-2 right-2">
                    {beat.gateEnabled ? (
                      <div className="bg-orange-500/90 rounded-full p-1.5" title="Download Gate Activo">
                        <Lock className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="bg-green-500/90 rounded-full p-1.5" title="Descarga Libre">
                        <Unlock className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  {/* Featured badge */}
                  {beat.isFeatured && (
                    <div className="absolute top-2 left-2">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-lg">{beat.title}</h3>
                      {beat.producerName && (
                        <p className="text-sm text-slc-muted">{beat.producerName}</p>
                      )}
                    </div>
                    {!beat.isFree && beat.price && (
                      <span className="text-primary font-medium">
                        ${beat.price}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {beat.bpm && (
                      <span className="text-xs px-2 py-1 bg-slc-border rounded-full">
                        {beat.bpm} BPM
                      </span>
                    )}
                    {beat.key && (
                      <span className="text-xs px-2 py-1 bg-slc-border rounded-full">
                        {beat.key}
                      </span>
                    )}
                    {beat.genre && (
                      <span className="text-xs px-2 py-1 bg-slc-border rounded-full">
                        {beat.genre}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-slc-muted mb-3">
                    <div className="flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      <span>{beat.playCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      <span>{beat.downloadCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{beat.viewCount}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/beats/${beat.slug}`} target="_blank">
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Ver
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/admin/beats/${beat.id}`}>
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDelete(beat)}
                      disabled={deletingId === beat.id}
                    >
                      {deletingId === beat.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
