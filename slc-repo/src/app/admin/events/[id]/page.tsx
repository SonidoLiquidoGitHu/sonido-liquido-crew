"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropboxUploader } from "@/components/admin/DropboxUploader";
import {
  ArrowLeft,
  Save,
  Calendar,
  Loader2,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Clock,
  Ticket,
  Image as ImageIcon,
  Star,
  Trash2,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string | null;
  venue: string;
  city: string;
  country: string;
  eventDate: string;
  eventTime: string | null;
  ticketUrl: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  isCancelled: boolean;
}

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    venue: "",
    city: "",
    country: "México",
    eventDate: "",
    eventTime: "",
    ticketUrl: "",
    imageUrl: "",
    isFeatured: false,
    isCancelled: false,
  });

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/admin/events/${id}`);
      const data = await res.json();
      if (data.success && data.data) {
        const event = data.data;
        setFormData({
          title: event.title || "",
          description: event.description || "",
          venue: event.venue || "",
          city: event.city || "",
          country: event.country || "México",
          eventDate: event.eventDate ? new Date(event.eventDate).toISOString().split("T")[0] : "",
          eventTime: event.eventTime || "",
          ticketUrl: event.ticketUrl || "",
          imageUrl: event.imageUrl || "",
          isFeatured: event.isFeatured || false,
          isCancelled: event.isCancelled || false,
        });
      }
    } catch (error) {
      console.error("Error fetching event:", error);
      showMessage("error", "Error al cargar evento");
    } finally {
      setIsFetching(false);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleImageUpload = (url: string, filename: string) => {
    setFormData((prev) => ({ ...prev, imageUrl: url }));
    showMessage("success", `Imagen "${filename}" subida`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.venue || !formData.city || !formData.eventDate) {
      showMessage("error", "Por favor completa los campos requeridos");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        showMessage("success", "Evento actualizado exitosamente");
        setTimeout(() => {
          router.push("/admin/events");
        }, 1500);
      } else {
        showMessage("error", data.error?.message || "Error al actualizar evento");
      }
    } catch (error) {
      showMessage("error", "Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar este evento?")) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/events/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        showMessage("success", "Evento eliminado");
        setTimeout(() => {
          router.push("/admin/events");
        }, 1000);
      } else {
        showMessage("error", "Error al eliminar evento");
      }
    } catch (error) {
      showMessage("error", "Error de conexión");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/events">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-oswald text-3xl uppercase">Editar Evento</h1>
          <p className="text-slc-muted mt-1">{formData.title}</p>
        </div>
        <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
          <Trash2 className="w-4 h-4 mr-2" />
          Eliminar
        </Button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-500"
              : "bg-red-500/10 border border-red-500/20 text-red-500"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Información del Evento
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slc-muted mb-2">Título *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Nombre del evento"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Descripción</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Descripción del evento..."
                    rows={4}
                    className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-500" />
                Ubicación
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm text-slc-muted mb-2">Venue / Lugar *</label>
                  <Input
                    value={formData.venue}
                    onChange={(e) => setFormData((prev) => ({ ...prev, venue: e.target.value }))}
                    placeholder="ej: Foro Sol, Teatro Metropolitan"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Ciudad *</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="ej: Ciudad de México"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">País</label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                    placeholder="México"
                  />
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Fecha y Hora
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slc-muted mb-2">Fecha *</label>
                  <Input
                    type="date"
                    value={formData.eventDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, eventDate: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-slc-muted mb-2">Hora</label>
                  <Input
                    type="time"
                    value={formData.eventTime}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, eventTime: e.target.value }))
                    }
                    placeholder="20:00"
                  />
                </div>
              </div>
            </div>

            {/* Tickets */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-orange-500" />
                Boletos
              </h2>

              <div>
                <label className="block text-sm text-slc-muted mb-2">
                  URL de compra de boletos
                </label>
                <Input
                  type="url"
                  value={formData.ticketUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, ticketUrl: e.target.value }))
                  }
                  placeholder="https://ticketmaster.com.mx/..."
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Image */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-purple-500" />
                Imagen del Evento
              </h2>

              <div className="aspect-video rounded-lg overflow-hidden bg-slc-card mb-4">
                {formData.imageUrl ? (
                  <img
                    src={formData.imageUrl}
                    alt="Event preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Calendar className="w-12 h-12 text-slc-muted" />
                  </div>
                )}
              </div>

              <DropboxUploader
                onUploadComplete={handleImageUpload}
                accept="image/*"
                maxSize={10}
                folder="/events"
                label="Subir imagen"
                currentUrl={formData.imageUrl}
              />

              <div className="mt-3">
                <label className="block text-sm text-slc-muted mb-2">O ingresa URL</label>
                <Input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Options */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <h2 className="font-oswald text-lg uppercase mb-4">Opciones</h2>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-slc-card rounded-lg cursor-pointer hover:bg-slc-card/80">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-slc-border"
                  />
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span>Evento Destacado</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slc-card rounded-lg cursor-pointer hover:bg-slc-card/80">
                  <input
                    type="checkbox"
                    checked={formData.isCancelled}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isCancelled: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-slc-border"
                  />
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span>Evento Cancelado</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-slc-dark border border-slc-border rounded-xl p-6">
              <div className="space-y-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Guardar Cambios
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/admin/events")}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
