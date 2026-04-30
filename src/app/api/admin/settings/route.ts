import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { generateUUID } from "@/lib/utils";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const settings = await db.query.siteSettings.findMany();

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Update or insert each setting
    for (const [key, value] of Object.entries(body)) {
      // Skip undefined values
      if (value === undefined) continue;

      // Check if setting exists
      const existing = await db.query.siteSettings.findFirst({
        where: (s, { eq }) => eq(s.key, key),
      });

      const stringValue = typeof value === "boolean" ? String(value) : String(value);
      const settingType = typeof value === "boolean" ? "boolean" :
                         typeof value === "number" ? "number" : "string";

      if (existing) {
        await db.update(siteSettings)
          .set({
            value: stringValue,
            type: settingType as "string" | "number" | "boolean" | "json",
            updatedAt: new Date(),
          })
          .where(eq(siteSettings.key, key));
      } else {
        await db.insert(siteSettings).values({
          id: generateUUID(),
          key,
          value: stringValue,
          type: settingType as "string" | "number" | "boolean" | "json",
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save settings" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { success: false, error: "Missing setting key" },
        { status: 400 }
      );
    }

    await db.delete(siteSettings).where(eq(siteSettings.key, key));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete setting:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete setting" },
      { status: 500 }
    );
  }
}
