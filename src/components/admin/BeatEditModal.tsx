"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Loader2,
  Music,
  Image as ImageIcon,
  Play,
  Lock,
  Plus,
  Trash2,
  Upload,
  Info,
  Link as LinkIcon,
} from "lucide-react";

interface DownloadGateAction {
  id?: string;
  actionType: string;
  label: string;
  url: string;
}

interface BeatData {
  id?: string;
  title: string;
  producerName: string;
  releaseDate: string;
  bpm: string;
  keySignature: string;
  tags: string;
  coverImageUrl: string;
  audioFileUrl: string;
  audioPreviewUrl: string;
  hypedditUrl: string;
  spotifyTrackId: string;
  youtubeVideoId: string;
  onerpmUrl: string;
  distrokidUrl: string;
  bandcampUrl: string;
  downloadGateEnabled: boolean;
  downloadGateActions: DownloadGateAction[];
  isAvailable: boolean;
  isFeatured: boolean;
}

interface Props {
  beatId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const TABS = [
  { id: "basico", label: "Básico" },
  { id: "archivo", label: "Archivo" },
  { id: "preview", label: "Preview" },
  { id: "downloadgate", label: "Download Gate" },
];

const ACTION_TYPES = [
  { value: "subscribe_email", label: "Suscribirse Email" },
  { value: "follow_spotify", label: "Seguir en Spotify" },
  { value: "follow_youtube", label: "Suscribirse YouTube" },
  { value: "follow_instagram", label: "Seguir Instagram" },
  { value: "follow_soundcloud", label: "Seguir SoundCloud" },
  { value: "visit_link", label: "Visitar Link" },
];

const COVER_OPTIONS = ["URL", "Subir", "Sugeridas"];

export default function BeatEditModal({ beatId, isOpen, onClose, onSave }: Props) {
  const [activeTab, setActiveTab] = useState("basico");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [coverInputMode, setCoverInputMode] = useState("URL");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<BeatData>({
    title: "",
    producerName: "",
    releaseDate: new Date().toISOString().split("T")[0],
    bpm: "90",
    keySignature: "Am",
    tags: "",
    coverImageUrl: "",
    audioFileUrl: "",
    audioPreviewUrl: "",
    hypedditUrl: "",
    spotifyTrackId: "",
    youtubeVideoId: "",
    onerpmUrl: "",
    distrokidUrl: "",
    bandcampUrl: "",
    downloadGateEnabled: false,
    downloadGateActions: [],
    isAvailable: true,
    isFeatured: false,
  });

  useEffect(() => {
    if (beatId && isOpen) {
      fetchBeat();
    } else if (!beatId && isOpen) {
      // Reset form for new beat
      setFormData({
        title: "",
        producerName: "",
        releaseDate: new Date().toISOString().split("T")[0],
        bpm: "90",
        keySignature: "Am",
        tags: "",
        coverImageUrl: "",
        audioFileUrl: "",
        audioPreviewUrl: "",
        hypedditUrl: "",
        spotifyTrackId: "",
        youtubeVideoId: "",
        onerpmUrl: "",
        distrokidUrl: "",
        bandcampUrl: "",
        downloadGateEnabled: false,
        downloadGateActions: [],
        isAvailable: true,
        isFeatured: false,
      });
      setActiveTab("basico");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatId, isOpen]);

  const fetchBeat = async () => {
    if (!beatId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/beats/${beatId}`);
      const data = await res.json();
      if (data.success) {
        setFormData({
          title: data.beat.title || "",
          producerName: data.beat.producerName || "",
          releaseDate: data.beat.releaseDate || new Date().toISOString().split("T")[0],
          bpm: data.beat.bpm?.toString() || "90",
          keySignature: data.beat.keySignature || "Am",
          tags: data.beat.tags || "",
          coverImageUrl: data.beat.coverImageUrl || "",
          audioFileUrl: data.beat.audioFileUrl || "",
          audioPreviewUrl: data.beat.audioPreviewUrl || "",
          hypedditUrl: data.beat.hypedditUrl || "",
          spotifyTrackId: data.beat.spotifyTrackId || "",
          youtubeVideoId: data.beat.youtubeVideoId || "",
          onerpmUrl: data.beat.onerpmUrl || "",
          distrokidUrl: data.beat.distrokidUrl || "",
          bandcampUrl: data.beat.bandcampUrl || "",
          downloadGateEnabled: data.beat.downloadGateEnabled || false,
          downloadGateActions: data.beat.downloadGateActions || [],
          isAvailable: data.beat.isAvailable ?? true,
          isFeatured: data.beat.isFeatured || false,
        });
      }
    } catch (err) {
      console.error("Error fetching beat:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const url = beatId ? `/api/beats/${beatId}` : "/api/beats";
      const method = beatId ? "PUT" : "POST";

      const payload = {
        ...formData,
        bpm: formData.bpm ? parseInt(formData.bpm) : null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        onSave();
      }
    } catch (err) {
      console.error("Error saving beat:", err);
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

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setFormData((prev) => ({ ...prev, audioFileUrl: data.fileUrl }));
      }
    } catch (err) {
      console.error("Error uploading audio:", err);
    }
  };

  const addAction = () => {
    setFormData((prev) => ({
      ...prev,
      downloadGateActions: [
        ...prev.downloadGateActions,
        { actionType: "subscribe_email", label: "Email", url: "" },
      ],
    }));
  };

  const removeAction = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      downloadGateActions: prev.downloadGateActions.filter((_, i) => i !== index),
    }));
  };

  const updateAction = (index: number, field: keyof DownloadGateAction, value: string) => {
    setFormData((prev) => ({
      ...prev,
      downloadGateActions: prev.downloadGateActions.map((action, i) =>
        i === index ? { ...action, [field]: value } : action
      ),
    }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl mb-8">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 p-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 uppercase">
              {beatId ? "EDITAR BEAT" : "AGREGAR NUEVO BEAT"}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-zinc-100 rounded-lg p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? "bg-zinc-800 text-white"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab.label}
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
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Título *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-3 bg-white text-gray-900 rounded-lg"
                      placeholder="Nombre del beat"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Productor (Artista) *</label>
                    <input
                      type="text"
                      value={formData.producerName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, producerName: e.target.value }))}
                      className="w-full px-3 py-3 bg-white text-gray-900 rounded-lg"
                      placeholder="Nombre del productor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Fecha de Lanzamiento *</label>
                    <div className="px-3 py-3 bg-zinc-700 text-white rounded-lg text-center">
                      {formatDate(formData.releaseDate)}
                    </div>
                    <input
                      type="date"
                      value={formData.releaseDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, releaseDate: e.target.value }))}
                      className="w-full mt-2 px-3 py-2 bg-zinc-800 text-white rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">BPM</label>
                      <input
                        type="number"
                        value={formData.bpm}
                        onChange={(e) => setFormData((prev) => ({ ...prev, bpm: e.target.value }))}
                        className="w-full px-3 py-3 bg-white text-gray-900 rounded-lg"
                        placeholder="90"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1">Tonalidad</label>
                      <input
                        type="text"
                        value={formData.keySignature}
                        onChange={(e) => setFormData((prev) => ({ ...prev, keySignature: e.target.value }))}
                        className="w-full px-3 py-3 bg-white text-gray-900 rounded-lg"
                        placeholder="Am"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Tags (separados por coma)</label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                      className="w-full px-3 py-3 bg-white text-gray-900 rounded-lg"
                      placeholder="trap, oscuro, 808..."
                    />
                  </div>

                  {/* Cover Image */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Imagen de Portada</label>
                    <div className="flex gap-1 bg-zinc-700 rounded-lg p-1 mb-3">
                      {COVER_OPTIONS.map((option) => (
                        <button
                          key={option}
                          onClick={() => setCoverInputMode(option)}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            coverInputMode === option
                              ? "bg-amber-500 text-black"
                              : "text-zinc-300 hover:bg-zinc-600"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    {coverInputMode === "URL" && (
                      <input
                        type="text"
                        value={formData.coverImageUrl}
                        onChange={(e) => setFormData((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
                        className="w-full px-3 py-3 bg-white text-gray-900 rounded-lg"
                        placeholder="https://..."
                      />
                    )}

                    {coverInputMode === "Subir" && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-3 border-2 border-dashed border-zinc-600 rounded-lg text-zinc-400 hover:border-amber-500 hover:text-amber-500 transition-colors"
                        >
                          <Upload className="h-5 w-5 mx-auto mb-1" />
                          Seleccionar imagen
                        </button>
                      </>
                    )}

                    {coverInputMode === "Sugeridas" && (
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map((i) => (
                          <button
                            key={i}
                            className="aspect-square bg-zinc-700 rounded-lg hover:ring-2 ring-amber-500"
                          />
                        ))}
                      </div>
                    )}

                    {formData.coverImageUrl && (
                      <div className="mt-3 relative w-24 h-24">
                        <img
                          src={formData.coverImageUrl}
                          alt="Cover"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          onClick={() => setFormData((prev) => ({ ...prev, coverImageUrl: "" }))}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Checkboxes */}
                  <div className="flex items-center gap-6 pt-4 border-t border-zinc-700">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isAvailable}
                        onChange={(e) => setFormData((prev) => ({ ...prev, isAvailable: e.target.checked }))}
                        className="w-5 h-5 rounded accent-emerald-500"
                      />
                      <span className="text-sm">Disponible</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                        className="w-5 h-5 rounded accent-amber-500"
                      />
                      <span className="text-sm">Destacado</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Archivo Tab */}
              {activeTab === "archivo" && (
                <div className="space-y-6">
                  {/* Info Card */}
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-500 rounded-lg">
                        <Music className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-amber-800">ARCHIVO DEL BEAT PARA DESCARGA</h3>
                        <p className="text-sm text-amber-700 mt-1">
                          Sube el archivo MP3 o WAV que los usuarios podrán descargar después de completar el download gate.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Upload Section */}
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Subir Archivo del Beat (MP3, WAV)</label>

                    <div className="bg-blue-100 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                      <Info className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-600">En móvil, los archivos se suben sin comprimir</span>
                    </div>

                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/mp3,audio/wav,audio/m4a"
                      onChange={handleAudioUpload}
                      className="hidden"
                    />

                    <button
                      onClick={() => audioInputRef.current?.click()}
                      className="w-full py-12 border-2 border-dashed border-zinc-600 rounded-xl text-zinc-400 hover:border-amber-500 hover:text-amber-500 transition-colors flex flex-col items-center gap-2"
                    >
                      <div className="h-12 w-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                        <Music className="h-6 w-6 text-amber-500" />
                      </div>
                      <span className="text-amber-500">Toca para seleccionar audio</span>
                      <span className="text-xs text-zinc-500">MP3, WAV, M4A</span>
                      <span className="text-xs text-zinc-500">Máximo 100MB</span>
                    </button>

                    {formData.audioFileUrl && (
                      <div className="mt-3 p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center justify-between">
                        <span className="text-sm text-green-400">Archivo cargado</span>
                        <button
                          onClick={() => setFormData((prev) => ({ ...prev, audioFileUrl: "" }))}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-zinc-700 pt-6">
                    <label className="block text-sm text-zinc-400 mb-2">O usar enlace de Hypeddit (alternativo)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.hypedditUrl}
                        onChange={(e) => setFormData((prev) => ({ ...prev, hypedditUrl: e.target.value }))}
                        className="flex-1 px-3 py-3 bg-white text-gray-900 rounded-lg"
                        placeholder="https://hypeddit.com/z..."
                      />
                      <button className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Obtener portada
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                      Si usas Hypeddit, el beat se descargará desde ahí en lugar del archivo subido.
                    </p>
                  </div>
                </div>
              )}

              {/* Preview Tab */}
              {activeTab === "preview" && (
                <div className="space-y-6">
                  {/* Info Card */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Play className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-blue-800">PREVIEW DE AUDIO</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          Agrega un preview corto para que los usuarios escuchen antes de descargar.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Spotify Track ID</label>
                    <input
                      type="text"
                      value={formData.spotifyTrackId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, spotifyTrackId: e.target.value }))}
                      className="w-full px-3 py-3 bg-white text-gray-900 rounded-lg"
                      placeholder="Ej: 7IPN2DXiMsVn7XUkpFz3Pz"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">YouTube Video ID</label>
                    <input
                      type="text"
                      value={formData.youtubeVideoId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, youtubeVideoId: e.target.value }))}
                      className="w-full px-3 py-3 bg-white text-gray-900 rounded-lg"
                      placeholder="Ej: dQw4w9WgXcQ"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Audio Preview URL (mp3, wav)</label>
                    <input
                      type="text"
                      value={formData.audioPreviewUrl}
                      onChange={(e) => setFormData((prev) => ({ ...prev, audioPreviewUrl: e.target.value }))}
                      className="w-full px-3 py-3 bg-white text-gray-900 rounded-lg"
                      placeholder="https://... .mp3"
                    />
                  </div>

                  <div className="border-t border-zinc-700 pt-6">
                    <h3 className="text-amber-500 font-bold mb-4">LINKS DE DISTRIBUCIÓN</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-zinc-400 mb-1">OneRPM URL</label>
                        <input
                          type="text"
                          value={formData.onerpmUrl}
                          onChange={(e) => setFormData((prev) => ({ ...prev, onerpmUrl: e.target.value }))}
                          className="w-full px-3 py-3 bg-white text-gray-900 rounded-lg"
                          placeholder="https://onerpm.link/..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-zinc-400 mb-1">DistroKid URL</label>
                        <input
                          type="text"
                          value={formData.distrokidUrl}
                          onChange={(e) => setFormData((prev) => ({ ...prev, distrokidUrl: e.target.value }))}
                          className="w-full px-3 py-3 bg-white text-gray-900 rounded-lg"
                          placeholder="https://distrokid.com/hyperfollow/..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-zinc-400 mb-1">Bandcamp URL</label>
                        <input
                          type="text"
                          value={formData.bandcampUrl}
                          onChange={(e) => setFormData((prev) => ({ ...prev, bandcampUrl: e.target.value }))}
                          className="w-full px-3 py-3 bg-white text-gray-900 rounded-lg"
                          placeholder="https://bandcamp.com/..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Download Gate Tab */}
              {activeTab === "downloadgate" && (
                <div className="space-y-6">
                  {/* Info Card */}
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <Lock className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-purple-800">DOWNLOAD GATE</h3>
                        <p className="text-sm text-purple-700 mt-1">
                          Configura las acciones que los usuarios deben completar antes de descargar el beat (seguir en Spotify, suscribirse, etc.)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.downloadGateEnabled}
                        onChange={(e) => setFormData((prev) => ({ ...prev, downloadGateEnabled: e.target.checked }))}
                        className="w-5 h-5 mt-0.5 rounded accent-purple-500"
                      />
                      <div>
                        <span className="text-amber-400 font-medium">Activar Download Gate</span>
                        <p className="text-sm text-zinc-400 mt-0.5">
                          Los usuarios deberán completar acciones antes de descargar
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Actions Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-amber-500 font-bold">ACCIONES REQUERIDAS</h3>
                    <button
                      onClick={addAction}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar Acción
                    </button>
                  </div>

                  {/* Actions List */}
                  <div className="space-y-4">
                    {formData.downloadGateActions.map((action, index) => (
                      <div key={index} className="bg-white rounded-xl p-4 text-gray-900">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 space-y-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                              <select
                                value={action.actionType}
                                onChange={(e) => updateAction(index, "actionType", e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg"
                              >
                                {ACTION_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Etiqueta</label>
                              <input
                                type="text"
                                value={action.label}
                                onChange={(e) => updateAction(index, "label", e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg"
                                placeholder="Email"
                              />
                            </div>

                            <div>
                              <label className="block text-xs text-gray-500 mb-1">URL</label>
                              <input
                                type="text"
                                value={action.url}
                                onChange={(e) => updateAction(index, "url", e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg"
                                placeholder="https://..."
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => removeAction(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {formData.downloadGateActions.length === 0 && (
                      <div className="text-center py-8 text-zinc-500">
                        <Lock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay acciones configuradas</p>
                        <p className="text-sm">Agrega acciones para activar el download gate</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-700 p-4 rounded-b-2xl flex gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !formData.title || !formData.producerName}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Guardando...
              </>
            ) : (
              beatId ? "Guardar Cambios" : "Agregar Beat"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
