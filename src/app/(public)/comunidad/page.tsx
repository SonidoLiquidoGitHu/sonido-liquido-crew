import { Suspense } from "react";
import { FanWall, ConcertMemoryGallery, UserPlaylistBuilder } from "@/components/public";
import { eventsService } from "@/lib/services";
import { Loader2, MessageCircle, Camera, ListMusic, Users } from "lucide-react";

export const revalidate = 300; // 5 minutes

export const metadata = {
  title: "Comunidad | Sonido Líquido Crew",
  description: "Conecta con la comunidad de Sonido Líquido Crew. Fan Wall, fotos de conciertos y playlists de fans.",
};

async function getPastEvents() {
  try {
    return await eventsService.getPast(50);
  } catch (error) {
    console.error("Error fetching past events:", error);
    return [];
  }
}

export default async function CommunityPage() {
  const pastEvents = await getPastEvents();

  return (
    <div className="min-h-screen bg-slc-black">
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-slc-dark to-slc-black" />
        <div className="absolute inset-0 noise-overlay opacity-30" />

        <div className="relative section-container text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/30 rounded-full mb-6">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Familia SLC</span>
          </div>
          <h1 className="font-oswald text-5xl md:text-7xl uppercase text-white mb-4">
            Comunidad
          </h1>
          <p className="text-xl text-slc-muted max-w-2xl mx-auto">
            Conecta con otros fans, comparte tus recuerdos y forma parte de la familia Sonido Líquido.
          </p>
        </div>
      </section>

      {/* Fan Wall */}
      <Suspense
        fallback={
          <div className="py-16 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        }
      >
        <FanWall
          title="La Pared"
          subtitle="Deja tu mensaje para la crew"
        />
      </Suspense>

      {/* Concert Memories */}
      <Suspense
        fallback={
          <div className="py-16 flex justify-center bg-slc-dark">
            <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
          </div>
        }
      >
        <div className="bg-slc-dark">
          <ConcertMemoryGallery
            title="Recuerdos del Show"
            subtitle="Comparte tus fotos de conciertos con la comunidad"
            showUpload={true}
            events={pastEvents.map((e) => ({
              id: e.id,
              title: e.title,
              eventDate: e.eventDate.toISOString(),
              venue: e.venue || "",
              city: e.city || "",
            }))}
          />
        </div>
      </Suspense>

      {/* Create Playlist Section */}
      <section className="py-16">
        <div className="section-container">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-4">
              <ListMusic className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-purple-500">Playlists</span>
            </div>
            <h2 className="font-oswald text-4xl md:text-5xl uppercase text-white mb-2">
              Crea tu Playlist
            </h2>
            <p className="text-slc-muted max-w-md mx-auto">
              Arma tu selección favorita de tracks de Sonido Líquido y compártela
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Suspense
              fallback={
                <div className="py-16 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              }
            >
              <UserPlaylistBuilder />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Stats / Community Info */}
      <section className="py-16 bg-slc-dark">
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-6 bg-slc-card rounded-xl border border-slc-border">
              <MessageCircle className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="font-oswald text-3xl text-white">La Pared</p>
              <p className="text-sm text-slc-muted mt-1">Mensajes de fans</p>
            </div>
            <div className="p-6 bg-slc-card rounded-xl border border-slc-border">
              <Camera className="w-8 h-8 text-pink-500 mx-auto mb-3" />
              <p className="font-oswald text-3xl text-white">Gallery</p>
              <p className="text-sm text-slc-muted mt-1">Fotos de shows</p>
            </div>
            <div className="p-6 bg-slc-card rounded-xl border border-slc-border">
              <ListMusic className="w-8 h-8 text-purple-500 mx-auto mb-3" />
              <p className="font-oswald text-3xl text-white">Playlists</p>
              <p className="text-sm text-slc-muted mt-1">Creadas por fans</p>
            </div>
            <div className="p-6 bg-slc-card rounded-xl border border-slc-border">
              <Users className="w-8 h-8 text-green-500 mx-auto mb-3" />
              <p className="font-oswald text-3xl text-white">+25 años</p>
              <p className="text-sm text-slc-muted mt-1">De comunidad</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
