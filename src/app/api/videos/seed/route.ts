import { NextResponse } from "next/server";
import { getClient, initializeDatabase } from "../../../../lib/db";
export const dynamic = "force-dynamic";
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}
const SAMPLE_VIDEOS = [
  {
    youtubeId: "dQw4w9WgXcQ",
    title: "Sonido Líquido - Live Session 2024",
    artistName: "Sonido Líquido Crew",
    durationSeconds: 245,
    thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  },
  {
    youtubeId: "9bZkp7q19f0",
    title: "Hip Hop Mexicano - Street Cypher",
    artistName: "SLC Collective",
    durationSeconds: 312,
    thumbnailUrl: "https://i.ytimg.com/vi/9bZkp7q19f0/maxresdefault.jpg",
  },
  {
    youtubeId: "kJQP7kiw5Fk",
    title: "CDMX Underground Session",
    artistName: "Various Artists",
    durationSeconds: 420,
    thumbnailUrl: "https://i.ytimg.com/vi/kJQP7kiw5Fk/maxresdefault.jpg",
  },
  {
    youtubeId: "hT_nvWreIhg",
    title: "Beatmaker Showcase Vol. 1",
    artistName: "SLC Producers",
    durationSeconds: 285,
    thumbnailUrl: "https://i.ytimg.com/vi/hT_nvWreIhg/maxresdefault.jpg",
  },
  {
    youtubeId: "RgKAFK5djSk",
    title: "Rap en Español - Freestyle Friday",
    artistName: "Sonido Líquido",
    durationSeconds: 198,
    thumbnailUrl: "https://i.ytimg.com/vi/RgKAFK5djSk/maxresdefault.jpg",
  },
  {
    youtubeId: "CevxZvSJLk8",
    title: "25 Years Anniversary Concert",
    artistName: "Sonido Líquido Crew",
    durationSeconds: 540,
    thumbnailUrl: "https://i.ytimg.com/vi/CevxZvSJLk8/maxresdefault.jpg",
  },
];
export async function POST() {
  try {
    await initializeDatabase();
    const client = await getClient();
    let videosAdded = 0;
    for (const video of SAMPLE_VIDEOS) {
      const videoId = generateId();
      const now = new Date().toISOString();
      await client.execute({
        sql: `
          INSERT INTO videos (id, youtube_id, artist_name, title, thumbnail_url, duration_seconds, is_published, is_featured, published_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?)
          ON CONFLICT(youtube_id) DO UPDATE SET
            artist_name = excluded.artist_name,
            title = excluded.title,
            thumbnail_url = excluded.thumbnail_url,
            duration_seconds = excluded.duration_seconds,
            updated_at = excluded.updated_at
        `,
        args: [
          videoId,
          video.youtubeId,
          video.artistName,
          video.title,
          video.thumbnailUrl,
          video.durationSeconds,
          now,
          now,
          now,
        ],
      });
      videosAdded++;
    }
    return NextResponse.json({
      success: true,
      message: `Added ${videosAdded} sample videos`,
      videosAdded,
    });
  } catch (error) {
    console.error("Error seeding videos:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to seed videos",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
