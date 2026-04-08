"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropboxUploadButton } from "@/components/admin/DropboxUploadButton";
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  FileText,
  Image as ImageIcon,
  BarChart3,
  Newspaper,
  ListMusic,
  Calendar,
  Users,
  Music,
  Video,
  Quote,
  Mail,
  Wrench,
  Download,
  Settings,
  Eye,
  ExternalLink,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Copy,
  Sparkles,
  Globe,
  Instagram,
  Youtube,
  Twitter,
  Play,
  Mic,
  MapPin,
  Phone,
  Building,
  Star,
  TrendingUp,
  Award,
  Palette,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  pressFeatures?: { outlet: string; title: string; url: string; date: string; excerpt?: string }[];
  blogMentions?: string[];
  interviewUrls?: string[];

  // Playlists
  editorialPlaylists?: { name: string; platform: string; followers: number; url: string }[];
  curatedPlaylists?: { name: string; curator: string; url: string }[];

  // Shows
  pastShows?: { venue: string; city: string; date: string; attendance?: number; type: string }[];
  festivalAppearances?: string[];
  notableVenues?: string[];
  tourHistory?: string[];

  // Collaborations
  collaborations?: { artistName: string; trackName: string; year: number; type: string }[];
  producerCredits?: string[];
  remixCredits?: string[];

  // Music
  topTracks?: { title: string; url: string; platform: string }[];
  latestRelease?: { title: string; date: string; coverUrl: string; links: Record<string, string> };
  upcomingRelease?: { title: string; date: string; coverUrl: string };

  // Videos
  officialMusicVideos?: { title: string; url: string; views: number }[];
  livePerformanceVideos?: { title: string; url: string; venue: string }[];
  featuredVideo?: { title: string; url: string; platform: string };

  // Quotes
  pressQuotes?: { quote: string; source: string; sourceUrl?: string; date?: string }[];
  artistEndorsements?: { artistName: string; quote: string; context?: string }[];
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

