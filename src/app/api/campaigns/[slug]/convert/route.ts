import { NextRequest, NextResponse } from "next/server";
import { getClient, initializeDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    await initializeDatabase();
    const client = await getClient();

    // Get the campaign
    const campaignResult = await client.execute({
      sql: "SELECT * FROM campaigns WHERE slug = ? LIMIT 1",
      args: [slug],
    });

    if (campaignResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    const campaign = campaignResult.rows[0];

    if (!campaign.is_active) {
      return NextResponse.json(
        { success: false, error: "Campaign is not active" },
        { status: 410 }
      );
    }

    // Get request metadata
    const ipAddress = request.headers.get("x-forwarded-for") ||
                      request.headers.get("x-real-ip") ||
                      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const referrer = request.headers.get("referer") || null;

    // Try to create campaign_actions table if it doesn't exist
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS campaign_actions (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL,
          email TEXT,
          spotify_user_id TEXT,
          completed_presave INTEGER DEFAULT 0,
          completed_follow INTEGER DEFAULT 0,
          completed_download INTEGER DEFAULT 0,
          ip_address TEXT,
          user_agent TEXT,
          referrer TEXT,
          presaved_at TEXT,
          followed_at TEXT,
          downloaded_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (tableError) {
      // Table might already exist, continue
    }

    // Record the conversion action
    const actionId = generateId();
    const now = new Date().toISOString();

    try {
      await client.execute({
        sql: `INSERT INTO campaign_actions 
              (id, campaign_id, email, spotify_user_id, completed_presave, completed_follow, completed_download, ip_address, user_agent, referrer, presaved_at, followed_at, created_at)
              VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
        args: [
          actionId,
          campaign.id as string,
          body.email || null,
          body.spotifyUserId || null,
          body.completedPresave ? 1 : 0,
          body.completedFollow ? 1 : 0,
          ipAddress,
          userAgent,
          referrer,
          body.completedPresave ? now : null,
          body.completedFollow ? now : null,
          now,
        ],
      });
    } catch (insertError) {
      console.error("[API] Error inserting campaign action:", insertError);
      // Continue anyway - we still want to update the conversion count
    }

    // Update conversion count - THIS IS THE CRITICAL PART
    try {
      await client.execute({
        sql: "UPDATE campaigns SET total_conversions = COALESCE(total_conversions, 0) + 1, updated_at = ? WHERE id = ?",
        args: [now, campaign.id as string],
      });
      console.log(`[API] Campaign conversion recorded: ${campaign.title} - conversions incremented`);
    } catch (updateError) {
      console.error("[API] Error updating conversion count:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update conversion count" },
        { status: 500 }
      );
    }

    console.log(`[API] Campaign conversion: ${campaign.title} - ${body.email || "anonymous"}`);

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl: campaign.download_file_url,
        downloadFileName: campaign.download_file_name,
      },
    });
  } catch (error) {
    console.error("[API] Error processing campaign conversion:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process conversion" },
      { status: 500 }
    );
  }
}
