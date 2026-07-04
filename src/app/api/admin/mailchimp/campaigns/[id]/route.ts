// ===========================================
// MAILCHIMP CAMPAIGN DETAIL API
// ===========================================

import { mailchimpClient } from "@/lib/clients/mailchimp";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!(await mailchimpClient.isConfiguredAsync())) {
      return NextResponse.json(
        { success: false, error: "Mailchimp not configured" },
        { status: 400 },
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
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!(await mailchimpClient.isConfiguredAsync())) {
      return NextResponse.json(
        { success: false, error: "Mailchimp not configured" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === "send") {
      // Check campaign status before sending to avoid "currently sending" errors
      try {
        const details = await mailchimpClient.getCampaignDetails(id);
        if (details.status === "sending") {
          return NextResponse.json(
            {
              success: false,
              error: `La campana ya se esta enviando. Usa "Cancelar envio" para detenerla y luego duplica la campana para reintentar.`,
              data: { status: details.status },
            },
            { status: 400 },
          );
        }
        if (details.status === "sent") {
          return NextResponse.json(
            {
              success: false,
              error:
                "Esta campana ya fue enviada. Duplica la campana para crear una nueva copia.",
              data: { status: details.status },
            },
            { status: 400 },
          );
        }
      } catch {
        // If we can't check status, proceed with send attempt
      }
      await mailchimpClient.sendCampaign(id);
      return NextResponse.json({ success: true, data: { status: "sent" } });
    }

    if (action === "cancel") {
      await mailchimpClient.cancelCampaign(id);
      return NextResponse.json({
        success: true,
        data: { status: "cancelled" },
      });
    }

    if (action === "schedule") {
      const { scheduleTime } = body;
      if (!scheduleTime) {
        return NextResponse.json(
          { success: false, error: "scheduleTime is required" },
          { status: 400 },
        );
      }
      await mailchimpClient.scheduleCampaign(id, new Date(scheduleTime));
      return NextResponse.json({
        success: true,
        data: { status: "scheduled" },
      });
    }

    if (action === "unschedule") {
      await mailchimpClient.unscheduleCampaign(id);
      return NextResponse.json({ success: true, data: { status: "save" } });
    }

    if (action === "replicate") {
      const newCampaign = await mailchimpClient.replicateCampaign(id);
      return NextResponse.json({
        success: true,
        data: { campaignId: newCampaign.id },
      });
    }

    if (action === "update") {
      const {
        subject,
        previewText,
        title,
        body: emailBody,
        ctaText,
        ctaUrl,
        coverImageUrl,
        styleSettings,
      } = body;

      // Update settings if any settings fields provided
      if (subject || title || previewText) {
        await mailchimpClient.updateCampaignSettings(id, {
          subject_line: subject,
          preview_text: previewText,
          title,
        });
      }

      // Update content if body provided
      if (emailBody) {
        const htmlContent = mailchimpClient.generateCustomEmailHTML({
          title: title || subject,
          body: emailBody,
          ctaText: ctaText || undefined,
          ctaUrl: ctaUrl || undefined,
          coverImageUrl: coverImageUrl || undefined,
          styleSettings: styleSettings || undefined,
        });
        await mailchimpClient.setCampaignContent(id, htmlContent);
      }

      return NextResponse.json({
        success: true,
        data: { campaignId: id, status: "updated" },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Invalid action. Use: send, cancel, schedule, unschedule, replicate, update",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("[Mailchimp Campaign API] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!(await mailchimpClient.isConfiguredAsync())) {
      return NextResponse.json(
        { success: false, error: "Mailchimp not configured" },
        { status: 400 },
      );
    }

    await mailchimpClient.deleteCampaign(id);
    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    console.error("[Mailchimp Campaign API] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
