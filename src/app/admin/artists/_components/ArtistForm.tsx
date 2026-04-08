"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DirectDropboxUploader } from "@/components/admin/DirectDropboxUploader";
import { MultiFileDropboxUploader } from "@/components/admin/MultiFileDropboxUploader";
import {
  ArrowLeft,
  Save,
  User,
  Users,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Plus,
  Globe,
  Mail,
  MapPin,
  Calendar,
  Music,
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  Link as LinkIcon,
  Image as ImageIcon,
  Star,
  Eye,
  EyeOff,
  X,
  Camera,
  GripVertical,
} from "lucide-react";
import { ARTIST_ROLES, getArtistRolesDisplay } from "@/lib/roles";

// Platform configuration
const platforms = [
  { id: "spotify", label: "Spotify", icon: "🎵", color: "#1DB954", placeholder: "https://open.spotify.com/artist/..." },
  { id: "apple_music", label: "Apple Music", icon: "🍎", color: "#FA243C", placeholder: "https://music.apple.com/artist/..." },
  { id: "youtube", label: "YouTube", icon: "▶️", color: "#FF0000", placeholder: "https://youtube.com/@..." },
  { id: "youtube_music", label: "YouTube Music", icon: "🎵", color: "#FF0000", placeholder: "https://music.youtube.com/channel/..." },
  { id: "instagram", label: "Instagram", icon: "📷", color: "#E4405F", placeholder: "https://instagram.com/..." },
  { id: "tiktok", label: "TikTok", icon: "🎵", color: "#000000", placeholder: "https://tiktok.com/@..." },
  { id: "twitter", label: "X (Twitter)", icon: "𝕏", color: "#1DA1F2", placeholder: "https://x.com/..." },
  { id: "facebook", label: "Facebook", icon: "📘", color: "#1877F2", placeholder: "https://facebook.com/..." },
  { id: "soundcloud", label: "SoundCloud", icon: "☁️", color: "#FF5500", placeholder: "https://soundcloud.com/..." },
  { id: "bandcamp", label: "Bandcamp", icon: "🎸", color: "#629AA9", placeholder: "https://....bandcamp.com" },
  { id: "deezer", label: "Deezer", icon: "🎧", color: "#FEAA2D", placeholder: "https://deezer.com/artist/..." },
  { id: "tidal", label: "Tidal", icon: "🌊", color: "#000000", placeholder: "https://tidal.com/artist/..." },
  { id: "amazon_music", label: "Amazon Music", icon: "🎵", color: "#FF9900", placeholder: "https://music.amazon.com/artists/..." },
  { id: "mixcloud", label: "Mixcloud", icon: "🎛️", color: "#5000FF", placeholder: "https://mixcloud.com/..." },
  { id: "beatport", label: "Beatport", icon: "🎹", color: "#94D500", placeholder: "https://beatport.com/artist/..." },
  { id: "discogs", label: "Discogs", icon: "💿", color: "#333333", placeholder: "https://discogs.com/artist/..." },
  { id: "genius", label: "Genius", icon: "📝", color: "#FFFF64", placeholder: "https://genius.com/artists/..." },
  { id: "linktree", label: "Linktree", icon: "🌳", color: "#43E55E", placeholder: "https://linktr.ee/..." },
];

// Roles are imported from @/lib/roles

const verificationStatuses = [
  { value: "pending", label: "Pendiente", color: "yellow" },
  { value: "verified", label: "Verificado", color: "green" },
  { value: "rejected", label: "Rechazado", color: "red" },
];

interface ExternalProfile {
  id?: string;
  platform: string;
  externalUrl: string;
  handle?: string;
  externalId?: string;
  isVerified?: boolean;
  isPrimary?: boolean;
}

interface GalleryAsset {
  id?: string;
  assetUrl: string;
  thumbnailUrl?: string;
  assetType: "photo" | "press_photo" | "album_art" | "logo" | "banner";
  caption?: string;
  credit?: string;
  isPublic: boolean;
}

const assetTypes = [
  { value: "photo", label: "Foto" },
  { value: "press_photo", label: "Foto de Prensa" },
  { value: "album_art", label: "Arte de Album" },
  { value: "logo", label: "Logo" },
  { value: "banner", label: "Banner" },
];

interface ArtistRelation {
  id?: string;
  relatedArtistId: string;
  relatedArtist?: {
    id: string;
    name: string;
    profileImageUrl?: string | null;
    role?: string;
  };
  relationType: "collaborator" | "alias" | "member_of" | "featured" | "producer" | "dj_duo";
}

const relationTypes = [
  { value: "collaborator", label: "Colaborador Frecuente", description: "Han trabajado juntos en múltiples proyectos" },
  { value: "member_of", label: "Miembro de Grupo", description: "Es parte de este grupo o colectivo" },
  { value: "alias", label: "Alias / Alter Ego", description: "Es el mismo artista bajo otro nombre" },
  { value: "featured", label: "Featured Artist", description: "Ha aparecido como artista invitado" },
  { value: "producer", label: "Productor", description: "Produce las pistas de este artista" },
  { value: "dj_duo", label: "Duo de DJs", description: "Trabajan juntos como duo de DJs" },
];

