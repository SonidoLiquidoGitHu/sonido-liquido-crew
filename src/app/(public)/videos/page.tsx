import { Suspense } from "react";
import { VideoCard } from "@/components/public/cards/VideoCard";
import { videosService } from "@/lib/services";
import { Skeleton } from "@/components/ui/skeleton";
import { Video } from "lucide-react";

export const metadata = {
  title: "Videos | Sonido Líquido Crew",
  description: "Videos oficiales, freestyles y sesiones en vivo de Sonido Líquido Crew.",
};

export const dynamic = "force-dynamic";

async function VideosGrid() {
  let videos: Awaited<ReturnType<typeof videosService.getAll>> = [];

  try {
    videos = await videosService.getAll({ limit: 50 });
  } catch (error) {
    console.error("Failed to fetch videos:", error);
    videos = [];
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-20">
        <Video className="w-16 h-16 text-slc-muted mx-auto mb-4" />
        <h3 className="text-xl font-oswald uppercase mb-2">Cargando Videos...</h3>
        <p className="text-slc-muted">
          No hay videos disponibles en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}

function VideosGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="aspect-video rounded-xl" />
      ))}
    </div>
  );
}

export default function VideosPage() {
  return (
    <div className="py-12">
      <div className="section-container">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="section-title">Videos</h1>
          <p className="section-subtitle mt-2">
            Videos oficiales, freestyles y sesiones en vivo
          </p>
          <div className="section-divider" />
        </div>

        {/* Featured Channel Link */}
        <div className="flex justify-center mb-8">
          <a
            href="https://www.youtube.com/@sonidoliquidocrew"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-6 py-3 bg-youtube hover:bg-youtube-dark text-white font-medium rounded-full transition-colors"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
              />
            </svg>
            Suscribirse al Canal
          </a>
        </div>

        {/* Videos Grid */}
        <Suspense fallback={<VideosGridSkeleton />}>
          <VideosGrid />
        </Suspense>
      </div>
    </div>
  );
}
