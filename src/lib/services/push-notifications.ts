// ===========================================
// PUSH NOTIFICATION SERVICE
// ===========================================

import webpush from "web-push";
import { db } from "@/db/client";
import { pushSubscriptions, scheduledNotifications, notificationPreferences } from "@/db/schema";
import { eq, lt, and } from "drizzle-orm";

// Configure VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:prensasonidoliquido@gmail.com";

// Initialize web-push with VAPID keys
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

export interface SubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PushNotificationService {
  /**
   * Check if push notifications are configured
   */
  isConfigured(): boolean {
    return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
  }

  /**
   * Get public VAPID key for client subscription
   */
  getPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  /**
   * Save a push subscription to the database
   */
  async saveSubscription(subscription: SubscriptionData, userAgent?: string): Promise<string> {
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
          keysP256dh: subscription.keys.p256dh,
          keysAuth: subscription.keys.auth,
          userAgent,
          lastUsedAt: new Date().toISOString(),
        })
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint));

      return existing[0].id;
    }

    // Create new subscription
    const [result] = await db
      .insert(pushSubscriptions)
      .values({
        endpoint: subscription.endpoint,
        keysP256dh: subscription.keys.p256dh,
        keysAuth: subscription.keys.auth,
        userAgent,
      })
      .returning({ id: pushSubscriptions.id });

    // Create default preferences
    await db.insert(notificationPreferences).values({
      subscriptionId: result.id,
    });

    return result.id;
  }

  /**
   * Remove a push subscription
   */
  async removeSubscription(endpoint: string): Promise<void> {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
  }

  /**
   * Send push notification to a single subscription
   */
  async sendToSubscription(
    subscription: { endpoint: string; keysP256dh: string; keysAuth: string },
    payload: PushNotificationPayload
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn("[Push] VAPID keys not configured");
      return false;
    }

    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keysP256dh,
          auth: subscription.keysAuth,
        },
      };

      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(payload)
      );

      console.log(`[Push] Notification sent to ${subscription.endpoint.substring(0, 50)}...`);
      return true;
    } catch (error: any) {
      console.error(`[Push] Error sending notification:`, error.message);

      // If subscription is no longer valid, remove it
      if (error.statusCode === 404 || error.statusCode === 410) {
        console.log(`[Push] Removing invalid subscription`);
        await this.removeSubscription(subscription.endpoint);
      }

      return false;
    }
  }

  /**
   * Send push notification to all subscribers
   */
  async sendToAll(
    payload: PushNotificationPayload,
    options?: { notificationType?: string }
  ): Promise<{ sent: number; failed: number }> {
    const subscriptions = await db.select().from(pushSubscriptions);

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      // Check notification preferences if type specified
      if (options?.notificationType) {
        const prefs = await db
          .select()
          .from(notificationPreferences)
          .where(eq(notificationPreferences.subscriptionId, sub.id))
          .limit(1);

        if (prefs.length > 0) {
          const pref = prefs[0];
          const shouldSend =
            (options.notificationType === "release" && pref.releaseAlerts) ||
            (options.notificationType === "presave" && pref.presaveReminders) ||
            (options.notificationType === "event" && pref.eventAlerts) ||
            (options.notificationType === "general" && pref.newContent) ||
            !options.notificationType;

          if (!shouldSend) continue;
        }
      }

      const success = await this.sendToSubscription(sub, payload);
      if (success) sent++;
      else failed++;
    }

    console.log(`[Push] Broadcast complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  /**
   * Schedule a notification for later
   */
  async scheduleNotification(data: {
    title: string;
    body: string;
    icon?: string;
    url?: string;
    scheduledFor: Date;
    releaseId?: string;
    eventId?: string;
    notificationType?: string;
  }): Promise<string> {
    const [result] = await db
      .insert(scheduledNotifications)
      .values({
        title: data.title,
        body: data.body,
        icon: data.icon,
        url: data.url,
        scheduledFor: data.scheduledFor.toISOString(),
        releaseId: data.releaseId,
        eventId: data.eventId,
        notificationType: data.notificationType || "general",
        status: "pending",
      })
      .returning({ id: scheduledNotifications.id });

    return result.id;
  }

  /**
   * Process scheduled notifications that are due
   */
  async processScheduledNotifications(): Promise<number> {
    const now = new Date().toISOString();

    const dueNotifications = await db
      .select()
      .from(scheduledNotifications)
      .where(
        and(
          eq(scheduledNotifications.status, "pending"),
          lt(scheduledNotifications.scheduledFor, now)
        )
      );

    let processed = 0;

    for (const notification of dueNotifications) {
      const payload: PushNotificationPayload = {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || "/icons/icon-192x192.png",
        url: notification.url || "/",
      };

      const result = await this.sendToAll(payload, {
        notificationType: notification.notificationType,
      });

      // Update notification status
      await db
        .update(scheduledNotifications)
        .set({
          status: result.sent > 0 ? "sent" : "failed",
          sentAt: new Date().toISOString(),
        })
        .where(eq(scheduledNotifications.id, notification.id));

      processed++;
    }

    return processed;
  }

  /**
   * Send release day notification
   */
  async sendReleaseNotification(release: {
    title: string;
    artistName: string;
    slug: string;
    coverImageUrl?: string;
  }): Promise<{ sent: number; failed: number }> {
    const payload: PushNotificationPayload = {
      title: `🎵 ¡${release.title} ya está disponible!`,
      body: `${release.artistName} acaba de lanzar nueva música. ¡Escúchala ahora!`,
      icon: release.coverImageUrl || "/icons/icon-192x192.png",
      image: release.coverImageUrl,
      url: `/lanzamientos/${release.slug}`,
      tag: `release-${release.slug}`,
    };

    return this.sendToAll(payload, { notificationType: "release" });
  }

  /**
   * Send pre-save reminder notification
   */
  async sendPresaveReminder(release: {
    title: string;
    artistName: string;
    slug: string;
    daysUntilRelease: number;
    coverImageUrl?: string;
  }): Promise<{ sent: number; failed: number }> {
    const dayText = release.daysUntilRelease === 1 ? "día" : "días";

    const payload: PushNotificationPayload = {
      title: `⏰ ${release.daysUntilRelease} ${dayText} para ${release.title}`,
      body: `No te pierdas el nuevo lanzamiento de ${release.artistName}. ¡Haz pre-save ahora!`,
      icon: release.coverImageUrl || "/icons/icon-192x192.png",
      url: `/proximos/${release.slug}`,
      tag: `presave-${release.slug}`,
    };

    return this.sendToAll(payload, { notificationType: "presave" });
  }

  /**
   * Send event reminder notification
   */
  async sendEventReminder(event: {
    title: string;
    date: string;
    venue: string;
    slug?: string;
  }): Promise<{ sent: number; failed: number }> {
    const payload: PushNotificationPayload = {
      title: `🎤 ${event.title}`,
      body: `Hoy en ${event.venue}. ¡No te lo pierdas!`,
      icon: "/icons/icon-192x192.png",
      url: event.slug ? `/eventos/${event.slug}` : "/eventos",
      tag: `event-${event.slug || "general"}`,
    };

    return this.sendToAll(payload, { notificationType: "event" });
  }

  /**
   * Get subscriber count
   */
  async getSubscriberCount(): Promise<number> {
    const result = await db.select().from(pushSubscriptions);
    return result.length;
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications() {
    return db
      .select()
      .from(scheduledNotifications)
      .where(eq(scheduledNotifications.status, "pending"))
      .orderBy(scheduledNotifications.scheduledFor);
  }
}

export const pushNotificationService = new PushNotificationService();
