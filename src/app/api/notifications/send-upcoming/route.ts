import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseConfigured } from "@/db/client";
import { pushSubscriptions, upcomingReleases, releaseNotifications } from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
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
    console.warn("[Push] Missing keys for subscription:", subscription.endpoint);
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
    console.error("[Push] Failed to send notification:", err);

    // If subscription is expired or invalid, delete it
    if (err.statusCode === 410 || err.statusCode === 404) {
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    }
    return false;
  }
}

// POST - Send notifications for releases approaching their date
export async function POST(request: NextRequest) {
  try {
    // Verify API key for cron jobs
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

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

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find releases in the next 7 days
    const upcomingReleasesData = await db
      .select()
      .from(upcomingReleases)
      .where(
        and(
          eq(upcomingReleases.isActive, true),
          gte(upcomingReleases.releaseDate, now),
          lte(upcomingReleases.releaseDate, in7Days)
        )
      );

    // Get all subscriptions
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

    let sentCount = 0;
    const notifications: Array<{
      releaseId: string;
      type: string;
      title: string;
      body: string;
    }> = [];

    // Categorize releases and prepare notifications
    for (const release of upcomingReleasesData) {
      const releaseTime = new Date(release.releaseDate).getTime();
      const timeDiff = releaseTime - now.getTime();
      const hoursUntil = timeDiff / (1000 * 60 * 60);
      const daysUntil = hoursUntil / 24;

      // Check what notifications to send
      if (daysUntil <= 7 && daysUntil > 1) {
        const daysText = Math.ceil(daysUntil);
        notifications.push({
          releaseId: release.id,
          type: "7_days",
          title: `🚀 ${release.title} - En ${daysText} días`,
          body: `${release.artistName} lanza "${release.title}" pronto. ¡Haz presave!`,
        });
      } else if (hoursUntil <= 24 && hoursUntil > 1) {
        notifications.push({
          releaseId: release.id,
          type: "24_hours",
          title: `⏰ ¡Mañana se lanza ${release.title}!`,
          body: `${release.artistName} lanza nueva música mañana. ¿Ya hiciste presave?`,
        });
      } else if (hoursUntil <= 1 && hoursUntil > 0) {
        notifications.push({
          releaseId: release.id,
          type: "1_hour",
          title: `🎉 ¡${release.title} se lanza en menos de 1 hora!`,
          body: `${release.artistName} está a punto de lanzar. ¡Prepárate!`,
        });
      }
    }

    // Check which notifications have already been sent
    const alreadySent = await db
      .select()
      .from(releaseNotifications)
      .where(
        inArray(
          releaseNotifications.releaseId,
          notifications.map((n) => n.releaseId)
        )
      );

    const sentMap = new Map(
      alreadySent.map((s) => [`${s.releaseId}-${s.notificationType}`, true])
    );

    // Send notifications
    for (const notification of notifications) {
      const key = `${notification.releaseId}-${notification.type}`;
      if (sentMap.has(key)) {
        continue; // Already sent this notification
      }

      const release = upcomingReleasesData.find((r) => r.id === notification.releaseId);
      if (!release) continue;

      const payload: NotificationPayload = {
        title: notification.title,
        body: notification.body,
        icon: release.coverImageUrl || "/icon-192.png",
        badge: "/badge-72.png",
        image: release.coverImageUrl || undefined,
        url: release.rpmPresaveUrl || `/proximos/${release.slug}`,
        tag: `release-${release.id}`,
      };

      // Send to all subscriptions
      for (const sub of subscriptions) {
        const success = await sendPushNotification(sub, payload);
        if (success) sentCount++;
      }

      // Record that this notification was sent
      await db.insert(releaseNotifications).values({
        releaseId: notification.releaseId,
        notificationType: notification.type,
        recipientCount: subscriptions.length,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sentCount} notifications`,
      sent: sentCount,
      releases: notifications.length,
    });
  } catch (error) {
    console.error("[Notifications Send] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}

// GET - Get notification status
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
      .from(pushSubscriptions);

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcoming = await db
      .select()
      .from(upcomingReleases)
      .where(
        and(
          eq(upcomingReleases.isActive, true),
          gte(upcomingReleases.releaseDate, now),
          lte(upcomingReleases.releaseDate, in7Days)
        )
      );

    return NextResponse.json({
      success: true,
      data: {
        activeSubscriptions: subscriptions.length,
        upcomingReleasesIn7Days: upcoming.length,
        vapidConfigured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
      },
    });
  } catch (error) {
    console.error("[Notifications Status] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get status" },
      { status: 500 }
    );
  }
}
