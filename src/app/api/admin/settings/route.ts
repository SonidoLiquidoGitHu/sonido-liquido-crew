/**
 * Settings API — GET (all settings) / POST (upsert setting)
 * Uses key-value store in the Setting model.
 */
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const settings = await db.setting.findMany();
    const mapped: Record<string, string> = {};
    for (const s of settings) {
      mapped[s.key] = s.value;
    }
    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json({}, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value } = body as { key: string; value: string };

    if (!key || value === undefined) {
      return NextResponse.json({ error: "key and value are required" }, { status: 400 });
    }

    const setting = await db.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json(setting);
  } catch (error) {
    console.error("Failed to save setting:", error);
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 });
  }
}
