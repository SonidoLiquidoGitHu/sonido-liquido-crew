// ===========================================
// A/B TESTING ADMIN API
// ===========================================

import { NextRequest, NextResponse } from "next/server";
import { abTestingService } from "@/lib/services/ab-testing";

// Get all tests or create new test
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testId = searchParams.get("testId");

    if (testId) {
      const results = await abTestingService.getTestResults(testId);
      const dailyStats = await abTestingService.getTestStatsByDay(testId, 30);

      return NextResponse.json({
        success: true,
        data: {
          results,
          dailyStats,
        },
      });
    }

    const tests = await abTestingService.getAllTests();
    const activeTest = await abTestingService.getActiveVideoTest();

    return NextResponse.json({
      success: true,
      data: {
        tests,
        activeTest,
      },
    });
  } catch (error) {
    console.error("[AB Tests API] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Create new A/B test
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, variants, testType } = body;

    if (!name || !variants || variants.length < 2) {
      return NextResponse.json(
        { success: false, error: "Name and at least 2 variants required" },
        { status: 400 }
      );
    }

    const testId = await abTestingService.createVideoTemplateTest(name, variants);

    return NextResponse.json({
      success: true,
      data: { testId },
    });
  } catch (error) {
    console.error("[AB Tests API] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Complete a test
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { testId, winnerVariantId, action } = body;

    if (!testId) {
      return NextResponse.json(
        { success: false, error: "Test ID required" },
        { status: 400 }
      );
    }

    if (action === "complete") {
      await abTestingService.completeTest(testId, winnerVariantId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AB Tests API] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
