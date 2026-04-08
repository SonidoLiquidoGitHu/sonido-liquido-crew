"use client";

import { useState, useEffect, useCallback } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Upload,
  Heart,
  Eye,
  Calendar,
  MapPin,
  Instagram,
  User,
  X,
  Loader2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Image as ImageIcon,
  Send,
  Share2,
  Download,
  Facebook,
  Link2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConcertMemory {
  id: string;
  submitterName: string;
  submitterInstagram?: string;
  eventId?: string;
  eventName?: string;
  eventDate?: string;
  eventVenue?: string;
  eventCity?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  isFeatured: boolean;
  likeCount: number;
  viewCount: number;
  createdAt: string;
}

interface Event {
  id: string;
  title: string;
  eventDate: string;
  venue: string;
  city: string;
}

interface ConcertMemoryGalleryProps {
  eventId?: string; // Filter by specific event
  artistId?: string;
  title?: string;
  subtitle?: string;
  showUpload?: boolean;
  events?: Event[];
  className?: string;
}

export function ConcertMemoryGallery({
  eventId,
  artistId,
  title = "Recuerdos del Show",
  subtitle = "Fotos de fans en conciertos",
  showUpload = true,
  events = [],
  className = "",
}: ConcertMemoryGalleryProps) {
  const [memories, setMemories] = useState<ConcertMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<ConcertMemory | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Upload form state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    submitterName: "",
    submitterEmail: "",
    submitterInstagram: "",
    eventId: eventId || "",
    eventName: "",
    eventVenue: "",
    eventCity: "",
    caption: "",
    file: null as File | null,
    previewUrl: "",
  });

  useEffect(() => {
    fetchMemories();
  }, [eventId, artistId]);

  async function fetchMemories() {
    try {
      const params = new URLSearchParams();
      if (eventId) params.append("eventId", eventId);
      if (artistId) params.append("artistId", artistId);

      const res = await fetch(`/api/community/concert-memories?${params}`);
      const data = await res.json();

      if (data.success) {
        setMemories(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching memories:", err);
    } finally {
      setLoading(false);
    }
  }

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("La imagen no puede superar 10MB");
      return;
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, file, previewUrl }));
    setError(null);
  }, []);

  // Clear selected file
  const clearFile = () => {
    if (formData.previewUrl) {
      URL.revokeObjectURL(formData.previewUrl);
    }
    setFormData((prev) => ({ ...prev, file: null, previewUrl: "" }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file || !formData.submitterName.trim()) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Create form data for file upload
      const data = new FormData();
      data.append("file", formData.file);
      data.append("submitterName", formData.submitterName.trim());
      if (formData.submitterEmail) data.append("submitterEmail", formData.submitterEmail.trim());
      if (formData.submitterInstagram) data.append("submitterInstagram", formData.submitterInstagram.trim());
      if (formData.eventId) data.append("eventId", formData.eventId);
      if (formData.eventName) data.append("eventName", formData.eventName.trim());
      if (formData.eventVenue) data.append("eventVenue", formData.eventVenue.trim());
      if (formData.eventCity) data.append("eventCity", formData.eventCity.trim());
      if (formData.caption) data.append("caption", formData.caption.trim());

      setUploadProgress(30);

      const res = await fetch("/api/community/concert-memories", {
        method: "POST",
        body: data,
      });

      setUploadProgress(80);

      const result = await res.json();

      if (result.success) {
        setUploadProgress(100);
        setSubmitted(true);
        // Reset form
        setFormData({
          submitterName: "",
          submitterEmail: "",
          submitterInstagram: "",
          eventId: eventId || "",
          eventName: "",
          eventVenue: "",
          eventCity: "",
          caption: "",
          file: null,
          previewUrl: "",
        });
        setTimeout(() => {
          setShowUploadForm(false);
          setSubmitted(false);
        }, 3000);
      } else {
        setError(result.error || "Error al subir la foto");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Navigation in lightbox
  const goToPrevious = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
      setSelectedMemory(memories[selectedIndex - 1]);
    }
  };

  const goToNext = () => {
    if (selectedIndex < memories.length - 1) {
      setSelectedIndex(selectedIndex + 1);
      setSelectedMemory(memories[selectedIndex + 1]);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedMemory) return;
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "Escape") setSelectedMemory(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMemory, selectedIndex]);

  return (
    <section className={`py-16 ${className}`}>
      <div className="section-container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-500/10 border border-pink-500/20 rounded-full mb-4">
              <Camera className="w-4 h-4 text-pink-500" />
              <span className="text-sm font-medium text-pink-500">Comunidad</span>
            </div>
            <h2 className="font-oswald text-4xl md:text-5xl uppercase text-white mb-2">
              {title}
            </h2>
            <p className="text-slc-muted">{subtitle}</p>
          </div>

          {showUpload && (
            <Button
              onClick={() => setShowUploadForm(true)}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Subir mi foto
            </Button>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg bg-slc-card border border-slc-border rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              {submitted ? (
                <div className="p-8 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="font-oswald text-2xl uppercase mb-2">¡Foto enviada!</h3>
                  <p className="text-slc-muted">
                    Tu foto aparecerá después de ser aprobada.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b border-slc-border">
                    <h3 className="font-oswald text-xl uppercase">Comparte tu recuerdo</h3>
                    <button
                      type="button"
                      onClick={() => setShowUploadForm(false)}
                      className="text-slc-muted hover:text-white"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Photo upload area */}
                    {!formData.previewUrl ? (
                      <label className="block border-2 border-dashed border-slc-border rounded-xl p-8 cursor-pointer hover:border-pink-500/50 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <div className="text-center">
                          <Camera className="w-12 h-12 text-slc-muted mx-auto mb-4" />
                          <p className="font-medium text-white mb-1">
                            Selecciona tu foto
                          </p>
                          <p className="text-sm text-slc-muted">
                            JPG, PNG • Máx 10MB
                          </p>
                        </div>
                      </label>
                    ) : (
                      <div className="relative aspect-square max-h-64 mx-auto rounded-xl overflow-hidden">
                        <img
                          src={formData.previewUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={clearFile}
                          className="absolute top-2 right-2 w-8 h-8 bg-black/70 rounded-full flex items-center justify-center hover:bg-black"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Your info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slc-muted mb-1">
                          Tu nombre *
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
                          <input
                            type="text"
                            value={formData.submitterName}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                submitterName: e.target.value,
                              }))
                            }
                            required
                            className="w-full pl-10 pr-4 py-2 bg-slc-dark border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-slc-muted mb-1">
                          Instagram
                        </label>
                        <div className="relative">
                          <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
                          <input
                            type="text"
                            value={formData.submitterInstagram}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                submitterInstagram: e.target.value,
                              }))
                            }
                            placeholder="@usuario"
                            className="w-full pl-10 pr-4 py-2 bg-slc-dark border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Event selection */}
                    {events.length > 0 ? (
                      <div>
                        <label className="block text-sm text-slc-muted mb-1">
                          ¿En qué evento tomaste esta foto?
                        </label>
                        <select
                          value={formData.eventId}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, eventId: e.target.value }))
                          }
                          className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
                        >
                          <option value="">Seleccionar evento...</option>
                          {events.map((event) => (
                            <option key={event.id} value={event.id}>
                              {event.title} - {event.city} (
                              {new Date(event.eventDate).toLocaleDateString("es-MX", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                              )
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slc-muted mb-1">
                            Nombre del evento
                          </label>
                          <input
                            type="text"
                            value={formData.eventName}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, eventName: e.target.value }))
                            }
                            placeholder="Ej: Show en el Foro"
                            className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slc-muted mb-1">
                            Ciudad
                          </label>
                          <input
                            type="text"
                            value={formData.eventCity}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, eventCity: e.target.value }))
                            }
                            placeholder="Ej: CDMX"
                            className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    )}

                    {/* Caption */}
                    <div>
                      <label className="block text-sm text-slc-muted mb-1">
                        Descripción
                      </label>
                      <textarea
                        value={formData.caption}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, caption: e.target.value }))
                        }
                        placeholder="Cuéntanos sobre este momento..."
                        rows={2}
                        maxLength={300}
                        className="w-full px-4 py-2 bg-slc-dark border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
                      />
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}
                  </div>

                  {/* Submit */}
                  <div className="p-4 border-t border-slc-border">
                    {isUploading && (
                      <div className="mb-4">
                        <div className="h-1 bg-slc-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-pink-500 transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-slc-muted mt-1 text-center">
                          Subiendo... {uploadProgress}%
                        </p>
                      </div>
                    )}
                    <Button
                      type="submit"
                      disabled={isUploading || !formData.file || !formData.submitterName.trim()}
                      className="w-full bg-pink-500 hover:bg-pink-600"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar foto
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-slc-muted text-center mt-2">
                      Tu foto será revisada antes de publicarse.
                    </p>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Gallery */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center py-16 bg-slc-card/30 border border-slc-border/50 rounded-2xl">
            <ImageIcon className="w-16 h-16 text-slc-muted/50 mx-auto mb-4" />
            <h3 className="font-oswald text-xl uppercase text-slc-muted mb-2">
              Sin fotos aún
            </h3>
            <p className="text-sm text-slc-muted mb-4">
              ¡Sé el primero en compartir un recuerdo!
            </p>
            {showUpload && (
              <Button
                onClick={() => setShowUploadForm(true)}
                variant="outline"
                className="border-pink-500/50 text-pink-500 hover:bg-pink-500/10"
              >
                <Upload className="w-4 h-4 mr-2" />
                Subir foto
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {memories.map((memory, index) => (
              <GalleryThumbnail
                key={memory.id}
                memory={memory}
                index={index}
                onClick={() => {
                  setSelectedMemory(memory);
                  setSelectedIndex(index);
                }}
              />
            ))}
          </div>
        )}

        {/* Lightbox */}
        {selectedMemory && (
          <LightboxWithShare
            memory={selectedMemory}
            memories={memories}
            selectedIndex={selectedIndex}
            onClose={() => setSelectedMemory(null)}
            onPrevious={goToPrevious}
            onNext={goToNext}
          />
        )}
      </div>
    </section>
  );
}

