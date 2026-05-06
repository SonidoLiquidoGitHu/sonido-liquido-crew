import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { pushSubscriptions, notificationHistory } from "@/db/schema";
import { eq } from "drizzle-orm";
import webpush from "web-push";

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:hello@sonidoliquido.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
}

async function sendPushNotification(
  subscription: { endpoint: string; keysP256dh: string; keysAuth: string },
  payload: NotificationPayload
): Promise<boolean> {
  if (!subscription.keysP256dh || !subscription.keysAuth) {
    return false;
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keysP256dh,
          auth: subscription.keysAuth,
        },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (error: unknown) {
    const err = error as { statusCode?: number };

    // If subscription is expired or invalid, delete it
    if (err.statusCode === 410 || err.statusCode === 404) {
      await db
        .delete(pushSubscriptions)
        .where(require("drizzle-orm").eq(pushSubscriptions.endpoint, subscription.endpoint));
    }
    return false;
  }
}

// POST - Send a manual notification to all subscribers
export async function POST(request: NextRequest) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 503 }
      );
    }

    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json(
        { success: false, error: "VAPID keys not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { title, body: message, url, releaseId } = body;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: "Title and body are required" },
        { status: 400 }
      );
    }

    // Get all active subscriptions
    const subscriptions = await db
      .select()
      .from(pushSubscriptions);

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active subscriptions",
        sent: 0,
      });
    }

    const payload: NotificationPayload = {
      title,
      body: message,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      url: url || "/",
      tag: releaseId ? `release-${releaseId}` : `manual-${Date.now()}`,
    };

    let sentCount = 0;
    let failedCount = 0;
    for (const sub of subscriptions) {
      const success = await sendPushNotification(sub, payload);
      if (success) {
        sentCount++;
      } else {
        failedCount++;
      }
    }

    // Log to notification history
    try {
      await db.insert(notificationHistory).values({
        title,
        body: message,
        url: url || null,
        type: "manual",
        releaseId: releaseId || null,
        recipientCount: subscriptions.length,
        successCount: sentCount,
        failedCount,
        sentBy: "admin",
      });
    } catch (historyError) {
      console.warn("[Admin Send Notification] Failed to log history:", historyError);
    }

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${sentCount} subscribers`,
      sent: sentCount,
      failed: failedCount,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error("[Admin Send Notification] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
