import { Suspense } from "react";
import { Smartphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { db, isDatabaseConfigured } from "@/db/client";
import { verticalVideos, verticalVideoTags, tags, artists } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ReelsGrid } from "./ReelsGrid";

export const metadata = {
  title: "Reels | Sonido Líquido Crew",
  description: "Videos verticales, Reels, TikToks y YouTube Shorts de Sonido Líquido Crew.",
};

export const dynamic = "force-dynamic";

async function getReelsData() {
  if (!isDatabaseConfigured()) return [];

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
      })
    );

    return videosWithTags;
  } catch (error) {
    console.error("Error fetching reels:", error);
    return [];
  }
}

function ReelsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[9/16] rounded-xl" />
      ))}
    </div>
  );
}

export default async function ReelsPage() {
  const videos = await getReelsData();

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
        </div>

        {/* Videos Grid */}
        <Suspense fallback={<ReelsSkeleton />}>
          <ReelsGrid videos={videos} />
        </Suspense>
      </div>
    </div>
  );
}
