// ===========================================
// MAILCHIMP CAMPAIGN DETAIL API
// ===========================================

import { NextRequest, NextResponse } from "next/server";
import { mailchimpClient } from "@/lib/clients/mailchimp";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!(await mailchimpClient.isConfiguredAsync())) {
      return NextResponse.json(
        { success: false, error: "Mailchimp not configured" },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const detail = searchParams.get("detail");

    // Get campaign report
    if (detail === "report") {
      const report = await mailchimpClient.getCampaignReport(id);
      return NextResponse.json({ success: true, data: report });
    }

    // Get campaign content
    if (detail === "content") {
      const content = await mailchimpClient.getCampaignContent(id);
      return NextResponse.json({ success: true, data: content });
    }

    // Get campaign details (default)
    const campaign = await mailchimpClient.getCampaignDetails(id);
    return NextResponse.json({ success: true, data: campaign });
  } catch (error) {
    console.error("[Mailchimp Campaign API] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!(await mailchimpClient.isConfiguredAsync())) {
      return NextResponse.json(
        { success: false, error: "Mailchimp not configured" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === "send") {
      await mailchimpClient.sendCampaign(id);
      return NextResponse.json({ success: true, data: { status: "sent" } });
    }

    if (action === "schedule") {
      const { scheduleTime } = body;
      if (!scheduleTime) {
        return NextResponse.json(
          { success: false, error: "scheduleTime is required" },
          { status: 400 }
        );
      }
      await mailchimpClient.scheduleCampaign(id, new Date(scheduleTime));
      return NextResponse.json({ success: true, data: { status: "scheduled" } });
    }

    if (action === "unschedule") {
      await mailchimpClient.unscheduleCampaign(id);
      return NextResponse.json({ success: true, data: { status: "save" } });
    }

    if (action === "replicate") {
      const newCampaign = await mailchimpClient.replicateCampaign(id);
      return NextResponse.json({ success: true, data: { campaignId: newCampaign.id } });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use: send, schedule, unschedule, replicate" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Mailchimp Campaign API] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!(await mailchimpClient.isConfiguredAsync())) {
      return NextResponse.json(
        { success: false, error: "Mailchimp not configured" },
        { status: 400 }
      );
    }

    await mailchimpClient.deleteCampaign(id);
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("[Mailchimp Campaign API] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
