import { NextResponse } from "next/server";
import { getClient, initializeDatabase } from "../../../lib/db";
export const dynamic = "force-dynamic";
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
}
export async function GET(request: Request) {
  try {
    await initializeDatabase();
    const client = await getClient();
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("stats") === "true";
    const all = searchParams.get("all") === "true";
    const sql = all
      ? "SELECT * FROM releases ORDER BY release_date DESC"
      : "SELECT * FROM releases WHERE is_published = 1 ORDER BY release_date DESC";
    const result = await client.execute(sql);
    const releases = result.rows.map((row) => ({
      id: row.id,
      spotifyId: row.spotify_id,
      artistId: row.artist_id,
      artistName: row.artist_name,
      featuredArtists: row.featured_artists,
      slug: row.slug,
      title: row.title,
      titleEn: row.title_en,
      releaseType: row.release_type,
      releaseDate: row.release_date,
      imageUrl: row.image_url,
      coverImageUrl: row.cover_image_url || row.image_url,
      spotifyUrl: row.spotify_url,
      totalTracks: row.total_tracks,
      isFeatured: row.is_featured,
      isPublished: row.is_published,
      isActive: row.is_active,
      isPublic: row.is_public,
      descriptionEs: row.description_es,
      descriptionEn: row.description_en,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    if (includeStats) {
      const statsResult = await client.execute(`
        SELECT
          COUNT(*) as totalReleases,
          SUM(total_tracks) as totalTracks
        FROM releases WHERE is_published = 1
      `);
      return NextResponse.json({
        success: true,
        releases,
        count: releases.length,
        stats: {
          totalReleases: Number(statsResult.rows[0]?.totalReleases || 0),
          totalTracks: Number(statsResult.rows[0]?.totalTracks || 0),
        },
      });
    }
    return NextResponse.json({
      success: true,
      releases,
      count: releases.length,
    });
  } catch (error) {
    console.error("Error fetching releases:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch releases" },
      { status: 500 }
    );
  }
}
export async function POST(request: Request) {
  try {
    const data = await request.json();
    await initializeDatabase();
    const client = await getClient();
    const id = generateId();
    const slug = slugify(data.title);
    const now = new Date().toISOString();
    await client.execute({
      sql: `
        INSERT INTO releases (
          id, slug, artist_name, featured_artists, title, title_en,
          release_type, release_date, cover_image_url, image_url, spotify_url,
          is_featured, is_published, is_active, is_public,
          description_es, description_en, press_release_es, press_release_en,
          credits_es, credits_en, quotes, press_photos,
          youtube_video_id, soundcloud_url, audio_preview_url,
          presave_onerpm, presave_distrokid, presave_bandcamp, presave_direct,
          social_preview_title, social_preview_description,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        slug,
        data.artistName || null,
        data.featuredArtists || null,
        data.title,
        data.titleEn || null,
        data.releaseType || "album",
        data.releaseDate || null,
        data.coverImageUrl || null,
        data.coverImageUrl || null,
        data.spotifyUrl || null,
        data.isFeatured ? 1 : 0,
        data.isPublished !== false ? 1 : 0,
        data.isActive !== false ? 1 : 0,
        data.isPublic !== false ? 1 : 0,
        data.descriptionEs || null,
        data.descriptionEn || null,
        data.pressReleaseEs || null,
        data.pressReleaseEn || null,
        data.creditsEs || null,
        data.creditsEn || null,
        data.quotes ? JSON.stringify(data.quotes) : null,
        data.pressPhotos ? JSON.stringify(data.pressPhotos) : null,
        data.youtubeVideoId || null,
        data.soundcloudUrl || null,
        data.audioPreviewUrl || null,
        data.presaveOnerpm || null,
        data.presaveDistrokid || null,
        data.presaveBandcamp || null,
        data.presaveDirect || null,
        data.socialPreviewTitle || null,
        data.socialPreviewDescription || null,
        now,
        now,
      ],
    });
    // Add tracks if provided
    if (data.tracks && data.tracks.length > 0) {
      for (const track of data.tracks) {
        const trackId = generateId();
        await client.execute({
          sql: `
            INSERT INTO release_tracks (id, release_id, track_number, title, artist_name, duration, audio_url, is_featured)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            trackId,
            id,
            track.trackNumber || 1,
            track.title,
            track.artistName || null,
            track.duration || null,
            track.audioUrl || null,
            track.isFeatured ? 1 : 0,
          ],
        });
      }
    }
    return NextResponse.json({
      success: true,
      message: "Release created successfully",
      id,
    });
  } catch (error) {
    console.error("Error creating release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create release" },
      { status: 500 }
    );
  }
}
