import { Suspense } from "react";
import dynamic from "next/dynamic";
import {
  HeroSection,
  MarqueeBanner,
  FeaturedArtists,
  UpcomingReleasesHero,
} from "@/components/public";
import {
  LazySection,
  ReleasesSkeleton,
  EventsSkeleton,
  GallerySkeleton,
} from "@/components/public/LazySection";
import { BackToTopFab } from "@/components/public/BackToTopFab";
import { SectionNavDots } from "@/components/public/SectionNavDots";
import {
  artistsService,
  releasesService,
  videosService,
  eventsService,
  beatsService,
} from "@/lib/services";
import { db, isDatabaseConfigured } from "@/db/client";
import { upcomingReleases, releaseArtists, artists } from "@/db/schema";
import { eq, and, gte, inArray } from "drizzle-orm";

// ===========================================
// PERFORMANCE: Lazy load below-the-fold sections
// ===========================================
const LatestReleases = dynamic(
  () => import("@/components/public/sections/LatestReleases").then(m => ({ default: m.LatestReleases })),
  { ssr: true }
);

const MusicaSection = dynamic(
  () => import("@/components/public/sections/MusicaSection").then(m => ({ default: m.MusicaSection })),
  { ssr: true }
);

const VideosSection = dynamic(
  () => import("@/components/public/sections/VideosSection").then(m => ({ default: m.VideosSection })),
  { ssr: true }
);

const GallerySection = dynamic(
  () => import("@/components/public/sections/GallerySection").then(m => ({ default: m.GallerySection })),
  { ssr: true }
);

const EventsSection = dynamic(
  () => import("@/components/public/sections/EventsSection").then(m => ({ default: m.EventsSection })),
  { ssr: true }
);

const NewsletterSection = dynamic(
  () => import("@/components/public/sections/NewsletterSection").then(m => ({ default: m.NewsletterSection })),
  { ssr: true }
);

const StatsSection = dynamic(
  () => import("@/components/public/sections/StatsSection").then(m => ({ default: m.StatsSection })),
  { ssr: true }
);

// ===========================================
// CACHING: Revalidate every 5 minutes for fresh content
// ===========================================
export const revalidate = 300; // 5 minutes ISR

// Helper to safely fetch data with fallback
async function safeFetch<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error("[HomePage] Error fetching data:", error);
    return fallback;
  }
}

// Fetch upcoming releases directly - limited to 4 closest to release date
async function getUpcomingReleases() {
  try {
    if (!isDatabaseConfigured()) return [];

    const now = new Date();
    const releases = await db
      .select()
      .from(upcomingReleases)
      .where(
        and(
          eq(upcomingReleases.isActive, true),
          gte(upcomingReleases.releaseDate, now)
        )
      )
      .orderBy(upcomingReleases.releaseDate)
      .limit(4);

    return releases;
  } catch (error) {
    console.error("[HomePage] Error fetching upcoming releases:", error);
    return [];
  }
}

