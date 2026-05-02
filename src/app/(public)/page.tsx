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
import { upcomingReleases } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";

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
    latestReleases,
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
