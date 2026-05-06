import { NextRequest, NextResponse } from "next/server";
import { subscribersService } from "@/lib/services";
import { subscribeSchema } from "@/lib/validations";
import { db } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email, name, source } = parsed.data;

    // Subscribe
    const subscriber = await subscribersService.subscribe(
      email,
      name || undefined,
      source || "website"
    );

    // Fetch download file settings to return on successful subscription
    let downloadFile: { url: string; name: string; buttonText: string; description: string } | null = null;
    try {
      const setting = await db.query.siteSettings.findFirst({
        where: (s, { eq }) => eq(s.key, "newsletter_popup_settings"),
      });

      if (setting && setting.value) {
        const popupSettings = JSON.parse(setting.value);
        if (popupSettings.downloadFileEnabled && popupSettings.downloadFileUrl) {
          downloadFile = {
            url: popupSettings.downloadFileUrl,
            name: popupSettings.downloadFileName || "Regalo exclusivo",
            buttonText: popupSettings.downloadButtonText || "Descargar Regalo",
            description: popupSettings.downloadDescription || "",
          };
        }
      }
    } catch (e) {
      // Non-critical — don't fail the subscription if this lookup fails
      console.error("Failed to fetch download file settings:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to newsletter",
      data: {
        email: subscriber.email,
        subscribedAt: subscriber.subscribedAt,
        downloadFile,
      },
    });
  } catch (error) {
    console.error("Error subscribing:", error);
    return NextResponse.json(
      { success: false, error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
