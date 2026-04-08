"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import { DropboxUploadButton } from "@/components/admin/DropboxUploadButton";
import { ImageAnalyzer } from "@/components/admin/ImageAnalyzer";
import { YouTubePreview } from "@/components/admin/YouTubePreview";
import { VideoUploader } from "@/components/admin/VideoUploader";
import {
  ArrowLeft,
  Rocket,
  Save,
  Image as ImageIcon,
  Music,
  Link as LinkIcon,
  Calendar,
  Sparkles,
  Video,
  Palette,
  Smartphone,
  Monitor,
  Play,
} from "lucide-react";

export default function NewUpcomingReleasePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    artistName: "",
    featuredArtists: "",
    releaseType: "single" as "single" | "maxi-single" | "ep" | "album" | "compilation" | "mixtape",
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Error al crear el lanzamiento");
      }

      router.push("/admin/upcoming-releases");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/upcoming-releases">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-oswald text-3xl uppercase flex items-center gap-3">
            <Rocket className="w-8 h-8 text-primary" />
            Nuevo Próximo Lanzamiento
          </h1>
          <p className="text-slc-muted mt-1">
            Crea una página de presave para tu próximo lanzamiento
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-slc-card border border-slc-border rounded-xl p-6">
          <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            Información Básica
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
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

        {/* Visual Assets */}
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
                Se extrae automáticamente de la portada, pero puedes editarlo.
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

        {/* Videos Section - Dedicated for pre-save videos */}
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

        {/* Presave Links */}
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

        {/* Settings */}
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

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Button asChild variant="outline">
            <Link href="/admin/upcoming-releases">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Crear Lanzamiento
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
