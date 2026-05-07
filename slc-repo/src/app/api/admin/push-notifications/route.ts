// ===========================================
// PUSH NOTIFICATIONS ADMIN API
// ===========================================

import { NextRequest, NextResponse } from "next/server";
import { pushNotificationService } from "@/lib/services/push-notifications";

// Send push notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      body: notificationBody,
      icon,
      url,
      notificationType,
      schedule,
      releaseId,
      eventId,
    } = body;

    if (!title || !notificationBody) {
      return NextResponse.json(
        { success: false, error: "Title and body are required" },
        { status: 400 }
      );
    }

    if (!pushNotificationService.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Push notifications not configured. Set VAPID keys in environment variables.",
        },
        { status: 400 }
      );
    }

    // Schedule for later
    if (schedule) {
      const scheduledFor = new Date(schedule);
      if (scheduledFor <= new Date()) {
        return NextResponse.json(
          { success: false, error: "Schedule time must be in the future" },
          { status: 400 }
        );
      }

      const notificationId = await pushNotificationService.scheduleNotification({
        title,
        body: notificationBody,
        icon,
        url,
        scheduledFor,
        releaseId,
        eventId,
        notificationType,
      });

      return NextResponse.json({
        success: true,
        data: {
          scheduled: true,
          notificationId,
          scheduledFor: scheduledFor.toISOString(),
        },
      });
    }

    // Send immediately
    const result = await pushNotificationService.sendToAll(
      {
        title,
        body: notificationBody,
        icon: icon || "/icons/icon-192x192.png",
        url: url || "/",
      },
      { notificationType }
    );

    return NextResponse.json({
      success: true,
      data: {
        sent: result.sent,
        failed: result.failed,
      },
    });
  } catch (error) {
    console.error("[Push Admin] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Get push notification stats
export async function GET() {
  try {
    const subscriberCount = await pushNotificationService.getSubscriberCount();
    const scheduledNotifications = await pushNotificationService.getScheduledNotifications();
    const isConfigured = pushNotificationService.isConfigured();

    return NextResponse.json({
      success: true,
      data: {
        isConfigured,
        subscriberCount,
        scheduledNotifications,
      },
    });
  } catch (error) {
    console.error("[Push Admin] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Process scheduled notifications (called by cron job)
export async function PUT() {
  try {
    const processed = await pushNotificationService.processScheduledNotifications();

    return NextResponse.json({
      success: true,
      data: { processed },
    });
  } catch (error) {
    console.error("[Push Admin] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
