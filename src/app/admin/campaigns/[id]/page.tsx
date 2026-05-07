"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DirectDropboxUploader } from "@/components/admin/DirectDropboxUploader";
import { AudioPreviewPlayer } from "@/components/admin/AudioPreviewPlayer";
import { StyleSettingsEditor } from "@/components/admin/StyleSettingsEditor";
import { type StyleSettings } from "@/lib/style-config";
import {
  ArrowLeft,
  Save,
  Megaphone,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Cloud,
  Image as ImageIcon,
  Download,
  Link as LinkIcon,
  Music,
  ExternalLink,
  Eye,
  Users,
  Trash2,
  BarChart3,
  Video,
  Film,
} from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  campaignType: string;
  artistId: string | null;
  coverImageUrl: string | null;
  bannerImageUrl: string | null;
  smartLinkUrl: string | null;
  oneRpmUrl: string | null;
  spotifyPresaveUrl: string | null;
  appleMusicPresaveUrl: string | null;
  downloadGateEnabled: boolean;
  downloadFileUrl: string | null;
  downloadFileName: string | null;
  previewAudioUrl: string | null;
  previewVideoUrl: string | null;
  youtubeVideoId: string | null;
  videoIsVertical: boolean;
  requireSpotifyFollow: boolean;
  spotifyArtistUrl: string | null;
  requireSpotifyPresave: boolean;
  requireEmail: boolean;
  isActive: boolean;
  isFeatured: boolean;
  startDate: string | null;
  endDate: string | null;
  releaseDate: string | null;
  totalViews: number;
  totalConversions: number;
  totalDownloads: number;
  styleSettings: Partial<StyleSettings> | null;
}

const campaignTypes = [
  { value: "presave", label: "Pre-save" },
  { value: "hyperfollow", label: "Hyperfollow" },
  { value: "smartlink", label: "Smart Link" },
  { value: "contest", label: "Concurso" },
  { value: "download", label: "Descarga" },
];

