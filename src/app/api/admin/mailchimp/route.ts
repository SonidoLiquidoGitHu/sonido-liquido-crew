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
      const configured = await mailchimpClient.isConfiguredAsync();
      return NextResponse.json({
        success: true,
        data: {
          configured,
          configStatus: mailchimpClient.getConfigStatus(),
        },
      });
    }

    // Test connection
    if (action === "test") {
      const configured = await mailchimpClient.isConfiguredAsync();
      if (!configured) {
        return NextResponse.json({
          success: false,
          data: { success: false, error: "Mailchimp not configured" },
        });
      }
      const result = await mailchimpClient.testConnection();
      return NextResponse.json({ success: result.success, data: result, error: result.error });
    }

    // Get audience info
    if (action === "audience") {
      const configured = await mailchimpClient.isConfiguredAsync();
      if (!configured) {
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
      const configured = await mailchimpClient.isConfiguredAsync();
      if (!configured) {
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
      const configured = await mailchimpClient.isConfiguredAsync();
      if (!configured) {
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
    const configured = await mailchimpClient.isConfiguredAsync();
    return NextResponse.json({
      success: true,
      data: {
        configured,
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
    const body = await request.json();
    const { action } = body;

    // Save Mailchimp credentials to database (no API key needed beforehand)
    if (action === "save-credentials") {
      const { apiKey, serverPrefix, audienceId } = body;

      if (!apiKey || !serverPrefix || !audienceId) {
        return NextResponse.json(
          { success: false, error: "API Key, Server Prefix, y Audience ID son requeridos" },
          { status: 400 }
        );
      }

      try {
        const { db, isDatabaseConfigured } = await import("@/db/client");
        const { siteSettings } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");
        const { generateUUID } = await import("@/lib/utils");

        if (!isDatabaseConfigured()) {
          return NextResponse.json(
            { success: false, error: "Database not configured" },
            { status: 500 }
          );
        }

        // Save each credential
        const credentials = [
          { key: "mailchimp_api_key", value: apiKey },
          { key: "mailchimp_server_prefix", value: serverPrefix },
          { key: "mailchimp_audience_id", value: audienceId },
        ];

        for (const cred of credentials) {
          const existing = await db
            .select({ id: siteSettings.id })
            .from(siteSettings)
            .where(eq(siteSettings.key, cred.key))
            .limit(1);

          if (existing.length > 0) {
            await db
              .update(siteSettings)
              .set({ value: cred.value, updatedAt: new Date() })
              .where(eq(siteSettings.key, cred.key));
          } else {
            await db.insert(siteSettings).values({
              id: generateUUID(),
              key: cred.key,
              value: cred.value,
              type: "string",
              description: `Mailchimp ${cred.key.replace("mailchimp_", "")}`,
            });
          }
        }

        // Clear the Mailchimp client cache so it picks up the new credentials
        mailchimpClient.clearCredentialCache();

        // Test the connection with the new credentials
        const testResult = await mailchimpClient.testConnection();

        return NextResponse.json({
          success: true,
          data: {
            saved: true,
            connectionTest: testResult,
          },
        });
      } catch (dbError) {
        console.error("[Mailchimp API] Error saving credentials:", dbError);
        return NextResponse.json(
          { success: false, error: `Error saving credentials: ${(dbError as Error).message}` },
          { status: 500 }
        );
      }
    }

    // All other actions require Mailchimp to be configured
    const isConfigured = await mailchimpClient.isConfiguredAsync();
    if (!isConfigured) {
      return NextResponse.json(
        { success: false, error: "Mailchimp not configured. Configúralas en Email Studio → Config." },
        { status: 400 }
      );
    }

    // Create and send/schedule a campaign
    if (action === "create-campaign") {
      const { subject, previewText, title, body: emailBody, ctaText, ctaUrl, coverImageUrl, scheduleTime, tags, styleSettings } = body;

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
        styleSettings: styleSettings || undefined,
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
      const { subject, previewText, title, body: emailBody, ctaText, ctaUrl, coverImageUrl, tags, styleSettings } = body;

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
        styleSettings: styleSettings || undefined,
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

      console.log(`[Mailchimp] Draft campaign created: id=${campaign.id}, web_id=${campaign.web_id}`);

      // Construct the Mailchimp campaign URL from web_id
      const campaignUrl = campaign.web_id
        ? `https://admin.mailchimp.com/campaigns/edit?id=${campaign.web_id}`
        : null;

      return NextResponse.json({
        success: true,
        data: {
          campaignId: campaign.id,
          webId: campaign.web_id,
          campaignUrl,
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
