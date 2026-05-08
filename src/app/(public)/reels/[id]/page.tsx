import { notFound } from "next/navigation";
import { db, isDatabaseConfigured } from "@/db/client";
import { verticalVideos, verticalVideoTags, tags, artists } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { ReelDetail } from "./ReelDetail";

export const metadata = {
  title: "Reel | Sonido Líquido Crew",
  description: "Video vertical de Sonido Líquido Crew",
};

export const dynamic = "force-dynamic";

async function getVideo(id: string) {
  if (!isDatabaseConfigured()) return null;

  try {
    const [video] = await db
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
        isPublished: verticalVideos.isPublished,
        shareCount: verticalVideos.shareCount,
        viewCount: verticalVideos.viewCount,
        duration: verticalVideos.duration,
        createdAt: verticalVideos.createdAt,
        artistName: artists.name,
        artistSlug: artists.slug,
      })
      .from(verticalVideos)
      .leftJoin(artists, eq(verticalVideos.artistId, artists.id))
      .where(eq(verticalVideos.id, id));

    if (!video || !video.isPublished) return null;

    // Fetch tags
    const videoTagRows = await db
      .select({ tag: tags })
      .from(verticalVideoTags)
      .innerJoin(tags, eq(verticalVideoTags.tagId, tags.id))
      .where(eq(verticalVideoTags.videoId, id));

    // Increment view count (fire and forget)
    db.update(verticalVideos)
      .set({ viewCount: sql`${verticalVideos.viewCount} + 1` })
      .where(eq(verticalVideos.id, id))
      .catch(() => {});

    return {
      ...video,
      viewCount: video.viewCount + 1,
      tags: videoTagRows.map((r) => r.tag),
    };
  } catch (error) {
    console.error("Error fetching video:", error);
    return null;
  }
}

export default async function ReelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const video = await getVideo(id);

  if (!video) {
    notFound();
  }

  return <ReelDetail video={video} />;
}