export default async function HomePage() {
  // ===========================================
  // CRITICAL PATH: Fetch only above-the-fold data first
  // ===========================================
  const [
    allArtists,
    upcomingReleasesList,
  ] = await Promise.all([
    safeFetch(artistsService.getAll({ limit: 15 }), []),
    getUpcomingReleases(),
  ]);

  // ===========================================
  // DEFERRED: Fetch below-the-fold data in parallel
  // ===========================================
  const [
    rawLatestReleases,
    featuredVideos,
    upcomingEvents,
    pastEvents,
    featuredBeats,
  ] = await Promise.all([
    safeFetch(releasesService.getLatest(10), []),
    safeFetch(videosService.getFeatured(4), []),
    safeFetch(eventsService.getUpcoming(20), []),
    safeFetch(eventsService.getPast(100), []),
    safeFetch(beatsService.getFeatured(5), []),
  ]);

  // Enrich releases with artist info (same pattern as discografia page)
  let latestReleases: (typeof rawLatestReleases[number] & { artistName?: string | null; artistSlug?: string | null })[] = rawLatestReleases;
  try {
    if (rawLatestReleases.length > 0) {
      const releaseIds = rawLatestReleases.map(r => r.id);

      // Fetch release-artist associations and artists in parallel
      const [releaseArtistsForReleases, allArtists] = await Promise.all([
        db.select({
          releaseId: releaseArtists.releaseId,
          artistId: releaseArtists.artistId,
          isPrimary: releaseArtists.isPrimary,
        }).from(releaseArtists).where(inArray(releaseArtists.releaseId, releaseIds)),
        db.select({ id: artists.id, name: artists.name, slug: artists.slug }).from(artists),
      ]);

      const artistMap = new Map(allArtists.map(a => [a.id, a]));

      // Build releaseId → primary artist lookup (prefer primary, fall back to first)
      const releaseArtistMap = new Map<string, { artistName: string; artistSlug: string }>();
      for (const ra of releaseArtistsForReleases) {
        if (!releaseArtistMap.has(ra.releaseId) || ra.isPrimary) {
          const artist = artistMap.get(ra.artistId);
          if (artist) {
            releaseArtistMap.set(ra.releaseId, { artistName: artist.name, artistSlug: artist.slug });
          }
        }
      }

      latestReleases = rawLatestReleases.map(r => ({
        ...r,
        artistName: releaseArtistMap.get(r.id)?.artistName || null,
        artistSlug: releaseArtistMap.get(r.id)?.artistSlug || null,
      }));
    }
  } catch (error) {
    console.error("[HomePage] Error enriching releases with artists:", error);
    // Keep rawLatestReleases as-is
  }

  return (
    <>
      {/* Section Nav Dots (desktop only) */}
      <SectionNavDots />

      {/* ===========================================
          1. UPCOMING RELEASES HERO (with countdowns)
          Merged: UpcomingReleasesHero + legacy ReleaseCountdown
          =========================================== */}
      <section id="lanzamientos">
        {upcomingReleasesList.length > 0 && (
          <UpcomingReleasesHero releases={upcomingReleasesList} />
        )}
      </section>

      {/* ===========================================
          2. HERO SECTION (animated title + stats + CTAs)
          MarqueeBanner merged inline here
          =========================================== */}
      <section id="hero">
        <HeroSection />
        <MarqueeBanner />
      </section>

      {/* ===========================================
          3. FEATURED ARTISTS (pop-art grid)
          =========================================== */}
      <section id="artistas">
        <FeaturedArtists artists={allArtists} />
      </section>

      {/* ===========================================
          4. LATEST RELEASES (carousel)
          =========================================== */}
      <section id="discografia">
        <LazySection fallback={<ReleasesSkeleton />} minHeight="500px">
          <LatestReleases releases={latestReleases} />
        </LazySection>
      </section>

      {/* ===========================================
          5. MÚSICA (tabbed: Artistas / Beats / Playlists)
          Merged: RandomArtistPlayer + FeaturedBeats + SpotifySection
          =========================================== */}
      <LazySection minHeight="400px">
        <MusicaSection featuredBeats={featuredBeats} />
      </LazySection>

      {/* ===========================================
          6. VIDEOS (tabbed: Destacados / Aleatorios / Canales)
          Merged: FeaturedVideos + RandomVideoCarousel + ArtistChannels
          =========================================== */}
      <LazySection minHeight="500px">
        <VideosSection featuredVideos={featuredVideos} />
      </LazySection>

      {/* ===========================================
          7. STATS (inline, compact)
          =========================================== */}
      <LazySection minHeight="200px">
        <StatsSection />
      </LazySection>

      {/* ===========================================
          8. GALLERY (photos)
          Removed: RosterSocials (redundant with footer)
          Removed: DiscographyExplorer (redundant with /discografia page)
          =========================================== */}
      <section id="galeria">
        <LazySection fallback={<GallerySkeleton />} minHeight="400px">
          <GallerySection limit={12} />
        </LazySection>
      </section>

      {/* ===========================================
          9. EVENTS
          =========================================== */}
      <section id="eventos">
        <LazySection fallback={<EventsSkeleton />} minHeight="600px">
          <EventsSection upcomingEvents={upcomingEvents} pastEvents={pastEvents} />
        </LazySection>
      </section>

      {/* ===========================================
          10. NEWSLETTER
          =========================================== */}
      <section id="newsletter">
        <LazySection minHeight="300px">
          <NewsletterSection />
        </LazySection>
      </section>

      {/* Back to Top FAB */}
      <BackToTopFab />
    </>
  );
}
