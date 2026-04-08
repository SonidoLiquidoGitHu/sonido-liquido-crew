"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ExternalLink,
  Calendar,
  MapPin,
  Clock,
  Ticket,
  Star,
  AlertTriangle,
  CheckCircle,
  Loader2,
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
  createdAt: string;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      if (data.success) {
        setEvents(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este evento?")) return;

    try {
      const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setEvents(events.filter((e) => e.id !== id));
        setMessage({ type: "success", text: "Evento eliminado" });
      } else {
        setMessage({ type: "error", text: "Error al eliminar evento" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const now = new Date();

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.city.toLowerCase().includes(searchQuery.toLowerCase());

    const eventDate = new Date(event.eventDate);
    const isUpcoming = eventDate >= now;

    if (filter === "upcoming") return matchesSearch && isUpcoming;
    if (filter === "past") return matchesSearch && !isUpcoming;
    return matchesSearch;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const upcomingCount = events.filter((e) => new Date(e.eventDate) >= now).length;
  const pastCount = events.filter((e) => new Date(e.eventDate) < now).length;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase">Eventos</h1>
          <p className="text-slc-muted mt-1">
            Gestiona conciertos, presentaciones y eventos del crew
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/events/new">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Evento
          </Link>
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

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
          <input
            type="text"
            placeholder="Buscar eventos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slc-card border border-slc-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Todos ({events.length})
          </Button>
          <Button
            variant={filter === "upcoming" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("upcoming")}
          >
            Próximos ({upcomingCount})
          </Button>
          <Button
            variant={filter === "past" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("past")}
          >
            Pasados ({pastCount})
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-primary">{events.length}</div>
          <div className="text-xs text-slc-muted uppercase">Total</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-green-500">{upcomingCount}</div>
          <div className="text-xs text-slc-muted uppercase">Próximos</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-slc-muted">{pastCount}</div>
          <div className="text-xs text-slc-muted uppercase">Pasados</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-yellow-500">
            {events.filter((e) => e.isFeatured).length}
          </div>
          <div className="text-xs text-slc-muted uppercase">Destacados</div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-slc-dark border border-slc-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-slc-muted">Cargando eventos...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 text-slc-muted mx-auto mb-4" />
            <p className="text-slc-muted">No hay eventos</p>
            <Button asChild className="mt-4">
              <Link href="/admin/events/new">
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Evento
              </Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slc-border">
            {filteredEvents.map((event) => {
              const eventDate = new Date(event.eventDate);
              const isPast = eventDate < now;

              return (
                <div
                  key={event.id}
                  className={`p-4 hover:bg-slc-card/50 transition-colors ${
                    isPast ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Event Image */}
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-slc-card flex-shrink-0">
                      {event.imageUrl ? (
                        <SafeImage
                          src={event.imageUrl}
                          alt={event.title}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Calendar className="w-8 h-8 text-slc-muted" />
                        </div>
                      )}
                    </div>

                    {/* Event Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {event.isFeatured && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            )}
                            {event.isCancelled && (
                              <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-500 rounded-full">
                                Cancelado
                              </span>
                            )}
                            {isPast && (
                              <span className="px-2 py-0.5 text-xs bg-slc-card text-slc-muted rounded-full">
                                Pasado
                              </span>
                            )}
                          </div>
                          <h3 className="font-oswald text-lg uppercase truncate">
                            {event.title}
                          </h3>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {event.ticketUrl && (
                            <Button asChild variant="ghost" size="icon">
                              <a
                                href={event.ticketUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Ticket className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                          <Button asChild variant="ghost" size="icon">
                            <Link href={`/admin/events/${event.id}`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-400"
                            onClick={() => handleDelete(event.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Event Details */}
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slc-muted">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(event.eventDate)}</span>
                        </div>
                        {event.eventTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{event.eventTime}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {event.venue}, {event.city}
                          </span>
                        </div>
                      </div>

                      {event.description && (
                        <p className="mt-2 text-sm text-slc-muted line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
