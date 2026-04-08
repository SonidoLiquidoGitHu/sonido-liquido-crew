"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import { DropboxUploadButton } from "@/components/admin/DropboxUploadButton";
import { ImageAnalyzer } from "@/components/admin/ImageAnalyzer";
import { YouTubePreview } from "@/components/admin/YouTubePreview";
import { VideoUploader } from "@/components/admin/VideoUploader";
import { VideoGenerator } from "@/components/admin/VideoGenerator";
import { SocialPublisher } from "@/components/admin/SocialPublisher";
import { AudioSnippetUploader } from "@/components/admin/AudioSnippetUploader";
import { SocialCalendar } from "@/components/admin/SocialCalendar";
import { EmailCampaignManager } from "@/components/admin/EmailCampaignManager";
import { PushNotificationManager } from "@/components/admin/PushNotificationManager";
import { ABTestDashboard } from "@/components/admin/ABTestDashboard";
import {
  ArrowLeft,
  Rocket,
  Save,
  Image as ImageIcon,
  Music,
  Link as LinkIcon,
  Sparkles,
  Loader2,
  ExternalLink,
  Eye,
  Users,
  Video,
  Palette,
  Smartphone,
  Monitor,
  Play,
  Wand2,
  Share2,
  Calendar,
  Mail,
  BellRing,
  FlaskConical,
} from "lucide-react";

interface UpcomingRelease {
  id: string;
  title: string;
  slug: string;
  artistName: string;
  featuredArtists?: string | null;
  releaseType: string;
  description?: string | null;
  coverImageUrl?: string | null;
  bannerImageUrl?: string | null;
  backgroundColor?: string;
  releaseDate: string;
  announceDate?: string | null;
  rpmPresaveUrl?: string | null;
  spotifyPresaveUrl?: string | null;
  appleMusicPresaveUrl?: string | null;
  deezerPresaveUrl?: string | null;
  tidalPresaveUrl?: string | null;
  amazonMusicPresaveUrl?: string | null;
  youtubeMusicPresaveUrl?: string | null;
  teaserVideoUrl?: string | null;
  audioPreviewUrl?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  showCountdown: boolean;
  presaveCount: number;
  viewCount: number;
}

function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 16);
}

