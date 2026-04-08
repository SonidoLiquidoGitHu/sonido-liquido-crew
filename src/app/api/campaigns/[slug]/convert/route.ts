import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { campaigns, campaignActions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    // Get the campaign
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.slug, slug))
      .limit(1);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (!campaign.isActive) {
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

    // Record the conversion
    await db.insert(campaignActions).values({
      id: generateUUID(),
      campaignId: campaign.id,
      email: body.email || null,
      spotifyUserId: body.spotifyUserId || null,
      completedPresave: body.completedPresave || false,
      completedFollow: body.completedFollow || false,
      completedDownload: false,
      ipAddress,
      userAgent,
      referrer,
      presavedAt: body.completedPresave ? new Date() : null,
      followedAt: body.completedFollow ? new Date() : null,
    });

    // Update conversion count
    await db
      .update(campaigns)
      .set({
        totalConversions: sql`${campaigns.totalConversions} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaign.id));

    console.log(`[API] Campaign conversion: ${campaign.title} - ${body.email || "anonymous"}`);

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl: campaign.downloadFileUrl,
        downloadFileName: campaign.downloadFileName,
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
