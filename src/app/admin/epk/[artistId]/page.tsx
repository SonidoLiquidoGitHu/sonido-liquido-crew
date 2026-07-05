"use client";

import { DropboxUploadButton } from "@/components/admin/DropboxUploadButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BarChart3,
  Building,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  GripVertical,
  Image as ImageIcon,
  Instagram,
  ListMusic,
  Loader2,
  Mail,
  MapPin,
  Mic,
  Music,
  Newspaper,
  Palette,
  Phone,
  Play,
  Plus,
  Quote,
  Save,
  Settings,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Twitter,
  Type,
  User,
  Users,
  Video,
  Wrench,
  Youtube,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";

interface Artist {
  id: string;
  name: string;
  slug: string;
  role: string;
  bio?: string;
  shortBio?: string;
  profileImageUrl?: string;
  location?: string;
  bookingEmail?: string;
}

interface EpkData {
  id?: string;
  artistId: string;

  // Identity
  tagline?: string;
  genreSpecific?: string;
  subgenres?: string[];
  artistType?: string;

  // Bios
  bioShort?: string;
  bioLong?: string;
  bioPress?: string;
  storyHighlights?: string[];

  // Visual Identity
  logoUrl?: string;
  logoTransparentUrl?: string;
  logoWhiteUrl?: string;
  logoBlackUrl?: string;
  brandColors?: string[];
  brandFont?: string;

  // Streaming Stats
  spotifyMonthlyListeners?: number;
  spotifyFollowers?: number;
  spotifyTopTrack?: { name: string; streams: number; url: string };
  appleMusicUrl?: string;
  youtubeSubscribers?: number;
  youtubeTotalViews?: number;
  instagramFollowers?: number;
  tiktokFollowers?: number;
  totalStreams?: number;
  streamingHighlights?: string[];

  // Press
  pressFeatures?: {
    outlet: string;
    title: string;
    url: string;
    date: string;
    excerpt?: string;
  }[];
  blogMentions?: string[];
  interviewUrls?: string[];

  // Playlists
  editorialPlaylists?: {
    name: string;
    platform: string;
    followers: number;
    url: string;
  }[];
  curatedPlaylists?: { name: string; curator: string; url: string }[];

  // Shows
  pastShows?: {
    venue: string;
    city: string;
    date: string;
    attendance?: number;
    type: string;
  }[];
  festivalAppearances?: string[];
  notableVenues?: string[];
  tourHistory?: string[];

  // Collaborations
  collaborations?: {
    artistName: string;
    trackName: string;
    year: number;
    type: string;
  }[];
  producerCredits?: string[];
  remixCredits?: string[];

  // Music
  topTracks?: { title: string; url: string; platform: string }[];
  latestRelease?: {
    title: string;
    date: string;
    coverUrl: string;
    links: Record<string, string>;
  };
  upcomingRelease?: { title: string; date: string; coverUrl: string };

  // Videos
  officialMusicVideos?: { title: string; url: string; views: number }[];
  livePerformanceVideos?: { title: string; url: string; venue: string }[];
  featuredVideo?: { title: string; url: string; platform: string };

  // Quotes
  pressQuotes?: {
    quote: string;
    source: string;
    sourceUrl?: string;
    date?: string;
  }[];
  artistEndorsements?: {
    artistName: string;
    quote: string;
    context?: string;
  }[];
  industryTestimonials?: { name: string; role: string; quote: string }[];

  // Contact
  bookingEmail?: string;
  bookingPhone?: string;
  managementName?: string;
  managementEmail?: string;
  managementPhone?: string;
  publicistName?: string;
  publicistEmail?: string;
  labelName?: string;
  labelContact?: string;

  // Technical Rider
  performanceFormat?: string;
  setLengthOptions?: number[];
  technicalRequirements?: Record<string, string>;
  backlineNeeds?: string[];
  stageRequirements?: string;
  hospitalityRider?: string;
  travelRequirements?: string;

  // Downloads
  pressKitPdfUrl?: string;
  hiResPhotosZipUrl?: string;
  logoPackZipUrl?: string;
  technicalRiderPdfUrl?: string;
  stageplotUrl?: string;

  // Settings
  isPublic?: boolean;
  customSlug?: string;
  theme?: string;
  showContactForm?: boolean;
  password?: string;

  viewCount?: number;
  downloadCount?: number;
}

type TabId =
  | "identity"
  | "bios"
  | "visuals"
  | "streaming"
  | "press"
  | "playlists"
  | "shows"
  | "collaborations"
  | "music"
  | "videos"
  | "quotes"
  | "contact"
  | "technical"
  | "downloads"
  | "settings";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "identity", label: "Identidad", icon: User },
  { id: "bios", label: "Biografías", icon: FileText },
  { id: "visuals", label: "Visual", icon: Palette },
  { id: "streaming", label: "Streaming", icon: BarChart3 },
  { id: "press", label: "Prensa", icon: Newspaper },
  { id: "playlists", label: "Playlists", icon: ListMusic },
  { id: "shows", label: "Shows", icon: Calendar },
  { id: "collaborations", label: "Collabs", icon: Users },
  { id: "music", label: "Música", icon: Music },
  { id: "videos", label: "Videos", icon: Video },
  { id: "quotes", label: "Citas", icon: Quote },
  { id: "contact", label: "Contacto", icon: Mail },
  { id: "technical", label: "Rider", icon: Wrench },
  { id: "downloads", label: "Descargas", icon: Download },
  { id: "settings", label: "Config", icon: Settings },
];