export default function EditUpcomingReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [release, setRelease] = useState<UpcomingRelease | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "media" | "videos" | "links" | "promo" | "notifications" | "abtesting" | "settings">("info");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    artistName: "",
    featuredArtists: "",
    releaseType: "single" as "single" | "ep" | "album" | "mixtape",
    description: "",
    coverImageUrl: "",
    bannerImageUrl: "",
    backgroundColor: "#000000",
    releaseDate: "",
    announceDate: "",
    rpmPresaveUrl: "",
    spotifyPresaveUrl: "",
    appleMusicPresaveUrl: "",
    deezerPresaveUrl: "",
    tidalPresaveUrl: "",
    amazonMusicPresaveUrl: "",
    youtubeMusicPresaveUrl: "",
    teaserVideoUrl: "",
    verticalVideoUrl: "",
    audioPreviewUrl: "",
    isActive: true,
    isFeatured: false,
    showCountdown: true,
  });

  useEffect(() => {
    fetchRelease();
  }, [resolvedParams.id]);

  async function fetchRelease() {
    try {
      const res = await fetch(`/api/admin/upcoming-releases/${resolvedParams.id}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Error al cargar el lanzamiento");
      }

      const r = data.data;
      setRelease(r);
      setFormData({
        title: r.title || "",
        slug: r.slug || "",
        artistName: r.artistName || "",
        featuredArtists: r.featuredArtists || "",
        releaseType: r.releaseType || "single",
        description: r.description || "",
        coverImageUrl: r.coverImageUrl || "",
        bannerImageUrl: r.bannerImageUrl || "",
        backgroundColor: r.backgroundColor || "#000000",
        releaseDate: formatDateForInput(r.releaseDate),
        announceDate: formatDateForInput(r.announceDate),
        rpmPresaveUrl: r.rpmPresaveUrl || "",
        spotifyPresaveUrl: r.spotifyPresaveUrl || "",
        appleMusicPresaveUrl: r.appleMusicPresaveUrl || "",
        deezerPresaveUrl: r.deezerPresaveUrl || "",
        tidalPresaveUrl: r.tidalPresaveUrl || "",
        amazonMusicPresaveUrl: r.amazonMusicPresaveUrl || "",
        youtubeMusicPresaveUrl: r.youtubeMusicPresaveUrl || "",
        teaserVideoUrl: r.teaserVideoUrl || "",
        verticalVideoUrl: r.verticalVideoUrl || "",
        audioPreviewUrl: r.audioPreviewUrl || "",
        isActive: r.isActive ?? true,
        isFeatured: r.isFeatured ?? false,
        showCountdown: r.showCountdown ?? true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/admin/upcoming-releases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resolvedParams.id,
          ...formData,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Error al actualizar el lanzamiento");
      }

      router.push("/admin/upcoming-releases");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!release) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
          <h2 className="font-oswald text-2xl mb-2">Lanzamiento no encontrado</h2>
          <p className="text-slc-muted mb-4">{error || "El lanzamiento que buscas no existe."}</p>
          <Button asChild>
            <Link href="/admin/upcoming-releases">Volver</Link>
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
            <Link href="/admin/upcoming-releases">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-oswald text-3xl uppercase flex items-center gap-3">
              <Rocket className="w-8 h-8 text-primary" />
              Editar: {release.title}
            </h1>
            <p className="text-slc-muted mt-1">
              /{release.slug}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-slc-card border border-slc-border rounded-lg">
            <Users className="w-4 h-4 text-primary" />
            <span className="font-medium">{release.presaveCount}</span>
            <span className="text-slc-muted text-sm">presaves</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slc-card border border-slc-border rounded-lg">
            <Eye className="w-4 h-4 text-purple-500" />
            <span className="font-medium">{release.viewCount}</span>
            <span className="text-slc-muted text-sm">vistas</span>
          </div>
          <Button asChild variant="outline">
            <Link href={`/proximos/${release.slug}`} target="_blank">
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver página
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {[
          { id: "info", label: "Información", icon: Music },
          { id: "media", label: "Diseño", icon: ImageIcon },
          { id: "videos", label: "Videos", icon: Video },
          { id: "links", label: "Links", icon: LinkIcon },
          { id: "promo", label: "Promoción", icon: Wand2 },
          { id: "notifications", label: "Notificaciones", icon: BellRing },
          { id: "abtesting", label: "A/B Testing", icon: FlaskConical },
          { id: "settings", label: "Config", icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
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

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info Tab */}
        {activeTab === "info" && (
        <section className="bg-slc-card border border-slc-border rounded-xl p-6">
          <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            Información Básica
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">
                Título del Lanzamiento *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Ej: Nuevo Single"
                className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Slug (URL)
              </label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="nuevo-single"
                className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Artista Principal *
              </label>
              <input
                type="text"
                name="artistName"
                value={formData.artistName}
                onChange={handleChange}
                required
                placeholder="Ej: Dilema"
                className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Artistas Feat. (separados por coma)
              </label>
              <input
                type="text"
                name="featuredArtists"
                value={formData.featuredArtists}
                onChange={handleChange}
                placeholder="Ej: Zaque, MC Luka"
                className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Tipo de Lanzamiento *
              </label>
              <select
                name="releaseType"
                value={formData.releaseType}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="single">Single</option>
                <option value="maxi-single">Maxi-Single</option>
                <option value="ep">EP</option>
                <option value="album">Álbum</option>
                <option value="compilation">Compilación</option>
                <option value="mixtape">Mixtape</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Fecha de Lanzamiento *
              </label>
              <input
                type="datetime-local"
                name="releaseDate"
                value={formData.releaseDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Descripción
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="Descripción del lanzamiento..."
                className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
              />
            </div>
          </div>
        </section>
        )}

        {/* Visual Assets Tab */}
        {activeTab === "media" && (
        <section className="bg-slc-card border border-slc-border rounded-xl p-6">
          <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Diseño Visual
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">
                URL de la Portada
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  name="coverImageUrl"
                  value={formData.coverImageUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="flex-1 px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                />
                <DropboxUploadButton
                  onUploadComplete={(url) =>
                    setFormData((prev) => ({ ...prev, coverImageUrl: url }))
                  }
                  accept="image/*"
                  maxSize={10}
                  folder="/upcoming-releases/covers"
                  buttonText="Subir"
                />
              </div>
              {formData.coverImageUrl && (
                <div className="mt-3">
                  <SafeImage
                    src={formData.coverImageUrl}
                    alt="Preview"
                    width={100}
                    height={100}
                    className="rounded-lg object-cover"
                    unoptimized
                  />
                </div>
              )}
              {/* Image analyzer for cover - auto extracts color palette */}
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
                  // Auto-fill background color from cover
                  setFormData((prev) => ({ ...prev, backgroundColor: color }));
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                URL del Banner
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  name="bannerImageUrl"
                  value={formData.bannerImageUrl}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="flex-1 px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                />
                <DropboxUploadButton
                  onUploadComplete={(url) =>
                    setFormData((prev) => ({ ...prev, bannerImageUrl: url }))
                  }
                  accept="image/*"
                  maxSize={10}
                  folder="/upcoming-releases/banners"
                  buttonText="Subir"
                />
              </div>
              {formData.bannerImageUrl && (
                <div className="mt-3">
                  <SafeImage
                    src={formData.bannerImageUrl}
                    alt="Banner Preview"
                    width={200}
                    height={100}
                    className="rounded-lg object-cover"
                    unoptimized
                  />
                </div>
              )}
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                Color de Fondo
              </label>
              <p className="text-xs text-slc-muted mb-2">
                Se extrae automáticamente de la portada, pero puedes editarlo manualmente.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="backgroundColor"
                  value={formData.backgroundColor}
                  onChange={handleChange}
                  className="w-12 h-12 rounded-lg border border-slc-border cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.backgroundColor}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      backgroundColor: e.target.value,
                    }))
                  }
                  className="flex-1 px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                />
                {/* Color preview */}
                <div
                  className="w-12 h-12 rounded-lg border border-slc-border"
                  style={{ backgroundColor: formData.backgroundColor }}
                />
              </div>
            </div>

          </div>
        </section>
        )}

        {/* Videos Tab */}
        {activeTab === "videos" && (
        <section className="bg-slc-card border border-slc-border rounded-xl p-6">
          <h2 className="font-oswald text-xl uppercase mb-2 flex items-center gap-2">
            <Video className="w-5 h-5 text-red-500" />
            Videos de Pre-save
          </h2>
          <p className="text-sm text-slc-muted mb-6">
            Agrega videos para promocionar el lanzamiento. Puedes usar YouTube, Instagram, TikTok o subir directamente.
          </p>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Horizontal Video (YouTube/Web) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Monitor className="w-5 h-5 text-blue-500" />
                <h3 className="font-oswald text-lg uppercase">Video Horizontal</h3>
              </div>
              <p className="text-xs text-slc-muted">
                Para YouTube y sitio web. Formato 16:9 recomendado.
              </p>

              <VideoUploader
                value={formData.teaserVideoUrl ? {
                  source: "youtube",
                  url: formData.teaserVideoUrl,
                  orientation: "horizontal",
                  thumbnailUrl: formData.teaserVideoUrl.includes("youtube") || formData.teaserVideoUrl.match(/^[a-zA-Z0-9_-]{11}$/)
                    ? `https://img.youtube.com/vi/${formData.teaserVideoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|^)([a-zA-Z0-9_-]{11})/)?.[1] || formData.teaserVideoUrl}/hqdefault.jpg`
                    : undefined,
                  platform: "YouTube",
                  embedUrl: formData.teaserVideoUrl.includes("youtube") || formData.teaserVideoUrl.match(/^[a-zA-Z0-9_-]{11}$/)
                    ? `https://www.youtube.com/embed/${formData.teaserVideoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|^)([a-zA-Z0-9_-]{11})/)?.[1] || formData.teaserVideoUrl}`
                    : undefined,
                } : null}
                onChange={(video) => {
                  setFormData(prev => ({
                    ...prev,
                    teaserVideoUrl: video?.url || ""
                  }));
                }}
                label="Video Teaser Horizontal"
                description="Ideal para YouTube, embeds en web, y promoción general."
                orientation="horizontal"
                folder="/upcoming-releases/videos"
              />
            </div>

            {/* Vertical Video (Reels/Stories/TikTok) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-5 h-5 text-pink-500" />
                <h3 className="font-oswald text-lg uppercase">Video Vertical</h3>
              </div>
              <p className="text-xs text-slc-muted">
                Para Instagram Reels, TikTok y Stories. Formato 9:16 recomendado.
              </p>

              <VideoUploader
                value={formData.verticalVideoUrl ? {
                  source: formData.verticalVideoUrl.includes("instagram") ? "social" :
                          formData.verticalVideoUrl.includes("tiktok") ? "social" : "upload",
                  url: formData.verticalVideoUrl,
                  orientation: "vertical",
                  platform: formData.verticalVideoUrl.includes("instagram") ? "Instagram" :
                            formData.verticalVideoUrl.includes("tiktok") ? "TikTok" : "Video",
                } : null}
                onChange={(video) => {
                  setFormData(prev => ({
                    ...prev,
                    verticalVideoUrl: video?.url || ""
                  }));
                }}
                label="Video Vertical (Reels/TikTok)"
                description="Para redes sociales móviles y stories."
                orientation="vertical"
                folder="/upcoming-releases/videos-vertical"
              />
            </div>
          </div>

          {/* Quick tips */}
          <div className="mt-6 p-4 bg-slc-dark rounded-lg border border-slc-border">
            <h4 className="font-oswald text-sm uppercase mb-2 flex items-center gap-2">
              <Play className="w-4 h-4 text-primary" />
              Tips para videos de pre-save
            </h4>
            <ul className="text-xs text-slc-muted space-y-1">
              <li>• <strong>Duración ideal:</strong> 15-30 segundos para máximo engagement</li>
              <li>• <strong>Incluye:</strong> Fecha de lanzamiento, nombre del artista, call-to-action de pre-save</li>
              <li>• <strong>Vertical:</strong> Graba directo en tu celular para mejor calidad en Stories</li>
              <li>• <strong>Horizontal:</strong> Usa el arte de portada como fondo si no tienes video</li>
            </ul>
          </div>
        </section>
        )}

        {/* Links Tab */}
        {activeTab === "links" && (
        <section className="bg-slc-card border border-slc-border rounded-xl p-6">
          <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" />
            Links de Presave
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-2">
                RPM Presave URL (Principal)
              </label>
              <input
                type="url"
                name="rpmPresaveUrl"
                value={formData.rpmPresaveUrl}
                onChange={handleChange}
                placeholder="https://rpm.link/..."
                className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
              />
              <p className="text-xs text-slc-muted mt-1">
                Link principal de presave (RPM, ToneDen, etc.)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Spotify Presave URL
              </label>
              <input
                type="url"
                name="spotifyPresaveUrl"
                value={formData.spotifyPresaveUrl}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Apple Music Presave URL
              </label>
              <input
                type="url"
                name="appleMusicPresaveUrl"
                value={formData.appleMusicPresaveUrl}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Deezer Presave URL
              </label>
              <input
                type="url"
                name="deezerPresaveUrl"
                value={formData.deezerPresaveUrl}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Tidal Presave URL
              </label>
              <input
                type="url"
                name="tidalPresaveUrl"
                value={formData.tidalPresaveUrl}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Amazon Music Presave URL
              </label>
              <input
                type="url"
                name="amazonMusicPresaveUrl"
                value={formData.amazonMusicPresaveUrl}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                YouTube Music Presave URL
              </label>
              <input
                type="url"
                name="youtubeMusicPresaveUrl"
                value={formData.youtubeMusicPresaveUrl}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </section>
        )}

        {/* Promo Tab - Full Promotional Tools */}
        {activeTab === "promo" && (
        <>
          {/* Audio Snippet Uploader */}
          <section className="bg-slc-card border border-slc-border rounded-xl p-6">
            <AudioSnippetUploader
              value={formData.audioPreviewUrl || null}
              onChange={(url, duration) => {
                setFormData(prev => ({ ...prev, audioPreviewUrl: url || "" }));
              }}
              maxDuration={30}
              maxSize={50}
              folder="/upcoming-releases/audio"
              label="Audio Preview para Pre-save"
              description="Sube un snippet de 15-30 segundos para la página de pre-save y generación de videos."
              showWaveform={true}
            />
          </section>

          {/* Video Generator */}
          <section className="bg-slc-card border border-slc-border rounded-xl p-6">
            {formData.coverImageUrl ? (
              <VideoGenerator
                coverImageUrl={formData.coverImageUrl}
                audioUrl={formData.audioPreviewUrl || undefined}
                artistName={formData.artistName}
                title={formData.title}
                releaseDate={formData.releaseDate ? new Date(formData.releaseDate) : undefined}
                backgroundColor={formData.backgroundColor}
                onVideoGenerated={(blob, orientation) => {
                  console.log(`Video generated: ${orientation}, size: ${blob.size} bytes`);
                }}
              />
            ) : (
              <div className="text-center py-12">
                <Wand2 className="w-12 h-12 mx-auto mb-4 text-slc-muted opacity-50" />
                <h3 className="font-oswald text-lg uppercase mb-2">Generador de Video</h3>
                <p className="text-sm text-slc-muted mb-4">
                  Primero sube una portada en la pestaña "Diseño" para generar videos automáticamente.
                </p>
                <Button variant="outline" onClick={() => setActiveTab("media")}>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Ir a Diseño
                </Button>
              </div>
            )}
          </section>

          {/* Social Publisher */}
          <section className="bg-slc-card border border-slc-border rounded-xl p-6">
            <SocialPublisher
              releaseTitle={formData.title}
              artistName={formData.artistName}
              releaseDate={formData.releaseDate ? new Date(formData.releaseDate) : undefined}
              presaveUrl={formData.rpmPresaveUrl || formData.spotifyPresaveUrl}
              coverImageUrl={formData.coverImageUrl || undefined}
              videoUrl={formData.teaserVideoUrl || undefined}
              verticalVideoUrl={formData.verticalVideoUrl || undefined}
              audioPreviewUrl={formData.audioPreviewUrl || undefined}
              hashtags={["presave", "nuevamusica", "musica", "hiphop", "rap"]}
            />
          </section>

          {/* Social Calendar */}
          <section className="bg-slc-card border border-slc-border rounded-xl p-6">
            <SocialCalendar
              releaseTitle={formData.title}
              releaseDate={formData.releaseDate ? new Date(formData.releaseDate) : new Date()}
              presaveUrl={formData.rpmPresaveUrl || formData.spotifyPresaveUrl}
              coverImageUrl={formData.coverImageUrl || undefined}
              onPostsChange={(posts) => {
                console.log("Calendar posts updated:", posts.length);
              }}
            />
          </section>

          {/* Email Campaign Manager */}
          <section className="bg-slc-card border border-slc-border rounded-xl p-6">
            <EmailCampaignManager
              releaseTitle={formData.title}
              artistName={formData.artistName}
              releaseDate={formData.releaseDate ? new Date(formData.releaseDate) : new Date()}
              presaveUrl={formData.rpmPresaveUrl || formData.spotifyPresaveUrl}
              coverImageUrl={formData.coverImageUrl || undefined}
              subscriberCount={1250}
              onSendEmail={(template) => {
                console.log("Send email:", template.name);
                alert(`Email "${template.name}" enviado a suscriptores (simulación)`);
              }}
            />
          </section>
        </>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <section className="bg-slc-card border border-slc-border rounded-xl p-6">
            <PushNotificationManager
              releaseTitle={formData.title}
              releaseSlug={formData.slug}
              releaseDate={formData.releaseDate ? new Date(formData.releaseDate) : undefined}
              coverImageUrl={formData.coverImageUrl || undefined}
            />
          </section>
        )}

        {/* A/B Testing Tab */}
        {activeTab === "abtesting" && (
          <section className="bg-slc-card border border-slc-border rounded-xl p-6">
            <ABTestDashboard />
          </section>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
        <section className="bg-slc-card border border-slc-border rounded-xl p-6">
          <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Configuración
          </h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-5 h-5 rounded border-slc-border bg-slc-dark text-primary focus:ring-primary"
              />
              <div>
                <span className="font-medium">Activo</span>
                <p className="text-sm text-slc-muted">
                  Mostrar la página de presave públicamente
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isFeatured"
                checked={formData.isFeatured}
                onChange={handleChange}
                className="w-5 h-5 rounded border-slc-border bg-slc-dark text-primary focus:ring-primary"
              />
              <div>
                <span className="font-medium">Destacado</span>
                <p className="text-sm text-slc-muted">
                  Mostrar en la página principal y banners
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="showCountdown"
                checked={formData.showCountdown}
                onChange={handleChange}
                className="w-5 h-5 rounded border-slc-border bg-slc-dark text-primary focus:ring-primary"
              />
              <div>
                <span className="font-medium">Mostrar Countdown</span>
                <p className="text-sm text-slc-muted">
                  Mostrar cuenta regresiva hasta la fecha de lanzamiento
                </p>
              </div>
            </label>
          </div>
        </section>
        )}

        {/* Submit - Always visible */}
        <div className="flex items-center justify-end gap-4">
          <Button asChild variant="outline">
            <Link href="/admin/upcoming-releases">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
