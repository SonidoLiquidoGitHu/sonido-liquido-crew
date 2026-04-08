"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DirectDropboxUploader } from "@/components/admin/DirectDropboxUploader";
import { StyleSettingsEditor } from "@/components/admin/StyleSettingsEditor";
import { type StyleSettings } from "@/lib/style-config";
import {
  ArrowLeft,
  Save,
  Music,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Cloud,
  Image as ImageIcon,
  Headphones,
  Download,
  Lock,
  Play,
  Instagram,
  Facebook,
  Link as LinkIcon,
  Trash2,
  ExternalLink,
  Eye,
  BarChart3,
} from "lucide-react";

const musicKeys = [
  "C major", "C minor", "C# major", "C# minor",
  "D major", "D minor", "D# major", "D# minor",
  "E major", "E minor",
  "F major", "F minor", "F# major", "F# minor",
  "G major", "G minor", "G# major", "G# minor",
  "A major", "A minor", "A# major", "A# minor",
  "B major", "B minor",
];

const genres = [
  "Boom Bap", "Trap", "Lo-Fi", "Old School", "West Coast",
  "East Coast", "Southern", "Instrumental", "Underground",
  "Hardcore", "Conscious", "Melodic", "Dark", "Chill",
];

interface Beat {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  producerId: string | null;
  producerName: string | null;
  bpm: number | null;
  key: string | null;
  genre: string | null;
  tags: string | null;
  duration: number | null;
  previewAudioUrl: string | null;
  fullAudioUrl: string | null;
  stemPackUrl: string | null;
  coverImageUrl: string | null;
  isFree: boolean;
  price: number | null;
  currency: string;
  gateEnabled: boolean;
  requireEmail: boolean;
  requireSpotifyFollow: boolean;
  spotifyArtistUrl: string | null;
  requireSpotifyPlay: boolean;
  spotifySongUrl: string | null;
  requireHyperfollow: boolean;
  hyperfollowUrl: string | null;
  requireInstagramShare: boolean;
  instagramShareText: string | null;
  requireFacebookShare: boolean;
  facebookShareText: string | null;
  requireCustomAction: boolean;
  customActionLabel: string | null;
  customActionUrl: string | null;
  customActionInstructions: string | null;
  isActive: boolean;
  isFeatured: boolean;
  playCount: number;
  downloadCount: number;
  viewCount: number;
  styleSettings: Partial<StyleSettings> | null;
}

