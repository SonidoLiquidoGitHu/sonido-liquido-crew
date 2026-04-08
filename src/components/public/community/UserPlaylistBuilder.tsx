"use client";

import { useState, useEffect, useCallback } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import {
  ListMusic,
  Plus,
  Play,
  Pause,
  Trash2,
  GripVertical,
  Search,
  Share2,
  Download,
  Music,
  User,
  Save,
  CheckCircle,
  Loader2,
  ExternalLink,
  Clock,
  Heart,
  X,
  ChevronUp,
  ChevronDown,
  Copy,
  Instagram,
  Facebook,
  Check,
  Link2,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Track {
  id: string;
  type: "internal" | "spotify" | "beat";
  title: string;
  artist: string;
  coverUrl?: string;
  duration?: number;
  spotifyUri?: string;
  previewUrl?: string;
}

interface PlaylistTrack extends Track {
  position: number;
  addedAt: string;
}

interface Playlist {
  id: string;
  name: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  tracks: PlaylistTrack[];
  playCount: number;
  likeCount: number;
  isPublic: boolean;
  ownerName?: string;
  createdAt: string;
}

interface UserPlaylistBuilderProps {
  availableTracks?: Track[];
  initialPlaylist?: Playlist | null;
  onSave?: (playlist: Playlist) => void;
  className?: string;
}

export function UserPlaylistBuilder({
  availableTracks = [],
  initialPlaylist,
  onSave,
  className = "",
}: UserPlaylistBuilderProps) {
  const [playlist, setPlaylist] = useState<Playlist | null>(initialPlaylist || null);
  const [isCreating, setIsCreating] = useState(!initialPlaylist);
  const [tracks, setTracks] = useState<PlaylistTrack[]>(initialPlaylist?.tracks || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showTrackPicker, setShowTrackPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(initialPlaylist?.name || "");
  const [description, setDescription] = useState(initialPlaylist?.description || "");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState(initialPlaylist?.ownerName || "");
  const [isPublic, setIsPublic] = useState(initialPlaylist?.isPublic ?? true);

  // Playback state
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  // Fetch popular/recent tracks when picker opens
  const [popularTracks, setPopularTracks] = useState<Track[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(false);

  useEffect(() => {
    if (showTrackPicker && popularTracks.length === 0 && !loadingPopular) {
      setLoadingPopular(true);
      fetch("/api/releases?pageSize=20")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.items) {
            const tracks: Track[] = data.data.items.map((release: Record<string, unknown>) => ({
              id: release.id as string,
              type: "internal" as const,
              title: release.title as string,
              artist: (release.artistName as string) || "Sonido Líquido",
              coverUrl: release.coverImageUrl as string | undefined,
              spotifyUri: release.spotifyUri as string | undefined,
            }));
            setPopularTracks(tracks);
          }
        })
        .catch((err) => console.error("Error loading tracks:", err))
        .finally(() => setLoadingPopular(false));
    }
  }, [showTrackPicker, popularTracks.length, loadingPopular]);

  // Search for tracks
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delaySearch = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Search internal releases
        const res = await fetch(`/api/releases?search=${encodeURIComponent(searchQuery)}&limit=15`);
        const data = await res.json();

        if (data.success && data.data) {
          // Handle both array and object with items
          const items = Array.isArray(data.data) ? data.data : data.data.items || [];
          const results: Track[] = items.map((release: Record<string, unknown>) => ({
            id: release.id as string,
            type: "internal" as const,
            title: release.title as string,
            artist: (release.artistName as string) || "Sonido Líquido",
            coverUrl: release.coverImageUrl as string | undefined,
            spotifyUri: release.spotifyUri as string | undefined,
          }));
          setSearchResults(results);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  // Add track to playlist
  const addTrack = useCallback((track: Track) => {
    setTracks((prev) => {
      // Don't add duplicates
      if (prev.some((t) => t.id === track.id)) return prev;

      return [
        ...prev,
        {
          ...track,
          position: prev.length,
          addedAt: new Date().toISOString(),
        },
      ];
    });
    setSearchQuery("");
    setSearchResults([]);
    setShowTrackPicker(false);
  }, []);

  // Remove track from playlist
  const removeTrack = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev
        .filter((t) => t.id !== trackId)
        .map((t, i) => ({ ...t, position: i }))
    );
  }, []);

  // Move track up/down
  const moveTrack = useCallback((index: number, direction: "up" | "down") => {
    setTracks((prev) => {
      const newTracks = [...prev];
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= newTracks.length) return prev;

      [newTracks[index], newTracks[newIndex]] = [newTracks[newIndex], newTracks[index]];
      return newTracks.map((t, i) => ({ ...t, position: i }));
    });
  }, []);

  // Play preview
  const playPreview = useCallback((track: PlaylistTrack) => {
    if (!track.previewUrl && !track.spotifyUri) return;

    if (currentlyPlaying === track.id) {
      audioElement?.pause();
      setCurrentlyPlaying(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const previewUrl = track.previewUrl;
    if (previewUrl) {
      const audio = new Audio(previewUrl);
      audio.play();
      audio.onended = () => setCurrentlyPlaying(null);
      setAudioElement(audio);
      setCurrentlyPlaying(track.id);
    }
  }, [currentlyPlaying, audioElement]);

  // Save playlist
  const savePlaylist = async () => {
    if (!name.trim() || tracks.length === 0) {
      setError("Agrega un nombre y al menos una canción");
      return;
    }

    if (!ownerEmail.trim()) {
      setError("Ingresa tu email para guardar la playlist");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/community/playlists", {
        method: playlist ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: playlist?.id,
          name: name.trim(),
          description: description.trim(),
          ownerEmail: ownerEmail.trim(),
          ownerName: ownerName.trim(),
          isPublic,
          tracks: tracks.map((t) => ({
            trackType: t.type,
            trackId: t.id,
            trackTitle: t.title,
            trackArtist: t.artist,
            trackCoverUrl: t.coverUrl,
            trackDuration: t.duration,
            spotifyUri: t.spotifyUri,
            position: t.position,
          })),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setPlaylist(data.data);
        setSaved(true);
        setIsCreating(false);
        onSave?.(data.data);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || "Error al guardar");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setIsSaving(false);
    }
  };

  // Get share URL
  const getShareUrl = () => {
    if (playlist?.slug) {
      return `${window.location.origin}/playlists/${playlist.slug}`;
    }
    return window.location.href;
  };

  // Copy share link
  const copyShareLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Share to Facebook
  const shareToFacebook = () => {
    const url = getShareUrl();
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(`Escucha mi playlist "${name}" de Sonido Líquido Crew`)}`;
    window.open(shareUrl, "_blank", "width=600,height=400");
  };

  // Generate shareable image for Instagram/TikTok
  const generateShareImage = async (): Promise<string | null> => {
    setGeneratingImage(true);
    try {
      // Create a canvas to generate the share image
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Instagram story size (9:16)
      canvas.width = 1080;
      canvas.height = 1920;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#1a1a1a");
      gradient.addColorStop(0.5, "#0d0d0d");
      gradient.addColorStop(1, "#000000");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add orange accent at top
      const accentGradient = ctx.createLinearGradient(0, 0, canvas.width, 300);
      accentGradient.addColorStop(0, "rgba(249, 115, 22, 0.3)");
      accentGradient.addColorStop(1, "rgba(249, 115, 22, 0)");
      ctx.fillStyle = accentGradient;
      ctx.fillRect(0, 0, canvas.width, 400);

      // Logo/Brand text
      ctx.font = "bold 48px sans-serif";
      ctx.fillStyle = "#f97316";
      ctx.textAlign = "center";
      ctx.fillText("SONIDO LÍQUIDO CREW", canvas.width / 2, 120);

      // Playlist name
      ctx.font = "bold 72px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(name.toUpperCase(), canvas.width / 2, 300);

      // Track count
      ctx.font = "36px sans-serif";
      ctx.fillStyle = "#999999";
      ctx.fillText(`${tracks.length} canciones`, canvas.width / 2, 380);

      // Draw track covers in a grid
      const coverSize = 200;
      const gap = 20;
      const startY = 500;
      const maxCovers = Math.min(tracks.length, 9);
      const cols = 3;

      for (let i = 0; i < maxCovers; i++) {
        const track = tracks[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = (canvas.width - (cols * coverSize + (cols - 1) * gap)) / 2 + col * (coverSize + gap);
        const y = startY + row * (coverSize + gap);

        // Draw cover background
        ctx.fillStyle = "#333333";
        ctx.fillRect(x, y, coverSize, coverSize);

        // Try to load and draw the cover image
        if (track.coverUrl) {
          try {
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = track.coverUrl!;
            });
            ctx.drawImage(img, x, y, coverSize, coverSize);
          } catch {
            // If image fails, draw music icon placeholder
            ctx.fillStyle = "#666666";
            ctx.font = "48px sans-serif";
            ctx.fillText("🎵", x + coverSize / 2 - 24, y + coverSize / 2 + 16);
          }
        }
      }

      // Track list
      const listStartY = startY + Math.ceil(maxCovers / cols) * (coverSize + gap) + 80;
      ctx.font = "32px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";

      const maxTracksToShow = Math.min(tracks.length, 5);
      for (let i = 0; i < maxTracksToShow; i++) {
        const track = tracks[i];
        const y = listStartY + i * 60;
        ctx.fillStyle = "#f97316";
        ctx.fillText(`${i + 1}.`, 100, y);
        ctx.fillStyle = "#ffffff";
        const truncatedTitle = track.title.length > 30 ? track.title.substring(0, 30) + "..." : track.title;
        ctx.fillText(truncatedTitle, 150, y);
        ctx.fillStyle = "#666666";
        ctx.fillText(track.artist, 150, y + 35);
      }

      if (tracks.length > 5) {
        ctx.fillStyle = "#666666";
        ctx.fillText(`+ ${tracks.length - 5} más...`, 150, listStartY + 5 * 60 + 40);
      }

      // CTA
      ctx.font = "bold 42px sans-serif";
      ctx.fillStyle = "#f97316";
      ctx.textAlign = "center";
      ctx.fillText("ESCÚCHALA EN", canvas.width / 2, canvas.height - 200);
      ctx.font = "36px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("sonidoliquido.com", canvas.width / 2, canvas.height - 140);

      // Convert to data URL
      const dataUrl = canvas.toDataURL("image/png");
      return dataUrl;
    } catch (err) {
      console.error("Error generating share image:", err);
      return null;
    } finally {
      setGeneratingImage(false);
    }
  };

  // Download share image
  const downloadShareImage = async () => {
    const imageUrl = await generateShareImage();
    if (imageUrl) {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `${name.replace(/\s+/g, "-").toLowerCase()}-playlist.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Share text for social media
  const getShareText = () => {
    return `🎵 Mi playlist "${name}" de Sonido Líquido Crew\n\n${tracks.slice(0, 3).map((t, i) => `${i + 1}. ${t.title} - ${t.artist}`).join("\n")}${tracks.length > 3 ? `\n+ ${tracks.length - 3} más...` : ""}\n\n#SonidoLiquido #HipHopMexicano #Playlist`;
  };

  // Copy share text for Instagram/TikTok
  const copyShareText = () => {
    const text = getShareText();
    navigator.clipboard.writeText(text);
  };

  // Calculate total duration
  const totalDuration = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  return (
    <div className={cn("bg-slc-card border border-slc-border rounded-2xl overflow-hidden", className)}>
      {/* Header */}
      <div className="p-6 border-b border-slc-border">
        <div className="flex items-center gap-4">
          {/* Cover preview */}
          <div className="w-24 h-24 rounded-lg bg-slc-dark overflow-hidden flex-shrink-0">
            {tracks[0]?.coverUrl ? (
              <img
                src={tracks[0].coverUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ListMusic className="w-8 h-8 text-slc-muted" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {isCreating ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre de tu playlist"
                className="w-full text-2xl font-oswald uppercase bg-transparent border-none outline-none placeholder:text-slc-muted"
              />
            ) : (
              <h2 className="font-oswald text-2xl uppercase text-white truncate">
                {name || "Nueva Playlist"}
              </h2>
            )}
            <p className="text-sm text-slc-muted mt-1">
              {tracks.length} canciones{" "}
              {totalDuration > 0 && `• ${formatDuration(totalDuration)}`}
            </p>

            {playlist && !isCreating && (
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs text-slc-muted flex items-center gap-1">
                  <Play className="w-3 h-3" />
                  {playlist.playCount} reproducciones
                </span>
                <span className="text-xs text-slc-muted flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {playlist.likeCount} likes
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {playlist && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowShareModal(true)}
                  className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartir
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCreating(true)}
                  title="Editar"
                >
                  <User className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        {isCreating && (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            rows={2}
            className="w-full mt-4 px-3 py-2 bg-slc-dark border border-slc-border rounded-lg resize-none text-sm focus:outline-none focus:border-primary"
          />
        )}
      </div>

      {/* Track List */}
      <div className="max-h-[400px] overflow-y-auto">
        {tracks.length === 0 ? (
          <div className="py-12 text-center">
            <Music className="w-12 h-12 text-slc-muted/50 mx-auto mb-4" />
            <p className="text-slc-muted">No hay canciones aún</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setShowTrackPicker(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar canciones
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slc-border/50">
            {tracks.map((track, index) => (
              <div
                key={track.id}
                className="group flex items-center gap-3 p-3 hover:bg-slc-dark/50 transition-colors"
              >
                {/* Position / Play */}
                <div className="w-8 text-center flex-shrink-0">
                  {currentlyPlaying === track.id ? (
                    <button
                      onClick={() => playPreview(track)}
                      className="w-6 h-6 mx-auto text-primary"
                    >
                      <Pause className="w-5 h-5" />
                    </button>
                  ) : track.previewUrl ? (
                    <button
                      onClick={() => playPreview(track)}
                      className="w-6 h-6 mx-auto text-slc-muted hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                  ) : (
                    <span className="text-sm text-slc-muted">{index + 1}</span>
                  )}
                </div>

                {/* Cover */}
                <div className="w-10 h-10 rounded bg-slc-dark overflow-hidden flex-shrink-0">
                  {track.coverUrl ? (
                    <img
                      src={track.coverUrl}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-4 h-4 text-slc-muted" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {track.title}
                  </p>
                  <p className="text-xs text-slc-muted truncate">{track.artist}</p>
                </div>

                {/* Duration */}
                {track.duration && (
                  <span className="text-xs text-slc-muted">
                    {Math.floor(track.duration / 60)}:
                    {(track.duration % 60).toString().padStart(2, "0")}
                  </span>
                )}

                {/* Actions (editing mode) */}
                {isCreating && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveTrack(index, "up")}
                      disabled={index === 0}
                      className="p-1 text-slc-muted hover:text-white disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveTrack(index, "down")}
                      disabled={index === tracks.length - 1}
                      className="p-1 text-slc-muted hover:text-white disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeTrack(track.id)}
                      className="p-1 text-red-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Track Button */}
      {isCreating && (
        <div className="p-4 border-t border-slc-border">
          {showTrackPicker ? (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar canciones..."
                  autoFocus
                  className="w-full pl-10 pr-10 py-3 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => {
                    setShowTrackPicker(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slc-muted hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Results */}
              {isSearching && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto divide-y divide-slc-border/50 bg-slc-dark rounded-lg">
                  {searchResults.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => addTrack(track)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slc-border/30 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded bg-slc-card overflow-hidden flex-shrink-0">
                        {track.coverUrl ? (
                          <img
                            src={track.coverUrl}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music className="w-4 h-4 text-slc-muted" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {track.title}
                        </p>
                        <p className="text-xs text-slc-muted truncate">
                          {track.artist}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-primary" />
                    </button>
                  ))}
                </div>
              )}

              {searchQuery && !isSearching && searchResults.length === 0 && (
                <p className="text-sm text-slc-muted text-center py-4">
                  No se encontraron resultados
                </p>
              )}

              {/* Show popular tracks when no search */}
              {!searchQuery && !isSearching && (
                <div className="space-y-2">
                  <p className="text-xs text-slc-muted uppercase tracking-wider px-1">
                    Tracks Recientes
                  </p>
                  {loadingPopular ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : popularTracks.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto divide-y divide-slc-border/50 bg-slc-dark rounded-lg">
                      {popularTracks
                        .filter((t) => !tracks.some((added) => added.id === t.id))
                        .map((track) => (
                          <button
                            key={track.id}
                            onClick={() => addTrack(track)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-slc-border/30 transition-colors text-left"
                          >
                            <div className="w-10 h-10 rounded bg-slc-card overflow-hidden flex-shrink-0">
                              {track.coverUrl ? (
                                <img
                                  src={track.coverUrl}
                                  alt={track.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Music className="w-4 h-4 text-slc-muted" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">
                                {track.title}
                              </p>
                              <p className="text-xs text-slc-muted truncate">
                                {track.artist}
                              </p>
                            </div>
                            <Plus className="w-4 h-4 text-primary" />
                          </button>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slc-muted text-center py-4">
                      No hay tracks disponibles
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowTrackPicker(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar canción
            </Button>
          )}
        </div>
      )}

      {/* Save Section */}
      {isCreating && tracks.length > 0 && (
        <div className="p-4 border-t border-slc-border bg-slc-dark/50 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slc-muted mb-1">Tu email *</label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full px-3 py-2 bg-slc-dark border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-slc-muted mb-1">Tu nombre</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Nombre (opcional)"
                className="w-full px-3 py-2 bg-slc-dark border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded border-slc-border"
            />
            <span className="text-sm text-slc-muted">Hacer playlist pública</span>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            onClick={savePlaylist}
            disabled={isSaving || !name.trim() || !ownerEmail.trim()}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                ¡Guardado!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar playlist
              </>
            )}
          </Button>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slc-card border border-slc-border rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slc-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-oswald text-xl uppercase">Compartir Playlist</h3>
                    <p className="text-sm text-slc-muted">{name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-2 hover:bg-slc-dark rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slc-muted" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              {/* Social Share Buttons */}
              <div className="space-y-3">
                <p className="text-xs text-slc-muted uppercase tracking-wider">Compartir en redes sociales</p>

                {/* Instagram */}
                <button
                  onClick={downloadShareImage}
                  disabled={generatingImage}
                  className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-pink-500/30 rounded-xl hover:from-purple-500/20 hover:to-pink-500/20 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
                    <Instagram className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-white group-hover:text-pink-400 transition-colors">Instagram</p>
                    <p className="text-xs text-slc-muted">Descarga imagen para Stories/Posts</p>
                  </div>
                  {generatingImage ? (
                    <Loader2 className="w-5 h-5 text-pink-500 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5 text-slc-muted group-hover:text-pink-400 transition-colors" />
                  )}
                </button>

                {/* Facebook */}
                <button
                  onClick={shareToFacebook}
                  className="w-full flex items-center gap-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                    <Facebook className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-white group-hover:text-blue-400 transition-colors">Facebook</p>
                    <p className="text-xs text-slc-muted">Compartir en tu muro</p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-slc-muted group-hover:text-blue-400 transition-colors" />
                </button>

                {/* TikTok */}
                <button
                  onClick={downloadShareImage}
                  disabled={generatingImage}
                  className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/20 rounded-xl hover:bg-white/10 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center border border-white/20">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-white group-hover:text-white transition-colors">TikTok</p>
                    <p className="text-xs text-slc-muted">Descarga imagen para videos</p>
                  </div>
                  {generatingImage ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Download className="w-5 h-5 text-slc-muted group-hover:text-white transition-colors" />
                  )}
                </button>
              </div>

              {/* Copy Link */}
              <div className="space-y-3 pt-4 border-t border-slc-border">
                <p className="text-xs text-slc-muted uppercase tracking-wider">Copiar enlace</p>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-3 bg-slc-dark border border-slc-border rounded-lg text-sm text-slc-muted truncate">
                    {getShareUrl()}
                  </div>
                  <Button
                    onClick={copyShareLink}
                    variant="outline"
                    className={copiedLink ? "bg-green-500/20 border-green-500/50 text-green-400" : ""}
                  >
                    {copiedLink ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Copy Caption */}
              <div className="space-y-3 pt-4 border-t border-slc-border">
                <p className="text-xs text-slc-muted uppercase tracking-wider">Texto para caption</p>
                <div className="p-3 bg-slc-dark border border-slc-border rounded-lg">
                  <p className="text-sm text-slc-muted whitespace-pre-line line-clamp-4">
                    {getShareText()}
                  </p>
                </div>
                <Button
                  onClick={copyShareText}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar texto
                </Button>
              </div>

              {/* Tips */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-primary mb-1">Tips para compartir</p>
                    <ul className="text-xs text-slc-muted space-y-1">
                      <li>• Descarga la imagen y súbela a tu historia</li>
                      <li>• Usa los hashtags sugeridos para más alcance</li>
                      <li>• Tagea a @sonidoliquido en tus posts</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserPlaylistBuilder;
