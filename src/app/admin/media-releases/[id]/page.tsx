"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DirectDropboxUploader } from "@/components/admin/DirectDropboxUploader";
import { BulkAudioUploader } from "@/components/admin/BulkAudioUploader";
import { BulkImageUploader } from "@/components/admin/BulkImageUploader";
import { ImageAnalyzer } from "@/components/admin/ImageAnalyzer";
import { YouTubePreview } from "@/components/admin/YouTubePreview";
import { ArtistSelector, type Artist } from "@/components/admin/ArtistSelector";
import { StyleSettingsEditor } from "@/components/admin/StyleSettingsEditor";
import { type StyleSettings } from "@/lib/style-config";
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
  ChevronUp,
  ChevronDown,
  GripVertical,
  ListMusic,
  FolderUp,
  UserPlus,
  User,
} from "lucide-react";

interface ExternalLink {
  label: string;
  url: string;
}

interface AudioTrack {
  title: string;
  artist?: string;
  url: string;
  duration: string;
  trackNumber: number;
}

interface MediaRelease {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  category: string;
  mainArtistId: string | null;
  mainArtistName: string | null;
  summary: string | null;
  content: string | null;
  pullQuote: string | null;
  pullQuoteAttribution: string | null;
  coverImageUrl: string | null;
  bannerImageUrl: string | null;
  galleryImages: string | null;
  logoUrl: string | null;
  audioPreviewUrl: string | null;
  audioPreviewTitle: string | null;
  audioTracks: string | null;
  spotifyEmbedUrl: string | null;
  youtubeVideoId: string | null;
  youtubeVideoTitle: string | null;
  pressKitUrl: string | null;
  highResImagesUrl: string | null;
  linerNotesUrl: string | null;
  credits: string | null;
  relatedArtistIds: string | null;
  externalLinks: string | null;
  prContactName: string | null;
  prContactEmail: string | null;
  prContactPhone: string | null;
  managementContact: string | null;
  bookingContact: string | null;
  publishDate: string;
  embargoDate: string | null;
  releaseDate: string | null;
  eventDate: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  accessCode: string | null;
  tags: string | null;
  styleSettings: Partial<StyleSettings> | null;
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

export default function EditMediaReleasePage() {
  const router = useRouter();
  const params = useParams();
  const mediaReleaseId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [activeTab, setActiveTab] = useState("basic");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [existingPressKits, setExistingPressKits] = useState<{
    id: string;
    title: string;
    description: string | null;
    downloadUrl: string;
    fileSize: number | null;
    artistId: string | null;
    artistName: string | null;
  }[]>([]);

  const [formData, setFormData] = useState({
    id: "",
    title: "",
    subtitle: "",
    slug: "",
    category: "announcement",
    mainArtistId: "" as string,
    mainArtistName: "" as string,
    useCustomArtist: false,
    summary: "",
    content: "",
    pullQuote: "",
    pullQuoteAttribution: "",
    tags: "",
    coverImageUrl: "",
    bannerImageUrl: "",
    galleryImages: [] as string[],
    logoUrl: "",
    audioPreviewUrl: "",
    audioPreviewTitle: "",
    audioTracks: [] as AudioTrack[],
    spotifyEmbedUrl: "",
    youtubeVideoId: "",
    youtubeVideoTitle: "",
    pressKitUrl: "",
    highResImagesUrl: "",
    linerNotesUrl: "",
    credits: "",
    relatedArtistIds: [] as string[],
    externalLinks: [] as ExternalLink[],
    prContactName: "",
    prContactEmail: "",
    prContactPhone: "",
    managementContact: "",
    bookingContact: "",
    publishDate: new Date().toISOString().split("T")[0],
    embargoDate: "",
    releaseDate: "",
    eventDate: "",
    isPublished: false,
    isFeatured: false,
    accessCode: "",
    styleSettings: {} as Partial<StyleSettings>,
  });

  useEffect(() => {
    fetchMediaRelease();
    fetchArtists();
    fetchPressKits();
  }, [mediaReleaseId]);

  const fetchMediaRelease = async () => {
    try {
      const res = await fetch(`/api/admin/media-releases/${mediaReleaseId}`);
      const data = await res.json();

      if (data.success && data.data) {
        const mr = data.data as MediaRelease;

        // Parse JSON fields safely
        let galleryImages: string[] = [];
        let relatedArtistIds: string[] = [];
        let externalLinks: ExternalLink[] = [];
        let audioTracks: AudioTrack[] = [];
        let tagsString = "";

        try {
          if (mr.galleryImages) {
            galleryImages = JSON.parse(mr.galleryImages);
          }
        } catch (e) {
          console.error("Error parsing galleryImages:", e);
        }

        try {
          if (mr.relatedArtistIds) {
            relatedArtistIds = JSON.parse(mr.relatedArtistIds);
          }
        } catch (e) {
          console.error("Error parsing relatedArtistIds:", e);
        }

        try {
          if (mr.externalLinks) {
            externalLinks = JSON.parse(mr.externalLinks);
          }
        } catch (e) {
          console.error("Error parsing externalLinks:", e);
        }

        try {
          if (mr.audioTracks) {
            audioTracks = JSON.parse(mr.audioTracks);
          }
        } catch (e) {
          console.error("Error parsing audioTracks:", e);
        }

        try {
          if (mr.tags) {
            const tagsArray = JSON.parse(mr.tags);
            tagsString = Array.isArray(tagsArray) ? tagsArray.join(", ") : "";
          }
        } catch (e) {
          console.error("Error parsing tags:", e);
        }

        setFormData({
          id: mr.id,
          title: mr.title || "",
          subtitle: mr.subtitle || "",
          slug: mr.slug || "",
          category: mr.category || "announcement",
          mainArtistId: mr.mainArtistId || "",
          mainArtistName: mr.mainArtistName || "",
          useCustomArtist: !mr.mainArtistId && !!mr.mainArtistName,
          summary: mr.summary || "",
          content: mr.content || "",
          pullQuote: mr.pullQuote || "",
          pullQuoteAttribution: mr.pullQuoteAttribution || "",
          tags: tagsString,
          coverImageUrl: mr.coverImageUrl || "",
          bannerImageUrl: mr.bannerImageUrl || "",
          galleryImages,
          logoUrl: mr.logoUrl || "",
          audioPreviewUrl: mr.audioPreviewUrl || "",
          audioPreviewTitle: mr.audioPreviewTitle || "",
          audioTracks,
          spotifyEmbedUrl: mr.spotifyEmbedUrl || "",
          youtubeVideoId: mr.youtubeVideoId || "",
          youtubeVideoTitle: mr.youtubeVideoTitle || "",
          pressKitUrl: mr.pressKitUrl || "",
          highResImagesUrl: mr.highResImagesUrl || "",
          linerNotesUrl: mr.linerNotesUrl || "",
          credits: mr.credits || "",
          relatedArtistIds,
          externalLinks,
          prContactName: mr.prContactName || "",
          prContactEmail: mr.prContactEmail || "",
          prContactPhone: mr.prContactPhone || "",
          managementContact: mr.managementContact || "",
          bookingContact: mr.bookingContact || "",
          publishDate: mr.publishDate ? new Date(mr.publishDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          embargoDate: mr.embargoDate ? new Date(mr.embargoDate).toISOString().split("T")[0] : "",
          releaseDate: mr.releaseDate ? new Date(mr.releaseDate).toISOString().split("T")[0] : "",
          eventDate: mr.eventDate ? new Date(mr.eventDate).toISOString().split("T")[0] : "",
          isPublished: mr.isPublished || false,
          isFeatured: mr.isFeatured || false,
          accessCode: mr.accessCode || "",
          styleSettings: mr.styleSettings || {},
        });
      } else {
        showMessage("error", "No se pudo cargar el media release");
      }
    } catch (error) {
      console.error("Error fetching media release:", error);
      showMessage("error", "Error al cargar el media release");
    } finally {
      setIsFetching(false);
    }
  };

  const fetchArtists = async () => {
    try {
      const res = await fetch("/api/admin/artists");
      const data = await res.json();
      if (data.success) {
        setArtists(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching artists:", error);
    }
  };

  const fetchPressKits = async () => {
    try {
      const res = await fetch("/api/admin/press-kits/list");
      const data = await res.json();
      if (data.success) {
        setExistingPressKits(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching press kits:", error);
    }
  };

  // Handler for selecting an existing press kit
  const handleSelectExistingPressKit = (kitId: string) => {
    const selectedKit = existingPressKits.find(k => k.id === kitId);
    if (selectedKit) {
      setFormData(prev => ({ ...prev, pressKitUrl: selectedKit.downloadUrl }));
      showMessage("success", `Press Kit de "${selectedKit.artistName || selectedKit.title}" seleccionado`);
    }
  };

  // Handler to clear audio preview
  const handleClearAudioPreview = () => {
    setFormData(prev => ({ ...prev, audioPreviewUrl: "", audioPreviewTitle: "" }));
    showMessage("success", "Audio preview eliminado");
  };

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
    setFormData(prev => {
      const nextTrackNumber = prev.audioTracks.length + 1;
      return {
        ...prev,
        audioTracks: [...prev.audioTracks, {
          title: `Track ${nextTrackNumber}`,
          artist: "",
          url: "",
          duration: "",
          trackNumber: nextTrackNumber
        }]
      };
    });
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

  // Bulk upload handler - adds multiple tracks at once
  const handleBulkTracksUpload = (tracks: { title: string; artist?: string; url: string; duration: string; trackNumber?: number }[]) => {
    console.log("[MediaRelease] handleBulkTracksUpload called with", tracks.length, "tracks:", tracks);

    if (!tracks || tracks.length === 0) {
      console.warn("[MediaRelease] No tracks to add");
      return;
    }

    setFormData(prev => {
      const startNumber = prev.audioTracks.length + 1;
      const newTracks: AudioTrack[] = tracks.map((track, index) => ({
        title: track.title,
        artist: track.artist || undefined,
        url: track.url,
        duration: track.duration,
        trackNumber: startNumber + index,
      }));

      console.log("[MediaRelease] Adding tracks:", newTracks);
      console.log("[MediaRelease] Previous audioTracks count:", prev.audioTracks.length);
      console.log("[MediaRelease] New audioTracks count:", prev.audioTracks.length + newTracks.length);

      return {
        ...prev,
        audioTracks: [...prev.audioTracks, ...newTracks]
      };
    });

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

      // Remove useCustomArtist from submit data (it's only for UI state)
      delete (submitData as any).useCustomArtist;

      const response = await fetch("/api/admin/media-releases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        showMessage("success", "Media release actualizado exitosamente");
        setTimeout(() => {
          router.push("/admin/media-releases");
        }, 1500);
      } else {
        showMessage("error", data.error || "Error al actualizar media release");
      }
    } catch (error) {
      showMessage("error", "Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const extractYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([^&?/]+)/);
    return match ? match[1] : url;
  };

  if (isFetching) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-slc-muted">Cargando media release...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="font-oswald text-3xl uppercase">Editar Media Release</h1>
          <p className="text-slc-muted mt-1">
            {formData.title || "Sin título"}
          </p>
        </div>
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Guardar Cambios
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
                      {/* Image analyzer for cover */}
                      <ImageAnalyzer
                        imageUrl={formData.coverImageUrl}
                        expectedAspectRatio="square"
                        minWidth={1000}
                        minHeight={1000}
                        showColorPicker={true}
                        showColorPalette={true}
                        showDimensionInfo={true}
                        showCropTool={true}
                        onColorExtracted={(color) => {
                          console.log("Dominant color:", color);
                        }}
                        onColorsExtracted={(colors) => {
                          console.log("Color palette:", colors);
                        }}
                        onImageCropped={(dataUrl) => {
                          // Could upload the cropped image to Dropbox here
                          console.log("Image cropped, data URL length:", dataUrl.length);
                        }}
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
                      {/* Image analyzer for banner */}
                      <ImageAnalyzer
                        imageUrl={formData.bannerImageUrl}
                        expectedAspectRatio="16:9"
                        minWidth={1920}
                        minHeight={1080}
                        showColorPicker={false}
                        showColorPalette={false}
                        showDimensionInfo={true}
                        showCropTool={true}
                        onImageCropped={(dataUrl) => {
                          console.log("Banner cropped, data URL length:", dataUrl.length);
                        }}
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
                {/* Bulk Upload Section */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <FolderUp className="w-5 h-5 text-spotify" />
                    <h2 className="font-oswald text-xl uppercase">
                      Subir Álbum Completo
                    </h2>
                  </div>

                  <p className="text-sm text-slc-muted mb-4">
                    Sube todos los tracks de tu lanzamiento de una vez. Los archivos se ordenarán automáticamente y detectaremos la duración de cada track.
                  </p>

                  <BulkAudioUploader
                    onUploadComplete={handleBulkTracksUpload}
                    folder="/media-releases/tracks"
                    maxSize={150}
                    maxFiles={30}
                  />
                </div>

                {/* Full Tracklist */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
                      <ListMusic className="w-5 h-5 text-spotify" />
                      Tracklist ({formData.audioTracks.length})
                    </h2>
                    <Button type="button" variant="outline" size="sm" onClick={addAudioTrack}>
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Track Individual
                    </Button>
                  </div>

                  <p className="text-sm text-slc-muted mb-4">
                    Tracks subidos. Puedes reordenar, editar títulos y duraciones.
                  </p>

                  {formData.audioTracks.length === 0 ? (
                    <div className="text-center py-12 bg-slc-card rounded-lg border-2 border-dashed border-slc-border">
                      <Music className="w-12 h-12 mx-auto mb-3 text-slc-muted opacity-50" />
                      <p className="text-slc-muted mb-4">No hay tracks agregados</p>
                      <Button type="button" variant="outline" onClick={addAudioTrack}>
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Primer Track
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.audioTracks.map((track, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-4 bg-slc-card rounded-lg border border-slc-border"
                        >
                          {/* Track Number & Reorder */}
                          <div className="flex flex-col items-center gap-1 pt-2">
                            <button
                              type="button"
                              onClick={() => moveTrackUp(index)}
                              disabled={index === 0}
                              className="p-1 hover:bg-slc-dark rounded disabled:opacity-30"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-oswald text-sm">
                              {track.trackNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => moveTrackDown(index)}
                              disabled={index === formData.audioTracks.length - 1}
                              className="p-1 hover:bg-slc-dark rounded disabled:opacity-30"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Track Details */}
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs text-slc-muted mb-1">Título del Track</label>
                                <Input
                                  value={track.title}
                                  onChange={(e) => updateAudioTrack(index, "title", e.target.value)}
                                  placeholder={`Track ${index + 1}`}
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slc-muted mb-1">Artista / Feat.</label>
                                <Input
                                  value={track.artist || ""}
                                  onChange={(e) => updateAudioTrack(index, "artist", e.target.value)}
                                  placeholder="Latin Geisha"
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-slc-muted mb-1">Duración</label>
                                <Input
                                  value={track.duration}
                                  onChange={(e) => updateAudioTrack(index, "duration", e.target.value)}
                                  placeholder="3:45"
                                  className="h-9"
                                />
                              </div>
                            </div>

                            {/* Audio Upload */}
                            {track.url ? (
                              <div className="flex items-center gap-3 p-3 bg-slc-dark rounded-lg">
                                <Play className="w-5 h-5 text-spotify" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">
                                    {track.title || `Track ${index + 1}`}
                                    {track.artist && <span className="text-slc-muted"> - {track.artist}</span>}
                                  </p>
                                  <audio controls src={track.url} className="w-full h-8 mt-1" />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateAudioTrack(index, "url", "")}
                                  className="text-red-500 hover:text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <DirectDropboxUploader
                                onUploadComplete={(url, filename, fileSize) => handleTrackUpload(index, url, filename, fileSize)}
                                accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.wma,.aiff"
                                maxSize={150}
                                folder="/media-releases/tracks"
                                label={`Subir audio de Track ${index + 1}`}
                              />
                            )}
                          </div>

                          {/* Remove Track */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAudioTrack(index)}
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {formData.audioTracks.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slc-border flex justify-between items-center">
                      <span className="text-sm text-slc-muted">
                        {formData.audioTracks.length} track{formData.audioTracks.length !== 1 ? "s" : ""}
                        {formData.audioTracks.filter(t => t.url).length > 0 && (
                          <span className="text-green-500 ml-2">
                            ({formData.audioTracks.filter(t => t.url).length} con audio)
                          </span>
                        )}
                      </span>
                      <Button type="button" variant="outline" size="sm" onClick={addAudioTrack}>
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar Otro Track
                      </Button>
                    </div>
                  )}
                </div>

                {/* Single Audio Preview (Legacy) */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <Music className="w-5 h-5 text-spotify" />
                    Audio Preview (Single)
                  </h2>
                  <p className="text-sm text-slc-muted mb-4">
                    Un solo track de preview. Usa el tracklist de arriba para lanzamientos completos.
                  </p>

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
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{formData.audioPreviewTitle || "Audio Preview"}</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleClearAudioPreview}
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
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

                {/* Video */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <Video className="w-5 h-5 text-red-500" />
                    Video Teaser
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

                    {/* YouTube Preview with thumbnail and play button */}
                    <YouTubePreview
                      videoUrl={formData.youtubeVideoId}
                      showEmbed={true}
                      onVideoIdExtracted={(id) => {
                        if (id !== formData.youtubeVideoId) {
                          setFormData(prev => ({ ...prev, youtubeVideoId: id }));
                        }
                      }}
                    />
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

                  {/* Existing Press Kits Selector */}
                  {existingPressKits.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm text-slc-muted mb-2">
                        Usar Press Kit de Artista Existente
                      </label>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleSelectExistingPressKit(e.target.value);
                          }
                        }}
                        className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                      >
                        <option value="">Seleccionar press kit existente...</option>
                        {existingPressKits.map((kit) => (
                          <option key={kit.id} value={kit.id}>
                            {kit.artistName ? `${kit.artistName} - ${kit.title}` : kit.title}
                            {kit.fileSize ? ` (${(kit.fileSize / 1024 / 1024).toFixed(1)} MB)` : ""}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slc-muted mt-1">
                        Selecciona un press kit existente de un artista para vincularlo a este comunicado.
                      </p>
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 px-3 bg-slc-dark text-slc-muted text-xs">
                      o subir nuevo
                    </div>
                    <div className="pt-4 border-t border-slc-border">
                      <DirectDropboxUploader
                        onUploadComplete={handlePressKitUpload}
                        accept=".zip,.rar"
                        maxSize={150}
                        folder="/media-releases/press-kits"
                        label="Subir Press Kit"
                        currentUrl={formData.pressKitUrl}
                      />
                    </div>
                  </div>

                  {formData.pressKitUrl && (
                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-green-500">Press Kit listo para descargar</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, pressKitUrl: "" }));
                          showMessage("success", "Press Kit eliminado");
                        }}
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Quitar
                      </Button>
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

            {/* Style Settings */}
            <StyleSettingsEditor
              value={formData.styleSettings}
              onChange={(styleSettings) => setFormData(prev => ({ ...prev, styleSettings }))}
            />

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
                  {formData.isPublished ? "Guardar y Publicar" : "Guardar Borrador"}
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
