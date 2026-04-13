// ===========================================
// MAILCHIMP CONNECTION TEST ENDPOINT
// ===========================================

import { NextResponse } from "next/server";
import { mailchimpClient } from "@/lib/clients/mailchimp";

export async function GET() {
  try {
    // First check if credentials are configured
    const configStatus = mailchimpClient.getConfigStatus();

    if (!configStatus.configured) {
      return NextResponse.json(
        {
          success: false,
          error: "Mailchimp credentials not configured",
          details: {
            hasApiKey: configStatus.hasApiKey,
            hasPrefix: configStatus.hasPrefix,
            hasAudienceId: configStatus.hasAudienceId,
          },
          message: "Please set MAILCHIMP_API_KEY, MAILCHIMP_SERVER_PREFIX, and MAILCHIMP_AUDIENCE_ID environment variables.",
        },
        { status: 500 }
      );
    }

    // Test the connection
    const result = await mailchimpClient.testConnection();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Mailchimp connection successful!",
        audience: {
          name: result.audienceName,
          memberCount: result.memberCount,
        },
        configStatus: {
          hasApiKey: true,
          hasPrefix: true,
          hasAudienceId: true,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: "Failed to connect to Mailchimp. Please check your credentials.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Mailchimp Test] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "An unexpected error occurred while testing Mailchimp connection.",
      },
      { status: 500 }
    );
  }
}
