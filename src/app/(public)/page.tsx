import {
  FeaturedArtists,
  HeroSection,
  MarqueeBanner,
  ReelsStoriesBar,
  UpcomingReleasesHero,
} from "@/components/public";
import { BackToTopFab } from "@/components/public/BackToTopFab";
import {
  EventsSkeleton,
  GallerySkeleton,
  LazySection,
  ReleasesSkeleton,
} from "@/components/public/LazySection";
import { SectionNavDots } from "@/components/public/SectionNavDots";
import { FeaturedBeats } from "@/components/public/sections/FeaturedBeats";
import { db, isDatabaseConfigured } from "@/db/client";
import {
  artists,
  releaseArtists,
  releases as releasesTable,
  upcomingReleases,
  verticalVideos,
} from "@/db/schema";
import {
  artistsService,
  beatsService,
  eventsService,
  releasesService,
  videosService,
} from "@/lib/services";
import { and, desc, eq, gte, inArray, like } from "drizzle-orm";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// ===========================================
// PERFORMANCE: Lazy load below-the-fold sections
// ===========================================
const LatestReleases = dynamic(
  () =>
    import("@/components/public/sections/LatestReleases").then((m) => ({
      default: m.LatestReleases,
    })),
  { ssr: true },
);

const MusicaSection = dynamic(
  () =>
    import("@/components/public/sections/MusicaSection").then((m) => ({
      default: m.MusicaSection,
    })),
  { ssr: true },
);

const VideosSection = dynamic(
  () =>
    import("@/components/public/sections/VideosSection").then((m) => ({
      default: m.VideosSection,
    })),
  { ssr: true },
);

const GallerySection = dynamic(
  () =>
    import("@/components/public/sections/GallerySection").then((m) => ({
      default: m.GallerySection,
    })),
  { ssr: true },
);

const EventsSection = dynamic(
  () =>
    import("@/components/public/sections/EventsSection").then((m) => ({
      default: m.EventsSection,
    })),
  { ssr: true },
);

const NewsletterSection = dynamic(
  () =>
    import("@/components/public/sections/NewsletterSection").then((m) => ({
      default: m.NewsletterSection,
    })),
  { ssr: true },
);

const StatsSection = dynamic(
  () =>
    import("@/components/public/sections/StatsSection").then((m) => ({
      default: m.StatsSection,
    })),
  { ssr: true },
);