export default function EditBeatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [beat, setBeat] = useState<Beat | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    producerId: "",
    producerName: "",
    bpm: "",
    key: "",
    genre: "",
    tags: "",
    duration: "",
    previewAudioUrl: "",
    fullAudioUrl: "",
    stemPackUrl: "",
    coverImageUrl: "",
    isFree: true,
    price: "",
    currency: "USD",
    gateEnabled: true,
    requireEmail: true,
    requireSpotifyFollow: false,
    spotifyArtistUrl: "",
    requireSpotifyPlay: false,
    spotifySongUrl: "",
    requireHyperfollow: false,
    hyperfollowUrl: "",
    requireInstagramShare: false,
    instagramShareText: "",
    requireFacebookShare: false,
    facebookShareText: "",
    requireCustomAction: false,
    customActionLabel: "",
    customActionUrl: "",
    customActionInstructions: "",
    isActive: true,
    isFeatured: false,
    styleSettings: {} as Partial<StyleSettings>,
  });

  useEffect(() => {
    fetchBeat();
  }, [resolvedParams.id]);

  const fetchBeat = async () => {
    try {
      const res = await fetch(`/api/admin/beats/${resolvedParams.id}`);
      const data = await res.json();

      if (data.success && data.data) {
        const b = data.data as Beat;
        setBeat(b);

        // Parse tags if they're a JSON string
        let tagsString = "";
        if (b.tags) {
          try {
            const tagsArray = JSON.parse(b.tags);
            tagsString = Array.isArray(tagsArray) ? tagsArray.join(", ") : b.tags;
          } catch {
            tagsString = b.tags;
          }
        }

        setFormData({
          title: b.title || "",
          slug: b.slug || "",
          description: b.description || "",
          producerId: b.producerId || "",
          producerName: b.producerName || "",
          bpm: b.bpm?.toString() || "",
          key: b.key || "",
          genre: b.genre || "",
          tags: tagsString,
          duration: b.duration?.toString() || "",
          previewAudioUrl: b.previewAudioUrl || "",
          fullAudioUrl: b.fullAudioUrl || "",
          stemPackUrl: b.stemPackUrl || "",
          coverImageUrl: b.coverImageUrl || "",
          isFree: b.isFree ?? true,
          price: b.price?.toString() || "",
          currency: b.currency || "USD",
          gateEnabled: b.gateEnabled ?? true,
          requireEmail: b.requireEmail ?? true,
          requireSpotifyFollow: b.requireSpotifyFollow ?? false,
          spotifyArtistUrl: b.spotifyArtistUrl || "",
          requireSpotifyPlay: b.requireSpotifyPlay ?? false,
          spotifySongUrl: b.spotifySongUrl || "",
          requireHyperfollow: b.requireHyperfollow ?? false,
          hyperfollowUrl: b.hyperfollowUrl || "",
          requireInstagramShare: b.requireInstagramShare ?? false,
          instagramShareText: b.instagramShareText || "",
          requireFacebookShare: b.requireFacebookShare ?? false,
          facebookShareText: b.facebookShareText || "",
          requireCustomAction: b.requireCustomAction ?? false,
          customActionLabel: b.customActionLabel || "",
          customActionUrl: b.customActionUrl || "",
          customActionInstructions: b.customActionInstructions || "",
          isActive: b.isActive ?? true,
          isFeatured: b.isFeatured ?? false,
          styleSettings: b.styleSettings || {},
        });
      }
    } catch (error) {
      console.error("Error fetching beat:", error);
      showMessage("error", "Error al cargar el beat");
    } finally {
      setIsFetching(false);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCoverUpload = (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({ ...prev, coverImageUrl: url }));
    showMessage("success", `Portada "${filename}" subida`);
  };

  const handlePreviewUpload = (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({ ...prev, previewAudioUrl: url }));
    showMessage("success", `Preview "${filename}" subido`);
  };

  const handleFullAudioUpload = (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({ ...prev, fullAudioUrl: url }));
    showMessage("success", `Beat completo "${filename}" subido`);
  };

  const handleStemPackUpload = (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({ ...prev, stemPackUrl: url }));
    showMessage("success", `Stems "${filename}" subidos`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      showMessage("error", "El título es requerido");
      return;
    }

    setIsLoading(true);
    try {
      const submitData = {
        id: resolvedParams.id,
        ...formData,
        bpm: formData.bpm ? parseInt(formData.bpm) : null,
        duration: formData.duration ? parseInt(formData.duration) : null,
        price: formData.price ? parseFloat(formData.price) : null,
        tags: formData.tags ? JSON.stringify(formData.tags.split(",").map(t => t.trim())) : null,
        styleSettings: formData.styleSettings || null,
      };

      const response = await fetch("/api/admin/beats", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        showMessage("success", "Beat actualizado exitosamente");
        setTimeout(() => {
          router.push("/admin/beats");
        }, 1500);
      } else {
        showMessage("error", data.error || "Error al actualizar beat");
      }
    } catch (error) {
      showMessage("error", "Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/admin/beats?id=${resolvedParams.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        showMessage("success", "Beat eliminado");
        setTimeout(() => {
          router.push("/admin/beats");
        }, 1000);
      } else {
        showMessage("error", data.error || "Error al eliminar");
      }
    } catch (error) {
      showMessage("error", "Error de conexión");
    }
    setShowDeleteConfirm(false);
  };

  if (isFetching) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-slc-muted">Cargando beat...</p>
        </div>
      </div>
    );
  }

  if (!beat) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
          <h2 className="font-oswald text-2xl mb-2">Beat no encontrado</h2>
          <p className="text-slc-muted mb-4">El beat que buscas no existe o fue eliminado.</p>
          <Button asChild>
            <Link href="/admin/beats">Volver a Beats</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/beats">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-oswald text-3xl uppercase">Editar Beat</h1>
            <p className="text-slc-muted mt-1">{beat.title}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-slc-card border border-slc-border rounded-lg">
            <Play className="w-4 h-4 text-spotify" />
            <span className="font-medium">{beat.playCount}</span>
            <span className="text-slc-muted text-sm">plays</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slc-card border border-slc-border rounded-lg">
            <Download className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{beat.downloadCount}</span>
            <span className="text-slc-muted text-sm">descargas</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slc-card border border-slc-border rounded-lg">
            <Eye className="w-4 h-4 text-purple-500" />
            <span className="font-medium">{beat.viewCount}</span>
            <span className="text-slc-muted text-sm">vistas</span>
          </div>
          <Button asChild variant="outline">
            <Link href={`/beats/${beat.slug}`} target="_blank">
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver página
            </Link>
          </Button>
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

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm mb-3">¿Estás seguro de eliminar este beat? Esta acción no se puede deshacer.</p>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              Sí, eliminar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6">Información Básica</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm text-slc-muted mb-2">Título del Beat *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Nombre del beat"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm text-slc-muted mb-2">Slug (URL)</label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="nombre-del-beat"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Nombre del Productor</label>
                  <Input
                    value={formData.producerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, producerName: e.target.value }))}
                    placeholder="Nombre del productor"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">BPM</label>
                  <Input
                    type="number"
                    value={formData.bpm}
                    onChange={(e) => setFormData(prev => ({ ...prev, bpm: e.target.value }))}
                    placeholder="90"
                    min="40"
                    max="300"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Tonalidad</label>
                  <select
                    value={formData.key}
                    onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                    className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="">Seleccionar...</option>
                    {musicKeys.map((key) => (
                      <option key={key} value={key}>{key}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Género</label>
                  <select
                    value={formData.genre}
                    onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                    className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  >
                    <option value="">Seleccionar...</option>
                    {genres.map((genre) => (
                      <option key={genre} value={genre}>{genre}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm text-slc-muted mb-2">Tags (separados por coma)</label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="dark, melodic, trap"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm text-slc-muted mb-2">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción del beat..."
                    rows={3}
                    className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Audio Files */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-500" />
                Archivos de Audio
              </h2>

              <div className="space-y-6">
                {/* Preview Audio */}
                <div>
                  <label className="block text-sm text-slc-muted mb-2 flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Preview (30-60 segundos)
                  </label>
                  <DirectDropboxUploader
                    onUploadComplete={handlePreviewUpload}
                    accept="audio/*"
                    maxSize={20}
                    folder="/beats/previews"
                    label="Subir preview"
                    currentUrl={formData.previewAudioUrl}
                  />
                  {formData.previewAudioUrl && (
                    <audio
                      controls
                      src={formData.previewAudioUrl}
                      className="w-full mt-3 rounded-lg"
                    />
                  )}
                </div>

                {/* Full Audio */}
                <div>
                  <label className="block text-sm text-slc-muted mb-2 flex items-center gap-2">
                    <Headphones className="w-4 h-4" />
                    Beat Completo (MP3/WAV)
                  </label>
                  <DirectDropboxUploader
                    onUploadComplete={handleFullAudioUpload}
                    accept="audio/*"
                    maxSize={100}
                    folder="/beats/full"
                    label="Subir beat completo"
                    currentUrl={formData.fullAudioUrl}
                  />
                  {formData.fullAudioUrl && (
                    <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-sm text-green-500 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Beat listo para descarga
                      </p>
                    </div>
                  )}
                </div>

                {/* Stem Pack */}
                <div>
                  <label className="block text-sm text-slc-muted mb-2 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Stems / Track-outs (ZIP)
                  </label>
                  <DirectDropboxUploader
                    onUploadComplete={handleStemPackUpload}
                    accept=".zip,.rar"
                    maxSize={150}
                    folder="/beats/stems"
                    label="Subir stems"
                    currentUrl={formData.stemPackUrl}
                  />
                </div>
              </div>
            </div>

            {/* Download Gate */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
                  <Lock className="w-5 h-5 text-orange-500" />
                  Download Gate
                </h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.gateEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, gateEnabled: e.target.checked }))}
                    className="w-4 h-4 rounded border-slc-border"
                  />
                  <span className="text-sm">Activar</span>
                </label>
              </div>

              {formData.gateEnabled && (
                <div className="space-y-4">
                  {/* Email requirement */}
                  <label className="flex items-center gap-3 p-3 bg-slc-card rounded-lg cursor-pointer hover:bg-slc-card/80">
                    <input
                      type="checkbox"
                      checked={formData.requireEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, requireEmail: e.target.checked }))}
                      className="w-4 h-4 rounded border-slc-border"
                    />
                    <div>
                      <span className="font-medium">Requerir Email</span>
                      <p className="text-xs text-slc-muted">Captura emails para tu lista</p>
                    </div>
                  </label>

                  {/* Spotify Follow */}
                  <div className="p-4 bg-slc-card rounded-lg space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.requireSpotifyFollow}
                        onChange={(e) => setFormData(prev => ({ ...prev, requireSpotifyFollow: e.target.checked }))}
                        className="w-4 h-4 rounded border-slc-border"
                      />
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-spotify" />
                        <span className="font-medium">Seguir en Spotify</span>
                      </div>
                    </label>
                    {formData.requireSpotifyFollow && (
                      <Input
                        value={formData.spotifyArtistUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, spotifyArtistUrl: e.target.value }))}
                        placeholder="https://open.spotify.com/artist/..."
                        type="url"
                      />
                    )}
                  </div>

                  {/* Spotify Play */}
                  <div className="p-4 bg-slc-card rounded-lg space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.requireSpotifyPlay}
                        onChange={(e) => setFormData(prev => ({ ...prev, requireSpotifyPlay: e.target.checked }))}
                        className="w-4 h-4 rounded border-slc-border"
                      />
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4 text-spotify" />
                        <span className="font-medium">Escuchar canción en Spotify</span>
                      </div>
                    </label>
                    {formData.requireSpotifyPlay && (
                      <Input
                        value={formData.spotifySongUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, spotifySongUrl: e.target.value }))}
                        placeholder="https://open.spotify.com/track/..."
                        type="url"
                      />
                    )}
                  </div>

                  {/* Hyperfollow */}
                  <div className="p-4 bg-slc-card rounded-lg space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.requireHyperfollow}
                        onChange={(e) => setFormData(prev => ({ ...prev, requireHyperfollow: e.target.checked }))}
                        className="w-4 h-4 rounded border-slc-border"
                      />
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-primary" />
                        <span className="font-medium">Hyperfollow / Smart Link</span>
                      </div>
                    </label>
                    {formData.requireHyperfollow && (
                      <Input
                        value={formData.hyperfollowUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, hyperfollowUrl: e.target.value }))}
                        placeholder="https://onerpm.link/..."
                        type="url"
                      />
                    )}
                  </div>

                  {/* Instagram Share */}
                  <div className="p-4 bg-slc-card rounded-lg space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.requireInstagramShare}
                        onChange={(e) => setFormData(prev => ({ ...prev, requireInstagramShare: e.target.checked }))}
                        className="w-4 h-4 rounded border-slc-border"
                      />
                      <div className="flex items-center gap-2">
                        <Instagram className="w-4 h-4 text-pink-500" />
                        <span className="font-medium">Compartir en Instagram</span>
                      </div>
                    </label>
                    {formData.requireInstagramShare && (
                      <Input
                        value={formData.instagramShareText}
                        onChange={(e) => setFormData(prev => ({ ...prev, instagramShareText: e.target.value }))}
                        placeholder="Texto para copiar en Instagram..."
                      />
                    )}
                  </div>

                  {/* Custom Action */}
                  <div className="p-4 bg-slc-card rounded-lg space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.requireCustomAction}
                        onChange={(e) => setFormData(prev => ({ ...prev, requireCustomAction: e.target.checked }))}
                        className="w-4 h-4 rounded border-slc-border"
                      />
                      <span className="font-medium">Acción Personalizada</span>
                    </label>
                    {formData.requireCustomAction && (
                      <div className="space-y-2">
                        <Input
                          value={formData.customActionLabel}
                          onChange={(e) => setFormData(prev => ({ ...prev, customActionLabel: e.target.value }))}
                          placeholder="Etiqueta del botón"
                        />
                        <Input
                          value={formData.customActionUrl}
                          onChange={(e) => setFormData(prev => ({ ...prev, customActionUrl: e.target.value }))}
                          placeholder="URL de la acción"
                          type="url"
                        />
                        <Input
                          value={formData.customActionInstructions}
                          onChange={(e) => setFormData(prev => ({ ...prev, customActionInstructions: e.target.value }))}
                          placeholder="Instrucciones para el usuario"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Style Settings */}
            <StyleSettingsEditor
              value={formData.styleSettings}
              onChange={(styleSettings) => setFormData(prev => ({ ...prev, styleSettings }))}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Cover Image */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-500" />
                Portada
              </h2>

              <div className="aspect-square rounded-lg overflow-hidden bg-slc-card mb-4">
                {formData.coverImageUrl ? (
                  <img
                    src={formData.coverImageUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-12 h-12 text-slc-muted" />
                  </div>
                )}
              </div>

              <DirectDropboxUploader
                onUploadComplete={handleCoverUpload}
                accept="image/*"
                maxSize={10}
                folder="/beats/covers"
                label="Subir portada"
                currentUrl={formData.coverImageUrl}
              />
            </div>

            {/* Pricing */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Precio</h2>

              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFree}
                    onChange={(e) => setFormData(prev => ({ ...prev, isFree: e.target.checked }))}
                    className="w-4 h-4 rounded border-slc-border"
                  />
                  <span>Gratis (con download gate)</span>
                </label>

                {!formData.isFree && (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="29.99"
                      min="0"
                      step="0.01"
                      className="flex-1"
                    />
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                      className="px-3 bg-slc-card border border-slc-border rounded-lg"
                    >
                      <option value="USD">USD</option>
                      <option value="MXN">MXN</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Opciones</h2>

              <div className="space-y-3 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-slc-border"
                  />
                  <span>Beat Activo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                    className="w-4 h-4 rounded border-slc-border"
                  />
                  <span>Destacar</span>
                </label>
              </div>

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
                  Guardar Cambios
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/admin/beats")}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-red-500 hover:text-red-400 hover:bg-red-500/10"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar Beat
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
