// ===========================================
// A/B TEST TRACKING API (PUBLIC)
// ===========================================

import { NextRequest, NextResponse } from "next/server";
import { abTestingService } from "@/lib/services/ab-testing";

// Get active test and assigned variant
export async function GET() {
  try {
    const activeTest = await abTestingService.getActiveVideoTest();

    if (!activeTest) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Assign a random variant based on weights
    const variant = abTestingService.getRandomVariant(activeTest.variants);

    return NextResponse.json({
      success: true,
      data: {
        testId: activeTest.id,
        variantId: variant.id,
        variantKey: variant.key,
        variantName: variant.name,
      },
    });
  } catch (error) {
    console.error("[AB Track] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Record event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testId, variantId, eventType, sessionId, engagementTime, metadata } = body;

    if (!testId || !variantId || !eventType) {
      return NextResponse.json(
        { success: false, error: "testId, variantId, and eventType required" },
        { status: 400 }
      );
    }

    const validEvents = ["impression", "click", "conversion", "engagement"];
    if (!validEvents.includes(eventType)) {
      return NextResponse.json(
        { success: false, error: `eventType must be one of: ${validEvents.join(", ")}` },
        { status: 400 }
      );
    }

    await abTestingService.recordEvent(testId, variantId, eventType, {
      sessionId,
      userAgent: request.headers.get("user-agent") || undefined,
      engagementTime,
      additionalData: metadata,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AB Track] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
