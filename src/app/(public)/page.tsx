import { Suspense } from "react";
import dynamic from "next/dynamic";
import {
  HeroSection,
  MarqueeBanner,
  FeaturedArtists,
  UpcomingReleasesHero,
} from "@/components/public";
import { ReleaseCountdown } from "@/components/public/ReleaseCountdown";
import {
  LazySection,
  ArtistsSkeleton,
  ReleasesSkeleton,
  VideosSkeleton,
  EventsSkeleton,
  GallerySkeleton,
} from "@/components/public/LazySection";
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

const FeaturedVideos = dynamic(
  () => import("@/components/public/sections/FeaturedVideos").then(m => ({ default: m.FeaturedVideos })),
  { ssr: true }
);

const RandomVideoCarousel = dynamic(
  () => import("@/components/public/sections/RandomVideoCarousel").then(m => ({ default: m.RandomVideoCarousel })),
  { ssr: true }
);

const FeaturedBeats = dynamic(
  () => import("@/components/public/sections/FeaturedBeats").then(m => ({ default: m.FeaturedBeats })),
  { ssr: true }
);

const ArtistChannels = dynamic(
  () => import("@/components/public/sections/ArtistChannels").then(m => ({ default: m.ArtistChannels })),
  { ssr: true }
);

const DiscographyExplorer = dynamic(
  () => import("@/components/public/sections/DiscographyExplorer").then(m => ({ default: m.DiscographyExplorer })),
  { ssr: true }
);

const RosterSocials = dynamic(
  () => import("@/components/public/sections/RosterSocials").then(m => ({ default: m.RosterSocials })),
  { ssr: true }
);

const GallerySection = dynamic(
  () => import("@/components/public/sections/GallerySection").then(m => ({ default: m.GallerySection })),
  { ssr: true }
);

const SpotifySection = dynamic(
  () => import("@/components/public/sections/SpotifySection").then(m => ({ default: m.SpotifySection })),
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

const RandomArtistPlayer = dynamic(
  () => import("@/components/public/RandomArtistPlayer").then(m => ({ default: m.RandomArtistPlayer })),
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
    upcomingRelease,
  ] = await Promise.all([
    safeFetch(artistsService.getAll({ limit: 15 }), []),
    getUpcomingReleases(),
    safeFetch(releasesService.getNextUpcoming(), null),
  ]);

  // ===========================================
  // DEFERRED: Fetch below-the-fold data in parallel
  // (Still fetched server-side but lower priority)
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
      {/* ===========================================
          ABOVE THE FOLD - Load immediately
          =========================================== */}

      {/* Upcoming Releases Hero - TOP PRIORITY */}
      {upcomingReleasesList.length > 0 && (
        <UpcomingReleasesHero releases={upcomingReleasesList} />
      )}

      {/* Random Artist Spotify Player - Client-side for variety */}
      <Suspense fallback={<div className="h-24 bg-slc-dark animate-pulse" />}>
        <RandomArtistPlayer />
      </Suspense>

      {/* Hero Section - Critical */}
      <HeroSection />

      {/* Artist Marquee Banner - Lightweight */}
      <MarqueeBanner />

      {/* Upcoming Release Countdown (legacy) */}
      {upcomingRelease && <ReleaseCountdown release={upcomingRelease} />}

      {/* Featured Artists - Important for branding */}
      <FeaturedArtists artists={allArtists} />

      {/* ===========================================
          BELOW THE FOLD - Lazy load with skeletons
          =========================================== */}

      {/* Stats Section */}
      <LazySection minHeight="200px">
        <StatsSection />
      </LazySection>

      {/* Latest Releases */}
      <LazySection fallback={<ReleasesSkeleton />} minHeight="500px">
        <LatestReleases releases={latestReleases} />
      </LazySection>

      {/* Featured Videos */}
      {featuredVideos.length > 0 && (
        <LazySection fallback={<VideosSkeleton />} minHeight="600px">
          <FeaturedVideos videos={featuredVideos} />
        </LazySection>
      )}

      {/* Random Video Carousel */}
      <LazySection fallback={<VideosSkeleton />} minHeight="500px">
        <RandomVideoCarousel
          title="Videos Aleatorios"
          subtitle="Descubre contenido diferente cada vez que visitas"
          limit={6}
          showRefreshButton={true}
        />
      </LazySection>

      {/* Featured Beats */}
      {featuredBeats.length > 0 && (
        <LazySection minHeight="400px">
          <FeaturedBeats beats={featuredBeats} />
        </LazySection>
      )}

      {/* Artist YouTube Channels */}
      <LazySection minHeight="400px">
        <ArtistChannels />
      </LazySection>

      {/* Discography Explorer - Spotify */}
      <LazySection minHeight="500px">
        <DiscographyExplorer />
      </LazySection>

      {/* Roster Social Links */}
      <LazySection minHeight="300px">
        <RosterSocials />
      </LazySection>

      {/* Photo Gallery - Only show featured photos */}
      <LazySection fallback={<GallerySkeleton />} minHeight="400px">
        <GallerySection limit={12} />
      </LazySection>

      {/* Spotify Playlist */}
      <LazySection minHeight="400px">
        <SpotifySection />
      </LazySection>

      {/* Events */}
      <LazySection fallback={<EventsSkeleton />} minHeight="600px">
        <EventsSection upcomingEvents={upcomingEvents} pastEvents={pastEvents} />
      </LazySection>

      {/* Newsletter Section */}
      <LazySection minHeight="300px">
        <NewsletterSection />
      </LazySection>
    </>
  );
}
