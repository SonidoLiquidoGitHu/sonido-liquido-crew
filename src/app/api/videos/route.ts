import { NextResponse } from "next/server";
import { getClient, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await initializeDatabase();
    const client = await getClient();
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("stats") === "true";

    const result = await client.execute(`
      SELECT * FROM videos WHERE is_published = 1 ORDER BY published_at DESC
    `);

    const videos = result.rows.map((row) => ({
      id: row.id,
      youtubeId: row.youtube_id,
      artistId: row.artist_id,
      artistName: row.artist_name,
      title: row.title,
      description: row.description,
      thumbnailUrl: row.thumbnail_url,
      youtubeUrl: row.youtube_url,
      viewCount: row.view_count,
      durationSeconds: row.duration_seconds,
      publishedAt: row.published_at,
    }));

    if (includeStats) {
      const statsResult = await client.execute(`
        SELECT
          COUNT(*) as totalVideos,
          SUM(view_count) as totalViews
        FROM videos WHERE is_published = 1
      `);

      return NextResponse.json({
        success: true,
        videos,
        count: videos.length,
        stats: {
          totalVideos: Number(statsResult.rows[0]?.totalVideos || 0),
          totalViews: Number(statsResult.rows[0]?.totalViews || 0),
        },
      });
    }

    return NextResponse.json({
      success: true,
      videos,
      count: videos.length,
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}
