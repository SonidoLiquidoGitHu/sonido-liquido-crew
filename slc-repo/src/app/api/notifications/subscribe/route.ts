import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { pushSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { subscription, type } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { success: false, error: "Invalid subscription" },
        { status: 400 }
      );
    }

    // Get user agent
    const userAgent = request.headers.get("user-agent") || undefined;

    // Check if subscription already exists
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      .limit(1);

    if (existing.length > 0) {
      // Update existing subscription
      await db
        .update(pushSubscriptions)
        .set({
          keysP256dh: subscription.keys?.p256dh || existing[0].keysP256dh,
          keysAuth: subscription.keys?.auth || existing[0].keysAuth,
          userAgent,
          lastUsedAt: new Date().toISOString(),
        })
        .where(eq(pushSubscriptions.id, existing[0].id));

      return NextResponse.json({
        success: true,
        message: "Subscription updated",
        id: existing[0].id,
      });
    }

    // Create new subscription
    const result = await db.insert(pushSubscriptions).values({
      endpoint: subscription.endpoint,
      keysP256dh: subscription.keys?.p256dh || "",
      keysAuth: subscription.keys?.auth || "",
      userAgent,
    }).returning({ id: pushSubscriptions.id });

    return NextResponse.json({
      success: true,
      message: "Subscription created",
      id: result[0]?.id,
    });
  } catch (error) {
    console.error("[Notifications Subscribe] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "Endpoint required" },
        { status: 400 }
      );
    }

    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));

    return NextResponse.json({
      success: true,
      message: "Unsubscribed successfully",
    });
  } catch (error) {
    console.error("[Notifications Unsubscribe] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to unsubscribe" },
      { status: 500 }
    );
  }
}
