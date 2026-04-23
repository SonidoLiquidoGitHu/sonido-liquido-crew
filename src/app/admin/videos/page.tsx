"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Video,
  Plus,
  Search,
  Pencil,
  Trash2,
  Star,
  Loader2,
  ExternalLink,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Artist {
  id: string;
  name: string;
}

interface VideoData {
  id: string;
  title: string;
  youtubeId: string | null;
  artistId: string | null;
  thumbnail: string | null;
  description: string | null;
  duration: string | null;
  viewCount: number;
  isFeatured: boolean;
  publishedAt: string | null;
  artist: { id: string; name: string } | null;
}

interface VideoForm {
  title: string;
  youtubeId: string;
  artistId: string;
  thumbnail: string;
  description: string;
  isFeatured: boolean;
  publishedAt: string;
}

const emptyForm: VideoForm = {
  title: "",
  youtubeId: "",
  artistId: "",
  thumbnail: "",
  description: "",
  isFeatured: false,
  publishedAt: "",
};

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<VideoData | null>(null);
  const [deleting, setDeleting] = useState<VideoData | null>(null);
  const [form, setForm] = useState<VideoForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchVideos = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/videos?${params}`);
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchArtists = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/artists");
      const data = await res.json();
      setArtists(Array.isArray(data) ? data : []);
    } catch {
      setArtists([]);
    }
  }, []);

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (video: VideoData) => {
    setEditing(video);
    setForm({
      title: video.title,
      youtubeId: video.youtubeId || "",
      artistId: video.artistId || "",
      thumbnail: video.thumbnail || "",
      description: video.description || "",
      isFeatured: video.isFeatured,
      publishedAt: video.publishedAt
        ? new Date(video.publishedAt).toISOString().split("T")[0]
        : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        youtubeId: form.youtubeId || null,
        artistId: form.artistId || null,
        thumbnail: form.thumbnail || null,
        description: form.description || null,
        isFeatured: form.isFeatured,
        publishedAt: form.publishedAt || null,
      };
      if (editing) {
        await fetch(`/api/admin/videos/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/admin/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setDialogOpen(false);
      fetchVideos();
    } catch (error) {
      console.error("Error saving video:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await fetch(`/api/admin/videos/${deleting.id}`, { method: "DELETE" });
      setDeleteOpen(false);
      setDeleting(null);
      fetchVideos();
    } catch (error) {
      console.error("Error deleting video:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Videos</h1>
          <p className="text-muted-foreground">
            Gestiona los videos de YouTube
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Video
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-[#2a2a2a] bg-[#1a1a1a] pl-9"
          />
        </div>
      </div>

      <Card className="border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[#2a2a2a] hover:bg-transparent">
                <TableHead className="text-muted-foreground">Título</TableHead>
                <TableHead className="text-muted-foreground">YouTube ID</TableHead>
                <TableHead className="text-muted-foreground">Artista</TableHead>
                <TableHead className="text-muted-foreground">Destacado</TableHead>
                <TableHead className="text-muted-foreground text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No se encontraron videos
                  </TableCell>
                </TableRow>
              ) : (
                videos.map((video) => (
                  <TableRow key={video.id} className="border-[#2a2a2a]">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-primary" />
                        {video.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      {video.youtubeId ? (
                        <a
                          href={`https://youtube.com/watch?v=${video.youtubeId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                        >
                          {video.youtubeId}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {video.artist?.name || "—"}
                    </TableCell>
                    <TableCell>
                      {video.isFeatured ? (
                        <Badge className="bg-primary/20 text-primary">
                          <Star className="mr-1 h-3 w-3" />
                          Sí
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-primary"
                          onClick={() => openEdit(video)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-destructive"
                          onClick={() => {
                            setDeleting(video);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-[#2a2a2a] bg-[#1a1a1a] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Video" : "Nuevo Video"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="border-[#2a2a2a] bg-[#0a0a0a]"
                placeholder="Título del video"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="youtubeId">YouTube Video ID</Label>
              <Input
                id="youtubeId"
                value={form.youtubeId}
                onChange={(e) =>
                  setForm({ ...form, youtubeId: e.target.value })
                }
                className="border-[#2a2a2a] bg-[#0a0a0a]"
                placeholder="dQw4w9WgXcQ"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="artistId">Artista</Label>
              <Select
                value={form.artistId}
                onValueChange={(value) =>
                  setForm({ ...form, artistId: value })
                }
              >
                <SelectTrigger className="border-[#2a2a2a] bg-[#0a0a0a]">
                  <SelectValue placeholder="Seleccionar artista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin artista</SelectItem>
                  {artists.map((artist) => (
                    <SelectItem key={artist.id} value={artist.id}>
                      {artist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="thumbnail">URL de Miniatura</Label>
              <Input
                id="thumbnail"
                value={form.thumbnail}
                onChange={(e) =>
                  setForm({ ...form, thumbnail: e.target.value })
                }
                className="border-[#2a2a2a] bg-[#0a0a0a]"
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="flex min-h-[80px] w-full rounded-md border border-[#2a2a2a] bg-[#0a0a0a] px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Descripción del video"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="publishedAt">Fecha de publicación</Label>
              <Input
                id="publishedAt"
                type="date"
                value={form.publishedAt}
                onChange={(e) =>
                  setForm({ ...form, publishedAt: e.target.value })
                }
                className="border-[#2a2a2a] bg-[#0a0a0a]"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] p-3">
              <Label htmlFor="isFeatured">Video destacado</Label>
              <Switch
                id="isFeatured"
                checked={form.isFeatured}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isFeatured: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-[#2a2a2a]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editing ? "Guardar Cambios" : "Crear Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-[#2a2a2a] bg-[#1a1a1a]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar video?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el
              video &quot;{deleting?.title}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#2a2a2a]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
