"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DirectDropboxUploader } from "@/components/admin/DirectDropboxUploader";
import { BulkAudioUploader } from "@/components/admin/BulkAudioUploader";
import { BulkImageUploader } from "@/components/admin/BulkImageUploader";
import { ArtistSelector, type Artist } from "@/components/admin/ArtistSelector";
import {
  ArrowLeft,
  Save,
  Newspaper,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Cloud,
  Image as ImageIcon,
  Music,
  Video,
  Download,
  Users,
  Mail,
  Phone,
  Quote,
  FileText,
  Tag,
  Eye,
  Lock,
  Link as LinkIcon,
  Plus,
  Trash2,
  Play,
  Package,
  FolderUp,
  ListMusic,
  ChevronUp,
  ChevronDown,
  User,
  UserPlus,
} from "lucide-react";

export interface NewMediaReleaseFormProps {
  artists: Artist[];
}

interface ExternalLink {
  label: string;
  url: string;
}

interface AudioTrack {
  title: string;
  url: string;
  duration: string;
  trackNumber: number;
}

const categories = [
  { value: "new_release", label: "Nuevo Lanzamiento" },
  { value: "single", label: "Single" },
  { value: "album", label: "Álbum" },
  { value: "ep", label: "EP" },
  { value: "tour", label: "Gira / Tour" },
  { value: "collaboration", label: "Colaboración" },
  { value: "event", label: "Evento" },
  { value: "announcement", label: "Anuncio" },
  { value: "interview", label: "Entrevista" },
  { value: "feature", label: "Feature / Artículo" },
];

const tabs = [
  { id: "basic", label: "Información", icon: FileText },
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "audio", label: "Audio/Video", icon: Music },
  { id: "assets", label: "Descargas", icon: Download },
  { id: "contacts", label: "Contactos", icon: Users },
  { id: "settings", label: "Configuración", icon: Eye },
];

