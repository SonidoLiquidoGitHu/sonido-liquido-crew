import { db } from "@/db/client";
import { subscribers } from "@/db/schema";
import { siteSettings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

// ===========================================
// POST - Verify if email is an active subscriber
// ===========================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    // Check if subscriber exists and is active
    const subscriber = await db.query.subscribers.findFirst({
      where: (s, { eq, and }) =>
        and(eq(s.email, email.toLowerCase().trim()), eq(s.isActive, true)),
    });

    const verified = !!subscriber;

    // biome-ignore lint/suspicious/noExplicitAny: dynamic type
    let downloads: any[] = [];
    if (verified) {
      // Fetch exclusive downloads
      try {
        const setting = await db.query.siteSettings.findFirst({
          where: (s, { eq }) => eq(s.key, "exclusive_downloads"),
        });

        if (setting?.value) {
          const allDownloads = JSON.parse(setting.value);
          // Only return active downloads
          // biome-ignore lint/suspicious/noExplicitAny: dynamic type
          downloads = allDownloads.filter((d: any) => d.isActive !== false);
        }
      } catch (e) {
        console.error("Error fetching downloads for verified subscriber:", e);
      }
    }

    return NextResponse.json({
      success: true,
      verified,
      downloads,
    });
  } catch (error) {
    console.error("Error verifying subscriber:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify" },
      { status: 500 },
    );
  }
}