// Gallery Thumbnail with Quick Share
function GalleryThumbnail({
  memory,
  index,
  onClick,
}: {
  memory: ConcertMemory;
  index: number;
  onClick: () => void;
}) {
  const [showQuickShare, setShowQuickShare] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/comunidad?foto=${memory.id}`
    : "";

  const shareText = memory.caption
    ? `${memory.caption} - Sonido Líquido Crew`
    : `Foto de ${memory.submitterName} en Sonido Líquido Crew`;

  const quickShare = async (platform: "instagram" | "facebook" | "tiktok") => {
    if (platform === "facebook") {
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
      window.open(fbUrl, "_blank", "width=600,height=400,noopener,noreferrer");
    } else {
      // For IG and TikTok, download image first
      try {
        const response = await fetch(memory.imageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `sonido-liquido-${memory.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        window.open(memory.imageUrl, "_blank");
      }
      // Open the platform
      window.open(
        platform === "instagram" ? "https://instagram.com" : "https://tiktok.com",
        "_blank",
        "noopener,noreferrer"
      );
    }
    setShowQuickShare(false);
  };

  return (
    <div
      className={cn(
        "group relative aspect-square rounded-xl overflow-hidden bg-slc-dark",
        memory.isFeatured && "ring-2 ring-pink-500"
      )}
    >
      <button
        onClick={onClick}
        className="w-full h-full"
      >
        <img
          src={memory.thumbnailUrl || memory.imageUrl}
          alt={memory.caption || "Concert memory"}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      </button>

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-xs text-white truncate">{memory.submitterName}</p>
          {memory.eventName && (
            <p className="text-[10px] text-white/60 truncate">{memory.eventName}</p>
          )}
        </div>
      </div>

      {/* Share button on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowQuickShare(!showQuickShare);
        }}
        className="absolute top-2 left-2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title="Compartir"
      >
        <Share2 className="w-4 h-4 text-white" />
      </button>

      {/* Quick share menu */}
      {showQuickShare && (
        <div
          className="absolute top-12 left-2 bg-slc-card border border-slc-border rounded-lg p-2 z-20 animate-in fade-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-1.5">
            <button
              onClick={() => quickShare("instagram")}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center hover:scale-110 transition-transform"
              title="Instagram"
            >
              <Instagram className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => quickShare("facebook")}
              className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center hover:scale-110 transition-transform"
              title="Facebook"
            >
              <Facebook className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={() => quickShare("tiktok")}
              className="w-8 h-8 rounded-full bg-black border border-white/20 flex items-center justify-center hover:scale-110 transition-transform"
              title="TikTok"
            >
              <TikTokIcon className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Featured badge */}
      {memory.isFeatured && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
}

// Lightbox with Share Functionality
function LightboxWithShare({
  memory,
  memories,
  selectedIndex,
  onClose,
  onPrevious,
  onNext,
}: {
  memory: ConcertMemory;
  memories: ConcertMemory[];
  selectedIndex: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Generate share URL for this memory
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/comunidad?foto=${memory.id}`
    : "";

  const shareText = memory.caption
    ? `${memory.caption} - Sonido Líquido Crew`
    : `Foto de ${memory.submitterName} en Sonido Líquido Crew`;

  // Share to Facebook
  const shareToFacebook = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(fbUrl, "_blank", "width=600,height=400,noopener,noreferrer");
  };

  // Share to Instagram (opens IG with download prompt since no direct API)
  const shareToInstagram = async () => {
    // Download image first, then prompt user to share on IG
    await downloadImage();
    // Open Instagram
    window.open("https://instagram.com", "_blank", "noopener,noreferrer");
  };

  // Share to TikTok (similar to Instagram)
  const shareToTikTok = async () => {
    // Download image first, then prompt user to share on TikTok
    await downloadImage();
    // Open TikTok
    window.open("https://tiktok.com", "_blank", "noopener,noreferrer");
  };

  // Copy link to clipboard
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Download image
  const downloadImage = async () => {
    setDownloading(true);
    try {
      const response = await fetch(memory.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sonido-liquido-${memory.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback: open image in new tab
      window.open(memory.imageUrl, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  // Native share (for mobile)
  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Sonido Líquido Crew",
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    } else {
      setShowShareMenu(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Share button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          nativeShare();
        }}
        className="absolute top-4 right-16 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 z-10"
        title="Compartir"
      >
        <Share2 className="w-5 h-5" />
      </button>

      {/* Share Menu */}
      {showShareMenu && (
        <div
          className="absolute top-16 right-4 bg-slc-card border border-slc-border rounded-xl p-4 z-20 animate-in fade-in slide-in-from-top-2"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-oswald text-sm uppercase">Compartir</h4>
            <button
              onClick={() => setShowShareMenu(false)}
              className="text-slc-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {/* Instagram */}
            <button
              onClick={shareToInstagram}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-slc-dark transition-colors group"
              title="Compartir en Instagram"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Instagram className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] text-slc-muted">Instagram</span>
            </button>

            {/* Facebook */}
            <button
              onClick={shareToFacebook}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-slc-dark transition-colors group"
              title="Compartir en Facebook"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Facebook className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] text-slc-muted">Facebook</span>
            </button>

            {/* TikTok */}
            <button
              onClick={shareToTikTok}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-slc-dark transition-colors group"
              title="Compartir en TikTok"
            >
              <div className="w-10 h-10 rounded-full bg-black border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TikTokIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] text-slc-muted">TikTok</span>
            </button>

            {/* Copy Link */}
            <button
              onClick={copyLink}
              className="flex flex-col items-center gap-1.5 p-3 rounded-lg hover:bg-slc-dark transition-colors group"
              title="Copiar enlace"
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform",
                copied ? "bg-green-600" : "bg-slc-border"
              )}>
                {copied ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <Link2 className="w-5 h-5 text-white" />
                )}
              </div>
              <span className="text-[10px] text-slc-muted">
                {copied ? "Copiado!" : "Enlace"}
              </span>
            </button>
          </div>

          {/* Download button */}
          <button
            onClick={downloadImage}
            disabled={downloading}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-slc-dark hover:bg-slc-border rounded-lg text-sm transition-colors"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Descargar imagen
          </button>

          <p className="text-[10px] text-slc-muted text-center mt-3">
            Para IG y TikTok, descarga y comparte desde la app
          </p>
        </div>
      )}

      {/* Navigation */}
      {selectedIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
          className="absolute left-4 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      {selectedIndex < memories.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Image and Info */}
      <div
        className="max-w-4xl max-h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={memory.imageUrl}
          alt={memory.caption || "Concert memory"}
          className="max-h-[70vh] object-contain rounded-lg"
        />
        <div className="mt-4 text-center">
          <p className="text-white font-medium">{memory.submitterName}</p>
          {memory.submitterInstagram && (
            <a
              href={`https://instagram.com/${memory.submitterInstagram.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-pink-500 hover:underline"
            >
              @{memory.submitterInstagram.replace("@", "")}
            </a>
          )}
          {memory.eventName && (
            <p className="text-sm text-slc-muted mt-2 flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4" />
              {memory.eventName}
              {memory.eventCity && ` - ${memory.eventCity}`}
            </p>
          )}
          {memory.caption && (
            <p className="text-sm text-white/80 mt-2 max-w-md mx-auto">
              "{memory.caption}"
            </p>
          )}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm text-slc-muted">
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {memory.likeCount}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {memory.viewCount}
            </span>
          </div>

          {/* Share buttons row (always visible on mobile) */}
          <div className="flex items-center justify-center gap-3 mt-4 md:hidden">
            <button
              onClick={shareToInstagram}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center"
            >
              <Instagram className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={shareToFacebook}
              className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center"
            >
              <Facebook className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={shareToTikTok}
              className="w-10 h-10 rounded-full bg-black border border-white/20 flex items-center justify-center"
            >
              <TikTokIcon className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={downloadImage}
              disabled={downloading}
              className="w-10 h-10 rounded-full bg-slc-border flex items-center justify-center"
            >
              {downloading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// TikTok Icon Component
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

export default ConcertMemoryGallery;