export default function EpkEditorPage({ params }: { params: Promise<{ artistId: string }> }) {
  const { artistId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [epk, setEpk] = useState<EpkData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("identity");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

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
          storyHighlights: epkData.storyHighlights ? JSON.parse(epkData.storyHighlights) : [],
          brandColors: epkData.brandColors ? JSON.parse(epkData.brandColors) : [],
          spotifyTopTrack: epkData.spotifyTopTrack ? JSON.parse(epkData.spotifyTopTrack) : null,
          streamingHighlights: epkData.streamingHighlights ? JSON.parse(epkData.streamingHighlights) : [],
          pressFeatures: epkData.pressFeatures ? JSON.parse(epkData.pressFeatures) : [],
          blogMentions: epkData.blogMentions ? JSON.parse(epkData.blogMentions) : [],
          interviewUrls: epkData.interviewUrls ? JSON.parse(epkData.interviewUrls) : [],
          editorialPlaylists: epkData.editorialPlaylists ? JSON.parse(epkData.editorialPlaylists) : [],
          curatedPlaylists: epkData.curatedPlaylists ? JSON.parse(epkData.curatedPlaylists) : [],
          pastShows: epkData.pastShows ? JSON.parse(epkData.pastShows) : [],
          festivalAppearances: epkData.festivalAppearances ? JSON.parse(epkData.festivalAppearances) : [],
          notableVenues: epkData.notableVenues ? JSON.parse(epkData.notableVenues) : [],
          tourHistory: epkData.tourHistory ? JSON.parse(epkData.tourHistory) : [],
          collaborations: epkData.collaborations ? JSON.parse(epkData.collaborations) : [],
          producerCredits: epkData.producerCredits ? JSON.parse(epkData.producerCredits) : [],
          remixCredits: epkData.remixCredits ? JSON.parse(epkData.remixCredits) : [],
          topTracks: epkData.topTracks ? JSON.parse(epkData.topTracks) : [],
          latestRelease: epkData.latestRelease ? JSON.parse(epkData.latestRelease) : null,
          upcomingRelease: epkData.upcomingRelease ? JSON.parse(epkData.upcomingRelease) : null,
          officialMusicVideos: epkData.officialMusicVideos ? JSON.parse(epkData.officialMusicVideos) : [],
          livePerformanceVideos: epkData.livePerformanceVideos ? JSON.parse(epkData.livePerformanceVideos) : [],
          featuredVideo: epkData.featuredVideo ? JSON.parse(epkData.featuredVideo) : null,
          pressQuotes: epkData.pressQuotes ? JSON.parse(epkData.pressQuotes) : [],
          artistEndorsements: epkData.artistEndorsements ? JSON.parse(epkData.artistEndorsements) : [],
          industryTestimonials: epkData.industryTestimonials ? JSON.parse(epkData.industryTestimonials) : [],
          setLengthOptions: epkData.setLengthOptions ? JSON.parse(epkData.setLengthOptions) : [],
          technicalRequirements: epkData.technicalRequirements ? JSON.parse(epkData.technicalRequirements) : {},
          backlineNeeds: epkData.backlineNeeds ? JSON.parse(epkData.backlineNeeds) : [],
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

  const updateEpk = (field: keyof EpkData, value: any) => {
    setEpk(prev => prev ? { ...prev, [field]: value } : null);
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
                  <SafeImage
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
                  <h1 className="font-oswald text-xl uppercase">{artist.name}</h1>
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

              <Button
                asChild
                variant="outline"
                size="sm"
              >
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
            <div className={cn(
              "mt-3 p-3 rounded-lg flex items-center gap-2 text-sm",
              message.type === "success"
                ? "bg-green-500/10 text-green-500 border border-green-500/20"
                : "bg-red-500/10 text-red-500 border border-red-500/20"
            )}>
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
                    : "border-transparent text-slc-muted hover:text-white"
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
                    Responde en una línea: ¿quién eres y por qué debería importar?
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
                    Sé específico. No "urbano" - mejor "trap melódico con elementos de regional mexicano"
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
                    onChange={(e) => updateEpk("subgenres", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
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
                <li>• El tagline es lo primero que leerá un promotor - hazlo memorable</li>
                <li>• Evita términos genéricos como "urbano" o "música de calle"</li>
                <li>• Menciona tu ubicación - es importante para bookings</li>
                <li>• Si tu identidad es vaga, el resto del EPK no te salvará</li>
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
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      wordCount(epk.bioShort || "") >= 50 && wordCount(epk.bioShort || "") <= 80
                        ? "bg-green-500/10 text-green-500"
                        : "bg-yellow-500/10 text-yellow-500"
                    )}>
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
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full",
                      wordCount(epk.bioLong || "") >= 150 && wordCount(epk.bioLong || "") <= 300
                        ? "bg-green-500/10 text-green-500"
                        : "bg-yellow-500/10 text-yellow-500"
                    )}>
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
                    Versión formal para medios. Puede incluir más detalles y logros.
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
              <h3 className="font-medium text-red-400 mb-3">Evita en tus bios:</h3>
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
                      <label className="block text-xs text-slc-muted mb-2">Logo Principal</label>
                      <div className="aspect-square bg-slc-dark border border-slc-border rounded-lg overflow-hidden relative">
                        {epk.logoUrl ? (
                          <SafeImage src={epk.logoUrl} alt="Logo" fill className="object-contain p-4" />
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
                      <label className="block text-xs text-slc-muted mb-2">Logo Transparente (PNG)</label>
                      <div className="aspect-square bg-[repeating-conic-gradient(#333_0%_25%,#222_0%_50%)] bg-[length:16px_16px] border border-slc-border rounded-lg overflow-hidden relative">
                        {epk.logoTransparentUrl ? (
                          <SafeImage src={epk.logoTransparentUrl} alt="Logo" fill className="object-contain p-4" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slc-dark/50">
                            <ImageIcon className="w-8 h-8 text-slc-muted" />
                          </div>
                        )}
                      </div>
                      <DropboxUploadButton
                        onUploadComplete={(url) => updateEpk("logoTransparentUrl", url)}
                        uploadPath="/epk/logos"
                        buttonText="Subir"
                        className="w-full mt-2"
                        size="sm"
                      />
                    </div>

                    {/* White Logo */}
                    <div>
                      <label className="block text-xs text-slc-muted mb-2">Logo Blanco</label>
                      <div className="aspect-square bg-gray-800 border border-slc-border rounded-lg overflow-hidden relative">
                        {epk.logoWhiteUrl ? (
                          <SafeImage src={epk.logoWhiteUrl} alt="Logo" fill className="object-contain p-4" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-slc-muted" />
                          </div>
                        )}
                      </div>
                      <DropboxUploadButton
                        onUploadComplete={(url) => updateEpk("logoWhiteUrl", url)}
                        uploadPath="/epk/logos"
                        buttonText="Subir"
                        className="w-full mt-2"
                        size="sm"
                      />
                    </div>

                    {/* Black Logo */}
                    <div>
                      <label className="block text-xs text-slc-muted mb-2">Logo Negro</label>
                      <div className="aspect-square bg-gray-100 border border-slc-border rounded-lg overflow-hidden relative">
                        {epk.logoBlackUrl ? (
                          <SafeImage src={epk.logoBlackUrl} alt="Logo" fill className="object-contain p-4" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <DropboxUploadButton
                        onUploadComplete={(url) => updateEpk("logoBlackUrl", url)}
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
                            const newColors = (epk.brandColors || []).filter((_, i) => i !== idx);
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
                      onClick={() => updateEpk("brandColors", [...(epk.brandColors || []), "#000000"])}
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
                <li>• Mantén una estética consistente (esto señala profesionalismo)</li>
                <li>• Incluye: retrato, performance, y foto estilizada/editorial</li>
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
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    Spotify
                  </h3>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">Oyentes Mensuales</label>
                    <Input
                      type="number"
                      value={epk.spotifyMonthlyListeners || ""}
                      onChange={(e) => updateEpk("spotifyMonthlyListeners", parseInt(e.target.value) || 0)}
                      placeholder="Ej: 50000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">Seguidores</label>
                    <Input
                      type="number"
                      value={epk.spotifyFollowers || ""}
                      onChange={(e) => updateEpk("spotifyFollowers", parseInt(e.target.value) || 0)}
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
                    <label className="block text-xs text-slc-muted mb-1">Suscriptores</label>
                    <Input
                      type="number"
                      value={epk.youtubeSubscribers || ""}
                      onChange={(e) => updateEpk("youtubeSubscribers", parseInt(e.target.value) || 0)}
                      placeholder="Ej: 25000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">Vistas Totales</label>
                    <Input
                      type="number"
                      value={epk.youtubeTotalViews || ""}
                      onChange={(e) => updateEpk("youtubeTotalViews", parseInt(e.target.value) || 0)}
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
                    <label className="block text-xs text-slc-muted mb-1">Seguidores</label>
                    <Input
                      type="number"
                      value={epk.instagramFollowers || ""}
                      onChange={(e) => updateEpk("instagramFollowers", parseInt(e.target.value) || 0)}
                      placeholder="Ej: 15000"
                    />
                  </div>
                </div>

                {/* TikTok Stats */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                    </svg>
                    TikTok
                  </h3>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">Seguidores</label>
                    <Input
                      type="number"
                      value={epk.tiktokFollowers || ""}
                      onChange={(e) => updateEpk("tiktokFollowers", parseInt(e.target.value) || 0)}
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
                  onChange={(e) => updateEpk("totalStreams", parseInt(e.target.value) || 0)}
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
                    <label className="block text-xs text-slc-muted mb-1">Email de Booking</label>
                    <Input
                      type="email"
                      value={epk.bookingEmail || ""}
                      onChange={(e) => updateEpk("bookingEmail", e.target.value)}
                      placeholder="booking@ejemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">Teléfono de Booking</label>
                    <Input
                      value={epk.bookingPhone || ""}
                      onChange={(e) => updateEpk("bookingPhone", e.target.value)}
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
                    <label className="block text-xs text-slc-muted mb-1">Nombre del Manager</label>
                    <Input
                      value={epk.managementName || ""}
                      onChange={(e) => updateEpk("managementName", e.target.value)}
                      placeholder="Nombre del manager"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">Email</label>
                    <Input
                      type="email"
                      value={epk.managementEmail || ""}
                      onChange={(e) => updateEpk("managementEmail", e.target.value)}
                      placeholder="manager@ejemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">Teléfono</label>
                    <Input
                      value={epk.managementPhone || ""}
                      onChange={(e) => updateEpk("managementPhone", e.target.value)}
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
                    <label className="block text-xs text-slc-muted mb-1">Nombre</label>
                    <Input
                      value={epk.publicistName || ""}
                      onChange={(e) => updateEpk("publicistName", e.target.value)}
                      placeholder="Nombre del publicista"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">Email</label>
                    <Input
                      type="email"
                      value={epk.publicistEmail || ""}
                      onChange={(e) => updateEpk("publicistEmail", e.target.value)}
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
                    <label className="block text-xs text-slc-muted mb-1">Nombre del Sello</label>
                    <Input
                      value={epk.labelName || ""}
                      onChange={(e) => updateEpk("labelName", e.target.value)}
                      placeholder="Nombre del sello"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slc-muted mb-1">Contacto del Sello</label>
                    <Input
                      value={epk.labelContact || ""}
                      onChange={(e) => updateEpk("labelContact", e.target.value)}
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
                <li>• Usa un email profesional (evita Gmail con números aleatorios)</li>
                <li>• Haz que sea fácil contactarte - no escondas la información</li>
                <li>• Si tienes manager, incluye su info para agilizar bookings</li>
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
                    onChange={(e) => updateEpk("performanceFormat", e.target.value)}
                    className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="live_band">Banda en Vivo</option>
                    <option value="dj_set">DJ Set</option>
                    <option value="dj_vocals">DJ + Vocales</option>
                    <option value="solo_acoustic">Solo Acústico</option>
                    <option value="playback">Playback + Vocals</option>
                    <option value="hybrid">Híbrido (Pistas + Instrumentos)</option>
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
                    onChange={(e) => updateEpk("setLengthOptions", e.target.value.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n)))}
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
                    onChange={(e) => updateEpk("stageRequirements", e.target.value)}
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
                    onChange={(e) => updateEpk("backlineNeeds", e.target.value.split("\n").filter(Boolean))}
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
                    onChange={(e) => updateEpk("hospitalityRider", e.target.value)}
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
                    onChange={(e) => updateEpk("travelRequirements", e.target.value)}
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
                La mayoría de los artistas omiten el rider técnico y lucen mal preparados.
                Tener esta información lista señala que estás listo para ser bookeado.
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
                      <p className="text-xs text-slc-muted">Documento completo para prensa</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {epk.pressKitPdfUrl && (
                      <a href={epk.pressKitPdfUrl} target="_blank" className="text-primary text-sm hover:underline">
                        Ver actual
                      </a>
                    )}
                    <DropboxUploadButton
                      onUploadComplete={(url) => updateEpk("pressKitPdfUrl", url)}
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
                      <p className="text-xs text-slc-muted">Fotos de prensa en 300 DPI</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {epk.hiResPhotosZipUrl && (
                      <a href={epk.hiResPhotosZipUrl} target="_blank" className="text-primary text-sm hover:underline">
                        Ver actual
                      </a>
                    )}
                    <DropboxUploadButton
                      onUploadComplete={(url) => updateEpk("hiResPhotosZipUrl", url)}
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
                      <p className="text-xs text-slc-muted">PNG + Transparentes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {epk.logoPackZipUrl && (
                      <a href={epk.logoPackZipUrl} target="_blank" className="text-primary text-sm hover:underline">
                        Ver actual
                      </a>
                    )}
                    <DropboxUploadButton
                      onUploadComplete={(url) => updateEpk("logoPackZipUrl", url)}
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
                      <p className="text-xs text-slc-muted">Documento técnico para venues</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {epk.technicalRiderPdfUrl && (
                      <a href={epk.technicalRiderPdfUrl} target="_blank" className="text-primary text-sm hover:underline">
                        Ver actual
                      </a>
                    )}
                    <DropboxUploadButton
                      onUploadComplete={(url) => updateEpk("technicalRiderPdfUrl", url)}
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
                      <p className="text-xs text-slc-muted">Diagrama de escenario</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {epk.stageplotUrl && (
                      <a href={epk.stageplotUrl} target="_blank" className="text-primary text-sm hover:underline">
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
                    <p className="text-xs text-slc-muted">Permitir acceso público al EPK</p>
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
                    <span className="text-slc-muted">sonidoliquido.com/epk/</span>
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
                    <p className="font-medium">Mostrar Formulario de Contacto</p>
                    <p className="text-xs text-slc-muted">Permite que te contacten desde el EPK</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={epk.showContactForm ?? true}
                      onChange={(e) => updateEpk("showContactForm", e.target.checked)}
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
                  <h3 className="text-sm font-medium mb-4">Estadísticas del EPK</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slc-dark rounded-lg text-center">
                      <p className="font-oswald text-2xl text-primary">{epk.viewCount || 0}</p>
                      <p className="text-xs text-slc-muted">Vistas</p>
                    </div>
                    <div className="p-4 bg-slc-dark rounded-lg text-center">
                      <p className="font-oswald text-2xl text-green-500">{epk.downloadCount || 0}</p>
                      <p className="text-xs text-slc-muted">Descargas</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder for other tabs */}
        {["press", "playlists", "shows", "collaborations", "music", "videos", "quotes"].includes(activeTab) && (
          <div className="bg-slc-card border border-slc-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-slc-dark flex items-center justify-center mx-auto mb-4">
              {tabs.find(t => t.id === activeTab)?.icon && (
                <span className="text-slc-muted">
                  {(() => {
                    const Icon = tabs.find(t => t.id === activeTab)?.icon;
                    return Icon ? <Icon className="w-8 h-8" /> : null;
                  })()}
                </span>
              )}
            </div>
            <h3 className="font-oswald text-xl uppercase mb-2">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <p className="text-slc-muted mb-4">
              Esta sección está en desarrollo. Pronto podrás agregar información aquí.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
