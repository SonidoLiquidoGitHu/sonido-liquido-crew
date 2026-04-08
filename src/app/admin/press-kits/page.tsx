"use client";

import { useState, useEffect } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Download,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  User,
  Music,
  Instagram,
  Youtube,
  Mail,
  ChevronDown,
  ChevronUp,
  Quote,
  Video,
  Edit,
  Eye,
  Loader2,
  Plus,
  Trash2,
  Save,
  X,
  GripVertical,
} from "lucide-react";

interface PressQuote {
  quote: string;
  source: string;
  sourceUrl: string;
}

interface FeaturedVideo {
  videoUrl: string;
  title: string;
  platform: string;
  views: number;
  thumbnailUrl: string;
}

interface ExternalProfile {
  platform: string;
  externalUrl: string;
  handle?: string;
}

interface Artist {
  id: string;
  name: string;
  slug: string;
  role: string;
  bio?: string;
  shortBio?: string;
  profileImageUrl?: string;
  pressQuotes?: string; // JSON string
  featuredVideos?: string; // JSON string
  bookingEmail?: string;
  pressEmail?: string;
  externalProfiles?: ExternalProfile[];
}

export default function AdminPressKitsPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null);
  const [selectedArtists, setSelectedArtists] = useState<Set<string>>(new Set());

  // Edit mode state
  const [editingArtist, setEditingArtist] = useState<string | null>(null);
  const [editQuotes, setEditQuotes] = useState<PressQuote[]>([]);
  const [editVideos, setEditVideos] = useState<FeaturedVideo[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/artists");
      const data = await res.json();
      if (data.success && data.data) {
        setArtists(data.data);
      }
    } catch (error) {
      console.error("Error fetching artists:", error);
    } finally {
      setLoading(false);
    }
  };

  const syncAllData = async () => {
    setSyncing(true);
    await fetchArtists();
    setSyncing(false);
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleArtist = (id: string) => {
    if (expandedArtist === id) {
      setExpandedArtist(null);
      setEditingArtist(null);
    } else {
      setExpandedArtist(id);
      // Load current data for editing
      const artist = artists.find(a => a.id === id);
      if (artist) {
        setEditQuotes(parseJson<PressQuote[]>(artist.pressQuotes, []));
        setEditVideos(parseJson<FeaturedVideo[]>(artist.featuredVideos, []));
      }
    }
  };

  const toggleSelectArtist = (id: string) => {
    const newSelected = new Set(selectedArtists);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedArtists(newSelected);
  };

  const selectAll = () => {
    if (selectedArtists.size === artists.length) {
      setSelectedArtists(new Set());
    } else {
      setSelectedArtists(new Set(artists.map((a) => a.id)));
    }
  };

  const parseJson = <T,>(value: string | null | undefined, defaultValue: T): T => {
    if (!value) return defaultValue;
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  };

  const getQuotesCount = (artist: Artist): number => {
    const quotes = parseJson<PressQuote[]>(artist.pressQuotes, []);
    return quotes.length;
  };

  const getVideosCount = (artist: Artist): number => {
    const videos = parseJson<FeaturedVideo[]>(artist.featuredVideos, []);
    return videos.length;
  };

  // Edit mode functions
  const startEditing = (artistId: string) => {
    const artist = artists.find(a => a.id === artistId);
    if (artist) {
      setEditQuotes(parseJson<PressQuote[]>(artist.pressQuotes, []));
      setEditVideos(parseJson<FeaturedVideo[]>(artist.featuredVideos, []));
      setEditingArtist(artistId);
    }
  };

  const cancelEditing = () => {
    setEditingArtist(null);
    // Reset to original data
    const artist = artists.find(a => a.id === expandedArtist);
    if (artist) {
      setEditQuotes(parseJson<PressQuote[]>(artist.pressQuotes, []));
      setEditVideos(parseJson<FeaturedVideo[]>(artist.featuredVideos, []));
    }
  };

  const saveChanges = async (artistId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/artists/${artistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pressQuotes: editQuotes,
          featuredVideos: editVideos,
        }),
      });

      const result = await res.json();
      if (result.success) {
        // Update local state
        setArtists(prev => prev.map(a =>
          a.id === artistId
            ? {
                ...a,
                pressQuotes: JSON.stringify(editQuotes),
                featuredVideos: JSON.stringify(editVideos),
              }
            : a
        ));
        setEditingArtist(null);
        setSaveSuccess(artistId);
        setTimeout(() => setSaveSuccess(null), 3000);
      } else {
        alert("Error al guardar: " + (result.error || "Error desconocido"));
      }
    } catch (error) {
      console.error("Error saving:", error);
      alert("Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  // Quote editing functions
  const addQuote = () => {
    setEditQuotes([...editQuotes, { quote: "", source: "", sourceUrl: "" }]);
  };

  const updateQuote = (index: number, field: keyof PressQuote, value: string) => {
    const updated = [...editQuotes];
    updated[index] = { ...updated[index], [field]: value };
    setEditQuotes(updated);
  };

  const removeQuote = (index: number) => {
    setEditQuotes(editQuotes.filter((_, i) => i !== index));
  };

  // Video editing functions
  const addVideo = () => {
    setEditVideos([...editVideos, {
      videoUrl: "",
      title: "",
      platform: "youtube",
      views: 0,
      thumbnailUrl: ""
    }]);
  };

  const updateVideo = (index: number, field: keyof FeaturedVideo, value: string | number) => {
    const updated = [...editVideos];
    updated[index] = { ...updated[index], [field]: value };
    setEditVideos(updated);
  };

  const removeVideo = (index: number) => {
    setEditVideos(editVideos.filter((_, i) => i !== index));
  };

  // Auto-fetch YouTube thumbnail
  const fetchYouTubeThumbnail = (url: string, index: number) => {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      updateVideo(index, "thumbnailUrl", thumbnailUrl);
    }
  };

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const exportPressKit = () => {
    const selectedData = artists.filter((a) => selectedArtists.has(a.id));
    const data = selectedData.length > 0 ? selectedData : artists;

    let markdown = `# SONIDO LÍQUIDO CREW - PRESS KIT\n\n`;
    markdown += `**El colectivo de Hip Hop más representativo de México**\n`;
    markdown += `Fundado en 1999 en la Ciudad de México.\n\n`;
    markdown += `---\n\n`;
    markdown += `## ROSTER DE ARTISTAS (${data.length})\n\n`;

    for (const artist of data) {
      markdown += `### ${artist.name}\n\n`;
      if (artist.role) markdown += `**Rol:** ${artist.role.toUpperCase()}\n`;
      if (artist.bio) markdown += `**Bio:** ${artist.bio}\n\n`;

      // Press quotes
      const quotes = parseJson<PressQuote[]>(artist.pressQuotes, []);
      if (quotes.length > 0) {
        markdown += `**Citas de Prensa:**\n`;
        for (const q of quotes) {
          markdown += `- "${q.quote}" - ${q.source}\n`;
        }
        markdown += `\n`;
      }

      // Videos
      const videos = parseJson<FeaturedVideo[]>(artist.featuredVideos, []);
      if (videos.length > 0) {
        markdown += `**Videos Destacados:**\n`;
        for (const v of videos) {
          markdown += `- ${v.title} (${v.views?.toLocaleString() || 0} views): ${v.videoUrl}\n`;
        }
        markdown += `\n`;
      }

      markdown += `---\n\n`;
    }

    markdown += `## CONTACTO\n\n`;
    markdown += `**Email:** prensasonidoliquido@gmail.com\n`;
    markdown += `**Teléfono:** +52 55 2801 1881\n`;
    markdown += `**Website:** https://sonidoliquido.com\n\n`;
    markdown += `---\n\n`;
    markdown += `*Generado el ${new Date().toLocaleDateString("es-MX", { dateStyle: "full" })}*\n`;

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sonido-liquido-press-kit-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRoleBadge = (role?: string) => {
    const colors: Record<string, string> = {
      mc: "bg-orange-500/10 text-orange-500",
      dj: "bg-purple-500/10 text-purple-500",
      producer: "bg-blue-500/10 text-blue-500",
      cantante: "bg-pink-500/10 text-pink-500",
    };
    return colors[role || ""] || "bg-slc-card text-slc-muted";
  };

  const getRoleLabel = (role?: string) => {
    const labels: Record<string, string> = {
      mc: "MC",
      dj: "DJ",
      producer: "Productor",
      cantante: "Cantante",
    };
    return labels[role || ""] || role?.toUpperCase() || "Artista";
  };

  const getExternalProfile = (artist: Artist, platform: string) => {
    return artist.externalProfiles?.find((p) => p.platform === platform);
  };

  // Stats
  const artistsWithQuotes = artists.filter((a) => getQuotesCount(a) > 0).length;
  const artistsWithVideos = artists.filter((a) => getVideosCount(a) > 0).length;
  const totalQuotes = artists.reduce((acc, a) => acc + getQuotesCount(a), 0);
  const totalVideos = artists.reduce((acc, a) => acc + getVideosCount(a), 0);

  return (
    <div className="p-6 lg:p-8">
      {/* Links to public pages */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Link
          href="/prensa"
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg text-primary hover:bg-primary/20 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="text-sm font-medium">Ver página pública de prensa</span>
        </Link>
        <Link
          href="/epk/zaque"
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 hover:bg-purple-500/20 transition-colors"
        >
          <FileText className="w-4 h-4" />
          <span className="text-sm font-medium">Ejemplo: EPK de Zaque</span>
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase">Press Kits</h1>
          <p className="text-slc-muted mt-1">
            Información de prensa y recursos para medios - {artists.length} artistas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncAllData} disabled={syncing}>
            {syncing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Actualizar
          </Button>
          <Button onClick={exportPressKit} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar {selectedArtists.size > 0 ? `(${selectedArtists.size})` : "Todo"}
          </Button>
          <Button asChild>
            <Link href="/admin/press-kits/edit">
              <FileText className="w-4 h-4 mr-2" />
              Editar Página General
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-primary">{artists.length}</div>
          <div className="text-xs text-slc-muted uppercase">Artistas</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-cyan-500">{artistsWithQuotes}</div>
          <div className="text-xs text-slc-muted uppercase">Con Citas de Prensa</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-red-500">{artistsWithVideos}</div>
          <div className="text-xs text-slc-muted uppercase">Con Videos</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-yellow-500">{totalQuotes}</div>
          <div className="text-xs text-slc-muted uppercase">Total Citas</div>
        </div>
      </div>

      {/* Select All */}
      <div className="flex items-center justify-between mb-4 p-3 bg-slc-card border border-slc-border rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedArtists.size === artists.length && artists.length > 0}
            onChange={selectAll}
            className="w-4 h-4 rounded border-slc-border"
          />
          <span className="text-sm">
            {selectedArtists.size === artists.length ? "Deseleccionar todos" : "Seleccionar todos"}
          </span>
        </label>
        {selectedArtists.size > 0 && (
          <span className="text-sm text-slc-muted">
            {selectedArtists.size} artista{selectedArtists.size !== 1 ? "s" : ""} seleccionado{selectedArtists.size !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Artists Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slc-muted" />
        </div>
      ) : (
        <div className="space-y-4">
          {artists.map((artist) => {
            const quotes = parseJson<PressQuote[]>(artist.pressQuotes, []);
            const videos = parseJson<FeaturedVideo[]>(artist.featuredVideos, []);
            const spotifyProfile = getExternalProfile(artist, "spotify");
            const instagramProfile = getExternalProfile(artist, "instagram");
            const youtubeProfile = getExternalProfile(artist, "youtube");
            const isEditing = editingArtist === artist.id;
            const isExpanded = expandedArtist === artist.id;

            return (
              <div
                key={artist.id}
                className={`bg-slc-dark border rounded-xl overflow-hidden transition-all ${
                  selectedArtists.has(artist.id) ? "border-primary" : "border-slc-border"
                } ${saveSuccess === artist.id ? "ring-2 ring-green-500/50" : ""}`}
              >
                {/* Artist Header */}
                <div className="flex items-center gap-4 p-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedArtists.has(artist.id)}
                    onChange={() => toggleSelectArtist(artist.id)}
                    className="w-5 h-5 rounded border-slc-border flex-shrink-0"
                  />

                  {/* Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-slc-card flex-shrink-0">
                    {artist.profileImageUrl ? (
                      <SafeImage
                        src={artist.profileImageUrl}
                        alt={artist.name}
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

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-oswald text-xl uppercase">{artist.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getRoleBadge(artist.role)}`}>
                        {getRoleLabel(artist.role)}
                      </span>
                      {saveSuccess === artist.id && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-500 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Guardado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slc-muted">
                      {quotes.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Quote className="w-3 h-3" />
                          {quotes.length} citas
                        </span>
                      )}
                      {videos.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          {videos.length} videos
                        </span>
                      )}
                      {quotes.length === 0 && videos.length === 0 && (
                        <span className="text-yellow-500/70">Sin contenido de prensa</span>
                      )}
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div className="flex items-center gap-2">
                    {spotifyProfile && (
                      <a
                        href={spotifyProfile.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-spotify/10 hover:bg-spotify/20 flex items-center justify-center transition-colors"
                        title="Spotify"
                      >
                        <Music className="w-5 h-5 text-spotify" />
                      </a>
                    )}
                    {instagramProfile && (
                      <a
                        href={instagramProfile.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-pink-500/10 hover:bg-pink-500/20 flex items-center justify-center transition-colors"
                        title="Instagram"
                      >
                        <Instagram className="w-5 h-5 text-pink-500" />
                      </a>
                    )}
                    {youtubeProfile && (
                      <a
                        href={youtubeProfile.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                        title="YouTube"
                      >
                        <Youtube className="w-5 h-5 text-red-500" />
                      </a>
                    )}
                  </div>

                  {/* EPK Editor Button */}
                  <Button
                    asChild
                    variant="default"
                    size="sm"
                    className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                  >
                    <Link href={`/admin/epk/${artist.id}`}>
                      <FileText className="w-4 h-4 mr-1" />
                      Editar EPK
                    </Link>
                  </Button>

                  {/* View Public EPK */}
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                  >
                    <Link href={`/epk/${artist.slug}`} target="_blank">
                      <Eye className="w-4 h-4 mr-1" />
                      Ver EPK
                    </Link>
                  </Button>

                  {/* Expand/Edit Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleArtist(artist.id)}
                    className={isExpanded ? "bg-primary/10 border-primary text-primary" : ""}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    {isExpanded ? "Cerrar" : "Citas & Videos"}
                  </Button>

                  {/* Expand Icon */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleArtist(artist.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </Button>
                </div>

                {/* Expanded Edit Section */}
                {isExpanded && (
                  <div className="border-t border-slc-border p-6 bg-slc-card/30">
                    {/* Edit Mode Toggle */}
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="font-oswald text-lg uppercase">
                        Contenido de Prensa - {artist.name}
                      </h4>
                      <div className="flex gap-2">
                        {!isEditing ? (
                          <Button size="sm" onClick={() => startEditing(artist.id)}>
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                              disabled={saving}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveChanges(artist.id)}
                              disabled={saving}
                            >
                              {saving ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4 mr-1" />
                              )}
                              Guardar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Press Quotes Section */}
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-oswald text-sm uppercase flex items-center gap-2">
                          <Quote className="w-4 h-4 text-cyan-500" />
                          Citas de Prensa ({isEditing ? editQuotes.length : quotes.length})
                        </h5>
                        {isEditing && (
                          <Button type="button" variant="outline" size="sm" onClick={addQuote}>
                            <Plus className="w-4 h-4 mr-1" />
                            Agregar Cita
                          </Button>
                        )}
                      </div>

                      {isEditing ? (
                        // Edit Mode - Quotes
                        <div className="space-y-4">
                          {editQuotes.length === 0 ? (
                            <div className="text-center py-8 text-slc-muted bg-slc-dark rounded-lg">
                              <Quote className="w-10 h-10 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">No hay citas. Haz clic en "Agregar Cita" para comenzar.</p>
                            </div>
                          ) : (
                            editQuotes.map((quote, index) => (
                              <div key={index} className="p-4 bg-slc-dark rounded-lg border border-slc-border">
                                <div className="flex items-start gap-3">
                                  <div className="pt-2">
                                    <GripVertical className="w-4 h-4 text-slc-muted" />
                                  </div>
                                  <div className="flex-1 space-y-3">
                                    <textarea
                                      value={quote.quote}
                                      onChange={(e) => updateQuote(index, "quote", e.target.value)}
                                      placeholder="La cita textual..."
                                      rows={3}
                                      className="w-full px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary"
                                    />
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <input
                                        type="text"
                                        value={quote.source}
                                        onChange={(e) => updateQuote(index, "source", e.target.value)}
                                        placeholder="Fuente (ej: Rolling Stone, Blog, Podcast)"
                                        className="px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
                                      />
                                      <input
                                        type="url"
                                        value={quote.sourceUrl}
                                        onChange={(e) => updateQuote(index, "sourceUrl", e.target.value)}
                                        placeholder="URL de la fuente (opcional)"
                                        className="px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
                                      />
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                    onClick={() => removeQuote(index)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        // View Mode - Quotes
                        <div className="space-y-3">
                          {quotes.length === 0 ? (
                            <div className="text-center py-8 text-slc-muted bg-slc-dark rounded-lg">
                              <Quote className="w-10 h-10 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">No hay citas de prensa.</p>
                              <Button size="sm" className="mt-3" onClick={() => startEditing(artist.id)}>
                                <Plus className="w-4 h-4 mr-1" />
                                Agregar Primera Cita
                              </Button>
                            </div>
                          ) : (
                            quotes.map((quote, index) => (
                              <div key={index} className="p-3 bg-slc-card rounded-lg border-l-2 border-cyan-500">
                                <p className="text-sm italic">"{quote.quote}"</p>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-slc-muted">— {quote.source}</span>
                                  {quote.sourceUrl && (
                                    <a
                                      href={quote.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline"
                                    >
                                      Ver fuente
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Featured Videos Section */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-oswald text-sm uppercase flex items-center gap-2">
                          <Video className="w-4 h-4 text-red-500" />
                          Videos Destacados ({isEditing ? editVideos.length : videos.length})
                        </h5>
                        {isEditing && (
                          <Button type="button" variant="outline" size="sm" onClick={addVideo}>
                            <Plus className="w-4 h-4 mr-1" />
                            Agregar Video
                          </Button>
                        )}
                      </div>

                      {isEditing ? (
                        // Edit Mode - Videos
                        <div className="space-y-4">
                          {editVideos.length === 0 ? (
                            <div className="text-center py-8 text-slc-muted bg-slc-dark rounded-lg">
                              <Video className="w-10 h-10 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">No hay videos. Haz clic en "Agregar Video" para comenzar.</p>
                            </div>
                          ) : (
                            editVideos.map((video, index) => (
                              <div key={index} className="p-4 bg-slc-dark rounded-lg border border-slc-border">
                                <div className="flex items-start gap-3">
                                  <div className="pt-2">
                                    <GripVertical className="w-4 h-4 text-slc-muted" />
                                  </div>
                                  <div className="flex-1 space-y-3">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <input
                                        type="text"
                                        value={video.title}
                                        onChange={(e) => updateVideo(index, "title", e.target.value)}
                                        placeholder="Título del video"
                                        className="px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
                                      />
                                      <div className="flex gap-2">
                                        <input
                                          type="url"
                                          value={video.videoUrl}
                                          onChange={(e) => {
                                            updateVideo(index, "videoUrl", e.target.value);
                                            // Auto-fetch thumbnail when URL changes
                                            if (e.target.value.includes("youtube.com") || e.target.value.includes("youtu.be")) {
                                              fetchYouTubeThumbnail(e.target.value, index);
                                            }
                                          }}
                                          placeholder="URL del video (YouTube)"
                                          className="flex-1 px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
                                        />
                                      </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-3">
                                      <select
                                        value={video.platform}
                                        onChange={(e) => updateVideo(index, "platform", e.target.value)}
                                        className="px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
                                      >
                                        <option value="youtube">YouTube</option>
                                        <option value="vimeo">Vimeo</option>
                                        <option value="other">Otro</option>
                                      </select>
                                      <input
                                        type="number"
                                        value={video.views}
                                        onChange={(e) => updateVideo(index, "views", parseInt(e.target.value) || 0)}
                                        placeholder="Vistas"
                                        className="px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
                                      />
                                      <input
                                        type="url"
                                        value={video.thumbnailUrl}
                                        onChange={(e) => updateVideo(index, "thumbnailUrl", e.target.value)}
                                        placeholder="URL de miniatura (auto para YT)"
                                        className="px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
                                      />
                                    </div>
                                    {video.thumbnailUrl && (
                                      <div className="mt-2">
                                        <img
                                          src={video.thumbnailUrl}
                                          alt={video.title}
                                          className="w-32 h-20 rounded object-cover"
                                        />
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                    onClick={() => removeVideo(index)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        // View Mode - Videos
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {videos.length === 0 ? (
                            <div className="col-span-full text-center py-8 text-slc-muted bg-slc-dark rounded-lg">
                              <Video className="w-10 h-10 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">No hay videos destacados.</p>
                              <Button size="sm" className="mt-3" onClick={() => startEditing(artist.id)}>
                                <Plus className="w-4 h-4 mr-1" />
                                Agregar Primer Video
                              </Button>
                            </div>
                          ) : (
                            videos.map((video, index) => (
                              <a
                                key={index}
                                href={video.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex gap-3 p-3 bg-slc-card rounded-lg hover:bg-slc-card/80 transition-colors group"
                              >
                                <div className="w-24 h-14 rounded overflow-hidden bg-slc-dark flex-shrink-0">
                                  {video.thumbnailUrl ? (
                                    <img
                                      src={video.thumbnailUrl}
                                      alt={video.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Youtube className="w-6 h-6 text-slc-muted" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                    {video.title}
                                  </p>
                                  <p className="text-xs text-slc-muted mt-1">
                                    {video.views?.toLocaleString() || 0} views
                                  </p>
                                </div>
                              </a>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 pt-4 border-t border-slc-border">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/artistas/${artist.slug}`} target="_blank">
                          <Eye className="w-4 h-4 mr-1" />
                          Ver Perfil Público
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/artists/${artist.id}`}>
                          <User className="w-4 h-4 mr-1" />
                          Editar Artista Completo
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Press Contact Section */}
      <div className="mt-8 bg-slc-dark border border-slc-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <h2 className="font-oswald text-xl uppercase">Contacto de Prensa</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slc-card rounded-lg">
            <span className="text-sm text-slc-muted">Email</span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-medium">prensasonidoliquido@gmail.com</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => copyToClipboard("prensasonidoliquido@gmail.com", "email")}
              >
                {copiedId === "email" ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="p-4 bg-slc-card rounded-lg">
            <span className="text-sm text-slc-muted">Teléfono</span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-medium">+52 55 2801 1881</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => copyToClipboard("+525528011881", "phone")}
              >
                {copiedId === "phone" ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="p-4 bg-slc-card rounded-lg">
            <span className="text-sm text-slc-muted">Ubicación</span>
            <div className="mt-1">
              <span className="font-medium">Ciudad de México, CDMX</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
