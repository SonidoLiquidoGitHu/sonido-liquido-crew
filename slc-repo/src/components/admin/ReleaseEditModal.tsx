"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Loader2,
  Music,
  Image as ImageIcon,
  FileText,
  Users,
  Share2,
  Link as LinkIcon,
  Plus,
  Trash2,
  Star,
  Upload,
  ChevronUp,
  ChevronDown,
  CheckCircle,
} from "lucide-react";

interface Track {
  id?: string;
  trackNumber: number;
  title: string;
  artistName: string;
  duration: string;
  audioUrl: string;
  isFeatured: boolean;
}

interface ReleaseData {
  id?: string;
  title: string;
  titleEn: string;
  artistName: string;
  featuredArtists: string;
  releaseType: string;
  releaseDate: string;
  coverImageUrl: string;
  isActive: boolean;
  isPublic: boolean;
  isPublished: boolean;
  descriptionEs: string;
  descriptionEn: string;
  pressReleaseEs: string;
  pressReleaseEn: string;
  creditsEs: string;
  creditsEn: string;
  quotes: string[];
  pressPhotos: string[];
  youtubeVideoId: string;
  soundcloudUrl: string;
  audioPreviewUrl: string;
  spotifyUrl: string;
  presaveOnerpm: string;
  presaveDistrokid: string;
  presaveBandcamp: string;
  presaveDirect: string;
  socialPreviewTitle: string;
  socialPreviewDescription: string;
}

