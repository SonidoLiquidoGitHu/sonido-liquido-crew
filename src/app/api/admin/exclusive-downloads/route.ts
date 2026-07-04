import { db } from "@/db/client";
import { siteSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// ===========================================
// GET - List exclusive downloads
// ===========================================
export async function GET() {
  try {
    const setting = await db.query.siteSettings.findFirst({
      where: (s, { eq }) => eq(s.key, "exclusive_downloads"),
    });

    if (!setting || !setting.value) {
      return NextResponse.json({ success: true, data: [] });
    }

    const downloads = JSON.parse(setting.value);
    return NextResponse.json({ success: true, data: downloads });
  } catch (error) {
    console.error("Error fetching exclusive downloads:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch downloads" },
      { status: 500 },
    );
  }
}

// ===========================================
// POST - Save exclusive downloads list
// ===========================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { downloads } = body;

    if (!Array.isArray(downloads)) {
      return NextResponse.json(
        { success: false, error: "Downloads must be an array" },
        { status: 400 },
      );
    }

    // Upsert the setting
    const existing = await db.query.siteSettings.findFirst({
      where: (s, { eq }) => eq(s.key, "exclusive_downloads"),
    });

    if (existing) {
      await db
        .update(siteSettings)
        .set({ value: JSON.stringify(downloads), updatedAt: new Date() })
        .where(eq(siteSettings.key, "exclusive_downloads"));
    } else {
      await db.insert(siteSettings).values({
        id: crypto.randomUUID(),
        key: "exclusive_downloads",
        value: JSON.stringify(downloads),
        type: "json",
        description: "Exclusive download files for subscribers",
      });
    }

    return NextResponse.json({ success: true, data: downloads });
  } catch (error) {
    console.error("Error saving exclusive downloads:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save downloads" },
      { status: 500 },
    );
  }
}
