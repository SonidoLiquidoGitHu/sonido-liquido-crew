"use client";

import { useState } from "react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { ArrowRight, Calendar, Clock, MapPin, Ticket, History, CalendarDays, LayoutGrid } from "lucide-react";
import { EventCard } from "../cards/EventCard";
import type { Event } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EventsSectionProps {
  upcomingEvents: Event[];
  pastEvents: Event[];
}

export function EventsSection({ upcomingEvents, pastEvents }: EventsSectionProps) {
  // Default to "all" to show all events
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "past">("all");

  // Get featured event (first upcoming one)
  const [featuredEvent, ...restUpcoming] = upcomingEvents;

  const hasUpcoming = upcomingEvents.length > 0;
  const hasPast = pastEvents.length > 0;
  const totalEvents = upcomingEvents.length + pastEvents.length;

  // Combine all events for the "all" view
  const allEvents = [...upcomingEvents, ...pastEvents];

  return (
    <section className="py-20 bg-gradient-to-b from-[#0a0a0a] to-[#111]">
      <div className="section-container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-oswald text-3xl md:text-4xl lg:text-5xl uppercase tracking-wide text-white">
              Eventos
            </h2>
            <p className="text-gray-400 mt-2">
              Conciertos, fiestas y presentaciones en vivo
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0 border-gray-600 text-white hover:bg-white/10">
            <Link href="/eventos">
              Ver calendario
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300",
              activeTab === "all"
                ? "bg-white text-black shadow-lg"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            Todos
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs",
              activeTab === "all" ? "bg-black/20" : "bg-white/10"
            )}>
              {totalEvents}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300",
              activeTab === "upcoming"
                ? "bg-primary text-white shadow-lg shadow-primary/30"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            )}
          >
            <CalendarDays className="w-4 h-4" />
            Próximos
            {hasUpcoming && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs",
                activeTab === "upcoming" ? "bg-white/20" : "bg-white/10"
              )}>
                {upcomingEvents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-300",
              activeTab === "past"
                ? "bg-gray-700 text-white shadow-lg"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            )}
          >
            <History className="w-4 h-4" />
            Anteriores
            {hasPast && (
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs",
                activeTab === "past" ? "bg-white/20" : "bg-white/10"
              )}>
                {pastEvents.length}
              </span>
            )}
          </button>
        </div>

        {/* All Events Tab */}
        {activeTab === "all" && (
          <div className="animate-in fade-in duration-300">
            {totalEvents === 0 ? (
              /* Empty State */
              <div className="text-center py-16 bg-white/5 rounded-xl border border-white/10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-oswald text-xl uppercase text-white mb-2">
                  Sin eventos
                </h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  No hay eventos registrados aún.
                  Síguenos en redes sociales para enterarte de los próximos shows.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Upcoming Events Section */}
                {hasUpcoming && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <CalendarDays className="w-5 h-5 text-primary" />
                      <h3 className="font-oswald text-lg uppercase text-white">Próximos Eventos</h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Featured Event */}
                      {featuredEvent && (
                        <div className="lg:row-span-2">
                          <EventCard event={featuredEvent} variant="featured" />
                        </div>
                      )}
                      {/* Other Upcoming Events */}
                      <div className="space-y-4">
                        {restUpcoming.slice(0, 4).map((event) => (
                          <EventCard key={event.id} event={event} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Past Events Section */}
                {hasPast && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <History className="w-5 h-5 text-gray-500" />
                      <h3 className="font-oswald text-lg uppercase text-gray-400">Eventos Anteriores</h3>
                      <div className="h-px flex-1 bg-gradient-to-r from-gray-700 to-transparent" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pastEvents.slice(0, 12).map((event) => (
                        <PastEventCard key={event.id} event={event} />
                      ))}
                    </div>
                    {pastEvents.length > 12 && (
                      <div className="text-center pt-6">
                        <Link
                          href="/eventos?filter=past"
                          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                          Ver {pastEvents.length - 12} eventos más
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Upcoming Events Tab */}
        {activeTab === "upcoming" && (
          <div className="animate-in fade-in duration-300">
            {!hasUpcoming ? (
              /* Empty State for Upcoming */
              <div className="text-center py-16 bg-white/5 rounded-xl border border-white/10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-oswald text-xl uppercase text-white mb-2">
                  Próximamente
                </h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  No hay eventos programados en este momento.
                  Síguenos en redes sociales para enterarte de los próximos shows.
                </p>
              </div>
            ) : (
              /* Upcoming Events Grid */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Featured Event */}
                {featuredEvent && (
                  <div className="lg:row-span-2">
                    <EventCard event={featuredEvent} variant="featured" />
                  </div>
                )}

                {/* Other Upcoming Events */}
                <div className="space-y-4">
                  {restUpcoming.slice(0, 3).map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}

                  {restUpcoming.length > 3 && (
                    <Link
                      href="/eventos"
                      className="block text-center py-3 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      Ver {restUpcoming.length - 3} eventos más →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Past Events Tab */}
        {activeTab === "past" && (
          <div className="animate-in fade-in duration-300">
            {!hasPast ? (
              /* Empty State for Past */
              <div className="text-center py-16 bg-white/5 rounded-xl border border-white/10">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700/50 border border-gray-600 flex items-center justify-center">
                  <History className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-oswald text-xl uppercase text-white mb-2">
                  Sin historial
                </h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  Aún no hay eventos pasados registrados.
                </p>
              </div>
            ) : (
              /* Past Events List */
              <div className="space-y-4">
                {/* Past events header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                  <span className="text-sm text-gray-500 uppercase tracking-wider">
                    Eventos Anteriores
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
                </div>

                {/* Past events grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastEvents.map((event) => (
                    <PastEventCard key={event.id} event={event} />
                  ))}
                </div>

                {pastEvents.length >= 10 && (
                  <div className="text-center pt-4">
                    <Link
                      href="/eventos?filter=past"
                      className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Ver más eventos anteriores
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// Compact card for past events - with cover image support
function PastEventCard({ event }: { event: Event }) {
  const eventDate = new Date(event.eventDate);
  const formattedDate = eventDate.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="group rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all overflow-hidden">
      {/* Cover Image */}
      <div className="relative aspect-[16/9] bg-gray-800">
        {event.imageUrl ? (
          <SafeImage
            src={event.imageUrl}
            alt={event.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
            <Calendar className="w-8 h-8 text-gray-600" />
          </div>
        )}

        {/* Date overlay badge */}
        <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex flex-col items-center">
          <span className="font-oswald text-lg font-bold text-white leading-none">
            {eventDate.getDate()}
          </span>
          <span className="text-[10px] text-gray-300 uppercase">
            {eventDate.toLocaleDateString("es-MX", { month: "short" })}
          </span>
        </div>

        {/* Year badge */}
        <div className="absolute top-3 right-3 px-2 py-0.5 bg-gray-900/80 backdrop-blur-sm rounded text-[10px] text-gray-400 font-medium">
          {eventDate.getFullYear()}
        </div>

        {/* Cancelled overlay */}
        {event.isCancelled && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="px-3 py-1.5 bg-red-500/80 text-white text-xs uppercase tracking-wider rounded font-bold">
              Cancelado
            </span>
          </div>
        )}
      </div>

      {/* Event Info */}
      <div className="p-3">
        <h3 className="font-oswald text-sm uppercase tracking-wide text-gray-300 truncate group-hover:text-white transition-colors mb-1.5">
          {event.title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{event.venue}, {event.city}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
