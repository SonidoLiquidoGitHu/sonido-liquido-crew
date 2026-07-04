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
import { and, desc, eq, sql } from "drizzle-orm";
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

  try {
    // Fetch all published videos
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

    // Fetch tags for each video
    const videosWithTags = await Promise.all(
      allVideos.map(async (video) => {
        const videoTagRows = await db
          .select({ tag: tags })
          .from(verticalVideoTags)
          .innerJoin(tags, eq(verticalVideoTags.tagId, tags.id))
          .where(eq(verticalVideoTags.videoId, video.id));

        return {
          ...video,
          tags: videoTagRows.map((row) => row.tag),
        };
      }),
    );

    // Fetch all published events with video counts
    const allEvents = await db
      .select()
      .from(verticalVideoEvents)
      .where(eq(verticalVideoEvents.isPublished, true))
      .orderBy(
        verticalVideoEvents.displayOrder,
        desc(verticalVideoEvents.eventDate),
      );

    const eventsWithCounts = await Promise.all(
      allEvents.map(async (event) => {
        const [countResult] = await db
          .select({ total: sql<number>`count(*)` })
          .from(verticalVideos)
          .where(
            and(
              eq(verticalVideos.eventId, event.id),
              eq(verticalVideos.isPublished, true),
            ),
          );

        return {
          ...event,
          videoCount: countResult?.total || 0,
        };
      }),
    );

    // Only include events that have at least 1 video
    const activeEvents = eventsWithCounts.filter((e) => e.videoCount > 0);

    return { videos: videosWithTags, events: activeEvents };
  } catch (error) {
    console.error("Error fetching reels:", error);
    return { videos: [], events: [] };
  }
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
