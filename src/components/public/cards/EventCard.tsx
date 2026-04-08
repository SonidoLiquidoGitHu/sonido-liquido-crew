import { SafeImage } from "@/components/ui/safe-image";
import { Calendar, MapPin, Clock, Ticket } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Event } from "@/types";
import { Button } from "@/components/ui/button";

interface EventCardProps {
  event: Event;
  variant?: "default" | "featured";
}

// Parse date consistently using UTC to avoid hydration mismatches
function parseEventDate(dateStr: string | Date) {
  const date = new Date(dateStr);
  // Use UTC methods to ensure consistency between server and client
  return {
    day: date.getUTCDate(),
    month: ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"][date.getUTCMonth()],
    isPast: date.getTime() < Date.now() - (24 * 60 * 60 * 1000), // Consider past if more than 24h ago
  };
}

export function EventCard({ event, variant = "default" }: EventCardProps) {
  const { day, month, isPast } = parseEventDate(event.eventDate);

  if (variant === "featured") {
    return (
      <div className={cn(
        "relative rounded-xl overflow-hidden bg-slc-card border border-slc-border",
        isPast && "opacity-70"
      )}>
        {/* Image */}
        <div className="aspect-[21/9] relative">
          {event.imageUrl ? (
            <SafeImage
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-slc-dark flex items-center justify-center">
              <Calendar className="w-12 h-12 text-slc-muted" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slc-card to-transparent" />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Date Badge */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-16 h-16 bg-primary rounded-lg flex flex-col items-center justify-center">
              <span className="font-oswald text-2xl font-bold text-white leading-none">
                {day}
              </span>
              <span className="text-xs text-white/80 uppercase">{month}</span>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-oswald text-xl uppercase tracking-wide text-white">
                {event.title}
              </h3>

              <div className="mt-2 space-y-1">
                <p className="text-sm text-slc-muted flex items-center gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{event.venue} - {event.city}</span>
                </p>
                {event.eventTime && (
                  <p className="text-sm text-slc-muted flex items-center gap-2">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{event.eventTime}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <p className="mt-4 text-sm text-slc-muted line-clamp-2">
              {event.description}
            </p>
          )}

          {/* Actions */}
          {event.ticketUrl && !isPast && (
            <div className="mt-4">
              <Button asChild className="w-full sm:w-auto">
                <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer">
                  <Ticket className="w-4 h-4 mr-2" />
                  Comprar Boletos
                </a>
              </Button>
            </div>
          )}

          {isPast && (
            <div className="mt-4">
              <span className="text-xs uppercase tracking-wider text-slc-muted">
                Evento finalizado
              </span>
            </div>
          )}

          {event.isCancelled && (
            <div className="mt-4">
              <span className="text-xs uppercase tracking-wider text-red-500">
                Evento cancelado
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default compact variant - with cover image support
  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-lg bg-slc-card border border-slc-border hover:border-primary/50 transition-colors group",
      isPast && "opacity-70"
    )}>
      {/* Cover Image or Date */}
      {event.imageUrl ? (
        <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden relative">
          <SafeImage
            src={event.imageUrl}
            alt={event.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
          {/* Date overlay */}
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
            <span className="font-oswald text-lg font-bold text-white leading-none">
              {day}
            </span>
            <span className="text-[10px] text-white/80 uppercase">{month}</span>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 w-14 h-14 bg-primary rounded-lg flex flex-col items-center justify-center">
          <span className="font-oswald text-lg font-bold text-white leading-none">
            {day}
          </span>
          <span className="text-[10px] text-white/80 uppercase">{month}</span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-oswald text-sm uppercase tracking-wide text-white truncate group-hover:text-primary transition-colors">
          {event.title}
        </h3>
        <p className="text-xs text-slc-muted flex items-center gap-1 mt-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{event.venue} - {event.city}</span>
        </p>
      </div>

      {/* Ticket Button */}
      {event.ticketUrl && !isPast && (
        <Button size="sm" variant="outline" asChild className="flex-shrink-0">
          <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer">
            <Ticket className="w-4 h-4" />
          </a>
        </Button>
      )}
    </div>
  );
}
