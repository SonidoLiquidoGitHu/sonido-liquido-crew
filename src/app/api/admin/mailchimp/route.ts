// ===========================================
// MAILCHIMP STUDIO API
// ===========================================

import { NextRequest, NextResponse } from "next/server";
import { mailchimpClient } from "@/lib/clients/mailchimp";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    // Check config status
    if (action === "config") {
      return NextResponse.json({
        success: true,
        data: {
          configured: mailchimpClient.isConfigured(),
          configStatus: mailchimpClient.getConfigStatus(),
        },
      });
    }

    // Test connection
    if (action === "test") {
      const result = await mailchimpClient.testConnection();
      return NextResponse.json({ success: result.success, data: result, error: result.error });
    }

    // Get audience info
    if (action === "audience") {
      if (!mailchimpClient.isConfigured()) {
        return NextResponse.json(
          { success: false, error: "Mailchimp not configured" },
          { status: 400 }
        );
      }
      const audience = await mailchimpClient.getAudience();
      const growthHistory = await mailchimpClient.getGrowthHistory().catch(() => ({ history: [] }));
      const activity = await mailchimpClient.getActivity().catch(() => ({ activity: [] }));
      const tags = await mailchimpClient.getTags().catch(() => ({ tags: [], total_items: 0 }));
      const segments = await mailchimpClient.getSegments().catch(() => ({ segments: [], total_items: 0 }));

      return NextResponse.json({
        success: true,
        data: {
          audience,
          growthHistory: growthHistory.history,
          activity: activity.activity,
          tags: tags.tags,
          segments: segments.segments,
        },
      });
    }

    // Get campaigns
    if (action === "campaigns") {
      if (!mailchimpClient.isConfigured()) {
        return NextResponse.json(
          { success: false, error: "Mailchimp not configured" },
          { status: 400 }
        );
      }
      const status = searchParams.get("status") || undefined;
      const count = parseInt(searchParams.get("count") || "20");
      const result = await mailchimpClient.getCampaigns({ status, count });

      return NextResponse.json({
        success: true,
        data: {
          campaigns: result.campaigns,
          totalItems: result.total_items,
        },
      });
    }

    // Get subscribers
    if (action === "subscribers") {
      if (!mailchimpClient.isConfigured()) {
        return NextResponse.json(
          { success: false, error: "Mailchimp not configured" },
          { status: 400 }
        );
      }
      const count = parseInt(searchParams.get("count") || "50");
      const offset = parseInt(searchParams.get("offset") || "0");
      const status = searchParams.get("status") || undefined;
      const result = await mailchimpClient.getSubscribers({ count, offset, status });

      return NextResponse.json({
        success: true,
        data: {
          members: result.members,
          totalItems: result.total_items,
        },
      });
    }

    // Default: return config status
    return NextResponse.json({
      success: true,
      data: {
        configured: mailchimpClient.isConfigured(),
        configStatus: mailchimpClient.getConfigStatus(),
      },
    });
  } catch (error) {
    console.error("[Mailchimp API] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!mailchimpClient.isConfigured()) {
      return NextResponse.json(
        { success: false, error: "Mailchimp not configured. Set MAILCHIMP_API_KEY, MAILCHIMP_SERVER_PREFIX, and MAILCHIMP_AUDIENCE_ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action } = body;

    // Create and send/schedule a campaign
    if (action === "create-campaign") {
      const { subject, previewText, title, body: emailBody, ctaText, ctaUrl, coverImageUrl, scheduleTime, tags } = body;

      if (!subject || !title || !emailBody) {
        return NextResponse.json(
          { success: false, error: "Subject, title, and body are required" },
          { status: 400 }
        );
      }

      // Generate HTML content using the custom template
      const htmlContent = mailchimpClient.generateCustomEmailHTML({
        title,
        body: emailBody,
        ctaText: ctaText || undefined,
        ctaUrl: ctaUrl || undefined,
        coverImageUrl: coverImageUrl || undefined,
      });

      // Create and send/schedule
      const scheduleDate = scheduleTime ? new Date(scheduleTime) : undefined;
      const shouldSchedule = scheduleDate && scheduleDate > new Date();

      const result = await mailchimpClient.createAndSendCampaign({
        subject,
        previewText: previewText || "",
        title,
        htmlContent,
        tags: tags || undefined,
        scheduleTime: shouldSchedule ? scheduleDate : undefined,
      });

      return NextResponse.json({
        success: true,
        data: {
          campaignId: result.campaignId,
          status: result.status,
          scheduledFor: shouldSchedule ? scheduleDate?.toISOString() : null,
        },
      });
    }

    // Create a draft campaign (don't send)
    if (action === "create-draft") {
      const { subject, previewText, title, body: emailBody, ctaText, ctaUrl, coverImageUrl, tags } = body;

      if (!subject || !title || !emailBody) {
        return NextResponse.json(
          { success: false, error: "Subject, title, and body are required" },
          { status: 400 }
        );
      }

      const htmlContent = mailchimpClient.generateCustomEmailHTML({
        title,
        body: emailBody,
        ctaText: ctaText || undefined,
        ctaUrl: ctaUrl || undefined,
        coverImageUrl: coverImageUrl || undefined,
      });

      // Create campaign only (don't send)
      const campaign = await mailchimpClient.createCampaign({
        subject,
        previewText: previewText || "",
        title,
        tags: tags || undefined,
      });

      // Set content
      await mailchimpClient.setCampaignContent(campaign.id, htmlContent);

      return NextResponse.json({
        success: true,
        data: {
          campaignId: campaign.id,
          status: "draft",
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'create-campaign' or 'create-draft'." },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Mailchimp API] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