interface Props {
  releaseId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const TABS = [
  { id: "basico", label: "Básico", icon: Music },
  { id: "preview", label: "Preview", icon: Music },
  { id: "tracks", label: "Tracks", icon: Music },
  { id: "presave", label: "Pre-save", icon: LinkIcon },
  { id: "presskit", label: "Press Kit", icon: FileText },
  { id: "social", label: "Social Preview", icon: Share2 },
];

const RELEASE_TYPES = [
  { value: "album", label: "Álbum" },
  { value: "single", label: "Single" },
  { value: "ep", label: "EP" },
  { value: "compilation", label: "Compilación" },
];

export default function ReleaseEditModal({ releaseId, isOpen, onClose, onSave }: Props) {
  const [activeTab, setActiveTab] = useState("basico");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [newQuote, setNewQuote] = useState("");
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ReleaseData>({
    title: "",
    titleEn: "",
    artistName: "",
    featuredArtists: "",
    releaseType: "album",
    releaseDate: "",
    coverImageUrl: "",
    isActive: true,
    isPublic: true,
    isPublished: true,
    descriptionEs: "",
    descriptionEn: "",
    pressReleaseEs: "",
    pressReleaseEn: "",
    creditsEs: "",
    creditsEn: "",
    quotes: [],
    pressPhotos: [],
    youtubeVideoId: "",
    soundcloudUrl: "",
    audioPreviewUrl: "",
    spotifyUrl: "",
    presaveOnerpm: "",
    presaveDistrokid: "",
    presaveBandcamp: "",
    presaveDirect: "",
    socialPreviewTitle: "",
    socialPreviewDescription: "",
  });

  useEffect(() => {
    if (releaseId && isOpen) {
      fetchRelease();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseId, isOpen]);

  const fetchRelease = async () => {
    if (!releaseId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/releases/${releaseId}`);
      const data = await res.json();
      if (data.success) {
        setFormData({
          title: data.release.title || "",
          titleEn: data.release.titleEn || "",
          artistName: data.release.artistName || "",
          featuredArtists: data.release.featuredArtists || "",
          releaseType: data.release.releaseType || "album",
          releaseDate: data.release.releaseDate || "",
          coverImageUrl: data.release.coverImageUrl || "",
          isActive: Boolean(data.release.isActive),
          isPublic: Boolean(data.release.isPublic),
          isPublished: Boolean(data.release.isPublished),
          descriptionEs: data.release.descriptionEs || "",
          descriptionEn: data.release.descriptionEn || "",
          pressReleaseEs: data.release.pressReleaseEs || "",
          pressReleaseEn: data.release.pressReleaseEn || "",
          creditsEs: data.release.creditsEs || "",
          creditsEn: data.release.creditsEn || "",
          quotes: data.release.quotes || [],
          pressPhotos: data.release.pressPhotos || [],
          youtubeVideoId: data.release.youtubeVideoId || "",
          soundcloudUrl: data.release.soundcloudUrl || "",
          audioPreviewUrl: data.release.audioPreviewUrl || "",
          spotifyUrl: data.release.spotifyUrl || "",
          presaveOnerpm: data.release.presaveOnerpm || "",
          presaveDistrokid: data.release.presaveDistrokid || "",
          presaveBandcamp: data.release.presaveBandcamp || "",
          presaveDirect: data.release.presaveDirect || "",
          socialPreviewTitle: data.release.socialPreviewTitle || "",
          socialPreviewDescription: data.release.socialPreviewDescription || "",
        });
        setTracks(data.tracks || []);
      }
    } catch (err) {
      console.error("Error fetching release:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const url = releaseId ? `/api/releases/${releaseId}` : "/api/releases";
      const method = releaseId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, tracks }),
      });

      const data = await res.json();
      if (data.success) {
        onSave();
      }
    } catch (err) {
      console.error("Error saving release:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    try {
      const res = await fetch("/api/newsletter/upload", {
        method: "POST",
        body: formDataUpload,
      });
      const data = await res.json();
      if (data.success) {
        setFormData((prev) => ({ ...prev, coverImageUrl: data.fileUrl }));
      }
    } catch (err) {
      console.error("Error uploading image:", err);
    }
  };

  const addTrack = () => {
    setTracks((prev) => [
      ...prev,
      {
        trackNumber: prev.length + 1,
        title: "",
        artistName: formData.artistName,
        duration: "",
        audioUrl: "",
        isFeatured: false,
      },
    ]);
  };

  const removeTrack = (index: number) => {
    setTracks((prev) => prev.filter((_, i) => i !== index).map((t, i) => ({ ...t, trackNumber: i + 1 })));
  };

  const updateTrack = (index: number, field: keyof Track, value: string | boolean | number) => {
    setTracks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  const moveTrack = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tracks.length) return;
    const newTracks = [...tracks];
    [newTracks[index], newTracks[newIndex]] = [newTracks[newIndex], newTracks[index]];
    setTracks(newTracks.map((t, i) => ({ ...t, trackNumber: i + 1 })));
  };

  const addQuote = () => {
    if (!newQuote.trim()) return;
    setFormData((prev) => ({ ...prev, quotes: [...prev.quotes, newQuote.trim()] }));
    setNewQuote("");
  };

  const removeQuote = (index: number) => {
    setFormData((prev) => ({ ...prev, quotes: prev.quotes.filter((_, i) => i !== index) }));
  };

  const addPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    setFormData((prev) => ({ ...prev, pressPhotos: [...prev.pressPhotos, newPhotoUrl.trim()] }));
    setNewPhotoUrl("");
  };

  const removePhoto = (index: number) => {
    setFormData((prev) => ({ ...prev, pressPhotos: prev.pressPhotos.filter((_, i) => i !== index) }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl mb-8">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 p-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              {releaseId ? "EDITAR RELEASE" : "NUEVO RELEASE"}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-amber-100 text-amber-700"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {tab.label}
                {tab.id === "tracks" && tracks.length > 0 && (
                  <span className="ml-1 text-xs">({tracks.length})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 bg-zinc-900 text-white min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : (
            <>
              {/* Básico Tab */}
              {activeTab === "basico" && (
                <div className="space-y-6">
                  {/* Bilingual Notice */}
                  <div className="p-3 bg-amber-500/20 rounded-lg border border-amber-500/30">
                    <p className="text-amber-300 text-sm">
                      <strong>Contenido Bilingüe:</strong> Puedes ingresar contenido en español e inglés. Los campos en inglés son opcionales.
                    </p>
                  </div>

                  {/* Cover Image */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Imagen del Release</label>
                    <div className="flex gap-4">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-600 transition-colors"
                      >
                        Subir archivo
                      </button>
                      <input
                        type="text"
                        placeholder="O pegar URL de imagen..."
                        value={formData.coverImageUrl}
                        onChange={(e) => setFormData((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
                        className="flex-1 px-3 py-2 bg-white text-gray-900 rounded-lg"
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                    {formData.coverImageUrl && (
                      <div className="mt-3 flex items-start gap-3">
                        <img
                          src={formData.coverImageUrl}
                          alt="Cover"
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                        <div>
                          <p className="text-green-400 text-sm">Imagen cargada</p>
                          <button
                            onClick={() => setFormData((prev) => ({ ...prev, coverImageUrl: "" }))}
                            className="text-red-400 text-sm hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Title ES */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">
                      🇲🇽 Título (Español) *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg"
                      placeholder="Nombre del release"
                    />
                  </div>

                  {/* Title EN */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">
                      🇺🇸 Title (English)
                    </label>
                    <input
                      type="text"
                      value={formData.titleEn}
                      onChange={(e) => setFormData((prev) => ({ ...prev, titleEn: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg"
                      placeholder="Release name (optional)"
                    />
                  </div>

                  {/* Artist */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Artista *</label>
                    <input
                      type="text"
                      value={formData.artistName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, artistName: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg"
                      placeholder="Nombre del artista"
                    />
                  </div>

                  {/* Featured Artists */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Artistas (feat, etc)</label>
                    <input
                      type="text"
                      value={formData.featuredArtists}
                      onChange={(e) => setFormData((prev) => ({ ...prev, featuredArtists: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg"
                      placeholder="Artista 1, Artista 2..."
                    />
                  </div>

                  {/* Release Date */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Fecha de Lanzamiento *</label>
                    <input
                      type="date"
                      value={formData.releaseDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, releaseDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Tipo *</label>
                    <select
                      value={formData.releaseType}
                      onChange={(e) => setFormData((prev) => ({ ...prev, releaseType: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg"
                    >
                      {RELEASE_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description ES */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">
                      🇲🇽 Descripción (Español)
                    </label>
                    <textarea
                      value={formData.descriptionEs}
                      onChange={(e) => setFormData((prev) => ({ ...prev, descriptionEs: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg resize-none"
                      placeholder="Descripción del release para medios..."
                    />
                  </div>

                  {/* Description EN */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">
                      🇺🇸 Description (English)
                    </label>
                    <textarea
                      value={formData.descriptionEn}
                      onChange={(e) => setFormData((prev) => ({ ...prev, descriptionEn: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg resize-none"
                      placeholder="Release description for media (optional)..."
                    />
                  </div>

                  {/* Control de Acceso */}
                  <div className="border-t border-zinc-700 pt-6">
                    <h3 className="text-amber-400 font-bold mb-4">CONTROL DE ACCESO</h3>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isPublished}
                          onChange={(e) => setFormData((prev) => ({ ...prev, isPublished: e.target.checked }))}
                          className="w-5 h-5 rounded"
                        />
                        <span className="text-sm">Publicado (sin código)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                          className="w-5 h-5 rounded"
                        />
                        <span className="text-sm">Activo</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isPublic}
                          onChange={(e) => setFormData((prev) => ({ ...prev, isPublic: e.target.checked }))}
                          className="w-5 h-5 rounded"
                        />
                        <span className="text-sm">Público</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Tab */}
              {activeTab === "preview" && (
                <div className="space-y-6">
                  <div className="p-4 bg-amber-500/20 rounded-xl border border-amber-500/30">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-500 rounded-lg">
                        <Music className="h-5 w-5 text-black" />
                      </div>
                      <div>
                        <h3 className="font-bold text-amber-300">INFORMACIÓN DEL PREVIEW</h3>
                        <p className="text-sm text-amber-200/70 mt-1">
                          Esta información se mostrará junto al reproductor de audio.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Spotify Track ID */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Spotify Track ID</label>
                    <input
                      type="text"
                      value={formData.spotifyUrl}
                      onChange={(e) => setFormData((prev) => ({ ...prev, spotifyUrl: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg"
                      placeholder="Ej: 7IPN2DXiMsVn7XukpFz3Pz"
                    />
                  </div>

                  {/* YouTube Video ID */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">YouTube Video ID</label>
                    <input
                      type="text"
                      value={formData.youtubeVideoId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, youtubeVideoId: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg"
                      placeholder="Ej: dQw4w9WgXcQ"
                    />
                  </div>

                  {/* SoundCloud URL */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">SoundCloud Track URL</label>
                    <input
                      type="text"
                      value={formData.soundcloudUrl}
                      onChange={(e) => setFormData((prev) => ({ ...prev, soundcloudUrl: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg"
                      placeholder="https://soundcloud.com/..."
                    />
                  </div>

                  {/* Audio Preview URL */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Audio Preview (mp3, wav)</label>
                    <input
                      type="text"
                      value={formData.audioPreviewUrl}
                      onChange={(e) => setFormData((prev) => ({ ...prev, audioPreviewUrl: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg"
                      placeholder="URL del archivo de audio"
                    />
                  </div>
                </div>
              )}

              {/* Tracks Tab */}
              {activeTab === "tracks" && (
                <div className="space-y-6">
                  <div className="p-4 bg-purple-500/20 rounded-xl border border-purple-500/30">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <Music className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-purple-300">REPRODUCTOR MULTI-PISTA</h3>
                        <p className="text-sm text-purple-200/70 mt-1">
                          Agrega múltiples pistas de audio para que los medios puedan escuchar el release completo.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tracks Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-amber-400 font-bold">
                      PISTAS DE AUDIO ({tracks.length})
                    </h3>
                    <button
                      onClick={addTrack}
                      className="flex items-center gap-2 px-3 py-1.5 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Pista
                    </button>
                  </div>

                  {/* Tracks List */}
                  <div className="space-y-4">
                    {tracks.map((track, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-xl p-4 text-gray-900"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className="w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-700 rounded-lg font-bold">
                              {track.trackNumber}
                            </span>
                            <button
                              onClick={() => moveTrack(index, "up")}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => moveTrack(index, "down")}
                              disabled={index === tracks.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateTrack(index, "isFeatured", !track.isFeatured)}
                                className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
                                  track.isFeatured
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                <Star className={`h-3 w-3 ${track.isFeatured ? "fill-current" : ""}`} />
                                Marcar como destacado
                              </button>
                              <button
                                onClick={() => removeTrack(index)}
                                className="ml-auto p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>

                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Título *</label>
                              <input
                                type="text"
                                value={track.title}
                                onChange={(e) => updateTrack(index, "title", e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="Nombre de la pista"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Artista</label>
                                <input
                                  type="text"
                                  value={track.artistName}
                                  onChange={(e) => updateTrack(index, "artistName", e.target.value)}
                                  className="w-full px-3 py-2 border rounded-lg"
                                  placeholder="Artista"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Duración</label>
                                <input
                                  type="text"
                                  value={track.duration}
                                  onChange={(e) => updateTrack(index, "duration", e.target.value)}
                                  className="w-full px-3 py-2 border rounded-lg"
                                  placeholder="3:45"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs text-gray-500 mb-1">URL de Audio</label>
                              <input
                                type="text"
                                value={track.audioUrl}
                                onChange={(e) => updateTrack(index, "audioUrl", e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg"
                                placeholder="https://..."
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {tracks.length === 0 && (
                      <div className="text-center py-8 text-zinc-400">
                        <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay pistas agregadas</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pre-save Tab */}
              {activeTab === "presave" && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">OneRPM Pre-save URL</label>
                    <input
                      type="text"
                      value={formData.presaveOnerpm}
                      onChange={(e) => setFormData((prev) => ({ ...prev, presaveOnerpm: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg"
                      placeholder="https://onerpm.link/..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">DistroKid Pre-save URL</label>
                    <input
                      type="text"
                      value={formData.presaveDistrokid}
                      onChange={(e) => setFormData((prev) => ({ ...prev, presaveDistrokid: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg"
                      placeholder="https://distrokid.com/hyperfollow/..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Bandcamp</label>
                    <input
                      type="text"
                      value={formData.presaveBandcamp}
                      onChange={(e) => setFormData((prev) => ({ ...prev, presaveBandcamp: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg"
                      placeholder="https://bandcamp.com/..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Descarga Directa</label>
                    <input
                      type="text"
                      value={formData.presaveDirect}
                      onChange={(e) => setFormData((prev) => ({ ...prev, presaveDirect: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              )}

              {/* Press Kit Tab */}
              {activeTab === "presskit" && (
                <div className="space-y-6">
                  {/* Press Photos */}
                  <div>
                    <h3 className="text-amber-400 font-bold mb-3">Fotos Press Kit (alta resolución)</h3>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {formData.pressPhotos.map((photo, index) => (
                        <div key={index} className="relative aspect-square">
                          <img
                            src={photo}
                            alt={`Press photo ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <button
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPhotoUrl}
                        onChange={(e) => setNewPhotoUrl(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white text-gray-900 rounded-lg"
                        placeholder="Agregar URL de foto..."
                      />
                      <button
                        onClick={addPhoto}
                        className="px-4 py-2 bg-amber-500 text-black rounded-lg hover:bg-amber-600"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>

                  {/* Quotes */}
                  <div className="border-t border-zinc-700 pt-6">
                    <h3 className="text-amber-400 font-bold mb-3">Quotes / Frases Press Kit</h3>
                    {formData.quotes.length === 0 ? (
                      <p className="text-zinc-500 text-sm mb-3">No hay frases cargadas</p>
                    ) : (
                      <div className="space-y-2 mb-3">
                        {formData.quotes.map((quote, index) => (
                          <div key={index} className="flex items-center gap-2 bg-zinc-800 p-2 rounded-lg">
                            <span className="flex-1 text-sm">&ldquo;{quote}&rdquo;</span>
                            <button onClick={() => removeQuote(index)} className="text-red-400">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newQuote}
                        onChange={(e) => setNewQuote(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white text-gray-900 rounded-lg"
                        placeholder="Agregar frase..."
                      />
                      <button
                        onClick={addQuote}
                        className="px-4 py-2 bg-amber-500 text-black rounded-lg hover:bg-amber-600"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>

                  {/* Press Release / Bio */}
                  <div className="border-t border-zinc-700 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-5 w-5 text-zinc-400" />
                      <h3 className="text-amber-400 font-bold">NOTA DE PRENSA / BIO (BILINGÜE)</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-zinc-400 mb-1">
                          🇲🇽 Nota de Prensa (Español)
                        </label>
                        <textarea
                          value={formData.pressReleaseEs}
                          onChange={(e) => setFormData((prev) => ({ ...prev, pressReleaseEs: e.target.value }))}
                          rows={4}
                          className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg resize-none"
                          placeholder="Texto para medios de comunicación..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-zinc-400 mb-1">
                          🇺🇸 Press Release (English)
                        </label>
                        <textarea
                          value={formData.pressReleaseEn}
                          onChange={(e) => setFormData((prev) => ({ ...prev, pressReleaseEn: e.target.value }))}
                          rows={4}
                          className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg resize-none"
                          placeholder="Text for media (optional)..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Credits */}
                  <div className="border-t border-zinc-700 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-5 w-5 text-zinc-400" />
                      <h3 className="text-amber-400 font-bold">CRÉDITOS (BILINGÜE)</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-zinc-400 mb-1">
                          🇲🇽 Créditos (Español)
                        </label>
                        <textarea
                          value={formData.creditsEs}
                          onChange={(e) => setFormData((prev) => ({ ...prev, creditsEs: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg resize-none"
                          placeholder="Producción: ..., Mezcla: ..., Master: ..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-zinc-400 mb-1">
                          🇺🇸 Credits (English)
                        </label>
                        <textarea
                          value={formData.creditsEn}
                          onChange={(e) => setFormData((prev) => ({ ...prev, creditsEn: e.target.value }))}
                          rows={3}
                          className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg resize-none"
                          placeholder="Production: ..., Mix: ..., Master: ... (optional)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Social Preview Tab */}
              {activeTab === "social" && (
                <div className="space-y-6">
                  <div className="p-4 bg-amber-500/20 rounded-xl border border-amber-500/30">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-500 rounded-lg">
                        <Share2 className="h-5 w-5 text-black" />
                      </div>
                      <div>
                        <h3 className="font-bold text-amber-300">VISTA PREVIA EN REDES SOCIALES</h3>
                        <p className="text-sm text-amber-200/70 mt-1">
                          Así aparecerá tu release cuando se comparta
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Social Preview Inputs */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Título para redes</label>
                    <input
                      type="text"
                      value={formData.socialPreviewTitle}
                      onChange={(e) => setFormData((prev) => ({ ...prev, socialPreviewTitle: e.target.value }))}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg"
                      placeholder={formData.title || "Título del release"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Descripción para redes</label>
                    <textarea
                      value={formData.socialPreviewDescription}
                      onChange={(e) => setFormData((prev) => ({ ...prev, socialPreviewDescription: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 bg-white text-gray-900 rounded-lg resize-none"
                      placeholder={`Nuevo lanzamiento de ${formData.artistName || "Artista"}`}
                    />
                  </div>

                  {/* Preview Card */}
                  <div className="bg-white rounded-xl overflow-hidden shadow-lg">
                    {formData.coverImageUrl && (
                      <img
                        src={formData.coverImageUrl}
                        alt="Social preview"
                        className="w-full aspect-video object-cover"
                      />
                    )}
                    <div className="p-4">
                      <p className="text-xs text-gray-500">sonidoliquido.com</p>
                      <p className="font-bold text-gray-900">
                        {formData.socialPreviewTitle || formData.title || "Título del release"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formData.socialPreviewDescription || `Nuevo lanzamiento de ${formData.artistName || "Artista"}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-700 p-4 rounded-b-2xl flex gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving || !formData.title}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Cambios"
            )}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