export default function EpkEditorPage({
  params,
}: { params: Promise<{ artistId: string }> }) {
  const { artistId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [epk, setEpk] = useState<EpkData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("identity");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: stable function reference
  useEffect(() => {
    fetchEpkData();
  }, [artistId]);

  const fetchEpkData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/epk/${artistId}`);
      const data = await res.json();

      if (data.success) {
        setArtist(data.data.artist);

        // Parse JSON fields
        const epkData = data.data.epk;
        setEpk({
          ...epkData,
          subgenres: epkData.subgenres ? JSON.parse(epkData.subgenres) : [],
          storyHighlights: epkData.storyHighlights
            ? JSON.parse(epkData.storyHighlights)
            : [],
          brandColors: epkData.brandColors
            ? JSON.parse(epkData.brandColors)
            : [],
          spotifyTopTrack: epkData.spotifyTopTrack
            ? JSON.parse(epkData.spotifyTopTrack)
            : null,
          streamingHighlights: epkData.streamingHighlights
            ? JSON.parse(epkData.streamingHighlights)
            : [],
          pressFeatures: epkData.pressFeatures
            ? JSON.parse(epkData.pressFeatures)
            : [],
          blogMentions: epkData.blogMentions
            ? JSON.parse(epkData.blogMentions)
            : [],
          interviewUrls: epkData.interviewUrls
            ? JSON.parse(epkData.interviewUrls)
            : [],
          editorialPlaylists: epkData.editorialPlaylists
            ? JSON.parse(epkData.editorialPlaylists)
            : [],
          curatedPlaylists: epkData.curatedPlaylists
            ? JSON.parse(epkData.curatedPlaylists)
            : [],
          pastShows: epkData.pastShows ? JSON.parse(epkData.pastShows) : [],
          festivalAppearances: epkData.festivalAppearances
            ? JSON.parse(epkData.festivalAppearances)
            : [],
          notableVenues: epkData.notableVenues
            ? JSON.parse(epkData.notableVenues)
            : [],
          tourHistory: epkData.tourHistory
            ? JSON.parse(epkData.tourHistory)
            : [],
          collaborations: epkData.collaborations
            ? JSON.parse(epkData.collaborations)
            : [],
          producerCredits: epkData.producerCredits
            ? JSON.parse(epkData.producerCredits)
            : [],
          remixCredits: epkData.remixCredits
            ? JSON.parse(epkData.remixCredits)
            : [],
          topTracks: epkData.topTracks ? JSON.parse(epkData.topTracks) : [],
          latestRelease: epkData.latestRelease
            ? JSON.parse(epkData.latestRelease)
            : null,
          upcomingRelease: epkData.upcomingRelease
            ? JSON.parse(epkData.upcomingRelease)
            : null,
          officialMusicVideos: epkData.officialMusicVideos
            ? JSON.parse(epkData.officialMusicVideos)
            : [],
          livePerformanceVideos: epkData.livePerformanceVideos
            ? JSON.parse(epkData.livePerformanceVideos)
            : [],
          featuredVideo: epkData.featuredVideo
            ? JSON.parse(epkData.featuredVideo)
            : null,
          pressQuotes: epkData.pressQuotes
            ? JSON.parse(epkData.pressQuotes)
            : [],
          artistEndorsements: epkData.artistEndorsements
            ? JSON.parse(epkData.artistEndorsements)
            : [],
          industryTestimonials: epkData.industryTestimonials
            ? JSON.parse(epkData.industryTestimonials)
            : [],
          setLengthOptions: epkData.setLengthOptions
            ? JSON.parse(epkData.setLengthOptions)
            : [],
          technicalRequirements: epkData.technicalRequirements
            ? JSON.parse(epkData.technicalRequirements)
            : {},
          backlineNeeds: epkData.backlineNeeds
            ? JSON.parse(epkData.backlineNeeds)
            : [],
        });
      } else {
        setMessage({ type: "error", text: data.error || "Error loading EPK" });
      }
    } catch (error) {
      console.error("Error fetching EPK:", error);
      setMessage({ type: "error", text: "Error loading EPK data" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!epk) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/epk/${artistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(epk),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "EPK guardado exitosamente" });
        setHasChanges(false);
      } else {
        setMessage({ type: "error", text: data.error || "Error saving EPK" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error saving EPK" });
    } finally {
      setSaving(false);
    }
  };

  // biome-ignore lint/suspicious/noExplicitAny: dynamic value type for EPK field updates
  const updateEpk = (field: keyof EpkData, value: any) => {
    setEpk((prev) => (prev ? { ...prev, [field]: value } : null));
    setHasChanges(true);
  };

  const wordCount = (text: string) => {
    return text?.trim().split(/\s+/).filter(Boolean).length || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!artist || !epk) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Artista no encontrado</h1>
        <Button asChild>
          <Link href="/admin/press-kits">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slc-black">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slc-dark/95 backdrop-blur-sm border-b border-slc-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon">
                <Link href="/admin/press-kits">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
              </Button>

              <div className="flex items-center gap-3">
                {artist.profileImageUrl ? (
                  <Image
                    src={artist.profileImageUrl}
                    alt={artist.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slc-card flex items-center justify-center">
                    <User className="w-5 h-5 text-slc-muted" />
                  </div>
                )}
                <div>
                  <h1 className="font-oswald text-xl uppercase">
                    {artist.name}
                  </h1>
                  <p className="text-sm text-slc-muted">Electronic Press Kit</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hasChanges && (
                <span className="text-sm text-yellow-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Cambios sin guardar
                </span>
              )}

              <Button asChild variant="outline" size="sm">
                <Link href={`/epk/${artist.slug}`} target="_blank">
                  <Eye className="w-4 h-4 mr-2" />
                  Vista Previa
                </Link>
              </Button>

              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                size="sm"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar
              </Button>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={cn(
                "mt-3 p-3 rounded-lg flex items-center gap-2 text-sm",
                message.type === "success"
                  ? "bg-green-500/10 text-green-500 border border-green-500/20"
                  : "bg-red-500/10 text-red-500 border border-red-500/20",
              )}
            >
              {message.type === "success" ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {message.text}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-6 overflow-x-auto">
          <div className="flex gap-1 pb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-slc-muted hover:text-white",
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-5xl mx-auto">
        {/* Identity Tab */}
        {activeTab === "identity" && (
          <div className="space-y-6">
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Identidad & Posicionamiento
              </h2>

              <div className="space-y-6">
                {/* Tagline */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    One-Line Hook / Tagline *
                  </label>
                  <p className="text-xs text-slc-muted mb-2">
                    Responde en una línea: ¿quién eres y por qué debería
                    importar?
                  </p>
                  <Input
                    value={epk.tagline || ""}
                    onChange={(e) => updateEpk("tagline", e.target.value)}
                    placeholder="Ej: Artista de trap melódico de CDMX fusionando corridos con rap atmosférico"
                    maxLength={150}
                  />
                  <p className="text-xs text-slc-muted mt-1 text-right">
                    {epk.tagline?.length || 0}/150 caracteres
                  </p>
                </div>

                {/* Genre Specific */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Género Específico *
                  </label>
                  <p className="text-xs text-slc-muted mb-2">
                    Sé específico. No "urbano" - mejor "trap melódico con
                    elementos de regional mexicano"
                  </p>
                  <Input
                    value={epk.genreSpecific || ""}
                    onChange={(e) => updateEpk("genreSpecific", e.target.value)}
                    placeholder="Ej: Hip-Hop consciente con influencias de jazz y soul"
                  />
                </div>

                {/* Subgenres */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Subgéneros
                  </label>
                  <Input
                    value={(epk.subgenres || []).join(", ")}
                    onChange={(e) =>
                      updateEpk(
                        "subgenres",
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      )
                    }
                    placeholder="Boom bap, Lo-fi, Jazz rap (separados por coma)"
                  />
                </div>

                {/* Artist Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tipo de Artista
                  </label>
                  <select
                    value={epk.artistType || ""}
                    onChange={(e) => updateEpk("artistType", e.target.value)}
                    className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="solo">Artista Solista</option>
                    <option value="duo">Dúo</option>
                    <option value="group">Grupo</option>
                    <option value="dj">DJ</option>
                    <option value="producer">Productor</option>
                    <option value="dj_producer">DJ / Productor</option>
                    <option value="mc">MC</option>
                    <option value="singer">Cantante</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tips Card */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <h3 className="font-medium text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Tips para Identidad
              </h3>
              <ul className="text-sm text-slc-muted space-y-2">
                <li>
                  • El tagline es lo primero que leerá un promotor - hazlo
                  memorable
                </li>
                <li>
                  • Evita términos genéricos como "urbano" o "música de calle"
                </li>
                <li>• Menciona tu ubicación - es importante para bookings</li>
                <li>
                  • Si tu identidad es vaga, el resto del EPK no te salvará
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Bios Tab */}
        {activeTab === "bios" && (
          <div className="space-y-6">
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Biografías
              </h2>

              <div className="space-y-6">
                {/* Short Bio */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">
                      Bio Corta (50-80 palabras) *
                    </label>
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        wordCount(epk.bioShort || "") >= 50 &&
                          wordCount(epk.bioShort || "") <= 80
                          ? "bg-green-500/10 text-green-500"
                          : "bg-yellow-500/10 text-yellow-500",
                      )}
                    >
                      {wordCount(epk.bioShort || "")} palabras
                    </span>
                  </div>
                  <p className="text-xs text-slc-muted mb-2">
                    Para escaneo rápido. Sonido + Logro principal + Hook.
                  </p>
                  <textarea
                    value={epk.bioShort || ""}
                    onChange={(e) => updateEpk("bioShort", e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg resize-none"
                    placeholder="Escribe una bio concisa de 50-80 palabras..."
                  />
                </div>

                {/* Long Bio */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">
                      Bio Completa (150-300 palabras)
                    </label>
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        wordCount(epk.bioLong || "") >= 150 &&
                          wordCount(epk.bioLong || "") <= 300
                          ? "bg-green-500/10 text-green-500"
                          : "bg-yellow-500/10 text-yellow-500",
                      )}
                    >
                      {wordCount(epk.bioLong || "")} palabras
                    </span>
                  </div>
                  <p className="text-xs text-slc-muted mb-2">
                    Para contexto más profundo. Evita historias irrelevantes.
                  </p>
                  <textarea
                    value={epk.bioLong || ""}
                    onChange={(e) => updateEpk("bioLong", e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg resize-none"
                    placeholder="Escribe la biografía completa..."
                  />
                </div>

                {/* Press Bio */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Bio para Prensa (opcional)
                  </label>
                  <p className="text-xs text-slc-muted mb-2">
                    Versión formal para medios. Puede incluir más detalles y
                    logros.
                  </p>
                  <textarea
                    value={epk.bioPress || ""}
                    onChange={(e) => updateEpk("bioPress", e.target.value)}
                    rows={10}
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg resize-none"
                    placeholder="Bio extendida para uso de prensa..."
                  />
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
              <h3 className="font-medium text-red-400 mb-3">
                Evita en tus bios:
              </h3>
              <ul className="text-sm text-slc-muted space-y-1">
                <li>• "Apasionado por la música desde la infancia"</li>
                <li>• Historias de vida sin relevancia para tu carrera</li>
                <li>• Logros exagerados o no verificables</li>
                <li>• Demasiados adjetivos sin sustancia</li>
              </ul>
            </div>
          </div>
        )}

        {/* Visuals Tab */}
        {activeTab === "visuals" && (
          <div className="space-y-6">
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Identidad Visual
              </h2>

              <div className="space-y-6">
                {/* Logos Grid */}
                <div>
                  <h3 className="text-sm font-medium mb-4">Logos</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Main Logo */}
                    <div>
                      <label className="block text-xs text-slc-muted mb-2">
                        Logo Principal
                      </label>
                      <div className="aspect-square bg-slc-dark border border-slc-border rounded-lg overflow-hidden relative">
                        {epk.logoUrl ? (
                          <Image
                            src={epk.logoUrl}
                            alt="Logo"
                            fill
                            className="object-contain p-4"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-slc-muted" />
                          </div>
                        )}
                      </div>
                      <DropboxUploadButton
                        onUploadComplete={(url) => updateEpk("logoUrl", url)}
                        uploadPath="/epk/logos"
                        buttonText="Subir"
                        className="w-full mt-2"
                        size="sm"
                      />
                    </div>

                    {/* Transparent Logo */}
                    <div>
                      <label className="block text-xs text-slc-muted mb-2">
                        Logo Transparente (PNG)
                      </label>
                      <div className="aspect-square bg-[repeating-conic-gradient(#333_0%_25%,#222_0%_50%)] bg-[length:16px_16px] border border-slc-border rounded-lg overflow-hidden relative">
                        {epk.logoTransparentUrl ? (
                          <Image
                            src={epk.logoTransparentUrl}
                            alt="Logo"
                            fill
                            className="object-contain p-4"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slc-dark/50">
                            <ImageIcon className="w-8 h-8 text-slc-muted" />
                          </div>
                        )}
                      </div>
                      <DropboxUploadButton
                        onUploadComplete={(url) =>
                          updateEpk("logoTransparentUrl", url)
                        }
                        uploadPath="/epk/logos"
                        buttonText="Subir"
                        className="w-full mt-2"
                        size="sm"
                      />
                    </div>

                    {/* White Logo */}
                    <div>
                      <label className="block text-xs text-slc-muted mb-2">
                        Logo Blanco
                      </label>
                      <div className="aspect-square bg-gray-800 border border-slc-border rounded-lg overflow-hidden relative">
                        {epk.logoWhiteUrl ? (
                          <Image
                            src={epk.logoWhiteUrl}
                            alt="Logo"
                            fill
                            className="object-contain p-4"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-slc-muted" />
                          </div>
                        )}
                      </div>
                      <DropboxUploadButton
                        onUploadComplete={(url) =>
                          updateEpk("logoWhiteUrl", url)
                        }
                        uploadPath="/epk/logos"
                        buttonText="Subir"
                        className="w-full mt-2"
                        size="sm"
                      />
                    </div>

                    {/* Black Logo */}
                    <div>
                      <label className="block text-xs text-slc-muted mb-2">
                        Logo Negro
                      </label>
                      <div className="aspect-square bg-gray-100 border border-slc-border rounded-lg overflow-hidden relative">
                        {epk.logoBlackUrl ? (
                          <Image
                            src={epk.logoBlackUrl}
                            alt="Logo"
                            fill
                            className="object-contain p-4"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <DropboxUploadButton
                        onUploadComplete={(url) =>
                          updateEpk("logoBlackUrl", url)
                        }
                        uploadPath="/epk/logos"
                        buttonText="Subir"
                        className="w-full mt-2"
                        size="sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Brand Colors */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Colores de Marca
                  </label>
                  <div className="flex gap-3 flex-wrap">
                    {(epk.brandColors || []).map((color, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div
                          className="w-10 h-10 rounded-lg border border-slc-border"
                          style={{ backgroundColor: color }}
                        />
                        <Input
                          value={color}
                          onChange={(e) => {
                            const newColors = [...(epk.brandColors || [])];
                            newColors[idx] = e.target.value;
                            updateEpk("brandColors", newColors);
                          }}
                          className="w-28"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newColors = (epk.brandColors || []).filter(
                              (_, i) => i !== idx,
                            );
                            updateEpk("brandColors", newColors);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("brandColors", [
                          ...(epk.brandColors || []),
                          "#000000",
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Color
                    </Button>
                  </div>
                </div>

                {/* Brand Font */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Fuente Principal de Marca
                  </label>
                  <Input
                    value={epk.brandFont || ""}
                    onChange={(e) => updateEpk("brandFont", e.target.value)}
                    placeholder="Ej: Oswald, Montserrat, etc."
                  />
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <h3 className="font-medium text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Tips para Visuales
              </h3>
              <ul className="text-sm text-slc-muted space-y-2">
                <li>• Incluye al menos 3-5 fotos de prensa de alta calidad</li>
                <li>• Fotos en 300 DPI para uso en prensa impresa</li>
                <li>
                  • Mantén una estética consistente (esto señala
                  profesionalismo)
                </li>
                <li>
                  • Incluye: retrato, performance, y foto estilizada/editorial
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Streaming Tab */}
        {activeTab === "streaming" && (
          <div className="space-y-6">
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Estadísticas de Streaming
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Spotify Stats */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-green-500 flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                    Spotify
                  </h3>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">
                      Oyentes Mensuales
                    </label>
                    <Input
                      type="number"
                      value={epk.spotifyMonthlyListeners || ""}
                      onChange={(e) =>
                        updateEpk(
                          "spotifyMonthlyListeners",
                          Number.parseInt(e.target.value) || 0,
                        )
                      }
                      placeholder="Ej: 50000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">
                      Seguidores
                    </label>
                    <Input
                      type="number"
                      value={epk.spotifyFollowers || ""}
                      onChange={(e) =>
                        updateEpk(
                          "spotifyFollowers",
                          Number.parseInt(e.target.value) || 0,
                        )
                      }
                      placeholder="Ej: 10000"
                    />
                  </div>
                </div>

                {/* YouTube Stats */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-red-500 flex items-center gap-2">
                    <Youtube className="w-4 h-4" />
                    YouTube
                  </h3>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">
                      Suscriptores
                    </label>
                    <Input
                      type="number"
                      value={epk.youtubeSubscribers || ""}
                      onChange={(e) =>
                        updateEpk(
                          "youtubeSubscribers",
                          Number.parseInt(e.target.value) || 0,
                        )
                      }
                      placeholder="Ej: 25000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">
                      Vistas Totales
                    </label>
                    <Input
                      type="number"
                      value={epk.youtubeTotalViews || ""}
                      onChange={(e) =>
                        updateEpk(
                          "youtubeTotalViews",
                          Number.parseInt(e.target.value) || 0,
                        )
                      }
                      placeholder="Ej: 5000000"
                    />
                  </div>
                </div>

                {/* Instagram Stats */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-pink-500 flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </h3>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">
                      Seguidores
                    </label>
                    <Input
                      type="number"
                      value={epk.instagramFollowers || ""}
                      onChange={(e) =>
                        updateEpk(
                          "instagramFollowers",
                          Number.parseInt(e.target.value) || 0,
                        )
                      }
                      placeholder="Ej: 15000"
                    />
                  </div>
                </div>

                {/* TikTok Stats */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                    </svg>
                    TikTok
                  </h3>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">
                      Seguidores
                    </label>
                    <Input
                      type="number"
                      value={epk.tiktokFollowers || ""}
                      onChange={(e) =>
                        updateEpk(
                          "tiktokFollowers",
                          Number.parseInt(e.target.value) || 0,
                        )
                      }
                      placeholder="Ej: 30000"
                    />
                  </div>
                </div>
              </div>

              {/* Total Streams */}
              <div className="mt-6 pt-6 border-t border-slc-border">
                <label className="block text-sm font-medium mb-2">
                  Total de Streams (todas las plataformas)
                </label>
                <Input
                  type="number"
                  value={epk.totalStreams || ""}
                  onChange={(e) =>
                    updateEpk(
                      "totalStreams",
                      Number.parseInt(e.target.value) || 0,
                    )
                  }
                  placeholder="Ej: 10000000"
                />
              </div>
            </div>
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === "contact" && (
          <div className="space-y-6">
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Información de Contacto
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Booking */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-primary flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Booking
                  </h3>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">
                      Email de Booking
                    </label>
                    <Input
                      type="email"
                      value={epk.bookingEmail || ""}
                      onChange={(e) =>
                        updateEpk("bookingEmail", e.target.value)
                      }
                      placeholder="booking@ejemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">
                      Teléfono de Booking
                    </label>
                    <Input
                      value={epk.bookingPhone || ""}
                      onChange={(e) =>
                        updateEpk("bookingPhone", e.target.value)
                      }
                      placeholder="+52 55 1234 5678"
                    />
                  </div>
                </div>

                {/* Management */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-blue-500 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Management
                  </h3>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">
                      Nombre del Manager
                    </label>
                    <Input
                      value={epk.managementName || ""}
                      onChange={(e) =>
                        updateEpk("managementName", e.target.value)
                      }
                      placeholder="Nombre del manager"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={epk.managementEmail || ""}
                      onChange={(e) =>
                        updateEpk("managementEmail", e.target.value)
                      }
                      placeholder="manager@ejemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">
                      Teléfono
                    </label>
                    <Input
                      value={epk.managementPhone || ""}
                      onChange={(e) =>
                        updateEpk("managementPhone", e.target.value)
                      }
                      placeholder="+52 55 1234 5678"
                    />
                  </div>
                </div>

                {/* Publicist */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-purple-500 flex items-center gap-2">
                    <Newspaper className="w-4 h-4" />
                    Publicista / PR
                  </h3>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">
                      Nombre
                    </label>
                    <Input
                      value={epk.publicistName || ""}
                      onChange={(e) =>
                        updateEpk("publicistName", e.target.value)
                      }
                      placeholder="Nombre del publicista"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={epk.publicistEmail || ""}
                      onChange={(e) =>
                        updateEpk("publicistEmail", e.target.value)
                      }
                      placeholder="prensa@ejemplo.com"
                    />
                  </div>
                </div>

                {/* Label */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-orange-500 flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Sello Discográfico
                  </h3>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">
                      Nombre del Sello
                    </label>
                    <Input
                      value={epk.labelName || ""}
                      onChange={(e) => updateEpk("labelName", e.target.value)}
                      placeholder="Nombre del sello"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">
                      Contacto del Sello
                    </label>
                    <Input
                      value={epk.labelContact || ""}
                      onChange={(e) =>
                        updateEpk("labelContact", e.target.value)
                      }
                      placeholder="Email o nombre de contacto"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <h3 className="font-medium text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Tips de Contacto
              </h3>
              <ul className="text-sm text-slc-muted space-y-2">
                <li>
                  • Usa un email profesional (evita Gmail con números
                  aleatorios)
                </li>
                <li>
                  • Haz que sea fácil contactarte - no escondas la información
                </li>
                <li>
                  • Si tienes manager, incluye su info para agilizar bookings
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Technical Rider Tab */}
        {activeTab === "technical" && (
          <div className="space-y-6">
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                Rider Técnico
              </h2>

              <div className="space-y-6">
                {/* Performance Format */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Formato de Performance
                  </label>
                  <select
                    value={epk.performanceFormat || ""}
                    onChange={(e) =>
                      updateEpk("performanceFormat", e.target.value)
                    }
                    className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="live_band">Banda en Vivo</option>
                    <option value="dj_set">DJ Set</option>
                    <option value="dj_vocals">DJ + Vocales</option>
                    <option value="solo_acoustic">Solo Acústico</option>
                    <option value="playback">Playback + Vocals</option>
                    <option value="hybrid">
                      Híbrido (Pistas + Instrumentos)
                    </option>
                    <option value="full_production">Full Production</option>
                  </select>
                </div>

                {/* Set Length Options */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Opciones de Duración del Set (minutos)
                  </label>
                  <Input
                    value={(epk.setLengthOptions || []).join(", ")}
                    onChange={(e) =>
                      updateEpk(
                        "setLengthOptions",
                        e.target.value
                          .split(",")
                          .map((s) => Number.parseInt(s.trim()))
                          .filter((n) => !Number.isNaN(n)),
                      )
                    }
                    placeholder="30, 45, 60, 90"
                  />
                </div>

                {/* Stage Requirements */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Requerimientos de Escenario
                  </label>
                  <textarea
                    value={epk.stageRequirements || ""}
                    onChange={(e) =>
                      updateEpk("stageRequirements", e.target.value)
                    }
                    rows={4}
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg resize-none"
                    placeholder="Describe los requerimientos de escenario..."
                  />
                </div>

                {/* Backline Needs */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Backline / Equipamiento Necesario
                  </label>
                  <textarea
                    value={(epk.backlineNeeds || []).join("\n")}
                    onChange={(e) =>
                      updateEpk(
                        "backlineNeeds",
                        e.target.value.split("\n").filter(Boolean),
                      )
                    }
                    rows={4}
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg resize-none"
                    placeholder="Un item por línea:&#10;2 Micrófonos SM58&#10;1 CDJ-3000&#10;1 DJM-900NXS2"
                  />
                </div>

                {/* Hospitality */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Rider de Hospitalidad (opcional)
                  </label>
                  <textarea
                    value={epk.hospitalityRider || ""}
                    onChange={(e) =>
                      updateEpk("hospitalityRider", e.target.value)
                    }
                    rows={4}
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg resize-none"
                    placeholder="Agua mineral, toallas, etc."
                  />
                </div>

                {/* Travel Requirements */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Requerimientos de Viaje
                  </label>
                  <textarea
                    value={epk.travelRequirements || ""}
                    onChange={(e) =>
                      updateEpk("travelRequirements", e.target.value)
                    }
                    rows={3}
                    className="w-full px-4 py-3 bg-slc-dark border border-slc-border rounded-lg resize-none"
                    placeholder="Vuelos business, hotel 4 estrellas, etc."
                  />
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-6">
              <h3 className="font-medium text-yellow-400 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Importante
              </h3>
              <p className="text-sm text-slc-muted">
                La mayoría de los artistas omiten el rider técnico y lucen mal
                preparados. Tener esta información lista señala que estás listo
                para ser bookeado.
              </p>
            </div>
          </div>
        )}

        {/* Downloads Tab */}
        {activeTab === "downloads" && (
          <div className="space-y-6">
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Assets Descargables
              </h2>

              <div className="space-y-6">
                {/* Press Kit PDF */}
                <div className="flex items-center justify-between p-4 bg-slc-dark rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium">Press Kit PDF</p>
                      <p className="text-xs text-slc-muted">
                        Documento completo para prensa
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {epk.pressKitPdfUrl && (
                      <a
                        href={epk.pressKitPdfUrl}
                        target="_blank"
                        className="text-primary text-sm hover:underline"
                        rel="noreferrer"
                      >
                        Ver actual
                      </a>
                    )}
                    <DropboxUploadButton
                      onUploadComplete={(url) =>
                        updateEpk("pressKitPdfUrl", url)
                      }
                      uploadPath="/epk/downloads"
                      buttonText="Subir PDF"
                      size="sm"
                    />
                  </div>
                </div>

                {/* Hi-Res Photos ZIP */}
                <div className="flex items-center justify-between p-4 bg-slc-dark rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">Fotos Hi-Res (ZIP)</p>
                      <p className="text-xs text-slc-muted">
                        Fotos de prensa en 300 DPI
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {epk.hiResPhotosZipUrl && (
                      <a
                        href={epk.hiResPhotosZipUrl}
                        target="_blank"
                        className="text-primary text-sm hover:underline"
                        rel="noreferrer"
                      >
                        Ver actual
                      </a>
                    )}
                    <DropboxUploadButton
                      onUploadComplete={(url) =>
                        updateEpk("hiResPhotosZipUrl", url)
                      }
                      uploadPath="/epk/downloads"
                      buttonText="Subir ZIP"
                      size="sm"
                    />
                  </div>
                </div>

                {/* Logo Pack ZIP */}
                <div className="flex items-center justify-between p-4 bg-slc-dark rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Palette className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium">Pack de Logos (ZIP)</p>
                      <p className="text-xs text-slc-muted">
                        PNG + Transparentes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {epk.logoPackZipUrl && (
                      <a
                        href={epk.logoPackZipUrl}
                        target="_blank"
                        className="text-primary text-sm hover:underline"
                        rel="noreferrer"
                      >
                        Ver actual
                      </a>
                    )}
                    <DropboxUploadButton
                      onUploadComplete={(url) =>
                        updateEpk("logoPackZipUrl", url)
                      }
                      uploadPath="/epk/downloads"
                      buttonText="Subir ZIP"
                      size="sm"
                    />
                  </div>
                </div>

                {/* Technical Rider PDF */}
                <div className="flex items-center justify-between p-4 bg-slc-dark rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Wrench className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium">Rider Técnico (PDF)</p>
                      <p className="text-xs text-slc-muted">
                        Documento técnico para venues
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {epk.technicalRiderPdfUrl && (
                      <a
                        href={epk.technicalRiderPdfUrl}
                        target="_blank"
                        className="text-primary text-sm hover:underline"
                        rel="noreferrer"
                      >
                        Ver actual
                      </a>
                    )}
                    <DropboxUploadButton
                      onUploadComplete={(url) =>
                        updateEpk("technicalRiderPdfUrl", url)
                      }
                      uploadPath="/epk/downloads"
                      buttonText="Subir PDF"
                      size="sm"
                    />
                  </div>
                </div>

                {/* Stageplot */}
                <div className="flex items-center justify-between p-4 bg-slc-dark rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Stageplot</p>
                      <p className="text-xs text-slc-muted">
                        Diagrama de escenario
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {epk.stageplotUrl && (
                      <a
                        href={epk.stageplotUrl}
                        target="_blank"
                        className="text-primary text-sm hover:underline"
                        rel="noreferrer"
                      >
                        Ver actual
                      </a>
                    )}
                    <DropboxUploadButton
                      onUploadComplete={(url) => updateEpk("stageplotUrl", url)}
                      uploadPath="/epk/downloads"
                      buttonText="Subir"
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Configuración del EPK
              </h2>

              <div className="space-y-6">
                {/* Public Toggle */}
                <div className="flex items-center justify-between p-4 bg-slc-dark rounded-lg">
                  <div>
                    <p className="font-medium">EPK Público</p>
                    <p className="text-xs text-slc-muted">
                      Permitir acceso público al EPK
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={epk.isPublic || false}
                      onChange={(e) => updateEpk("isPublic", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slc-border rounded-full peer peer-checked:bg-primary transition-colors" />
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                  </label>
                </div>

                {/* Custom Slug */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    URL Personalizada
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-slc-muted">
                      sonidoliquido.com/epk/
                    </span>
                    <Input
                      value={epk.customSlug || artist.slug}
                      onChange={(e) => updateEpk("customSlug", e.target.value)}
                      placeholder={artist.slug}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tema Visual
                  </label>
                  <select
                    value={epk.theme || "dark"}
                    onChange={(e) => updateEpk("theme", e.target.value)}
                    className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg"
                  >
                    <option value="dark">Oscuro</option>
                    <option value="light">Claro</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>

                {/* Show Contact Form */}
                <div className="flex items-center justify-between p-4 bg-slc-dark rounded-lg">
                  <div>
                    <p className="font-medium">
                      Mostrar Formulario de Contacto
                    </p>
                    <p className="text-xs text-slc-muted">
                      Permite que te contacten desde el EPK
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={epk.showContactForm ?? true}
                      onChange={(e) =>
                        updateEpk("showContactForm", e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slc-border rounded-full peer peer-checked:bg-primary transition-colors" />
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                  </label>
                </div>

                {/* Password Protection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Contraseña de Protección (opcional)
                  </label>
                  <Input
                    type="password"
                    value={epk.password || ""}
                    onChange={(e) => updateEpk("password", e.target.value)}
                    placeholder="Dejar vacío para acceso sin contraseña"
                  />
                </div>

                {/* Analytics */}
                <div className="pt-6 border-t border-slc-border">
                  <h3 className="text-sm font-medium mb-4">
                    Estadísticas del EPK
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slc-dark rounded-lg text-center">
                      <p className="font-oswald text-2xl text-primary">
                        {epk.viewCount || 0}
                      </p>
                      <p className="text-xs text-slc-muted">Vistas</p>
                    </div>
                    <div className="p-4 bg-slc-dark rounded-lg text-center">
                      <p className="font-oswald text-2xl text-green-500">
                        {epk.downloadCount || 0}
                      </p>
                      <p className="text-xs text-slc-muted">Descargas</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Press Tab */}
        {activeTab === "press" && (
          <div className="space-y-6">
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-primary" />
                Prensa & Medios
              </h2>

              <div className="space-y-8">
                {/* Press Features */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Artículos de Prensa
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Agrega artículos, reseñas y menciones en medios de
                    comunicación.
                  </p>
                  <div className="space-y-4">
                    {(epk.pressFeatures || []).map((feature, idx) => (
                      <div
                        key={idx}
                        className="bg-slc-dark border border-slc-border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slc-muted">
                            Artículo #{idx + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = (epk.pressFeatures || []).filter(
                                (_, i) => i !== idx,
                              );
                              updateEpk("pressFeatures", updated);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Medio / Outlet
                            </label>
                            <Input
                              value={feature.outlet || ""}
                              onChange={(e) => {
                                const updated = [...(epk.pressFeatures || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  outlet: e.target.value,
                                };
                                updateEpk("pressFeatures", updated);
                              }}
                              placeholder="Ej: Rolling Stone, Noisey..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Título
                            </label>
                            <Input
                              value={feature.title || ""}
                              onChange={(e) => {
                                const updated = [...(epk.pressFeatures || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  title: e.target.value,
                                };
                                updateEpk("pressFeatures", updated);
                              }}
                              placeholder="Título del artículo"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              URL
                            </label>
                            <Input
                              value={feature.url || ""}
                              onChange={(e) => {
                                const updated = [...(epk.pressFeatures || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  url: e.target.value,
                                };
                                updateEpk("pressFeatures", updated);
                              }}
                              placeholder="https://..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Fecha
                            </label>
                            <Input
                              value={feature.date || ""}
                              onChange={(e) => {
                                const updated = [...(epk.pressFeatures || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  date: e.target.value,
                                };
                                updateEpk("pressFeatures", updated);
                              }}
                              placeholder="Ej: Marzo 2024"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-slc-muted mb-1">
                            Extracto (opcional)
                          </label>
                          <textarea
                            value={feature.excerpt || ""}
                            onChange={(e) => {
                              const updated = [...(epk.pressFeatures || [])];
                              updated[idx] = {
                                ...updated[idx],
                                excerpt: e.target.value,
                              };
                              updateEpk("pressFeatures", updated);
                            }}
                            rows={2}
                            className="w-full px-4 py-3 bg-slc-black border border-slc-border rounded-lg resize-none"
                            placeholder="Breve extracto del artículo..."
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("pressFeatures", [
                          ...(epk.pressFeatures || []),
                          { outlet: "", title: "", url: "", date: "" },
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Artículo
                    </Button>
                  </div>
                </div>

                {/* Blog Mentions */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Menciones en Blogs
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Nombres de blogs o sitios que te han mencionado.
                  </p>
                  <div className="space-y-2">
                    {(epk.blogMentions || []).map((mention, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={mention}
                          onChange={(e) => {
                            const updated = [...(epk.blogMentions || [])];
                            updated[idx] = e.target.value;
                            updateEpk("blogMentions", updated);
                          }}
                          placeholder="Nombre del blog o sitio"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const updated = (epk.blogMentions || []).filter(
                              (_, i) => i !== idx,
                            );
                            updateEpk("blogMentions", updated);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("blogMentions", [
                          ...(epk.blogMentions || []),
                          "",
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Mención
                    </Button>
                  </div>
                </div>

                {/* Interview URLs */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Entrevistas
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Links a entrevistas en video, podcast o artículos.
                  </p>
                  <div className="space-y-2">
                    {(epk.interviewUrls || []).map((url, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={url}
                          onChange={(e) => {
                            const updated = [...(epk.interviewUrls || [])];
                            updated[idx] = e.target.value;
                            updateEpk("interviewUrls", updated);
                          }}
                          placeholder="https://..."
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const updated = (epk.interviewUrls || []).filter(
                              (_, i) => i !== idx,
                            );
                            updateEpk("interviewUrls", updated);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("interviewUrls", [
                          ...(epk.interviewUrls || []),
                          "",
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Entrevista
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <h3 className="font-medium text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Tips para Prensa
              </h3>
              <ul className="text-sm text-slc-muted space-y-2">
                <li>
                  • Incluye solo artículos de medios reconocidos o relevantes en
                  tu escena
                </li>
                <li>• Un extracto fuerte vale más que el artículo completo</li>
                <li>
                  • Prioriza calidad sobre cantidad — 3-5 artículos sólidos son
                  suficientes
                </li>
                <li>
                  • Las entrevistas muestran que los medios están interesados en
                  tu historia
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Playlists Tab */}
        {activeTab === "playlists" && (
          <div className="space-y-6">
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <ListMusic className="w-5 h-5 text-primary" />
                Playlists
              </h2>

              <div className="space-y-8">
                {/* Editorial Playlists */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Playlists Editoriales
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Playlists curatoradas por plataformas (Spotify Editorial,
                    Apple Music, etc.).
                  </p>
                  <div className="space-y-4">
                    {(epk.editorialPlaylists || []).map((playlist, idx) => (
                      <div
                        key={idx}
                        className="bg-slc-dark border border-slc-border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slc-muted">
                            Playlist #{idx + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = (
                                epk.editorialPlaylists || []
                              ).filter((_, i) => i !== idx);
                              updateEpk("editorialPlaylists", updated);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Nombre
                            </label>
                            <Input
                              value={playlist.name || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(epk.editorialPlaylists || []),
                                ];
                                updated[idx] = {
                                  ...updated[idx],
                                  name: e.target.value,
                                };
                                updateEpk("editorialPlaylists", updated);
                              }}
                              placeholder="Nombre de la playlist"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Plataforma
                            </label>
                            <Input
                              value={playlist.platform || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(epk.editorialPlaylists || []),
                                ];
                                updated[idx] = {
                                  ...updated[idx],
                                  platform: e.target.value,
                                };
                                updateEpk("editorialPlaylists", updated);
                              }}
                              placeholder="Spotify, Apple Music..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Seguidores
                            </label>
                            <Input
                              type="number"
                              value={playlist.followers || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(epk.editorialPlaylists || []),
                                ];
                                updated[idx] = {
                                  ...updated[idx],
                                  followers:
                                    Number.parseInt(e.target.value) || 0,
                                };
                                updateEpk("editorialPlaylists", updated);
                              }}
                              placeholder="Ej: 50000"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              URL
                            </label>
                            <Input
                              value={playlist.url || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(epk.editorialPlaylists || []),
                                ];
                                updated[idx] = {
                                  ...updated[idx],
                                  url: e.target.value,
                                };
                                updateEpk("editorialPlaylists", updated);
                              }}
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("editorialPlaylists", [
                          ...(epk.editorialPlaylists || []),
                          { name: "", platform: "", followers: 0, url: "" },
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Playlist Editorial
                    </Button>
                  </div>
                </div>

                {/* Curated Playlists */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Playlists Curadas
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Playlists de curadores independientes donde aparece tu
                    música.
                  </p>
                  <div className="space-y-4">
                    {(epk.curatedPlaylists || []).map((playlist, idx) => (
                      <div
                        key={idx}
                        className="bg-slc-dark border border-slc-border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slc-muted">
                            Playlist #{idx + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = (
                                epk.curatedPlaylists || []
                              ).filter((_, i) => i !== idx);
                              updateEpk("curatedPlaylists", updated);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Nombre
                            </label>
                            <Input
                              value={playlist.name || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(epk.curatedPlaylists || []),
                                ];
                                updated[idx] = {
                                  ...updated[idx],
                                  name: e.target.value,
                                };
                                updateEpk("curatedPlaylists", updated);
                              }}
                              placeholder="Nombre de la playlist"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Curador
                            </label>
                            <Input
                              value={playlist.curator || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(epk.curatedPlaylists || []),
                                ];
                                updated[idx] = {
                                  ...updated[idx],
                                  curator: e.target.value,
                                };
                                updateEpk("curatedPlaylists", updated);
                              }}
                              placeholder="Nombre del curador"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              URL
                            </label>
                            <Input
                              value={playlist.url || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(epk.curatedPlaylists || []),
                                ];
                                updated[idx] = {
                                  ...updated[idx],
                                  url: e.target.value,
                                };
                                updateEpk("curatedPlaylists", updated);
                              }}
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("curatedPlaylists", [
                          ...(epk.curatedPlaylists || []),
                          { name: "", curator: "", url: "" },
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Playlist Curada
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <h3 className="font-medium text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Tips para Playlists
              </h3>
              <ul className="text-sm text-slc-muted space-y-2">
                <li>
                  • Las playlists editoriales son la prueba más fuerte de
                  validación
                </li>
                <li>
                  • Incluye el número de seguidores — los números importan
                </li>
                <li>
                  • Las playlists curadas por influencers también valen,
                  especialmente si son grandes
                </li>
                <li>
                  • Actualiza esta sección cada vez que entres en una nueva
                  playlist
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Shows Tab */}
        {activeTab === "shows" && (
          <div className="space-y-6">
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Shows & Festivales
              </h2>

              <div className="space-y-8">
                {/* Past Shows */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Shows Pasados
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Los shows más relevantes o recientes del artista.
                  </p>
                  <div className="space-y-4">
                    {(epk.pastShows || []).map((show, idx) => (
                      <div
                        key={idx}
                        className="bg-slc-dark border border-slc-border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slc-muted">
                            Show #{idx + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = (epk.pastShows || []).filter(
                                (_, i) => i !== idx,
                              );
                              updateEpk("pastShows", updated);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Venue
                            </label>
                            <Input
                              value={show.venue || ""}
                              onChange={(e) => {
                                const updated = [...(epk.pastShows || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  venue: e.target.value,
                                };
                                updateEpk("pastShows", updated);
                              }}
                              placeholder="Nombre del venue"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Ciudad
                            </label>
                            <Input
                              value={show.city || ""}
                              onChange={(e) => {
                                const updated = [...(epk.pastShows || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  city: e.target.value,
                                };
                                updateEpk("pastShows", updated);
                              }}
                              placeholder="Ciudad, País"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Fecha
                            </label>
                            <Input
                              value={show.date || ""}
                              onChange={(e) => {
                                const updated = [...(epk.pastShows || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  date: e.target.value,
                                };
                                updateEpk("pastShows", updated);
                              }}
                              placeholder="Ej: 15 Mar 2024"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Asistencia (opcional)
                            </label>
                            <Input
                              type="number"
                              value={show.attendance || ""}
                              onChange={(e) => {
                                const updated = [...(epk.pastShows || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  attendance:
                                    Number.parseInt(e.target.value) ||
                                    undefined,
                                };
                                updateEpk("pastShows", updated);
                              }}
                              placeholder="Ej: 5000"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Tipo
                            </label>
                            <Input
                              value={show.type || ""}
                              onChange={(e) => {
                                const updated = [...(epk.pastShows || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  type: e.target.value,
                                };
                                updateEpk("pastShows", updated);
                              }}
                              placeholder="Headliner, Soporte, Festival..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("pastShows", [
                          ...(epk.pastShows || []),
                          { venue: "", city: "", date: "", type: "" },
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Show
                    </Button>
                  </div>
                </div>

                {/* Festival Appearances */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Festivales
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Nombres de festivales donde te has presentado.
                  </p>
                  <div className="space-y-2">
                    {(epk.festivalAppearances || []).map((festival, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={festival}
                          onChange={(e) => {
                            const updated = [
                              ...(epk.festivalAppearances || []),
                            ];
                            updated[idx] = e.target.value;
                            updateEpk("festivalAppearances", updated);
                          }}
                          placeholder="Nombre del festival"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const updated = (
                              epk.festivalAppearances || []
                            ).filter((_, i) => i !== idx);
                            updateEpk("festivalAppearances", updated);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("festivalAppearances", [
                          ...(epk.festivalAppearances || []),
                          "",
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Festival
                    </Button>
                  </div>
                </div>

                {/* Notable Venues */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Venues Notables
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Venues icónicos donde te has presentado.
                  </p>
                  <div className="space-y-2">
                    {(epk.notableVenues || []).map((venue, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={venue}
                          onChange={(e) => {
                            const updated = [...(epk.notableVenues || [])];
                            updated[idx] = e.target.value;
                            updateEpk("notableVenues", updated);
                          }}
                          placeholder="Nombre del venue"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const updated = (epk.notableVenues || []).filter(
                              (_, i) => i !== idx,
                            );
                            updateEpk("notableVenues", updated);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("notableVenues", [
                          ...(epk.notableVenues || []),
                          "",
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Venue
                    </Button>
                  </div>
                </div>

                {/* Tour History */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Historial de Giras
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Nombres de giras o tours realizados.
                  </p>
                  <div className="space-y-2">
                    {(epk.tourHistory || []).map((tour, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={tour}
                          onChange={(e) => {
                            const updated = [...(epk.tourHistory || [])];
                            updated[idx] = e.target.value;
                            updateEpk("tourHistory", updated);
                          }}
                          placeholder="Ej: Gira México 2024"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const updated = (epk.tourHistory || []).filter(
                              (_, i) => i !== idx,
                            );
                            updateEpk("tourHistory", updated);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("tourHistory", [
                          ...(epk.tourHistory || []),
                          "",
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Gira
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <h3 className="font-medium text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Tips para Shows
              </h3>
              <ul className="text-sm text-slc-muted space-y-2">
                <li>
                  • Los festivales son la prueba más fuerte de tu nivel como
                  artista en vivo
                </li>
                <li>
                  • Incluye la asistencia cuando sea impresionante (más de
                  1,000)
                </li>
                <li>
                  • Los venues notables muestran dónde has tocado — los
                  promotores conocen estos lugares
                </li>
                <li>
                  • No incluyas todo — selecciona los 5-10 más impresionantes
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Collaborations Tab */}
        {activeTab === "collaborations" && (
          <div className="space-y-6">
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Colaboraciones
              </h2>

              <div className="space-y-8">
                {/* Collaborations */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Colaboraciones Destacadas
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Artistas con los que has colaborado en canciones o
                    proyectos.
                  </p>
                  <div className="space-y-4">
                    {(epk.collaborations || []).map((collab, idx) => (
                      <div
                        key={idx}
                        className="bg-slc-dark border border-slc-border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slc-muted">
                            Colaboración #{idx + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = (epk.collaborations || []).filter(
                                (_, i) => i !== idx,
                              );
                              updateEpk("collaborations", updated);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Artista
                            </label>
                            <Input
                              value={collab.artistName || ""}
                              onChange={(e) => {
                                const updated = [...(epk.collaborations || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  artistName: e.target.value,
                                };
                                updateEpk("collaborations", updated);
                              }}
                              placeholder="Nombre del artista"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Track
                            </label>
                            <Input
                              value={collab.trackName || ""}
                              onChange={(e) => {
                                const updated = [...(epk.collaborations || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  trackName: e.target.value,
                                };
                                updateEpk("collaborations", updated);
                              }}
                              placeholder="Nombre de la canción"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Año
                            </label>
                            <Input
                              type="number"
                              value={collab.year || ""}
                              onChange={(e) => {
                                const updated = [...(epk.collaborations || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  year: Number.parseInt(e.target.value) || 0,
                                };
                                updateEpk("collaborations", updated);
                              }}
                              placeholder="2024"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Tipo
                            </label>
                            <Input
                              value={collab.type || ""}
                              onChange={(e) => {
                                const updated = [...(epk.collaborations || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  type: e.target.value,
                                };
                                updateEpk("collaborations", updated);
                              }}
                              placeholder="Feat, Producción, Remix..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("collaborations", [
                          ...(epk.collaborations || []),
                          { artistName: "", trackName: "", year: 0, type: "" },
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Colaboración
                    </Button>
                  </div>
                </div>

                {/* Producer Credits */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Créditos de Producción
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Canciones que has producido para otros artistas.
                  </p>
                  <div className="space-y-2">
                    {(epk.producerCredits || []).map((credit, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={credit}
                          onChange={(e) => {
                            const updated = [...(epk.producerCredits || [])];
                            updated[idx] = e.target.value;
                            updateEpk("producerCredits", updated);
                          }}
                          placeholder="Ej: Artista - Canción (2024)"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const updated = (epk.producerCredits || []).filter(
                              (_, i) => i !== idx,
                            );
                            updateEpk("producerCredits", updated);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("producerCredits", [
                          ...(epk.producerCredits || []),
                          "",
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Crédito
                    </Button>
                  </div>
                </div>

                {/* Remix Credits */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Créditos de Remixes
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Remixes oficiales que has hecho para otros artistas.
                  </p>
                  <div className="space-y-2">
                    {(epk.remixCredits || []).map((credit, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={credit}
                          onChange={(e) => {
                            const updated = [...(epk.remixCredits || [])];
                            updated[idx] = e.target.value;
                            updateEpk("remixCredits", updated);
                          }}
                          placeholder="Ej: Artista - Canción (Remix)"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const updated = (epk.remixCredits || []).filter(
                              (_, i) => i !== idx,
                            );
                            updateEpk("remixCredits", updated);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("remixCredits", [
                          ...(epk.remixCredits || []),
                          "",
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Remix
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <h3 className="font-medium text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Tips para Colaboraciones
              </h3>
              <ul className="text-sm text-slc-muted space-y-2">
                <li>
                  • Las colaboraciones con artistas conocidos son prueba social
                  muy fuerte
                </li>
                <li>
                  • Incluye el nombre del track — permite al promotor buscar y
                  verificar
                </li>
                <li>• Los créditos de producción muestran versatilidad</li>
                <li>• Si el artista es más grande que tú, destácalo más</li>
              </ul>
            </div>
          </div>
        )}

        {/* Music Tab */}
        {activeTab === "music" && (
          <div className="space-y-6">
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <Music className="w-5 h-5 text-primary" />
                Música Destacada
              </h2>

              <div className="space-y-8">
                {/* Top Tracks */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Tracks Destacados
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Tus 2-5 mejores tracks con links para escuchar.
                  </p>
                  <div className="space-y-4">
                    {(epk.topTracks || []).map((track, idx) => (
                      <div
                        key={idx}
                        className="bg-slc-dark border border-slc-border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slc-muted">
                            Track #{idx + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = (epk.topTracks || []).filter(
                                (_, i) => i !== idx,
                              );
                              updateEpk("topTracks", updated);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Título
                            </label>
                            <Input
                              value={track.title || ""}
                              onChange={(e) => {
                                const updated = [...(epk.topTracks || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  title: e.target.value,
                                };
                                updateEpk("topTracks", updated);
                              }}
                              placeholder="Nombre del track"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              URL
                            </label>
                            <Input
                              value={track.url || ""}
                              onChange={(e) => {
                                const updated = [...(epk.topTracks || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  url: e.target.value,
                                };
                                updateEpk("topTracks", updated);
                              }}
                              placeholder="https://open.spotify.com/..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Plataforma
                            </label>
                            <Input
                              value={track.platform || ""}
                              onChange={(e) => {
                                const updated = [...(epk.topTracks || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  platform: e.target.value,
                                };
                                updateEpk("topTracks", updated);
                              }}
                              placeholder="Spotify, Apple Music, YouTube..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("topTracks", [
                          ...(epk.topTracks || []),
                          { title: "", url: "", platform: "" },
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Track
                    </Button>
                  </div>
                </div>

                {/* Latest Release */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Último Lanzamiento
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Información sobre tu lanzamiento más reciente.
                  </p>
                  <div className="bg-slc-dark border border-slc-border rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slc-muted mb-1">
                          Título
                        </label>
                        <Input
                          value={epk.latestRelease?.title || ""}
                          onChange={(e) =>
                            updateEpk("latestRelease", {
                              ...(epk.latestRelease || {
                                title: "",
                                date: "",
                                coverUrl: "",
                                links: {},
                              }),
                              title: e.target.value,
                            })
                          }
                          placeholder="Título del lanzamiento"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slc-muted mb-1">
                          Fecha
                        </label>
                        <Input
                          value={epk.latestRelease?.date || ""}
                          onChange={(e) =>
                            updateEpk("latestRelease", {
                              ...(epk.latestRelease || {
                                title: "",
                                date: "",
                                coverUrl: "",
                                links: {},
                              }),
                              date: e.target.value,
                            })
                          }
                          placeholder="Ej: 15 Mar 2024"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-slc-muted mb-1">
                          URL de Portada
                        </label>
                        <Input
                          value={epk.latestRelease?.coverUrl || ""}
                          onChange={(e) =>
                            updateEpk("latestRelease", {
                              ...(epk.latestRelease || {
                                title: "",
                                date: "",
                                coverUrl: "",
                                links: {},
                              }),
                              coverUrl: e.target.value,
                            })
                          }
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slc-muted mb-2">
                        Links por Plataforma
                      </label>
                      {Object.entries(epk.latestRelease?.links || {}).map(
                        ([platform, url], idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 mb-2"
                          >
                            <Input
                              value={platform}
                              onChange={(e) => {
                                const links = {
                                  ...(epk.latestRelease?.links || {}),
                                };
                                const oldUrl = links[platform];
                                delete links[platform];
                                links[e.target.value] = oldUrl;
                                updateEpk("latestRelease", {
                                  ...(epk.latestRelease || {
                                    title: "",
                                    date: "",
                                    coverUrl: "",
                                    links: {},
                                  }),
                                  links,
                                });
                              }}
                              placeholder="Plataforma (spotify, apple, youtube)"
                              className="w-40"
                            />
                            <Input
                              value={url}
                              onChange={(e) => {
                                const links = {
                                  ...(epk.latestRelease?.links || {}),
                                };
                                links[platform] = e.target.value;
                                updateEpk("latestRelease", {
                                  ...(epk.latestRelease || {
                                    title: "",
                                    date: "",
                                    coverUrl: "",
                                    links: {},
                                  }),
                                  links,
                                });
                              }}
                              placeholder="https://..."
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const links = {
                                  ...(epk.latestRelease?.links || {}),
                                };
                                delete links[platform];
                                updateEpk("latestRelease", {
                                  ...(epk.latestRelease || {
                                    title: "",
                                    date: "",
                                    coverUrl: "",
                                    links: {},
                                  }),
                                  links,
                                });
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        ),
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const links = { ...(epk.latestRelease?.links || {}) };
                          links[""] = "";
                          updateEpk("latestRelease", {
                            ...(epk.latestRelease || {
                              title: "",
                              date: "",
                              coverUrl: "",
                              links: {},
                            }),
                            links,
                          });
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar Link
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Upcoming Release */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Próximo Lanzamiento
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Información sobre tu próximo lanzamiento (si aplica).
                  </p>
                  <div className="bg-slc-dark border border-slc-border rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slc-muted mb-1">
                          Título
                        </label>
                        <Input
                          value={epk.upcomingRelease?.title || ""}
                          onChange={(e) =>
                            updateEpk("upcomingRelease", {
                              ...(epk.upcomingRelease || {
                                title: "",
                                date: "",
                                coverUrl: "",
                              }),
                              title: e.target.value,
                            })
                          }
                          placeholder="Título del lanzamiento"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slc-muted mb-1">
                          Fecha Estimada
                        </label>
                        <Input
                          value={epk.upcomingRelease?.date || ""}
                          onChange={(e) =>
                            updateEpk("upcomingRelease", {
                              ...(epk.upcomingRelease || {
                                title: "",
                                date: "",
                                coverUrl: "",
                              }),
                              date: e.target.value,
                            })
                          }
                          placeholder="Ej: Verano 2024"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-slc-muted mb-1">
                          URL de Portada
                        </label>
                        <Input
                          value={epk.upcomingRelease?.coverUrl || ""}
                          onChange={(e) =>
                            updateEpk("upcomingRelease", {
                              ...(epk.upcomingRelease || {
                                title: "",
                                date: "",
                                coverUrl: "",
                              }),
                              coverUrl: e.target.value,
                            })
                          }
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <h3 className="font-medium text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Tips para Música
              </h3>
              <ul className="text-sm text-slc-muted space-y-2">
                <li>• Incluye 2-5 tracks que mejor representen tu sonido</li>
                <li>
                  • Asegúrate de que los links funcionen — verifica antes de
                  guardar
                </li>
                <li>
                  • El último lanzamiento es lo primero que verá un promotor
                </li>
                <li>
                  • Los links multi-plataforma facilitan que escuchen tu música
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === "videos" && (
          <div className="space-y-6">
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <Video className="w-5 h-5 text-primary" />
                Videos
              </h2>

              <div className="space-y-8">
                {/* Official Music Videos */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Videos Musicales Oficiales
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Tus videos musicales oficiales con URL y número de vistas.
                  </p>
                  <div className="space-y-4">
                    {(epk.officialMusicVideos || []).map((video, idx) => (
                      <div
                        key={idx}
                        className="bg-slc-dark border border-slc-border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slc-muted">
                            Video #{idx + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = (
                                epk.officialMusicVideos || []
                              ).filter((_, i) => i !== idx);
                              updateEpk("officialMusicVideos", updated);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Título
                            </label>
                            <Input
                              value={video.title || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(epk.officialMusicVideos || []),
                                ];
                                updated[idx] = {
                                  ...updated[idx],
                                  title: e.target.value,
                                };
                                updateEpk("officialMusicVideos", updated);
                              }}
                              placeholder="Título del video"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              URL
                            </label>
                            <Input
                              value={video.url || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(epk.officialMusicVideos || []),
                                ];
                                updated[idx] = {
                                  ...updated[idx],
                                  url: e.target.value,
                                };
                                updateEpk("officialMusicVideos", updated);
                              }}
                              placeholder="https://youtube.com/..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Vistas
                            </label>
                            <Input
                              type="number"
                              value={video.views || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(epk.officialMusicVideos || []),
                                ];
                                updated[idx] = {
                                  ...updated[idx],
                                  views: Number.parseInt(e.target.value) || 0,
                                };
                                updateEpk("officialMusicVideos", updated);
                              }}
                              placeholder="Ej: 500000"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("officialMusicVideos", [
                          ...(epk.officialMusicVideos || []),
                          { title: "", url: "", views: 0 },
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Video Musical
                    </Button>
                  </div>
                </div>

                {/* Live Performance Videos */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Videos de Performance en Vivo
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Capturas de tus presentaciones en vivo.
                  </p>
                  <div className="space-y-4">
                    {(epk.livePerformanceVideos || []).map((video, idx) => (
                      <div
                        key={idx}
                        className="bg-slc-dark border border-slc-border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slc-muted">
                            Video #{idx + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = (
                                epk.livePerformanceVideos || []
                              ).filter((_, i) => i !== idx);
                              updateEpk("livePerformanceVideos", updated);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Título
                            </label>
                            <Input
                              value={video.title || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(epk.livePerformanceVideos || []),
                                ];
                                updated[idx] = {
                                  ...updated[idx],
                                  title: e.target.value,
                                };
                                updateEpk("livePerformanceVideos", updated);
                              }}
                              placeholder="Título o descripción"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              URL
                            </label>
                            <Input
                              value={video.url || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(epk.livePerformanceVideos || []),
                                ];
                                updated[idx] = {
                                  ...updated[idx],
                                  url: e.target.value,
                                };
                                updateEpk("livePerformanceVideos", updated);
                              }}
                              placeholder="https://..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Venue / Evento
                            </label>
                            <Input
                              value={video.venue || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(epk.livePerformanceVideos || []),
                                ];
                                updated[idx] = {
                                  ...updated[idx],
                                  venue: e.target.value,
                                };
                                updateEpk("livePerformanceVideos", updated);
                              }}
                              placeholder="Nombre del venue o evento"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("livePerformanceVideos", [
                          ...(epk.livePerformanceVideos || []),
                          { title: "", url: "", venue: "" },
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Video en Vivo
                    </Button>
                  </div>
                </div>

                {/* Featured Video */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Video Destacado
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    El video principal que quieres mostrar en tu EPK.
                  </p>
                  <div className="bg-slc-dark border border-slc-border rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-slc-muted mb-1">
                          Título
                        </label>
                        <Input
                          value={epk.featuredVideo?.title || ""}
                          onChange={(e) =>
                            updateEpk("featuredVideo", {
                              ...(epk.featuredVideo || {
                                title: "",
                                url: "",
                                platform: "",
                              }),
                              title: e.target.value,
                            })
                          }
                          placeholder="Título del video"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slc-muted mb-1">
                          URL
                        </label>
                        <Input
                          value={epk.featuredVideo?.url || ""}
                          onChange={(e) =>
                            updateEpk("featuredVideo", {
                              ...(epk.featuredVideo || {
                                title: "",
                                url: "",
                                platform: "",
                              }),
                              url: e.target.value,
                            })
                          }
                          placeholder="https://youtube.com/..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slc-muted mb-1">
                          Plataforma
                        </label>
                        <Input
                          value={epk.featuredVideo?.platform || ""}
                          onChange={(e) =>
                            updateEpk("featuredVideo", {
                              ...(epk.featuredVideo || {
                                title: "",
                                url: "",
                                platform: "",
                              }),
                              platform: e.target.value,
                            })
                          }
                          placeholder="YouTube, Vimeo..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <h3 className="font-medium text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Tips para Videos
              </h3>
              <ul className="text-sm text-slc-muted space-y-2">
                <li>
                  • Un video musical profesional vale más que mil palabras
                </li>
                <li>
                  • Los videos en vivo demuestran que puedes actuar — crucial
                  para bookings
                </li>
                <li>
                  • Incluye el número de vistas si es impresionante (más de
                  100K)
                </li>
                <li>
                  • El video destacado será el primero que vea el visitante
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Quotes Tab */}
        {activeTab === "quotes" && (
          <div className="space-y-6">
            <div className="bg-slc-card border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <Quote className="w-5 h-5 text-primary" />
                Citas & Testimonios
              </h2>

              <div className="space-y-8">
                {/* Press Quotes */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Citas de Prensa
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Citas de medios, críticos o periodistas sobre tu música.
                  </p>
                  <div className="space-y-4">
                    {(epk.pressQuotes || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-slc-dark border border-slc-border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slc-muted">
                            Cita #{idx + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = (epk.pressQuotes || []).filter(
                                (_, i) => i !== idx,
                              );
                              updateEpk("pressQuotes", updated);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div>
                          <label className="block text-xs text-slc-muted mb-1">
                            Cita
                          </label>
                          <textarea
                            value={item.quote || ""}
                            onChange={(e) => {
                              const updated = [...(epk.pressQuotes || [])];
                              updated[idx] = {
                                ...updated[idx],
                                quote: e.target.value,
                              };
                              updateEpk("pressQuotes", updated);
                            }}
                            rows={2}
                            className="w-full px-4 py-3 bg-slc-black border border-slc-border rounded-lg resize-none"
                            placeholder='"La cita textual aquí..."'
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Fuente
                            </label>
                            <Input
                              value={item.source || ""}
                              onChange={(e) => {
                                const updated = [...(epk.pressQuotes || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  source: e.target.value,
                                };
                                updateEpk("pressQuotes", updated);
                              }}
                              placeholder="Ej: Rolling Stone México"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              URL (opcional)
                            </label>
                            <Input
                              value={item.sourceUrl || ""}
                              onChange={(e) => {
                                const updated = [...(epk.pressQuotes || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  sourceUrl: e.target.value,
                                };
                                updateEpk("pressQuotes", updated);
                              }}
                              placeholder="https://..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Fecha (opcional)
                            </label>
                            <Input
                              value={item.date || ""}
                              onChange={(e) => {
                                const updated = [...(epk.pressQuotes || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  date: e.target.value,
                                };
                                updateEpk("pressQuotes", updated);
                              }}
                              placeholder="Ej: Marzo 2024"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("pressQuotes", [
                          ...(epk.pressQuotes || []),
                          { quote: "", source: "" },
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Cita de Prensa
                    </Button>
                  </div>
                </div>

                {/* Artist Endorsements */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Avales de Artistas
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Citas de otros artistas sobre ti o tu música.
                  </p>
                  <div className="space-y-4">
                    {(epk.artistEndorsements || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-slc-dark border border-slc-border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slc-muted">
                            Aval #{idx + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = (
                                epk.artistEndorsements || []
                              ).filter((_, i) => i !== idx);
                              updateEpk("artistEndorsements", updated);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Artista
                            </label>
                            <Input
                              value={item.artistName || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(epk.artistEndorsements || []),
                                ];
                                updated[idx] = {
                                  ...updated[idx],
                                  artistName: e.target.value,
                                };
                                updateEpk("artistEndorsements", updated);
                              }}
                              placeholder="Nombre del artista"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Contexto (opcional)
                            </label>
                            <Input
                              value={item.context || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(epk.artistEndorsements || []),
                                ];
                                updated[idx] = {
                                  ...updated[idx],
                                  context: e.target.value,
                                };
                                updateEpk("artistEndorsements", updated);
                              }}
                              placeholder="Ej: En colaboración con..."
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-slc-muted mb-1">
                            Cita
                          </label>
                          <textarea
                            value={item.quote || ""}
                            onChange={(e) => {
                              const updated = [
                                ...(epk.artistEndorsements || []),
                              ];
                              updated[idx] = {
                                ...updated[idx],
                                quote: e.target.value,
                              };
                              updateEpk("artistEndorsements", updated);
                            }}
                            rows={2}
                            className="w-full px-4 py-3 bg-slc-black border border-slc-border rounded-lg resize-none"
                            placeholder='"Lo que dijo el artista..."'
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("artistEndorsements", [
                          ...(epk.artistEndorsements || []),
                          { artistName: "", quote: "" },
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Aval
                    </Button>
                  </div>
                </div>

                {/* Industry Testimonials */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Testimonios de la Industria
                  </label>
                  <p className="text-xs text-slc-muted mb-3">
                    Citas de profesionales de la industria (productores, A&R,
                    managers, etc.).
                  </p>
                  <div className="space-y-4">
                    {(epk.industryTestimonials || []).map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-slc-dark border border-slc-border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slc-muted">
                            Testimonio #{idx + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const updated = (
                                epk.industryTestimonials || []
                              ).filter((_, i) => i !== idx);
                              updateEpk("industryTestimonials", updated);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Nombre
                            </label>
                            <Input
                              value={item.name || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(epk.industryTestimonials || []),
                                ];
                                updated[idx] = {
                                  ...updated[idx],
                                  name: e.target.value,
                                };
                                updateEpk("industryTestimonials", updated);
                              }}
                              placeholder="Nombre completo"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slc-muted mb-1">
                              Rol
                            </label>
                            <Input
                              value={item.role || ""}
                              onChange={(e) => {
                                const updated = [
                                  ...(epk.industryTestimonials || []),
                                ];
                                updated[idx] = {
                                  ...updated[idx],
                                  role: e.target.value,
                                };
                                updateEpk("industryTestimonials", updated);
                              }}
                              placeholder="Ej: A&R, Productor, Bookings Agent..."
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-slc-muted mb-1">
                            Cita
                          </label>
                          <textarea
                            value={item.quote || ""}
                            onChange={(e) => {
                              const updated = [
                                ...(epk.industryTestimonials || []),
                              ];
                              updated[idx] = {
                                ...updated[idx],
                                quote: e.target.value,
                              };
                              updateEpk("industryTestimonials", updated);
                            }}
                            rows={2}
                            className="w-full px-4 py-3 bg-slc-black border border-slc-border rounded-lg resize-none"
                            placeholder='"Su testimonio aquí..."'
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateEpk("industryTestimonials", [
                          ...(epk.industryTestimonials || []),
                          { name: "", role: "", quote: "" },
                        ])
                      }
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Testimonio
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
              <h3 className="font-medium text-primary mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Tips para Citas
              </h3>
              <ul className="text-sm text-slc-muted space-y-2">
                <li>
                  • Las citas de prensa son la forma más poderosa de prueba
                  social
                </li>
                <li>
                  • Siempre usa citas reales y verificables — los promotores
                  verifican
                </li>
                <li>• Un aval de un artista conocido vale oro</li>
                <li>
                  • Los testimonios de la industria son especialmente valiosos
                  para bookings
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