const VerticalVideoSection = dynamic(
  () =>
    import("@/components/public/sections/VerticalVideoSection").then((m) => ({
      default: m.VerticalVideoSection,
    })),
  { ssr: true },
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
// Also cross-references the releases table to ensure releaseType consistency
// (the releases table is the source of truth, e.g. from Spotify sync)
async function getUpcomingReleases() {
  try {
    if (!isDatabaseConfigured()) return [];

    const now = new Date();
    const upcomingList = await db
      .select()
      .from(upcomingReleases)
      .where(
        and(
          eq(upcomingReleases.isActive, true),
          gte(upcomingReleases.releaseDate, now),
        ),
      )
      .orderBy(upcomingReleases.releaseDate)
      .limit(4);

    // Cross-reference with releases table to ensure releaseType consistency.
    // If a matching release exists in the releases table, use its releaseType
    // as the source of truth (in-memory override only — the persistent fix is
    // handled by autoConvertUpcomingReleases in the cron job).
    if (upcomingList.length > 0) {
      for (const upcoming of upcomingList) {
        try {
          // Check by slug first, then by title
          const [matchBySlug] = await db
            .select({ releaseType: releasesTable.releaseType })
            .from(releasesTable)
            .where(eq(releasesTable.slug, upcoming.slug))
            .limit(1);

          const match =
            matchBySlug ||
            (
              await db
                .select({ releaseType: releasesTable.releaseType })
                .from(releasesTable)
                .where(like(releasesTable.title, `%${upcoming.title}%`))
                .limit(1)
            )[0];

          if (match && match.releaseType !== upcoming.releaseType) {
            // Override in memory so the display is correct.
            // The autoConvertUpcomingReleases cron will persist the fix.
            (upcoming as Record<string, unknown>).releaseType =
              match.releaseType;
          }
        } catch {
          /* non-critical per-item check */
        }
      }
    }

    return upcomingList;
  } catch (error) {
    console.error("[HomePage] Error fetching upcoming releases:", error);
    return [];
  }
}

export default async function HomePage() {
  // ===========================================
  // CRITICAL PATH: Fetch only above-the-fold data first
  // ===========================================
  const [allArtists, upcomingReleasesList] = await Promise.all([
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
    featuredReels,
  ] = await Promise.all([
    safeFetch(releasesService.getLatest(10), []),
    safeFetch(videosService.getFeatured(4), []),
    safeFetch(eventsService.getUpcoming(20), []),
    safeFetch(eventsService.getPast(100), []),
    safeFetch(beatsService.getFeatured(5), []),
    safeFetch(
      db
        .select({
          id: verticalVideos.id,
          title: verticalVideos.title,
          thumbnailUrl: verticalVideos.thumbnailUrl,
          videoUrl: verticalVideos.videoUrl,
          platform: verticalVideos.platform,
          platformUrl: verticalVideos.platformUrl,
          embedUrl: verticalVideos.embedUrl,
          isFeatured: verticalVideos.isFeatured,
          artistName: artists.name,
          artistSlug: artists.slug,
        })
        .from(verticalVideos)
        .leftJoin(artists, eq(verticalVideos.artistId, artists.id))
        .where(eq(verticalVideos.isPublished, true))
        .orderBy(
          desc(verticalVideos.isFeatured),
          desc(verticalVideos.createdAt),
        )
        .limit(15),
      [],
    ),
  ]);

  // PERF: This enrichment adds 2 extra sequential DB round trips after the main parallel batch.
  // Future optimization: use a JOIN in the initial query or move this into the same parallel batch
  // to eliminate the sequential dependency. Tracked as performance bottleneck.
  //
  // Enrich releases with artist info (same pattern as discografia page)
  let latestReleases: ((typeof rawLatestReleases)[number] & {
    artistName?: string | null;
    artistSlug?: string | null;
  })[] = rawLatestReleases;
  try {
    if (rawLatestReleases.length > 0) {
      const releaseIds = rawLatestReleases.map((r) => r.id);

      // Fetch release-artist associations and artists in parallel
      const [releaseArtistsForReleases, allArtists] = await Promise.all([
        db
          .select({
            releaseId: releaseArtists.releaseId,
            artistId: releaseArtists.artistId,
            isPrimary: releaseArtists.isPrimary,
          })
          .from(releaseArtists)
          .where(inArray(releaseArtists.releaseId, releaseIds)),
        db
          .select({ id: artists.id, name: artists.name, slug: artists.slug })
          .from(artists),
      ]);

      const artistMap = new Map(allArtists.map((a) => [a.id, a]));

      // Build releaseId → primary artist lookup (prefer primary, fall back to first)
      const releaseArtistMap = new Map<
        string,
        { artistName: string; artistSlug: string }
      >();
      for (const ra of releaseArtistsForReleases) {
        if (!releaseArtistMap.has(ra.releaseId) || ra.isPrimary) {
          const artist = artistMap.get(ra.artistId);
          if (artist) {
            releaseArtistMap.set(ra.releaseId, {
              artistName: artist.name,
              artistSlug: artist.slug,
            });
          }
        }
      }

      latestReleases = rawLatestReleases.map((r) => ({
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
          2b. STORIES BAR - Reels (Instagram-style)
          =========================================== */}
      {featuredReels.length > 0 && (
        <section id="reels-stories">
          <ReelsStoriesBar videos={featuredReels} />
        </section>
      )}

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
          4b. BEATS (standalone section — always visible)
          =========================================== */}
      <section id="beats">
        <LazySection minHeight="300px">
          <FeaturedBeats beats={featuredBeats} />
        </LazySection>
      </section>

      {/* ===========================================
          5. MÚSICA (tabbed: Artistas / Playlists)
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
          7. REELS (vertical videos 9:16)
          =========================================== */}
      <section id="reels">
        <LazySection minHeight="400px">
          <VerticalVideoSection limit={8} />
        </LazySection>
      </section>

      {/* ===========================================
          8. STATS (inline, compact)
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
          <EventsSection
            upcomingEvents={upcomingEvents}
            pastEvents={pastEvents}
          />
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
