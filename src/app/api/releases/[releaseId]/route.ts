import { NextResponse } from "next/server";
import { getClient, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ releaseId: string }> }
) {
  try {
    const { releaseId } = await params;

    await initializeDatabase();
    const client = await getClient();

    // Try to find by ID first, then by slug
    let result = await client.execute({
      sql: "SELECT * FROM releases WHERE id = ?",
      args: [releaseId],
    });

    // If not found by ID, try by slug
    if (result.rows.length === 0) {
      result = await client.execute({
        sql: "SELECT * FROM releases WHERE slug = ?",
        args: [releaseId],
      });
    }


    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Release not found" },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    // Get tracks
    const tracksResult = await client.execute({
      sql: "SELECT * FROM release_tracks WHERE release_id = ? ORDER BY track_number ASC",
      args: [releaseId],
    });

    const tracks = tracksResult.rows.map((t) => ({
      id: t.id,
      trackNumber: t.track_number,
      title: t.title,
      artistName: t.artist_name,
      duration: t.duration,
      audioUrl: t.audio_url,
      isFeatured: Boolean(t.is_featured),
    }));

    const release = {
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
      isFeatured: Boolean(row.is_featured),
      isPublished: Boolean(row.is_published),
      isActive: Boolean(row.is_active),
      isPublic: Boolean(row.is_public),
      descriptionEs: row.description_es,
      descriptionEn: row.description_en,
      pressReleaseEs: row.press_release_es,
      pressReleaseEn: row.press_release_en,
      creditsEs: row.credits_es,
      creditsEn: row.credits_en,
      quotes: row.quotes ? JSON.parse(row.quotes as string) : [],
      pressPhotos: row.press_photos ? JSON.parse(row.press_photos as string) : [],
      youtubeVideoId: row.youtube_video_id,
      soundcloudUrl: row.soundcloud_url,
      audioPreviewUrl: row.audio_preview_url,
      presaveOnerpm: row.presave_onerpm,
      presaveDistrokid: row.presave_distrokid,
      presaveBandcamp: row.presave_bandcamp,
      presaveDirect: row.presave_direct,
      socialPreviewTitle: row.social_preview_title,
      socialPreviewDescription: row.social_preview_description,
      tracks,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({ success: true, release });
  } catch (error) {
    console.error("Error fetching release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch release" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ releaseId: string }> }
) {
  try {
    const { releaseId } = await params;
    const data = await request.json();

    await initializeDatabase();
    const client = await getClient();

    const now = new Date().toISOString();

    await client.execute({
      sql: `
        UPDATE releases SET
          artist_name = ?, featured_artists = ?, title = ?, title_en = ?,
          release_type = ?, release_date = ?, cover_image_url = ?, image_url = ?,
          spotify_url = ?, is_featured = ?, is_published = ?, is_active = ?, is_public = ?,
          description_es = ?, description_en = ?, press_release_es = ?, press_release_en = ?,
          credits_es = ?, credits_en = ?, quotes = ?, press_photos = ?,
          youtube_video_id = ?, soundcloud_url = ?, audio_preview_url = ?,
          presave_onerpm = ?, presave_distrokid = ?, presave_bandcamp = ?, presave_direct = ?,
          social_preview_title = ?, social_preview_description = ?, updated_at = ?
        WHERE id = ?
      `,
      args: [
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
        releaseId,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Release updated successfully",
    });
  } catch (error) {
    console.error("Error updating release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update release" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ releaseId: string }> }
) {
  try {
    const { releaseId } = await params;

    await initializeDatabase();
    const client = await getClient();

    // Delete tracks first
    await client.execute({
      sql: "DELETE FROM release_tracks WHERE release_id = ?",
      args: [releaseId],
    });

    await client.execute({
      sql: "DELETE FROM releases WHERE id = ?",
      args: [releaseId],
    });

    return NextResponse.json({
      success: true,
      message: "Release deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting release:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete release" },
      { status: 500 }
    );
  }
}
