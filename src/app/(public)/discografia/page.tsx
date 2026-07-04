import { DiscografiaClient } from "@/components/public/sections/DiscografiaClient";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/db/client";
import { artists, releaseArtists } from "@/db/schema";
import { releasesRepository } from "@/lib/repositories";
import { artistsService, releasesService } from "@/lib/services";
import type { ReleaseType } from "@/types";
import { eq } from "drizzle-orm";
import { Disc3 } from "lucide-react";
import { Suspense } from "react";

export const metadata = {
  title: "Discografía | Sonido Líquido Crew",
  description:
    "Explora más de 160 lanzamientos del colectivo de Hip Hop más representativo de México.",
};

export const dynamic = "force-dynamic";

interface ArtistOption {
  id: string;
  name: string;
  slug: string;
}

interface ReleaseWithArtist {
  id: string;
  title: string;
  slug: string;
  releaseType: ReleaseType;
  releaseDate: Date | null;
  coverImageUrl: string | null;
  spotifyUrl: string | null;
  spotifyId: string | null;
  artistId: string | null;
  artistName: string | null;
  artistSlug: string | null;
  isUpcoming: boolean;
  isFeatured: boolean;
}

async function ReleasesWithFilters() {
  let releases: ReleaseWithArtist[] = [];
  let artistOptions: ArtistOption[] = [];

  try {
    // Auto-convert any past-due upcoming releases into the releases table
    // This keeps discografía in sync with próximos lanzamientos automatically
    await releasesRepository.autoConvertUpcomingReleases();

    // Fetch all releases
    const rawReleases = await releasesService.getAll({ limit: 500 });

    // Fetch artist-release associations
    const allReleaseArtists = await db
      .select({
        releaseId: releaseArtists.releaseId,
        artistId: releaseArtists.artistId,
        isPrimary: releaseArtists.isPrimary,
      })
      .from(releaseArtists);

    // Fetch all artists
    const allArtists = await db
      .select({
        id: artists.id,
        name: artists.name,
        slug: artists.slug,
      })
      .from(artists);

    // Build artist lookup map
    const artistMap = new Map(allArtists.map((a) => [a.id, a]));

    // Build releaseId → primary artist lookup
    const releaseArtistMap = new Map<
      string,
      { artistId: string; artistName: string; artistSlug: string }
    >();
    for (const ra of allReleaseArtists) {
      if (ra.isPrimary) {
        const artist = artistMap.get(ra.artistId);
        if (artist) {
          releaseArtistMap.set(ra.releaseId, {
            artistId: artist.id,
            artistName: artist.name,
            artistSlug: artist.slug,
          });
        }
      }
    }

    // For releases without a primary artist, use the first association
    for (const ra of allReleaseArtists) {
      if (!releaseArtistMap.has(ra.releaseId)) {
        const artist = artistMap.get(ra.artistId);
        if (artist) {
          releaseArtistMap.set(ra.releaseId, {
            artistId: artist.id,
            artistName: artist.name,
            artistSlug: artist.slug,
          });
        }
      }
    }

    // Enrich releases with artist info
    releases = rawReleases.map((r) => {
      const artistInfo = releaseArtistMap.get(r.id);
      return {
        id: r.id,
        title: r.title,
        slug: r.slug,
        releaseType: r.releaseType,
        releaseDate: r.releaseDate,
        coverImageUrl: r.coverImageUrl,
        spotifyUrl: r.spotifyUrl,
        spotifyId: r.spotifyId,
        artistId: artistInfo?.artistId || null,
        artistName: artistInfo?.artistName || null,
        artistSlug: artistInfo?.artistSlug || null,
        isUpcoming: r.isUpcoming,
        isFeatured: r.isFeatured,
      };
    });

    // Build artist options from releases that have artist associations
    const artistIdsWithReleases = new Set(
      releases.filter((r) => r.artistId).map((r) => r.artistId as string),
    );
    artistOptions = allArtists
      .filter((a) => artistIdsWithReleases.has(a.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Failed to fetch releases:", error);
    releases = [];
  }

  return (
    <DiscografiaClient releases={releases} artistOptions={artistOptions} />
  );
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
            <Skeleton key={`filter-skeleton-${i}`} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pb-20">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={`release-skeleton-${i}`}>
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
