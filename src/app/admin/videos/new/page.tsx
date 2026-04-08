"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Save,
  Play,
  LinkIcon,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

interface Artist {
  id: string;
  name: string;
  slug: string;
}

export default function NewVideoPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    youtubeUrl: "",
    youtubeId: "",
    thumbnailUrl: "",
    artistId: "",
    description: "",
    isFeatured: false,
    publishedAt: "",
  });

  // Fetch artists on mount
  useEffect(() => {
    async function fetchArtists() {
      try {
        const res = await fetch("/api/artists");
        const data = await res.json();
        if (data.success) {
          setArtists(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch artists:", error);
      }
    }
    fetchArtists();
  }, []);

  // Extract video ID from various YouTube URL formats
  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Fetch video info from YouTube URL
  const fetchFromYouTube = async () => {
    if (!formData.youtubeUrl) return;

    setIsFetching(true);
    try {
      const videoId = extractYouTubeId(formData.youtubeUrl);
      if (!videoId) {
        setMessage({ type: "error", text: "URL de YouTube inválida" });
        return;
      }

      // Use oEmbed to get video info (no API key needed)
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );

      if (!response.ok) {
        setMessage({ type: "error", text: "No se pudo obtener información del video" });
        return;
      }

      const data = await response.json();

      setFormData(prev => ({
        ...prev,
        title: data.title || prev.title,
        youtubeId: videoId,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      }));

      setMessage({ type: "success", text: "Información obtenida de YouTube" });
    } catch (error) {
      setMessage({ type: "error", text: "Error al conectar con YouTube" });
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.youtubeId) {
      setMessage({ type: "error", text: "Por favor completa los campos requeridos" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          youtubeUrl: `https://www.youtube.com/watch?v=${formData.youtubeId}`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Video agregado exitosamente" });
        setTimeout(() => {
          router.push("/admin/videos");
        }, 1500);
      } else {
        setMessage({ type: "error", text: data.error || "Error al agregar video" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/videos">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-oswald text-3xl uppercase">Nuevo Video</h1>
          <p className="text-slc-muted mt-1">
            Agrega un video de YouTube
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === "success"
            ? "bg-green-500/10 border border-green-500/20 text-green-500"
            : "bg-red-500/10 border border-red-500/20 text-red-500"
        }`}>
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Import from YouTube */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-youtube" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                Importar de YouTube
              </h2>
              <p className="text-slc-muted text-sm mb-4">
                Pega la URL del video para importar automáticamente el título y thumbnail.
              </p>
              <div className="flex gap-3">
                <Input
                  value={formData.youtubeUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchFromYouTube}
                  disabled={isFetching || !formData.youtubeUrl}
                >
                  {isFetching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LinkIcon className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Basic Info */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6">Información</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slc-muted mb-2">Título *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Nombre del video"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Artista</label>
                  <select
                    value={formData.artistId}
                    onChange={(e) => setFormData(prev => ({ ...prev, artistId: e.target.value }))}
                    className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="">Sin artista asignado</option>
                    {artists.map((artist) => (
                      <option key={artist.id} value={artist.id}>
                        {artist.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">YouTube ID</label>
                  <Input
                    value={formData.youtubeId}
                    onChange={(e) => setFormData(prev => ({ ...prev, youtubeId: e.target.value }))}
                    placeholder="Se extrae de la URL"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción del video..."
                    rows={3}
                    className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Fecha de Publicación</label>
                  <Input
                    type="date"
                    value={formData.publishedAt}
                    onChange={(e) => setFormData(prev => ({ ...prev, publishedAt: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Thumbnail Preview */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Thumbnail</h2>
              <div className="aspect-video rounded-lg overflow-hidden bg-slc-card mb-4">
                {formData.youtubeId ? (
                  <img
                    src={formData.thumbnailUrl || `https://img.youtube.com/vi/${formData.youtubeId}/maxresdefault.jpg`}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-16 h-16 text-slc-muted" />
                  </div>
                )}
              </div>
              <Input
                value={formData.thumbnailUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                placeholder="URL del thumbnail"
                type="url"
              />
              <p className="text-xs text-slc-muted mt-2">
                Se genera automáticamente de YouTube
              </p>
            </div>

            {/* Actions */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Acciones</h2>
              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Agregar Video
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/admin/videos")}
                >
                  Cancelar
                </Button>
              </div>
            </div>

            {/* Options */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Opciones</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                  className="w-4 h-4 rounded border-slc-border"
                />
                <span>Destacar en Home</span>
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
