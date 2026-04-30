import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { campaigns, fileAssets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateUUID, slugify } from "@/lib/utils";
import { createClient } from "@libsql/client/web";

// Get raw client for direct SQL when needed
function getRawClient() {
  const url = (process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || "").trim();
  const token = (process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN || "").trim();

  if (!url || !token) return null;

  return createClient({ url, authToken: token });
}

// Track file asset for a URL if it's from Dropbox
async function trackDropboxFile(url: string | null, campaignId: string, fieldName: string) {
  if (!url || !url.includes("dropbox")) return;

  try {
    const existing = await db
      .select()
      .from(fileAssets)
      .where(eq(fileAssets.publicUrl, url))
      .limit(1);

    if (existing.length === 0) {
      const filename = url.split("/").pop() || "unknown";
      const ext = filename.split(".").pop()?.toLowerCase() || "";
      const mimeTypes: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
        zip: "application/zip",
        pdf: "application/pdf",
        mp3: "audio/mpeg",
        wav: "audio/wav",
      };

      await db.insert(fileAssets).values({
        id: generateUUID(),
        filename,
        originalFilename: filename,
        mimeType: mimeTypes[ext] || "application/octet-stream",
        fileSize: 0,
        storageProvider: "dropbox",
        storagePath: url,
        publicUrl: url,
        isPublic: true,
        metadata: {
          entityType: "campaign",
          entityId: campaignId,
          fieldName,
          trackedAt: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    console.error(`[Campaigns API] Failed to track file: ${error}`);
  }
}

export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      console.warn("[API] Database not configured - returning empty campaigns");
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const client = getRawClient();
    if (!client) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const result = await client.execute(
      "SELECT * FROM campaigns ORDER BY created_at DESC"
    );

    // Map snake_case to camelCase for frontend compatibility
    const allCampaigns = result.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      campaignType: row.campaign_type,
      artistId: row.artist_id,
      releaseId: row.release_id,
      coverImageUrl: row.cover_image_url,
      bannerImageUrl: row.banner_image_url,
      smartLinkUrl: row.smart_link_url,
      oneRpmUrl: row.onerpm_url,
      spotifyPresaveUrl: row.spotify_presave_url,
      appleMusicPresaveUrl: row.apple_music_presave_url,
      downloadGateEnabled: Boolean(row.download_gate_enabled),
      downloadFileUrl: row.download_file_url,
      downloadFileName: row.download_file_name,
      previewAudioUrl: row.preview_audio_url,
      previewVideoUrl: row.preview_video_url,
      youtubeVideoId: row.youtube_video_id,
      videoIsVertical: Boolean(row.video_is_vertical),
      requireSpotifyFollow: Boolean(row.require_spotify_follow),
      spotifyArtistUrl: row.spotify_artist_url,
      requireSpotifyPresave: Boolean(row.require_spotify_presave),
      requireEmail: Boolean(row.require_email),
      isActive: Boolean(row.is_active),
      isFeatured: Boolean(row.is_featured),
      startDate: row.start_date,
      endDate: row.end_date,
      releaseDate: row.release_date,
      totalViews: row.total_views || 0,
      totalConversions: row.total_conversions || 0,
      totalDownloads: row.total_downloads || 0,
      styleSettings: row.style_settings ? JSON.parse(row.style_settings) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: allCampaigns,
    });
  } catch (error) {
    console.error("[API] Error fetching campaigns:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      console.error("[API] Database not configured for campaign creation");
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    console.log("[API] Creating campaign:", body.title);

    if (!body.title) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    // Use raw SQL to insert only the columns we know exist
    const client = getRawClient();
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Database client not available" },
        { status: 503 }
      );
    }

    const id = generateUUID();
    let slug = body.slug || slugify(body.title);
    const now = Math.floor(Date.now() / 1000);

    // Check if slug exists and make it unique
    const existingSlug = await client.execute({
      sql: "SELECT id FROM campaigns WHERE slug = ?",
      args: [slug],
    });

    if (existingSlug.rows.length > 0) {
      // Add timestamp suffix to make it unique
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Parse dates
    const startDate = body.startDate ? Math.floor(new Date(body.startDate).getTime() / 1000) : null;
    const endDate = body.endDate ? Math.floor(new Date(body.endDate).getTime() / 1000) : null;
    const releaseDate = body.releaseDate ? Math.floor(new Date(body.releaseDate).getTime() / 1000) : null;

    // Prepare style settings as JSON string
    const styleSettingsJson = body.styleSettings && Object.keys(body.styleSettings).length > 0
      ? JSON.stringify(body.styleSettings)
      : null;

    // Build INSERT with all campaign columns
    const sql = `
      INSERT INTO campaigns (
        id, title, slug, description, campaign_type, artist_id,
        cover_image_url, banner_image_url, smart_link_url, onerpm_url,
        spotify_presave_url, apple_music_presave_url,
        download_gate_enabled, download_file_url, download_file_name,
        preview_audio_url, preview_video_url, youtube_video_id, video_is_vertical,
        require_spotify_follow, spotify_artist_url, require_spotify_presave, require_email,
        is_active, is_featured, start_date, end_date, release_date,
        style_settings, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      body.title,
      slug,
      body.description || null,
      body.campaignType || "presave",
      body.artistId || null,
      body.coverImageUrl || null,
      body.bannerImageUrl || null,
      body.smartLinkUrl || null,
      body.oneRpmUrl || null,
      body.spotifyPresaveUrl || null,
      body.appleMusicPresaveUrl || null,
      body.downloadGateEnabled ? 1 : 0,
      body.downloadFileUrl || null,
      body.downloadFileName || null,
      body.previewAudioUrl || null,
      body.previewVideoUrl || null,
      body.youtubeVideoId || null,
      body.videoIsVertical ? 1 : 0,
      body.requireSpotifyFollow ? 1 : 0,
      body.spotifyArtistUrl || null,
      body.requireSpotifyPresave ? 1 : 0,
      body.requireEmail !== false ? 1 : 0,
      body.isActive !== false ? 1 : 0,
      body.isFeatured ? 1 : 0,
      startDate,
      endDate,
      releaseDate,
      styleSettingsJson,
      now,
      now,
    ];

    await client.execute({ sql, args: params });

    // Fetch the created campaign
    const result = await client.execute({
      sql: "SELECT * FROM campaigns WHERE id = ?",
      args: [id],
    });

    const campaign = result.rows[0];

    console.log(`[API] Created campaign: ${body.title} (${id})`);

    // Track Dropbox files for persistence (non-blocking)
    Promise.all([
      trackDropboxFile(body.coverImageUrl, id, "coverImageUrl"),
      trackDropboxFile(body.bannerImageUrl, id, "bannerImageUrl"),
      trackDropboxFile(body.downloadFileUrl, id, "downloadFileUrl"),
      trackDropboxFile(body.previewAudioUrl, id, "previewAudioUrl"),
    ]).catch(err => console.warn("[API] Failed to track some files:", err));

    return NextResponse.json({
      success: true,
      data: campaign,
    });
  } catch (error: any) {
    console.error("[API] Error creating campaign:", error);
    const errorMessage = error?.message || "Unknown error";

    return NextResponse.json(
      { success: false, error: `Failed to create campaign: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PUT - Update a campaign
export async function PUT(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: "Campaign ID is required" },
        { status: 400 }
      );
    }

    const client = getRawClient();
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Database client not available" },
        { status: 503 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const startDate = body.startDate ? Math.floor(new Date(body.startDate).getTime() / 1000) : null;
    const endDate = body.endDate ? Math.floor(new Date(body.endDate).getTime() / 1000) : null;
    const releaseDate = body.releaseDate ? Math.floor(new Date(body.releaseDate).getTime() / 1000) : null;
    const styleSettingsJson = body.styleSettings && Object.keys(body.styleSettings).length > 0
      ? JSON.stringify(body.styleSettings)
      : null;

    const sql = `
      UPDATE campaigns SET
        title = ?, slug = ?, description = ?, campaign_type = ?, artist_id = ?,
        cover_image_url = ?, banner_image_url = ?, smart_link_url = ?, onerpm_url = ?,
        spotify_presave_url = ?, apple_music_presave_url = ?,
        download_gate_enabled = ?, download_file_url = ?, download_file_name = ?,
        preview_audio_url = ?, preview_video_url = ?, youtube_video_id = ?, video_is_vertical = ?,
        require_spotify_follow = ?, spotify_artist_url = ?, require_spotify_presave = ?, require_email = ?,
        is_active = ?, is_featured = ?, start_date = ?, end_date = ?, release_date = ?,
        style_settings = ?, updated_at = ?
      WHERE id = ?
    `;

    const params = [
      body.title,
      body.slug || slugify(body.title),
      body.description || null,
      body.campaignType || "presave",
      body.artistId || null,
      body.coverImageUrl || null,
      body.bannerImageUrl || null,
      body.smartLinkUrl || null,
      body.oneRpmUrl || null,
      body.spotifyPresaveUrl || null,
      body.appleMusicPresaveUrl || null,
      body.downloadGateEnabled ? 1 : 0,
      body.downloadFileUrl || null,
      body.downloadFileName || null,
      body.previewAudioUrl || null,
      body.previewVideoUrl || null,
      body.youtubeVideoId || null,
      body.videoIsVertical ? 1 : 0,
      body.requireSpotifyFollow ? 1 : 0,
      body.spotifyArtistUrl || null,
      body.requireSpotifyPresave ? 1 : 0,
      body.requireEmail !== false ? 1 : 0,
      body.isActive !== false ? 1 : 0,
      body.isFeatured ? 1 : 0,
      startDate,
      endDate,
      releaseDate,
      styleSettingsJson,
      now,
      body.id,
    ];

    await client.execute({ sql, args: params });

    // Fetch the updated campaign
    const result = await client.execute({
      sql: "SELECT * FROM campaigns WHERE id = ?",
      args: [body.id],
    });

    const campaign = result.rows[0];

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    console.log(`[API] Updated campaign: ${body.title}`);

    // Track Dropbox files for persistence
    await Promise.all([
      trackDropboxFile(body.coverImageUrl, body.id, "coverImageUrl"),
      trackDropboxFile(body.bannerImageUrl, body.id, "bannerImageUrl"),
      trackDropboxFile(body.downloadFileUrl, body.id, "downloadFileUrl"),
      trackDropboxFile(body.previewAudioUrl, body.id, "previewAudioUrl"),
    ]);

    return NextResponse.json({
      success: true,
      data: campaign,
    });
  } catch (error: any) {
    console.error("[API] Error updating campaign:", error);
    return NextResponse.json(
      { success: false, error: `Failed to update campaign: ${error?.message}` },
      { status: 500 }
    );
  }
}

// DELETE - Delete a campaign
export async function DELETE(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Campaign ID is required" },
        { status: 400 }
      );
    }

    await db.delete(campaigns).where(eq(campaigns.id, id));

    console.log(`[API] Deleted campaign: ${id}`);

    return NextResponse.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    console.error("[API] Error deleting campaign:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
