import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { db, isDatabaseConfigured } from "@/db/client";
import {
  artists,
  tags,
  verticalVideoEvents,
  verticalVideoTags,
  verticalVideos,
} from "@/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { PlayCircle, Smartphone } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ReelsGrid } from "./ReelsGrid";

export const metadata = {
  title: "Reels | Sonido Líquido Crew",
  description:
    "Videos verticales, Reels, TikToks y YouTube Shorts de Sonido Líquido Crew.",
};

export const dynamic = "force-dynamic";

interface ReelVideo {
  id: string;
  title: string | null;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  platform: string | null;
  platformUrl: string | null;
  embedUrl: string | null;
  artistId: string | null;
  eventId: string | null;
  isFeatured: boolean;
  shareCount: number;
  viewCount: number;
  duration: number | null;
  createdAt: Date | string | null;
  artistName: string | null;
  artistSlug: string | null;
  tags: { id: string; name: string; slug: string }[];
}

interface VideoEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  artistId: string | null;
  eventDate: Date | string | null;
  location: string | null;
  isPublished: boolean;
  displayOrder: number;
  videoCount: number;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

async function getReelsData(): Promise<{
  videos: ReelVideo[];
  events: VideoEvent[];
}> {
  if (!isDatabaseConfigured()) return { videos: [], events: [] };

  // ---- VIDEOS + TAGS (critical path) ----
  // Fetched in its own try-catch so a failure in the events query
  // doesn't prevent videos from showing.
  let videosWithTags: ReelVideo[] = [];
  try {
    const allVideos = await db
      .select({
        id: verticalVideos.id,
        title: verticalVideos.title,
        description: verticalVideos.description,
        videoUrl: verticalVideos.videoUrl,
        thumbnailUrl: verticalVideos.thumbnailUrl,
        platform: verticalVideos.platform,
        platformUrl: verticalVideos.platformUrl,
        embedUrl: verticalVideos.embedUrl,
        artistId: verticalVideos.artistId,
        eventId: verticalVideos.eventId,
        isFeatured: verticalVideos.isFeatured,
        shareCount: verticalVideos.shareCount,
        viewCount: verticalVideos.viewCount,
        duration: verticalVideos.duration,
        createdAt: verticalVideos.createdAt,
        artistName: artists.name,
        artistSlug: artists.slug,
      })
      .from(verticalVideos)
      .leftJoin(artists, eq(verticalVideos.artistId, artists.id))
      .where(eq(verticalVideos.isPublished, true))
      .orderBy(desc(verticalVideos.isFeatured), desc(verticalVideos.createdAt));

    // BATCH FETCH TAGS — single query for all videos, then group in JS.
    const videoIds = allVideos.map((v) => v.id);
    const allTagRows =
      videoIds.length > 0
        ? await db
            .select({
              videoId: verticalVideoTags.videoId,
              tag: tags,
            })
            .from(verticalVideoTags)
            .innerJoin(tags, eq(verticalVideoTags.tagId, tags.id))
            .where(inArray(verticalVideoTags.videoId, videoIds))
        : [];

    const tagsByVideoId = new Map<string, typeof tags.$inferSelect[]>();
    for (const row of allTagRows) {
      if (!tagsByVideoId.has(row.videoId)) {
        tagsByVideoId.set(row.videoId, []);
      }
      tagsByVideoId.get(row.videoId)?.push(row.tag);
    }

    videosWithTags = allVideos.map((video) => ({
      ...video,
      tags: (tagsByVideoId.get(video.id) || []).map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
      })),
    }));
  } catch (error) {
    console.error("Error fetching reels videos:", error);
  }

  // ---- EVENTS (non-critical — videos still show if this fails) ----
  // Uses explicit column selection (not .select()) so the query works
  // even if the is_featured column doesn't exist yet (pre-migration).
  let eventsWithCounts: VideoEvent[] = [];
  try {
    const allEvents = await db
      .select({
        id: verticalVideoEvents.id,
        title: verticalVideoEvents.title,
        slug: verticalVideoEvents.slug,
        description: verticalVideoEvents.description,
        coverImageUrl: verticalVideoEvents.coverImageUrl,
        artistId: verticalVideoEvents.artistId,
        eventDate: verticalVideoEvents.eventDate,
        location: verticalVideoEvents.location,
        isPublished: verticalVideoEvents.isPublished,
        displayOrder: verticalVideoEvents.displayOrder,
        createdAt: verticalVideoEvents.createdAt,
        updatedAt: verticalVideoEvents.updatedAt,
      })
      .from(verticalVideoEvents)
      .where(eq(verticalVideoEvents.isPublished, true))
      .orderBy(
        verticalVideoEvents.displayOrder,
        desc(verticalVideoEvents.eventDate),
      );

    // BATCH FETCH EVENT VIDEO COUNTS — single query, group in JS.
    const eventIds = allEvents.map((e) => e.id);
    const eventCounts =
      eventIds.length > 0
        ? await db
            .select({
              eventId: verticalVideos.eventId,
              total: sql<number>`count(*)`,
            })
            .from(verticalVideos)
            .where(
              and(
                inArray(verticalVideos.eventId, eventIds),
                eq(verticalVideos.isPublished, true),
              ),
            )
            .groupBy(verticalVideos.eventId)
        : [];

    const countsByEventId = new Map<string, number>();
    for (const row of eventCounts) {
      countsByEventId.set(row.eventId as string, row.total);
    }

    eventsWithCounts = allEvents
      .map((event) => ({
        ...event,
        isFeatured: false, // not needed on public page; default false
        videoCount: countsByEventId.get(event.id) || 0,
      }))
      .filter((e) => e.videoCount > 0);
  } catch (error) {
    console.error("Error fetching reels events:", error);
  }

  return { videos: videosWithTags, events: eventsWithCounts };
}

function ReelsSkeleton() {
  return (
    <div className="space-y-12">
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[16/9] rounded-xl" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[9/16] rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function ReelsPage() {
  const { videos, events } = await getReelsData();

  return (
    <div className="py-12">
      <div className="section-container">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-primary/20 border border-primary/30">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h1 className="font-oswald text-4xl md:text-5xl uppercase tracking-wide text-white">
            Reels
          </h1>
          <p className="text-gray-400 mt-2">
            Videos verticales, Reels, TikToks y YouTube Shorts
          </p>
          <div className="section-divider" />

          {/* Immersive feed CTA */}
          {videos.length > 0 && (
            <div className="mt-6">
              <Button asChild size="lg" className="gap-2">
                <Link href="/reels/feed">
                  <PlayCircle className="w-5 h-5" />
                  Modo Inmersivo
                </Link>
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Desliza como en TikTok
              </p>
            </div>
          )}
        </div>

        {/* Videos Grid with Events */}
        <Suspense fallback={<ReelsSkeleton />}>
          <ReelsGrid videos={videos} events={events} />
        </Suspense>
      </div>
    </div>
  );
}
