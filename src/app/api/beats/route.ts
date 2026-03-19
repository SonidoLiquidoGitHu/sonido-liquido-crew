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
      ? "SELECT * FROM beats ORDER BY created_at DESC"
      : "SELECT * FROM beats WHERE is_available = 1 ORDER BY created_at DESC";
    const result = await client.execute(sql);
    const beats = await Promise.all(result.rows.map(async (row) => {
      const actionsResult = await client.execute({
        sql: "SELECT * FROM download_gate_actions WHERE beat_id = ? ORDER BY sort_order ASC",
        args: [row.id as string],
      });
      const actions = actionsResult.rows.map((a) => ({
        id: a.id,
        actionType: a.action_type,
        label: a.label,
        url: a.url,
        sortOrder: a.sort_order,
      }));
      return {
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
    }));
    if (includeStats) {
      const statsResult = await client.execute(`
        SELECT
          COUNT(*) as totalBeats,
          SUM(CASE WHEN is_available = 1 THEN 1 ELSE 0 END) as availableBeats,
          SUM(CASE WHEN download_gate_enabled = 1 THEN 1 ELSE 0 END) as gatedBeats,
          SUM(download_count) as totalDownloads,
          COUNT(DISTINCT producer_name) as producers
        FROM beats
      `);
      return NextResponse.json({
        success: true,
        beats,
        count: beats.length,
        stats: {
          totalBeats: Number(statsResult.rows[0]?.totalBeats || 0),
          availableBeats: Number(statsResult.rows[0]?.availableBeats || 0),
          gatedBeats: Number(statsResult.rows[0]?.gatedBeats || 0),
          totalDownloads: Number(statsResult.rows[0]?.totalDownloads || 0),
          producers: Number(statsResult.rows[0]?.producers || 0),
        },
      });
    }
    return NextResponse.json({ success: true, beats, count: beats.length });
  } catch (error) {
    console.error("Error fetching beats:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch beats" }, { status: 500 });
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
      sql: `INSERT INTO beats (id, title, producer_name, slug, release_date, bpm, key_signature, tags,
          cover_image_url, audio_file_url, audio_preview_url, hypeddit_url, spotify_track_id,
          youtube_video_id, onerpm_url, distrokid_url, bandcamp_url, download_gate_enabled,
          is_available, is_featured, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, data.title, data.producerName, slug, data.releaseDate || null, data.bpm || null,
        data.keySignature || null, data.tags || null, data.coverImageUrl || null,
        data.audioFileUrl || null, data.audioPreviewUrl || null, data.hypedditUrl || null,
        data.spotifyTrackId || null, data.youtubeVideoId || null, data.onerpmUrl || null,
        data.distrokidUrl || null, data.bandcampUrl || null, data.downloadGateEnabled ? 1 : 0,
        data.isAvailable !== false ? 1 : 0, data.isFeatured ? 1 : 0, now, now],
    });
    if (data.downloadGateActions?.length > 0) {
      for (let i = 0; i < data.downloadGateActions.length; i++) {
        const action = data.downloadGateActions[i];
        await client.execute({
          sql: `INSERT INTO download_gate_actions (id, beat_id, action_type, label, url, sort_order)
            VALUES (?, ?, ?, ?, ?, ?)`,
          args: [generateId(), id, action.actionType, action.label, action.url || null, i],
        });
      }
    }
    return NextResponse.json({ success: true, message: "Beat created successfully", id });
  } catch (error) {
    console.error("Error creating beat:", error);
    return NextResponse.json({ success: false, error: "Failed to create beat" }, { status: 500 });
  }
}
