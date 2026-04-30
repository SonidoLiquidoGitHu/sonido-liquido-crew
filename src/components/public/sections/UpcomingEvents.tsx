import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { EventCard } from "../cards/EventCard";
import type { Event } from "@/types";
import { Button } from "@/components/ui/button";

interface UpcomingEventsProps {
  events: Event[];
}

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  // Get featured event (first one) and rest
  const [featuredEvent, ...restEvents] = events;

  return (
    <section className="py-20 bg-slc-black">
      <div className="section-container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-12">
          <div>
            <h2 className="section-title text-left">Próximos Eventos</h2>
            <p className="section-subtitle text-left mt-2">
              Conciertos, fiestas y presentaciones en vivo
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/eventos">
              Ver calendario
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        {events.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slc-card border border-slc-border flex items-center justify-center">
              <Calendar className="w-8 h-8 text-slc-muted" />
            </div>
            <h3 className="font-oswald text-xl uppercase text-white mb-2">
              Próximamente
            </h3>
            <p className="text-slc-muted max-w-md mx-auto">
              No hay eventos programados en este momento.
              Síguenos en redes sociales para enterarte de los próximos shows.
            </p>
          </div>
        ) : (
          /* Events Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Featured Event */}
            {featuredEvent && (
              <div className="lg:row-span-2">
                <EventCard event={featuredEvent} variant="featured" />
              </div>
            )}

            {/* Other Events */}
            <div className="space-y-4">
              {restEvents.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
