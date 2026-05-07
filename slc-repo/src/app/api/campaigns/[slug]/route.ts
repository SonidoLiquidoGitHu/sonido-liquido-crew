import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { campaigns, artists } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    // Get campaign with artist name
    const result = await db
      .select({
        campaign: campaigns,
        artistName: artists.name,
      })
      .from(campaigns)
      .leftJoin(artists, eq(campaigns.artistId, artists.id))
      .where(eq(campaigns.slug, slug))
      .limit(1);

    if (!result.length || !result[0].campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    const { campaign, artistName } = result[0];

    // Increment view count
    await db
      .update(campaigns)
      .set({
        totalViews: sql`${campaigns.totalViews} + 1`,
      })
      .where(eq(campaigns.id, campaign.id));

    console.log(`[API] Campaign viewed: ${campaign.title}`);

    return NextResponse.json({
      success: true,
      data: {
        ...campaign,
        artistName,
      },
    });
  } catch (error) {
    console.error("[API] Error fetching campaign:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}
