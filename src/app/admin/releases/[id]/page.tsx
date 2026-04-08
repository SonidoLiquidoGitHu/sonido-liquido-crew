"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropboxUploadButton } from "@/components/admin/DropboxUploadButton";
import {
  ArrowLeft,
  Save,
  Disc3,
  Link as LinkIcon,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Artist {
  id: string;
  name: string;
  slug: string;
}

export default function EditReleasePage() {
  const router = useRouter();
  const params = useParams();
  const releaseId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    spotifyUrl: "",
    spotifyId: "",
    releaseType: "album" as "album" | "single" | "maxi-single" | "ep" | "compilation" | "mixtape",
    releaseDate: "",
    artistId: "",
    coverImageUrl: "",
    description: "",
    appleMusicUrl: "",
    youtubeMusicUrl: "",
    isFeatured: false,
  });

  // Fetch release data
  useEffect(() => {
    async function fetchRelease() {
      try {
        const res = await fetch(`/api/admin/releases/${releaseId}`);
        const data = await res.json();

        if (data.success && data.data) {
          const release = data.data;
          setFormData({
            title: release.title || "",
            spotifyUrl: release.spotifyUrl || "",
            spotifyId: release.spotifyId || "",
            releaseType: release.releaseType || "album",
            releaseDate: release.releaseDate
              ? new Date(release.releaseDate).toISOString().split("T")[0]
              : "",
            artistId: release.artistId || "",
            coverImageUrl: release.coverImageUrl || "",
            description: release.description || "",
            appleMusicUrl: release.appleMusicUrl || "",
            youtubeMusicUrl: release.youtubeMusicUrl || "",
            isFeatured: release.isFeatured || false,
          });
        } else {
          setMessage({ type: "error", text: "No se pudo cargar el lanzamiento" });
        }
      } catch (error) {
        console.error("Failed to fetch release:", error);
        setMessage({ type: "error", text: "Error al cargar el lanzamiento" });
      } finally {
        setIsFetching(false);
      }
    }

    fetchRelease();
  }, [releaseId]);

  // Fetch artists on mount
  useEffect(() => {
    async function fetchArtists() {
      setArtistsLoading(true);
      try {
        const res = await fetch("/api/artists");
        const data = await res.json();
        if (data.success && data.data) {
          setArtists(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch artists:", error);
      } finally {
        setArtistsLoading(false);
      }
    }
    fetchArtists();
  }, []);

  // Fetch album info from Spotify URL
  const fetchFromSpotify = async () => {
    if (!formData.spotifyUrl) return;

    setIsLoading(true);
    setMessage(null);
    try {
      const match = formData.spotifyUrl.match(/album\/([a-zA-Z0-9]+)/);
      if (!match) {
        setMessage({ type: "error", text: "URL de Spotify inválida" });
        setIsLoading(false);
        return;
      }

      const spotifyId = match[1];
      const response = await fetch(
        `https://open.spotify.com/oembed?url=https://open.spotify.com/album/${spotifyId}`
      );

      if (!response.ok) {
        setMessage({ type: "error", text: "No se pudo obtener información del álbum" });
        return;
      }

      const data = await response.json();

      setFormData((prev) => ({
        ...prev,
        title: data.title || prev.title,
        spotifyId,
        coverImageUrl: data.thumbnail_url || prev.coverImageUrl,
      }));

      setMessage({ type: "success", text: "Información obtenida de Spotify" });
    } catch (error) {
      setMessage({ type: "error", text: "Error al conectar con Spotify" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      setMessage({ type: "error", text: "El título es requerido" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/releases/${releaseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Lanzamiento actualizado exitosamente" });
        setTimeout(() => {
          router.push("/admin/releases");
        }, 1500);
      } else {
        setMessage({ type: "error", text: data.error || "Error al actualizar lanzamiento" });
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/admin/releases/${releaseId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Lanzamiento eliminado" });
        setTimeout(() => {
          router.push("/admin/releases");
        }, 1000);
      } else {
        setMessage({ type: "error", text: data.error || "Error al eliminar" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  if (isFetching) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-slc-muted">Cargando lanzamiento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/releases">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-oswald text-2xl sm:text-3xl uppercase">Editar Lanzamiento</h1>
          <p className="text-slc-muted mt-1 text-sm sm:text-base">{formData.title || "Sin título"}</p>
        </div>
        <Button
          variant="outline"
          className="text-red-500 border-red-500/50 hover:bg-red-500/10"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Eliminar
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
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Import from Spotify */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-4 sm:p-6">
              <h2 className="font-oswald text-xl uppercase mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-spotify" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"
                  />
                </svg>
                Importar de Spotify
              </h2>
              <p className="text-slc-muted text-sm mb-4">
                Pega la URL del álbum de Spotify para actualizar la información.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  value={formData.spotifyUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, spotifyUrl: e.target.value }))}
                  placeholder="https://open.spotify.com/album/..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchFromSpotify}
                  disabled={isLoading || !formData.spotifyUrl}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4 mr-2 sm:mr-0" />
                      <span className="sm:hidden">Importar</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Basic Info */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-4 sm:p-6">
              <h2 className="font-oswald text-xl uppercase mb-6">Información Básica</h2>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm text-slc-muted mb-2">Título *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Nombre del álbum"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Artista Principal</label>
                  <div className="relative">
                    {artistsLoading ? (
                      <div className="w-full h-10 px-4 py-2 bg-slc-card border border-slc-border rounded-lg flex items-center text-slc-muted">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Cargando artistas...
                      </div>
                    ) : (
                      <>
                        <select
                          value={formData.artistId}
                          onChange={(e) => setFormData((prev) => ({ ...prev, artistId: e.target.value }))}
                          className="w-full h-12 px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary text-white appearance-none cursor-pointer"
                          style={{ WebkitAppearance: "none", MozAppearance: "none" }}
                        >
                          <option value="">Seleccionar artista...</option>
                          {artists.map((artist) => (
                            <option key={artist.id} value={artist.id}>
                              {artist.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slc-muted pointer-events-none" />
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slc-muted mb-2">Tipo de Lanzamiento *</label>
                    <div className="relative">
                      <select
                        value={formData.releaseType}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            releaseType: e.target.value as typeof formData.releaseType,
                          }))
                        }
                        className="w-full h-12 px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary text-white appearance-none cursor-pointer"
                        style={{ WebkitAppearance: "none", MozAppearance: "none" }}
                      >
                        <option value="album">Álbum</option>
                        <option value="ep">EP</option>
                        <option value="single">Single</option>
                        <option value="maxi-single">Maxi-Single</option>
                        <option value="compilation">Compilación</option>
                        <option value="mixtape">Mixtape</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slc-muted pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slc-muted mb-2">Fecha de Lanzamiento *</label>
                    <Input
                      type="date"
                      value={formData.releaseDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, releaseDate: e.target.value }))}
                      required
                      className="h-12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Spotify ID</label>
                  <Input
                    value={formData.spotifyId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, spotifyId: e.target.value }))}
                    placeholder="Se extrae de la URL"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción del lanzamiento..."
                    rows={3}
                    className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Additional Links */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-4 sm:p-6">
              <h2 className="font-oswald text-xl uppercase mb-6">Enlaces Adicionales</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slc-muted mb-2">Apple Music</label>
                  <Input
                    value={formData.appleMusicUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, appleMusicUrl: e.target.value }))}
                    placeholder="https://music.apple.com/..."
                    type="url"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slc-muted mb-2">YouTube Music</label>
                  <Input
                    value={formData.youtubeMusicUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, youtubeMusicUrl: e.target.value }))
                    }
                    placeholder="https://music.youtube.com/..."
                    type="url"
                  />
                </div>
              </div>
            </div>

            {/* Mobile Submit Button */}
            <div className="lg:hidden">
              <Button type="submit" className="w-full h-12" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar Cambios
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Cover Preview */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-4 sm:p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Portada</h2>
              <div className="aspect-square rounded-lg overflow-hidden bg-slc-card mb-4">
                {formData.coverImageUrl ? (
                  <img src={formData.coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Disc3 className="w-16 h-16 text-slc-muted" />
                  </div>
                )}
              </div>

              {/* Dropbox Upload */}
              <div className="mb-3">
                <DropboxUploadButton
                  onUploadComplete={(url) => setFormData((prev) => ({ ...prev, coverImageUrl: url }))}
                  folder="releases"
                  accept="image/*"
                  buttonText="Cambiar portada"
                  className="w-full"
                />
              </div>

              {/* Manual URL Input */}
              <Input
                value={formData.coverImageUrl}
                onChange={(e) => setFormData((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
                placeholder="O pega URL de imagen"
                type="url"
              />
            </div>

            {/* Actions - Desktop only */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-4 sm:p-6 hidden lg:block">
              <h2 className="font-oswald text-lg uppercase mb-4">Acciones</h2>
              <div className="space-y-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Guardar Cambios
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => router.push("/admin/releases")}>
                  Cancelar
                </Button>
              </div>
            </div>

            {/* Options */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-4 sm:p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Opciones</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                  className="w-4 h-4 rounded border-slc-border"
                />
                <span>Destacar en Home</span>
              </label>
            </div>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slc-dark border-slc-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              Eliminar Lanzamiento
            </DialogTitle>
            <DialogDescription className="text-slc-muted">
              ¿Estás seguro de que quieres eliminar{" "}
              <span className="text-white font-medium">"{formData.title}"</span>?
              <br />
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
