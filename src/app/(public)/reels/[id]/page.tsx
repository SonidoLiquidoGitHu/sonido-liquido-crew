import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db, isDatabaseConfigured } from "@/db/client";
import { verticalVideos, verticalVideoTags, tags, artists } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { ReelDetail } from "./ReelDetail";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sonidoliquido.com";

export const dynamic = "force-dynamic";

// ===========================================
// DYNAMIC OG META TAGS FOR VIDEO SHARING
// Generates rich previews on WhatsApp, Twitter, Facebook, etc.
// ===========================================
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  // Default fallback metadata
  const fallback: Metadata = {
    title: "Reel | Sonido Líquido Crew",
    description: "Video vertical de Sonido Líquido Crew",
  };

  if (!isDatabaseConfigured()) return fallback;

  try {
    const [video] = await db
      .select({
        id: verticalVideos.id,
        title: verticalVideos.title,
        description: verticalVideos.description,
        videoUrl: verticalVideos.videoUrl,
        thumbnailUrl: verticalVideos.thumbnailUrl,
        platform: verticalVideos.platform,
        embedUrl: verticalVideos.embedUrl,
        artistName: artists.name,
      })
      .from(verticalVideos)
      .leftJoin(artists, eq(verticalVideos.artistId, artists.id))
      .where(eq(verticalVideos.id, id));

    if (!video) return fallback;

    const title = video.title
      ? `${video.title}${video.artistName ? ` — ${video.artistName}` : ""} | SLC Reels`
      : "Reel | Sonido Líquido Crew";
    const description =
      video.description ||
      `Mira este video de ${video.artistName || "Sonido Líquido Crew"}`;
    const pageUrl = `${SITE_URL}/reels/${video.id}`;
    const thumbnail = video.thumbnailUrl || undefined;

    // Extract YouTube ID for video embed in OG
    let videoEmbedUrl: string | undefined;
    if (video.embedUrl) {
      videoEmbedUrl = video.embedUrl;
    } else if (video.videoUrl) {
      const ytMatch = video.videoUrl.match(
        /(?:shorts\/|watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
      );
      if (ytMatch) {
        videoEmbedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
      }
    }

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: pageUrl,
        siteName: "Sonido Líquido Crew",
        type: "video.other",
        ...(thumbnail && { images: [{ url: thumbnail, width: 1080, height: 1920, alt: video.title || "Video" }] }),
        ...(videoEmbedUrl && { videos: [{ url: videoEmbedUrl, width: 1080, height: 1920 }] }),
      },
      twitter: {
        card: thumbnail ? "summary_large_image" : "summary",
        title,
        description,
        ...(thumbnail && { images: [thumbnail] }),
      },
    };
  } catch {
    return fallback;
  }
}

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
