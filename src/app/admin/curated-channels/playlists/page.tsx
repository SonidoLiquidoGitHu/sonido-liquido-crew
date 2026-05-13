"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn, generateUUID, slugify } from "@/lib/utils";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Disc3,
  ExternalLink,
  ImagePlus,
  Import,
  ListMusic,
  Loader2,
  Music,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// ===========================================
// Types
// ===========================================

interface PlaylistTrack {
  id: string;
  playlistId: string;
  playlistName: string | null;
  spotifyTrackId: string;
  curatedTrackId: string | null;
  trackName: string;
  artistName: string;
  albumImageUrl: string | null;
  position: number;
  isActive: boolean;
  addedAt: string;
}

interface CuratedPlaylist {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  coverColor: string | null;
  isPublic: boolean;
  isActive: boolean;
  priority: number;
  spotifyPlaylistId: string | null;
  spotifyPlaylistUrl: string | null;
  trackCount: number;
  createdAt: string;
  updatedAt: string;
}

interface PlaylistFormData {
  name: string;
  slug: string;
  description: string;
  coverImageUrl: string;
  coverColor: string;
  spotifyPlaylistId: string;
  spotifyPlaylistUrl: string;
  isPublic: boolean;
  isActive: boolean;
  priority: number;
}

const defaultFormData: PlaylistFormData = {
  name: "",
  slug: "",
  description: "",
  coverImageUrl: "",
  coverColor: "#f97316",
  spotifyPlaylistId: "",
  spotifyPlaylistUrl: "",
  isPublic: true,
  isActive: true,
  priority: 0,
};

// ===========================================
// Color Picker Component
// ===========================================

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const presetColors = [
    "#f97316", // orange
    "#ef4444", // red
    "#22c55e", // green
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#eab308", // yellow
    "#06b6d4", // cyan
    "#14b8a6", // teal
    "#6b7280", // gray
    "#1e293b", // dark slate
    "#000000", // black
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {presetColors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              "w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110",
              value === color ? "border-white scale-110" : "border-transparent",
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#f97316"}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer bg-transparent border border-slc-border"
        />
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#f97316"
          className="flex-1 bg-slc-dark border-slc-border"
        />
      </div>
    </div>
  );
}

// ===========================================
// Playlist Form Dialog
// ===========================================

