"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  Plus,
  Search,
  Pencil,
  Trash2,
  Star,
  Loader2,
  MapPin,
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
import { Checkbox } from "@/components/ui/checkbox";

interface Artist {
  id: string;
  name: string;
}

interface EventData {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  imageUrl: string | null;
  ticketUrl: string | null;
  description: string | null;
  isFeatured: boolean;
  artists: { artistId: string; artist: { id: string; name: string } }[];
}

interface EventForm {
  title: string;
  date: string;
  endDate: string;
  venue: string;
  city: string;
  country: string;
  imageUrl: string;
  ticketUrl: string;
  description: string;
  isFeatured: boolean;
  artistIds: string[];
}

const emptyForm: EventForm = {
  title: "",
  date: "",
  endDate: "",
  venue: "",
  city: "",
  country: "",
  imageUrl: "",
  ticketUrl: "",
  description: "",
  isFeatured: false,
  artistIds: [],
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<EventData | null>(null);
  const [deleting, setDeleting] = useState<EventData | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/events?${params}`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
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
    fetchEvents();
  }, [fetchEvents]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (event: EventData) => {
    setEditing(event);
    setForm({
      title: event.title,
      date: new Date(event.date).toISOString().slice(0, 16),
      endDate: event.endDate
        ? new Date(event.endDate).toISOString().slice(0, 16)
        : "",
      venue: event.venue || "",
      city: event.city || "",
      country: event.country || "",
      imageUrl: event.imageUrl || "",
      ticketUrl: event.ticketUrl || "",
      description: event.description || "",
      isFeatured: event.isFeatured,
      artistIds: event.artists.map((a) => a.artistId),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        date: form.date,
        endDate: form.endDate || null,
        venue: form.venue || null,
        city: form.city || null,
        country: form.country || null,
        imageUrl: form.imageUrl || null,
        ticketUrl: form.ticketUrl || null,
        description: form.description || null,
        isFeatured: form.isFeatured,
        artistIds: form.artistIds,
      };
      if (editing) {
        await fetch(`/api/admin/events/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/admin/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setDialogOpen(false);
      fetchEvents();
    } catch (error) {
      console.error("Error saving event:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await fetch(`/api/admin/events/${deleting.id}`, { method: "DELETE" });
      setDeleteOpen(false);
      setDeleting(null);
      fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const toggleArtist = (artistId: string) => {
    setForm((prev) => ({
      ...prev,
      artistIds: prev.artistIds.includes(artistId)
        ? prev.artistIds.filter((id) => id !== artistId)
        : [...prev.artistIds, artistId],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Eventos</h1>
          <p className="text-muted-foreground">
            Gestiona los eventos y presentaciones
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Evento
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos..."
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
                <TableHead className="text-muted-foreground">Fecha</TableHead>
                <TableHead className="text-muted-foreground">Lugar</TableHead>
                <TableHead className="text-muted-foreground">Ciudad</TableHead>
                <TableHead className="text-muted-foreground">Destacado</TableHead>
                <TableHead className="text-muted-foreground text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No se encontraron eventos
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id} className="border-[#2a2a2a]">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        {event.title}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(event.date).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        {event.venue ? (
                          <>
                            <MapPin className="h-3 w-3" />
                            {event.venue}
                          </>
                        ) : (
                          "—"
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{event.city || "—"}</TableCell>
                    <TableCell>
                      {event.isFeatured ? (
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
                          onClick={() => openEdit(event)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:text-destructive"
                          onClick={() => {
                            setDeleting(event);
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
              {editing ? "Editar Evento" : "Nuevo Evento"}
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
                placeholder="Título del evento"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="date">Fecha de inicio *</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="border-[#2a2a2a] bg-[#0a0a0a]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">Fecha de fin</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                  className="border-[#2a2a2a] bg-[#0a0a0a]"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="venue">Lugar / Venue</Label>
              <Input
                id="venue"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                className="border-[#2a2a2a] bg-[#0a0a0a]"
                placeholder="Nombre del venue"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="border-[#2a2a2a] bg-[#0a0a0a]"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(e) =>
                    setForm({ ...form, country: e.target.value })
                  }
                  className="border-[#2a2a2a] bg-[#0a0a0a]"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="imageUrl">URL de Imagen</Label>
              <Input
                id="imageUrl"
                value={form.imageUrl}
                onChange={(e) =>
                  setForm({ ...form, imageUrl: e.target.value })
                }
                className="border-[#2a2a2a] bg-[#0a0a0a]"
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ticketUrl">URL de Boletos</Label>
              <Input
                id="ticketUrl"
                value={form.ticketUrl}
                onChange={(e) =>
                  setForm({ ...form, ticketUrl: e.target.value })
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
                placeholder="Descripción del evento"
              />
            </div>
            <div className="grid gap-2">
              <Label>Artistas participantes</Label>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] p-3 space-y-2">
                {artists.map((artist) => (
                  <label
                    key={artist.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={form.artistIds.includes(artist.id)}
                      onCheckedChange={() => toggleArtist(artist.id)}
                    />
                    <span className="text-sm">{artist.name}</span>
                  </label>
                ))}
                {artists.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No hay artistas disponibles
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] p-3">
              <Label htmlFor="isFeatured">Evento destacado</Label>
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
              disabled={saving || !form.title.trim() || !form.date}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {editing ? "Guardar Cambios" : "Crear Evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-[#2a2a2a] bg-[#1a1a1a]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el
              evento &quot;{deleting?.title}&quot;.
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
