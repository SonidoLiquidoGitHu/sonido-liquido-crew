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
      SELECT * FROM artists WHERE is_active = 1 ORDER BY sort_order ASC
    `);

    const artists = result.rows.map((row) => ({
      id: row.id,
      spotifyId: row.spotify_id,
      name: row.name,
      displayName: row.display_name || row.name,
      slug: row.slug,
      role: row.role,
      bio: row.bio,
      imageUrl: row.image_url,
      profileImageUrl: row.profile_image_url || row.image_url,
      genres: row.genres,
      followers: row.followers,
      popularity: row.popularity,
      spotifyUrl: row.spotify_url,
      youtubeUrl: row.youtube_url,
      instagramUrl: row.instagram_url,
    }));

    if (includeStats) {
      const statsResult = await client.execute(`
        SELECT
          COUNT(*) as activeArtists,
          SUM(followers) as totalFollowers
        FROM artists WHERE is_active = 1
      `);

      return NextResponse.json({
        success: true,
        artists,
        count: artists.length,
        stats: {
          activeArtists: Number(statsResult.rows[0]?.activeArtists || 0),
          totalFollowers: Number(statsResult.rows[0]?.totalFollowers || 0),
        },
      });
    }

    return NextResponse.json({
      success: true,
      artists,
      count: artists.length,
    });
  } catch (error) {
    console.error("Error fetching artists:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch artists" },
      { status: 500 }
    );
  }
}