function PlaylistFormDialog({
  open,
  onClose,
  onSubmit,
  playlist,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: PlaylistFormData) => void;
  playlist?: CuratedPlaylist | null;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<PlaylistFormData>(defaultFormData);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    if (playlist) {
      setFormData({
        name: playlist.name || "",
        slug: playlist.slug || "",
        description: playlist.description || "",
        coverImageUrl: playlist.coverImageUrl || "",
        coverColor: playlist.coverColor || "#f97316",
        spotifyPlaylistId: playlist.spotifyPlaylistId || "",
        spotifyPlaylistUrl: playlist.spotifyPlaylistUrl || "",
        isPublic: playlist.isPublic !== undefined ? playlist.isPublic : true,
        isActive: playlist.isActive !== undefined ? playlist.isActive : true,
        priority: playlist.priority || 0,
      });
      setCoverPreview(playlist.coverImageUrl || null);
    } else {
      setFormData(defaultFormData);
      setCoverPreview(null);
    }
  }, [playlist]);

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: slugify(name),
    }));
  };

  const handleCoverUpload = async (file: File) => {
    setIsUploadingCover(true);
    try {
      // Get Dropbox access token
      const tokenRes = await fetch("/api/admin/dropbox/token");
      const tokenData = await tokenRes.json();
      if (!tokenData.success || !tokenData.data?.token) {
        // Fallback: convert to base64 data URL for local storage
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setFormData((prev) => ({ ...prev, coverImageUrl: dataUrl }));
          setCoverPreview(dataUrl);
        };
        reader.readAsDataURL(file);
        setIsUploadingCover(false);
        return;
      }

      const accessToken = tokenData.data.token;

      // Generate unique filename
      const ext = file.name.split(".").pop() || "jpg";
      const uniqueId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const filename = `playlist_cover_${uniqueId}.${ext}`;
      const dropboxPath = `/playlists/${filename}`;

      // Upload to Dropbox
      const arrayBuffer = await file.arrayBuffer();
      const uploadResponse = await fetch("https://content.dropboxapi.com/2/files/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/octet-stream",
          "Dropbox-API-Arg": JSON.stringify({
            path: dropboxPath,
            mode: "overwrite",
            autorename: false,
            mute: false,
          }),
        },
        body: arrayBuffer,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      // Create shared link
      let sharedUrl: string;
      try {
        const linkResponse = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: dropboxPath,
            settings: { access: "viewer", audience: "public", requested_visibility: "public" },
          }),
        });

        if (linkResponse.ok) {
          const data = await linkResponse.json();
          sharedUrl = data.url
            .replace("?dl=0", "?raw=1")
            .replace("&dl=0", "&raw=1");
          if (!sharedUrl.includes("raw=1")) sharedUrl = sharedUrl + (sharedUrl.includes("?") ? "&" : "?") + "raw=1";
        } else {
          // Try to get existing link
          const listResponse = await fetch("https://api.dropboxapi.com/2/sharing/list_shared_links", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ path: dropboxPath, direct_only: true }),
          });

          if (listResponse.ok) {
            const listData = await listResponse.json();
            if (listData.links && listData.links.length > 0) {
              sharedUrl = listData.links[0].url
                .replace("?dl=0", "?raw=1")
                .replace("&dl=0", "&raw=1");
              if (!sharedUrl.includes("raw=1")) sharedUrl = sharedUrl + (sharedUrl.includes("?") ? "&" : "?") + "raw=1";
            } else {
              throw new Error("Could not get shared link");
            }
          } else {
            throw new Error("Could not get existing shared link");
          }
        }
      } catch (linkError) {
        throw new Error(`Link error: ${(linkError as Error).message}`);
      }

      setFormData((prev) => ({ ...prev, coverImageUrl: sharedUrl }));
      setCoverPreview(sharedUrl);
    } catch (error) {
      console.error("Cover upload error:", error);
      alert(`Error al subir la imagen: ${(error as Error).message}`);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const isEditing = !!playlist;

  // Extract Spotify playlist ID from URL (for auto-fill in form)
  const extractSpotifyPlaylistIdLocal = (url: string): string | null => {
    const uriMatch = url.match(/spotify:playlist:([a-zA-Z0-9]+)/);
    if (uriMatch) return uriMatch[1];
    const urlMatch = url.match(/spotify\.com\/(?:embed\/)?(?:intl-[a-z]{2}\/)?playlist\/([a-zA-Z0-9]+)/);
    if (urlMatch) return urlMatch[1];
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-slc-dark border-slc-border text-white max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="font-oswald uppercase">
            {isEditing ? "Editar Playlist" : "Crear Playlist"}
          </DialogTitle>
          <DialogDescription className="text-slc-muted">
            {isEditing
              ? "Modifica los detalles de la playlist"
              : "Configura los detalles de la nueva playlist"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto flex-1 min-h-0 pr-1">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-slc-muted mb-1.5 block">
              Nombre *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ej: Gran Reserva"
              className="bg-slc-card border-slc-border"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="text-sm font-medium text-slc-muted mb-1.5 block">
              Slug
            </label>
            <Input
              value={formData.slug}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: e.target.value }))
              }
              placeholder="gran-reserva"
              className="bg-slc-card border-slc-border"
            />
            <p className="text-xs text-slc-muted mt-1">
              Se genera automáticamente a partir del nombre
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-slc-muted mb-1.5 block">
              Descripción
            </label>
            <Input
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Los mejores tracks del roster"
              className="bg-slc-card border-slc-border"
            />
          </div>

          {/* Cover Color */}
          <div>
            <label className="text-sm font-medium text-slc-muted mb-1.5 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Color de Portada
            </label>
            <ColorPicker
              value={formData.coverColor}
              onChange={(color) =>
                setFormData((prev) => ({ ...prev, coverColor: color }))
              }
            />
          </div>

          {/* Cover Image Upload */}
          <div>
            <label className="text-sm font-medium text-slc-muted mb-1.5 block">
              Imagen de Portada
            </label>
            {coverPreview ? (
              <div className="relative w-full aspect-square max-w-[200px] rounded-xl overflow-hidden bg-slc-card group">
                <img
                  src={coverPreview}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleCoverUpload(file);
                      };
                      input.click();
                    }}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
                    title="Cambiar imagen"
                  >
                    <ImagePlus className="w-4 h-4 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, coverImageUrl: "" }));
                      setCoverPreview(null);
                    }}
                    className="w-8 h-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center"
                    title="Eliminar imagen"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-slc-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleCoverUpload(file);
                  };
                  input.click();
                }}
              >
                {isUploadingCover ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <span className="text-sm text-slc-muted">Subiendo...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <ImagePlus className="w-8 h-8 text-slc-muted" />
                    <span className="text-sm text-slc-muted">Haz clic para subir imagen</span>
                    <span className="text-xs text-slc-muted">JPG, PNG, WebP</span>
                  </div>
                )}
              </div>
            )}
            <div className="mt-2">
              <p className="text-xs text-slc-muted mb-1">O pega una URL directamente:</p>
              <Input
                value={formData.coverImageUrl}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    coverImageUrl: e.target.value,
                  }));
                  setCoverPreview(e.target.value || null);
                }}
                placeholder="https://..."
                className="bg-slc-card border-slc-border text-xs"
              />
            </div>
          </div>

          {/* Spotify Playlist URL (auto-extracts ID) */}
          <div>
            <label className="text-sm font-medium text-slc-muted mb-1.5 block">
              Spotify Playlist URL
            </label>
            <Input
              value={formData.spotifyPlaylistUrl}
              onChange={(e) => {
                const url = e.target.value;
                setFormData((prev) => {
                  const updates = { ...prev, spotifyPlaylistUrl: url };
                  // Auto-extract playlist ID from URL
                  const extractedId = extractSpotifyPlaylistIdLocal(url);
                  if (extractedId) {
                    updates.spotifyPlaylistId = extractedId;
                  }
                  return updates;
                });
              }}
              placeholder="https://open.spotify.com/playlist/..."
              className="bg-slc-card border-slc-border"
            />
            <p className="text-xs text-slc-muted mt-1">
              Pega la URL de Spotify y se extraerá el ID automáticamente.
              Luego usa "Sync Spotify" para importar los tracks.
            </p>
            {formData.spotifyPlaylistId && (
              <p className="text-xs text-green-500 mt-1">
                ID: {formData.spotifyPlaylistId}
              </p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="text-sm font-medium text-slc-muted mb-1.5 block">
              Prioridad
            </label>
            <Input
              type="number"
              value={formData.priority}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  priority: Number.parseInt(e.target.value) || 0,
                }))
              }
              placeholder="0"
              className="bg-slc-card border-slc-border"
            />
            <p className="text-xs text-slc-muted mt-1">
              Mayor prioridad = se muestra primero
            </p>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isPublic: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-slc-border"
              />
              <span className="text-sm">Pública</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isActive: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded border-slc-border"
              />
              <span className="text-sm">Activa</span>
            </label>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t border-slc-border/30 pt-4 mt-2">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit(formData)}
            disabled={isSubmitting || !formData.name.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : isEditing ? (
              "Guardar Cambios"
            ) : (
              "Crear Playlist"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================
// Delete Confirmation Dialog
// ===========================================

function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  playlistName,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  playlistName: string;
  isSubmitting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-slc-dark border-slc-border text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="font-oswald uppercase text-red-500">
            Eliminar Playlist
          </DialogTitle>
          <DialogDescription className="text-slc-muted">
            ¿Estás seguro de que quieres eliminar &quot;{playlistName}&quot;?
            Esta acción no se puede deshacer y se eliminarán todos los tracks
            asociados.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================
// Main Page Component
// ===========================================

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [playlistTracksList, setPlaylistTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTracks, setLoadingTracks] = useState(false);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editPlaylist, setEditPlaylist] = useState<CuratedPlaylist | null>(
    null,
  );
  const [deletePlaylist, setDeletePlaylist] = useState<CuratedPlaylist | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingSpotify, setIsSyncingSpotify] = useState(false);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyChecking, setSpotifyChecking] = useState(true);
  const [spotifyRedirecting, setSpotifyRedirecting] = useState(false);
  const [spotifyAccessToken, setSpotifyAccessToken] = useState<string | null>(null);

  // Spotify Import dialog states
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [importCustomName, setImportCustomName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    errorType?: string;
  } | null>(null);

  useEffect(() => {
    fetchPlaylists();

    // Handle Spotify OAuth callback URL parameters FIRST
    const params = new URLSearchParams(window.location.search);
    const isSpotifyCallback = params.get("spotify_connected") === "true";
    const hasSpotifyError = params.has("spotify_error");

    if (isSpotifyCallback) {
      // Trust the callback success — tokens were stored server-side before redirect.
      // This is the GROUND TRUTH — the server confirmed tokens are in the DB.
      // Do NOT let a subsequent DB check override this, because:
      //   1. Turso DB replication lag may cause the read to miss the just-written tokens
      //   2. A cold-started serverless function may fail to connect to DB
      //   3. The server already verified the tokens before redirecting here
      setSpotifyConnected(true);
      setSpotifyChecking(false);

      // CRITICAL: Read the access token directly from the URL params.
      // The callback route now includes the access token in the redirect URL
      // so we have it immediately WITHOUT needing a DB read (which can fail
      // due to Turso replication lag). This is the key fix for the
      // "connect → sync → denied" loop.
      const accessTokenFromUrl = params.get("spotify_access_token");
      const expiresInFromUrl = params.get("spotify_expires_in");

      if (accessTokenFromUrl) {
        setSpotifyAccessToken(accessTokenFromUrl);
        console.log("[Spotify] Access token received from callback URL — no DB read needed");
      } else {
        console.warn("[Spotify] No access token in callback URL — will need to fetch from DB");
      }

      const scopeWarning = params.get("spotify_scope_warning");
      if (scopeWarning) {
        alert(`Spotify conectado, pero algunos permisos podrían no estar disponibles: ${scopeWarning}. Si la importación falla, intenta reconectar.`);
      } else {
        alert("Spotify conectado exitosamente. Ya puedes importar tracks.");
      }
      // Clean up URL (remove access token and other params for security)
      window.history.replaceState({}, "", "/admin/curated-channels/playlists");

      // Fetch the access token in the background ONLY if we didn't get one from the URL.
      // If we DID get one from the URL, we still do a delayed check to verify the DB
      // has the tokens (for future page loads), but we don't need the result immediately.
      const tryGetAccessToken = async (attempt = 0) => {
        try {
          const res = await fetch("/api/admin/spotify/token");
          const data = await res.json();
          if (data.connected && data.accessToken) {
            // Only update if we don't already have a token from the URL
            setSpotifyAccessToken(prev => prev || data.accessToken);
            console.log("[Spotify] DB token check confirmed — tokens are persisted");
          } else if (attempt < 4) {
            // DB may not have replicated yet — retry with exponential backoff
            const delay = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s, 16s
            console.log(`[Spotify] Token not available yet (attempt ${attempt + 1}), retrying in ${delay}ms...`);
            setTimeout(() => tryGetAccessToken(attempt + 1), delay);
          } else {
            // Even after retries, we don't override spotifyConnected — the server confirmed it.
            // The sync endpoint will get its own token from the DB when needed.
            console.warn("[Spotify] Could not fetch access token from DB after OAuth, but connection is confirmed via URL token. Sync will use the URL-provided token.");
          }
        } catch {
          if (attempt < 4) {
            const delay = 2000 * Math.pow(2, attempt);
            setTimeout(() => tryGetAccessToken(attempt + 1), delay);
          }
        }
      };

      if (accessTokenFromUrl) {
        // We have the token from URL — just verify DB has it for future page loads
        setTimeout(() => tryGetAccessToken(0), 5000);
      } else {
        // No token from URL — need to get it from DB with retries
        setTimeout(() => tryGetAccessToken(0), 1000);
      }
    } else if (hasSpotifyError) {
      const error = params.get("spotify_error");
      const errorMessages: Record<string, string> = {
        access_denied: "Autorización de Spotify denegada.",
        no_code: "No se recibió el código de autorización.",
        token_exchange_failed: "Error al intercambiar el código de Spotify.",
        no_refresh_token: "No se recibió el refresh token de Spotify.",
        callback_error: "Error en el callback de Spotify.",
        db_write_failed: "Error al guardar los tokens de Spotify en la base de datos. Intenta de nuevo.",
        token_verify_failed: "No se pudieron verificar los tokens guardados. Intenta de nuevo.",
        scope_missing: params.get("spotify_detail") || "Faltan permisos de Spotify. Necesitas autorizar con permisos de lectura de playlists. Intenta reconectar.",
      };
      alert(errorMessages[error || ""] || "Error al conectar Spotify.");
      window.history.replaceState({}, "", "/admin/curated-channels/playlists");
      // Still check connection after error
      checkSpotifyConnection();
    } else {
      // Normal page load — check Spotify connection
      checkSpotifyConnection();
    }
  }, []);

  useEffect(() => {
    if (selectedPlaylist) {
      fetchPlaylistTracks(selectedPlaylist);
    }
  }, [selectedPlaylist]);

  const fetchPlaylists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/curated-playlists");
      const data = await res.json();
      if (data.success) {
        setPlaylists(data.data);
        if (data.data.length > 0 && !selectedPlaylist) {
          setSelectedPlaylist(data.data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching playlists:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedPlaylist]);

  const fetchPlaylistTracks = async (playlistId: string) => {
    setLoadingTracks(true);
    try {
      const res = await fetch(`/api/admin/playlists?playlistId=${playlistId}`);
      const data = await res.json();
      if (data.success) {
        setPlaylistTracks(data.data);
      }
    } catch (error) {
      console.error("Error fetching playlist tracks:", error);
    } finally {
      setLoadingTracks(false);
    }
  };

  const handleCreatePlaylist = async (formData: PlaylistFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/curated-playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateDialog(false);
        await fetchPlaylists();
        setSelectedPlaylist(data.data.id);
      } else {
        alert(data.error || "Error creating playlist");
      }
    } catch (error) {
      console.error("Error creating playlist:", error);
      alert("Error creating playlist");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePlaylist = async (formData: PlaylistFormData) => {
    if (!editPlaylist) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/curated-playlists/${editPlaylist.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );
      const data = await res.json();
      if (data.success) {
        setEditPlaylist(null);
        await fetchPlaylists();
        if (selectedPlaylist) {
          fetchPlaylistTracks(selectedPlaylist);
        }
      } else {
        alert(data.error || "Error updating playlist");
      }
    } catch (error) {
      console.error("Error updating playlist:", error);
      alert("Error updating playlist");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!deletePlaylist) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/curated-playlists/${deletePlaylist.id}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();
      if (data.success) {
        if (selectedPlaylist === deletePlaylist.id) {
          setSelectedPlaylist(null);
          setPlaylistTracks([]);
        }
        setDeletePlaylist(null);
        await fetchPlaylists();
      } else {
        alert(data.error || "Error deleting playlist");
      }
    } catch (error) {
      console.error("Error deleting playlist:", error);
      alert("Error deleting playlist");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!confirm("¿Eliminar este track de la playlist?")) return;

    try {
      const res = await fetch(`/api/admin/playlists/${trackId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchPlaylists();
        if (selectedPlaylist) {
          fetchPlaylistTracks(selectedPlaylist);
        }
      }
    } catch (error) {
      console.error("Error removing track:", error);
    }
  };

  const handleMoveTrack = async (trackId: string, direction: "up" | "down") => {
    const track = playlistTracksList.find((t) => t.id === trackId);
    if (!track) return;

    const currentIndex = playlistTracksList.findIndex((t) => t.id === trackId);
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= playlistTracksList.length) return;

    const otherTrack = playlistTracksList[newIndex];

    try {
      await Promise.all([
        fetch(`/api/admin/playlists/${track.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: otherTrack.position }),
        }),
        fetch(`/api/admin/playlists/${otherTrack.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: track.position }),
        }),
      ]);

      if (selectedPlaylist) {
        fetchPlaylistTracks(selectedPlaylist);
      }
    } catch (error) {
      console.error("Error moving track:", error);
    }
  };

  const checkSpotifyConnection = async () => {
    setSpotifyChecking(true);
    try {
      const res = await fetch("/api/admin/spotify/token");
      const data = await res.json();
      const isConnected = data.connected === true;
      setSpotifyConnected(isConnected);
      // Store the access token so we can pass it to the sync endpoint
      // This avoids the sync endpoint having to read from DB independently
      if (isConnected && data.accessToken) {
        setSpotifyAccessToken(data.accessToken);
      } else {
        setSpotifyAccessToken(null);
      }
    } catch {
      setSpotifyConnected(false);
      setSpotifyAccessToken(null);
    } finally {
      setSpotifyChecking(false);
    }
  };

  const handleConnectSpotify = () => {
    // Prevent double-redirect (guard against infinite loops)
    if (spotifyRedirecting) return;
    setSpotifyRedirecting(true);
    // Redirect to Spotify OAuth flow
    window.location.href = "/api/admin/spotify/auth";
  };

  const handleSyncFromSpotify = async (playlistId: string) => {
    if (!spotifyConnected) {
      alert("Necesitas conectar tu cuenta de Spotify primero. Haz clic en 'Conectar Spotify' para autorizar el acceso.");
      return;
    }
    setIsSyncingSpotify(true);
    try {
      // Get a fresh access token from the server before syncing.
      // The server handles refreshing expired tokens and reading from DB.
      // We pass the token to the sync endpoint so it doesn't need to do its own DB read.
      // If the server can't provide a token, the sync endpoint will try independently.
      let tokenToUse: string | null = spotifyAccessToken; // Start with existing token

      try {
        const tokenRes = await fetch("/api/admin/spotify/token");
        const tokenData = await tokenRes.json();
        if (tokenData.connected && tokenData.accessToken) {
          tokenToUse = tokenData.accessToken;
          setSpotifyAccessToken(tokenData.accessToken);
          if (!spotifyConnected) setSpotifyConnected(true);
        } else if (tokenData.refreshFailed) {
          // Refresh token exists but refresh is temporarily failing
          // Don't reset spotifyConnected — the sync endpoint might still work
          console.warn("[Spotify] Token refresh temporarily failed, trying sync with existing token if available");
        } else {
          // Token endpoint says not connected — but DON'T immediately reset spotifyConnected.
          // This could be a Turso replication lag issue. The sync endpoint will try
          // its own token retrieval from DB. Only reset if the sync itself confirms auth is needed.
          console.warn("[Spotify] Token endpoint returned not connected — sync endpoint will try independently");
        }
      } catch {
        // Token check failed — sync endpoint will try its own token retrieval
        console.warn("[Spotify] Token fetch failed, sync endpoint will try independently");
      }

      const res = await fetch(
        `/api/admin/curated-playlists/${playlistId}/sync-spotify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tokenToUse ? { accessToken: tokenToUse } : {}),
        },
      );
      const data = await res.json();
      if (data.success) {
        alert(data.message || "Synced from Spotify!");
        await fetchPlaylists();
        fetchPlaylistTracks(playlistId);
      } else if (data.needsAuth) {
        // ONLY mark as disconnected when the SYNC ENDPOINT confirms auth is needed.
        // This is the ground truth — not the token endpoint (which can fail due to
        // Turso replication lag, cold starts, etc.)
        setSpotifyConnected(false);
        setSpotifyAccessToken(null);
        alert(data.error || "Tu cuenta de Spotify necesita reconectarse. Haz clic en 'Conectar Spotify' para reconectar.");
      } else {
        alert(data.error || "Error syncing from Spotify");
      }
    } catch (error) {
      console.error("Error syncing from Spotify:", error);
      alert("Error syncing from Spotify");
    } finally {
      setIsSyncingSpotify(false);
    }
  };

  // Helper to extract Spotify playlist ID from URL (client-side)
  const extractSpotifyPlaylistId = (url: string): string | null => {
    const types = ["playlist"];
    for (const type of types) {
      const uriMatch = url.match(new RegExp(`spotify:${type}:([a-zA-Z0-9]+)`));
      if (uriMatch) return uriMatch[1];
    }
    for (const type of types) {
      const urlMatch = url.match(
        new RegExp(`spotify\\.com/(?:embed/)?(?:intl-[a-z]{2}/)?${type}/([a-zA-Z0-9]+)`)
      );
      if (urlMatch) return urlMatch[1];
    }
    return null;
  };

  const handleImportSpotify = async () => {
    if (!spotifyUrl.trim()) {
      alert("Pega la URL de una playlist de Spotify");
      return;
    }

    // Validate it looks like a Spotify URL
    const extractedId = extractSpotifyPlaylistId(spotifyUrl.trim());
    if (!extractedId) {
      alert("URL de Spotify no válida. Usa el formato: https://open.spotify.com/playlist/...");
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      // Try to get a fresh access token before importing (same pattern as sync)
      let tokenToUse = spotifyAccessToken;
      try {
        const tokenRes = await fetch("/api/admin/spotify/token");
        const tokenData = await tokenRes.json();
        if (tokenData.connected && tokenData.accessToken) {
          tokenToUse = tokenData.accessToken;
          setSpotifyAccessToken(tokenData.accessToken);
          if (!spotifyConnected) setSpotifyConnected(true);
        }
      } catch {
        // Token check failed — import endpoint will try its own token retrieval
        console.warn("[Spotify Import] Token fetch failed, import endpoint will try independently");
      }

      const res = await fetch("/api/admin/curated-playlists/import-spotify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spotifyUrl: spotifyUrl.trim(),
          customName: importCustomName.trim() || undefined,
          accessToken: tokenToUse || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setImportResult({ success: true, message: data.message });
        // Refresh the playlists list
        await fetchPlaylists();
        // Auto-select the newly imported playlist
        if (data.data?.playlist?.id) {
          setSelectedPlaylist(data.data.playlist.id);
        }
      } else {
        setImportResult({ success: false, message: data.error || "Error al importar playlist", errorType: data.errorType });
      }
    } catch (error) {
      console.error("Error importing from Spotify:", error);
      setImportResult({
        success: false,
        message: "Error de conexión al importar playlist",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const currentPlaylist = playlists.find((p) => p.id === selectedPlaylist);

  return (
    <div className="min-h-screen bg-slc-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <Link
          href="/admin/curated-channels"
          className="inline-flex items-center gap-2 text-slc-muted hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Canales Curados
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-oswald text-3xl uppercase mb-2">
              Gestionar Playlists
            </h1>
            <p className="text-slc-muted">
              Crea, edita y organiza las playlists curadas
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!spotifyConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleConnectSpotify}
                disabled={spotifyChecking}
                className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                title="Conecta tu cuenta de Spotify para importar playlists"
              >
                <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Conectar Spotify
              </Button>
            )}
            {spotifyConnected && (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-green-500">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  Spotify conectado
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleConnectSpotify}
                  disabled={spotifyRedirecting}
                  className="text-xs text-slc-muted hover:text-white h-6 px-2"
                  title="Reconectar Spotify (re-autorizar con los permisos actualizados)"
                >
                  Reconectar
                </Button>
              </div>
            )}
            <Button
              onClick={() => {
                setSpotifyUrl("");
                setImportCustomName("");
                setImportResult(null);
                setShowImportDialog(true);
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Import className="w-4 h-4 mr-2" />
              Importar de Spotify
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Playlist
            </Button>
            <Link href="/admin/curated-channels/tracks">
              <Button variant="outline">
                <Music className="w-4 h-4 mr-2" />
                Explorar Tracks
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-20">
            <ListMusic className="w-16 h-16 text-slc-muted mx-auto mb-4" />
            <h3 className="font-oswald text-2xl uppercase mb-2">
              No hay playlists
            </h3>
            <p className="text-slc-muted mb-6">
              Importa una playlist desde Spotify para empezar
            </p>
            <div className="flex items-center gap-3 justify-center">
              <Button
                onClick={() => {
                  setSpotifyUrl("");
                  setImportCustomName("");
                  setImportResult(null);
                  setShowImportDialog(true);
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Import className="w-4 h-4 mr-2" />
                Importar de Spotify
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Playlist
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Playlist Selector */}
            <div className="lg:col-span-1">
              <div className="bg-slc-card border border-slc-border rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slc-border">
                  <h2 className="font-oswald uppercase">
                    Playlists ({playlists.length})
                  </h2>
                </div>
                <div className="divide-y divide-slc-border/50">
                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className={cn(
                        "flex items-center gap-3 p-4 transition-colors group",
                        selectedPlaylist === playlist.id
                          ? "bg-primary/10 border-l-2 border-primary"
                          : "hover:bg-slc-dark border-l-2 border-transparent",
                      )}
                    >
                      {/* Color indicator + Click area */}
                      <button
                        onClick={() => setSelectedPlaylist(playlist.id)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        {playlist.coverImageUrl ? (
                          <img
                            src={playlist.coverImageUrl}
                            alt={playlist.name}
                            className="w-8 h-8 rounded-lg flex-shrink-0 object-cover"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                            style={{
                              backgroundColor: playlist.coverColor || "#374151",
                            }}
                          >
                            <ListMusic className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {playlist.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-slc-muted">
                              {playlist.trackCount} tracks
                            </p>
                            {!playlist.isPublic && (
                              <span className="text-xs text-yellow-500">
                                Privada
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Edit / Delete buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditPlaylist(playlist)}
                          className="p-1.5 text-slc-muted hover:text-white transition-colors rounded hover:bg-slc-dark"
                          title="Editar playlist"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletePlaylist(playlist)}
                          className="p-1.5 text-slc-muted hover:text-red-500 transition-colors rounded hover:bg-slc-dark"
                          title="Eliminar playlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Playlist Tracks */}
            <div className="lg:col-span-3">
              <div className="bg-slc-card border border-slc-border rounded-2xl overflow-hidden">
                {/* Playlist Header */}
                {currentPlaylist && (
                  <div
                    className="p-6 border-b border-slc-border"
                    style={{
                      background: `linear-gradient(to right, ${
                        currentPlaylist.coverColor || "#f97316"
                      }20, transparent)`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-4">
                          {currentPlaylist.coverImageUrl ? (
                            <img
                              src={currentPlaylist.coverImageUrl}
                              alt={currentPlaylist.name}
                              className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                            />
                          ) : (
                            <div
                              className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center"
                              style={{
                                backgroundColor: currentPlaylist.coverColor || "#f97316",
                              }}
                            >
                              <ListMusic className="w-8 h-8 text-white" />
                            </div>
                          )}
                          <div>
                            <h2 className="font-oswald text-2xl uppercase mb-1">
                              {currentPlaylist.name}
                            </h2>
                            <p className="text-slc-muted">
                              {currentPlaylist.description || "Sin descripción"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2 ml-20">
                          <p className="text-sm">
                            <span className="font-oswald text-primary">
                              {playlistTracksList.length}
                            </span>{" "}
                            tracks
                          </p>
                          {currentPlaylist.spotifyPlaylistUrl && (
                            <a
                              href={currentPlaylist.spotifyPlaylistUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-green-500 hover:text-green-400 flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Spotify
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!spotifyConnected ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleConnectSpotify}
                            disabled={spotifyChecking}
                            className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                            title="Conectar tu cuenta de Spotify para importar tracks"
                          >
                            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                            </svg>
                            Conectar Spotify
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncFromSpotify(currentPlaylist.id)}
                            disabled={isSyncingSpotify || !currentPlaylist.spotifyPlaylistUrl}
                            title={
                              currentPlaylist.spotifyPlaylistUrl
                                ? "Importar tracks desde Spotify"
                                : "Agrega una URL de Spotify primero"
                            }
                            className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                          >
                            {isSyncingSpotify ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4 mr-1" />
                            )}
                            Sync Spotify
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditPlaylist(currentPlaylist)}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tracks List */}
                {loadingTracks ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : playlistTracksList.length === 0 ? (
                  <div className="text-center py-12">
                    <Disc3 className="w-12 h-12 text-slc-muted mx-auto mb-3" />
                    <p className="text-slc-muted mb-4">
                      Esta playlist está vacía
                    </p>
                    <Link href="/admin/curated-channels/tracks">
                      <Button>
                        <Music className="w-4 h-4 mr-2" />
                        Agregar Tracks
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slc-border/50">
                    {playlistTracksList
                      .sort((a, b) => a.position - b.position)
                      .map((track, index) => (
                        <div
                          key={track.id}
                          className="flex items-center gap-4 p-4 hover:bg-slc-dark/30 transition-colors group"
                        >
                          {/* Position & Move Buttons */}
                          <div className="flex flex-col items-center gap-1 w-10">
                            <button
                              onClick={() => handleMoveTrack(track.id, "up")}
                              disabled={index === 0}
                              className="p-1 text-slc-muted hover:text-white disabled:opacity-30"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-slc-muted font-mono w-6 text-center">
                              {track.position}
                            </span>
                            <button
                              onClick={() => handleMoveTrack(track.id, "down")}
                              disabled={index === playlistTracksList.length - 1}
                              className="p-1 text-slc-muted hover:text-white disabled:opacity-30"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Album Art */}
                          <div className="relative flex-shrink-0">
                            {track.albumImageUrl ? (
                              <Image
                                src={track.albumImageUrl}
                                alt=""
                                width={56}
                                height={56}
                                className="rounded object-cover"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded bg-slc-dark flex items-center justify-center">
                                <Disc3 className="w-7 h-7 text-slc-muted" />
                              </div>
                            )}
                          </div>

                          {/* Track Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {track.trackName}
                            </p>
                            <p className="text-sm text-slc-muted truncate">
                              {track.artistName}
                            </p>
                          </div>

                          {/* Added Date */}
                          <div className="hidden md:block text-xs text-slc-muted">
                            {new Date(track.addedAt).toLocaleDateString(
                              "es-MX",
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={`https://open.spotify.com/track/${track.spotifyTrackId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slc-muted hover:text-green-500 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleRemoveTrack(track.id)}
                              className="p-2 text-slc-muted hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spotify Import Dialog */}
      <Dialog
        open={showImportDialog}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setShowImportDialog(false);
            setImportResult(null);
          }
        }}
      >
        <DialogContent className="bg-slc-dark border-slc-border text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-oswald uppercase flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Importar de Spotify
            </DialogTitle>
            <DialogDescription className="text-slc-muted">
              Pega la URL de una playlist de Spotify para importarla automáticamente.
              {!spotifyConnected && (
                <span className="block mt-2 text-yellow-400 text-xs">
                  Necesitas conectar tu cuenta de Spotify primero para importar playlists.
                </span>
              )}
              {spotifyConnected && (
                <span className="block mt-2 text-slc-muted text-xs">
                  Si tienes problemas al importar, intenta{" "}
                  <button
                    onClick={handleConnectSpotify}
                    className="text-green-500 hover:text-green-400 underline"
                  >
                    reconectar Spotify
                  </button>{" "}
                  para actualizar los permisos.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Spotify URL Input */}
            <div>
              <label className="text-sm font-medium text-slc-muted mb-1.5 block">
                URL de Spotify Playlist *
              </label>
              <Input
                value={spotifyUrl}
                onChange={(e) => setSpotifyUrl(e.target.value)}
                placeholder="https://open.spotify.com/playlist/..."
                className="bg-slc-card border-slc-border"
                disabled={isImporting}
              />
              <p className="text-xs text-slc-muted mt-1">
                Pega la URL completa de la playlist en Spotify
              </p>
              {spotifyUrl && extractSpotifyPlaylistId(spotifyUrl) && (
                <p className="text-xs text-green-500 mt-1">
                  Playlist ID detectado: {extractSpotifyPlaylistId(spotifyUrl)}
                </p>
              )}
            </div>

            {/* Custom Name (optional) */}
            <div>
              <label className="text-sm font-medium text-slc-muted mb-1.5 block">
                Nombre personalizado (opcional)
              </label>
              <Input
                value={importCustomName}
                onChange={(e) => setImportCustomName(e.target.value)}
                placeholder="Se usará el nombre de Spotify si lo dejas vacío"
                className="bg-slc-card border-slc-border"
                disabled={isImporting}
              />
            </div>

            {/* Import Result */}
            {importResult && (
              <div
                className={cn(
                  "p-4 rounded-lg border",
                  importResult.success
                    ? "bg-green-500/10 border-green-500/30 text-green-400"
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                )}
              >
                <p className="text-sm font-medium">
                  {importResult.success ? "Importación exitosa" : "Error"}
                </p>
                <p className="text-xs mt-1">{importResult.message}</p>
                {!importResult.success && importResult.errorType === "NO_SPOTIFY_TOKEN" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 border-green-600 text-green-500 hover:bg-green-600/20"
                    onClick={handleConnectSpotify}
                  >
                    Conectar Spotify primero
                  </Button>
                )}
                {!importResult.success && (importResult.errorType === "AUTH_FAILED" || importResult.errorType === "PRIVATE_PLAYLIST") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 border-green-600 text-green-500 hover:bg-green-600/20"
                    onClick={handleConnectSpotify}
                  >
                    Reconectar Spotify
                  </Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slc-border/30 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportResult(null);
              }}
              disabled={isImporting}
            >
              {importResult?.success ? "Cerrar" : "Cancelar"}
            </Button>
            {!importResult?.success && (
              <Button
                onClick={handleImportSpotify}
                disabled={isImporting || !spotifyUrl.trim()}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Import className="w-4 h-4 mr-2" />
                    Importar Playlist
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Playlist Dialog */}
      <PlaylistFormDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreatePlaylist}
        isSubmitting={isSubmitting}
      />

      {/* Edit Playlist Dialog */}
      <PlaylistFormDialog
        open={!!editPlaylist}
        onClose={() => setEditPlaylist(null)}
        onSubmit={handleUpdatePlaylist}
        playlist={editPlaylist}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={!!deletePlaylist}
        onClose={() => setDeletePlaylist(null)}
        onConfirm={handleDeletePlaylist}
        playlistName={deletePlaylist?.name || ""}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
