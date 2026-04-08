import { Suspense } from "react";
import { EventCard } from "@/components/public/cards/EventCard";
import { eventsService } from "@/lib/services";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";

export const metadata = {
  title: "Eventos | Sonido Líquido Crew",
  description: "Próximos conciertos, fiestas y presentaciones en vivo de Sonido Líquido Crew.",
};

export const dynamic = "force-dynamic";

async function EventsList() {
  const events = await eventsService.getAll({ limit: 20 });

  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slc-card border border-slc-border flex items-center justify-center">
          <Calendar className="w-10 h-10 text-slc-muted" />
        </div>
        <h2 className="font-oswald text-2xl uppercase text-white mb-3">
          Próximamente
        </h2>
        <p className="text-slc-muted max-w-md mx-auto">
          No hay eventos programados en este momento.
          Síguenos en redes sociales para enterarte de los próximos shows.
        </p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <a
            href="https://www.instagram.com/sonidoliquido/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slc-card border border-slc-border rounded-full hover:border-instagram transition-colors"
          >
            <svg className="w-5 h-5 text-instagram" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
            </svg>
            Instagram
          </a>
          <a
            href="https://www.facebook.com/sonidoliquidocrew/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slc-card border border-slc-border rounded-full hover:border-blue-500 transition-colors"
          >
            <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24">
              <path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Facebook
          </a>
        </div>
      </div>
    );
  }

  // Separate upcoming and past events
  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.eventDate) >= now);
  const pastEvents = events.filter((e) => new Date(e.eventDate) < now);

  return (
    <div className="space-y-12">
      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <section>
          <h2 className="font-oswald text-xl uppercase mb-6 flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            Próximos Eventos
          </h2>
          <div className="space-y-4">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} variant="featured" />
            ))}
          </div>
        </section>
      )}

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <section>
          <h2 className="font-oswald text-xl uppercase mb-6 text-slc-muted">
            Eventos Pasados
          </h2>
          <div className="space-y-4">
            {pastEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EventsListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>
  );
}

export default function EventosPage() {
  return (
    <div className="py-12">
      <div className="section-container">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="section-title">Eventos</h1>
          <p className="section-subtitle mt-2">
            Conciertos, fiestas y presentaciones en vivo
          </p>
          <div className="section-divider" />
        </div>

        {/* Events List */}
        <div className="max-w-3xl mx-auto">
          <Suspense fallback={<EventsListSkeleton />}>
            <EventsList />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
