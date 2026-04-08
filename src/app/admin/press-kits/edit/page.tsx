"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Save,
  FileText,
  Image as ImageIcon,
  Users,
  Mail,
  Share2,
  Quote,
  Video,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  FileDown,
} from "lucide-react";

interface KeyPoint {
  icon: string;
  title: string;
  description: string;
}

interface DownloadItem {
  name: string;
  url: string;
  description: string;
}

interface PressQuote {
  quote: string;
  source: string;
  url: string;
}

interface PressKitData {
  heroTitle: string;
  heroSubtitle: string;
  heroTagline: string;
  heroCoverImageUrl: string;
  heroBannerImageUrl: string;
  statsArtists: string;
  statsReleases: string;
  statsYears: string;
  aboutTitle: string;
  aboutContent: string;
  keyPoints: KeyPoint[];
  contactEmail: string;
  contactPhone: string;
  contactLocation: string;
  spotifyUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  twitterUrl: string;
  facebookUrl: string;
  downloads: DownloadItem[];
  pressQuotes: PressQuote[];
  featuredVideoUrl: string;
  featuredVideoTitle: string;
  footerCtaTitle: string;
  footerCtaButtonText: string;
  metaTitle: string;
  metaDescription: string;
}

const defaultData: PressKitData = {
  heroTitle: "Sonido Líquido Crew",
  heroSubtitle: "El colectivo de Hip Hop más representativo de México",
  heroTagline: "Fundado en 1999 en la Ciudad de México.",
  heroCoverImageUrl: "",
  heroBannerImageUrl: "",
  statsArtists: "20+",
  statsReleases: "160+",
  statsYears: "25+",
  aboutTitle: "Sobre Nosotros",
  aboutContent: "",
  keyPoints: [
    { icon: "calendar", title: "Fundado en 1999", description: "Más de 25 años de historia en el Hip Hop mexicano" },
    { icon: "disc", title: "160+ Lanzamientos", description: "Catálogo extenso de música original" },
    { icon: "users", title: "20+ Artistas", description: "Roster activo de talento mexicano" },
  ],
  contactEmail: "prensasonidoliquido@gmail.com",
  contactPhone: "+52 55 2801 1881",
  contactLocation: "Ciudad de México, CDMX",
  spotifyUrl: "",
  instagramUrl: "",
  youtubeUrl: "",
  twitterUrl: "",
  facebookUrl: "",
  downloads: [],
  pressQuotes: [],
  featuredVideoUrl: "",
  featuredVideoTitle: "",
  footerCtaTitle: "¿Listo para colaborar?",
  footerCtaButtonText: "Enviar Mensaje",
  metaTitle: "Press Kit | Sonido Líquido Crew",
  metaDescription: "Kit de prensa oficial de Sonido Líquido Crew.",
};

