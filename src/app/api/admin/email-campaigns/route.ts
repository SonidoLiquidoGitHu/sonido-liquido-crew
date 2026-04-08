// ===========================================
// EMAIL CAMPAIGNS API
// ===========================================

import { NextRequest, NextResponse } from "next/server";
import { mailchimpClient } from "@/lib/clients/mailchimp";
import { db } from "@/db/client";
import { emailMarketingCampaigns } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const releaseId = searchParams.get("releaseId");

    let query = db.select().from(emailMarketingCampaigns);

    if (releaseId) {
      query = query.where(eq(emailMarketingCampaigns.releaseId, releaseId)) as typeof query;
    }

    const campaigns = await query.orderBy(desc(emailMarketingCampaigns.createdAt));

    return NextResponse.json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    console.error("[Email Campaigns API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error fetching campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      subject,
      preheader,
      body: emailBody,
      templateType,
      releaseId,
      scheduledFor,
      releaseData,
    } = body;

    // Validate required fields
    if (!name || !subject || !emailBody || !templateType) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if Mailchimp is configured
    if (!mailchimpClient.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Mailchimp not configured. Set MAILCHIMP_API_KEY, MAILCHIMP_SERVER_PREFIX, and MAILCHIMP_AUDIENCE_ID.",
        },
        { status: 400 }
      );
    }

    // Generate HTML content
    const htmlContent = mailchimpClient.generateEmailHTML({
      title: releaseData?.title || name,
      artistName: releaseData?.artistName || "Sonido Líquido Crew",
      releaseDate: releaseData?.releaseDate
        ? new Date(releaseData.releaseDate).toLocaleDateString("es-MX", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "Próximamente",
      presaveUrl: releaseData?.presaveUrl || "https://sonidoliquido.com",
      coverImageUrl: releaseData?.coverImageUrl,
      body: emailBody,
    });

    // Create and send/schedule campaign via Mailchimp
    const scheduleTime = scheduledFor ? new Date(scheduledFor) : undefined;
    const shouldSchedule = scheduleTime && scheduleTime > new Date();

    const result = await mailchimpClient.createAndSendCampaign({
      subject,
      previewText: preheader,
      title: name,
      htmlContent,
      scheduleTime: shouldSchedule ? scheduleTime : undefined,
    });

    // Save to database
    const [campaign] = await db
      .insert(emailMarketingCampaigns)
      .values({
        name,
        subject,
        preheader,
        body: emailBody,
        templateType,
        releaseId,
        mailchimpCampaignId: result.campaignId,
        status: result.status === "scheduled" ? "scheduled" : "sent",
        scheduledFor: shouldSchedule ? scheduleTime!.toISOString() : null,
        sentAt: result.status === "sent" ? new Date().toISOString() : null,
      })
      .returning();

    // Get recipient count from Mailchimp
    const audience = await mailchimpClient.getAudience();
    await db
      .update(emailMarketingCampaigns)
      .set({ recipientCount: audience.stats.member_count })
      .where(eq(emailMarketingCampaigns.id, campaign.id));

    return NextResponse.json({
      success: true,
      data: {
        campaign,
        mailchimpCampaignId: result.campaignId,
        status: result.status,
        recipientCount: audience.stats.member_count,
      },
    });
  } catch (error) {
    console.error("[Email Campaigns API] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Test Mailchimp connection
export async function OPTIONS() {
  try {
    const result = await mailchimpClient.testConnection();

    return NextResponse.json({
      success: result.success,
      data: {
        configured: mailchimpClient.isConfigured(),
        configStatus: mailchimpClient.getConfigStatus(),
        audienceName: result.audienceName,
        memberCount: result.memberCount,
      },
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
