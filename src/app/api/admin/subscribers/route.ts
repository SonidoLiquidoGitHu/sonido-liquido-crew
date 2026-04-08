import { NextRequest, NextResponse } from "next/server";
import { subscribersRepository } from "@/lib/repositories";
import { mailchimpClient } from "@/lib/clients";

// GET - List all subscribers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const options: { isActive?: boolean; limit?: number; offset?: number } = {};

    if (isActive !== null) {
      options.isActive = isActive === "true";
    }
    if (limit) {
      options.limit = parseInt(limit, 10);
    }
    if (offset) {
      options.offset = parseInt(offset, 10);
    }

    const subscribers = await subscribersRepository.findAll(options);
    const totalCount = await subscribersRepository.count();
    const activeCount = await subscribersRepository.count(true);

    return NextResponse.json({
      success: true,
      data: subscribers,
      meta: {
        total: totalCount,
        active: activeCount,
        inactive: totalCount - activeCount,
      },
    });
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subscribers" },
      { status: 500 }
    );
  }
}

// DELETE - Unsubscribe or delete a subscriber
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, permanent } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    if (permanent) {
      // Permanently delete from database (implement if needed)
      // For now, just unsubscribe
      const subscriber = await subscribersRepository.unsubscribe(email);

      // Also unsubscribe from Mailchimp if configured
      if (mailchimpClient.isConfigured()) {
        try {
          await mailchimpClient.unsubscribe(email);
        } catch (mcError) {
          console.error("Failed to unsubscribe from Mailchimp:", mcError);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Subscriber removed",
        data: subscriber,
      });
    } else {
      // Soft unsubscribe
      const subscriber = await subscribersRepository.unsubscribe(email);

      if (mailchimpClient.isConfigured()) {
        try {
          await mailchimpClient.unsubscribe(email);
        } catch (mcError) {
          console.error("Failed to unsubscribe from Mailchimp:", mcError);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Subscriber unsubscribed",
        data: subscriber,
      });
    }
  } catch (error) {
    console.error("Error deleting subscriber:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete subscriber" },
      { status: 500 }
    );
  }
}
