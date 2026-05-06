import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

const SETTINGS_KEY = "community_email_settings";

interface EmailSettings {
  sendApprovalEmail: boolean;
  emailSubject: string;
  emailMessage: string;
  includeReward: boolean;
  rewardTitle: string;
  rewardDescription: string;
  rewardDownloadUrl: string;
  rewardFileName: string;
}

const defaultSettings: EmailSettings = {
  sendApprovalEmail: true,
  emailSubject: "¡Tu mensaje ha sido publicado en Sonido Líquido!",
  emailMessage: "Gracias por formar parte de nuestra comunidad. Tu mensaje ya está visible en el Fan Wall.",
  includeReward: false,
  rewardTitle: "Regalo sorpresa",
  rewardDescription: "Como agradecimiento, aquí tienes una descarga exclusiva:",
  rewardDownloadUrl: "",
  rewardFileName: "",
};

// GET - Fetch email settings
export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: true, data: defaultSettings });
    }

    const [setting] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, SETTINGS_KEY))
      .limit(1);

    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        return NextResponse.json({
          success: true,
          data: { ...defaultSettings, ...parsed },
        });
      } catch {
        return NextResponse.json({ success: true, data: defaultSettings });
      }
    }

    return NextResponse.json({ success: true, data: defaultSettings });
  } catch (error) {
    console.error("[Community Email Settings] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error loading settings" },
      { status: 500 }
    );
  }
}

// POST - Save email settings
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const settings: EmailSettings = {
      sendApprovalEmail: body.sendApprovalEmail ?? defaultSettings.sendApprovalEmail,
      emailSubject: body.emailSubject || defaultSettings.emailSubject,
      emailMessage: body.emailMessage || defaultSettings.emailMessage,
      includeReward: body.includeReward ?? defaultSettings.includeReward,
      rewardTitle: body.rewardTitle || defaultSettings.rewardTitle,
      rewardDescription: body.rewardDescription || defaultSettings.rewardDescription,
      rewardDownloadUrl: body.rewardDownloadUrl || "",
      rewardFileName: body.rewardFileName || "",
    };

    // Check if exists
    const [existing] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, SETTINGS_KEY))
      .limit(1);

    if (existing) {
      await db
        .update(siteSettings)
        .set({
          value: JSON.stringify(settings),
          updatedAt: new Date(),
        })
        .where(eq(siteSettings.key, SETTINGS_KEY));
    } else {
      await db.insert(siteSettings).values({
        id: generateUUID(),
        key: SETTINGS_KEY,
        value: JSON.stringify(settings),
        type: "json",
        description: "Community email notification settings",
      });
    }

    console.log("[Community Email Settings] Saved settings");
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("[Community Email Settings] Error saving:", error);
    return NextResponse.json(
      { success: false, error: "Error saving settings" },
      { status: 500 }
    );
  }
}
