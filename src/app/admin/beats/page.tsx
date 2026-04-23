"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Music2,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Gift,
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

interface Beat {
  id: string;
  title: string;
  bpm: number | null;
  key: string | null;
  price: number | null;
  isFree: boolean;
  tags: string | null;
  artistId: string;
  coverUrl: string | null;
  audioUrl: string | null;
  previewUrl: string | null;
  description: string | null;
  artist: { id: string; name: string };
}

interface BeatForm {
  title: string;
  artistId: string;
  bpm: string;
  key: string;
  coverUrl: string;
  audioUrl: string;
  previewUrl: string;
  price: string;
  isFree: boolean;
  tags: string;
  description: string;
}

const emptyForm: BeatForm = {
  title: "",
  artistId: "",
  bpm: "",
  key: "",
  coverUrl: "",
  audioUrl: "",
  previewUrl: "",
  price: "",
  isFree: false,
  tags: "",
  description: "",
};

const musicalKeys = [
  "C", "Cm", "C#", "C#m", "D", "Dm", "D#", "D#m", "E", "Em", "F", "Fm",
  "F#", "F#m", "G", "Gm", "G#", "G#m", "A", "Am", "A#", "A#m", "B", "Bm",
];

export default function AdminBeatsPage() {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Beat | null>(null);
  const [deleting, setDeleting] = useState<Beat | null>(null);
  const [form, setForm] = useState<BeatForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchBeats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/beats?${params}`);
      const data = await res.json();
      setBeats(Array.isArray(data) ? data : []);
    } catch {
      setBeats([]);
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
    fetchBeats();
  }, [fetchBeats]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (beat: Beat) => {
    setEditing(beat);
    setForm({
      title: beat.title,
      artistId: beat.artistId,
      bpm: beat.bpm?.toString() || "",
      key: beat.key || "",
      coverUrl: beat.coverUrl || "",
      audioUrl: beat.audioUrl || "",
      previewUrl: beat.previewUrl || "",
      price: beat.price?.toString() || "",
      isFree: beat.isFree,
      tags: beat.tags || "",
      description: beat.description || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.artistId) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        artistId: form.artistId,
        bpm: form.bpm ? parseInt(form.bpm) : null,
        key: form.key || null,
        coverUrl: form.coverUrl || null,
        audioUrl: form.audioUrl || null,
        previewUrl: form.previewUrl || null,
        price: form.price ? parseFloat(form.price) : null,
        isFree: form.isFree,
        tags: form.tags || null,
        description: form.description || null,
      };
      if (editing) {
        await fetch(`/api/admin/beats/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/admin/beats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setDialogOpen(false);
      fetchBeats();
    } catch (error) {
      console.error("Error saving beat:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await fetch(`/api/admin/beats/${deleting.id}`, { method: "DELETE" });
      setDeleteOpen(false);
      setDeleting(null);
      fetchBeats();
    } catch (error) {
      console.error("Error deleting beat:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Beats</h1>
          <p className="text-muted-foreground">
            Gestiona los beats disponibles
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Beat
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar beats..."
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
                <TableHead className="text-muted-foreground">BPM</TableHead>
                <TableHead className="text-muted-foreground">Tono</TableHead>
                <TableHead className="text-muted-foreground">Precio</TableHead>
                <TableHead className="text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-muted-foreground text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {beats.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    No se encontraron beats
                  </TableCell>
                </TableRow>
              ) : (
                beats.map((beat) => (
                  <TableRow key={beat.id} className="border-[#2a2a2a]">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Music2 className="h-4 w-4 text-primary" />
                        {beat.title}
                      </div>
                    </TableCell>
                    <TableCell>{beat.artist.name}</TableCell>
                    <TableCell>{beat.bpm ?? "—"}</TableCell>
                    <TableCell>{beat.key ?? "—"}</TableCell>
                    <TableCell>
                      {beat.isFree ? (
                        <Badge className="bg-primary/20 text-primary">
                          <Gift className="mr-1 h-3 w-3" />
                          Gratis
                        </Badge>
                      ) : beat.price ? (
                        `$${beat.price}`
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {beat.isFree ? (
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          Gratis
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          Pago
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-primary"
                          onClick={() => openEdit(beat)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-destructive"
                          onClick={() => {
                            setDeleting(beat);
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
              {editing ? "Editar Beat" : "Nuevo Beat"}
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
                placeholder="Título del beat"
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="bpm">BPM</Label>
                <Input
                  id="bpm"
                  type="number"
                  value={form.bpm}
                  onChange={(e) => setForm({ ...form, bpm: e.target.value })}
                  className="border-[#2a2a2a] bg-[#0a0a0a]"
                  placeholder="120"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="key">Tono</Label>
                <Select
                  value={form.key}
                  onValueChange={(value) => setForm({ ...form, key: value })}
                >
                  <SelectTrigger className="border-[#2a2a2a] bg-[#0a0a0a]">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {musicalKeys.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Precio (USD)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="border-[#2a2a2a] bg-[#0a0a0a]"
                placeholder="29.99"
              />
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
              <Label htmlFor="audioUrl">URL de Audio</Label>
              <Input
                id="audioUrl"
                value={form.audioUrl}
                onChange={(e) =>
                  setForm({ ...form, audioUrl: e.target.value })
                }
                className="border-[#2a2a2a] bg-[#0a0a0a]"
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="previewUrl">URL de Preview</Label>
              <Input
                id="previewUrl"
                value={form.previewUrl}
                onChange={(e) =>
                  setForm({ ...form, previewUrl: e.target.value })
                }
                className="border-[#2a2a2a] bg-[#0a0a0a]"
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (separados por coma)</Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="border-[#2a2a2a] bg-[#0a0a0a]"
                placeholder="trap, boom bap, lo-fi"
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
                placeholder="Descripción del beat"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] p-3">
              <Label htmlFor="isFree">Beat gratuito</Label>
              <Switch
                id="isFree"
                checked={form.isFree}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isFree: checked })
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
              {editing ? "Guardar Cambios" : "Crear Beat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-[#2a2a2a] bg-[#1a1a1a]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar beat?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el
              beat &quot;{deleting?.title}&quot;.
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
