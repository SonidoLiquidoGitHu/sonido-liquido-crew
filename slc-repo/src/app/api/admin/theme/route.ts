import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateUUID } from "@/lib/utils";

export const dynamic = "force-dynamic";

const THEME_SETTING_KEY = "site_theme";

// GET - Get current theme settings
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "Database not configured, using default theme",
      });
    }

    const [setting] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, THEME_SETTING_KEY))
      .limit(1);

    if (!setting) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No theme set, using default",
      });
    }

    const themeData = setting.value ? JSON.parse(setting.value) : null;

    return NextResponse.json({
      success: true,
      data: themeData,
    });
  } catch (error) {
    console.error("[Theme API] Error fetching theme:", error);
    return NextResponse.json(
      { success: false, error: "Error fetching theme" },
      { status: 500 }
    );
  }
}

// POST - Save theme settings
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { themeId, customColors, customFonts, customStyle, isCustom } = body;

    const themeData = {
      themeId: themeId || "hip-hop-classic",
      customColors: customColors || null,
      customFonts: customFonts || null,
      customStyle: customStyle || null,
      isCustom: isCustom || false,
      updatedAt: new Date().toISOString(),
    };

    // Check if setting exists
    const [existing] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, THEME_SETTING_KEY))
      .limit(1);

    if (existing) {
      // Update existing
      await db
        .update(siteSettings)
        .set({
          value: JSON.stringify(themeData),
          updatedAt: new Date(),
        })
        .where(eq(siteSettings.key, THEME_SETTING_KEY));
    } else {
      // Insert new
      await db.insert(siteSettings).values({
        id: generateUUID(),
        key: THEME_SETTING_KEY,
        value: JSON.stringify(themeData),
        type: "json",
        description: "Site theme configuration",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Theme saved successfully",
      data: themeData,
    });
  } catch (error) {
    console.error("[Theme API] Error saving theme:", error);
    return NextResponse.json(
      { success: false, error: "Error saving theme" },
      { status: 500 }
    );
  }
}
