// ===========================================
// PUSH NOTIFICATION SUBSCRIPTION API
// ===========================================

import { NextRequest, NextResponse } from "next/server";
import { pushNotificationService } from "@/lib/services/push-notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, userAgent } = body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { success: false, error: "Invalid subscription data" },
        { status: 400 }
      );
    }

    const subscriptionId = await pushNotificationService.saveSubscription(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      userAgent
    );

    return NextResponse.json({
      success: true,
      data: { subscriptionId },
    });
  } catch (error) {
    console.error("[Push Subscribe] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "Endpoint required" },
        { status: 400 }
      );
    }

    await pushNotificationService.removeSubscription(endpoint);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Push Unsubscribe] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Get VAPID public key for client
export async function GET() {
  const publicKey = pushNotificationService.getPublicKey();
  const isConfigured = pushNotificationService.isConfigured();
  const subscriberCount = await pushNotificationService.getSubscriberCount();

  return NextResponse.json({
    success: true,
    data: {
      publicKey,
      isConfigured,
      subscriberCount,
    },
  });
}
