"use client";

import { useState, useEffect, useCallback } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropboxUploader } from "@/components/admin/DropboxUploader";
import {
  Plus,
  Search,
  Trash2,
  Upload,
  X,
  Check,
  Image as ImageIcon,
  Tag,
  Folder,
  Star,
  Eye,
  EyeOff,
  Grid3X3,
  List,
  Filter,
  Loader2,
  CheckSquare,
  Square,
  FolderPlus,
  Cloud,
  Calendar,
  Pencil,
  User,
  MapPin,
  Camera,
  Save,
} from "lucide-react";

interface GalleryPhoto {
  id: string;
  title: string | null;
  description: string | null;
  imageUrl: string;
  thumbnailUrl: string | null;
  albumId: string | null;
  artistId: string | null;
  photographer: string | null;
  location: string | null;
  takenAt: string | null;
  altText: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  tags: { id: string; name: string; slug: string }[];
  createdAt: string;
}

interface Artist {
  id: string;
  name: string;
  slug: string;
}

interface Album {
  id: string;
  title: string;
  slug: string;
  photoCount: number;
  isPublished: boolean;
}

interface TagItem {
  id: string;
  name: string;
  slug: string;
  photoCount: number;
}

interface Event {
  id: string;
  title: string;
  venue: string;
  city: string;
  eventDate: string;
}

