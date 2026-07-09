import { TikTokFeed } from "@/components/public/sections/TikTokFeed";
import { db, isDatabaseConfigured } from "@/db/client";
import { artists, tags, verticalVideoTags, verticalVideos } from "@/db/schema";
import { desc, eq, inArray } from "drizzle-orm";

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

    // BATCH FETCH TAGS — single query for all videos.
    // Previously this was an N+1 (one query per video) which added 100-500ms
    // of latency on feeds with 20-30 videos.
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

    return allVideos.map((video) => ({
      ...video,
      tags: (tagsByVideoId.get(video.id) || []).map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
      })),
    }));
  } catch (error) {
    console.error("Error fetching reels for feed:", error);
    return [];
  }
}

export default async function ReelsFeedPage() {
  const videos = await getReelsData();

  return <TikTokFeed videos={videos} />;
}