export default function NewMediaReleaseForm({ artists }: NewMediaReleaseFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    // Basic Info
    title: "",
    subtitle: "",
    slug: "",
    category: "announcement",
    mainArtistId: "",
    mainArtistName: "",
    useCustomArtist: false,
    summary: "",
    content: "",
    pullQuote: "",
    pullQuoteAttribution: "",
    tags: "",

    // Visual Assets
    coverImageUrl: "",
    bannerImageUrl: "",
    galleryImages: [] as string[],
    logoUrl: "",

    // Audio/Video
    audioPreviewUrl: "",
    audioPreviewTitle: "",
    audioTracks: [] as AudioTrack[],
    spotifyEmbedUrl: "",
    youtubeVideoId: "",
    youtubeVideoTitle: "",

    // Downloads
    pressKitUrl: "",
    highResImagesUrl: "",
    linerNotesUrl: "",
    credits: "",

    // Related
    relatedArtistIds: [] as string[],
    externalLinks: [] as ExternalLink[],

    // Contacts
    prContactName: "",
    prContactEmail: "",
    prContactPhone: "",
    managementContact: "",
    bookingContact: "",

    // Dates
    publishDate: new Date().toISOString().split("T")[0],
    embargoDate: "",
    releaseDate: "",
    eventDate: "",

    // Settings
    isPublished: false,
    isFeatured: false,
    accessCode: "",
  });

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Dropbox upload handlers
  const handleCoverUpload = (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({ ...prev, coverImageUrl: url }));
    showMessage("success", `Portada "${filename}" subida`);
  };

  const handleBannerUpload = (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({ ...prev, bannerImageUrl: url }));
    showMessage("success", `Banner "${filename}" subido`);
  };

  const handleLogoUpload = (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({ ...prev, logoUrl: url }));
    showMessage("success", `Logo "${filename}" subido`);
  };

  const handleAudioUpload = (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({ ...prev, audioPreviewUrl: url, audioPreviewTitle: filename }));
    showMessage("success", `Audio "${filename}" subido`);
  };

  const handlePressKitUpload = (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({ ...prev, pressKitUrl: url }));
    showMessage("success", `Press Kit "${filename}" subido`);
  };

  const handleHighResUpload = (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({ ...prev, highResImagesUrl: url }));
    showMessage("success", `Imágenes HD "${filename}" subidas`);
  };

  const handleLinerNotesUpload = (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({ ...prev, linerNotesUrl: url }));
    showMessage("success", `Liner notes "${filename}" subido`);
  };

  const handleGalleryUpload = (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({
      ...prev,
      galleryImages: [...prev.galleryImages, url]
    }));
    showMessage("success", `Imagen "${filename}" agregada a galería`);
  };

  const removeGalleryImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      galleryImages: prev.galleryImages.filter((_, i) => i !== index)
    }));
  };

  const addExternalLink = () => {
    setFormData(prev => ({
      ...prev,
      externalLinks: [...prev.externalLinks, { label: "", url: "" }]
    }));
  };

  const updateExternalLink = (index: number, field: "label" | "url", value: string) => {
    setFormData(prev => ({
      ...prev,
      externalLinks: prev.externalLinks.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  const removeExternalLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      externalLinks: prev.externalLinks.filter((_, i) => i !== index)
    }));
  };

  // Audio track management
  const addAudioTrack = () => {
    const nextTrackNumber = formData.audioTracks.length + 1;
    setFormData(prev => ({
      ...prev,
      audioTracks: [...prev.audioTracks, {
        title: `Track ${nextTrackNumber}`,
        url: "",
        duration: "",
        trackNumber: nextTrackNumber
      }]
    }));
  };

  const updateAudioTrack = (index: number, field: keyof AudioTrack, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      audioTracks: prev.audioTracks.map((track, i) =>
        i === index ? { ...track, [field]: value } : track
      )
    }));
  };

  const removeAudioTrack = (index: number) => {
    setFormData(prev => ({
      ...prev,
      audioTracks: prev.audioTracks.filter((_, i) => i !== index).map((track, i) => ({
        ...track,
        trackNumber: i + 1
      }))
    }));
  };

  const handleTrackUpload = (index: number, url: string, filename: string, _fileSize?: number) => {
    setFormData(prev => ({
      ...prev,
      audioTracks: prev.audioTracks.map((track, i) =>
        i === index ? { ...track, url, title: track.title || filename.replace(/\.[^/.]+$/, "") } : track
      )
    }));
    showMessage("success", `Audio "${filename}" subido al track ${index + 1}`);
  };

  const moveTrackUp = (index: number) => {
    if (index === 0) return;
    setFormData(prev => {
      const tracks = [...prev.audioTracks];
      [tracks[index - 1], tracks[index]] = [tracks[index], tracks[index - 1]];
      return {
        ...prev,
        audioTracks: tracks.map((t, i) => ({ ...t, trackNumber: i + 1 }))
      };
    });
  };

  const moveTrackDown = (index: number) => {
    if (index === formData.audioTracks.length - 1) return;
    setFormData(prev => {
      const tracks = [...prev.audioTracks];
      [tracks[index], tracks[index + 1]] = [tracks[index + 1], tracks[index]];
      return {
        ...prev,
        audioTracks: tracks.map((t, i) => ({ ...t, trackNumber: i + 1 }))
      };
    });
  };

  // Bulk upload handler
  const handleBulkTracksUpload = (tracks: { title: string; url: string; duration: string }[]) => {
    const startNumber = formData.audioTracks.length + 1;
    const newTracks: AudioTrack[] = tracks.map((track, index) => ({
      title: track.title,
      url: track.url,
      duration: track.duration,
      trackNumber: startNumber + index,
    }));

    setFormData(prev => ({
      ...prev,
      audioTracks: [...prev.audioTracks, ...newTracks]
    }));

    showMessage("success", `${tracks.length} track${tracks.length !== 1 ? "s" : ""} agregado${tracks.length !== 1 ? "s" : ""} exitosamente`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      showMessage("error", "El título es requerido");
      setActiveTab("basic");
      return;
    }

    setIsLoading(true);
    try {
      console.log("[Media Release Form] Submitting:", formData.title);

      // Clean up main artist fields based on selection
      const mainArtistId = formData.useCustomArtist ? null : (formData.mainArtistId || null);
      const mainArtistName = formData.useCustomArtist ? (formData.mainArtistName || null) : null;

      const submitData = {
        ...formData,
        mainArtistId,
        mainArtistName,
        galleryImages: JSON.stringify(formData.galleryImages),
        relatedArtistIds: JSON.stringify(formData.relatedArtistIds),
        externalLinks: JSON.stringify(formData.externalLinks),
        audioTracks: formData.audioTracks.length > 0 ? JSON.stringify(formData.audioTracks) : null,
        tags: formData.tags ? JSON.stringify(formData.tags.split(",").map(t => t.trim())) : null,
      };

      // Remove useCustomArtist from submit data
      delete (submitData as any).useCustomArtist;

      const response = await fetch("/api/admin/media-releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      console.log("[Media Release Form] Response status:", response.status);

      const data = await response.json();

      if (data.success) {
        showMessage("success", "Media release creado exitosamente");
        setTimeout(() => {
          router.push("/admin/media-releases");
        }, 1500);
      } else {
        console.error("[Media Release Form] Error:", data.error);
        showMessage("error", data.error || "Error al crear media release");
      }
    } catch (error: any) {
      console.error("[Media Release Form] Fetch error:", error);
      showMessage("error", `Error de conexión: ${error?.message || "Unknown"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const extractYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&?/]+)/);
    return match ? match[1] : url;
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/media-releases">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-oswald text-3xl uppercase">Nuevo Media Release</h1>
          <p className="text-slc-muted mt-1">
            Crea un comunicado de prensa completo para medios
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Guardar
        </Button>
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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "bg-slc-card text-slc-muted hover:text-white hover:bg-slc-card/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab: Basic Info */}
            {activeTab === "basic" && (
              <div className="space-y-6">
                {/* Title & Category */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Información Básica
                  </h2>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm text-slc-muted mb-2">Título *</label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Título del comunicado"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-slc-muted mb-2">Subtítulo</label>
                        <Input
                          value={formData.subtitle}
                          onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                          placeholder="ej: Nuevo Álbum, Single de Verano"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-slc-muted mb-2">Categoría *</label>
                        <select
                          value={formData.category}
                          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                        >
                          {categories.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm text-slc-muted mb-2">Slug (URL)</label>
                        <Input
                          value={formData.slug}
                          onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                          placeholder="Se genera automáticamente del título"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Artist */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Artista Principal
                  </h2>
                  <p className="text-sm text-slc-muted mb-4">
                    Selecciona el artista principal de este lanzamiento o agrega uno nuevo.
                  </p>

                  <div className="space-y-4">
                    {/* Toggle between roster and custom artist */}
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="artistType"
                          checked={!formData.useCustomArtist}
                          onChange={() => setFormData(prev => ({
                            ...prev,
                            useCustomArtist: false,
                            mainArtistName: ""
                          }))}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm">Artista del Roster</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="artistType"
                          checked={formData.useCustomArtist}
                          onChange={() => setFormData(prev => ({
                            ...prev,
                            useCustomArtist: true,
                            mainArtistId: ""
                          }))}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm flex items-center gap-1">
                          <UserPlus className="w-4 h-4" />
                          Artista Nuevo / Externo
                        </span>
                      </label>
                    </div>

                    {/* Roster Artist Dropdown */}
                    {!formData.useCustomArtist && (
                      <div>
                        <label className="block text-sm text-slc-muted mb-2">
                          Seleccionar Artista del Roster
                        </label>
                        <select
                          value={formData.mainArtistId}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            mainArtistId: e.target.value
                          }))}
                          className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                        >
                          <option value="">-- Sin artista principal --</option>
                          {artists.map((artist) => (
                            <option key={artist.id} value={artist.id}>
                              {artist.name} {artist.role ? `(${artist.role})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Custom Artist Name Input */}
                    {formData.useCustomArtist && (
                      <div>
                        <label className="block text-sm text-slc-muted mb-2">
                          Nombre del Artista (nuevo/externo)
                        </label>
                        <Input
                          value={formData.mainArtistName}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            mainArtistName: e.target.value
                          }))}
                          placeholder="ej: Artista Invitado, Colaborador X"
                        />
                        <p className="text-xs text-slc-muted mt-2">
                          Este artista no está en el roster del crew. Escribe su nombre manualmente.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary & Content */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6">Contenido</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">
                        Resumen (1-2 oraciones para redes sociales)
                      </label>
                      <textarea
                        value={formData.summary}
                        onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                        placeholder="Breve resumen del comunicado..."
                        rows={2}
                        className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slc-muted mb-2">
                        Contenido Completo (soporta Markdown)
                      </label>
                      <textarea
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="El comunicado de prensa completo. Puedes usar **negritas**, *itálicas*, y listas..."
                        rows={12}
                        className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Pull Quote */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <Quote className="w-5 h-5 text-yellow-500" />
                    Cita Destacada
                  </h2>
                  <p className="text-sm text-slc-muted mb-4">
                    Una cita que los medios pueden usar directamente en sus artículos.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Cita</label>
                      <textarea
                        value={formData.pullQuote}
                        onChange={(e) => setFormData(prev => ({ ...prev, pullQuote: e.target.value }))}
                        placeholder='"Este álbum representa nuestra evolución como artistas..."'
                        rows={3}
                        className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Atribución</label>
                      <Input
                        value={formData.pullQuoteAttribution}
                        onChange={(e) => setFormData(prev => ({ ...prev, pullQuoteAttribution: e.target.value }))}
                        placeholder="ej: Nombre del artista"
                      />
                    </div>
                  </div>
                </div>

                {/* Tags & Related Artists */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-blue-500" />
                    Tags y Artistas Relacionados
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">
                        Tags (separados por coma)
                      </label>
                      <Input
                        value={formData.tags}
                        onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                        placeholder="hip hop, nuevo álbum, colaboración, México"
                      />
                    </div>

                    <div>
                      <ArtistSelector
                        value={formData.relatedArtistIds}
                        onChange={(v) => setFormData(prev => ({
                          ...prev,
                          relatedArtistIds: Array.isArray(v) ? v : v ? [v] : []
                        }))}
                        multiple={true}
                        label="Artistas Relacionados"
                        placeholder="Seleccionar artistas..."
                        initialArtists={artists}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Media */}
            {activeTab === "media" && (
              <div className="space-y-6">
                {/* Cover Image */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-green-500" />
                    Imagen Principal
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Portada (1:1)</label>
                      <div className="aspect-square rounded-lg overflow-hidden bg-slc-card mb-4">
                        {formData.coverImageUrl ? (
                          <img src={formData.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Newspaper className="w-16 h-16 text-slc-muted" />
                          </div>
                        )}
                      </div>
                      <DirectDropboxUploader
                        onUploadComplete={handleCoverUpload}
                        accept="image/*"
                        maxSize={10}
                        folder="/media-releases/covers"
                        label="Subir portada"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Banner (16:9)</label>
                      <div className="aspect-video rounded-lg overflow-hidden bg-slc-card mb-4">
                        {formData.bannerImageUrl ? (
                          <img src={formData.bannerImageUrl} alt="Banner" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-slc-muted" />
                          </div>
                        )}
                      </div>
                      <DirectDropboxUploader
                        onUploadComplete={handleBannerUpload}
                        accept="image/*"
                        maxSize={10}
                        folder="/media-releases/banners"
                        label="Subir banner"
                      />
                    </div>
                  </div>
                </div>

                {/* Logo */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6">Logo / Arte</h2>
                  <div className="flex items-start gap-6">
                    <div className="w-32 h-32 rounded-lg overflow-hidden bg-slc-card flex-shrink-0">
                      {formData.logoUrl ? (
                        <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-10 h-10 text-slc-muted" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slc-muted mb-4">
                        Logo del proyecto, artista o evento. Ideal con fondo transparente (PNG).
                      </p>
                      <DirectDropboxUploader
                        onUploadComplete={handleLogoUpload}
                        accept="image/*"
                        maxSize={5}
                        folder="/media-releases/logos"
                        label="Subir logo"
                      />
                    </div>
                  </div>
                </div>

                {/* Gallery */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <FolderUp className="w-5 h-5 text-cyan-500" />
                    Galería de Imágenes
                  </h2>
                  <p className="text-sm text-slc-muted mb-4">
                    Imágenes adicionales para prensa (fotos promocionales, detrás de cámaras, etc.)
                    <br />
                    <span className="text-primary">Puedes arrastrar varias imágenes a la vez o seleccionar múltiples archivos.</span>
                  </p>

                  <BulkImageUploader
                    onUploadComplete={(urls) => {
                      setFormData(prev => ({
                        ...prev,
                        galleryImages: [...prev.galleryImages, ...urls]
                      }));
                      showMessage("success", `${urls.length} ${urls.length === 1 ? "imagen agregada" : "imágenes agregadas"} a la galería`);
                    }}
                    folder="/media-releases/gallery"
                    maxSize={10}
                    maxFiles={20}
                    existingImages={formData.galleryImages}
                    onRemoveExisting={removeGalleryImage}
                  />
                </div>
              </div>
            )}

            {/* Tab: Audio/Video */}
            {activeTab === "audio" && (
              <div className="space-y-6">
                {/* Audio Preview */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <Music className="w-5 h-5 text-spotify" />
                    Audio Preview
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">
                        Subir audio preview (MP3/WAV)
                      </label>
                      <DirectDropboxUploader
                        onUploadComplete={handleAudioUpload}
                        accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.wma,.aiff"
                        maxSize={150}
                        folder="/media-releases/audio"
                        label="Subir audio"
                        currentUrl={formData.audioPreviewUrl}
                      />
                    </div>

                    {formData.audioPreviewUrl && (
                      <div className="p-4 bg-slc-card rounded-lg">
                        <p className="text-sm font-medium mb-2">{formData.audioPreviewTitle || "Audio Preview"}</p>
                        <audio controls src={formData.audioPreviewUrl} className="w-full" />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm text-slc-muted mb-2">
                        O pega un link de Spotify
                      </label>
                      <Input
                        value={formData.spotifyEmbedUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, spotifyEmbedUrl: e.target.value }))}
                        placeholder="https://open.spotify.com/track/..."
                        type="url"
                      />
                      {formData.spotifyEmbedUrl && (
                        <div className="mt-4 rounded-lg overflow-hidden">
                          <iframe
                            src={`https://open.spotify.com/embed/track/${formData.spotifyEmbedUrl.split('/').pop()?.split('?')[0]}`}
                            width="100%"
                            height="152"
                            allowFullScreen
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            className="rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bulk Audio Uploader & Tracklist */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <ListMusic className="w-5 h-5 text-blue-500" />
                    Tracklist / Bulk Audio Upload
                  </h2>
                  <p className="text-sm text-slc-muted mb-4">
                    Sube múltiples audios y gestiona el tracklist del lanzamiento.
                  </p>
                  <BulkAudioUploader
                    onUploadComplete={handleBulkTracksUpload}
                    maxSize={150}
                    folder="/media-releases/tracks"
                  />
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Button type="button" size="sm" variant="outline" onClick={addAudioTrack}>
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Track Manualmente
                      </Button>
                    </div>
                    {formData.audioTracks.length === 0 && (
                      <p className="text-sm text-slc-muted">No hay tracks agregados.</p>
                    )}
                    {formData.audioTracks.length > 0 && (
                      <div className="space-y-4">
                        {formData.audioTracks.map((track, index) => (
                          <div key={index} className="bg-slc-card rounded-lg p-4 flex items-center gap-4">
                            <div className="flex flex-col items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => moveTrackUp(index)}
                                disabled={index === 0}
                              >
                                <ChevronUp className="w-4 h-4" />
                              </Button>
                              <span className="text-xs text-slc-muted">{track.trackNumber}</span>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => moveTrackDown(index)}
                                disabled={index === formData.audioTracks.length - 1}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <Input
                                value={track.title}
                                onChange={e => updateAudioTrack(index, "title", e.target.value)}
                                placeholder="Título del track"
                              />
                              <Input
                                value={track.duration}
                                onChange={e => updateAudioTrack(index, "duration", e.target.value)}
                                placeholder="Duración (ej: 3:45)"
                              />
                              <DirectDropboxUploader
                                onUploadComplete={(url, filename, fileSize) => handleTrackUpload(index, url, filename, fileSize)}
                                accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.wma,.aiff"
                                maxSize={150}
                                folder="/media-releases/tracks"
                                label={track.url ? "Cambiar audio" : "Subir audio"}
                                currentUrl={track.url}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAudioTrack(index)}
                              className="text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            {track.url && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-green-500"
                                onClick={() => window.open(track.url, "_blank")}
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Video */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <Video className="w-5 h-5 text-red-500" />
                    Video
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">
                        URL o ID de YouTube
                      </label>
                      <Input
                        value={formData.youtubeVideoId}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          youtubeVideoId: extractYouTubeId(e.target.value)
                        }))}
                        placeholder="https://www.youtube.com/watch?v=... o solo el ID"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slc-muted mb-2">
                        Título del video
                      </label>
                      <Input
                        value={formData.youtubeVideoTitle}
                        onChange={(e) => setFormData(prev => ({ ...prev, youtubeVideoTitle: e.target.value }))}
                        placeholder="Video Oficial - Nombre de la canción"
                      />
                    </div>

                    {formData.youtubeVideoId && (
                      <div className="aspect-video rounded-lg overflow-hidden">
                        <iframe
                          src={`https://www.youtube.com/embed/${formData.youtubeVideoId}`}
                          width="100%"
                          height="100%"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Assets */}
            {activeTab === "assets" && (
              <div className="space-y-6">
                {/* Press Kit */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-500" />
                    Press Kit (ZIP)
                  </h2>
                  <p className="text-sm text-slc-muted mb-4">
                    Archivo ZIP con todos los materiales: imágenes HD, logo, bio, etc.
                  </p>

                  <DirectDropboxUploader
                    onUploadComplete={handlePressKitUpload}
                    accept=".zip,.rar"
                    maxSize={150}
                    folder="/media-releases/press-kits"
                    label="Subir Press Kit"
                    currentUrl={formData.pressKitUrl}
                  />

                  {formData.pressKitUrl && (
                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-green-500">Press Kit listo para descargar</span>
                    </div>
                  )}
                </div>

                {/* High-res Images */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-purple-500" />
                    Imágenes Alta Resolución
                  </h2>
                  <p className="text-sm text-slc-muted mb-4">
                    Archivo ZIP con fotos en alta resolución para impresión.
                  </p>

                  <DirectDropboxUploader
                    onUploadComplete={handleHighResUpload}
                    accept=".zip,.rar"
                    maxSize={200}
                    folder="/media-releases/high-res"
                    label="Subir imágenes HD"
                    currentUrl={formData.highResImagesUrl}
                  />
                </div>

                {/* Liner Notes */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-500" />
                    Liner Notes / Créditos
                  </h2>
                  <p className="text-sm text-slc-muted mb-4">
                    PDF con créditos completos, letras, agradecimientos.
                  </p>

                  <DirectDropboxUploader
                    onUploadComplete={handleLinerNotesUpload}
                    accept=".pdf"
                    maxSize={20}
                    folder="/media-releases/liner-notes"
                    label="Subir liner notes"
                    currentUrl={formData.linerNotesUrl}
                  />

                  <div className="mt-4">
                    <label className="block text-sm text-slc-muted mb-2">
                      O escribe los créditos aquí
                    </label>
                    <textarea
                      value={formData.credits}
                      onChange={(e) => setFormData(prev => ({ ...prev, credits: e.target.value }))}
                      placeholder="Producido por: ...&#10;Grabado en: ...&#10;Mezcla: ...&#10;Master: ..."
                      rows={8}
                      className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none font-mono text-sm"
                    />
                  </div>
                </div>

                {/* External Links */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <LinkIcon className="w-5 h-5 text-cyan-500" />
                    Enlaces Externos
                  </h2>
                  <p className="text-sm text-slc-muted mb-4">
                    Links a redes sociales, plataformas de streaming, etc.
                  </p>

                  <div className="space-y-3">
                    {formData.externalLinks.map((link, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={link.label}
                          onChange={(e) => updateExternalLink(index, "label", e.target.value)}
                          placeholder="Etiqueta (ej: Spotify)"
                          className="w-1/3"
                        />
                        <Input
                          value={link.url}
                          onChange={(e) => updateExternalLink(index, "url", e.target.value)}
                          placeholder="https://..."
                          className="flex-1"
                          type="url"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeExternalLink(index)}
                          className="text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addExternalLink}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar enlace
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Contacts */}
            {activeTab === "contacts" && (
              <div className="space-y-6">
                {/* PR Contact */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-green-500" />
                    Contacto de Prensa
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm text-slc-muted mb-2">Nombre</label>
                      <Input
                        value={formData.prContactName}
                        onChange={(e) => setFormData(prev => ({ ...prev, prContactName: e.target.value }))}
                        placeholder="Nombre del contacto de prensa"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Email</label>
                      <Input
                        value={formData.prContactEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, prContactEmail: e.target.value }))}
                        placeholder="prensa@example.com"
                        type="email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Teléfono</label>
                      <Input
                        value={formData.prContactPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, prContactPhone: e.target.value }))}
                        placeholder="+52 55 1234 5678"
                      />
                    </div>
                  </div>
                </div>

                {/* Other Contacts */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Otros Contactos
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Management</label>
                      <Input
                        value={formData.managementContact}
                        onChange={(e) => setFormData(prev => ({ ...prev, managementContact: e.target.value }))}
                        placeholder="management@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Booking</label>
                      <Input
                        value={formData.bookingContact}
                        onChange={(e) => setFormData(prev => ({ ...prev, bookingContact: e.target.value }))}
                        placeholder="booking@example.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Settings */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                {/* Dates */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    Fechas
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">
                        Fecha de Publicación *
                      </label>
                      <Input
                        type="date"
                        value={formData.publishDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, publishDate: e.target.value }))}
                        required
                      />
                      <p className="text-xs text-slc-muted mt-1">
                        Cuándo se publica este comunicado
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">
                        Fecha de Embargo
                      </label>
                      <Input
                        type="date"
                        value={formData.embargoDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, embargoDate: e.target.value }))}
                      />
                      <p className="text-xs text-slc-muted mt-1">
                        Los medios no pueden publicar antes de esta fecha
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">
                        Fecha de Lanzamiento
                      </label>
                      <Input
                        type="date"
                        value={formData.releaseDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, releaseDate: e.target.value }))}
                      />
                      <p className="text-xs text-slc-muted mt-1">
                        Fecha del lanzamiento musical (si aplica)
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">
                        Fecha del Evento
                      </label>
                      <Input
                        type="date"
                        value={formData.eventDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, eventDate: e.target.value }))}
                      />
                      <p className="text-xs text-slc-muted mt-1">
                        Para anuncios de conciertos/eventos
                      </p>
                    </div>
                  </div>
                </div>

                {/* Access Control */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-orange-500" />
                    Control de Acceso
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">
                        Código de Acceso (opcional)
                      </label>
                      <Input
                        value={formData.accessCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, accessCode: e.target.value }))}
                        placeholder="Código para acceso exclusivo de prensa"
                      />
                      <p className="text-xs text-slc-muted mt-1">
                        Si se define, solo quienes tengan el código podrán ver el comunicado
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Preview */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Vista Previa</h2>

              <div className="aspect-video rounded-lg overflow-hidden bg-slc-card mb-4">
                {formData.coverImageUrl ? (
                  <img
                    src={formData.coverImageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Newspaper className="w-12 h-12 text-slc-muted" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-primary uppercase">
                  {categories.find(c => c.value === formData.category)?.label}
                </p>
                <h3 className="font-oswald text-lg uppercase">
                  {formData.title || "Título del comunicado"}
                </h3>
                {/* Main Artist */}
                {(formData.mainArtistId || formData.mainArtistName) && (
                  <p className="text-sm font-medium text-primary flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {formData.useCustomArtist
                      ? formData.mainArtistName
                      : artists.find(a => a.id === formData.mainArtistId)?.name || "Artista"}
                  </p>
                )}
                {formData.subtitle && (
                  <p className="text-sm text-slc-muted">{formData.subtitle}</p>
                )}
                {formData.summary && (
                  <p className="text-sm text-slc-muted line-clamp-2">{formData.summary}</p>
                )}
              </div>
            </div>

            {/* Publish Settings */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Publicación</h2>

              <div className="space-y-4">
                <label className="flex items-center gap-3 p-3 bg-slc-card rounded-lg cursor-pointer hover:bg-slc-card/80">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPublished: e.target.checked }))}
                    className="w-4 h-4 rounded border-slc-border"
                  />
                  <div>
                    <span className="font-medium">Publicar ahora</span>
                    <p className="text-xs text-slc-muted">Visible para el público</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slc-card rounded-lg cursor-pointer hover:bg-slc-card/80">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                    className="w-4 h-4 rounded border-slc-border"
                  />
                  <div>
                    <span className="font-medium">Destacar</span>
                    <p className="text-xs text-slc-muted">Mostrar en portada</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Completion Status */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Completado</h2>

              <div className="space-y-2">
                {[
                  { label: "Título", done: !!formData.title },
                  { label: "Contenido", done: !!formData.content },
                  { label: "Imagen", done: !!formData.coverImageUrl },
                  { label: "Resumen", done: !!formData.summary },
                  { label: "Press Kit", done: !!formData.pressKitUrl },
                  { label: "Contacto PR", done: !!formData.prContactEmail },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.done ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slc-muted" />
                    )}
                    <span className={`text-sm ${item.done ? "text-white" : "text-slc-muted"}`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  onClick={handleSubmit}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {formData.isPublished ? "Publicar" : "Guardar Borrador"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/admin/media-releases")}
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
