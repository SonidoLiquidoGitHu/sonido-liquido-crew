"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Disc3,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Calendar,
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

interface Release {
  id: string;
  title: string;
  type: string;
  releaseDate: string | null;
  isUpcoming: boolean;
  artistId: string;
  coverUrl: string | null;
  spotifyUrl: string | null;
  description: string | null;
  presaveUrl: string | null;
  artist: { id: string; name: string };
}

interface ReleaseForm {
  title: string;
  artistId: string;
  type: string;
  coverUrl: string;
  releaseDate: string;
  spotifyUrl: string;
  description: string;
  isUpcoming: boolean;
  presaveUrl: string;
}

const emptyForm: ReleaseForm = {
  title: "",
  artistId: "",
  type: "single",
  coverUrl: "",
  releaseDate: "",
  spotifyUrl: "",
  description: "",
  isUpcoming: false,
  presaveUrl: "",
};

const releaseTypes = [
  { value: "single", label: "Single" },
  { value: "album", label: "Álbum" },
  { value: "ep", label: "EP" },
  { value: "compilation", label: "Compilación" },
];

export default function AdminReleasesPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Release | null>(null);
  const [deleting, setDeleting] = useState<Release | null>(null);
  const [form, setForm] = useState<ReleaseForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchReleases = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/releases?${params}`);
      const data = await res.json();
      setReleases(Array.isArray(data) ? data : []);
    } catch {
      setReleases([]);
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
    fetchReleases();
  }, [fetchReleases]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (release: Release) => {
    setEditing(release);
    setForm({
      title: release.title,
      artistId: release.artistId,
      type: release.type,
      coverUrl: release.coverUrl || "",
      releaseDate: release.releaseDate
        ? new Date(release.releaseDate).toISOString().split("T")[0]
        : "",
      spotifyUrl: release.spotifyUrl || "",
      description: release.description || "",
      isUpcoming: release.isUpcoming,
      presaveUrl: release.presaveUrl || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.artistId) return;
    setSaving(true);
    try {
      if (editing) {
        await fetch(`/api/admin/releases/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/admin/releases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setDialogOpen(false);
      fetchReleases();
    } catch (error) {
      console.error("Error saving release:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await fetch(`/api/admin/releases/${deleting.id}`, {
        method: "DELETE",
      });
      setDeleteOpen(false);
      setDeleting(null);
      fetchReleases();
    } catch (error) {
      console.error("Error deleting release:", error);
    }
  };

  const typeLabel = (type: string) =>
    releaseTypes.find((t) => t.value === type)?.label || type;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Lanzamientos</h1>
          <p className="text-muted-foreground">
            Gestiona los lanzamientos musicales
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Lanzamiento
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar lanzamientos..."
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
                <TableHead className="text-muted-foreground">Artista</TableHead>
                <TableHead className="text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-muted-foreground">Fecha</TableHead>
                <TableHead className="text-muted-foreground">Próximo</TableHead>
                <TableHead className="text-muted-foreground text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {releases.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No se encontraron lanzamientos
                  </TableCell>
                </TableRow>
              ) : (
                releases.map((release) => (
                  <TableRow
                    key={release.id}
                    className="border-[#2a2a2a]"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Disc3 className="h-4 w-4 text-primary" />
                        {release.title}
                      </div>
                    </TableCell>
                    <TableCell>{release.artist.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-muted">
                        {typeLabel(release.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {release.releaseDate
                          ? new Date(release.releaseDate).toLocaleDateString(
                              "es-MX"
                            )
                          : "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {release.isUpcoming ? (
                        <Badge className="bg-amber-500/20 text-amber-400">
                          Próximo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          —
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-primary"
                          onClick={() => openEdit(release)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-destructive"
                          onClick={() => {
                            setDeleting(release);
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
              {editing ? "Editar Lanzamiento" : "Nuevo Lanzamiento"}
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
                placeholder="Título del lanzamiento"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="artistId">Artista *</Label>
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
                  {artists.map((artist) => (
                    <SelectItem key={artist.id} value={artist.id}>
                      {artist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm({ ...form, type: value })}
              >
                <SelectTrigger className="border-[#2a2a2a] bg-[#0a0a0a]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {releaseTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="coverUrl">URL de Portada</Label>
              <Input
                id="coverUrl"
                value={form.coverUrl}
                onChange={(e) =>
                  setForm({ ...form, coverUrl: e.target.value })
                }
                className="border-[#2a2a2a] bg-[#0a0a0a]"
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="releaseDate">Fecha de Lanzamiento</Label>
              <Input
                id="releaseDate"
                type="date"
                value={form.releaseDate}
                onChange={(e) =>
                  setForm({ ...form, releaseDate: e.target.value })
                }
                className="border-[#2a2a2a] bg-[#0a0a0a]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="spotifyUrl">URL de Spotify</Label>
              <Input
                id="spotifyUrl"
                value={form.spotifyUrl}
                onChange={(e) =>
                  setForm({ ...form, spotifyUrl: e.target.value })
                }
                className="border-[#2a2a2a] bg-[#0a0a0a]"
                placeholder="https://open.spotify.com/..."
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
                placeholder="Descripción del lanzamiento"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="presaveUrl">URL de Pre-save</Label>
              <Input
                id="presaveUrl"
                value={form.presaveUrl}
                onChange={(e) =>
                  setForm({ ...form, presaveUrl: e.target.value })
                }
                className="border-[#2a2a2a] bg-[#0a0a0a]"
                placeholder="https://..."
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] p-3">
              <Label htmlFor="isUpcoming">Lanzamiento próximo</Label>
              <Switch
                id="isUpcoming"
                checked={form.isUpcoming}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isUpcoming: checked })
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
              disabled={saving || !form.title.trim() || !form.artistId}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editing ? "Guardar Cambios" : "Crear Lanzamiento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-[#2a2a2a] bg-[#1a1a1a]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lanzamiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el
              lanzamiento &quot;{deleting?.title}&quot;.
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
