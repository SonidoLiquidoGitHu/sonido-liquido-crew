import { SafeImage } from "@/components/ui/safe-image";
import { Calendar, MapPin, Video } from "lucide-react";
import Link from "next/link";

// ===========================================
// TYPES
// ===========================================

interface FeaturedEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  eventDate: Date | string | null;
  location: string | null;
  videoCount: number;
}

// ===========================================
// COMPONENT
// ===========================================

/**
 * FeaturedEvents — shows vertical video events that have been marked as
 * featured in the admin dashboard. Renders as horizontally-scrollable
 * cards (same visual style as the /reels page event cards) that link to
 * /reels so the user can browse the event's videos there.
 *
 * Hidden entirely when there are no featured events (so the homepage
 * stays clean for accounts that don't use this feature).
 */
export function FeaturedEvents({ events }: { events: FeaturedEvent[] }) {
  if (events.length === 0) return null;

  return (
    <section className="py-12">
      <div className="section-container">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-oswald text-2xl md:text-3xl uppercase tracking-wide text-white">
            Eventos Destacados
          </h2>
          <div className="flex-1 h-px bg-slc-border" />
          <Link
            href="/reels"
            className="text-sm text-primary hover:underline whitespace-nowrap"
          >
            Ver todos →
          </Link>
        </div>

        {/* Horizontal scrollable event cards (mobile) / grid (desktop) */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
          {events.map((event) => (
            <Link
              key={event.id}
              href="/reels"
              className="group flex-shrink-0 w-72 md:w-auto rounded-xl overflow-hidden border-2 border-slc-border hover:border-primary/50 transition-all"
            >
              {/* Cover image */}
              <div className="relative aspect-[9/16] w-full">
                {event.coverImageUrl ? (
                  <SafeImage
                    src={event.coverImageUrl}
                    alt={event.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 288px, 33vw"
                  />
                ) : (
                  <div className="w-full h-full bg-slc-card flex items-center justify-center">
                    <Video className="w-12 h-12 text-slc-muted" />
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Video count badge */}
                <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded-full text-xs text-white flex items-center gap-1">
                  <Video className="w-3 h-3" /> {event.videoCount}
                </div>

                {/* Title + meta at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-oswald text-lg uppercase text-white font-bold line-clamp-2">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-white/70">
                    {event.eventDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(event.eventDate).toLocaleDateString("es-MX", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {event.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
