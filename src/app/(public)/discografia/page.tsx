import { Suspense } from "react";
import { releasesService } from "@/lib/services";
import { Skeleton } from "@/components/ui/skeleton";
import { Disc3 } from "lucide-react";
import { DiscografiaClient } from "@/components/public/sections/DiscografiaClient";

export const metadata = {
  title: "Discografía | Sonido Líquido Crew",
  description: "Explora más de 160 lanzamientos del colectivo de Hip Hop más representativo de México.",
};

export const dynamic = "force-dynamic";

async function ReleasesWithFilters() {
  let releases: Awaited<ReturnType<typeof releasesService.getAll>> = [];

  try {
    releases = await releasesService.getAll({ limit: 200 });
  } catch (error) {
    console.error("Failed to fetch releases:", error);
    releases = [];
  }

  return <DiscografiaClient releases={releases} />;
}

function ReleasesGridSkeleton() {
  return (
    <div>
      {/* Filter bar skeleton */}
      <div className="mb-8 space-y-4">
        <div className="flex gap-3">
          <Skeleton className="flex-1 h-10 rounded-lg" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-20">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="h-4 mt-4 w-3/4" />
            <Skeleton className="h-3 mt-2 w-1/2" />
          </div>
        ))}
      </div>
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

        {/* Releases with Filters */}
        <Suspense fallback={<ReleasesGridSkeleton />}>
          <ReleasesWithFilters />
        </Suspense>
      </div>
    </div>
  );
}