interface ArtistFormProps {
  mode: "create" | "edit";
  artistId?: string;
  initialData?: any;
}

export default function ArtistForm({ mode, artistId, initialData }: ArtistFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(mode === "edit");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState({
    // Basic Info
    name: "",
    slug: "",
    realName: "",
    role: "mc",
    shortBio: "",
    bio: "",

    // Images
    profileImageUrl: "",
    featuredImageUrl: "",
    bannerImageUrl: "",
    tintColor: "",

    // Location & Contact
    location: "",
    country: "",
    bookingEmail: "",
    managementEmail: "",
    pressEmail: "",
    websiteUrl: "",

    // Career Info
    yearStarted: "",
    genres: [] as string[],
    labels: [] as string[],

    // Status
    isActive: true,
    isFeatured: false,
    sortOrder: 0,
    verificationStatus: "pending",
    adminNotes: "",
  });

  const [externalProfiles, setExternalProfiles] = useState<ExternalProfile[]>([]);
  const [galleryAssets, setGalleryAssets] = useState<GalleryAsset[]>([]);
  const [artistRelationsList, setArtistRelationsList] = useState<ArtistRelation[]>([]);
  const [allArtists, setAllArtists] = useState<{ id: string; name: string; profileImageUrl?: string | null; role?: string }[]>([]);
  const [newGenre, setNewGenre] = useState("");
  const [newLabel, setNewLabel] = useState("");

  // Press & Media state
  const [pressQuotes, setPressQuotes] = useState<{ quote: string; source: string; sourceUrl: string }[]>([]);
  const [featuredVideos, setFeaturedVideos] = useState<{ videoUrl: string; title: string; platform: string; views: number; thumbnailUrl: string }[]>([]);

  // Fetch all artists for relation selector
  useEffect(() => {
    async function fetchAllArtists() {
      try {
        const res = await fetch("/api/admin/artists");
        const data = await res.json();
        if (data.success && data.data) {
          setAllArtists(data.data.filter((a: any) => a.id !== artistId));
        }
      } catch (error) {
        console.error("Error fetching artists:", error);
      }
    }
    fetchAllArtists();
  }, [artistId]);

  // Fetch artist data in edit mode
  useEffect(() => {
    if (mode === "edit" && artistId) {
      const fetchArtist = async () => {
        setIsFetching(true);
        try {
          const res = await fetch(`/api/admin/artists/${artistId}`);
          const data = await res.json();

          if (data.success && data.data) {
            const artist = data.data;
            setFormData({
              name: artist.name || "",
              slug: artist.slug || "",
              realName: artist.realName || "",
              role: artist.role || "mc",
              shortBio: artist.shortBio || "",
              bio: artist.bio || "",
              profileImageUrl: artist.profileImageUrl || "",
              featuredImageUrl: artist.featuredImageUrl || "",
              bannerImageUrl: artist.bannerImageUrl || "",
              tintColor: artist.tintColor || "",
              location: artist.location || "",
              country: artist.country || "",
              bookingEmail: artist.bookingEmail || "",
              managementEmail: artist.managementEmail || "",
              pressEmail: artist.pressEmail || "",
              websiteUrl: artist.websiteUrl || "",
              yearStarted: artist.yearStarted?.toString() || "",
              genres: artist.genres ? JSON.parse(artist.genres) : [],
              labels: artist.labels ? JSON.parse(artist.labels) : [],
              isActive: artist.isActive ?? true,
              isFeatured: artist.isFeatured ?? false,
              sortOrder: artist.sortOrder ?? 0,
              verificationStatus: artist.verificationStatus || "pending",
              adminNotes: artist.adminNotes || "",
            });

            if (artist.externalProfiles) {
              setExternalProfiles(artist.externalProfiles);
            }

            if (artist.galleryAssets) {
              setGalleryAssets(artist.galleryAssets.map((asset: any) => ({
                id: asset.id,
                assetUrl: asset.assetUrl,
                thumbnailUrl: asset.thumbnailUrl,
                assetType: asset.assetType || "photo",
                caption: asset.caption || "",
                credit: asset.credit || "",
                isPublic: asset.isPublic ?? true,
              })));
            }

            if (artist.artistRelations) {
              setArtistRelationsList(artist.artistRelations.map((rel: any) => ({
                id: rel.id,
                relatedArtistId: rel.relatedArtistId,
                relatedArtist: rel.relatedArtist,
                relationType: rel.relationType || "collaborator",
              })));
            }

            // Load press quotes and featured videos
            if (artist.pressQuotes) {
              try {
                setPressQuotes(JSON.parse(artist.pressQuotes));
              } catch (e) {
                setPressQuotes([]);
              }
            }
            if (artist.featuredVideos) {
              try {
                setFeaturedVideos(JSON.parse(artist.featuredVideos));
              } catch (e) {
                setFeaturedVideos([]);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching artist:", error);
          showMessage("error", "Error al cargar el artista");
        } finally {
          setIsFetching(false);
        }
      };
      fetchArtist();
    }
  }, [mode, artistId]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleImageUpload = (field: string) => (url: string, filename: string, _fileSize: number) => {
    setFormData(prev => ({ ...prev, [field]: url }));
    showMessage("success", `Imagen "${filename}" subida correctamente`);
  };

  // Gallery asset functions
  const handleGalleryUpload = (url: string, filename: string, _fileSize: number) => {
    const newAsset: GalleryAsset = {
      assetUrl: url,
      assetType: "photo",
      caption: "",
      credit: "",
      isPublic: true,
    };
    setGalleryAssets(prev => [...prev, newAsset]);
    showMessage("success", `Foto "${filename}" agregada a la galeria`);
  };

  const handleMultiGalleryUpload = (files: { url: string; filename: string; fileSize: number; originalName: string }[]) => {
    const newAssets: GalleryAsset[] = files.map(file => ({
      assetUrl: file.url,
      assetType: "photo" as const,
      caption: "",
      credit: "",
      isPublic: true,
    }));
    setGalleryAssets(prev => [...prev, ...newAssets]);
    showMessage("success", `${files.length} foto(s) agregadas a la galería`);
  };

  const updateGalleryAsset = (index: number, field: keyof GalleryAsset, value: string | boolean) => {
    setGalleryAssets(prev => prev.map((asset, i) =>
      i === index ? { ...asset, [field]: value } : asset
    ));
  };

  const removeGalleryAsset = (index: number) => {
    setGalleryAssets(prev => prev.filter((_, i) => i !== index));
  };

  const moveGalleryAsset = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === galleryAssets.length - 1)
    ) return;

    const newAssets = [...galleryAssets];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [newAssets[index], newAssets[newIndex]] = [newAssets[newIndex], newAssets[index]];
    setGalleryAssets(newAssets);
  };

  // Artist relations management
  const addRelation = (relatedArtistId: string) => {
    const artist = allArtists.find(a => a.id === relatedArtistId);
    if (artist && !artistRelationsList.some(r => r.relatedArtistId === relatedArtistId)) {
      setArtistRelationsList(prev => [...prev, {
        relatedArtistId,
        relatedArtist: artist,
        relationType: "collaborator",
      }]);
    }
  };

  const updateRelationType = (index: number, relationType: ArtistRelation["relationType"]) => {
    setArtistRelationsList(prev => prev.map((r, i) =>
      i === index ? { ...r, relationType } : r
    ));
  };

  const removeRelation = (index: number) => {
    setArtistRelationsList(prev => prev.filter((_, i) => i !== index));
  };

  const addExternalProfile = (platform: string) => {
    const platformConfig = platforms.find(p => p.id === platform);
    setExternalProfiles(prev => [...prev, {
      platform,
      externalUrl: "",
      handle: "",
      isVerified: false,
      isPrimary: prev.filter(p => p.platform === platform).length === 0,
    }]);
  };

  const updateExternalProfile = (index: number, field: string, value: string | boolean) => {
    setExternalProfiles(prev => prev.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    ));
  };

  const removeExternalProfile = (index: number) => {
    setExternalProfiles(prev => prev.filter((_, i) => i !== index));
  };

  const addGenre = () => {
    if (newGenre.trim() && !formData.genres.includes(newGenre.trim())) {
      setFormData(prev => ({ ...prev, genres: [...prev.genres, newGenre.trim()] }));
      setNewGenre("");
    }
  };

  const removeGenre = (genre: string) => {
    setFormData(prev => ({ ...prev, genres: prev.genres.filter(g => g !== genre) }));
  };

  const addLabel = () => {
    if (newLabel.trim() && !formData.labels.includes(newLabel.trim())) {
      setFormData(prev => ({ ...prev, labels: [...prev.labels, newLabel.trim()] }));
      setNewLabel("");
    }
  };

  const removeLabel = (label: string) => {
    setFormData(prev => ({ ...prev, labels: prev.labels.filter(l => l !== label) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showMessage("error", "El nombre es requerido");
      setActiveTab("basic");
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = mode === "edit"
        ? `/api/admin/artists/${artistId}`
        : "/api/admin/artists";

      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          externalProfiles: externalProfiles.filter(p => p.externalUrl),
          galleryAssets: galleryAssets.filter(a => a.assetUrl),
          artistRelations: artistRelationsList.map(r => ({
            relatedArtistId: r.relatedArtistId,
            relationType: r.relationType,
          })),
          pressQuotes: pressQuotes.filter(q => q.quote),
          featuredVideos: featuredVideos.filter(v => v.videoUrl),
        }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage("success", mode === "edit" ? "Artista actualizado" : "Artista creado");
        setTimeout(() => {
          router.push("/admin/artists");
        }, 1500);
      } else {
        showMessage("error", data.error || "Error al guardar");
      }
    } catch (error) {
      showMessage("error", "Error de conexion");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!artistId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/artists/${artistId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        showMessage("success", "Artista eliminado");
        setTimeout(() => {
          router.push("/admin/artists");
        }, 1500);
      } else {
        showMessage("error", data.error || "Error al eliminar");
      }
    } catch (error) {
      showMessage("error", "Error de conexión");
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const tabs = [
    { id: "basic", label: "Info Básica", icon: User },
    { id: "images", label: "Imágenes", icon: ImageIcon },
    { id: "gallery", label: "Galería", icon: Camera },
    { id: "social", label: "Redes Sociales", icon: Globe },
    { id: "contact", label: "Contacto", icon: Mail },
    { id: "career", label: "Carrera", icon: Music },
    { id: "relations", label: "Relaciones", icon: Users },
    { id: "press", label: "Prensa", icon: Eye },
    { id: "settings", label: "Ajustes", icon: Star },
  ];

  if (isFetching) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/artists">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-oswald text-3xl uppercase">
            {mode === "edit" ? "Editar Artista" : "Nuevo Artista"}
          </h1>
          <p className="text-slc-muted mt-1">
            {mode === "edit" ? `Editando: ${formData.name}` : "Agrega un nuevo artista al roster"}
          </p>
        </div>
        <div className="flex gap-2">
          {mode === "edit" && (
            <Button
              variant="outline"
              className="text-red-500 border-red-500/50 hover:bg-red-500/10"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {mode === "edit" ? "Guardar Cambios" : "Crear Artista"}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-slc-dark border border-slc-border rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="font-oswald text-xl uppercase mb-4">Eliminar Artista</h3>
            <p className="text-slc-muted mb-6">
              ¿Estás seguro de que quieres eliminar a <strong>{formData.name}</strong>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-red-500 hover:bg-red-600"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}

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
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Información Básica
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm text-slc-muted mb-2">Nombre Artístico *</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Nombre del artista"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Slug (URL)</label>
                      <Input
                        value={formData.slug}
                        onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                        placeholder="nombre-artista (auto-generado)"
                      />
                      <p className="text-xs text-slc-muted mt-1">Se genera automáticamente del nombre</p>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm text-slc-muted mb-2">Roles *</label>
                      <div className="flex flex-wrap gap-2">
                        {ARTIST_ROLES.map((role) => {
                          const selectedRoles = formData.role.split(",").filter(Boolean);
                          const isSelected = selectedRoles.includes(role.value);
                          const Icon = role.icon;
                          return (
                            <button
                              key={role.value}
                              type="button"
                              onClick={() => {
                                const currentRoles = formData.role.split(",").filter(Boolean);
                                let newRoles: string[];
                                if (isSelected) {
                                  // Remove role, but keep at least one
                                  newRoles = currentRoles.filter(r => r !== role.value);
                                  if (newRoles.length === 0) newRoles = [role.value];
                                } else {
                                  // Add role
                                  newRoles = [...currentRoles, role.value];
                                }
                                setFormData(prev => ({ ...prev, role: newRoles.join(",") }));
                              }}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                                isSelected
                                  ? `${role.bgColor} ${role.color} ${role.borderColor} border`
                                  : "bg-slc-card text-slc-muted border-slc-border hover:border-slc-muted/50 hover:text-white"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              {role.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-slc-muted mt-2">Selecciona uno o más roles</p>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm text-slc-muted mb-2">Nombre Real (privado)</label>
                      <Input
                        value={formData.realName}
                        onChange={(e) => setFormData(prev => ({ ...prev, realName: e.target.value }))}
                        placeholder="Solo visible para admins"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm text-slc-muted mb-2">Bio Corta (1-2 oraciones)</label>
                      <Input
                        value={formData.shortBio}
                        onChange={(e) => setFormData(prev => ({ ...prev, shortBio: e.target.value }))}
                        placeholder="Breve descripción para tarjetas"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm text-slc-muted mb-2">Biografía Completa</label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Historia completa del artista..."
                        rows={8}
                        className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Images */}
            {activeTab === "images" && (
              <div className="space-y-6">
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-purple-500" />
                    Imágenes
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Profile Image */}
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Foto de Perfil (1:1)</label>
                      <div className="aspect-square rounded-lg overflow-hidden bg-slc-card mb-4">
                        {formData.profileImageUrl ? (
                          <SafeImage
                            src={formData.profileImageUrl}
                            alt="Profile"
                            width={400}
                            height={400}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-16 h-16 text-slc-muted" />
                          </div>
                        )}
                      </div>
                      <DirectDropboxUploader
                        onUploadComplete={handleImageUpload("profileImageUrl")}
                        accept="image/*"
                        maxSize={10}
                        folder="/artists/profiles"
                        label="Subir foto de perfil"
                        currentUrl={formData.profileImageUrl}
                      />
                    </div>

                    {/* Featured Image */}
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Imagen Destacada (16:9)</label>
                      <div className="aspect-video rounded-lg overflow-hidden bg-slc-card mb-4">
                        {formData.featuredImageUrl ? (
                          <SafeImage
                            src={formData.featuredImageUrl}
                            alt="Featured"
                            width={400}
                            height={225}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-slc-muted" />
                          </div>
                        )}
                      </div>
                      <DirectDropboxUploader
                        onUploadComplete={handleImageUpload("featuredImageUrl")}
                        accept="image/*"
                        maxSize={10}
                        folder="/artists/featured"
                        label="Subir imagen destacada"
                        currentUrl={formData.featuredImageUrl}
                      />
                    </div>

                    {/* Banner Image */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm text-slc-muted mb-2">Banner (3:1)</label>
                      <div className="aspect-[3/1] rounded-lg overflow-hidden bg-slc-card mb-4">
                        {formData.bannerImageUrl ? (
                          <SafeImage
                            src={formData.bannerImageUrl}
                            alt="Banner"
                            width={900}
                            height={300}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-slc-muted" />
                          </div>
                        )}
                      </div>
                      <DirectDropboxUploader
                        onUploadComplete={handleImageUpload("bannerImageUrl")}
                        accept="image/*"
                        maxSize={10}
                        folder="/artists/banners"
                        label="Subir banner"
                        currentUrl={formData.bannerImageUrl}
                      />
                    </div>

                    {/* Tint Color */}
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Color de Acento</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={formData.tintColor || "#f97316"}
                          onChange={(e) => setFormData(prev => ({ ...prev, tintColor: e.target.value }))}
                          className="w-12 h-10 rounded border border-slc-border cursor-pointer"
                        />
                        <Input
                          value={formData.tintColor}
                          onChange={(e) => setFormData(prev => ({ ...prev, tintColor: e.target.value }))}
                          placeholder="#f97316"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Gallery */}
            {activeTab === "gallery" && (
              <div className="space-y-6">
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-cyan-500" />
                    Galeria de Fotos
                  </h2>

                  <p className="text-sm text-slc-muted mb-6">
                    Agrega fotos del artista para usar en la pagina publica y press kits.
                    Arrastra para reordenar.
                  </p>

                  {/* Gallery Grid */}
                  <div className="space-y-4 mb-6">
                    {galleryAssets.map((asset, index) => (
                      <div
                        key={asset.id || index}
                        className="flex gap-4 p-4 bg-slc-card rounded-lg border border-slc-border"
                      >
                        {/* Thumbnail */}
                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-slc-dark flex-shrink-0">
                          <SafeImage
                            src={asset.assetUrl}
                            alt={asset.caption || `Foto ${index + 1}`}
                            width={96}
                            height={96}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <select
                              value={asset.assetType}
                              onChange={(e) => updateGalleryAsset(index, "assetType", e.target.value as GalleryAsset["assetType"])}
                              className="px-3 py-1.5 bg-slc-dark border border-slc-border rounded text-sm focus:outline-none focus:border-primary"
                            >
                              {assetTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={asset.isPublic}
                                onChange={(e) => updateGalleryAsset(index, "isPublic", e.target.checked)}
                                className="w-4 h-4 rounded border-slc-border"
                              />
                              Publico
                            </label>
                          </div>
                          <Input
                            value={asset.caption || ""}
                            onChange={(e) => updateGalleryAsset(index, "caption", e.target.value)}
                            placeholder="Descripcion (opcional)"
                            className="h-8 text-sm"
                          />
                          <Input
                            value={asset.credit || ""}
                            onChange={(e) => updateGalleryAsset(index, "credit", e.target.value)}
                            placeholder="Credito fotografo (opcional)"
                            className="h-8 text-sm"
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => moveGalleryAsset(index, "up")}
                            disabled={index === 0}
                            className="p-1.5 text-slc-muted hover:text-white disabled:opacity-30"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveGalleryAsset(index, "down")}
                            disabled={index === galleryAssets.length - 1}
                            className="p-1.5 text-slc-muted hover:text-white disabled:opacity-30"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeGalleryAsset(index)}
                            className="p-1.5 text-red-500 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {galleryAssets.length === 0 && (
                      <div className="text-center py-12 text-slc-muted">
                        <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No hay fotos en la galería</p>
                        <p className="text-sm">Sube fotos usando las opciones de abajo</p>
                      </div>
                    )}
                  </div>

                  {/* Multi-file Upload */}
                  <div className="space-y-4">
                    <MultiFileDropboxUploader
                      onFilesUploaded={handleMultiGalleryUpload}
                      accept="image/*"
                      maxSize={15}
                      maxFiles={20}
                      folder="/artists/gallery"
                      label="Subir múltiples fotos a la galería"
                    />

                    <div className="text-center text-xs text-slc-muted">
                      — o sube una foto individual —
                    </div>

                    <DirectDropboxUploader
                      onUploadComplete={handleGalleryUpload}
                      accept="image/*"
                      maxSize={15}
                      folder="/artists/gallery"
                      label="Subir foto individual"
                      currentUrl=""
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Social Profiles */}
            {activeTab === "social" && (
              <div className="space-y-6">
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-500" />
                    Redes Sociales y Plataformas
                  </h2>

                  {/* Existing Profiles */}
                  <div className="space-y-4 mb-6">
                    {externalProfiles.map((profile, index) => {
                      const platformConfig = platforms.find(p => p.id === profile.platform);
                      return (
                        <div
                          key={index}
                          className="p-4 bg-slc-card rounded-lg"
                          style={{ borderLeft: `3px solid ${platformConfig?.color || '#888'}` }}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-xl">{platformConfig?.icon}</span>
                            <span className="font-medium">{platformConfig?.label}</span>
                            <button
                              type="button"
                              onClick={() => removeExternalProfile(index)}
                              className="ml-auto text-red-500 hover:text-red-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              value={profile.externalUrl}
                              onChange={(e) => updateExternalProfile(index, "externalUrl", e.target.value)}
                              placeholder={platformConfig?.placeholder || "URL del perfil"}
                            />
                            <Input
                              value={profile.handle || ""}
                              onChange={(e) => updateExternalProfile(index, "handle", e.target.value)}
                              placeholder="@usuario (opcional)"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add New Profile */}
                  <div className="border-t border-slc-border pt-6">
                    <p className="text-sm text-slc-muted mb-4">Agregar plataforma:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {platforms.map((platform) => (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => addExternalProfile(platform.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-slc-card hover:bg-slc-card/80 rounded-lg text-sm transition-colors"
                          style={{ borderLeft: `2px solid ${platform.color}` }}
                        >
                          <span>{platform.icon}</span>
                          <span>{platform.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Contact */}
            {activeTab === "contact" && (
              <div className="space-y-6">
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-green-500" />
                    Información de Contacto
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm text-slc-muted mb-2">Ubicación</label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Input
                            value={formData.location}
                            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            placeholder="Ciudad, Estado"
                          />
                        </div>
                        <div className="w-32">
                          <Input
                            value={formData.country}
                            onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                            placeholder="País"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Email de Booking</label>
                      <Input
                        type="email"
                        value={formData.bookingEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, bookingEmail: e.target.value }))}
                        placeholder="booking@ejemplo.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Email de Management</label>
                      <Input
                        type="email"
                        value={formData.managementEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, managementEmail: e.target.value }))}
                        placeholder="management@ejemplo.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Email de Prensa</label>
                      <Input
                        type="email"
                        value={formData.pressEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, pressEmail: e.target.value }))}
                        placeholder="prensa@ejemplo.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Sitio Web</label>
                      <Input
                        type="url"
                        value={formData.websiteUrl}
                        onChange={(e) => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Career */}
            {activeTab === "career" && (
              <div className="space-y-6">
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <Music className="w-5 h-5 text-spotify" />
                    Información de Carrera
                  </h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Año de Inicio</label>
                      <Input
                        type="number"
                        value={formData.yearStarted}
                        onChange={(e) => setFormData(prev => ({ ...prev, yearStarted: e.target.value }))}
                        placeholder="ej: 2005"
                        min="1970"
                        max={new Date().getFullYear()}
                        className="w-32"
                      />
                    </div>

                    {/* Genres */}
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Géneros</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {formData.genres.map((genre) => (
                          <span
                            key={genre}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                          >
                            {genre}
                            <button type="button" onClick={() => removeGenre(genre)}>
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newGenre}
                          onChange={(e) => setNewGenre(e.target.value)}
                          placeholder="Hip Hop, Trap, Boom Bap..."
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGenre())}
                        />
                        <Button type="button" variant="outline" onClick={addGenre}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Labels */}
                    <div>
                      <label className="block text-sm text-slc-muted mb-2">Sellos Discográficos</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {formData.labels.map((label) => (
                          <span
                            key={label}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-sm"
                          >
                            {label}
                            <button type="button" onClick={() => removeLabel(label)}>
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newLabel}
                          onChange={(e) => setNewLabel(e.target.value)}
                          placeholder="Sonido Líquido, Independent..."
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLabel())}
                        />
                        <Button type="button" variant="outline" onClick={addLabel}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Relations */}
            {activeTab === "relations" && (
              <div className="space-y-6">
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" />
                    Relaciones con Otros Artistas
                  </h2>

                  <p className="text-sm text-slc-muted mb-6">
                    Conecta a este artista con otros miembros del crew para mostrar colaboraciones,
                    grupos y alias en su perfil público.
                  </p>

                  {/* Existing Relations */}
                  <div className="space-y-3 mb-6">
                    {artistRelationsList.map((relation, index) => (
                      <div
                        key={relation.id || index}
                        className="flex items-center gap-4 p-4 bg-slc-card rounded-lg border border-slc-border"
                      >
                        {/* Artist Avatar */}
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-slc-dark flex-shrink-0">
                          {relation.relatedArtist?.profileImageUrl ? (
                            <SafeImage
                              src={relation.relatedArtist.profileImageUrl}
                              alt={relation.relatedArtist.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-6 h-6 text-slc-muted" />
                            </div>
                          )}
                        </div>

                        {/* Artist Info */}
                        <div className="flex-1">
                          <p className="font-medium">{relation.relatedArtist?.name || "Artista desconocido"}</p>
                          <p className="text-xs text-slc-muted">
                            {getArtistRolesDisplay(relation.relatedArtist?.role)}
                          </p>
                        </div>

                        {/* Relation Type */}
                        <select
                          value={relation.relationType}
                          onChange={(e) => updateRelationType(index, e.target.value as ArtistRelation["relationType"])}
                          className="px-3 py-2 bg-slc-dark border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
                        >
                          {relationTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeRelation(index)}
                          className="p-2 text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {artistRelationsList.length === 0 && (
                      <div className="text-center py-8 text-slc-muted">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No hay relaciones definidas</p>
                        <p className="text-sm">Selecciona artistas del crew para conectarlos</p>
                      </div>
                    )}
                  </div>

                  {/* Add Relation */}
                  <div className="border-t border-slc-border pt-6">
                    <p className="text-sm text-slc-muted mb-4">Agregar relación con:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto">
                      {allArtists
                        .filter(a => !artistRelationsList.some(r => r.relatedArtistId === a.id))
                        .map((artist) => (
                          <button
                            key={artist.id}
                            type="button"
                            onClick={() => addRelation(artist.id)}
                            className="flex items-center gap-2 px-3 py-2 bg-slc-card hover:bg-slc-card/80 rounded-lg text-sm transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-slc-dark flex-shrink-0">
                              {artist.profileImageUrl ? (
                                <SafeImage
                                  src={artist.profileImageUrl}
                                  alt={artist.name}
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <User className="w-4 h-4 text-slc-muted" />
                                </div>
                              )}
                            </div>
                            <span className="truncate">{artist.name}</span>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Relation Types Legend */}
                  <div className="border-t border-slc-border mt-6 pt-6">
                    <p className="text-sm text-slc-muted mb-3">Tipos de relación:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {relationTypes.map((type) => (
                        <div key={type.value} className="flex items-start gap-2">
                          <span className="font-medium text-white">{type.label}:</span>
                          <span className="text-slc-muted">{type.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Press */}
            {activeTab === "press" && (
              <div className="space-y-6">
                {/* Press Quotes */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
                      <Eye className="w-5 h-5 text-primary" />
                      Citas de Prensa
                    </h2>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setPressQuotes(prev => [...prev, { quote: "", source: "", sourceUrl: "" }])}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Cita
                    </Button>
                  </div>

                  {pressQuotes.length === 0 ? (
                    <div className="text-center py-8 text-slc-muted">
                      <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No hay citas de prensa</p>
                      <p className="text-sm">Agrega citas de medios, críticas y reseñas</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pressQuotes.map((quote, index) => (
                        <div key={index} className="p-4 bg-slc-card border border-slc-border rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-3">
                              <textarea
                                value={quote.quote}
                                onChange={(e) => {
                                  const newQuotes = [...pressQuotes];
                                  newQuotes[index].quote = e.target.value;
                                  setPressQuotes(newQuotes);
                                }}
                                placeholder="Cita o extracto..."
                                rows={3}
                                className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
                              />
                              <div className="grid grid-cols-2 gap-3">
                                <Input
                                  value={quote.source}
                                  onChange={(e) => {
                                    const newQuotes = [...pressQuotes];
                                    newQuotes[index].source = e.target.value;
                                    setPressQuotes(newQuotes);
                                  }}
                                  placeholder="Fuente (ej: Rolling Stone)"
                                />
                                <Input
                                  value={quote.sourceUrl}
                                  onChange={(e) => {
                                    const newQuotes = [...pressQuotes];
                                    newQuotes[index].sourceUrl = e.target.value;
                                    setPressQuotes(newQuotes);
                                  }}
                                  placeholder="URL del artículo"
                                  type="url"
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setPressQuotes(prev => prev.filter((_, i) => i !== index))}
                              className="text-red-500 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Featured Videos */}
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
                      <Youtube className="w-5 h-5 text-red-500" />
                      Videos Destacados
                    </h2>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setFeaturedVideos(prev => [...prev, { videoUrl: "", title: "", platform: "youtube", views: 0, thumbnailUrl: "" }])}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Video
                    </Button>
                  </div>

                  {featuredVideos.length === 0 ? (
                    <div className="text-center py-8 text-slc-muted">
                      <Youtube className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No hay videos destacados</p>
                      <p className="text-sm">Agrega los videos más importantes del artista</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {featuredVideos.map((video, index) => (
                        <div key={index} className="p-4 bg-slc-card border border-slc-border rounded-lg">
                          <div className="flex items-start gap-4">
                            {/* Thumbnail Preview */}
                            <div className="w-32 h-20 rounded overflow-hidden bg-slc-dark flex-shrink-0">
                              {video.thumbnailUrl ? (
                                <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Youtube className="w-8 h-8 text-slc-muted" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <Input
                                  value={video.title}
                                  onChange={(e) => {
                                    const newVideos = [...featuredVideos];
                                    newVideos[index].title = e.target.value;
                                    setFeaturedVideos(newVideos);
                                  }}
                                  placeholder="Título del video"
                                />
                                <Input
                                  value={video.views.toString()}
                                  onChange={(e) => {
                                    const newVideos = [...featuredVideos];
                                    newVideos[index].views = parseInt(e.target.value) || 0;
                                    setFeaturedVideos(newVideos);
                                  }}
                                  placeholder="Vistas"
                                  type="number"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <Input
                                  value={video.videoUrl}
                                  onChange={(e) => {
                                    const newVideos = [...featuredVideos];
                                    newVideos[index].videoUrl = e.target.value;
                                    // Auto-generate thumbnail for YouTube
                                    const ytMatch = e.target.value.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
                                    if (ytMatch) {
                                      newVideos[index].thumbnailUrl = `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
                                    }
                                    setFeaturedVideos(newVideos);
                                  }}
                                  placeholder="URL del video"
                                  type="url"
                                />
                                <select
                                  value={video.platform}
                                  onChange={(e) => {
                                    const newVideos = [...featuredVideos];
                                    newVideos[index].platform = e.target.value;
                                    setFeaturedVideos(newVideos);
                                  }}
                                  className="px-4 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                                >
                                  <option value="youtube">YouTube</option>
                                  <option value="vimeo">Vimeo</option>
                                  <option value="tiktok">TikTok</option>
                                  <option value="instagram">Instagram</option>
                                </select>
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setFeaturedVideos(prev => prev.filter((_, i) => i !== index))}
                              className="text-red-500 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab: Settings */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
                  <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Configuración y Estado
                  </h2>

                  <div className="space-y-4">
                    {/* Status toggles */}
                    <label className="flex items-center gap-3 p-3 bg-slc-card rounded-lg cursor-pointer hover:bg-slc-card/80">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="w-4 h-4 rounded border-slc-border"
                      />
                      <div>
                        <span className="font-medium">Artista Activo</span>
                        <p className="text-xs text-slc-muted">Visible en el sitio público</p>
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
                        <p className="text-xs text-slc-muted">Mostrar en secciones destacadas</p>
                      </div>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                      <div>
                        <label className="block text-sm text-slc-muted mb-2">Estado de Verificación</label>
                        <select
                          value={formData.verificationStatus}
                          onChange={(e) => setFormData(prev => ({ ...prev, verificationStatus: e.target.value }))}
                          className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                        >
                          {verificationStatuses.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-slc-muted mb-2">Orden de Aparición</label>
                        <Input
                          type="number"
                          value={formData.sortOrder}
                          onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                          min="0"
                        />
                        <p className="text-xs text-slc-muted mt-1">Menor número = aparece primero</p>
                      </div>
                    </div>

                    <div className="pt-4">
                      <label className="block text-sm text-slc-muted mb-2">Notas del Admin (privado)</label>
                      <textarea
                        value={formData.adminNotes}
                        onChange={(e) => setFormData(prev => ({ ...prev, adminNotes: e.target.value }))}
                        placeholder="Notas internas sobre el artista..."
                        rows={4}
                        className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview Card */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Vista Previa</h2>

              <div className="bg-slc-card rounded-lg overflow-hidden">
                <div
                  className="h-20"
                  style={{ backgroundColor: formData.tintColor || '#f97316' }}
                />
                <div className="p-4 relative">
                  <div className="absolute -top-10 left-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-slc-card bg-slc-dark">
                      {formData.profileImageUrl ? (
                        <SafeImage
                          src={formData.profileImageUrl}
                          alt={formData.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-8 h-8 text-slc-muted" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-8">
                    <h3 className="font-oswald text-lg">{formData.name || "Nombre del Artista"}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {formData.role.split(",").filter(Boolean).map(roleValue => {
                        const roleConfig = ARTIST_ROLES.find(r => r.value === roleValue);
                        if (!roleConfig) return null;
                        const Icon = roleConfig.icon;
                        return (
                          <span
                            key={roleValue}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleConfig.bgColor} ${roleConfig.color}`}
                          >
                            <Icon className="w-3 h-3" />
                            {roleConfig.shortLabel}
                          </span>
                        );
                      })}
                    </div>
                    {formData.location && (
                      <p className="text-xs text-slc-muted mt-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {formData.location}{formData.country && `, ${formData.country}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Social Profiles Count */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Perfiles Sociales</h2>
              <div className="text-center">
                <div className="font-oswald text-4xl text-primary">{externalProfiles.length}</div>
                <p className="text-sm text-slc-muted">plataformas conectadas</p>
              </div>
              {externalProfiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {externalProfiles.map((profile, i) => {
                    const p = platforms.find(pl => pl.id === profile.platform);
                    return (
                      <span
                        key={i}
                        className="text-lg"
                        title={p?.label}
                      >
                        {p?.icon}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Gallery Count */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Galeria</h2>
              <div className="text-center">
                <div className="font-oswald text-4xl text-cyan-500">{galleryAssets.length}</div>
                <p className="text-sm text-slc-muted">fotos en galeria</p>
              </div>
              {galleryAssets.length > 0 && (
                <div className="grid grid-cols-4 gap-1 mt-4">
                  {galleryAssets.slice(0, 8).map((asset, i) => (
                    <div key={asset.id || i} className="aspect-square rounded overflow-hidden">
                      <SafeImage
                        src={asset.assetUrl}
                        alt=""
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Relations Count */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Relaciones</h2>
              <div className="text-center">
                <div className="font-oswald text-4xl text-indigo-500">{artistRelationsList.length}</div>
                <p className="text-sm text-slc-muted">artistas conectados</p>
              </div>
              {artistRelationsList.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-4 justify-center">
                  {artistRelationsList.slice(0, 6).map((rel, i) => (
                    <div key={rel.id || i} className="w-8 h-8 rounded-full overflow-hidden bg-slc-card">
                      {rel.relatedArtist?.profileImageUrl ? (
                        <SafeImage
                          src={rel.relatedArtist.profileImageUrl}
                          alt={rel.relatedArtist.name}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-4 h-4 text-slc-muted" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
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
                  {mode === "edit" ? "Guardar Cambios" : "Crear Artista"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/admin/artists")}
                >
                  Cancelar
                </Button>
                {mode === "edit" && formData.slug && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    asChild
                  >
                    <Link href={`/artistas/${formData.slug}`} target="_blank">
                      Ver Página Pública
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
