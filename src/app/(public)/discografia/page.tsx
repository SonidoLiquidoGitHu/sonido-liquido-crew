import { Suspense } from "react";
import { ReleaseCard } from "@/components/public/cards/ReleaseCard";
import { releasesService } from "@/lib/services";
import { Skeleton } from "@/components/ui/skeleton";
import { Disc3 } from "lucide-react";

export const metadata = {
  title: "Discografía | Sonido Líquido Crew",
  description: "Explora más de 160 lanzamientos del colectivo de Hip Hop más representativo de México.",
};

export const dynamic = "force-dynamic";

async function ReleasesGrid() {
  let releases: Awaited<ReturnType<typeof releasesService.getAll>> = [];
  try {
    releases = await releasesService.getAll({ limit: 100 });
  } catch (error) {
    console.error("Failed to fetch releases:", error);
    releases = [];
  }

  if (releases.length === 0) {
    return (
      <div className="text-center py-20">
        <Disc3 className="w-16 h-16 text-slc-muted mx-auto mb-4" />
        <h3 className="text-xl font-oswald uppercase mb-2">Cargando Discografía...</h3>
        <p className="text-slc-muted">
          No hay lanzamientos disponibles en este momento.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-20">
      {releases.map((release) => (
        <ReleaseCard key={release.id} release={release} showArtist={false} />
      ))}
    </div>
  );
}

function ReleasesGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-20">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-square rounded-lg" />
          <Skeleton className="h-4 mt-4 w-3/4" />
          <Skeleton className="h-3 mt-2 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function DiscografiaPage() {
  return (
    <div className="py-12">
      <div className="section-container">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="section-title">Discografía</h1>
          <p className="section-subtitle mt-2">
            Más de 160 lanzamientos, +25 años de historia
          </p>
          <div className="section-divider" />
        </div>

        {/* Releases Grid */}
        <Suspense fallback={<ReleasesGridSkeleton />}>
          <ReleasesGrid />
        </Suspense>
      </div>
    </div>
  );
}
