/**
 * Campaigns API — GET (list) / POST (create)
 */
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const campaigns = await db.campaign.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, subject, body: emailBody, targetList, scheduledAt } = body as {
      name: string;
      subject: string;
      body: string;
      targetList?: string;
      scheduledAt?: string;
    };

    if (!name || !subject || !emailBody) {
      return NextResponse.json({ error: "name, subject, and body are required" }, { status: 400 });
    }

    const campaign = await db.campaign.create({
      data: {
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        subject,
        body: emailBody,
        targetList,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        status: scheduledAt ? "scheduled" : "draft",
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("Failed to create campaign:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