function formatDateForInput(date: string | null): string {
  if (!date) return "";
  try {
    return new Date(date).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

export default function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    campaignType: "presave",
    artistId: "",
    coverImageUrl: "",
    bannerImageUrl: "",
    smartLinkUrl: "",
    oneRpmUrl: "",
    spotifyPresaveUrl: "",
    appleMusicPresaveUrl: "",
    downloadGateEnabled: false,
    downloadFileUrl: "",
    downloadFileName: "",
    previewAudioUrl: "",
    previewVideoUrl: "",
    youtubeVideoId: "",
    videoIsVertical: false,
    requireSpotifyFollow: false,
    spotifyArtistUrl: "",
    requireSpotifyPresave: false,
    requireEmail: true,
    isActive: true,
    isFeatured: false,
    startDate: "",
    endDate: "",
    releaseDate: "",
    styleSettings: {} as Partial<StyleSettings>,
  });

  useEffect(() => {
    fetchCampaign();
  }, [resolvedParams.id]);

  async function fetchCampaign() {
    try {
      const res = await fetch(`/api/admin/campaigns/${resolvedParams.id}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Error al cargar la campaña");
      }

      const c = data.data;
      setCampaign(c);
      setFormData({
        title: c.title || "",
        slug: c.slug || "",
        description: c.description || "",
        campaignType: c.campaignType || "presave",
        artistId: c.artistId || "",
        coverImageUrl: c.coverImageUrl || "",
        bannerImageUrl: c.bannerImageUrl || "",
        smartLinkUrl: c.smartLinkUrl || "",
        oneRpmUrl: c.oneRpmUrl || "",
        spotifyPresaveUrl: c.spotifyPresaveUrl || "",
        appleMusicPresaveUrl: c.appleMusicPresaveUrl || "",
        downloadGateEnabled: c.downloadGateEnabled || false,
        downloadFileUrl: c.downloadFileUrl || "",
        downloadFileName: c.downloadFileName || "",
        previewAudioUrl: c.previewAudioUrl || "",
        previewVideoUrl: c.previewVideoUrl || "",
        youtubeVideoId: c.youtubeVideoId || "",
        videoIsVertical: c.videoIsVertical || false,
        requireSpotifyFollow: c.requireSpotifyFollow || false,
        spotifyArtistUrl: c.spotifyArtistUrl || "",
        requireSpotifyPresave: c.requireSpotifyPresave || false,
        requireEmail: c.requireEmail !== false,
        isActive: c.isActive !== false,
        isFeatured: c.isFeatured || false,
        startDate: formatDateForInput(c.startDate),
        endDate: formatDateForInput(c.endDate),
        releaseDate: formatDateForInput(c.releaseDate),
        styleSettings: c.styleSettings || {},
      });
    } catch (error) {
      showMessage("error", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const handleCoverUpload = (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({ ...prev, coverImageUrl: url }));
    showMessage("success", `Portada "${filename}" subida a Dropbox`);
  };

  const handleBannerUpload = (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({ ...prev, bannerImageUrl: url }));
    showMessage("success", `Banner "${filename}" subido a Dropbox`);
  };

  const handleDownloadFileUpload = (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({
      ...prev,
      downloadFileUrl: url,
      downloadFileName: filename,
    }));
    showMessage("success", `Archivo "${filename}" subido a Dropbox`);
  };

  const handlePreviewAudioUpload = (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({ ...prev, previewAudioUrl: url }));
    showMessage("success", `Audio "${filename}" subido a Dropbox`);
  };

  const handlePreviewVideoUpload = (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({ ...prev, previewVideoUrl: url }));
    showMessage("success", `Video "${filename}" subido a Dropbox`);
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      showMessage("error", "El título es requerido");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/campaigns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resolvedParams.id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage("success", "Campaña actualizada exitosamente");
      } else {
        showMessage("error", data.error || "Error al actualizar campaña");
      }
    } catch (error) {
      showMessage("error", "Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar esta campaña? Esta acción no se puede deshacer.")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/campaigns?id=${resolvedParams.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        router.push("/admin/campaigns");
      } else {
        showMessage("error", data.error || "Error al eliminar campaña");
      }
    } catch (error) {
      showMessage("error", "Error de conexión");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="font-oswald text-2xl mb-2">Campaña no encontrada</h2>
          <p className="text-slc-muted mb-4">La campaña que buscas no existe.</p>
          <Button asChild>
            <Link href="/admin/campaigns">Volver a Campañas</Link>
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
            <Link href="/admin/campaigns">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-oswald text-3xl uppercase">Editar Campaña</h1>
            <p className="text-slc-muted mt-1">/{campaign.slug}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-slc-card border border-slc-border rounded-lg">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{campaign.totalViews}</span>
            <span className="text-slc-muted text-sm">vistas</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slc-card border border-slc-border rounded-lg">
            <Users className="w-4 h-4 text-green-500" />
            <span className="font-medium">{campaign.totalConversions}</span>
            <span className="text-slc-muted text-sm">conversiones</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slc-card border border-slc-border rounded-lg">
            <Download className="w-4 h-4 text-purple-500" />
            <span className="font-medium">{campaign.totalDownloads}</span>
            <span className="text-slc-muted text-sm">descargas</span>
          </div>
          <Button asChild variant="outline">
            <Link href={`/admin/campaigns/${resolvedParams.id}/analytics`}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/c/${campaign.slug}`} target="_blank">
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Página
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

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6">Información Básica</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slc-muted mb-2">Título *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Nombre de la campaña"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Slug (URL)</label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="nombre-de-campana"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Tipo de Campaña *</label>
                  <select
                    value={formData.campaignType}
                    onChange={(e) => setFormData(prev => ({ ...prev, campaignType: e.target.value }))}
                    className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  >
                    {campaignTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm text-slc-muted mb-2">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción de la campaña..."
                    rows={3}
                    className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-primary" />
                Enlaces
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm text-slc-muted mb-2">Smart Link (Principal)</label>
                  <Input
                    value={formData.smartLinkUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, smartLinkUrl: e.target.value }))}
                    placeholder="https://onerpm.link/..."
                    type="url"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">OneRPM URL</label>
                  <Input
                    value={formData.oneRpmUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, oneRpmUrl: e.target.value }))}
                    placeholder="https://onerpm.link/..."
                    type="url"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Spotify Presave URL</label>
                  <Input
                    value={formData.spotifyPresaveUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, spotifyPresaveUrl: e.target.value }))}
                    placeholder="https://..."
                    type="url"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Apple Music Presave</label>
                  <Input
                    value={formData.appleMusicPresaveUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, appleMusicPresaveUrl: e.target.value }))}
                    placeholder="https://music.apple.com/..."
                    type="url"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Spotify Artist URL (para follow)</label>
                  <Input
                    value={formData.spotifyArtistUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, spotifyArtistUrl: e.target.value }))}
                    placeholder="https://open.spotify.com/artist/..."
                    type="url"
                  />
                </div>
              </div>
            </div>

            {/* Download Gate */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
                  <Download className="w-5 h-5 text-green-500" />
                  Download Gate
                </h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.downloadGateEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, downloadGateEnabled: e.target.checked }))}
                    className="w-4 h-4 rounded border-slc-border"
                  />
                  <span className="text-sm">Activar</span>
                </label>
              </div>

              {formData.downloadGateEnabled && (
                <div className="space-y-4">
                  {/* Current file info */}
                  {formData.downloadFileUrl && (
                    <div className="space-y-3">
                      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-sm text-green-500 flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4" />
                          Archivo actual: {formData.downloadFileName || "Archivo subido"}
                        </p>
                        <a
                          href={formData.downloadFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-400 hover:underline"
                        >
                          Descargar archivo
                        </a>
                      </div>

                      {/* Audio Preview Player */}
                      <AudioPreviewPlayer
                        url={formData.downloadFileUrl}
                        filename={formData.downloadFileName}
                      />
                    </div>
                  )}

                  {/* Direct Upload to Dropbox */}
                  <div>
                    <label className="block text-sm text-slc-muted mb-2">
                      <Music className="w-4 h-4 inline mr-1" />
                      Subir archivo de descarga
                    </label>
                    <DirectDropboxUploader
                      onUploadComplete={handleDownloadFileUpload}
                      accept="audio/*,.zip,.rar,.mp3,.wav,.flac,.m4a,.aac"
                      maxSize={500}
                      folder="/campaigns/downloads"
                      label="Subir archivo de descarga"
                      currentUrl={formData.downloadFileUrl}
                    />
                  </div>

                  {/* Alternative: Direct URL */}
                  <div className="p-4 bg-slc-card/50 border border-slc-border rounded-lg">
                    <label className="block text-sm text-slc-muted mb-2 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      O pegar URL directa (opcional)
                    </label>
                    <Input
                      value={formData.downloadFileUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, downloadFileUrl: e.target.value }))}
                      placeholder="https://dl.dropboxusercontent.com/..."
                      type="url"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slc-muted mb-2">Nombre del archivo (opcional)</label>
                    <Input
                      value={formData.downloadFileName}
                      onChange={(e) => setFormData(prev => ({ ...prev, downloadFileName: e.target.value }))}
                      placeholder="track.mp3"
                    />
                  </div>

                  {/* Preview Audio for Unlock Landing */}
                  <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                    <label className="block text-sm text-slc-muted mb-2 flex items-center gap-2">
                      <Music className="w-4 h-4 text-primary" />
                      Audio de Preview (Landing de Desbloqueo)
                    </label>
                    <p className="text-xs text-slc-muted mb-3">
                      Este audio se mostrará en la landing page después de desbloquear el contenido.
                    </p>

                    {/* Audio preview player if exists */}
                    {formData.previewAudioUrl && (
                      <div className="mb-3">
                        <AudioPreviewPlayer
                          url={formData.previewAudioUrl}
                          filename="Audio de preview"
                        />
                      </div>
                    )}

                    {/* Dropbox uploader for audio */}
                    <DirectDropboxUploader
                      onUploadComplete={handlePreviewAudioUpload}
                      accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg"
                      maxSize={100}
                      folder="/campaigns/audio-previews"
                      label="Subir audio de preview"
                      currentUrl={formData.previewAudioUrl}
                    />

                    {/* Or paste URL */}
                    <div className="mt-2">
                      <Input
                        value={formData.previewAudioUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, previewAudioUrl: e.target.value }))}
                        placeholder="O pegar URL directa..."
                        type="url"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* Preview Video for Unlock Landing */}
                  <div className="mt-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                    <label className="block text-sm text-slc-muted mb-2 flex items-center gap-2">
                      <Video className="w-4 h-4 text-purple-500" />
                      Video Exclusivo (Landing de Desbloqueo)
                    </label>
                    <p className="text-xs text-slc-muted mb-3">
                      Ofrece un video exclusivo como recompensa. Puedes subir un video o usar YouTube.
                    </p>

                    <div className="space-y-4">
                      {/* Video preview if exists */}
                      {formData.previewVideoUrl && (
                        <div className="rounded-lg overflow-hidden bg-black">
                          <video
                            src={formData.previewVideoUrl}
                            controls
                            className="w-full max-h-48 object-contain"
                            preload="metadata"
                          />
                          <p className="text-xs text-green-500 p-2 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Video cargado
                          </p>
                        </div>
                      )}

                      {/* Dropbox uploader for video */}
                      <div>
                        <label className="block text-xs text-slc-muted mb-1 flex items-center gap-1">
                          <Film className="w-3 h-3" />
                          Subir video a Dropbox (hasta 2GB)
                        </label>
                        <DirectDropboxUploader
                          onUploadComplete={handlePreviewVideoUpload}
                          accept="video/*,.mp4,.mov,.webm,.avi,.mkv,.m4v"
                          maxSize={2048}
                          folder="/campaigns/videos"
                          label="Subir video exclusivo"
                          currentUrl={formData.previewVideoUrl}
                        />
                      </div>

                      {/* Or paste URL */}
                      <div>
                        <label className="block text-xs text-slc-muted mb-1">O pegar URL del video</label>
                        <Input
                          value={formData.previewVideoUrl}
                          onChange={(e) => setFormData(prev => ({ ...prev, previewVideoUrl: e.target.value }))}
                          placeholder="https://dl.dropboxusercontent.com/video.mp4"
                          type="url"
                        />
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slc-muted">
                        <div className="flex-1 h-px bg-slc-border" />
                        <span>o usar YouTube</span>
                        <div className="flex-1 h-px bg-slc-border" />
                      </div>

                      {/* YouTube option */}
                      <div>
                        <label className="block text-xs text-slc-muted mb-1">ID de Video de YouTube</label>
                        <Input
                          value={formData.youtubeVideoId}
                          onChange={(e) => setFormData(prev => ({ ...prev, youtubeVideoId: e.target.value }))}
                          placeholder="dQw4w9WgXcQ (solo el ID)"
                        />
                        {formData.youtubeVideoId && (
                          <div className="mt-2 rounded-lg overflow-hidden">
                            <iframe
                              src={`https://www.youtube.com/embed/${formData.youtubeVideoId}`}
                              className={formData.videoIsVertical ? "w-full aspect-[9/16] max-w-xs mx-auto" : "w-full aspect-video"}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            />
                          </div>
                        )}
                      </div>

                      {/* Video orientation */}
                      {(formData.previewVideoUrl || formData.youtubeVideoId) && (
                        <label className="flex items-center gap-3 p-3 bg-slc-card rounded-lg cursor-pointer hover:bg-slc-card/80 mt-3">
                          <input
                            type="checkbox"
                            checked={formData.videoIsVertical}
                            onChange={(e) => setFormData(prev => ({ ...prev, videoIsVertical: e.target.checked }))}
                            className="w-4 h-4 rounded border-slc-border"
                          />
                          <div>
                            <span className="font-medium text-sm">Video Vertical (TikTok/Reels)</span>
                            <p className="text-xs text-slc-muted">Activar si el video tiene formato 9:16</p>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Requirements */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6">Requisitos para Acceder</h2>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-slc-card rounded-lg cursor-pointer hover:bg-slc-card/80">
                  <input
                    type="checkbox"
                    checked={formData.requireEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, requireEmail: e.target.checked }))}
                    className="w-4 h-4 rounded border-slc-border"
                  />
                  <div>
                    <span className="font-medium">Requerir Email</span>
                    <p className="text-xs text-slc-muted">El usuario debe ingresar su email</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slc-card rounded-lg cursor-pointer hover:bg-slc-card/80">
                  <input
                    type="checkbox"
                    checked={formData.requireSpotifyFollow}
                    onChange={(e) => setFormData(prev => ({ ...prev, requireSpotifyFollow: e.target.checked }))}
                    className="w-4 h-4 rounded border-slc-border"
                  />
                  <div>
                    <span className="font-medium">Seguir en Spotify</span>
                    <p className="text-xs text-slc-muted">El usuario debe seguir al artista</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slc-card rounded-lg cursor-pointer hover:bg-slc-card/80">
                  <input
                    type="checkbox"
                    checked={formData.requireSpotifyPresave}
                    onChange={(e) => setFormData(prev => ({ ...prev, requireSpotifyPresave: e.target.checked }))}
                    className="w-4 h-4 rounded border-slc-border"
                  />
                  <div>
                    <span className="font-medium">Pre-save en Spotify</span>
                    <p className="text-xs text-slc-muted">El usuario debe hacer presave del lanzamiento</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Dates */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Fechas
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slc-muted mb-2">Fecha de Inicio</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slc-muted mb-2">Fecha de Fin</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slc-muted mb-2">Fecha de Lanzamiento</label>
                  <Input
                    type="date"
                    value={formData.releaseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, releaseDate: e.target.value }))}
                  />
                </div>
              </div>
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
                <Cloud className="w-5 h-5 text-blue-500" />
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
                    <Megaphone className="w-12 h-12 text-slc-muted" />
                  </div>
                )}
              </div>

              <DirectDropboxUploader
                onUploadComplete={handleCoverUpload}
                accept="image/*"
                maxSize={10}
                folder="/campaigns/covers"
                label="Subir portada"
                currentUrl={formData.coverImageUrl}
              />
            </div>

            {/* Banner Image */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-500" />
                Banner
              </h2>

              <div className="aspect-video rounded-lg overflow-hidden bg-slc-card mb-4">
                {formData.bannerImageUrl ? (
                  <img
                    src={formData.bannerImageUrl}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-slc-muted" />
                  </div>
                )}
              </div>

              <DirectDropboxUploader
                onUploadComplete={handleBannerUpload}
                accept="image/*"
                maxSize={10}
                folder="/campaigns/banners"
                label="Subir banner"
                currentUrl={formData.bannerImageUrl}
              />
            </div>

            {/* Actions */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Acciones</h2>

              <div className="space-y-3 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 rounded border-slc-border"
                  />
                  <span>Campaña Activa</span>
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
                  disabled={saving}
                >
                  {saving ? (
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
                  onClick={() => router.push("/admin/campaigns")}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Eliminar Campaña
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
