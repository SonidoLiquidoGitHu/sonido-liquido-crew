"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DirectDropboxUploader } from "@/components/admin/DirectDropboxUploader";
import { AudioPreviewPlayer } from "@/components/admin/AudioPreviewPlayer";
import { ArtistSelector, type Artist } from "@/components/admin/ArtistSelector";
import { StyleSettingsEditor } from "@/components/admin/StyleSettingsEditor";
import { type StyleSettings } from "@/lib/style-config";

export interface NewCampaignFormProps {
  artists: Artist[];
}
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
  Youtube,
  Video,
  Smartphone,
  Upload,
  Film,
} from "lucide-react";

const campaignTypes = [
  { value: "presave", label: "Pre-save" },
  { value: "hyperfollow", label: "Hyperfollow" },
  { value: "smartlink", label: "Smart Link" },
  { value: "contest", label: "Concurso" },
  { value: "download", label: "Descarga" },
];

export default function NewCampaignForm({ artists }: NewCampaignFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  // YouTube ID validation
  const [youtubeError, setYoutubeError] = useState("");

  const validateYoutubeId = (id: string): boolean => {
    if (!id) return true;
    // YouTube video IDs are 11 characters, alphanumeric with - and _
    const youtubeIdPattern = /^[a-zA-Z0-9_-]{11}$/;
    return youtubeIdPattern.test(id);
  };

  const extractYoutubeId = (input: string): string => {
    if (!input) return "";

    // If it's already a valid ID, return it
    if (validateYoutubeId(input)) return input;

    // Try to extract from URL
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1];
    }

    return input;
  };

  const handleYoutubeIdChange = (value: string) => {
    const extractedId = extractYoutubeId(value.trim());

    if (extractedId && !validateYoutubeId(extractedId)) {
      setYoutubeError("ID de YouTube inválido. Debe ser 11 caracteres.");
    } else {
      setYoutubeError("");
    }

    setFormData(prev => ({ ...prev, youtubeVideoId: extractedId }));
  };

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

  const handleVideoUpload = (url: string, filename: string, fileSize: number) => {
    setFormData(prev => ({ ...prev, previewVideoUrl: url }));
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
    showMessage("success", `Video "${filename}" (${sizeMB}MB) subido a Dropbox`);
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

    setIsLoading(true);
    try {
      console.log("[Campaign Form] Submitting campaign:", formData.title);

      const response = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      console.log("[Campaign Form] Response status:", response.status);

      const data = await response.json();

      if (data.success) {
        showMessage("success", "Campaña creada exitosamente");
        setTimeout(() => {
          router.push("/admin/campaigns");
        }, 1500);
      } else {
        console.error("[Campaign Form] Error:", data.error);
        showMessage("error", data.error || "Error al crear campaña");
      }
    } catch (error: any) {
      console.error("[Campaign Form] Fetch error:", error);
      showMessage("error", `Error de conexión: ${error?.message || "Unknown"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/campaigns">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-oswald text-3xl uppercase">Nueva Campaña</h1>
          <p className="text-slc-muted mt-1">
            Crea un presave, hyperfollow o download gate
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
            {/* Basic Info */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6">Información Básica</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm text-slc-muted mb-2">Título *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Nombre de la campaña"
                    required
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

                <div>
                  <ArtistSelector
                    value={formData.artistId}
                    onChange={(v) => setFormData(prev => ({ ...prev, artistId: Array.isArray(v) ? v[0] || "" : v }))}
                    label="Artista"
                    placeholder="Seleccionar artista..."
                    initialArtists={artists}
                  />
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
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-sm text-green-500 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Archivo listo: {formData.downloadFileName || "Archivo configurado"}
                        </p>
                      </div>
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
                </div>
              )}
            </div>

            {/* Video Preview */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <Video className="w-5 h-5 text-red-500" />
                Video Preview
              </h2>
              <p className="text-sm text-slc-muted mb-4">
                Agrega un video de YouTube o sube un archivo de video directamente a Dropbox.
              </p>

              <div className="space-y-4">
                {/* YouTube Video ID */}
                <div>
                  <label className="block text-sm text-slc-muted mb-2 flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-red-500" />
                    YouTube Video ID o URL
                  </label>
                  <Input
                    value={formData.youtubeVideoId}
                    onChange={(e) => handleYoutubeIdChange(e.target.value)}
                    placeholder="dQw4w9WgXcQ o https://youtube.com/watch?v=..."
                    className={youtubeError ? "border-red-500" : ""}
                  />
                  {youtubeError && (
                    <p className="text-red-500 text-xs mt-1">{youtubeError}</p>
                  )}
                  {formData.youtubeVideoId && !youtubeError && (
                    <div className="mt-3 aspect-video rounded-lg overflow-hidden bg-slc-card">
                      <iframe
                        src={`https://www.youtube.com/embed/${formData.youtubeVideoId}`}
                        className="w-full h-full"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  )}
                </div>

                {/* Video Orientation */}
                <div>
                  <label className="flex items-center gap-3 p-3 bg-slc-card rounded-lg cursor-pointer hover:bg-slc-card/80">
                    <input
                      type="checkbox"
                      checked={formData.videoIsVertical}
                      onChange={(e) => setFormData(prev => ({ ...prev, videoIsVertical: e.target.checked }))}
                      className="w-4 h-4 rounded border-slc-border"
                    />
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-slc-muted" />
                      <div>
                        <span className="font-medium">Video Vertical</span>
                        <p className="text-xs text-slc-muted">Activa si es un Short, Reel o TikTok</p>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Direct Video Upload to Dropbox */}
                <div className="p-4 bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/30 rounded-lg">
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Film className="w-4 h-4 text-blue-500" />
                    Subir Video a Dropbox
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Sube archivos de video grandes (hasta 2GB) directamente a Dropbox. Ideal para videos que no están en YouTube.
                  </p>

                  {/* Current video preview */}
                  {formData.previewVideoUrl && !formData.youtubeVideoId && (
                    <div className="mb-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-sm text-green-500 flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4" />
                        Video configurado
                      </p>
                      <video
                        src={formData.previewVideoUrl}
                        controls
                        className={`w-full rounded-lg ${formData.videoIsVertical ? 'max-w-xs mx-auto' : ''}`}
                        style={{ maxHeight: '300px' }}
                      >
                        Tu navegador no soporta video HTML5.
                      </video>
                    </div>
                  )}

                  <DirectDropboxUploader
                    onUploadComplete={handleVideoUpload}
                    accept="video/*,.mp4,.mov,.avi,.mkv,.webm,.m4v"
                    maxSize={2048}
                    folder="/campaigns/videos"
                    label="Subir video (MP4, MOV, WebM, etc.)"
                    currentUrl={formData.previewVideoUrl}
                  />
                </div>

                {/* Alternative: Direct Video URL */}
                <div className="p-4 bg-slc-card/50 border border-slc-border rounded-lg">
                  <label className="block text-sm text-slc-muted mb-2 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    URL de video directo (opcional)
                  </label>
                  <Input
                    value={formData.previewVideoUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, previewVideoUrl: e.target.value }))}
                    placeholder="https://..."
                    type="url"
                  />
                  <p className="text-xs text-slc-muted mt-1">
                    Solo si no usas YouTube ni subiste un video. Formatos: MP4, WebM
                  </p>
                </div>

                {/* Preview Audio URL */}
                <div>
                  <label className="block text-sm text-slc-muted mb-2 flex items-center gap-2">
                    <Music className="w-4 h-4 text-green-500" />
                    Audio Preview URL (opcional)
                  </label>
                  <Input
                    value={formData.previewAudioUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, previewAudioUrl: e.target.value }))}
                    placeholder="https://..."
                    type="url"
                  />
                  <p className="text-xs text-slc-muted mt-1">
                    Se reproducirá si no hay video configurado
                  </p>
                </div>
              </div>
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
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Crear Campaña
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/admin/campaigns")}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
