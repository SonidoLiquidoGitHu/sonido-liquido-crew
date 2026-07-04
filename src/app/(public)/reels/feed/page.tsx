import { TikTokFeed } from "@/components/public/sections/TikTokFeed";
import { db, isDatabaseConfigured } from "@/db/client";
import { artists, tags, verticalVideoTags, verticalVideos } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

export const metadata = {
  title: "Reels Feed | Sonido Líquido Crew",
  description:
    "Explora nuestros videos verticales en modo feed inmersivo. Desliza para descubrir Reels, TikToks y YouTube Shorts de Sonido Líquido Crew.",
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
      }),
    );

    return videosWithTags;
  } catch (error) {
    console.error("Error fetching reels for feed:", error);
    return [];
  }
}

export default async function ReelsFeedPage() {
  const videos = await getReelsData();

  return <TikTokFeed videos={videos} />;
}
