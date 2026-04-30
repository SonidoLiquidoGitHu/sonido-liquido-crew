import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { pushSubscriptions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET - List all subscriptions
export async function GET(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .orderBy(desc(pushSubscriptions.createdAt));

    return NextResponse.json({
      success: true,
      data: subscriptions,
      count: subscriptions.length,
    });
  } catch (error) {
    console.error("[Admin Subscriptions] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a subscription
export async function DELETE(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Subscription ID required" },
        { status: 400 }
      );
    }

    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));

    return NextResponse.json({
      success: true,
      message: "Subscription deleted",
    });
  } catch (error) {
    console.error("[Admin Subscriptions Delete] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete subscription" },
      { status: 500 }
    );
  }
}