export default function AdminGalleryPage() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState<string>("");
  const [uploadAlbumSelection, setUploadAlbumSelection] = useState<string>("");
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUploader, setShowUploader] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showAlbumCreator, setShowAlbumCreator] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newAlbumName, setNewAlbumName] = useState("");
  const [batchTagIds, setBatchTagIds] = useState<string[]>([]);

  // Photo editing state
  const [editingPhoto, setEditingPhoto] = useState<GalleryPhoto | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    photographer: "",
    location: "",
    takenAt: "",
    artistId: "",
    albumId: "",
    altText: "",
    isFeatured: false,
    isPublished: true,
    tagIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [photosRes, albumsRes, tagsRes, eventsRes, artistsRes] = await Promise.all([
        fetch(`/api/admin/gallery${selectedAlbum ? `?albumId=${selectedAlbum}` : ""}`),
        fetch("/api/admin/gallery/albums"),
        fetch("/api/admin/gallery/tags"),
        fetch("/api/admin/events"),
        fetch("/api/admin/artists"),
      ]);

      const [photosData, albumsData, tagsData, eventsData, artistsData] = await Promise.all([
        photosRes.json(),
        albumsRes.json(),
        tagsRes.json(),
        eventsRes.json(),
        artistsRes.json(),
      ]);

      if (photosData.success) setPhotos(photosData.data || []);
      if (albumsData.success) setAlbums(albumsData.data || []);
      if (tagsData.success) setTags(tagsData.data || []);
      if (eventsData.success) setEvents(eventsData.data || []);
      if (artistsData.success) setArtists(artistsData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedAlbum]);

  // Open photo for editing
  const openPhotoEditor = (photo: GalleryPhoto) => {
    setEditingPhoto(photo);
    setEditForm({
      title: photo.title || "",
      description: photo.description || "",
      photographer: photo.photographer || "",
      location: photo.location || "",
      takenAt: photo.takenAt ? new Date(photo.takenAt).toISOString().split("T")[0] : "",
      artistId: photo.artistId || "",
      albumId: photo.albumId || "",
      altText: photo.altText || "",
      isFeatured: photo.isFeatured,
      isPublished: photo.isPublished,
      tagIds: photo.tags.map((t) => t.id),
    });
  };

  // Save photo changes
  const savePhotoChanges = async () => {
    if (!editingPhoto) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/gallery/${editingPhoto.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title || null,
          description: editForm.description || null,
          photographer: editForm.photographer || null,
          location: editForm.location || null,
          takenAt: editForm.takenAt || null,
          artistId: editForm.artistId || null,
          albumId: editForm.albumId || null,
          altText: editForm.altText || null,
          isFeatured: editForm.isFeatured,
          isPublished: editForm.isPublished,
          tagIds: editForm.tagIds,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingPhoto(null);
        fetchData();
      }
    } catch (error) {
      console.error("Error saving photo:", error);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create or get album for an event
  const getOrCreateEventAlbum = async (eventId: string): Promise<string | null> => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return null;

    // Check if album already exists for this event
    const eventAlbumTitle = `📅 ${event.title} - ${event.city}`;
    const existingAlbum = albums.find(
      (a) => a.title === eventAlbumTitle || a.slug.includes(event.id.substring(0, 8))
    );

    if (existingAlbum) {
      return existingAlbum.id;
    }

    // Create new album for the event
    try {
      const res = await fetch("/api/admin/gallery/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: eventAlbumTitle,
          description: `Fotos del evento: ${event.title} en ${event.venue}, ${event.city}`,
          isPublished: true,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        // Refresh albums list
        const albumsRes = await fetch("/api/admin/gallery/albums");
        const albumsData = await albumsRes.json();
        if (albumsData.success) setAlbums(albumsData.data || []);
        return data.data.id;
      }
    } catch (error) {
      console.error("Error creating event album:", error);
    }

    return null;
  };

  // Handle file upload to Dropbox
  const handleFileUpload = async (files: FileList | File[]) => {
    setUploading(true);
    const fileArray = Array.from(files);
    const uploadedUrls: string[] = [];

    try {
      for (const file of fileArray) {
        // Create form data
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "/gallery");

        // Upload to Dropbox via API
        const response = await fetch("/api/admin/dropbox/upload", {
          method: "POST",
          body: formData,
        });

        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error("Server returned non-JSON response");
          throw new Error("Error de conexión con Dropbox. Reconecta tu cuenta en Sincronización.");
        }

        const data = await response.json();

        if (data.success && data.data?.url) {
          uploadedUrls.push(data.data.url);
        }
      }

      // If we got any uploaded URLs, add them to the gallery
      if (uploadedUrls.length > 0) {
        await handleUrlUpload(uploadedUrls);
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Error al subir archivos. Verifica que Dropbox esté configurado en Admin > Configuración.");
    } finally {
      setUploading(false);
      setShowUploader(false);
    }
  };

  // Handle single Dropbox upload completion
  const handleDropboxUploadComplete = (url: string) => {
    handleUrlUpload([url]);
  };

  // Upload photos via URL
  const handleUrlUpload = async (urls: string[]) => {
    setUploading(true);
    try {
      // Determine the album ID to use
      let albumIdToUse: string | null = null;

      if (uploadAlbumSelection.startsWith("event:")) {
        // Event selected - create/get album for event
        const eventId = uploadAlbumSelection.replace("event:", "");
        albumIdToUse = await getOrCreateEventAlbum(eventId);
      } else if (uploadAlbumSelection) {
        // Regular album selected
        albumIdToUse = uploadAlbumSelection;
      }

      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: urls.map((url) => ({ imageUrl: url })),
          albumId: albumIdToUse,
          tagIds: batchTagIds,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchData();
        setShowUploader(false);
        setBatchTagIds([]);
        setUploadAlbumSelection("");
      }
    } catch (error) {
      console.error("Error uploading:", error);
    } finally {
      setUploading(false);
    }
  };

  // Toggle photo selection
  const togglePhotoSelection = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  // Select all visible photos
  const selectAll = () => {
    if (selectedPhotos.size === filteredPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(filteredPhotos.map((p) => p.id)));
    }
  };

  // Delete selected photos
  const deleteSelected = async () => {
    if (selectedPhotos.size === 0) return;
    if (!confirm(`Delete ${selectedPhotos.size} photo(s)?`)) return;

    try {
      const res = await fetch("/api/admin/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: Array.from(selectedPhotos) }),
      });

      if ((await res.json()).success) {
        fetchData();
        setSelectedPhotos(new Set());
      }
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  // Toggle feature status for selected
  const toggleFeatureSelected = async (featured: boolean) => {
    for (const photoId of selectedPhotos) {
      await fetch(`/api/admin/gallery/${photoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: featured }),
      });
    }
    fetchData();
  };

  // Add tags to selected photos
  const addTagsToSelected = async (tagIds: string[]) => {
    for (const photoId of selectedPhotos) {
      const photo = photos.find((p) => p.id === photoId);
      if (photo) {
        const existingTagIds = photo.tags.map((t) => t.id);
        const newTagIds = [...new Set([...existingTagIds, ...tagIds])];
        await fetch(`/api/admin/gallery/${photoId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagIds: newTagIds }),
        });
      }
    }
    fetchData();
    setShowTagManager(false);
  };

  // Create new tag
  const createTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const res = await fetch("/api/admin/gallery/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });
      if ((await res.json()).success) {
        setNewTagName("");
        fetchData();
      }
    } catch (error) {
      console.error("Error creating tag:", error);
    }
  };

  // Create new album
  const createAlbum = async () => {
    if (!newAlbumName.trim()) return;
    try {
      const res = await fetch("/api/admin/gallery/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newAlbumName.trim(), isPublished: true }),
      });
      if ((await res.json()).success) {
        setNewAlbumName("");
        setShowAlbumCreator(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error creating album:", error);
    }
  };

  // Move selected photos to album (supports events too)
  const moveToAlbum = async (selection: string | null) => {
    let albumIdToUse: string | null = null;

    if (selection && selection.startsWith("event:")) {
      const eventId = selection.replace("event:", "");
      albumIdToUse = await getOrCreateEventAlbum(eventId);
    } else {
      albumIdToUse = selection;
    }

    for (const photoId of selectedPhotos) {
      await fetch(`/api/admin/gallery/${photoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId: albumIdToUse }),
      });
    }
    fetchData();
    setSelectedPhotos(new Set());
  };

  // Filter photos
  const filteredPhotos = photos.filter((photo) => {
    const matchesSearch =
      !searchQuery ||
      photo.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.tags.some((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  // Format event date for display
  const formatEventDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase">Galería de Fotos</h1>
          <p className="text-slc-muted mt-1">
            {photos.length} fotos en {albums.length} álbumes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAlbumCreator(true)}>
            <FolderPlus className="w-4 h-4 mr-2" />
            Nuevo Álbum
          </Button>
          <Button onClick={() => setShowUploader(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Subir Fotos
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
        <Star className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="text-yellow-300 font-medium">¿Cómo mostrar fotos en la página principal?</p>
          <p className="text-yellow-300/70 mt-1">
            Solo las fotos marcadas como <Star className="w-3 h-3 inline text-yellow-500 fill-yellow-500" /> <span className="font-medium">Destacadas</span> aparecen en la página principal.
            Haz clic en una foto para editarla y activa la opción "Destacada".
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
          <Input
            type="text"
            placeholder="Buscar fotos por título o etiqueta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Album Filter */}
        <select
          value={selectedAlbum}
          onChange={(e) => setSelectedAlbum(e.target.value)}
          className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg"
        >
          <option value="">Todos los álbumes</option>
          {albums.map((album) => (
            <option key={album.id} value={album.id}>
              {album.title} ({album.photoCount})
            </option>
          ))}
        </select>

        {/* View Mode */}
        <div className="flex border border-slc-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-2 ${viewMode === "grid" ? "bg-primary text-white" : "bg-slc-card"}`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-2 ${viewMode === "list" ? "bg-primary text-white" : "bg-slc-card"}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Batch Actions */}
      {selectedPhotos.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium">
            {selectedPhotos.size} foto(s) seleccionada(s)
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={() => setShowTagManager(true)}>
            <Tag className="w-4 h-4 mr-1" />
            Etiquetar
          </Button>
          <select
            onChange={(e) => {
              if (e.target.value) moveToAlbum(e.target.value === "none" ? null : e.target.value);
              e.target.value = "";
            }}
            className="px-3 py-1.5 text-sm bg-slc-card border border-slc-border rounded-lg"
          >
            <option value="">Mover a álbum...</option>
            <option value="none">Sin álbum</option>
            <optgroup label="Álbumes">
              {albums.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.title}
                </option>
              ))}
            </optgroup>
            {events.length > 0 && (
              <optgroup label="Eventos">
                {events.map((event) => (
                  <option key={event.id} value={`event:${event.id}`}>
                    {event.title} - {event.city} ({formatEventDate(event.eventDate)})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <Button size="sm" variant="outline" onClick={() => toggleFeatureSelected(true)}>
            <Star className="w-4 h-4 mr-1" />
            Destacar
          </Button>
          <Button size="sm" variant="destructive" onClick={deleteSelected}>
            <Trash2 className="w-4 h-4 mr-1" />
            Eliminar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedPhotos(new Set())}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Select All */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={selectAll}
          className="flex items-center gap-2 text-sm text-slc-muted hover:text-white"
        >
          {selectedPhotos.size === filteredPhotos.length && filteredPhotos.length > 0 ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          Seleccionar todo ({filteredPhotos.length})
        </button>
      </div>

      {/* Photo Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="text-center py-20">
          <ImageIcon className="w-16 h-16 text-slc-muted mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">No hay fotos</h3>
          <p className="text-slc-muted mb-4">Sube tus primeras fotos a la galería</p>
          <Button onClick={() => setShowUploader(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Subir Fotos
          </Button>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
              : "space-y-2"
          }
        >
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              className={`group relative cursor-pointer ${
                viewMode === "grid"
                  ? "aspect-square rounded-lg overflow-hidden bg-slc-card border border-slc-border hover:border-primary/50 transition-all"
                  : "flex items-center gap-4 p-3 rounded-lg bg-slc-card border border-slc-border hover:border-primary/50"
              } ${selectedPhotos.has(photo.id) ? "ring-2 ring-primary" : ""}`}
              onClick={() => openPhotoEditor(photo)}
            >
              {/* Selection checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePhotoSelection(photo.id);
                }}
                className={`absolute ${viewMode === "grid" ? "top-2 left-2" : "left-3"} z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                  selectedPhotos.has(photo.id)
                    ? "bg-primary text-white"
                    : "bg-black/50 text-white opacity-0 group-hover:opacity-100"
                }`}
              >
                <Check className="w-4 h-4" />
              </button>

              {/* Edit button (grid view) */}
              {viewMode === "grid" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openPhotoEditor(photo);
                  }}
                  className="absolute top-2 left-10 z-10 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-primary"
                  title="Editar foto"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}

              {/* Image */}
              {viewMode === "grid" ? (
                <SafeImage
                  src={photo.thumbnailUrl || photo.imageUrl}
                  alt={photo.title || "Photo"}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-16 h-16 relative rounded overflow-hidden flex-shrink-0">
                  <SafeImage
                    src={photo.thumbnailUrl || photo.imageUrl}
                    alt={photo.title || "Photo"}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Indicators (grid view) */}
              {viewMode === "grid" && (
                <div className="absolute top-2 right-2 flex gap-1">
                  {photo.isFeatured && (
                    <span className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                      <Star className="w-3 h-3 text-white" />
                    </span>
                  )}
                  {!photo.isPublished && (
                    <span className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                      <EyeOff className="w-3 h-3 text-white" />
                    </span>
                  )}
                </div>
              )}

              {/* Info (grid view) */}
              {viewMode === "grid" && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="text-xs text-white truncate">
                    {photo.title || "Sin título"}
                  </p>
                  {photo.photographer && (
                    <p className="text-[10px] text-white/60 truncate flex items-center gap-1">
                      <Camera className="w-2.5 h-2.5" />
                      {photo.photographer}
                    </p>
                  )}
                  {photo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {photo.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag.id}
                          className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] text-white"
                        >
                          {tag.name}
                        </span>
                      ))}
                      {photo.tags.length > 2 && (
                        <span className="text-[10px] text-white/60">
                          +{photo.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Info (list view) */}
              {viewMode === "list" && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{photo.title || "Sin título"}</p>
                  {photo.photographer && (
                    <p className="text-xs text-slc-muted flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      {photo.photographer}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {photo.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-0.5 bg-slc-border rounded text-xs"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {viewMode === "list" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openPhotoEditor(photo);
                    }}
                    className="p-1.5 hover:bg-slc-border rounded transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {photo.isFeatured && <Star className="w-4 h-4 text-yellow-500" />}
                  {photo.isPublished ? (
                    <Eye className="w-4 h-4 text-green-500" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploader && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slc-dark border border-slc-border rounded-xl w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-slc-border">
              <h2 className="font-oswald text-xl uppercase">Subir Fotos</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowUploader(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6">
              {/* Drop Zone */}
              <div
                className="border-2 border-dashed border-slc-border rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileUpload(e.dataTransfer.files);
                }}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <Upload className="w-12 h-12 text-slc-muted mx-auto mb-4" />
                <p className="text-lg mb-2">Arrastra fotos aquí o haz clic para seleccionar</p>
                <p className="text-sm text-slc-muted">JPG, PNG, WebP hasta 10MB</p>
                <input
                  id="file-input"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                />
              </div>

              {/* URL Upload */}
              <div className="mt-6">
                <p className="text-sm text-slc-muted mb-2">O pega URLs de imágenes (una por línea):</p>
                <textarea
                  id="url-input"
                  className="w-full h-32 p-3 bg-slc-card border border-slc-border rounded-lg text-sm"
                  placeholder="https://ejemplo.com/imagen1.jpg&#10;https://ejemplo.com/imagen2.jpg"
                />
              </div>

              {/* Album Selection - Now includes Events */}
              <div className="mt-4">
                <label className="block text-sm text-slc-muted mb-2">Álbum (opcional)</label>
                <select
                  value={uploadAlbumSelection}
                  onChange={(e) => setUploadAlbumSelection(e.target.value)}
                  className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg"
                >
                  <option value="">Sin álbum</option>
                  <optgroup label="Álbumes">
                    {albums.map((album) => (
                      <option key={album.id} value={album.id}>
                        {album.title}
                      </option>
                    ))}
                  </optgroup>
                  {events.length > 0 && (
                    <optgroup label="Eventos">
                      {events.map((event) => (
                        <option key={event.id} value={`event:${event.id}`}>
                          {event.title} - {event.city} ({formatEventDate(event.eventDate)})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {uploadAlbumSelection.startsWith("event:") && (
                  <p className="mt-2 text-xs text-primary flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Se creará un álbum automáticamente para este evento
                  </p>
                )}
              </div>

              {/* Tags Selection */}
              <div className="mt-4">
                <label className="block text-sm text-slc-muted mb-2">Etiquetas</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        if (batchTagIds.includes(tag.id)) {
                          setBatchTagIds(batchTagIds.filter((id) => id !== tag.id));
                        } else {
                          setBatchTagIds([...batchTagIds, tag.id]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        batchTagIds.includes(tag.id)
                          ? "bg-primary text-white"
                          : "bg-slc-card border border-slc-border hover:border-primary/50"
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const name = prompt("Nombre de la nueva etiqueta:");
                      if (name) {
                        setNewTagName(name);
                        createTag();
                      }
                    }}
                    className="px-3 py-1.5 rounded-full text-sm bg-slc-card border border-dashed border-slc-border hover:border-primary/50"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Nueva
                  </button>
                </div>
              </div>

              {/* Upload Button */}
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowUploader(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    const textarea = document.getElementById("url-input") as HTMLTextAreaElement;
                    const urls = textarea.value
                      .split("\n")
                      .map((u) => u.trim())
                      .filter((u) => u.startsWith("http"));
                    if (urls.length > 0) {
                      handleUrlUpload(urls);
                    }
                  }}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Subir Fotos
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag Manager Modal */}
      {showTagManager && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slc-dark border border-slc-border rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slc-border">
              <h2 className="font-oswald text-xl uppercase">Agregar Etiquetas</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowTagManager(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slc-muted mb-4">
                Selecciona etiquetas para agregar a {selectedPhotos.size} foto(s):
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      if (batchTagIds.includes(tag.id)) {
                        setBatchTagIds(batchTagIds.filter((id) => id !== tag.id));
                      } else {
                        setBatchTagIds([...batchTagIds, tag.id]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      batchTagIds.includes(tag.id)
                        ? "bg-primary text-white"
                        : "bg-slc-card border border-slc-border hover:border-primary/50"
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nueva etiqueta..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createTag()}
                />
                <Button onClick={createTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowTagManager(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => addTagsToSelected(batchTagIds)} disabled={batchTagIds.length === 0}>
                  Aplicar Etiquetas
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Album Creator Modal */}
      {showAlbumCreator && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slc-dark border border-slc-border rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slc-border">
              <h2 className="font-oswald text-xl uppercase">Nuevo Álbum</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAlbumCreator(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6">
              <Input
                placeholder="Nombre del álbum..."
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createAlbum()}
              />
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAlbumCreator(false)}>
                  Cancelar
                </Button>
                <Button onClick={createAlbum} disabled={!newAlbumName.trim()}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Crear Álbum
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Editor Modal */}
      {editingPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slc-dark border border-slc-border rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slc-border">
              <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
                <Pencil className="w-5 h-5 text-primary" />
                Editar Foto
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setEditingPhoto(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Image Preview */}
                <div className="space-y-4">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-slc-card border border-slc-border">
                    <SafeImage
                      src={editingPhoto.imageUrl}
                      alt={editingPhoto.title || "Photo"}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <p className="text-xs text-slc-muted text-center break-all">
                    {editingPhoto.imageUrl}
                  </p>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm text-slc-muted mb-1.5">
                      Título
                    </label>
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      placeholder="Título de la foto..."
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm text-slc-muted mb-1.5">
                      Descripción
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Descripción de la foto..."
                      rows={3}
                      className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg resize-none focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Photographer */}
                  <div>
                    <label className="block text-sm text-slc-muted mb-1.5 flex items-center gap-1">
                      <Camera className="w-4 h-4" />
                      Fotógrafo
                    </label>
                    <Input
                      value={editForm.photographer}
                      onChange={(e) => setEditForm({ ...editForm, photographer: e.target.value })}
                      placeholder="Nombre del fotógrafo..."
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm text-slc-muted mb-1.5 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      Ubicación
                    </label>
                    <Input
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      placeholder="Lugar donde se tomó la foto..."
                    />
                  </div>

                  {/* Date Taken */}
                  <div>
                    <label className="block text-sm text-slc-muted mb-1.5 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Fecha
                    </label>
                    <Input
                      type="date"
                      value={editForm.takenAt}
                      onChange={(e) => setEditForm({ ...editForm, takenAt: e.target.value })}
                    />
                  </div>

                  {/* Artist in Photo */}
                  <div>
                    <label className="block text-sm text-slc-muted mb-1.5 flex items-center gap-1">
                      <User className="w-4 h-4" />
                      Artista en la Foto
                    </label>
                    <select
                      value={editForm.artistId}
                      onChange={(e) => setEditForm({ ...editForm, artistId: e.target.value })}
                      className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                    >
                      <option value="">Sin artista</option>
                      {artists.map((artist) => (
                        <option key={artist.id} value={artist.id}>
                          {artist.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Album */}
                  <div>
                    <label className="block text-sm text-slc-muted mb-1.5 flex items-center gap-1">
                      <Folder className="w-4 h-4" />
                      Álbum
                    </label>
                    <select
                      value={editForm.albumId}
                      onChange={(e) => setEditForm({ ...editForm, albumId: e.target.value })}
                      className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                    >
                      <option value="">Sin álbum</option>
                      {albums.map((album) => (
                        <option key={album.id} value={album.id}>
                          {album.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Alt Text */}
                  <div>
                    <label className="block text-sm text-slc-muted mb-1.5">
                      Texto Alternativo (SEO)
                    </label>
                    <Input
                      value={editForm.altText}
                      onChange={(e) => setEditForm({ ...editForm, altText: e.target.value })}
                      placeholder="Descripción para accesibilidad..."
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm text-slc-muted mb-1.5 flex items-center gap-1">
                      <Tag className="w-4 h-4" />
                      Etiquetas
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            if (editForm.tagIds.includes(tag.id)) {
                              setEditForm({
                                ...editForm,
                                tagIds: editForm.tagIds.filter((id) => id !== tag.id),
                              });
                            } else {
                              setEditForm({
                                ...editForm,
                                tagIds: [...editForm.tagIds, tag.id],
                              });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                            editForm.tagIds.includes(tag.id)
                              ? "bg-primary text-white"
                              : "bg-slc-card border border-slc-border hover:border-primary/50"
                          }`}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status Toggles */}
                  <div className="flex gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.isFeatured}
                        onChange={(e) => setEditForm({ ...editForm, isFeatured: e.target.checked })}
                        className="w-4 h-4 rounded border-slc-border"
                      />
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">Destacada</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.isPublished}
                        onChange={(e) => setEditForm({ ...editForm, isPublished: e.target.checked })}
                        className="w-4 h-4 rounded border-slc-border"
                      />
                      <Eye className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Publicada</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slc-border bg-slc-card/50">
              <Button
                variant="destructive"
                onClick={async () => {
                  if (confirm("¿Eliminar esta foto permanentemente?")) {
                    await fetch(`/api/admin/gallery/${editingPhoto.id}`, { method: "DELETE" });
                    setEditingPhoto(null);
                    fetchData();
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setEditingPhoto(null)}>
                  Cancelar
                </Button>
                <Button onClick={savePhotoChanges} disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
