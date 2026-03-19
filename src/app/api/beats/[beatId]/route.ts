import { NextResponse } from "next/server";
import { getClient, initializeDatabase } from "../../../../lib/db";
export const dynamic = "force-dynamic";
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ beatId: string }> }
) {
  try {
    const { beatId: id } = await params;
    await initializeDatabase();
    const client = await getClient();
    const result = await client.execute({
      sql: "SELECT * FROM beats WHERE id = ?",
      args: [id],
    });
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Beat not found" },
        { status: 404 }
      );
    }
    const row = result.rows[0];
    // Get download gate actions
    const actionsResult = await client.execute({
      sql: "SELECT * FROM download_gate_actions WHERE beat_id = ? ORDER BY sort_order ASC",
      args: [id],
    });
    const actions = actionsResult.rows.map((a) => ({
      id: a.id,
      actionType: a.action_type,
      label: a.label,
      url: a.url,
      sortOrder: a.sort_order,
    }));
    const beat = {
      id: row.id,
      title: row.title,
      producerName: row.producer_name,
      slug: row.slug,
      releaseDate: row.release_date,
      bpm: row.bpm,
      keySignature: row.key_signature,
      tags: row.tags,
      coverImageUrl: row.cover_image_url,
      audioFileUrl: row.audio_file_url,
      audioPreviewUrl: row.audio_preview_url,
      hypedditUrl: row.hypeddit_url,
      spotifyTrackId: row.spotify_track_id,
      youtubeVideoId: row.youtube_video_id,
      onerpmUrl: row.onerpm_url,
      distrokidUrl: row.distrokid_url,
      bandcampUrl: row.bandcamp_url,
      downloadGateEnabled: Boolean(row.download_gate_enabled),
      downloadGateActions: actions,
      downloadCount: row.download_count,
      isAvailable: Boolean(row.is_available),
      isFeatured: Boolean(row.is_featured),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    return NextResponse.json({ success: true, beat });
  } catch (error) {
    console.error("Error fetching beat:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch beat" },
      { status: 500 }
    );
  }
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ beatId: string }> }
) {
  try {
    const { beatId: id } = await params;
    const data = await request.json();
    await initializeDatabase();
    const client = await getClient();
    const now = new Date().toISOString();
    await client.execute({
      sql: `
        UPDATE beats SET
          title = ?, producer_name = ?, release_date = ?, bpm = ?,
          key_signature = ?, tags = ?, cover_image_url = ?, audio_file_url = ?,
          audio_preview_url = ?, hypeddit_url = ?, spotify_track_id = ?,
          youtube_video_id = ?, onerpm_url = ?, distrokid_url = ?, bandcamp_url = ?,
          download_gate_enabled = ?, is_available = ?, is_featured = ?, updated_at = ?
        WHERE id = ?
      `,
      args: [
        data.title,
        data.producerName,
        data.releaseDate || null,
        data.bpm || null,
        data.keySignature || null,
        data.tags || null,
        data.coverImageUrl || null,
        data.audioFileUrl || null,
        data.audioPreviewUrl || null,
        data.hypedditUrl || null,
        data.spotifyTrackId || null,
        data.youtubeVideoId || null,
        data.onerpmUrl || null,
        data.distrokidUrl || null,
        data.bandcampUrl || null,
        data.downloadGateEnabled ? 1 : 0,
        data.isAvailable !== false ? 1 : 0,
        data.isFeatured ? 1 : 0,
        now,
        id,
      ],
    });
    // Update download gate actions
    await client.execute({
      sql: "DELETE FROM download_gate_actions WHERE beat_id = ?",
      args: [id],
    });
    if (data.downloadGateActions && data.downloadGateActions.length > 0) {
      for (let i = 0; i < data.downloadGateActions.length; i++) {
        const action = data.downloadGateActions[i];
        await client.execute({
          sql: `INSERT INTO download_gate_actions (id, beat_id, action_type, label, url, sort_order)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [generateId(), id, action.actionType, action.label, action.url || null, i],
        });
      }
    }
    return NextResponse.json({
      success: true,
      message: "Beat updated successfully",
    });
  } catch (error) {
    console.error("Error updating beat:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update beat" },
      { status: 500 }
    );
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ beatId: string }> }
) {
  try {
    const { beatId: id } = await params;
    await initializeDatabase();
    const client = await getClient();
    // Delete associated actions first (cascade might not work in SQLite)
    await client.execute({
      sql: "DELETE FROM download_gate_actions WHERE beat_id = ?",
      args: [id],
    });
    await client.execute({
      sql: "DELETE FROM beats WHERE id = ?",
      args: [id],
    });
    return NextResponse.json({
      success: true,
      message: "Beat deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting beat:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete beat" },
      { status: 500 }
    );
  }
}