export default function EditPressKitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("hero");
  const [data, setData] = useState<PressKitData>(defaultData);

  useEffect(() => {
    fetchPressKit();
  }, []);

  async function fetchPressKit() {
    try {
      const res = await fetch("/api/admin/press-kit");
      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        setData({
          heroTitle: d.heroTitle || defaultData.heroTitle,
          heroSubtitle: d.heroSubtitle || defaultData.heroSubtitle,
          heroTagline: d.heroTagline || defaultData.heroTagline,
          heroCoverImageUrl: d.heroCoverImageUrl || "",
          heroBannerImageUrl: d.heroBannerImageUrl || "",
          statsArtists: d.statsArtists || defaultData.statsArtists,
          statsReleases: d.statsReleases || defaultData.statsReleases,
          statsYears: d.statsYears || defaultData.statsYears,
          aboutTitle: d.aboutTitle || defaultData.aboutTitle,
          aboutContent: d.aboutContent || "",
          keyPoints: parseJson(d.keyPoints, defaultData.keyPoints),
          contactEmail: d.contactEmail || defaultData.contactEmail,
          contactPhone: d.contactPhone || defaultData.contactPhone,
          contactLocation: d.contactLocation || defaultData.contactLocation,
          spotifyUrl: d.spotifyUrl || "",
          instagramUrl: d.instagramUrl || "",
          youtubeUrl: d.youtubeUrl || "",
          twitterUrl: d.twitterUrl || "",
          facebookUrl: d.facebookUrl || "",
          downloads: parseJson(d.downloads, []),
          pressQuotes: parseJson(d.pressQuotes, []),
          featuredVideoUrl: d.featuredVideoUrl || "",
          featuredVideoTitle: d.featuredVideoTitle || "",
          footerCtaTitle: d.footerCtaTitle || defaultData.footerCtaTitle,
          footerCtaButtonText: d.footerCtaButtonText || defaultData.footerCtaButtonText,
          metaTitle: d.metaTitle || defaultData.metaTitle,
          metaDescription: d.metaDescription || defaultData.metaDescription,
        });
      }
    } catch (err) {
      console.error("Error fetching press kit:", err);
    } finally {
      setLoading(false);
    }
  }

  function parseJson<T>(value: string | T | null | undefined, defaultValue: T): T {
    if (!value) return defaultValue;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }
    return value as T;
  }

  function handleChange(field: keyof PressKitData, value: string | KeyPoint[] | DownloadItem[] | PressQuote[]) {
    setData((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/admin/press-kit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || "Error al guardar");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  async function handleGeneratePdf() {
    setGeneratingPdf(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/press-kit/generate-pdf");

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al generar PDF");
      }

      // Get the filename from Content-Disposition header
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = "press-kit.pdf";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Download the PDF
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar PDF");
    } finally {
      setGeneratingPdf(false);
    }
  }

  // Key Points handlers
  function addKeyPoint() {
    handleChange("keyPoints", [...data.keyPoints, { icon: "star", title: "", description: "" }]);
  }

  function updateKeyPoint(index: number, field: keyof KeyPoint, value: string) {
    const updated = [...data.keyPoints];
    updated[index] = { ...updated[index], [field]: value };
    handleChange("keyPoints", updated);
  }

  function removeKeyPoint(index: number) {
    handleChange("keyPoints", data.keyPoints.filter((_, i) => i !== index));
  }

  // Downloads handlers
  function addDownload() {
    handleChange("downloads", [...data.downloads, { name: "", url: "", description: "" }]);
  }

  function updateDownload(index: number, field: keyof DownloadItem, value: string) {
    const updated = [...data.downloads];
    updated[index] = { ...updated[index], [field]: value };
    handleChange("downloads", updated);
  }

  function removeDownload(index: number) {
    handleChange("downloads", data.downloads.filter((_, i) => i !== index));
  }

  // Press Quotes handlers
  function addQuote() {
    handleChange("pressQuotes", [...data.pressQuotes, { quote: "", source: "", url: "" }]);
  }

  function updateQuote(index: number, field: keyof PressQuote, value: string) {
    const updated = [...data.pressQuotes];
    updated[index] = { ...updated[index], [field]: value };
    handleChange("pressQuotes", updated);
  }

  function removeQuote(index: number) {
    handleChange("pressQuotes", data.pressQuotes.filter((_, i) => i !== index));
  }

  const tabs = [
    { id: "hero", label: "Portada", icon: ImageIcon },
    { id: "about", label: "Sobre Nosotros", icon: FileText },
    { id: "contact", label: "Contacto", icon: Mail },
    { id: "social", label: "Redes Sociales", icon: Share2 },
    { id: "quotes", label: "Citas de Prensa", icon: Quote },
    { id: "downloads", label: "Descargas", icon: Download },
    { id: "video", label: "Video", icon: Video },
  ];

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/press-kits">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-oswald text-3xl uppercase">Editar Press Kit</h1>
            <p className="text-slc-muted mt-1">
              Personaliza el contenido de la página de prensa
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleGeneratePdf}
            disabled={generatingPdf || loading}
          >
            {generatingPdf ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 mr-2" />
                Descargar PDF
              </>
            )}
          </Button>
          <Button asChild variant="outline">
            <Link href="/prensa" target="_blank">
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver Página
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
          Press Kit guardado correctamente
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 p-2 bg-slc-card border border-slc-border rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "text-slc-muted hover:text-white hover:bg-slc-dark"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-slc-card border border-slc-border rounded-xl p-6">
          {/* Hero Tab */}
          {activeTab === "hero" && (
            <div className="space-y-6">
              <h2 className="font-oswald text-xl uppercase mb-4">Sección de Portada</h2>

              {/* Cover Image */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Imagen de Portada (Cuadrada)
                  </label>
                  <input
                    type="url"
                    value={data.heroCoverImageUrl}
                    onChange={(e) => handleChange("heroCoverImageUrl", e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  />
                  {data.heroCoverImageUrl && (
                    <div className="mt-3">
                      <SafeImage
                        src={data.heroCoverImageUrl}
                        alt="Cover preview"
                        width={120}
                        height={120}
                        className="rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Imagen de Banner (Rectangular)
                  </label>
                  <input
                    type="url"
                    value={data.heroBannerImageUrl}
                    onChange={(e) => handleChange("heroBannerImageUrl", e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  />
                  {data.heroBannerImageUrl && (
                    <div className="mt-3">
                      <SafeImage
                        src={data.heroBannerImageUrl}
                        alt="Banner preview"
                        width={200}
                        height={100}
                        className="rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Título Principal</label>
                <input
                  type="text"
                  value={data.heroTitle}
                  onChange={(e) => handleChange("heroTitle", e.target.value)}
                  className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Subtítulo</label>
                <input
                  type="text"
                  value={data.heroSubtitle}
                  onChange={(e) => handleChange("heroSubtitle", e.target.value)}
                  className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tagline</label>
                <input
                  type="text"
                  value={data.heroTagline}
                  onChange={(e) => handleChange("heroTagline", e.target.value)}
                  className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* Stats */}
              <div className="pt-6 border-t border-slc-border">
                <h3 className="font-medium mb-4">Estadísticas</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm text-slc-muted mb-1">Artistas</label>
                    <input
                      type="text"
                      value={data.statsArtists}
                      onChange={(e) => handleChange("statsArtists", e.target.value)}
                      className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slc-muted mb-1">Lanzamientos</label>
                    <input
                      type="text"
                      value={data.statsReleases}
                      onChange={(e) => handleChange("statsReleases", e.target.value)}
                      className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slc-muted mb-1">Años</label>
                    <input
                      type="text"
                      value={data.statsYears}
                      onChange={(e) => handleChange("statsYears", e.target.value)}
                      className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* About Tab */}
          {activeTab === "about" && (
            <div className="space-y-6">
              <h2 className="font-oswald text-xl uppercase mb-4">Sección Sobre Nosotros</h2>

              <div>
                <label className="block text-sm font-medium mb-2">Título de la Sección</label>
                <input
                  type="text"
                  value={data.aboutTitle}
                  onChange={(e) => handleChange("aboutTitle", e.target.value)}
                  className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Contenido (soporta Markdown)
                </label>
                <textarea
                  value={data.aboutContent}
                  onChange={(e) => handleChange("aboutContent", e.target.value)}
                  rows={10}
                  placeholder="**Texto en negrita** para resaltar..."
                  className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none font-mono text-sm"
                />
              </div>

              {/* Key Points */}
              <div className="pt-6 border-t border-slc-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Puntos Clave</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addKeyPoint}>
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar
                  </Button>
                </div>

                <div className="space-y-4">
                  {data.keyPoints.map((point, index) => (
                    <div key={index} className="p-4 bg-slc-dark rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 grid gap-3 sm:grid-cols-3">
                          <input
                            type="text"
                            value={point.icon}
                            onChange={(e) => updateKeyPoint(index, "icon", e.target.value)}
                            placeholder="Icono (calendar, disc, users)"
                            className="px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm"
                          />
                          <input
                            type="text"
                            value={point.title}
                            onChange={(e) => updateKeyPoint(index, "title", e.target.value)}
                            placeholder="Título"
                            className="px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm"
                          />
                          <input
                            type="text"
                            value={point.description}
                            onChange={(e) => updateKeyPoint(index, "description", e.target.value)}
                            placeholder="Descripción"
                            className="px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-400"
                          onClick={() => removeKeyPoint(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === "contact" && (
            <div className="space-y-6">
              <h2 className="font-oswald text-xl uppercase mb-4">Información de Contacto</h2>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">Email de Prensa</label>
                  <input
                    type="email"
                    value={data.contactEmail}
                    onChange={(e) => handleChange("contactEmail", e.target.value)}
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Teléfono</label>
                  <input
                    type="text"
                    value={data.contactPhone}
                    onChange={(e) => handleChange("contactPhone", e.target.value)}
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ubicación</label>
                <input
                  type="text"
                  value={data.contactLocation}
                  onChange={(e) => handleChange("contactLocation", e.target.value)}
                  className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* Footer CTA */}
              <div className="pt-6 border-t border-slc-border">
                <h3 className="font-medium mb-4">Llamada a la Acción (Footer)</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm text-slc-muted mb-1">Título CTA</label>
                    <input
                      type="text"
                      value={data.footerCtaTitle}
                      onChange={(e) => handleChange("footerCtaTitle", e.target.value)}
                      className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slc-muted mb-1">Texto del Botón</label>
                    <input
                      type="text"
                      value={data.footerCtaButtonText}
                      onChange={(e) => handleChange("footerCtaButtonText", e.target.value)}
                      className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Social Tab */}
          {activeTab === "social" && (
            <div className="space-y-6">
              <h2 className="font-oswald text-xl uppercase mb-4">Redes Sociales</h2>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">Spotify URL</label>
                  <input
                    type="url"
                    value={data.spotifyUrl}
                    onChange={(e) => handleChange("spotifyUrl", e.target.value)}
                    placeholder="https://open.spotify.com/..."
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Instagram URL</label>
                  <input
                    type="url"
                    value={data.instagramUrl}
                    onChange={(e) => handleChange("instagramUrl", e.target.value)}
                    placeholder="https://instagram.com/..."
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">YouTube URL</label>
                  <input
                    type="url"
                    value={data.youtubeUrl}
                    onChange={(e) => handleChange("youtubeUrl", e.target.value)}
                    placeholder="https://youtube.com/..."
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Twitter/X URL</label>
                  <input
                    type="url"
                    value={data.twitterUrl}
                    onChange={(e) => handleChange("twitterUrl", e.target.value)}
                    placeholder="https://twitter.com/..."
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Facebook URL</label>
                  <input
                    type="url"
                    value={data.facebookUrl}
                    onChange={(e) => handleChange("facebookUrl", e.target.value)}
                    placeholder="https://facebook.com/..."
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quotes Tab */}
          {activeTab === "quotes" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-oswald text-xl uppercase">Citas de Prensa</h2>
                <Button type="button" variant="outline" size="sm" onClick={addQuote}>
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar Cita
                </Button>
              </div>

              {data.pressQuotes.length === 0 ? (
                <div className="text-center py-12 text-slc-muted">
                  <Quote className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay citas de prensa. Agrega algunas para mostrar en la página.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.pressQuotes.map((quote, index) => (
                    <div key={index} className="p-4 bg-slc-dark rounded-lg">
                      <div className="flex items-start gap-4">
                        <Quote className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1 space-y-3">
                          <textarea
                            value={quote.quote}
                            onChange={(e) => updateQuote(index, "quote", e.target.value)}
                            placeholder="La cita textual..."
                            rows={3}
                            className="w-full px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm resize-none"
                          />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <input
                              type="text"
                              value={quote.source}
                              onChange={(e) => updateQuote(index, "source", e.target.value)}
                              placeholder="Fuente (ej: Rolling Stone)"
                              className="px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm"
                            />
                            <input
                              type="url"
                              value={quote.url}
                              onChange={(e) => updateQuote(index, "url", e.target.value)}
                              placeholder="URL de la fuente (opcional)"
                              className="px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm"
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-400"
                          onClick={() => removeQuote(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Downloads Tab */}
          {activeTab === "downloads" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-oswald text-xl uppercase">Archivos para Descargar</h2>
                <Button type="button" variant="outline" size="sm" onClick={addDownload}>
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar Archivo
                </Button>
              </div>

              {data.downloads.length === 0 ? (
                <div className="text-center py-12 text-slc-muted">
                  <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay archivos para descargar. Agrega logos, fotos, etc.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.downloads.map((download, index) => (
                    <div key={index} className="p-4 bg-slc-dark rounded-lg">
                      <div className="flex items-start gap-4">
                        <Download className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1 grid gap-3 sm:grid-cols-3">
                          <input
                            type="text"
                            value={download.name}
                            onChange={(e) => updateDownload(index, "name", e.target.value)}
                            placeholder="Nombre del archivo"
                            className="px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm"
                          />
                          <input
                            type="url"
                            value={download.url}
                            onChange={(e) => updateDownload(index, "url", e.target.value)}
                            placeholder="URL de descarga"
                            className="px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm"
                          />
                          <input
                            type="text"
                            value={download.description}
                            onChange={(e) => updateDownload(index, "description", e.target.value)}
                            placeholder="Descripción"
                            className="px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-400"
                          onClick={() => removeDownload(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Video Tab */}
          {activeTab === "video" && (
            <div className="space-y-6">
              <h2 className="font-oswald text-xl uppercase mb-4">Video Destacado</h2>

              <div>
                <label className="block text-sm font-medium mb-2">URL del Video (YouTube)</label>
                <input
                  type="url"
                  value={data.featuredVideoUrl}
                  onChange={(e) => handleChange("featuredVideoUrl", e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Título del Video</label>
                <input
                  type="text"
                  value={data.featuredVideoTitle}
                  onChange={(e) => handleChange("featuredVideoTitle", e.target.value)}
                  placeholder="Nombre del video"
                  className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* SEO */}
              <div className="pt-6 border-t border-slc-border">
                <h3 className="font-medium mb-4">SEO</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slc-muted mb-1">Meta Title</label>
                    <input
                      type="text"
                      value={data.metaTitle}
                      onChange={(e) => handleChange("metaTitle", e.target.value)}
                      className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slc-muted mb-1">Meta Description</label>
                    <textarea
                      value={data.metaDescription}
                      onChange={(e) => handleChange("metaDescription", e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4 mt-6">
          <Button asChild variant="outline">
            <Link href="/admin/press-kits">Cancelar</Link>
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
